import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Send,
  Bot,
  User,
  Lightbulb,
  TreePalm,
  Droplets,
  Zap,
  HelpCircle
} from 'lucide-react';
import { FarmTask, FarmSector, WeatherData } from '../types';

interface AiAgronomistDrawerProps {
  tasks: FarmTask[];
  sectors: FarmSector[];
  weather: WeatherData;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export const AiAgronomistDrawer: React.FC<AiAgronomistDrawerProps> = ({
  tasks,
  sectors,
  weather,
  onClose
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_1',
      sender: 'ai',
      text: 'أهلاً بك! أنا خبيرك الزراعي الذكي لمزرعة أطياب الوادي بالوادي الجديد 🌴. كيف يمكنني مساعدتك في تجهيز قطعة 9 لزراعة البرسيم الحجازي (أكتوبر 2026)، أو تخطيط وتخمير جور غرس النخيل الصعيدي بالقطعة 10 (مارس 2027)؟',
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const quickPrompts = [
    '🌾 توصيات تجهيز التربة وشبكة الرش لزراعة البرسيم الحجازي في أكتوبر 2026 (قطعة 9)',
    '🌴 خطة حفر وتخمير جور غرس فسائل النخيل الصعيدي في مارس 2027 (قطعة 10)',
    '💧 إدارة وتشغيل بركة المياه الاستراتيجية (65×65 عمق 5م) وترسيب وتدفئة مياه الري',
    '⚡ جدول تشغيل بئر الطاقة الشمسية وتغذية بركة التخزين والقطعتين'
  ];

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/agronomist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          farmContext: {
            sectorsCount: sectors.length,
            activeTasksCount: tasks.filter((t) => t.status === 'in_progress').length,
            weather
          }
        })
      });

      const data = await response.json();
      const aiReply: ChatMessage = {
        id: 'ai_' + Date.now(),
        sender: 'ai',
        text: data.response || 'عذراً، حدث خطأ أثناء تحليل الاستشارة الزراعية.',
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiReply]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          sender: 'ai',
          text: 'تنبيه: تعذر الاتصال بالخادم الذكي. يرجى مراجعة إعدادات الاتصال.',
          timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
      <div className="bg-stone-900 border-r border-stone-700 w-full max-w-lg h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="bg-stone-850 px-5 py-4 border-b border-stone-750 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-100 text-sm sm:text-base flex items-center gap-1.5">
                <span>المرشد الزراعي الذكي</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  Gemini 3.7 Flash
                </span>
              </h3>
              <p className="text-xs text-stone-400">
                استشارات تخصصية لمناخ وتربة الوادي الجديد
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 text-stone-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Prompts */}
        <div className="p-3 bg-stone-850/50 border-b border-stone-800 space-y-1.5">
          <div className="text-[11px] text-stone-400 flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span>أسئلة شائعة وسريعة:</span>
          </div>
          <div className="flex flex-col gap-1">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                className="text-right text-[11px] text-emerald-300 hover:text-emerald-200 bg-stone-800/80 hover:bg-stone-800 px-3 py-1.5 rounded-lg transition border border-stone-700 truncate cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs ${
                  m.sender === 'user'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-800 text-emerald-400 border border-stone-700'
                }`}
              >
                {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-emerald-700 text-white rounded-tr-none'
                    : 'bg-stone-850 text-stone-200 border border-stone-750 rounded-tl-none space-y-1'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>
                <div
                  className={`text-[9px] text-stone-400 text-left pt-1 ${
                    m.sender === 'user' ? 'text-emerald-200' : ''
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-stone-800 text-emerald-400 flex items-center justify-center border border-stone-700">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-stone-850 border border-stone-750 p-3 rounded-2xl text-xs text-stone-400 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>المرشد الزراعي يحلل بيانات المناخ والمحصول...</span>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="p-3.5 bg-stone-850 border-t border-stone-750 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="اكتب استشارتك الزراعية هنا..."
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputText.trim()}
            className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-lg transition cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
