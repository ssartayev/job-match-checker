# Job Match Checker

Paste a job description and your CV. It scores how well you match and, more
usefully, tells you **which specific requirements you do not cover**.

I built it while applying for internships, because reading a job ad and guessing
whether I was a fit kept going badly.

## The idea

Comparing two whole documents gives you one vague number. This compares the job
ad **requirement by requirement**:

```
job ad  ->  split into individual requirements
CV      ->  split into individual lines and skills
                    |
                    v
      for each requirement, find the single best
      matching line anywhere in the CV
                    |
                    v
   covered / partial / missing  +  the evidence found
```

Each requirement is labelled:

| Label | Meaning |
|---|---|
| **Covered** | Something in the CV clearly matches |
| **Partial** | Loosely related, worth strengthening |
| **Missing** | Nothing in the CV matches |

Because every requirement keeps the CV line it matched against, the result shows
its own evidence instead of asking you to trust a score.

## How the matching works

Text is turned into vectors with the Hugging Face model
[`all-MiniLM-L6-v2`](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2),
where similar meanings land close together, and requirements are scored by
cosine similarity against every CV line.

This matches meaning rather than exact words, so *"version control"* still
matches a CV that says *"Git"*.

**One problem worth recording.** The first version reported `Git` as missing on a
CV that plainly listed it. A skills line is a comma-separated list, not prose, so
embedding it as one blob buried every individual skill. Splitting those lines
into separate entries moved that requirement from `missing (0.16)` to
`covered (0.50)`.

## Stack

**Frontend** React 19 · TypeScript · Vite · Transformers.js
**Backend** FastAPI · sentence-transformers · PyTorch

The public site runs the model in the browser, so a pasted CV stays on the visitor's
device. The model downloads on first use and is then cached by the browser. The
separate Python backend remains available for local development. Browser inference
uses a quantized model, so individual scores can differ slightly from the backend.

## Running it

**Backend**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000
```

**Frontend** (in a second terminal)

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. No backend is needed for the browser version.

## Layout

```
backend/
  app/matcher.py   splitting, embedding and scoring
  app/main.py      FastAPI routes and CORS
frontend/
  src/App.tsx      the page and form state
  src/matcher.ts   browser-based embedding and matching logic
  src/types.ts     shared result types
```

## Limits

- Plain text only — no PDF or DOCX parsing yet.
- Thresholds for covered/partial/missing are fixed, not learned.
- Scores are relative, not absolute: useful for comparing jobs to each other,
  not as an objective probability of getting an interview.
