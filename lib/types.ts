export type MCQuestion = {
  type: 'mc';
  question: string;
  options: string[]; // 4 options
  correctIndex: number;
  explanation?: string;
};

export type SAQuestion = {
  type: 'sa';
  question: string;
  acceptableAnswers: string[]; // list of acceptable answer strings (lowercased compared)
  explanation?: string;
};

export type Question = MCQuestion | SAQuestion;

export type Quiz = {
  id: string;
  title: string;
  createdAt: number;
  questions: Question[];
  // Filled in once submitted:
  userAnswers?: (number | string | null)[]; // index for mc, string for sa
  score?: number; // 0..1
  completedAt?: number;
};
