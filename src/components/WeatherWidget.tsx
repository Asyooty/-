import React, { useState, useEffect } from 'react';
import {
  Sun,
  Wind,
  Droplets,
  AlertTriangle,
  Flame,
  RefreshCw,
  Sliders,
  Bell,
  BellRing,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Download,
  Search,
  Filter,
  Radio,
  Send,
  History,
  Settings2,
  Clock,
  UserCheck,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Volume2
} from 'lucide-react';
import {
  WeatherData,
  User,
  WeatherAlertRecord,
  WeatherThresholdSettings
} from '../types';
import { FarmStorageService } from '../services/storage';

interface WeatherWidgetProps {
  weather: WeatherData;
  onUpdateWeather: (newWeather: WeatherData) => void;
  currentUser: User;
  users?: User[];
  onShowToast?: (msg: string) => void;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  weather,
  onUpdateWeather,
  currentUser,
  users = [],
  onShowToast
}) => {
  // State
  const [showSimulator, setShowSimulator] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showManualBroadcastModal, setShowManualBroadcastModal] = useState(false);
  const [manualBroadcastText, setManualBroadcastText] = useState('');
  const [selectedSector, setSelectedSector] = useState('all');

  // Weather Threshold Settings
  const [thresholds, setThresholds] = useState<WeatherThresholdSettings>(
    FarmStorageService.getWeatherThresholds()
  );

  // Weather Alert History
  const [alertHistory, setAlertHistory] = useState<WeatherAlertRecord[]>(
    FarmStorageService.getWeatherAlertHistory()
  );

  // Filter & Search state for History Log
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<'all' | 'auto' | 'manual'>('all');

  const refreshHistory = () => {
    setAlertHistory(FarmStorageService.getWeatherAlertHistory());
  };

  const isManagerOrSupervisor =
    currentUser.role === 'manager' || currentUser.role === 'supervisor';

  // Save updated threshold settings
  const handleSaveThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    FarmStorageService.saveWeatherThresholds(thresholds, currentUser);
    setShowSettings(false);
    if (onShowToast) {
      onShowToast('✓ تم حفظ وتحديث معايير الإرسال التلقائي لتنبيهات الطقس بنجاح');
    }
  };

  // Manual Safety Broadcast
  const handleSendManualBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBroadcastText.trim()) return;

    const res = FarmStorageService.checkAndAutoDispatchWeatherAlerts(
      weather,
      currentUser,
      manualBroadcastText.trim()
    );

    if (res.dispatched) {
      refreshHistory();
      setManualBroadcastText('');
      setShowManualBroadcastModal(false);
      if (onShowToast) {
        onShowToast('✓ تم بث نداء السلامة الجوي وإرسال إشعار فوري لجميع العمال');
      }
    }
  };

  // Worker Acknowledgment
  const handleAcknowledgeAlert = (alertId: string) => {
    const success = FarmStorageService.acknowledgeWeatherAlert(alertId, currentUser);
    if (success) {
      refreshHistory();
      if (onShowToast) {
        onShowToast('✓ تم تأكيد استلام توجيهات السلامة وتطبيقها في الميدان');
      }
    }
  };

  // Weather Simulation Presets
  const simulatePreset = (type: 'heatwave' | 'dust_storm' | 'moderate' | 'extreme_heat') => {
    let newWeatherData: WeatherData;

    if (type === 'extreme_heat') {
      newWeatherData = {
        ...weather,
        temperatureC: 44.5,
        feelsLikeC: 47.0,
        humidityPercent: 12,
        windSpeedKmH: 22,
        conditionAr: 'موجة حرارية شديدة وجافة',
        conditionCode: 'heatwave',
        evapotranspirationMmDay: 11.2,
        uvIndex: 12,
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
      };
    } else if (type === 'heatwave') {
      newWeatherData = {
        ...weather,
        temperatureC: 41.0,
        feelsLikeC: 43.5,
        humidityPercent: 15,
        windSpeedKmH: 18,
        conditionAr: 'أجواء حارة جداً وشمس ساطعة',
        conditionCode: 'heatwave',
        evapotranspirationMmDay: 9.8,
        uvIndex: 11,
        alerts: [
          {
            id: 'alt_heat_warn',
            title: '⚠️ تحذير: ارتفاع درجات الحرارة (41.0°م)',
            description:
              'تنظيم مناوبات العمل الحقلية وتوفير مياه الشرب الباردة في الاستراحات المظللة بقطاع 9 و 10.',
            level: 'warning',
            category: 'heat',
            actionRequired: 'أخذ فترات راحة وتجنب أشعة الشمس المباشرة'
          }
        ]
      };
    } else if (type === 'dust_storm') {
      newWeatherData = {
        ...weather,
        temperatureC: 38.0,
        feelsLikeC: 40.2,
        humidityPercent: 20,
        windSpeedKmH: 48,
        windDirection: 'جنوبية غربية (رياح خماسينية محملة بالأتربة)',
        conditionAr: 'عاصفة ترابية نشطة (رؤية منخفضة)',
        conditionCode: 'dust_storm',
        evapotranspirationMmDay: 8.5,
        uvIndex: 8,
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
      };
    } else {
      newWeatherData = {
        ...weather,
        temperatureC: 33.0,
        feelsLikeC: 34.2,
        humidityPercent: 25,
        windSpeedKmH: 14,
        windDirection: 'شمالية معتدلة',
        conditionAr: 'طقس معتدل ومثالي للعمليات الزراعية',
        conditionCode: 'sunny',
        evapotranspirationMmDay: 6.2,
        uvIndex: 7,
        alerts: []
      };
    }

    onUpdateWeather(newWeatherData);
    // Trigger auto safety evaluation
    const evalRes = FarmStorageService.checkAndAutoDispatchWeatherAlerts(
      newWeatherData,
      currentUser
    );
    if (evalRes.dispatched) {
      refreshHistory();
      if (onShowToast) {
        onShowToast(`🚨 تم الإرسال التلقائي لإشعار تحذيري للعمال: ${evalRes.record?.title}`);
      }
    }
  };

  // Filter Historical Records
  const filteredRecords = alertHistory.filter((rec) => {
    // Search
    const matchSearch =
      !searchQuery.trim() ||
      rec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.triggerValue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.thresholdCrossed.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.dispatchedByName.toLowerCase().includes(searchQuery.toLowerCase());

    // Type Filter
    const matchType = filterType === 'all' || rec.alertType === filterType;

    // Severity Filter
    const matchSeverity = filterSeverity === 'all' || rec.severity === filterSeverity;

    // Mode Filter
    const matchMode =
      filterMode === 'all' ||
      (filterMode === 'auto' && rec.autoTriggered) ||
      (filterMode === 'manual' && !rec.autoTriggered);

    return matchSearch && matchType && matchSeverity && matchMode;
  });

  // Export to CSV
  const handleExportCSV = () => {
    if (alertHistory.length === 0) {
      if (onShowToast) onShowToast('لا توجد سجلات لتصديرها');
      return;
    }

    const headers = [
      'المعرف',
      'التاريخ والوقت',
      'نوع التنبيه',
      'مستوى الخطورة',
      'عنوان الإشعار',
      'نص التعليمات والرسالة للعمال',
      'القيمة المسجلة',
      'المعيار المتجاوز',
      'نوع الإرسال',
      'الجهة المرسلة',
      'عدد المستلمين',
      'العمال المؤكدين للاستلام'
    ];

    const rows = alertHistory.map((item) => {
      const typeAr =
        item.alertType === 'heatwave'
          ? 'موجة حرارة'
          : item.alertType === 'dust_storm'
          ? 'عاصفة ترابية'
          : item.alertType === 'high_wind'
          ? 'رياح شديدة'
          : item.alertType === 'uv_extreme'
          ? 'إشعاع شمسي UV'
          : 'بث يدوي استثنائي';

      const severityAr =
        item.severity === 'critical' ? 'حرج جداً' : item.severity === 'danger' ? 'خطر' : 'تحذير';

      const modeAr = item.autoTriggered ? 'تلقائي (Agro-IoT)' : 'يدوي (الإدارة)';
      const ackNames = item.acknowledgedByWorkerNames?.join(' | ') || 'لا يوجد';

      return [
        `"${item.id}"`,
        `"${new Date(item.timestamp).toLocaleString('ar-EG')}"`,
        `"${typeAr}"`,
        `"${severityAr}"`,
        `"${item.title.replace(/"/g, '""')}"`,
        `"${item.message.replace(/"/g, '""')}"`,
        `"${item.triggerValue.replace(/"/g, '""')}"`,
        `"${item.thresholdCrossed.replace(/"/g, '""')}"`,
        `"${modeAr}"`,
        `"${item.dispatchedByName.replace(/"/g, '""')}"`,
        `"${item.recipientsCount}"`,
        `"${ackNames.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `سجل_تنبيهات_الطقس_والسلامة_مزرعة_أطياب_الوادي_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onShowToast) {
      onShowToast('✓ تم تصدير سجل تنبيهات الطقس إلى ملف CSV بنجاح');
    }
  };

  // Stats
  const totalAlerts = alertHistory.length;
  const autoAlertsCount = alertHistory.filter((a) => a.autoTriggered).length;
  const acknowledgedCount = alertHistory.filter(
    (a) => a.acknowledgedByWorkerIds && a.acknowledgedByWorkerIds.length > 0
  ).length;

  return (
    <div className="space-y-6">
      {/* 1. Main Live Weather Card */}
      <div className="bg-stone-900 rounded-3xl border border-stone-800 p-5 sm:p-6 space-y-5 shadow-xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Sun className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-lg text-stone-100">
                  محطة الأرصاد والإنذار المناخي الذكي
                </h3>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                  واحة الخارجة - الوادي الجديد
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                نظام رصد آني متصل بمحسات الحقل لمراقبة الإجهاد الحراري وسرعة الرياح وإرسال الإشعارات التلقائية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Manual Safety Broadcast */}
            {isManagerOrSupervisor && (
              <button
                id="btn-open-manual-broadcast"
                onClick={() => setShowManualBroadcastModal(true)}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                title="إرسال تنبيه سلامة فوري لجميع العمال"
              >
                <Radio className="w-4 h-4" />
                <span>بث نداء سلامة</span>
              </button>
            )}

            {/* Threshold Rules Button */}
            {isManagerOrSupervisor && (
              <button
                id="btn-toggle-weather-thresholds"
                onClick={() => setShowSettings(!showSettings)}
                className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                title="تعديل حدود الخطر ودرجات الحرارة للتنبيه التلقائي"
              >
                <Settings2 className="w-4 h-4 text-amber-400" />
                <span>إعدادات الإنذار التلقائي</span>
              </button>
            )}

            {/* Simulator Toggle */}
            <button
              id="btn-toggle-weather-simulator"
              onClick={() => setShowSimulator(!showSimulator)}
              className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-700 text-stone-300 text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-teal-400" />
              <span>{showSimulator ? 'إخفاء المحاكي' : 'محاكاة الطقس'}</span>
            </button>
          </div>
        </div>

        {/* Simulator Presets Bar */}
        {showSimulator && (
          <div className="p-4 rounded-2xl bg-stone-850 border border-stone-700 space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>اختبار الاستجابة التلقائية للظروف الجوية القاسية:</span>
              </div>
              <span className="text-[10px] text-stone-400">
                (يؤدي اختيار موجة حرارية أو عاصفة إلى إرسال إشعار تحذيري فوري للعمال وتسجيله بالسجل)
              </span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => simulatePreset('extreme_heat')}
                className="px-3.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Flame className="w-4 h-4 text-rose-400 animate-pulse" />
                <span>🔥 موجة حرارية قصوى (44.5°م)</span>
              </button>

              <button
                onClick={() => simulatePreset('heatwave')}
                className="px-3.5 py-2 rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Sun className="w-4 h-4 text-amber-400" />
                <span>☀️ حرارة مرتفعة (41.0°م)</span>
              </button>

              <button
                onClick={() => simulatePreset('dust_storm')}
                className="px-3.5 py-2 rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Wind className="w-4 h-4 text-teal-400" />
                <span>🌪️ عاصفة خماسينية (48 كم/س)</span>
              </button>

              <button
                onClick={() => simulatePreset('moderate')}
                className="px-3.5 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>🌿 طقس زراعي مثالي (33°م)</span>
              </button>
            </div>
          </div>
        )}

        {/* Current Agro-Weather Telemetry Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {/* Temperature */}
          <div
            className={`p-4 rounded-2xl border space-y-1 transition ${
              weather.temperatureC >= thresholds.heatWarningTempC
                ? 'bg-rose-950/30 border-rose-800/80 text-rose-100'
                : 'bg-stone-850 border-stone-750'
            }`}
          >
            <span className="text-stone-400 text-xs flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-rose-400" />
              درجة الحرارة
            </span>
            <div className="font-extrabold text-2xl text-stone-100 font-mono">
              {weather.temperatureC}°م
            </div>
            <div className="text-[11px] text-stone-400">
              المحسوسة: <strong className="text-stone-200">{weather.feelsLikeC}°م</strong>
            </div>
            {weather.temperatureC >= thresholds.heatWarningTempC && (
              <span className="inline-block text-[10px] text-rose-400 font-bold mt-1 bg-rose-950 px-2 py-0.5 rounded border border-rose-800">
                🚨 تجاوزت حد الأمان ({thresholds.heatWarningTempC}°م)
              </span>
            )}
          </div>

          {/* Wind Speed */}
          <div
            className={`p-4 rounded-2xl border space-y-1 transition ${
              weather.windSpeedKmH >= thresholds.windWarningSpeedKmH
                ? 'bg-amber-950/30 border-amber-800/80 text-amber-100'
                : 'bg-stone-850 border-stone-750'
            }`}
          >
            <span className="text-stone-400 text-xs flex items-center gap-1.5">
              <Wind className="w-4 h-4 text-teal-400" />
              سرعة الرياح
            </span>
            <div className="font-extrabold text-2xl text-stone-100 font-mono">
              {weather.windSpeedKmH} <span className="text-xs font-normal">كم/س</span>
            </div>
            <div className="text-[11px] text-stone-400 truncate">
              الاتجاه: {weather.windDirection.split(' ')[0]}
            </div>
            {weather.windSpeedKmH >= thresholds.windWarningSpeedKmH && (
              <span className="inline-block text-[10px] text-amber-400 font-bold mt-1 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                ⚠️ رياح نشطة (الحد: {thresholds.windWarningSpeedKmH} كم/س)
              </span>
            )}
          </div>

          {/* Humidity */}
          <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750 space-y-1">
            <span className="text-stone-400 text-xs flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-sky-400" />
              الرطوبة النسبية
            </span>
            <div className="font-extrabold text-2xl text-stone-100 font-mono">
              {weather.humidityPercent}%
            </div>
            <div className="text-[11px] text-amber-400 font-medium">
              جافة صحراوية (واحة الخارجة)
            </div>
          </div>

          {/* Evapotranspiration */}
          <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750 space-y-1">
            <span className="text-stone-400 text-xs flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-amber-400" />
              معدل البخر (ET₀)
            </span>
            <div className="font-extrabold text-2xl text-emerald-400 font-mono">
              {weather.evapotranspirationMmDay} <span className="text-xs font-normal">ملم/يوم</span>
            </div>
            <div className="text-[11px] text-stone-400">
              UV: <strong className="text-stone-200">{weather.uvIndex}</strong> • مؤشر الإشعاع
            </div>
          </div>
        </div>

        {/* Active Weather Advisories in Current Feed */}
        {weather.alerts.length > 0 && (
          <div className="space-y-2.5 pt-1">
            {weather.alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                  alert.level === 'danger'
                    ? 'bg-rose-950/40 border-rose-800 text-rose-100'
                    : 'bg-amber-950/40 border-amber-800 text-amber-100'
                }`}
              >
                <AlertTriangle
                  className={`w-5 h-5 shrink-0 mt-0.5 ${
                    alert.level === 'danger' ? 'text-rose-400 animate-pulse' : 'text-amber-400'
                  }`}
                />
                <div className="text-xs space-y-1.5 flex-1">
                  <div className="font-bold text-sm text-stone-100">{alert.title}</div>
                  <p className="text-stone-300 leading-relaxed">{alert.description}</p>
                  <div className="font-bold text-emerald-300 pt-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>الإجراء الميداني الإجباري: {alert.actionRequired}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Automated Trigger Rules Configuration (Collapsible / Modal) */}
      {showSettings && (
        <form
          onSubmit={handleSaveThresholds}
          className="bg-stone-900 rounded-3xl border border-amber-600/40 p-5 sm:p-6 space-y-5 shadow-2xl animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Settings2 className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-base text-stone-100">
                إعدادات قواعد الإرسال التلقائي لإشعارات الطقس للعمال
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="text-stone-400 hover:text-stone-200 text-xs px-2.5 py-1 rounded-lg bg-stone-800"
            >
              إغلاق
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Auto Dispatch Master Switch */}
            <div className="md:col-span-2 p-3.5 rounded-2xl bg-stone-850 border border-stone-750 flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-stone-200">
                  تفعيل الإرسال التلقائي للتحذيرات المناخية
                </div>
                <div className="text-[11px] text-stone-400">
                  عند تجاوز درجات الحرارة أو سرعة الرياح للمعايير المحددة أدناه، يقوم النظام فوراً بإرسال إشعار لكافة العمال
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={thresholds.autoDispatchEnabled}
                  onChange={(e) =>
                    setThresholds({ ...thresholds, autoDispatchEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Heat Warning Threshold */}
            <div className="p-3.5 rounded-2xl bg-stone-850 border border-stone-750 space-y-2">
              <label className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                حد تنبيه الحرارة المرتفعة (°م)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="0.5"
                  min="35"
                  max="50"
                  value={thresholds.heatWarningTempC}
                  onChange={(e) =>
                    setThresholds({
                      ...thresholds,
                      heatWarningTempC: parseFloat(e.target.value) || 40
                    })
                  }
                  className="w-24 bg-stone-900 border border-stone-700 rounded-xl px-3 py-1.5 text-stone-100 font-mono font-bold text-center text-sm"
                />
                <span className="text-xs text-stone-400">
                  (الافتراضي 40.0°م: إشعار توجيهي لتنظيم المناوبات وشرب الماء)
                </span>
              </div>
            </div>

            {/* Heat Danger Threshold */}
            <div className="p-3.5 rounded-2xl bg-stone-850 border border-stone-750 space-y-2">
              <label className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-rose-400" />
                حد الخطر الأقصى للموجة الحرارية (°م)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="0.5"
                  min="38"
                  max="55"
                  value={thresholds.heatDangerTempC}
                  onChange={(e) =>
                    setThresholds({
                      ...thresholds,
                      heatDangerTempC: parseFloat(e.target.value) || 43
                    })
                  }
                  className="w-24 bg-stone-900 border border-stone-700 rounded-xl px-3 py-1.5 text-stone-100 font-mono font-bold text-center text-sm"
                />
                <span className="text-xs text-stone-400">
                  (الافتراضي 43.0°م: إيقاف الأعمال المباشرة تحت الشمس فوراً)
                </span>
              </div>
            </div>

            {/* Wind Warning Speed */}
            <div className="p-3.5 rounded-2xl bg-stone-850 border border-stone-750 space-y-2">
              <label className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                <Wind className="w-4 h-4 text-teal-400" />
                حد تنبيه سرعة الرياح (كم/س)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="1"
                  min="15"
                  max="60"
                  value={thresholds.windWarningSpeedKmH}
                  onChange={(e) =>
                    setThresholds({
                      ...thresholds,
                      windWarningSpeedKmH: parseFloat(e.target.value) || 30
                    })
                  }
                  className="w-24 bg-stone-900 border border-stone-700 rounded-xl px-3 py-1.5 text-stone-100 font-mono font-bold text-center text-sm"
                />
                <span className="text-xs text-stone-400">
                  (الافتراضي 30 كم/س: إيقاف الرش الكيماوي والورقي)
                </span>
              </div>
            </div>

            {/* Wind Danger Speed */}
            <div className="p-3.5 rounded-2xl bg-stone-850 border border-stone-750 space-y-2">
              <label className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                <Wind className="w-4 h-4 text-rose-400" />
                حد خطر العواصف الخماسينية (كم/س)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="1"
                  min="30"
                  max="90"
                  value={thresholds.windDangerSpeedKmH}
                  onChange={(e) =>
                    setThresholds({
                      ...thresholds,
                      windDangerSpeedKmH: parseFloat(e.target.value) || 45
                    })
                  }
                  className="w-24 bg-stone-900 border border-stone-700 rounded-xl px-3 py-1.5 text-stone-100 font-mono font-bold text-center text-sm"
                />
                <span className="text-xs text-stone-400">
                  (الافتراضي 45 كم/س: إيقاف الرشاشات المحورية وتأمين النخيل)
                </span>
              </div>
            </div>

            {/* Cooldown Period */}
            <div className="p-3.5 rounded-2xl bg-stone-850 border border-stone-750 space-y-2">
              <label className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                فترة التهدئة بين الإشعارات التلقائية (بالدقائق)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="5"
                  min="10"
                  max="180"
                  value={thresholds.cooldownMinutes}
                  onChange={(e) =>
                    setThresholds({
                      ...thresholds,
                      cooldownMinutes: parseInt(e.target.value) || 45
                    })
                  }
                  className="w-24 bg-stone-900 border border-stone-700 rounded-xl px-3 py-1.5 text-stone-100 font-mono font-bold text-center text-sm"
                />
                <span className="text-xs text-stone-400">
                  (لمنع إزعاج العمال بتكرار نفس الإشعار خلال نفس الساعة)
                </span>
              </div>
            </div>

            {/* UV Index Danger */}
            <div className="p-3.5 rounded-2xl bg-stone-850 border border-stone-750 space-y-2">
              <label className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-amber-400" />
                حد خطر مؤشر الأشعة فوق البنفسجية (UV)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="1"
                  min="6"
                  max="15"
                  value={thresholds.uvDangerIndex}
                  onChange={(e) =>
                    setThresholds({
                      ...thresholds,
                      uvDangerIndex: parseInt(e.target.value) || 10
                    })
                  }
                  className="w-24 bg-stone-900 border border-stone-700 rounded-xl px-3 py-1.5 text-stone-100 font-mono font-bold text-center text-sm"
                />
                <span className="text-xs text-stone-400">
                  (الافتراضي 10: ارتداء القبعات الواقية وتغطية الرأس)
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-300 text-xs font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition"
            >
              حفظ وتطبيق القواعد
            </button>
          </div>
        </form>
      )}

      {/* 3. Manual Safety Broadcast Modal */}
      {showManualBroadcastModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSendManualBroadcast}
            className="bg-stone-900 rounded-3xl border border-rose-600/50 max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-stone-100">
                    بث نداء سلامة ميداني عاجل لعمال المزرعة
                  </h4>
                  <p className="text-[11px] text-stone-400">
                    سيتم إرسال إشعار فوري لجميع عمال قطاع 9 و 10 وتوثيق التنبيه في سجل السلامة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowManualBroadcastModal(false)}
                className="text-stone-400 hover:text-stone-200 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-200">
                نص التوجيه / التعليمات الميدانية للعمال:
              </label>
              <textarea
                rows={4}
                required
                value={manualBroadcastText}
                onChange={(e) => setManualBroadcastText(e.target.value)}
                placeholder="مثال: يرجى التوقف الفوري عن رش المبيدات الحشرية نظراً لارتفاع سرعة الرياح، وتغطية شتلات النخيل الجديدة في القطاع 9..."
                className="w-full bg-stone-850 border border-stone-700 rounded-2xl p-3.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-rose-500 transition leading-relaxed"
              />
            </div>

            <div className="p-3 rounded-xl bg-stone-850 border border-stone-750 text-[11px] text-stone-400 flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                درجة الحرارة الحالية: <strong>{weather.temperatureC}°م</strong> | الرياح:{' '}
                <strong>{weather.windSpeedKmH} كم/س</strong>
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowManualBroadcastModal(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-300 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>إرسال التنبيه الآن</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Dedicated Historical Weather Warning Log Section (سجل يوثق تاريخ هذه التنبيهات) */}
      <div className="bg-stone-900 rounded-3xl border border-stone-800 p-5 sm:p-6 space-y-5 shadow-xl">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-stone-100">
                  سجل تاريخ تنبيهات الأرصاد والسلامة المهنية
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-800 text-teal-300 font-mono border border-stone-700">
                  {filteredRecords.length} تنبيه مسجل
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                أرشيف معتمد يوثق الإرسال التلقائي واليدوي للتنبيهات المناخية وتأكيدات استلام العمال
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              id="btn-export-weather-alerts-csv"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              title="تصدير سجل التنبيهات إلى ملف إكسل CSV"
            >
              <Download className="w-4 h-4" />
              <span>تصدير السجل (CSV)</span>
            </button>
          </div>
        </div>

        {/* High-Level Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-stone-850 border border-stone-750 space-y-1">
            <div className="text-[11px] text-stone-400">إجمالي التنبيهات الموثقة</div>
            <div className="font-bold text-xl text-stone-100 font-mono">{totalAlerts}</div>
            <div className="text-[10px] text-stone-400">هذا الموسم الزراعي</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-850 border border-stone-750 space-y-1">
            <div className="text-[11px] text-stone-400">التنبيهات التلقائية (Agro-IoT)</div>
            <div className="font-bold text-xl text-teal-400 font-mono">{autoAlertsCount}</div>
            <div className="text-[10px] text-stone-400">تم إرسالها تلقائياً عند الخطر</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-850 border border-stone-750 space-y-1 col-span-2 sm:col-span-1">
            <div className="text-[11px] text-stone-400">التأكيدات الميدانية للعمال</div>
            <div className="font-bold text-xl text-emerald-400 font-mono">{acknowledgedCount}</div>
            <div className="text-[10px] text-stone-400">تنبيه تم تأكيد استلامه ميدانياً</div>
          </div>
        </div>

        {/* Filter & Search Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-stone-850 border border-stone-750">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث في السجل (العنوان، نص التعليمات، القيمة، المرسل)..."
              className="w-full bg-stone-900 border border-stone-700 rounded-xl pr-9 pl-4 py-1.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-teal-500 transition"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter by Type */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-stone-900 border border-stone-700 text-stone-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="all">كل أنواع التنبيهات</option>
              <option value="heatwave">موجة حرارة</option>
              <option value="dust_storm">عاصفة ترابية</option>
              <option value="high_wind">رياح شديدة</option>
              <option value="uv_extreme">إشعاع شمسي (UV)</option>
              <option value="custom_broadcast">بث استثنائي</option>
            </select>

            {/* Filter by Severity */}
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-stone-900 border border-stone-700 text-stone-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="all">كل مستويات الخطورة</option>
              <option value="danger">خطر حرج (Danger)</option>
              <option value="warning">تحذير أمان (Warning)</option>
            </select>

            {/* Filter by Mode */}
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as any)}
              className="bg-stone-900 border border-stone-700 text-stone-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="all">كل الأنماط</option>
              <option value="auto">تلقائي فقط (Agro-IoT)</option>
              <option value="manual">بث يدوي فقط</option>
            </select>
          </div>
        </div>

        {/* History List */}
        {filteredRecords.length === 0 ? (
          <div className="text-center py-10 text-stone-400 space-y-2">
            <History className="w-8 h-8 mx-auto text-stone-500 opacity-50" />
            <p className="text-xs">لا توجد تنبيهات مطابقة لخيارات البحث والفلترة المحددة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRecords.map((item) => {
              const isAcknowledgedByCurrentUser =
                item.acknowledgedByWorkerIds &&
                item.acknowledgedByWorkerIds.includes(currentUser.id);

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition space-y-3 ${
                    item.severity === 'danger' || item.severity === 'critical'
                      ? 'bg-stone-850 border-rose-850/80 hover:border-rose-700'
                      : 'bg-stone-850 border-stone-750 hover:border-stone-650'
                  }`}
                >
                  {/* Top Row: Severity, Title, Timestamp */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
                          item.severity === 'danger' || item.severity === 'critical'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {item.severity === 'danger' || item.severity === 'critical'
                          ? '🚨 خطر حرج'
                          : '⚠️ تحذير سلامة'}
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                          item.autoTriggered
                            ? 'bg-teal-950 text-teal-300 border border-teal-800'
                            : 'bg-stone-800 text-stone-300 border border-stone-700'
                        }`}
                      >
                        {item.autoTriggered ? '⚡ إرسال تلقائي ذكي' : '📢 بث يدوي'}
                      </span>

                      <h4 className="font-bold text-sm text-stone-100">{item.title}</h4>
                    </div>

                    <div className="text-[11px] text-stone-400 font-mono flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-500" />
                      <span>{new Date(item.timestamp).toLocaleString('ar-EG')}</span>
                    </div>
                  </div>

                  {/* Directive Message */}
                  <p className="text-xs text-stone-300 leading-relaxed bg-stone-900/60 p-3 rounded-xl border border-stone-800">
                    {item.message}
                  </p>

                  {/* Details Badges */}
                  <div className="flex items-center gap-2 flex-wrap text-[11px]">
                    <span className="px-2 py-0.5 rounded-lg bg-stone-800 text-stone-300 border border-stone-700">
                      📊 القيمة: <strong className="text-amber-400">{item.triggerValue}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-stone-800 text-stone-300 border border-stone-700">
                      🎯 المعيار: <strong className="text-stone-200">{item.thresholdCrossed}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-stone-800 text-stone-300 border border-stone-700">
                      👤 المرسل: <strong className="text-stone-200">{item.dispatchedByName}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-stone-800 text-stone-300 border border-stone-700">
                      👥 المستلمون:{' '}
                      <strong className="text-emerald-400">{item.recipientsCount} عمال</strong>
                    </span>
                  </div>

                  {/* Worker Acknowledgments & Action Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-stone-800/80">
                    <div className="text-xs text-stone-400 flex items-center gap-1.5 flex-wrap">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>العمال الذين أكدوا تطبيق التعليمات:</span>
                      {item.acknowledgedByWorkerNames && item.acknowledgedByWorkerNames.length > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.acknowledgedByWorkerNames.map((name, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 text-[10px] border border-emerald-800"
                            >
                              ✓ {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-stone-500">في انتظار تأكيد العمال</span>
                      )}
                    </div>

                    {/* Acknowledge Button for Workers */}
                    {!isAcknowledgedByCurrentUser && (
                      <button
                        onClick={() => handleAcknowledgeAlert(item.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm self-start sm:self-auto"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>تأكيد استلام التعليمات</span>
                      </button>
                    )}

                    {isAcknowledgedByCurrentUser && (
                      <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 self-start sm:self-auto">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>تم تأكيد الاستلام من قبلك</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
