// ============================================================
// Fit Tracker PRO — AI Personal Trainer Chat
// Uses OpenAI GPT-4 (or mock responses) for fitness coaching.
// Free users: 5 messages/day | Premium: unlimited.
// ============================================================
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, User, Key, X, Zap, RefreshCw, Info, Crown } from 'lucide-react';
import { Link } from 'react-router';
import { openaiService } from '../../services/openaiService';
import { useAuth } from '../../context/AuthContext';
import { useFreemium } from '../../context/FreemiumContext';
import type { ChatMessage } from '../../types';

const QUICK_PROMPTS = [
  { label: '💪 Workout Plan', msg: 'Create a 4-day workout plan to build muscle. I have access to a full gym.' },
  { label: '🥗 Diet Plan', msg: 'Create a high-protein meal plan for muscle building at 2800 calories per day.' },
  { label: '🔥 Lose Fat Fast', msg: 'What\'s the most effective strategy to lose 10kg in 2 months while maintaining muscle?' },
  { label: '🏃 Cardio Tips', msg: 'What\'s the best cardio for fat loss that doesn\'t destroy muscle? Give me a weekly plan.' },
  { label: '😴 Recovery', msg: 'How should I structure my rest days and recovery? I train 5 days a week.' },
  { label: '🎯 Motivate Me', msg: 'I\'ve been skipping workouts and feel unmotivated. Help me get back on track.' },
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-green-400 rounded-full"
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

function formatMessage(text: string) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) {
      return <p key={i} className="text-white mt-3 mb-1" style={{ fontWeight: 700 }}>{line.slice(2, -2)}</p>;
    }
    if (line.startsWith('- ')) {
      return <li key={i} className="text-gray-300 ml-4 list-disc">{line.slice(2)}</li>;
    }
    if (line.trim() === '') return <br key={i} />;
    return <p key={i} className="text-gray-300">{line}</p>;
  });
}

export default function AITrainerChat() {
  const { user } = useAuth();
  const { isPremium, aiMessagesLeft, decrementAiMessages } = useFreemium();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content: `Hey ${user?.name?.split(' ')[0] || 'there'}! 👋 I'm FitBot, your AI personal trainer. I can create workout plans, design meal plans, analyze your progress, and keep you motivated.\n\nWhat can I help you with today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState(openaiService.getApiKey());
  const [apiKeyInput, setApiKeyInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    // Free user message limit check
    if (!isPremium && aiMessagesLeft <= 0) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    try {
      const allMessages = [...messages, userMsg];
      const reply = await openaiService.sendMessage(allMessages);
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      // Decrement message counter for free users
      decrementAiMessages();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response.';
      const errMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `⚠️ Error: ${errorMessage}\n\nMake sure your OpenAI API key is valid, or use demo mode without a key.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const saveApiKey = () => {
    openaiService.setApiKey(apiKeyInput);
    setApiKey(apiKeyInput);
    setShowApiKeyInput(false);
    setApiKeyInput('');
  };

  const clearApiKey = () => {
    openaiService.setApiKey('');
    setApiKey('');
  };

  const clearChat = () => {
    setMessages([{
      id: '0',
      role: 'assistant',
      content: `Chat cleared! What can I help you with, ${user?.name?.split(' ')[0] || 'there'}?`,
      timestamp: new Date(),
    }]);
  };

  return (
    <div className="flex flex-col h-full max-h-screen">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white" style={{ fontWeight: 700 }}>FitBot AI Trainer</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-gray-400 text-xs">
                {apiKey ? 'GPT-4 Mode' : 'Demo Mode'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowApiKeyInput(v => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-colors ${
              apiKey
                ? 'border-green-500/30 bg-green-500/10 text-green-400'
                : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'
            }`}
          >
            <Key className="w-3 h-3" />
            {apiKey ? 'API Key Set' : 'Set API Key'}
          </button>
          <button
            onClick={clearChat}
            className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
            title="Clear chat"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* API Key input panel */}
      <AnimatePresence>
        {showApiKeyInput && (
          <motion.div
            className="border-b border-gray-800 px-6 py-4 bg-gray-900"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-blue-400" />
              <p className="text-blue-400 text-xs">
                Enter your OpenAI API key to use real GPT-4 responses.
                Without a key, FitBot uses pre-written demo responses.
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-blue-300 underline ml-1">Get a key →</a>
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                placeholder="sk-..."
                className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2 text-sm outline-none focus:border-green-500"
              />
              <button
                onClick={saveApiKey}
                className="bg-green-500 hover:bg-green-400 text-white px-4 py-2 rounded-xl text-sm transition-colors"
              >
                Save
              </button>
              {apiKey && (
                <button
                  onClick={clearApiKey}
                  className="bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-2 rounded-xl transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map(msg => (
          <motion.div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                msg.role === 'assistant'
                  ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
                  : 'bg-gradient-to-br from-green-500 to-emerald-700'
              }`}
            >
              {msg.role === 'assistant' ? (
                <Bot className="w-4 h-4 text-white" />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-green-500 text-white rounded-tr-sm'
                  : 'bg-gray-800 border border-gray-700 rounded-tl-sm'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="space-y-1">{formatMessage(msg.content)}</div>
              ) : (
                <p>{msg.content}</p>
              )}
              <p className={`text-xs mt-2 opacity-60 ${msg.role === 'user' ? 'text-right' : ''}`}>
                {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </motion.div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-sm">
              <TypingIndicator />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      <div className="px-4 py-2 border-t border-gray-800 flex gap-2 overflow-x-auto flex-shrink-0">
        {QUICK_PROMPTS.map(p => (
          <button
            key={p.label}
            onClick={() => sendMessage(p.msg)}
            disabled={isLoading}
            className="flex-shrink-0 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 border border-gray-700 hover:border-gray-500 rounded-lg text-gray-400 hover:text-white text-xs transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 py-4 border-t border-gray-800 flex-shrink-0">
        <div className="flex items-end gap-3 bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 focus-within:border-green-500 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your AI trainer anything... (Press Enter to send)"
            rows={1}
            className="flex-1 bg-transparent text-white text-sm outline-none resize-none max-h-32 placeholder-gray-600"
            style={{ lineHeight: '1.5' }}
          />
          <motion.button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="w-9 h-9 bg-green-500 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
            whileTap={{ scale: 0.9 }}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Zap className="w-4 h-4 text-white" />
            )}
          </motion.button>
        </div>
        <p className="text-xs text-gray-600 text-center mt-2">
          {apiKey ? '🔑 Using OpenAI API — real AI responses' : '⚡ Demo mode — add an API key for real AI responses'}
        </p>
        {!isPremium && (
          <div className="flex items-center justify-between mt-2 px-1">
            <span className="text-xs text-gray-500">
              {aiMessagesLeft > 0
                ? `${aiMessagesLeft} free messages left today`
                : 'Daily limit reached'}
            </span>
            {aiMessagesLeft <= 0 && (
              <Link
                to="/subscription"
                className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors"
              >
                <Crown className="w-3 h-3" /> Upgrade for unlimited
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}