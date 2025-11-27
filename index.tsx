import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { streamChatResponse } from './services/geminiService';
import { Message, GeminiModel } from './types';

// --- Icons ---
const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
  </svg>
);

const RobotIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path fillRule="evenodd" d="M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6zm14.25 6a.75.75 0 01-.22.53l-2.25 2.25a.75.75 0 11-1.06-1.06L15.44 12l-1.72-1.72a.75.75 0 111.06-1.06l2.25 2.25c.141.14.22.331.22.53zm-10.28-.53a.75.75 0 000 1.06l2.25 2.25a.75.75 0 101.06-1.06L6.56 12l1.72-1.72a.75.75 0 00-1.06-1.06l-2.25 2.25a.75.75 0 00-.22.53z" clipRule="evenodd" />
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
  </svg>
);

// --- Components ---

// Simple Code Block Formatter
// Detects ```python ... ``` patterns and wraps them in a styled div
const FormattedText = ({ text }: { text: string }) => {
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="prose prose-slate max-w-none text-sm sm:text-base leading-relaxed">
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          // Extract content and optional language
          const content = part.slice(3, -3).replace(/^([a-z]*)\n/, '');
          const language = part.slice(3).match(/^([a-z]*)/)?.[1] || 'Code';
          
          return (
            <div key={index} className="my-4 rounded-lg overflow-hidden border border-slate-700 shadow-md">
              <div className="bg-slate-800 text-slate-300 px-4 py-1 text-xs font-mono border-b border-slate-700 flex justify-between">
                <span>{language}</span>
                <span>Copy (Manual)</span>
              </div>
              <pre className="bg-[#1e1e1e] text-slate-50 p-4 overflow-x-auto font-mono text-sm">
                <code>{content}</code>
              </pre>
            </div>
          );
        }
        // Regular text, handle newlines
        return <span key={index} className="whitespace-pre-wrap">{part}</span>;
      })}
    </div>
  );
};

const App = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hello! I am your Python Bot Architect. \n\nI can help you build Telegram bots using `python-telegram-bot` or `aiogram`. \n\nWhat kind of bot would you like to build today?",
      timestamp: Date.now()
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    const modelMessageId = (Date.now() + 1).toString();
    const modelMessage: Message = {
      id: modelMessageId,
      role: 'model',
      text: '',
      timestamp: Date.now() + 1,
      isStreaming: true,
    };

    setMessages(prev => [...prev, modelMessage]);

    // Stream response
    try {
      const history = messages; // Current history excluding the one we just added optimistically
      const stream = streamChatResponse(GeminiModel.FLASH, history, userMessage.text);
      
      let fullResponse = '';
      
      for await (const chunk of stream) {
        fullResponse += chunk;
        setMessages(prev => 
          prev.map(msg => 
            msg.id === modelMessageId 
              ? { ...msg, text: fullResponse } 
              : msg
          )
        );
      }
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === modelMessageId 
            ? { ...msg, isStreaming: false } 
            : msg
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white max-w-5xl mx-auto shadow-2xl overflow-hidden md:rounded-xl md:my-4 md:h-[calc(100%-2rem)] md:border border-slate-200">
      {/* Header */}
      <header className="bg-slate-900 text-white p-4 flex items-center gap-3 shadow-md z-10 shrink-0">
        <div className="bg-primary-500 p-2 rounded-lg text-white">
          <RobotIcon />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">Python Bot Architect</h1>
          <p className="text-slate-400 text-xs">Powered by Gemini 2.5 Flash</p>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 relative" ref={scrollContainerRef}>
        <div className="space-y-6">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {/* Avatar (Model) */}
              {msg.role === 'model' && (
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center shrink-0 mt-1">
                  <RobotIcon />
                </div>
              )}

              {/* Message Bubble */}
              <div 
                className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-3 shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-primary-600 text-white rounded-tr-sm' 
                    : 'bg-white text-slate-800 border border-slate-100 rounded-tl-sm'
                }`}
              >
                 {msg.role === 'user' ? (
                   <div className="whitespace-pre-wrap">{msg.text}</div>
                 ) : (
                   <FormattedText text={msg.text} />
                 )}
              </div>

              {/* Avatar (User) */}
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center shrink-0 mt-1">
                  <UserIcon />
                </div>
              )}
            </div>
          ))}
          
          {/* Loading Indicator */}
          {isTyping && messages[messages.length - 1].role === 'user' && (
             <div className="flex gap-4 justify-start">
               <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center shrink-0 mt-1">
                  <RobotIcon />
               </div>
               <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1 h-[46px]">
                 <div className="w-2 h-2 bg-slate-400 rounded-full typing-dot"></div>
                 <div className="w-2 h-2 bg-slate-400 rounded-full typing-dot"></div>
                 <div className="w-2 h-2 bg-slate-400 rounded-full typing-dot"></div>
               </div>
             </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="bg-white border-t border-slate-200 p-4 shrink-0">
        <form onSubmit={handleSend} className="relative max-w-3xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe the bot you want to build..."
            className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-full pl-6 pr-14 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent shadow-sm transition-all"
            disabled={isTyping}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isTyping}
            className="absolute right-2 top-1.5 p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <SendIcon />
          </button>
        </form>
        <div className="text-center mt-2 text-xs text-slate-400">
          Gemini can make mistakes. Review generated code before running.
        </div>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);