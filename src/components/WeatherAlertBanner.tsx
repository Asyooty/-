import React, { useState } from 'react';
import {
  AlertTriangle,
  Flame,
  Wind,
  Sun,
  Radio,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  Thermometer,
  ShieldCheck,
  PauseCircle,
  PlayCircle,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { WeatherData, User } from '../types';
import { FarmStorageService } from '../services/storage';

interface WeatherAlertBannerProps {
  weather: WeatherData;
  currentUser: User;
  onNavigateToWeather?: () => void;
  onUpdateWeather?: (newWeather: WeatherData) => void;
  onBroadcastSafetyAlert?: (message: string) => void;
}

export const WeatherAlertBanner: React.FC<WeatherAlertBannerProps> = ({
  weather,
  currentUser,
  onNavigateToWeather,
  onUpdateWeather,
  onBroadcastSafetyAlert
}) => {
  // Weather warning on the main interface is strictly restricted to Managers
  if (currentUser?.role !== 'manager') {
    return null;
  }

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isBroadcasted, setIsBroadcasted] = useState(false);
  const [isFieldWorkPaused, setIsFieldWorkPaused] = useState(false);
  const [isAcknowledged, setIsAcknowledged] = useState(false);

  const thresholds = FarmStorageService.getWeatherThresholds();

  // Determine severity based on weather data vs thresholds
  const isExtremeHeat =
    weather.temperatureC >= thresholds.heatDangerTempC ||
    weather.temperatureC >= 43;
  const isHeatWarning =
    weather.temperatureC >= thresholds.heatWarningTempC ||
    weather.conditionCode === 'heatwave';
  const isDustStorm =
    weather.windSpeedKmH >= thresholds.windWarningSpeedKmH ||
    weather.conditionCode === 'dust_storm';
  const isHighUv = weather.uvIndex >= thresholds.uvDangerIndex;
  const hasSevereAlerts = weather.alerts && weather.alerts.length > 0;

  const isSevere = isExtremeHeat || isHeatWarning || isDustStorm || isHighUv || hasSevereAlerts;

  if (!isSevere) {
    return null;
  }

  // Determine top severity level & color accents
  const isDanger =
    isExtremeHeat ||
    weather.windSpeedKmH >= thresholds.windDangerSpeedKmH ||
    (weather.alerts && weather.alerts.some((a) => a.level === 'danger'));

  const primaryAlert = weather.alerts?.[0];

  const handleBroadcast = () => {
    const alertMsg = isExtremeHeat
      ? `🚨 تنبيه سلامة عاجل لجميع العمال: موجة حرارة شديدة (${weather.temperatureC}°م) - يرجى الالتزام بالاستراحة المظللة وشرب السوائل ووقف الرش الميداني.`
      : `⚠️ تحذير سلامة للعمال: نشاط رياح وأتربة (${weather.windSpeedKmH} كم/س) - يرجى ارتداء الكمامات وتأمين المعدات في القطاعات.`;

    if (onBroadcastSafetyAlert) {
      onBroadcastSafetyAlert(alertMsg);
    } else {
      FarmStorageService.checkAndAutoDispatchWeatherAlerts(weather, currentUser, alertMsg);
    }

    setIsBroadcasted(true);
    setTimeout(() => setIsBroadcasted(false), 5000);
  };

  const handleTogglePauseWork = () => {
    const nextState = !isFieldWorkPaused;
    setIsFieldWorkPaused(nextState);

    FarmStorageService.logAudit({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'weather_alert_issued',
      actionTitleAr: nextState ? 'تعليق الأعمال الشاقة مؤقتاً' : 'استئناف العمليات الميدانية',
      details: nextState
        ? `قام (${currentUser.name}) بتعليق المهام الشاقة تحت الشمس المباشرة حرصاً على سلامة العمال.`
        : `قام (${currentUser.name}) برفع تعليق العمليات بعد استقرار المعايير المناخية.`,
      severity: nextState ? 'critical' : 'info'
    });
  };

  const handleWorkerAcknowledge = () => {
    setIsAcknowledged(true);
    FarmStorageService.logAudit({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'weather_alert_issued',
      actionTitleAr: 'تأكيد الالتزام بتوجيهات السلامة الجوية',
      details: `قام العامل (${currentUser.name}) بتأكيد قراءة وتنفيذ تدابير السلامة في قطاع العمل الميداني.`,
      severity: 'info'
    });
  };

  return (
    <aside
      id="weather-smart-safety-banner"
      aria-label="لوحة التنبيهات الجوية الذكية وسلامة العاملين"
      className={`w-full transition-all duration-300 border-y ${
        isDanger
          ? 'bg-gradient-to-r from-rose-950/95 via-amber-950/90 to-rose-950/95 border-rose-600/60 shadow-lg shadow-rose-950/40 text-stone-100'
          : 'bg-gradient-to-r from-amber-950/95 via-stone-900/95 to-amber-950/90 border-amber-500/50 shadow-md text-stone-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-3.5">
        {/* Main Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Right Section: Alert Title and Status */}
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                isDanger
                  ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/20'
                  : 'bg-amber-500 text-stone-950 ring-4 ring-amber-500/20'
              }`}
            >
              {isExtremeHeat || isHeatWarning ? (
                <Flame className="w-5 h-5" />
              ) : isDustStorm ? (
                <Wind className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>

            <div className="space-y-0.5 text-right">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    isDanger ? 'bg-rose-600 text-white' : 'bg-amber-400 text-stone-950'
                  }`}
                >
                  {isDanger ? '🚨 تحذير جوي حرج' : '⚠️ تنبيه جوي مناخي'}
                </span>

                {thresholds.autoDispatchEnabled && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800">
                    ⚡ تم الإرسال التلقائي للعمال
                  </span>
                )}

                <h2 className="font-bold text-sm sm:text-base text-stone-100">
                  {primaryAlert?.title ||
                    (isExtremeHeat
                      ? 'موجة شديدة الحرارة في حقول الوادي'
                      : isDustStorm
                      ? 'نشاط للرياح المحملة بالأتربة'
                      : 'ارتفاع في درجات الحرارة')}
                </h2>

                <span className="text-[11px] text-stone-300 font-mono bg-stone-900/80 px-2 py-0.5 rounded-lg border border-stone-700">
                  📍 {weather.locationName.split('-')[0] || 'أطياب الوادي'} ({weather.temperatureC}°م)
                </span>
              </div>

              <p className="text-xs text-stone-300 line-clamp-1 sm:line-clamp-none">
                {primaryAlert?.description ||
                  'حرصاً على سلامة العاملين بالمزرعة، يرجى الالتزام ببروتوكولات الإجهاد الحراري وتأجيل الأعمال المعرضة للشمس المباشرة.'}
              </p>
            </div>
          </div>

          {/* Left Section: Real-time Weather Badges & Quick Action Controls */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Live Badges */}
            <div className="hidden sm:flex items-center gap-1.5 bg-stone-900/80 p-1 rounded-xl border border-stone-750 text-xs font-mono">
              <span
                className="flex items-center gap-1 text-rose-300 px-2 py-0.5 rounded-lg bg-rose-950/60"
                title="درجة الحرارة والمحسوسة"
              >
                <Thermometer className="w-3.5 h-3.5" />
                <strong className="font-bold">{weather.temperatureC}°م</strong>
                <span className="text-[10px] text-stone-400">({weather.feelsLikeC}°م)</span>
              </span>

              <span
                className="flex items-center gap-1 text-amber-300 px-2 py-0.5 rounded-lg bg-amber-950/60"
                title="سرعة الرياح"
              >
                <Wind className="w-3.5 h-3.5" />
                <span>{weather.windSpeedKmH} كم/س</span>
              </span>

              <span
                className="flex items-center gap-1 text-sky-300 px-2 py-0.5 rounded-lg bg-sky-950/60"
                title="مؤشر الأشعة فوق البنفسجية UV"
              >
                <Sun className="w-3.5 h-3.5" />
                <span>UV: {weather.uvIndex}</span>
              </span>
            </div>

            {/* Worker Acknowledge Button (For workers) */}
            {currentUser.role === 'worker' && (
              <button
                id="btn-worker-acknowledge-banner"
                onClick={handleWorkerAcknowledge}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                  isAcknowledged
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-850 hover:bg-stone-800 border border-stone-700 text-stone-200'
                }`}
              >
                {isAcknowledged ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تم تأكيد الالتزام</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>تأكيد استلام التعليمات</span>
                  </>
                )}
              </button>
            )}

            {/* Broadcast Safety Alert Button (Manager & Supervisor) */}
            {(currentUser.role === 'manager' || currentUser.role === 'supervisor') && (
              <button
                id="btn-broadcast-safety-alert"
                onClick={handleBroadcast}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                  isBroadcasted
                    ? 'bg-emerald-600 text-white'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
                title="إرسال إشعار فوري لجميع عمال الميدان بتعليمات السلامة"
              >
                {isBroadcasted ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تم البث للعمال!</span>
                  </>
                ) : (
                  <>
                    <Radio className="w-3.5 h-3.5" />
                    <span>بث تنبيه سلامة</span>
                  </>
                )}
              </button>
            )}

            {/* Emergency Field Work Pause Button (Manager only) */}
            {currentUser.role === 'manager' && (
              <button
                id="btn-toggle-pause-work"
                onClick={handleTogglePauseWork}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  isFieldWorkPaused
                    ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                    : 'bg-stone-850 hover:bg-stone-800 border border-stone-700 text-stone-200'
                }`}
                title="تعليق الأعمال الشاقة في أوقات الذروة لحماية العمال"
              >
                {isFieldWorkPaused ? (
                  <>
                    <PlayCircle className="w-3.5 h-3.5 text-stone-950" />
                    <span>العمليات معلقة (استئناف)</span>
                  </>
                ) : (
                  <>
                    <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>تعليق العمل الشاق</span>
                  </>
                )}
              </button>
            )}

            {/* View Full Weather Station & Safety History Button */}
            {onNavigateToWeather && (
              <button
                id="btn-open-weather-tab"
                onClick={onNavigateToWeather}
                className="px-2.5 py-1.5 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-white text-xs font-medium transition flex items-center gap-1 cursor-pointer"
                title="الانتقال إلى محطة الأرصاد وسجل التنبيهات التاريخي"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">سجل الأرصاد</span>
              </button>
            )}

            {/* Expand/Collapse Toggle Button */}
            <button
              id="btn-toggle-weather-alert-details"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-stone-700 text-stone-400 hover:text-stone-200 transition cursor-pointer"
              title={isCollapsed ? 'عرض تفاصيل وإرشادات السلامة' : 'طي الإرشادات'}
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expanded Worker Safety Guidelines & Directives */}
        {!isCollapsed && (
          <div className="mt-3 pt-3 border-t border-stone-700/60 grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs text-stone-200 animate-in fade-in duration-200">
            {/* 1. Worker Protection Protocols */}
            <div className="bg-stone-900/80 p-2.5 rounded-xl border border-stone-800 space-y-1">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>بروتوكول وقاية وسلامة العاملين</span>
              </div>
              <ul className="space-y-1 text-[11px] text-stone-300 list-disc list-inside">
                <li>حظر العمل تحت أشعة الشمس المباشرة (12:00 م - 03:30 م).</li>
                <li>توفير استراحات مظللة ومياه شرب باردة وأملاح تعويضية بالقطاعات.</li>
                <li>ارتداء قبعات ونظارات واقية وكمامات ضد الأتربة الدقيقة.</li>
              </ul>
            </div>

            {/* 2. Agricultural & Crops Safety Directives */}
            <div className="bg-stone-900/80 p-2.5 rounded-xl border border-stone-800 space-y-1">
              <div className="font-bold text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>تعليمات المحاصيل والعمليات الحقلية</span>
              </div>
              <ul className="space-y-1 text-[11px] text-stone-300 list-disc list-inside">
                <li>وقف رش المبيدات والمغذيات الورقية تماماً أثناء ارتفاع الحرارة والرياح.</li>
                <li>تفعيل برامج الري الليلي الإجباري للنخيل لتعويض معدل البخر المرتفع.</li>
                <li>تأمين وتثبيت أكمام عراجين البلح وحماية ألواح الطاقة الشمسية.</li>
              </ul>
            </div>

            {/* 3. Operational Scenario Simulator */}
            <div className="bg-stone-900/80 p-2.5 rounded-xl border border-stone-800 space-y-1.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  محاكي الإنذار المناخي:
                </span>
                <span className="text-[10px] text-stone-400 font-mono">
                  {new Date(weather.updatedAt).toLocaleTimeString('ar-EG', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>

              {onUpdateWeather && (
                <div className="grid grid-cols-3 gap-1 pt-1">
                  <button
                    onClick={() =>
                      onUpdateWeather({
                        ...weather,
                        temperatureC: 44.5,
                        feelsLikeC: 47.0,
                        humidityPercent: 12,
                        windSpeedKmH: 22,
                        conditionAr: 'موجة حرارية شديدة وجافة',
                        conditionCode: 'heatwave',
                        evapotranspirationMmDay: 11.2,
                        alerts: [
                          {
                            id: 'alt_heat_extreme',
                            title: '🚨 طوارئ: موجة حرارية قصوى (44.5°م)',
                            description:
                              'وقف كامل لأعمال التسميد الورقي والرش الكيماوي، وتفعيل برامج الري الليلي الإجباري لتفادي إجهاد النخيل.',
                            level: 'danger',
                            category: 'heat',
                            actionRequired: 'تشغيل محطات الري بالتنقيط ليلاً لتقليل التبخر'
                          }
                        ]
                      })
                    }
                    className="px-1.5 py-1 rounded bg-rose-950 hover:bg-rose-900 border border-rose-800 text-[10px] text-rose-200 font-bold transition text-center cursor-pointer"
                  >
                    حرارة 44.5°
                  </button>

                  <button
                    onClick={() =>
                      onUpdateWeather({
                        ...weather,
                        temperatureC: 38.0,
                        feelsLikeC: 40.2,
                        humidityPercent: 20,
                        windSpeedKmH: 48,
                        windDirection: 'جنوبية غربية (رياح خماسينية محملة بالأتربة)',
                        conditionAr: 'عاصفة ترابية نشطة (رؤية منخفضة)',
                        conditionCode: 'dust_storm',
                        evapotranspirationMmDay: 8.5,
                        alerts: [
                          {
                            id: 'alt_dust_1',
                            title: '⚠️ تحذير عاصفة ترابية خماسينية (48 كم/س)',
                            description:
                              'إيقاف الرشاشات المحورية (بيڤوت) فوراً وتثبيت أكمام عراجين البلح وحماية لوحات الطاقة الشمسية.',
                            level: 'warning',
                            category: 'spray_warning',
                            actionRequired: 'إيقاف الرشاشات المحورية وتأمين مضخات الآبار'
                          }
                        ]
                      })
                    }
                    className="px-1.5 py-1 rounded bg-amber-950 hover:bg-amber-900 border border-amber-800 text-[10px] text-amber-200 font-bold transition text-center cursor-pointer"
                  >
                    عاصفة 48كم
                  </button>

                  <button
                    onClick={() =>
                      onUpdateWeather({
                        ...weather,
                        temperatureC: 33.0,
                        feelsLikeC: 34.2,
                        humidityPercent: 25,
                        windSpeedKmH: 14,
                        windDirection: 'شمالية معتدلة',
                        conditionAr: 'طقس معتدل ومثالي للعمليات الزراعية',
                        conditionCode: 'sunny',
                        evapotranspirationMmDay: 6.2,
                        alerts: []
                      })
                    }
                    className="px-1.5 py-1 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-[10px] text-emerald-200 font-bold transition text-center cursor-pointer"
                  >
                    معتدل 33°
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
