import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_CHARS = 24000; // ~6k tokens of source — keeps us well under context limits and cost

const SYSTEM_PROMPT = `You are a study-aid generator. Given a topic and/or source material, you create study questions that test understanding of the most important factual content.

Rules:
- Half multiple choice (type "mc"), half short answer (type "sa"). For odd counts, prefer one extra MC.
- MC questions must have exactly 4 plausible options. Set correctIndex (0-3) to the correct option.
- SA questions must have a list of acceptableAnswers (1-5 short alternative correct phrasings, lowercase).
- When source material is provided, every question must be answerable from that source — do not invent facts beyond it.
- When no source is provided and only a topic/focus is given, use accurate, well-established facts from your general knowledge of the topic.
- If a focus area is specified alongside source material, prioritize content that relates to the focus and skip unrelated material when possible.
- Keep questions concise and unambiguous.
- Always include a brief explanation of the correct answer.`;

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
    const sourceText: string = (body?.text ?? '').trim();
    const focus: string = (body?.focus ?? '').trim();
    const requested = Number(body?.count ?? body?.questionCount ?? 5);
    const count: number = Math.min(20, Math.max(1, Number.isFinite(requested) ? Math.round(requested) : 5));

    if (!sourceText && !focus) {
      return NextResponse.json(
        { error: 'Provide a focus area or upload source material.' },
        { status: 400 }
      );
    }

    const trimmed = sourceText.length > MAX_CHARS ? sourceText.slice(0, MAX_CHARS) : sourceText;
    const plural = count === 1 ? '' : 's';

    let userMessage: string;
    if (trimmed) {
      const focusLine = focus
        ? `\nFocus the questions specifically on: "${focus}". Prefer source content that relates to this focus, and skip unrelated material when possible.\n`
        : '';
      userMessage =
        `Generate exactly ${count} study question${plural} from the source material below. Mix multiple choice and short answer when count > 1.\n${focusLine}\n--- SOURCE ---\n${trimmed}\n--- END SOURCE ---`;
    } else {
      userMessage =
        `Generate exactly ${count} study question${plural} on the following topic: "${focus}". Use accurate, well-established facts from your general knowledge of the subject. Mix multiple choice and short answer when count > 1.`;
    }

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.4,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
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
