# Study Guide

Upload a PDF / DOCX / TXT (or paste text), generate a 1- or 3-question quiz with a mix of multiple choice and short answer, and grade yourself. Quiz history is saved to `localStorage`.

## Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind + shadcn/ui primitives
- OpenAI (`gpt-4o-mini`) via server-side API route, with structured JSON output
- `pdf-parse` for PDFs, `mammoth` for DOCX

## Setup

```bash
npm install
cp .env.local.example .env.local
# edit .env.local and paste your OpenAI key
npm run dev
```

Open http://localhost:3000.

## How it works
- `app/api/extract` parses the uploaded file to plain text (server-side)
- `app/api/generate` sends the text to OpenAI with a strict JSON schema and returns a list of questions
- The quiz state for the current session lives in `sessionStorage`; completed quizzes (with score) are persisted to `localStorage` under `study-guide:history`

## Notes
- Source text is truncated to ~24,000 characters before being sent to OpenAI to keep cost predictable.
- Short-answer grading uses a forgiving substring match against any of the model's `acceptableAnswers` — good enough for a study tool, not exam-grade.
- To change the model, edit `app/api/generate/route.ts`.
