// ============================================================
// Fit Tracker PRO — OpenAI Service
// Sends messages to OpenAI Chat Completions API.
// Users provide their own API key (stored in localStorage).
// Falls back to curated mock responses when no key is set.
//
// To enable real AI: enter your OpenAI API key in the chat UI.
// Get a key at: https://platform.openai.com/api-keys
// ============================================================
import type { ChatMessage } from '../types';

const SYSTEM_PROMPT = `You are FitBot, an elite AI personal trainer and nutritionist for Fit Tracker PRO.
You help users with:
- Creating personalized workout plans
- Building custom meal/diet plans
- Giving expert fitness advice
- Motivating and supporting users on their fitness journey
- Explaining exercises and proper form
Keep responses concise, motivating, and actionable. Use emojis sparingly for energy.`;

// ─── Mock responses for demo (no API key required) ──────────────────────────
const MOCK_RESPONSES: Record<string, string> = {
  workout: `Here's a 4-day split workout plan tailored for muscle growth 💪\n\n**Day 1 – Push (Chest/Shoulders/Triceps)**\n- Bench Press: 4×8 @ 75% 1RM\n- Overhead Press: 3×10\n- Incline Dumbbell Press: 3×12\n- Lateral Raises: 3×15\n- Tricep Pushdowns: 3×12\n\n**Day 2 – Pull (Back/Biceps)**\n- Deadlift: 4×5 @ 80% 1RM\n- Pull-ups: 4×8\n- Barbell Rows: 3×10\n- Face Pulls: 3×15\n- Hammer Curls: 3×12\n\n**Day 3 – REST or Light Cardio**\n\n**Day 4 – Legs**\n- Squat: 5×5 @ 80% 1RM\n- Romanian Deadlift: 3×10\n- Leg Press: 3×12\n- Walking Lunges: 3×10 each leg\n- Calf Raises: 4×20\n\nRest 2–3 min between heavy sets. Stay consistent! 🔥`,

  diet: `Here's a high-protein nutrition plan for muscle building 🥗\n\n**Daily Targets:** ~2,800 kcal | 200g Protein | 300g Carbs | 80g Fat\n\n**Meal 1 – Breakfast**\n- 5 egg whites + 2 whole eggs scrambled\n- 1 cup oatmeal with berries\n- 1 banana\n\n**Meal 2 – Pre-Workout**\n- Greek yogurt (200g)\n- 1 apple + handful almonds\n\n**Meal 3 – Post-Workout**\n- 200g chicken breast\n- 1 cup brown rice\n- 1 cup broccoli + olive oil\n\n**Meal 4 – Dinner**\n- 200g salmon\n- Sweet potato (medium)\n- Mixed greens salad\n\n**Meal 5 – Evening**\n- Cottage cheese (150g)\n- Casein protein shake (optional)\n\nHydration: Drink 3–4L of water daily! 💧`,

  motivation: `You've GOT this! 🔥\n\nEvery rep you do, every meal you track, every time you show up — you're becoming someone different. Someone stronger. Someone who keeps their word to themselves.\n\nRemember:\n✅ Progress > Perfection\n✅ Consistency > Intensity\n✅ Small wins compound into massive results\n\nYour future self is cheering you on. Don't let them down. Now go crush that workout! 💪🚀`,

  default: `Great question! As your AI fitness coach, I'm here to help you reach your goals. I can:\n\n🏋️ **Create workout plans** – Tell me your goals, equipment available, and schedule\n🥗 **Design diet plans** – Share your caloric targets and food preferences\n📊 **Analyze your progress** – Discuss your metrics and adjust the plan\n💡 **Answer fitness questions** – Exercise form, nutrition science, recovery\n\nWhat would you like help with today?`,
};

function getMockResponse(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('workout') || lower.includes('exercise') || lower.includes('train')) {
    return MOCK_RESPONSES.workout;
  }
  if (lower.includes('diet') || lower.includes('meal') || lower.includes('nutrition') || lower.includes('eat')) {
    return MOCK_RESPONSES.diet;
  }
  if (lower.includes('motivat') || lower.includes('inspire') || lower.includes('tired')) {
    return MOCK_RESPONSES.motivation;
  }
  return MOCK_RESPONSES.default;
}

export const openaiService = {
  getApiKey(): string {
    return localStorage.getItem('fit_openai_key') || '';
  },

  setApiKey(key: string): void {
    localStorage.setItem('fit_openai_key', key);
  },

  /**
   * Send a message to OpenAI GPT-4.
   * If no API key is set, returns a curated mock response.
   */
  async sendMessage(messages: ChatMessage[]): Promise<string> {
    const apiKey = openaiService.getApiKey();

    // No API key → use mock response
    if (!apiKey) {
      await new Promise(r => setTimeout(r, 800 + Math.random() * 700)); // Simulate latency
      const lastMsg = messages[messages.length - 1]?.content || '';
      return getMockResponse(lastMsg);
    }

    // Real OpenAI call
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Cost-effective model
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No response received.';
  },
};
