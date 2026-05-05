'use client';

import { useState } from 'react';

export default function Home() {
  const [text, setText] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          questionCount, // ✅ correct placement
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate');
      }

      // store quiz + redirect (adjust if your logic differs)
      sessionStorage.setItem('quiz', JSON.stringify(data));
      window.location.href = '/quiz';
    } catch (err) {
      console.error(err);
      alert('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">StudyBuddy</h1>

      <textarea
        className="w-full border p-2 rounded mb-4"
        rows={8}
        placeholder="Paste your notes here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {/* ✅ Question Count Selector */}
      <div className="mb-4">
        <label className="block mb-2 font-medium">
          Number of Questions
        </label>
        <select
          value={questionCount}
          onChange={(e) => setQuestionCount(Number(e.target.value))}
          className="border p-2 rounded w-full"
        >
          {[3, 5, 10, 15, 20].map((num) => (
            <option key={num} value={num}>
              {num}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded w-full"
      >
        {loading ? 'Generating...' : 'Generate Quiz'}
      </button>
    </main>
  );
}
