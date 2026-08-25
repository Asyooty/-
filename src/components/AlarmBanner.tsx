import React, { useEffect, useState } from 'react';
import {
  AlertOctagon,
  Volume2,
  VolumeX,
  Camera,
  MapPin,
  Clock,
  ShieldAlert,
  Radio,
  Sparkles
} from 'lucide-react';
import { FarmTask, User } from '../types';
import { playSirenAlarm, playSingleBeep } from '../services/audioAlarm';

interface AlarmBannerProps {
  activeTasks?: FarmTask[];
  currentUser: User;
  dndEnabled: boolean;
  onOpenVerification: (task: FarmTask) => void;
}

export const AlarmBanner: React.FC<AlarmBannerProps> = ({
  activeTasks = [],
  currentUser,
  dndEnabled,
  onOpenVerification
}) => {
  const [secondsUntilNextBeep, setSecondsUntilNextBeep] = useState(30);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  const safeTasks = activeTasks || [];

  // Filter tasks that belong to the worker/all if manager and are active & pending/in_progress
  const alarmingTasks = safeTasks.filter((t) => {
    if (!t || !t.isAlarmActive || t.status === 'completed' || t.status === 'approved') {
      return false;
    }
    // If worker, only show their tasks. If manager/supervisor, show any urgent alarming task
    if (currentUser?.role === 'worker' && t.assignedToUserId !== currentUser?.id) {
      return false;
    }
    // Check DND
    if (dndEnabled && !t.isEmergencyOverride) {
      return false;
    }
    return true;
  });

  const primaryTask = alarmingTasks[0];

  useEffect(() => {
    if (alarmingTasks.length === 0) return;

    // Countdown interval for visual alert and periodic audio siren
    const timer = setInterval(() => {
      setSecondsUntilNextBeep((prev) => {
        if (prev <= 1) {
          if (!isAudioMuted) {
            playSirenAlarm(2);
          }
          return 30; // repeat every 30s in active foreground mode (simulating 30min cycle)
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [alarmingTasks.length, isAudioMuted]);

  if (alarmingTasks.length === 0 || !primaryTask) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-rose-950 via-red-900 to-rose-950 border-y-2 border-rose-500 shadow-2xl px-4 py-3.5 sticky top-[61px] z-30 animate-pulse-alarm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Alarm Info */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-12 h-12 rounded-2xl bg-rose-600 flex items-center justify-center text-white shadow-lg animate-bounce shrink-0">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-800 text-rose-100 text-xs font-black uppercase tracking-wider border border-rose-400">
                🚨 تنبيه نشط ومستمر (كل 30 دقيقة)
              </span>
              {primaryTask.isEmergencyOverride && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 text-[11px] font-bold">
                  متجاوز لوضع عدم الإزعاج
                </span>
              )}
              <span className="text-xs text-rose-200 font-mono flex items-center gap-1">
                <Clock className="w-3 h-3" />
                تكرار الرنين خلال: {secondsUntilNextBeep} ثانية
              </span>
            </div>

            <h3 className="font-bold text-white text-sm sm:text-base mt-1 line-clamp-1">
              {primaryTask.title}
            </h3>

            <p className="text-xs text-rose-200 flex items-center gap-2 mt-0.5">
              <span>📍 {primaryTask.sectorName}</span>
              <span>•</span>
              <span>👤 المنفذ: {primaryTask.assignedToName}</span>
              <span>•</span>
              <span className="text-rose-300 font-semibold">
                ⚠️ لا يمكن إيقاف التنبيه إلا بتوثيق صورة وGPS معتمد
              </span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* Sound Test / Mute toggle */}
          <button
            onClick={() => {
              playSirenAlarm(1.5);
              setIsAudioMuted(!isAudioMuted);
            }}
            className="px-3 py-2 rounded-xl bg-rose-900/80 hover:bg-rose-800 border border-rose-600 text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="تجربة صوت الصفارة"
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-white" />}
            <span>{isAudioMuted ? 'كتم مؤقت' : 'صوت الإنذار'}</span>
          </button>

          {/* Verification & Dismissal Action */}
          <button
            onClick={() => onOpenVerification(primaryTask)}
            className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-rose-900 font-black text-xs sm:text-sm shadow-xl shadow-rose-950/50 flex items-center justify-center gap-2 transition transform active:scale-95 cursor-pointer"
          >
            <Camera className="w-4 h-4 text-rose-700" />
            <span>📸 توثيق وإيقاف التنبيه</span>
          </button>
        </div>
      </div>
    </div>
  );
};
