"""
Matching logic: how well does a CV cover the requirements of a job ad?

The approach is requirement-by-requirement rather than whole-document. Comparing
two long documents gives one vague number; comparing each requirement against
the CV says which specific requirements are not covered, which is the useful
answer.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from sentence_transformers import SentenceTransformer, util

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

STRONG_MATCH = 0.45
WEAK_MATCH = 0.30

_model: SentenceTransformer | None = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)
    return _model


@dataclass
class RequirementResult:
    requirement: str
    score: float
    evidence: str
    status: str


def split_lines(text: str) -> list[str]:
    """
    Job ads mix bullet characters, newlines and sentences, so split on all of
    them and keep fragments long enough to carry meaning.
    """
    parts = re.split(r"[\n\r]+|(?<=[.;])\s+|\s*[•·▪◦‣*\-–—]\s+", text)
    cleaned = []
    for part in parts:
        part = re.sub(r"\s+", " ", part).strip(" -–—•·*\t")
        if len(part) >= 15:
            cleaned.append(part)
    return cleaned


def expand_skill_lists(lines: list[str]) -> list[str]:
    """
    A CV skills line is a comma-separated list, not prose, and comparing it as
    one blob buries every individual skill. Each item is added as its own entry
    so a single tool name can still be matched.
    """
    expanded = list(lines)
    for line in lines:
        items = [item.strip(" .;") for item in line.split(",")]
        if len(items) < 3:
            continue
        for item in items:
            # Drop a leading "Skills:" style label before the first item.
            item = re.sub(r"^[A-Za-z &]{3,25}:\s*", "", item).strip()
            if 2 <= len(item) <= 40:
                expanded.append(item)
    return expanded


def match(cv_text: str, job_text: str) -> dict:
    requirements = split_lines(job_text)
    cv_lines = expand_skill_lists(split_lines(cv_text))

    if not requirements:
        raise ValueError("Could not find any requirements in the job description.")
    if not cv_lines:
        raise ValueError("Could not read anything from the CV.")

    model = get_model()
    req_vectors = model.encode(requirements, convert_to_tensor=True)
    cv_vectors = model.encode(cv_lines, convert_to_tensor=True)

    # For each requirement, the single best piece of evidence anywhere in the CV.
    similarity = util.cos_sim(req_vectors, cv_vectors)
    best_scores, best_indices = similarity.max(dim=1)

    results: list[RequirementResult] = []
    for requirement, score, index in zip(requirements, best_scores, best_indices):
        score = float(score)
        if score >= STRONG_MATCH:
            status = "covered"
        elif score >= WEAK_MATCH:
            status = "partial"
        else:
            status = "missing"
        results.append(
            RequirementResult(
                requirement=requirement,
                score=round(score, 3),
                evidence=cv_lines[int(index)],
                status=status,
            )
        )

    overall = sum(r.score for r in results) / len(results)
    covered = sum(1 for r in results if r.status == "covered")

    return {
        "overall_score": round(overall * 100),
        "covered": covered,
        "total": len(results),
        "requirements": sorted(
            [r.__dict__ for r in results], key=lambda r: r["score"]
        ),
    }
