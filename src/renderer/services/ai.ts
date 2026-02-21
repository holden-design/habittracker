import { Habit, AIPlanResult, AIHabitNudge } from '../types';

const API_URL = process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:5000';

export const analyzePlan = async (content: string, startDate?: string): Promise<AIPlanResult> => {
  const response = await fetch(`${API_URL}/api/ai/analyze-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, startDate }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to analyze plan');
  }

  return response.json();
};

export const getHabitNudges = async (
  habits: Habit[],
  completedToday: string[],
  currentTime?: string
): Promise<AIHabitNudge[]> => {
  const response = await fetch(`${API_URL}/api/ai/habit-nudge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      habits,
      completedToday,
      currentTime: currentTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get habit nudges');
  }

  return response.json();
};
