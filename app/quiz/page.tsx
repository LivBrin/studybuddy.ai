'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { loadCurrent, clearCurrent, upsertQuiz } from '@/lib/storage';
import type { Quiz, Question } from '@/lib/types';

function isShortAnswerCorrect(userAnswer: string, acceptable: string[]) {
  const u = userAnswer.toLowerCase().trim();
  if (!u) return false;
  return acceptable.some((a) => {
    const aa = a.toLowerCase().trim();
    return u === aa || u.includes(aa) || aa.includes(u);
  });
}

function gradeQuestion(q: Question, answer: number | string | null): boolean {
  if (answer === null || answer === undefined) return false;
  if (q.type === 'mc') {
    return typeof answer === 'number' && answer === q.correctIndex;
  }
  return typeof answer === 'string' && isShortAnswerCorrect(answer, q.acceptableAnswers);
}

export default function QuizPage() {
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<(number | string | null)[]>([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const q = loadCurrent();
    if (!q) {
      router.replace('/');
      return;
    }
    setQuiz(q);
    setAnswers(new Array(q.questions.length).fill(null));
  }, [router]);

  if (!quiz) return null;

  function setAnswer(i: number, value: number | string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  }

  function handleSubmit() {
    if (!quiz) return;
    const correct = quiz.questions.reduce(
      (acc, q, i) => acc + (gradeQuestion(q, answers[i]) ? 1 : 0),
      0
    );
    const score = correct / quiz.questions.length;
    const completed: Quiz = {
      ...quiz,
      userAnswers: answers,
      score,
      completedAt: Date.now(),
    };
    upsertQuiz(completed);
    setQuiz(completed);
    setSubmitted(true);
  }

  function handleNew() {
    clearCurrent();
    router.push('/');
  }

  const allAnswered = answers.every((a) => a !== null && a !== '');

  return (
    <main className="container max-w-3xl py-12">
      <button
        onClick={handleNew}
        className="text-sm text-muted-foreground hover:text-primary mb-6 inline-flex items-center gap-1 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> back to home
      </button>

      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{quiz.title}</h1>
        <p className="text-sm text-muted-foreground">
          {quiz.questions.length} question{quiz.questions.length === 1 ? '' : 's'}
        </p>
      </header>

      {submitted && typeof quiz.score === 'number' && (
        <Card className="mb-6 border-primary border-2 shadow-lg shadow-primary/20">
          <CardHeader>
            <CardTitle className="text-primary">your score: {Math.round(quiz.score * 100)}% ♡</CardTitle>
            <CardDescription>
              you got {quiz.questions.filter((q, i) => gradeQuestion(q, answers[i])).length} of{' '}
              {quiz.questions.length} correct ✨ review your answers below
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <ol className="space-y-4">
        {quiz.questions.map((q, i) => {
          const userAnswer = answers[i];
          const correct = submitted ? gradeQuestion(q, userAnswer) : null;

          return (
            <li key={i}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    <span className="text-muted-foreground mr-2">Q{i + 1}.</span>
                    {q.question}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {q.type === 'mc' ? (
                    <RadioGroup
                      value={userAnswer === null ? '' : String(userAnswer)}
                      onValueChange={(v) => setAnswer(i, Number(v))}
                      disabled={submitted}
                    >
                      {q.options.map((opt, idx) => {
                        const isUser = userAnswer === idx;
                        const isCorrect = q.correctIndex === idx;
                        let highlight = '';
                        if (submitted) {
                          if (isCorrect) highlight = 'text-green-700 font-medium';
                          else if (isUser && !isCorrect) highlight = 'text-destructive line-through';
                        }
                        return (
                          <div key={idx} className="flex items-center space-x-2">
                            <RadioGroupItem value={String(idx)} id={`q${i}-opt${idx}`} />
                            <Label htmlFor={`q${i}-opt${idx}`} className={`font-normal ${highlight}`}>
                              {opt}
                            </Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  ) : (
                    <Textarea
                      placeholder="Your answer…"
                      value={typeof userAnswer === 'string' ? userAnswer : ''}
                      onChange={(e) => setAnswer(i, e.target.value)}
                      disabled={submitted}
                    />
                  )}

                  {submitted && (
                    <div className="text-sm pt-2 border-t">
                      <div className="flex items-center gap-2 mb-1">
                        {correct ? (
                          <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                            <CheckCircle2 className="h-4 w-4" /> Correct
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-destructive font-medium">
                            <XCircle className="h-4 w-4" /> Incorrect
                          </span>
                        )}
                      </div>
                      {q.type === 'sa' && (
                        <p className="text-muted-foreground">
                          <span className="font-medium text-foreground">Accepted:</span>{' '}
                          {q.acceptableAnswers.join(' / ')}
                        </p>
                      )}
                      {q.explanation && (
                        <p className="text-muted-foreground mt-1">
                          <span className="font-medium text-foreground">Why:</span> {q.explanation}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 flex gap-3">
        {!submitted ? (
          <Button
            onClick={handleSubmit}
            disabled={!allAnswered}
            size="lg"
            className="font-semibold shadow-md shadow-primary/30"
          >
            submit ✨
          </Button>
        ) : (
          <Button
            onClick={handleNew}
            size="lg"
            className="font-semibold shadow-md shadow-primary/30"
          >
            make another quiz ♡
          </Button>
        )}
      </div>
    </main>
  );
}
