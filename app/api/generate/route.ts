import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_CHARS = 24000; // ~6k tokens of source — keeps us well under context limits and cost

const SYSTEM_PROMPT = `You are a study-aid generator. Given source material, you create study questions that test understanding of the most important factual content in the source.

Rules:
- Half multiple choice (type "mc"), half short answer (type "sa"). For odd counts, prefer one extra MC.
- MC questions must have exactly 4 plausible options. Set correctIndex (0-3) to the correct option.
- SA questions must have a list of acceptableAnswers (1-5 short alternative correct phrasings, lowercase).
- Each question must be answerable from the source. Don't invent facts.
- Keep questions concise and unambiguous.
- Always include a brief explanation citing the relevant idea from the source.`;

const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          type: { type: 'string', enum: ['mc', 'sa'] },
          question: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          correctIndex: { type: 'integer' },
          acceptableAnswers: { type: 'array', items: { type: 'string' } },
          explanation: { type: 'string' },
        },
        required: ['type', 'question', 'options', 'correctIndex', 'acceptableAnswers', 'explanation'],
      },
    },
  },
  required: ['questions'],
} as const;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not set. Add it to .env.local.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const sourceText: string = body?.text ?? '';
    const requested = Number(body?.count ?? body?.questionCount ?? 5);
    const count: number = Math.min(20, Math.max(1, Number.isFinite(requested) ? Math.round(requested) : 5));

    if (!sourceText || sourceText.length < 50) {
      return NextResponse.json(
        { error: 'Source text is too short to generate questions from.' },
        { status: 400 }
      );
    }

    const trimmed = sourceText.length > MAX_CHARS ? sourceText.slice(0, MAX_CHARS) : sourceText;

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.4,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Generate exactly ${count} study question${count === 1 ? '' : 's'} from the following source material. Mix multiple choice and short answer when count > 1.\n\n--- SOURCE ---\n${trimmed}\n--- END SOURCE ---`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'study_questions', strict: true, schema: schema as any },
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: 'Empty response from model' }, { status: 502 });
    }

    const parsed = JSON.parse(raw);
    const cleaned = (parsed.questions ?? []).map((q: any) => {
      if (q.type === 'mc') {
        return {
          type: 'mc',
          question: q.question,
          options: Array.isArray(q.options) ? q.options.slice(0, 4) : [],
          correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
          explanation: q.explanation,
        };
      }
      return {
        type: 'sa',
        question: q.question,
        acceptableAnswers: Array.isArray(q.acceptableAnswers)
          ? q.acceptableAnswers.map((a: string) => a.toLowerCase().trim())
          : [],
        explanation: q.explanation,
      };
    });

    return NextResponse.json({ questions: cleaned });
  } catch (err: any) {
    console.error('generate error', err);
    return NextResponse.json({ error: err?.message ?? 'Failed to generate questions' }, { status: 500 });
  }
}
