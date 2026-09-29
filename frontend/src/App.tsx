import { useState } from "react";
import { match } from "./matcher";
import type { MatchResult, Status } from "./types";
import "./App.css";

const DEMO_CV = `Alex Lee — Computer Science student (fictional example)

Skills: Python, FastAPI, React, TypeScript, Git, SQL

Built a React website for a community activities club with filters for age, location, and schedule.
Developed Python API endpoints that return activity listings as JSON.
Used GitHub branches and pull requests to collaborate with two teammates.
Stored activity listings and bookings in a SQL database.
Built a Python prototype that ranks activities against children's interests using semantic text similarity.`;

const DEMO_JOB = `Build responsive web pages using React and TypeScript.
Develop Python API endpoints for an extracurricular activities platform.
Use version control to collaborate with other developers.
Use SQL to store and retrieve activity listings and bookings.
Build personalized activity recommendations based on children's interests.
Develop native Android mobile features using Kotlin.
Deploy production services using Kubernetes on AWS.`;

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
  const [started, setStarted] = useState(false);

  const ready = cv.trim().length >= 20 && job.trim().length >= 20;

  async function check() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      setResult(await match(cv, job));
      setStarted(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Matching could not be completed.",
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
        <p className="privacy">Matching runs in your browser. Your CV is not uploaded to this website.</p>
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

      <div className="actions">
        <button className="btn" onClick={check} disabled={!ready || loading}>
          {loading ? (started ? "Checking…" : "Loading AI model and checking…") : "Check match"}
        </button>
        <button className="btn secondary" onClick={() => { setCv(DEMO_CV); setJob(DEMO_JOB); setResult(null); setError(""); }} disabled={loading}>
          Load fictional example
        </button>
      </div>
      {loading && !started && <p className="hint">The AI model downloads on first use. This can take a minute; later checks are faster.</p>}

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
          <p className="hint">Scores show text similarity, not your chance of getting an interview. Check each requirement yourself before applying.</p>
        </section>
      )}
    </div>
  );
}
