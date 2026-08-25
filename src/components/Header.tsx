import React, { useState } from 'react';
import {
  Shield,
  Bell,
  Wifi,
  WifiOff,
  Moon,
  Sun,
  User as UserIcon,
  UserCheck,
  MapPin,
  Sparkles,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { User, UserRole, AppNotification, WeatherData } from '../types';

interface HeaderProps {
  currentUser: User;
  onSwitchUser: (user: User) => void;
  onLogout?: () => void;
  users?: User[];
  allUsers?: User[];
  isOnline?: boolean;
  isOffline?: boolean;
  dndEnabled: boolean;
  onToggleDnd: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  notifications?: AppNotification[];
  weather?: WeatherData;
  activeAlarmCount?: number;
  syncQueueCount?: number;
  onOpenAiAgronomist?: () => void;
  onOpenAiDrawer?: () => void;
  onOpenApiDocs?: () => void;
  onOpenApiExplorer?: () => void;
  onOpenTestingSuite?: () => void;
  onOpenNotifications?: () => void;
  onManualSync?: () => void;
  onTriggerSync?: () => void;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSwitchUser,
  onLogout,
  users,
  allUsers,
  isOnline,
  isOffline,
  dndEnabled,
  onToggleDnd,
  theme = 'dark',
  onToggleTheme,
  notifications = [],
  weather,
  activeAlarmCount = 0,
  syncQueueCount = 0,
  onOpenAiAgronomist,
  onOpenAiDrawer,
  onOpenApiDocs,
  onOpenApiExplorer,
  onOpenTestingSuite,
  onOpenNotifications,
  onManualSync,
  onTriggerSync,
  isSyncing = false
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const userList = users || allUsers || [];
  const notifList = notifications || [];
  const unreadNotifs = notifList.filter((n) => n && !n.read).length;
  const isCurrentlyOnline = isOnline !== undefined ? isOnline : !isOffline;

  const handleAiClick = onOpenAiAgronomist || onOpenAiDrawer || (() => {});
  const handleApiClick = onOpenApiDocs || onOpenApiExplorer || (() => {});
  const handleSyncClick = onManualSync || onTriggerSync || (() => {});

  const currentWeather = weather || {
    temperatureC: 36,
    conditionAr: 'صافي ومشمس',
    alerts: []
  };

  return (
    <header className="bg-stone-900/95 backdrop-blur border-b border-stone-800 sticky top-0 z-40 px-3 sm:px-6 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Farm Identity */}
        <div className="flex items-center justify-between w-full md:w-auto gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30 ring-2 ring-emerald-500/20">
              <span className="text-xl">🌴</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-stone-100 tracking-tight flex items-center gap-1.5">
                  مزرعة أطياب الوادي
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                  الوادي الجديد
                </span>
              </div>
              <p className="text-xs text-stone-400">
                منظومة إدارة المهام الذكية والتوثيق الجغرافي بالـ GPS
              </p>
            </div>
          </div>

          {/* Mobile Quick Toggles */}
          <div className="flex md:hidden items-center gap-2">
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className={`p-2 rounded-lg border text-xs flex items-center justify-center transition cursor-pointer ${
                  theme === 'light'
                    ? 'bg-amber-100 border-amber-300 text-amber-700'
                    : 'bg-stone-800 border-stone-700 text-amber-400'
                }`}
                title={theme === 'light' ? 'التحويل للنمط الليلي' : 'التحويل للنمط النهاري (ضوء الشمس)'}
              >
                {theme === 'light' ? <Moon className="w-4 h-4 text-indigo-600" /> : <Sun className="w-4 h-4 text-amber-400" />}
              </button>
            )}
            {onOpenNotifications && (
              <button
                onClick={onOpenNotifications}
                className="relative p-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 hover:text-white"
                title="الإشعارات"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifs > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {unreadNotifs}
                  </span>
                )}
              </button>
            )}
            <div
              className={`px-2 py-1 rounded text-xs flex items-center gap-1 font-medium ${
                isCurrentlyOnline
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-amber-950 text-amber-400 border border-amber-800'
              }`}
            >
              {isCurrentlyOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            </div>
          </div>
        </div>

        {/* Global Controls & Status */}
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 w-full md:w-auto">
          {/* Theme Mode Switcher Button (Desktop) */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer shadow-sm ${
                theme === 'light'
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-800 hover:bg-amber-500/20'
                  : 'bg-stone-800 border-stone-700 text-amber-300 hover:text-amber-200 hover:bg-stone-750'
              }`}
              title={
                theme === 'light'
                  ? 'النمط النهاري مفعل (مريح لضوء الشمس). اضغط للتحويل للنمط الليلي'
                  : 'النمط الليلي مفعل. اضغط للتحويل للنمط النهاري المريح تحت ضوء الشمس القوي'
              }
            >
              {theme === 'light' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-600" />
                  <span>النمط النهاري (شمس)</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>النمط النهاري</span>
                </>
              )}
            </button>
          )}

          {/* Weather Quick Badge */}
          {currentWeather && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-800/80 border border-stone-700 text-xs text-stone-300">
              <span className="text-amber-400">☀️ {currentWeather.temperatureC}°م</span>
              <span className="text-stone-500">|</span>
              <span>الخارجة: {currentWeather.conditionAr?.split(' ')[0] || 'معتدل'}</span>
              {currentWeather.alerts && currentWeather.alerts.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              )}
            </div>
          )}

          {/* AI Agronomist Button */}
          <button
            onClick={handleAiClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-900/20 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>المستشار الذكي (AI)</span>
          </button>

          {/* DND Toggle */}
          <button
            onClick={onToggleDnd}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
              dndEnabled
                ? 'bg-indigo-950/80 border-indigo-700 text-indigo-300'
                : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-stone-200'
            }`}
            title={dndEnabled ? 'وضع عدم الإزعاج مفعل' : 'تفعيل وضع عدم الإزعاج'}
          >
            <Moon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">عدم الإزعاج</span>
          </button>

          {/* Online / Offline status & Sync */}
          <button
            onClick={handleSyncClick}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
              isCurrentlyOnline
                ? 'bg-stone-800 border-stone-700 text-emerald-400 hover:bg-stone-750'
                : 'bg-amber-950/70 border-amber-800 text-amber-300'
            }`}
            title="حالة الاتصال ومزامنة البيانات"
          >
            {isCurrentlyOnline ? (
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="hidden sm:inline">
              {isCurrentlyOnline ? (isSyncing ? 'مزامنة...' : 'متصل') : 'أوفلاين'}
              {syncQueueCount > 0 && ` (${syncQueueCount})`}
            </span>
          </button>

          {/* Testing & Maintenance Suite Button */}
          {onOpenTestingSuite && (
            <button
              onClick={onOpenTestingSuite}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-300 hover:text-white text-xs cursor-pointer"
              title="مركز الاختبارات والصيانة"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">الاختبارات</span>
            </button>
          )}

          {/* API & ER Explorer Button */}
          <button
            onClick={handleApiClick}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-300 hover:text-white text-xs cursor-pointer"
            title="بنية النظام وواجهات API"
          >
            <Database className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">API & ER</span>
          </button>

          {/* Notifications Bell */}
          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="hidden md:flex relative p-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-300 hover:text-white cursor-pointer"
              title="سجل الإشعارات"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifs > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {unreadNotifs}
                </span>
              )}
            </button>
          )}

          {/* User Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-700 text-stone-200 text-xs transition cursor-pointer"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-inner ${
                  currentUser?.role === 'manager'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : currentUser?.role === 'supervisor'
                    ? 'bg-sky-950 text-sky-300 border border-sky-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}
              >
                {currentUser?.name ? currentUser.name.charAt(0) : <UserIcon className="w-3.5 h-3.5" />}
              </div>
              <div className="text-right hidden sm:block">
                <div className="font-semibold text-xs leading-tight">{currentUser?.name?.split(' ')[0] || 'المستخدم'}</div>
                <div className="text-[10px] text-emerald-400">{currentUser?.roleTitleAr || 'عامل'}</div>
              </div>
              <span className="text-[10px] bg-stone-900 px-1.5 py-0.5 rounded border border-stone-700 font-mono">
                {currentUser?.role === 'manager' ? 'مدير' : currentUser?.role === 'supervisor' ? 'مشرف' : 'عامل'}
              </span>
            </button>

            {showUserDropdown && (
              <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-stone-800 border border-stone-700 shadow-2xl p-2 z-50 animate-in fade-in slide-from-top-2">
                <div className="px-3 py-2 border-b border-stone-700 mb-1">
                  <div className="text-xs font-bold text-stone-300">تبديل المستخدم (محاكاة الصلاحيات)</div>
                  <div className="text-[11px] text-stone-500">اختر مستخدماً لاختبار تجربة الدور</div>
                </div>
                {userList.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      onSwitchUser(u);
                      setShowUserDropdown(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-right transition cursor-pointer ${
                      currentUser?.id === u.id
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-semibold'
                        : 'text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        u.role === 'manager'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : u.role === 'supervisor'
                          ? 'bg-sky-950 text-sky-300 border border-sky-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {u.name ? u.name.charAt(0) : <UserIcon className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-stone-100">{u.name}</div>
                      <div className="text-[10px] text-stone-400">{u.roleTitleAr}</div>
                    </div>
                    {u.role === 'manager' && (
                      <span className="text-[10px] bg-rose-950 text-rose-300 px-1.5 py-0.5 rounded border border-rose-800">
                        مدير
                      </span>
                    )}
                  </button>
                ))}

                {/* Theme Mode Toggle Inside Dropdown */}
                {onToggleTheme && (
                  <div className="pt-2 mt-1 border-t border-stone-700">
                    <button
                      onClick={() => {
                        onToggleTheme();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs bg-stone-900/60 hover:bg-stone-700 text-stone-200 border border-stone-700/80 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {theme === 'light' ? (
                          <Sun className="w-4 h-4 text-amber-500" />
                        ) : (
                          <Moon className="w-4 h-4 text-indigo-400" />
                        )}
                        <span>سمة الواجهة:</span>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-stone-800 text-emerald-400 border border-stone-700">
                        {theme === 'light' ? 'النمط النهاري (شمس)' : 'النمط الليلي'}
                      </span>
                    </button>
                  </div>
                )}

                {onLogout && (
                  <div className="pt-2 mt-1 border-t border-stone-700">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onLogout();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-300 hover:bg-rose-950/60 border border-rose-900/60 font-semibold transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>تسجيل الخروج وقفل المنظومة</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Direct Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/80 text-rose-300 hover:text-rose-100 text-xs transition cursor-pointer"
              title="تسجيل الخروج وقفل المنظومة"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden lg:inline font-semibold">خروج</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
