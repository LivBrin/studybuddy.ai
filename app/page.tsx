'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Upload, FileText, Loader2 } from 'lucide-react';
import { setCurrent } from '@/lib/storage';
import type { Quiz } from '@/lib/types';

const QUESTION_OPTIONS = [3, 5, 10, 15, 20];

export default function Home() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [questionCount, setQuestionCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setError(null);
    setLoading(true);

    try {
      let finalText = text;

      if (file) {
        const formData = new FormData();
        formData.append('file', file);

        const extractRes = await fetch('/api/extract', { method: 'POST', body: formData });
        const extractData = await extractRes.json();
        if (!extractRes.ok) throw new Error(extractData.error || 'Failed to extract file');
        finalText = extractData.text;
      }

      if (!finalText.trim()) {
        setError('Please paste some text or upload a file.');
        return;
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: finalText, count: questionCount }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate quiz');
      if (!Array.isArray(data?.questions) || data.questions.length === 0) {
        throw new Error('No questions returned');
      }

      const quiz: Quiz = {
        id: crypto.randomUUID(),
        title: file?.name ?? `Quiz · ${new Date().toLocaleString()}`,
        createdAt: Date.now(),
        questions: data.questions,
      };

      setCurrent(quiz);
      router.push('/quiz');
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = !loading && (text.trim().length > 0 || !!file);

  return (
    <main className="container max-w-2xl py-12">
      <header className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-4">
          <Sparkles className="h-3.5 w-3.5" /> AI-powered study quizzes
        </div>
        <h1 className="text-4xl font-bold tracking-tight">StudyBuddy</h1>
        <p className="text-muted-foreground mt-2">
          Drop in your notes or a document, and we&apos;ll quiz you on it.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Create a quiz</CardTitle>
          <CardDescription>Paste your notes or upload a PDF, DOCX, or TXT file.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="notes">Your notes</Label>
            <Textarea
              id="notes"
              rows={8}
              placeholder="Paste your notes, lecture transcript, or any source material here…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Or upload a file</Label>
            <label
              htmlFor="file"
              className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-input bg-background px-4 py-6 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {file ? (
                <>
                  <FileText className="h-4 w-4" />
                  <span className="font-medium text-foreground">{file.name}</span>
                  <span className="text-xs">({Math.round(file.size / 1024)} KB)</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Click to choose a PDF, DOCX, or TXT</span>
                </>
              )}
              <input
                id="file"
                type="file"
                accept=".pdf,.docx,.txt"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={loading}
              />
            </label>
            {file && (
              <button
                type="button"
                onClick={() => setFile(null)}
                disabled={loading}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Remove file
              </button>
            )}
          </div>

          <div className="space-y-2">
            <Label>Number of questions</Label>
            <div className="flex flex-wrap gap-2">
              {QUESTION_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setQuestionCount(n)}
                  disabled={loading}
                  className={
                    'rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ' +
                    (questionCount === n
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-input bg-background hover:bg-accent hover:text-accent-foreground')
                  }
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            type="button"
            size="lg"
            onClick={handleGenerate}
            disabled={!canSubmit}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating quiz…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Generate Quiz
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
