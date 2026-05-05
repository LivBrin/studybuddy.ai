'use client';

import { useState } from 'react';

export default function Home() {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [questionCount, setQuestionCount] = useState(5);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    console.log('🚀 Generate clicked');
    setLoading(true);

    try {
      let finalText = text;

      // 📄 Extract text from file if uploaded
      if (file) {
        console.log('📄 Extracting file...');

        const formData = new FormData();
        formData.append('file', file);

        const extractRes = await fetch('/api/extract', {
          method: 'POST',
          body: formData,
        });

        const extractData = await extractRes.json();
        console.log('Extract response:', extractData);

        if (!extractRes.ok) {
          throw new Error(extractData.error || 'Failed to extract file');
        }

        finalText = extractData.text;
      }

      // ❗ Prevent empty input
      if (!finalText.trim()) {
        alert('Please enter text or upload a file');
        return;
      }

      console.log('🧠 Generating quiz...');

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: finalText,
          questionCount,
        }),
      });

      const data = await res.json();
      console.log('Generate response:', data);

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate quiz');
      }

      if (!data || !data.questions) {
        throw new Error('No questions returned');
      }

      sessionStorage.setItem('quiz', JSON.stringify(data));

      console.log('✅ Redirecting...');
      window.location.href = '/quiz';
    } catch (err) {
      console.error('❌ ERROR:', err);
      alert('Something went wrong. Check console.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">StudyBuddy</h1>

      {/* Text input */}
      <textarea
        className="w-full border p-2 rounded mb-4"
        rows={8}
        placeholder="Paste your notes here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      {/* File upload */}
      <div className="mb-4">
        <label className="block mb-2 font-medium">
          Or upload a PDF / DOCX / TXT
        </label>
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        {file && (
          <p className="text-sm mt-1">Uploaded: {file.name}</p>
        )}
      </div>

      {/* Question count */}
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

      {/* Button */}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded w-full"
      >
        {loading ? 'Generating...' : 'Generate Quiz'}
      </button>
    </main>
  );
}
