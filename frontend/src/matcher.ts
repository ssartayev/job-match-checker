import type { MatchResult, Requirement, Status } from "./types";

const STRONG_MATCH = 0.45;
const WEAK_MATCH = 0.30;

function splitLines(text: string): string[] {
  return text
    .split(/[\n\r]+|(?<=[.;])\s+|\s*[•·▪◦‣*\-–—]\s+/u)
    .map((part) => part.replace(/\s+/g, " ").replace(/^[\s\-–—•·*]+|[\s\-–—•·*]+$/gu, ""))
    .filter((part) => part.length >= 15);
}

function expandSkillLists(lines: string[]): string[] {
  const expanded = [...lines];
  for (const line of lines) {
    const items = line.split(",").map((item) => item.trim().replace(/^[.;]+|[.;]+$/g, ""));
    if (items.length < 3) continue;
    for (let item of items) {
      item = item.replace(/^[A-Za-z &]{3,25}:\s*/, "").trim();
      if (item.length >= 2 && item.length <= 40) expanded.push(item);
    }
  }
  return expanded;
}

async function makeExtractor() {
  const { pipeline } = await import("@huggingface/transformers");
  return pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
    device: "wasm",
  });
}

let extractorPromise: ReturnType<typeof makeExtractor> | null = null;

function cosine(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

export async function match(cvText: string, jobText: string): Promise<MatchResult> {
  const requirements = splitLines(jobText);
  const cvLines = expandSkillLists(splitLines(cvText));
  if (!requirements.length) throw new Error("Could not find requirements in the job description.");
  if (!cvLines.length) throw new Error("Could not read anything from the CV.");

  if (!extractorPromise) extractorPromise = makeExtractor();
  let extractor: Awaited<ReturnType<typeof makeExtractor>>;
  try {
    extractor = await extractorPromise;
  } catch (error) {
    extractorPromise = null;
    throw error;
  }

  const vectors = (await extractor([...requirements, ...cvLines], {
    pooling: "mean",
    normalize: true,
  })).tolist() as number[][];
  const cvVectors = vectors.slice(requirements.length);

  const results: Requirement[] = requirements.map((requirement, index) => {
    let bestScore = -1;
    let bestIndex = 0;
    for (let i = 0; i < cvVectors.length; i++) {
      const score = cosine(vectors[index], cvVectors[i]);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
    const score = Math.round(bestScore * 1000) / 1000;
    const status: Status = score >= STRONG_MATCH ? "covered" : score >= WEAK_MATCH ? "partial" : "missing";
    return { requirement, score, evidence: cvLines[bestIndex], status };
  });

  return {
    overall_score: Math.round(results.reduce((sum, result) => sum + result.score, 0) / results.length * 100),
    covered: results.filter((result) => result.status === "covered").length,
    total: results.length,
    requirements: results.sort((a, b) => a.score - b.score),
  };
}
