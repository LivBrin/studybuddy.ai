'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Heart, Wand2, FileText, Loader2 } from 'lucide-react';
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
        setError('oops! please add some notes or a file first ♡');
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
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-4 py-1.5 text-xs font-semibold text-primary mb-4 shadow-sm">
          <Heart className="h-3.5 w-3.5 fill-current" /> your tiny study bestie
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-foreground">
          StudyBuddy <span className="text-primary">♡</span>
        </h1>
        <p className="font-script text-2xl text-primary/80 mt-1 leading-none">
          by liv brinberg
        </p>
        <p className="text-muted-foreground mt-3 text-base">
          drop in your notes & we&apos;ll whip up a cute quiz just for you ✨
        </p>
      </header>

      <Card className="shadow-md shadow-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" /> make a new quiz
          </CardTitle>
          <CardDescription>paste some notes or pop in a file — we&apos;ll do the rest ♡</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="notes">your notes ♡</Label>
            <Textarea
              id="notes"
              rows={8}
              placeholder="paste your notes, lecture transcript, or anything you wanna study ♡"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">or drop in a file</Label>
            <label
              htmlFor="file"
              className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/30 bg-secondary/40 px-4 py-7 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:border-primary/60 transition-all"
            >
              {file ? (
                <>
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">{file.name}</span>
                  <span className="text-xs">({Math.round(file.size / 1024)} KB)</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>click to add a PDF, DOCX, or TXT ♡</span>
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
                remove file
              </button>
            )}
          </div>

          <div className="space-y-2">
            <Label>how many questions?</Label>
            <div className="flex flex-wrap gap-2">
              {QUESTION_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setQuestionCount(n)}
                  disabled={loading}
                  className={
                    'rounded-full border-2 px-5 py-2 text-sm font-semibold transition-all disabled:opacity-50 ' +
                    (questionCount === n
                      ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/30 scale-105'
                      : 'border-primary/20 bg-card hover:bg-accent hover:border-primary/40')
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
            className="w-full text-base font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> cooking up your quiz…
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-5 w-5" /> make my quiz ✨
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
