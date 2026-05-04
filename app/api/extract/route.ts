import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const name = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let text = '';

    if (name.endsWith('.pdf')) {
      // Lazy-require so the module's odd top-level test-fixture access doesn't run at build time
      const pdfParse = (await import('pdf-parse')).default;
      const result = await pdfParse(buffer);
      text = result.text;
    } else if (name.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (name.endsWith('.txt') || file.type.startsWith('text/')) {
      text = buffer.toString('utf-8');
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Use PDF, DOCX, or TXT.' },
        { status: 400 }
      );
    }

    text = text.replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

    if (!text) {
      return NextResponse.json({ error: 'No text found in document.' }, { status: 400 });
    }

    return NextResponse.json({ text, filename: file.name });
  } catch (err: any) {
    console.error('extract error', err);
    return NextResponse.json({ error: err?.message ?? 'Failed to extract text' }, { status: 500 });
  }
}
