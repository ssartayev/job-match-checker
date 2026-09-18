"""FastAPI service that scores a CV against a job description."""
from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .matcher import get_model, match

app = FastAPI(title="Job Match Checker")

# The React dev server runs on a different port, so the browser treats it as a
# different origin and blocks the request unless the API allows it explicitly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["POST"],
    allow_headers=["*"],
)


class MatchRequest(BaseModel):
    cv: str = Field(min_length=20)
    job: str = Field(min_length=20)


@app.on_event("startup")
def warm_up() -> None:
    # Loading the model takes a few seconds; do it at startup so the first
    # request is not the one that pays for it.
    get_model()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/match")
def run_match(request: MatchRequest) -> dict:
    try:
        return match(request.cv, request.job)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
