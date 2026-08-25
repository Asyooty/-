import React, { useState } from 'react';
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  Smartphone,
  MapPin,
  Clock,
  Sun,
  Moon
} from 'lucide-react';
import { User } from '../types';
import { FarmStorageService } from '../services/storage';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  availableUsers: User[];
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  availableUsers,
  theme = 'dark',
  onToggleTheme
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 2FA state if applicable
  const [pending2FaUser, setPending2FaUser] = useState<User | null>(null);
  const [totpInput, setTotpInput] = useState('');
  const [totpError, setTotpError] = useState<string | null>(null);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = FarmStorageService.authenticate(identifier, password);
      setIsLoading(false);

      if (!res.success || !res.user) {
        setErrorMessage(res.error || 'فشل تسجيل الدخول. تأكد من صحة البيانات.');
        return;
      }

      // Check if user requires 2FA step
      if (res.user.is2FAEnabled) {
        setPending2FaUser(res.user);
        return;
      }

      onLoginSuccess(res.user);
    }, 400);
  };

  const handleVerify2Fa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending2FaUser) return;

    if (totpInput.trim().length >= 4) {
      onLoginSuccess(pending2FaUser);
    } else {
      setTotpError('يرجى إدخال رمز الأمان المكون من 6 أرقام (أو رمز PIN)');
    }
  };

  const handleQuickSelect = (user: User) => {
    setIdentifier(user.username || user.email);
    setPassword(user.password || user.pinCode || '123456');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-between items-center p-4 sm:p-6 relative overflow-hidden" dir="rtl">
      {/* Background Decorative Glow */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header / Farm identity */}
      <div className="w-full max-w-lg mx-auto flex items-center justify-between py-2 border-b border-stone-850">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌴</span>
          <div>
            <h2 className="font-bold text-sm text-stone-200">مزرعة أطياب الوادي</h2>
            <p className="text-[10px] text-emerald-400">الوادي الجديد - واحة الخارجة والداخلة</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                theme === 'light'
                  ? 'bg-amber-100 border-amber-300 text-amber-800'
                  : 'bg-stone-900 border-stone-800 text-amber-400'
              }`}
              title={theme === 'light' ? 'التحويل للنمط الليلي' : 'التحويل للنمط النهاري (وضوح ضوء الشمس)'}
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>النمط الليلي</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>النمط النهاري</span>
                </>
              )}
            </button>
          )}
          <div className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-stone-900 border border-stone-800 text-stone-400">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>منظومة مؤمّنة</span>
          </div>
        </div>
      </div>

      {/* Center Auth Card */}
      <div className="w-full max-w-md my-auto py-6">
        <div className="bg-stone-900/90 backdrop-blur-md rounded-3xl border border-stone-800 shadow-2xl p-6 sm:p-8 space-y-6 relative">
          
          {/* Logo & Headline */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-3xl shadow-xl shadow-emerald-950/60 ring-4 ring-emerald-500/20">
              <span>🌴</span>
            </div>
            <h1 className="text-xl font-extrabold text-stone-100 tracking-tight">
              بوابة تسجيل الدخول
            </h1>
            <p className="text-xs text-stone-400 max-w-xs mx-auto">
              يرجى إدخال اسم المستخدم والكلمة السرية للوصول إلى لوحة إدارة المهام الميدانية
            </p>
          </div>

          {/* 2FA Challenge View */}
          {pending2FaUser ? (
            <form onSubmit={handleVerify2Fa} className="space-y-4 animate-in fade-in">
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/80 text-right space-y-1">
                <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  المصادقة الثنائية الإلزامية (2FA)
                </div>
                <div className="text-[11px] text-stone-300">
                  الحساب: <span className="font-semibold text-white">{pending2FaUser.name}</span>
                </div>
                <div className="text-[10px] text-stone-400">
                  أدخل الرمز السري أو رمز التحقق (رمز تجريبي سريع: {pending2FaUser.pinCode || '1234'})
                </div>
              </div>

              {totpError && (
                <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{totpError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-stone-300 text-right">
                  رمز المصادقة السداسي / PIN
                </label>
                <input
                  type="text"
                  autoFocus
                  value={totpInput}
                  onChange={(e) => setTotpInput(e.target.value)}
                  placeholder="أدخل الرمز (مثال: 1234)"
                  className="w-full px-4 py-3 rounded-2xl bg-stone-850 border border-stone-750 text-stone-100 text-center font-mono text-lg font-bold tracking-widest focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition cursor-pointer"
                >
                  تأكيد والدخول
                </button>
                <button
                  type="button"
                  onClick={() => setPending2FaUser(null)}
                  className="px-4 py-3 rounded-2xl bg-stone-800 hover:bg-stone-750 border border-stone-700 text-stone-300 text-xs font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          ) : (
            /* Main Login Form */
            <form onSubmit={handleFormSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Username / Email Field */}
              <div className="space-y-1.5 text-right">
                <label className="block text-xs font-semibold text-stone-300">
                  اسم المستخدم أو البريد الإلكتروني
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="مثال: ayman أو ahmed أو islam"
                    className="w-full pr-10 pl-4 py-3 rounded-2xl bg-stone-850 border border-stone-750 text-stone-100 placeholder-stone-500 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
                    <UserIcon className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5 text-right">
                <label className="block text-xs font-semibold text-stone-300">
                  كلمة المرور أو الرمز السري
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور"
                    className="w-full pr-10 pl-10 py-3 rounded-2xl bg-stone-850 border border-stone-750 text-stone-100 placeholder-stone-500 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none transition font-mono"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>تسجيل الدخول للنظام</span>
                    <ArrowLeft className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Credential Fill Selector (Test Accounts) */}
          <div className="pt-2 border-t border-stone-800/80 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] text-stone-400">
              <span className="font-semibold flex items-center gap-1 text-stone-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                الحسابات المعتمدة (تعبئة سريعة للاختبار):
              </span>
              <span className="text-[10px] text-stone-500">اختر الحساب للتعبئة التلقائية</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-right">
              {availableUsers.map((u) => {
                const isSelected =
                  identifier.toLowerCase() === (u.username || '').toLowerCase() ||
                  identifier.toLowerCase() === u.email.toLowerCase();

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleQuickSelect(u)}
                    className={`p-2.5 rounded-xl border text-right transition cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
                        : 'bg-stone-850/70 border-stone-750 hover:bg-stone-800 text-stone-300'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        u.role === 'manager'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : u.role === 'supervisor'
                          ? 'bg-sky-950 text-sky-300 border border-sky-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {u.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate text-stone-100">{u.name}</div>
                      <div className="text-[10px] text-stone-400 truncate flex items-center justify-between">
                        <span>اليوزر: <span className="font-mono text-emerald-400 font-semibold">{u.username}</span></span>
                        <span className="text-[9px] text-stone-500 font-mono">🔑 {u.password}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Security Badges */}
      <div className="w-full max-w-lg text-center space-y-1.5 py-3 border-t border-stone-850 text-stone-400 text-[11px]">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            تشفير كامل للبيانات TLS / AES-256
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            توثيق جغرافي دقيق للقطاعات
          </span>
        </div>
        <p className="text-[10px] text-stone-500">
          منظومة مزرعة أطياب الوادي © {new Date().getFullYear()} - جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
};
