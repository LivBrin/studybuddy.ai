'use client';

import { useEffect, useState } from 'react';
  const [questionCount, setQuestionCount] = useState(5);
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Trash2, FileText, Sparkles } from 'lucide-react';
import { loadHistory, deleteQuiz, setCurrent } from '@/lib/storage';
import type { Quiz, Question } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();
  const [history, setHistory] = useState<Quiz[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [count, setCount] = useState<'1' | '3'>('3');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  function refreshHistory() {
    setHistory(loadHistory());
  }

  async function handleStart() {
    setError(null);

    if (!file && pastedText.trim().length < 50) {
      setError('Upload a PDF/DOCX/TXT file, or paste at least a paragraph of text.');
      return;
    }

    setLoading(true);
    try {
      let text = pastedText.trim();
      let title = 'Pasted text';

      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        const r = await fetch('/api/extract', { method: 'POST', body: fd });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? 'Failed to extract text');
        text = j.text;
        title = j.filename ?? file.name;
      }

      const r2 = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, count: Number(count) }),
        questionCount,
      });
      const j2 = await r2.json();
      if (!r2.ok) throw new Error(j2.error ?? 'Failed to generate questions');

      const quiz: Quiz = {
        id: crypto.randomUUID(),
        title,
        createdAt: Date.now(),
        questions: j2.questions as Question[],
      };

      setCurrent(quiz);
      router.push('/quiz');
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function handleDelete(id: string) {
    deleteQuiz(id);
    refreshHistory();
  }

  return (
    <main className="container max-w-3xl py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Study Guide</h1>
        <p className="text-muted-foreground">Upload a document and quiz yourself on it.</p>
      </header>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>New quiz</CardTitle>
          <CardDescription>Upload a PDF, DOCX, or TXT — or paste text directly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="file">Document</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,.docx,.txt,text/plain"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" /> {file.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paste">Or paste text</Label>
            <Textarea
              id="paste"
              placeholder="Paste source material here…"
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              className="min-h-[120px]"
              disabled={!!file}
            />
            {file && <p className="text-xs text-muted-foreground">Clear the uploaded file to paste text instead.</p>}
          </div>

          <div className="space-y-2">
            <Label>Number of questions</Label>
            <RadioGroup value={count} onValueChange={(v) => setCount(v as '1' | '3')} className="flex gap-6">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1" id="count-1" />
                <Label htmlFor="count-1" className="font-normal">1 question</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="3" id="count-3" />
                <Label htmlFor="count-3" className="font-normal">3 questions</Label>
              </div>
            </RadioGroup>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleStart} disabled={loading} className="w-full sm:w-auto">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate quiz
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <section>
        <h2 className="text-xl font-semibold tracking-tight mb-3">History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No past quizzes yet.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((q) => (
              <li key={q.id}>
                <Card>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{q.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(q.createdAt).toLocaleString()} · {q.questions.length} question{q.questions.length === 1 ? '' : 's'}
                        {typeof q.score === 'number' && ` · Score ${Math.round(q.score * 100)}%`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(q.id)}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
        <div className="mt-4">
          <label className="block mb-2">Number of Questions</label>
          <select value={questionCount} onChange={(e)=>setQuestionCount(Number(e.target.value))} className="border p-2 rounded">
            {[3,5,10,15,20].map(num=>(
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
}