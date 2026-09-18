import { useState } from "react";
import type { MatchResult, Status } from "./types";
import "./App.css";

const API = "http://127.0.0.1:8000/api/match";

const STATUS_LABEL: Record<Status, string> = {
  covered: "Covered",
  partial: "Partial",
  missing: "Missing",
};

export default function App() {
  const [cv, setCv] = useState("");
  const [job, setJob] = useState("");
  const [result, setResult] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ready = cv.trim().length >= 20 && job.trim().length >= 20;

  async function check() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv, job }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail ?? `Request failed (${response.status})`);
      }
      setResult(await response.json());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not reach the server.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <header>
        <h1>Job Match Checker</h1>
        <p className="sub">
          Paste a job description and your CV to see which requirements you
          actually cover.
        </p>
      </header>

      <div className="inputs">
        <label>
          <span>Job description</span>
          <textarea
            value={job}
            onChange={(e) => setJob(e.target.value)}
            placeholder="Paste the full job ad, including the requirements…"
            rows={14}
          />
        </label>

        <label>
          <span>Your CV</span>
          <textarea
            value={cv}
            onChange={(e) => setCv(e.target.value)}
            placeholder="Paste your CV as plain text…"
            rows={14}
          />
        </label>
      </div>

      <button className="btn" onClick={check} disabled={!ready || loading}>
        {loading ? "Checking…" : "Check match"}
      </button>

      {error && <p className="error">{error}</p>}

      {result && (
        <section className="result">
          <div className="score">
            <div className="score-value">{result.overall_score}%</div>
            <div className="score-label">
              {result.covered} of {result.total} requirements covered
            </div>
          </div>

          <ul className="requirements">
            {result.requirements.map((item, index) => (
              <li key={index} className={item.status}>
                <div className="req-head">
                  <span className={`badge ${item.status}`}>
                    {STATUS_LABEL[item.status]}
                  </span>
                  <span className="req-text">{item.requirement}</span>
                </div>
                {item.status !== "missing" && (
                  <p className="evidence">
                    Closest thing in your CV: {item.evidence}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
