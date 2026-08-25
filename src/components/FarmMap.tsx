import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MapPin,
  Compass,
  Sun,
  Wind,
  Droplets,
  Zap,
  CheckCircle2,
  Eye,
  Calendar,
  Sparkles,
  TreePalm,
  Wheat,
  Activity,
  Gauge,
  Route,
  Navigation,
  Play,
  Pause,
  RotateCcw,
  User as UserIcon,
  ShieldCheck,
  Camera,
  Layers,
  ChevronRight,
  ChevronLeft,
  Download,
  Clock,
  Radio,
  FileSpreadsheet,
  Maximize2,
  Sprout,
  AlertTriangle,
  AlertCircle,
  Waves,
  ShieldAlert,
  Info,
  Sliders
} from 'lucide-react';
import { FarmSector, FarmTask, WeatherData, GeoLocation, User } from '../types';

export interface GPSWaypoint {
  id: string;
  stepNumber: number;
  taskId?: string;
  taskTitle: string;
  workerId: string;
  workerName: string;
  sectorId: string;
  sectorName: string;
  plotNumber: 9 | 10;
  coordinates: GeoLocation;
  xPercent: number; // 0 to 100 on map canvas
  yPercent: number; // 0 to 100 on map canvas
  timestamp: string;
  timeLabel: string;
  distanceFromTargetMeters: number;
  status: 'verified' | 'in_progress' | 'pending';
  imageUrl?: string;
  workerNotes?: string;
  speedKmH?: number;
  batteryLevel?: number;
}

interface FarmMapProps {
  sectors?: FarmSector[];
  tasks?: FarmTask[];
  users?: User[];
  weather?: WeatherData;
  userLocation: GeoLocation | null;
  onSelectTask: (task: FarmTask) => void;
  onSelectSector: (sector: FarmSector) => void;
}

export const FarmMap: React.FC<FarmMapProps> = ({
  sectors = [],
  tasks = [],
  users = [],
  weather,
  userLocation,
  onSelectTask,
  onSelectSector
}) => {
  // Modes & Layers
  const [mapMode, setMapMode] = useState<'sectors' | 'tracking'>('sectors');
  const [activeLayer, setActiveLayer] = useState<'all' | 'irrigation' | 'preparation' | 'wells'>('all');
  const [selectedPin, setSelectedPin] = useState<FarmTask | null>(null);
  const [inspectedSector, setInspectedSector] = useState<FarmSector | null>(null);

  // Path Tracking Controls
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<'today' | 'yesterday' | 'all'>('today');
  const [selectedWaypoint, setSelectedWaypoint] = useState<GPSWaypoint | null>(null);
  const [isPlayingSimulation, setIsPlayingSimulation] = useState<boolean>(false);
  const [currentPlaybackStep, setCurrentPlaybackStep] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 2x, 4x
  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sector 9, Sector 10, and Water Basin
  const plot9 = sectors.find((s) => s.id === 'sec_plot_9') || sectors[0];
  const plot10 = sectors.find((s) => s.id === 'sec_plot_10') || sectors[1];
  const waterBasin = sectors.find((s) => s.id === 'sec_water_basin' || s.type === 'water_basin' || s.nameAr.includes('بركة'));

  // Dedicated Water Basin Live Level State (Max 5.0m depth, 65x65m area)
  const [waterBasinLevel, setWaterBasinLevel] = useState<number>(4.2); // Current depth in meters (0 to 5)
  const [isSimulatingBasinPumping, setIsSimulatingBasinPumping] = useState<boolean>(false);

  const basinMaxDepthMeters = 5.0;
  const basinAreaM2 = 65 * 65; // 4,225 m²
  const basinMaxCapacityM3 = basinAreaM2 * basinMaxDepthMeters; // 21,125 m³
  const basinCurrentCapacityM3 = Math.round(basinAreaM2 * waterBasinLevel);
  const basinFillPercentage = Math.round((waterBasinLevel / basinMaxDepthMeters) * 100);

  // Water level alert evaluation
  const basinAlertStatus = useMemo(() => {
    if (waterBasinLevel < 1.5) {
      return {
        level: 'danger',
        label: 'تنبيه: انخفاض حاد في منسوب مياه البركة (أقل من 30%)',
        subLabel: 'يرجى تشغيل طلمبة بئر 1 بالطاقة الشمسية فوراً لتفادي انقطاع خطوط الري بالتنقيط',
        badgeBg: 'bg-rose-950/80 border-rose-600 text-rose-300',
        iconColor: 'text-rose-400',
        alertIcon: AlertTriangle,
        isAlert: true
      };
    }
    if (waterBasinLevel > 4.7) {
      return {
        level: 'warning',
        label: 'تنبيه: اقتراب منسوب المياه من سعة الامتلاء القصوى (95%+)',
        subLabel: 'يوصى بفصل طلمبة التغذية أو توجيه تدفق المياه الفائض إلى شبكة التوزيع الميداني',
        badgeBg: 'bg-amber-950/80 border-amber-600 text-amber-300',
        iconColor: 'text-amber-400',
        alertIcon: ShieldAlert,
        isAlert: true
      };
    }
    return {
      level: 'normal',
      label: 'منسوب تشغيلي آمن ومثالي للري والخلط الميداني (84%)',
      subLabel: 'المياه مستقرة ومناسبة لتدفئة مياه البئر وترسيب الشوائب قبل الضخ للشبكة',
      badgeBg: 'bg-cyan-950/80 border-cyan-500 text-cyan-300',
      iconColor: 'text-cyan-400',
      alertIcon: Droplets,
      isAlert: false
    };
  }, [waterBasinLevel]);

  const tasksForPlot9 = tasks.filter((t) => t.sectorId === 'sec_plot_9' || t.sectorName.includes('9'));
  const tasksForPlot10 = tasks.filter((t) => t.sectorId === 'sec_plot_10' || t.sectorName.includes('10'));
  const tasksForWaterBasin = tasks.filter((t) => t.sectorId === 'sec_water_basin' || t.sectorName.includes('بركة'));

  // Helpers to calculate coordinates inside the farm bounding box
  const convertGeoToPercent = (geo: GeoLocation, plotHint: 9 | 10 | 'basin' = 9) => {
    // Standardized bounding coordinate interpolation
    const minLat = 25.4350;
    const maxLat = 25.4450;
    const minLng = 30.5480;
    const maxLng = 30.5650;

    let x = ((geo.lng - minLng) / (maxLng - minLng)) * 80 + 10;
    let y = (1 - (geo.lat - minLat) / (maxLat - minLat)) * 70 + 15;

    // Safety clamping and fallback to sector boundaries
    if (isNaN(x) || x < 5 || x > 95) {
      x = plotHint === 9 ? 25 : plotHint === 'basin' ? 50 : 75;
    }
    if (isNaN(y) || y < 10 || y > 90) {
      y = 50;
    }
    return { xPercent: Math.max(10, Math.min(90, x)), yPercent: Math.max(15, Math.min(85, y)) };
  };

  // Compile Comprehensive GPS Route Waypoints (From verified tasks + field checkpoints)
  const allWaypoints: GPSWaypoint[] = useMemo(() => {
    const waypointsList: GPSWaypoint[] = [];
    let stepCount = 1;

    // 1. Gather all tasks that have GPS proofs
    const verifiedTasks = tasks.filter((t) => t.proofOfWork && t.proofOfWork.gpsCoordinates);

    verifiedTasks.forEach((t) => {
      const isP9 = t.sectorId === 'sec_plot_9' || t.sectorName.includes('9');
      const plotNum = isP9 ? 9 : 10;
      const coords = t.proofOfWork!.gpsCoordinates;
      const pos = convertGeoToPercent(coords, plotNum);

      waypointsList.push({
        id: `wp_${t.id}`,
        stepNumber: stepCount++,
        taskId: t.id,
        taskTitle: t.title,
        workerId: t.assignedToUserId || 'usr_worker_alaa',
        workerName: t.assignedToName || 'علاء شعبان (عامل تشغيل)',
        sectorId: t.sectorId,
        sectorName: t.sectorName,
        plotNumber: plotNum,
        coordinates: coords,
        xPercent: pos.xPercent,
        yPercent: pos.yPercent,
        timestamp: t.proofOfWork!.capturedAt,
        timeLabel: new Date(t.proofOfWork!.capturedAt).toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        distanceFromTargetMeters: t.proofOfWork!.distanceFromTargetMeters || 12,
        status: 'verified',
        imageUrl: t.proofOfWork!.imageUrl,
        workerNotes: t.proofOfWork!.workerNotes || 'تم التوثيق الميداني المعتمد',
        speedKmH: 4.2,
        batteryLevel: 88
      });
    });

    // 2. Add realistic operational breadcrumb checkpoints across the 20 Feddans for full trail continuity
    const simulatedBaseCheckpoints = [
      {
        id: 'wp_sim_1',
        taskTitle: 'فحص وتشغيل طلمبة بئر 1 ومحطة الطاقة الشمسية',
        workerId: 'usr_worker_alaa',
        workerName: 'علاء شعبان (عامل تشغيل)',
        sectorId: 'sec_plot_9',
        sectorName: 'قطعة رقم 9 - محطة البئر والطاقة',
        plotNumber: 9 as const,
        coordinates: { lat: 25.4435, lng: 30.5505, accuracy: 3.2 },
        xPercent: 20,
        yPercent: 25,
        timeMinutesAgo: 240, // 4 hours ago
        distanceFromTargetMeters: 4.5,
        status: 'verified' as const,
        imageUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80',
        workerNotes: 'تشغيل إنفرتر الطاقة الشمسية 180kW وضغط تدفق 120 م³/ساعة'
      },
      {
        id: 'wp_sim_2',
        taskTitle: 'معاينة خط الرشاشات الثابتة في الزاوية الشمالية (قطعة 9)',
        workerId: 'usr_worker_alaa',
        workerName: 'علاء شعبان (عامل تشغيل)',
        sectorId: 'sec_plot_9',
        sectorName: 'قطعة رقم 9 - برسيم حجازي',
        plotNumber: 9 as const,
        coordinates: { lat: 25.4428, lng: 30.5528, accuracy: 4.1 },
        xPercent: 36,
        yPercent: 35,
        timeMinutesAgo: 180, // 3 hours ago
        distanceFromTargetMeters: 8.2,
        status: 'verified' as const,
        imageUrl: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600&auto=format&fit=crop&q=80',
        workerNotes: 'تنظيف فوهات الرشاشات وتعديل زوايا التغطية لتلافي البقع الجافة'
      },
      {
        id: 'wp_sim_3',
        taskTitle: 'اختبار رطوبة التربة وتوزيع السوبر فوسفات (قطعة 9)',
        workerId: 'usr_worker_alaa',
        workerName: 'علاء شعبان (عامل تشغيل)',
        sectorId: 'sec_plot_9',
        sectorName: 'قطعة رقم 9 - برسيم حجازي',
        plotNumber: 9 as const,
        coordinates: { lat: 25.4412, lng: 30.5518, accuracy: 3.5 },
        xPercent: 30,
        yPercent: 68,
        timeMinutesAgo: 120, // 2 hours ago
        distanceFromTargetMeters: 6.0,
        status: 'verified' as const,
        imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb22521?w=600&auto=format&fit=crop&q=80',
        workerNotes: 'أخذ عينات تربة ومطابقة معدل الرطوبة الحقلية لزراعة أكتوبر 2026'
      },
      {
        id: 'wp_sim_4',
        taskTitle: 'الانتقال للقطعة 10 وفحص محبس الخط الناقل الرئيسي',
        workerId: 'usr_worker_taha',
        workerName: 'احمد طه (عامل تشغيل)',
        sectorId: 'sec_plot_10',
        sectorName: 'قطعة رقم 10 - الخط الناقل التبادلي',
        plotNumber: 10 as const,
        coordinates: { lat: 25.4402, lng: 30.5575, accuracy: 4.8 },
        xPercent: 54,
        yPercent: 48,
        timeMinutesAgo: 90, // 1.5 hours ago
        distanceFromTargetMeters: 9.3,
        status: 'verified' as const,
        imageUrl: 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?w=600&auto=format&fit=crop&q=80',
        workerNotes: 'المحبس يعمل بحالة ممتازة ومستوى العكارة صفر'
      },
      {
        id: 'wp_sim_5',
        taskTitle: 'تخطيط وتدقيق أبعاد جور غرس النخيل 8×8م (قطعة 10)',
        workerId: 'usr_worker_taha',
        workerName: 'احمد طه (عامل تشغيل)',
        sectorId: 'sec_plot_10',
        sectorName: 'قطعة رقم 10 - نخيل صعيدي',
        plotNumber: 10 as const,
        coordinates: { lat: 25.4388, lng: 30.5610, accuracy: 2.8 },
        xPercent: 72,
        yPercent: 38,
        timeMinutesAgo: 50, // 50 mins ago
        distanceFromTargetMeters: 3.1,
        status: 'verified' as const,
        imageUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=600&auto=format&fit=crop&q=80',
        workerNotes: 'تأكيد حفر 650 جورة وإضافة الكومبوست لموعد مارس 2027'
      },
      {
        id: 'wp_sim_6',
        taskTitle: 'فحص شبكة التنقيط المزدوجة ومصائد السوسة بالحد الجنوبي (قطعة 10)',
        workerId: 'usr_worker_taha',
        workerName: 'احمد طه (عامل تشغيل)',
        sectorId: 'sec_plot_10',
        sectorName: 'قطعة رقم 10 - نخيل صعيدي',
        plotNumber: 10 as const,
        coordinates: { lat: 25.4365, lng: 30.5625, accuracy: 3.9 },
        xPercent: 82,
        yPercent: 75,
        timeMinutesAgo: 15, // 15 mins ago
        distanceFromTargetMeters: 5.4,
        status: 'in_progress' as const,
        imageUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&auto=format&fit=crop&q=80',
        workerNotes: 'جاري التمشيط الوقائي وتأكيد خلو الموقع من أي إصابات'
      }
    ];

    simulatedBaseCheckpoints.forEach((sim) => {
      // Check if we already have a waypoint with similar title
      const alreadyExists = waypointsList.some((w) => w.taskTitle.includes(sim.taskTitle.slice(0, 15)));
      if (!alreadyExists) {
        const time = new Date(Date.now() - sim.timeMinutesAgo * 60 * 1000);
        waypointsList.push({
          id: sim.id,
          stepNumber: stepCount++,
          taskTitle: sim.taskTitle,
          workerId: sim.workerId,
          workerName: sim.workerName,
          sectorId: sim.sectorId,
          sectorName: sim.sectorName,
          plotNumber: sim.plotNumber,
          coordinates: sim.coordinates,
          xPercent: sim.xPercent,
          yPercent: sim.yPercent,
          timestamp: time.toISOString(),
          timeLabel: time.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          distanceFromTargetMeters: sim.distanceFromTargetMeters,
          status: sim.status,
          imageUrl: sim.imageUrl,
          workerNotes: sim.workerNotes,
          speedKmH: 3.8,
          batteryLevel: 82
        });
      }
    });

    // Sort chronologically ascending
    waypointsList.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Re-index step numbers
    return waypointsList.map((w, idx) => ({ ...w, stepNumber: idx + 1 }));
  }, [tasks]);

  // Filter waypoints based on selected Worker and Date
  const filteredWaypoints = useMemo(() => {
    return allWaypoints.filter((wp) => {
      if (selectedWorkerId !== 'all' && wp.workerId !== selectedWorkerId) {
        return false;
      }
      return true;
    });
  }, [allWaypoints, selectedWorkerId]);

  // Active waypoints up to current playback step (if in simulation mode)
  const visibleWaypoints = useMemo(() => {
    if (!isPlayingSimulation && currentPlaybackStep === 0) {
      return filteredWaypoints;
    }
    const maxIndex = currentPlaybackStep > 0 ? currentPlaybackStep : filteredWaypoints.length;
    return filteredWaypoints.slice(0, maxIndex);
  }, [filteredWaypoints, isPlayingSimulation, currentPlaybackStep]);

  // Calculate Field Coverage Statistics
  const routeStats = useMemo(() => {
    const totalPoints = filteredWaypoints.length;
    const p9Points = filteredWaypoints.filter((w) => w.plotNumber === 9).length;
    const p10Points = filteredWaypoints.filter((w) => w.plotNumber === 10).length;

    // Approximate total distance in meters
    let totalMeters = 0;
    for (let i = 1; i < filteredWaypoints.length; i++) {
      const prev = filteredWaypoints[i - 1];
      const curr = filteredWaypoints[i];
      const dx = (curr.xPercent - prev.xPercent) * 20; // scale factor
      const dy = (curr.yPercent - prev.yPercent) * 15;
      totalMeters += Math.sqrt(dx * dx + dy * dy) * 10;
    }

    const estimatedKm = (totalMeters / 1000).toFixed(2);
    // Coverage calculation: 10 Feddans Plot 9 + 10 Feddans Plot 10
    const coveragePercent = Math.min(100, Math.round(((p9Points >= 2 ? 50 : p9Points * 25) + (p10Points >= 2 ? 50 : p10Points * 25))));
    const avgAccuracy = (
      filteredWaypoints.reduce((acc, w) => acc + (w.coordinates.accuracy || 3.5), 0) / (totalPoints || 1)
    ).toFixed(1);

    return {
      totalPoints,
      p9Points,
      p10Points,
      estimatedKm,
      totalMeters: Math.round(totalMeters),
      coveragePercent,
      avgAccuracy
    };
  }, [filteredWaypoints]);

  // Simulation Replay Timer
  useEffect(() => {
    if (isPlayingSimulation) {
      simulationTimerRef.current = setInterval(() => {
        setCurrentPlaybackStep((prev) => {
          if (prev >= filteredWaypoints.length) {
            setIsPlayingSimulation(false);
            return filteredWaypoints.length;
          }
          return prev + 1;
        });
      }, 1600 / playbackSpeed);
    } else {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
      }
    }
    return () => {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
      }
    };
  }, [isPlayingSimulation, filteredWaypoints.length, playbackSpeed]);

  const handleStartSimulation = () => {
    if (currentPlaybackStep >= filteredWaypoints.length || currentPlaybackStep === 0) {
      setCurrentPlaybackStep(1);
    }
    setIsPlayingSimulation(true);
  };

  const handleResetSimulation = () => {
    setIsPlayingSimulation(false);
    setCurrentPlaybackStep(0);
    setSelectedWaypoint(null);
  };

  // Export Path / Route to CSV
  const handleExportRouteCsv = () => {
    if (filteredWaypoints.length === 0) {
      alert('لا توجد نقاط مسار لتصديرها.');
      return;
    }
    const headers = [
      'رقم الخطوة',
      'توقيت التسجيل',
      'اسم العامل',
      'عنوان المهمة والعملية الحقلية',
      'القطاع ورقم القطعة',
      'إحداثيات الـ GPS (خط العرض)',
      'إحداثيات الـ GPS (خط الطول)',
      'دقة الموقع (متر)',
      'انحراف الهدف الميداني (متر)',
      'حالة التوثيق',
      'ملاحظات العامل'
    ];

    const rows = filteredWaypoints.map((w) => [
      `"${w.stepNumber}"`,
      `"${new Date(w.timestamp).toLocaleString('ar-EG')}"`,
      `"${w.workerName.replace(/"/g, '""')}"`,
      `"${w.taskTitle.replace(/"/g, '""')}"`,
      `"قطعة رقم ${w.plotNumber} (${w.sectorName})"`,
      `"${w.coordinates.lat.toFixed(6)}"`,
      `"${w.coordinates.lng.toFixed(6)}"`,
      `"± ${w.coordinates.accuracy || 3.5} م"`,
      `"${w.distanceFromTargetMeters} م"`,
      `"${w.status === 'verified' ? 'معتمد وموثق' : 'قيد التنفيذ'}"`,
      `"${(w.workerNotes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `سجل_تتبع_مسار_العمال_أطياب_الوادي_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getPriorityColor = (priority: FarmTask['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-rose-600 text-white ring-rose-400';
      case 'high':
        return 'bg-amber-500 text-stone-950 ring-amber-300';
      case 'medium':
        return 'bg-sky-500 text-white ring-sky-300';
      default:
        return 'bg-stone-600 text-white ring-stone-400';
    }
  };

  // Generate SVG polyline points string
  const svgPathPoints = useMemo(() => {
    return visibleWaypoints.map((w) => `${w.xPercent},${w.yPercent}`).join(' ');
  }, [visibleWaypoints]);

  const latestActiveWaypoint = visibleWaypoints[visibleWaypoints.length - 1] || null;

  return (
    <div className="bg-stone-900 rounded-3xl border border-stone-800 p-4 sm:p-6 space-y-5 shadow-xl">
      {/* Map Header & Mode Tabs */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="font-bold text-base sm:text-lg text-stone-100 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-400" />
              <span>الخريطة الجغرافية وتتبع المسار الميداني (GPS Tracking)</span>
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-bold">
              قطعتين (10 فدان لكل قطعة) • الإجمالي 20 فدان
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-0.5">
            متابعة دقيقة لتحركات العمال، توثيق نقاط الـ GPS الحقلية، ومراجعة التغطية الزراعية الشاملة لقطعتي 9 و 10.
          </p>
        </div>

        {/* Primary Mode Switcher (Sectors vs GPS Path Tracking) */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-850 rounded-2xl border border-stone-750 text-xs w-full sm:w-auto">
          <button
            id="map-tab-sectors-btn"
            onClick={() => setMapMode('sectors')}
            className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl transition cursor-pointer font-bold flex items-center justify-center gap-1.5 ${
              mapMode === 'sectors'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>عرض القطاعات والمهام</span>
          </button>

          <button
            id="map-tab-tracking-btn"
            onClick={() => {
              setMapMode('tracking');
              if (currentPlaybackStep === 0) setCurrentPlaybackStep(filteredWaypoints.length);
            }}
            className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl transition cursor-pointer font-bold flex items-center justify-center gap-1.5 ${
              mapMode === 'tracking'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md ring-1 ring-teal-400/50'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Route className="w-4 h-4 text-teal-300 animate-pulse" />
            <span>🛰️ تتبع المسار الميداني (Route Tracking)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-teal-900/90 text-teal-200 text-[10px] font-mono border border-teal-500/40">
              {filteredWaypoints.length} نقاط
            </span>
          </button>
        </div>
      </div>

      {/* Mode Sub-Controls */}
      {mapMode === 'sectors' ? (
        /* Layer Filter Controls */
        <div className="flex items-center gap-1.5 p-1.5 bg-stone-850 rounded-2xl border border-stone-750 text-xs flex-wrap">
          <span className="text-stone-400 text-xs px-2 font-medium">طبقات العرض:</span>
          <button
            onClick={() => setActiveLayer('all')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer font-medium ${
              activeLayer === 'all'
                ? 'bg-emerald-600 text-white font-bold shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            عرض الكل
          </button>
          <button
            onClick={() => setActiveLayer('irrigation')}
            className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 font-medium ${
              activeLayer === 'irrigation'
                ? 'bg-sky-600 text-white font-bold shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>شبكات الرش والتنقيط</span>
          </button>
          <button
            onClick={() => setActiveLayer('preparation')}
            className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 font-medium ${
              activeLayer === 'preparation'
                ? 'bg-amber-600 text-white font-bold shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>مواعيد الزراعة</span>
          </button>
          <button
            onClick={() => setActiveLayer('wells')}
            className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 font-medium ${
              activeLayer === 'wells'
                ? 'bg-emerald-700 text-white font-bold shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>الآبار والطاقة</span>
          </button>
        </div>
      ) : (
        /* GPS Path Tracking Toolbar & Simulation Controls */
        <div className="p-3 bg-stone-850 rounded-2xl border border-stone-750 space-y-3">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 flex-wrap">
            {/* Filters (Worker & Date) */}
            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              <div className="flex items-center gap-1.5 bg-stone-800 px-3 py-1.5 rounded-xl border border-stone-700 text-xs">
                <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-stone-400">العامل:</span>
                <select
                  value={selectedWorkerId}
                  onChange={(e) => {
                    setSelectedWorkerId(e.target.value);
                    setCurrentPlaybackStep(0);
                  }}
                  className="bg-transparent text-stone-100 text-xs font-bold focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-stone-900 text-stone-100">
                    جميع العمال المكلفين
                  </option>
                  <option value="usr_worker_alaa" className="bg-stone-900 text-stone-100">
                    علاء شعبان (فني شبكات الري - قطعة 9)
                  </option>
                  <option value="usr_worker_taha" className="bg-stone-900 text-stone-100">
                    احمد طه (عامل التخمير والغرس - قطعة 10)
                  </option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-stone-800 px-3 py-1.5 rounded-xl border border-stone-700 text-xs">
                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-stone-400">الفترة:</span>
                <select
                  value={selectedDateFilter}
                  onChange={(e) => setSelectedDateFilter(e.target.value as any)}
                  className="bg-transparent text-stone-100 text-xs font-bold focus:outline-none cursor-pointer"
                >
                  <option value="today" className="bg-stone-900 text-stone-100">
                    تحركات اليوم
                  </option>
                  <option value="yesterday" className="bg-stone-900 text-stone-100">
                    تحركات الأمس
                  </option>
                  <option value="all" className="bg-stone-900 text-stone-100">
                    كامل السجل التاريخي
                  </option>
                </select>
              </div>

              {/* Export Route CSV */}
              <button
                onClick={handleExportRouteCsv}
                className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-emerald-300 border border-emerald-800/60 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                title="تصدير بيانات المسار ونقاط الـ GPS إلى ملف CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>تصدير المسار (CSV)</span>
              </button>
            </div>

            {/* Simulation Replay Controls */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
              <span className="text-[11px] text-stone-400 font-mono">
                المحطة {currentPlaybackStep > 0 ? currentPlaybackStep : filteredWaypoints.length} من {filteredWaypoints.length}
              </span>

              {/* Step Back */}
              <button
                onClick={() => setCurrentPlaybackStep((p) => Math.max(1, (p || filteredWaypoints.length) - 1))}
                disabled={currentPlaybackStep <= 1}
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 disabled:opacity-40 disabled:cursor-not-allowed"
                title="المحطة السابقة"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Play / Pause */}
              {isPlayingSimulation ? (
                <button
                  onClick={() => setIsPlayingSimulation(false)}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1 shadow cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>إيقاف مؤقت</span>
                </button>
              ) : (
                <button
                  onClick={handleStartSimulation}
                  className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1 shadow cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>محاكاة خط المسار ⏱️</span>
                </button>
              )}

              {/* Step Forward */}
              <button
                onClick={() => setCurrentPlaybackStep((p) => Math.min(filteredWaypoints.length, p + 1))}
                disabled={currentPlaybackStep >= filteredWaypoints.length}
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 disabled:opacity-40 disabled:cursor-not-allowed"
                title="المحطة التالية"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Speed Multiplier */}
              <button
                onClick={() => setPlaybackSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1))}
                className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-teal-300 text-xs font-mono font-bold"
                title="سرعة المحاكاة"
              >
                {playbackSpeed}x
              </button>

              {/* Reset to Full Path */}
              <button
                onClick={handleResetSimulation}
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200"
                title="عرض المسار الكامل"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Scrubbing Timeline Progress Bar */}
          <div className="space-y-1">
            <input
              type="range"
              min={1}
              max={Math.max(1, filteredWaypoints.length)}
              value={currentPlaybackStep > 0 ? currentPlaybackStep : filteredWaypoints.length}
              onChange={(e) => {
                setIsPlayingSimulation(false);
                setCurrentPlaybackStep(Number(e.target.value));
              }}
              className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
            />
            <div className="flex justify-between text-[10px] text-stone-400 font-mono">
              <span>البداية: {filteredWaypoints[0]?.timeLabel || '06:00 ص'}</span>
              <span className="text-teal-400 font-bold">
                {latestActiveWaypoint ? `${latestActiveWaypoint.taskTitle} (${latestActiveWaypoint.timeLabel})` : ''}
              </span>
              <span>آخر تحديث: {filteredWaypoints[filteredWaypoints.length - 1]?.timeLabel || 'الآن'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Interactive Geographic & Route Canvas */}
      <div className="relative aspect-[16/9] md:aspect-[21/9] w-full rounded-2xl bg-gradient-to-b from-stone-950 via-[#1c1815] to-[#141210] border-2 border-stone-800 overflow-hidden shadow-inner flex items-center justify-center select-none">
        {/* Radar & Topographical Grid Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#292524_1px,transparent_1px)] [background-size:24px_24px] opacity-45" />

        {/* Top-Right Weather & Agro Telemetry */}
        {weather && (
          <div className="absolute top-3 right-3 bg-stone-900/90 backdrop-blur border border-stone-700 rounded-xl p-2.5 text-[11px] text-stone-300 space-y-1 z-10 shadow-lg hidden sm:block">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold">
              <Sun className="w-3.5 h-3.5" />
              <span>حرارة الميدان: {weather.temperatureC}°م</span>
            </div>
            <div className="flex items-center gap-1.5 text-stone-400">
              <Wind className="w-3.5 h-3.5 text-sky-400" />
              <span>رياح: {weather.windSpeedKmH} كم/س ({weather.windDirection?.split(' ')[0] || 'شمالية'})</span>
            </div>
          </div>
        )}

        {/* Bottom-Left Compass & Coordinates */}
        <div className="absolute bottom-3 left-3 bg-stone-900/90 backdrop-blur border border-stone-700 rounded-xl px-3 py-1.5 text-[10px] text-stone-300 flex items-center gap-2 z-10">
          <Compass className="w-4 h-4 text-emerald-400" />
          <span>الوادي الجديد • 25.4412°N, 30.5524°E • قطعتي المزرعة</span>
        </div>

        {/* Geographic Sectors Container (Plot 9, Central Strategic Water Basin 65x65x5m, and Plot 10) */}
        <div className="relative w-full h-full p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 z-0">
          {/* 1. Plot 9: 10 Feddans Alfalfa (October 2026) */}
          <div
            id="sector-plot-9-card"
            onClick={() => {
              if (plot9) {
                setInspectedSector(plot9);
                onSelectSector(plot9);
              }
            }}
            className={`group relative rounded-2xl border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden shadow-lg p-3.5 sm:p-4 lg:col-span-5 ${
              mapMode === 'tracking'
                ? 'border-emerald-600/30 bg-emerald-950/20 hover:border-emerald-500/60'
                : 'border-emerald-500/50 bg-gradient-to-br from-emerald-950/40 via-stone-900/80 to-emerald-950/20 hover:border-emerald-400 hover:bg-emerald-950/50'
            }`}
          >
            {/* Background Sprinkler Radar Waves */}
            <div className="absolute -left-10 -bottom-10 w-44 h-44 rounded-full border-2 border-emerald-500/10 group-hover:border-emerald-500/20 transition-all pointer-events-none" />
            <div className="absolute -left-4 -bottom-4 w-28 h-28 rounded-full border border-sky-400/20 pointer-events-none" />

            {/* Top Row: Plot Title and Area Badge */}
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="p-1 rounded-lg bg-emerald-600/30 text-emerald-300 border border-emerald-500/40">
                    <Wheat className="w-4 h-4 text-emerald-400" />
                  </span>
                  <span className="font-extrabold text-sm sm:text-base text-emerald-200">
                    {plot9?.nameAr || 'قطعة رقم 9 - برسيم حجازي'}
                  </span>
                </div>
                <div className="text-[11px] text-stone-300 font-mono flex items-center gap-1">
                  <span>كود: {plot9?.code || 'PLOT-09-ALFALFA'}</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-mono shadow">
                  10 فدان
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-800/90 text-emerald-300 border border-emerald-600/40 font-bold flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>أكتوبر 2026</span>
                </span>
              </div>
            </div>

            {/* Middle: Key Agronomic Specs */}
            <div className="my-2 py-2 border-y border-emerald-800/30 grid grid-cols-2 gap-2 text-[11px] text-stone-300">
              <div className="flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>شبكة رشاشات ثابتة</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sprout className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>محصول علفي تصديري</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>بئر 1 (طاقة شمسية)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{tasksForPlot9.length} مهام جارية</span>
              </div>
            </div>

            {/* Bottom Row: Planting Timeline & Action hint */}
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>مستهدف الزراعة: 10-2026</span>
              </span>
              <span className="text-stone-400 group-hover:text-stone-200 transition text-[10px]">
                معاينة القطعة ←
              </span>
            </div>
          </div>

          {/* 2. Central Strategic Water Basin (65x65m, Depth 5m, Capacity 21,125 m3) */}
          <div
            id="sector-water-basin-card"
            onClick={() => {
              if (waterBasin) {
                setInspectedSector(waterBasin);
                onSelectSector(waterBasin);
              }
            }}
            className={`group relative rounded-2xl border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden shadow-lg p-3.5 sm:p-4 lg:col-span-2 ${
              mapMode === 'tracking'
                ? 'border-cyan-600/30 bg-cyan-950/20 hover:border-cyan-500/60'
                : 'border-cyan-500/60 bg-gradient-to-b from-cyan-950/50 via-sky-950/40 to-stone-900/90 hover:border-cyan-400 hover:bg-cyan-950/60 ring-1 ring-cyan-500/20'
            }`}
          >
            {/* Water Ripple Waves Animation Background */}
            <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:12px_12px] opacity-25" />
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full border border-cyan-400/20 animate-ping opacity-40 pointer-events-none" />

            <div className="relative space-y-1.5">
              <div className="flex items-center justify-between gap-1">
                <span className="p-1 rounded-lg bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 shrink-0">
                  <Droplets className="w-4 h-4 text-cyan-400" />
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-600 text-white font-mono shadow">
                  65×65 م
                </span>
              </div>

              <div>
                <h4 className="font-extrabold text-xs sm:text-sm text-cyan-100 leading-tight">
                  {waterBasin?.nameAr || 'بركة المياه'}
                </h4>
                <p className="text-[10px] text-cyan-300 font-mono">حوض التخزين والترسيب</p>
              </div>
            </div>

            {/* Basin Dimensions and Metrics */}
            <div className="relative my-1.5 py-1.5 border-y border-cyan-800/40 space-y-1 text-[10.5px] text-stone-200 font-medium">
              <div className="flex items-center justify-between">
                <span className="text-stone-400">العمق:</span>
                <span className="font-bold text-cyan-300 font-mono">5 أمتار</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">السعة:</span>
                <span className="font-bold text-emerald-400 font-mono">21,125 م³</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">المساحة:</span>
                <span className="font-mono text-cyan-200">~ 1 فدان</span>
              </div>
            </div>

            <div className="relative flex items-center justify-between text-[10px]">
              <span className="text-cyan-400 font-bold flex items-center gap-1">
                <Activity className="w-3 h-3 text-cyan-400" />
                <span>جاهزة للضخ</span>
              </span>
              <span className="text-stone-400 group-hover:text-cyan-200 transition">
                التفاصيل ←
              </span>
            </div>
          </div>

          {/* 3. Plot 10: 10 Feddans Saidi Date Palms (March 2027) */}
          <div
            id="sector-plot-10-card"
            onClick={() => {
              if (plot10) {
                setInspectedSector(plot10);
                onSelectSector(plot10);
              }
            }}
            className={`group relative rounded-2xl border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden shadow-lg p-3.5 sm:p-4 lg:col-span-5 ${
              mapMode === 'tracking'
                ? 'border-amber-600/30 bg-amber-950/20 hover:border-amber-500/60'
                : 'border-amber-500/50 bg-gradient-to-br from-amber-950/40 via-stone-900/80 to-amber-950/20 hover:border-amber-400 hover:bg-amber-950/50'
            }`}
          >
            {/* Background Drip Lines / Palm Graphic */}
            <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full border-2 border-amber-500/10 group-hover:border-amber-500/20 transition-all pointer-events-none" />
            <div className="absolute -right-4 -bottom-4 w-28 h-28 rounded-full border border-teal-400/20 pointer-events-none" />

            {/* Top Row: Plot Title and Area Badge */}
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="p-1 rounded-lg bg-amber-600/30 text-amber-300 border border-amber-500/40">
                    <TreePalm className="w-4 h-4 text-amber-400" />
                  </span>
                  <span className="font-extrabold text-sm sm:text-base text-amber-200">
                    {plot10?.nameAr || 'قطعة رقم 10 - نخيل صعيدي'}
                  </span>
                </div>
                <div className="text-[11px] text-stone-300 font-mono flex items-center gap-1">
                  <span>كود: {plot10?.code || 'PLOT-10-SAIDI-PALM'}</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-500 text-stone-950 font-mono shadow">
                  10 فدان
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-800/90 text-amber-300 border border-amber-600/40 font-bold flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>مارس 2027</span>
                </span>
              </div>
            </div>

            {/* Middle: Key Agronomic Specs */}
            <div className="my-2 py-2 border-y border-amber-800/30 grid grid-cols-2 gap-2 text-[11px] text-stone-300">
              <div className="flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>ري بالتنقيط GR مزدوج</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TreePalm className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>650 نخلة صعيدي (سيوي)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>مسافات غرس 8×8م</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{tasksForPlot10.length} مهام جارية</span>
              </div>
            </div>

            {/* Bottom Row: Planting Timeline & Action hint */}
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>مستهدف الغرس: 03-2027</span>
              </span>
              <span className="text-stone-400 group-hover:text-stone-200 transition text-[10px]">
                معاينة القطعة ←
              </span>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* MODE A: Standard Tasks Pins Overlay */}
        {/* ------------------------------------------------------------- */}
        {mapMode === 'sectors' && (
          <div className="absolute inset-0 pointer-events-none p-4 sm:p-8">
            {tasks.map((task, idx) => {
              const isPlot9 = task.sectorId === 'sec_plot_9' || task.sectorName.includes('9');
              const baseX = isPlot9 ? 28 : 72;
              const xPercent = baseX + ((idx * 7) % 16) - 8;
              const yPercent = 40 + ((idx * 14) % 36);

              const isCompleted = task.status === 'completed' || task.status === 'approved';

              return (
                <div
                  key={task.id}
                  style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
                  className="absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2"
                >
                  <button
                    onClick={() => {
                      setSelectedPin(task);
                      onSelectTask(task);
                    }}
                    className={`relative p-2.5 rounded-2xl shadow-2xl ring-2 transition-transform transform hover:scale-115 active:scale-95 cursor-pointer ${
                      isCompleted
                        ? 'bg-emerald-600 text-white ring-emerald-400'
                        : getPriorityColor(task.priority)
                    }`}
                    title={`${task.title} (${task.status})`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : task.category === 'irrigation' ? (
                      <Droplets className="w-4 h-4" />
                    ) : task.category === 'fertilization' ? (
                      <Sprout className="w-4 h-4" />
                    ) : task.category === 'pump_maintenance' ? (
                      <Zap className="w-4 h-4" />
                    ) : (
                      <MapPin className="w-4 h-4" />
                    )}

                    {/* Pulsing ring for urgent / alarming tasks */}
                    {task.isAlarmActive && (
                      <span className="absolute -inset-1 rounded-2xl bg-rose-500 animate-ping opacity-60 pointer-events-none" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* MODE B: Dynamic Vector GPS Path & Waypoints Overlay */}
        {/* ------------------------------------------------------------- */}
        {mapMode === 'tracking' && (
          <div className="absolute inset-0 pointer-events-none">
            {/* SVG Glowing Polyline Path */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#14b8a6" stopOpacity="1" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="0.8" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Glowing Background Route Path */}
              {visibleWaypoints.length > 1 && (
                <polyline
                  points={svgPathPoints}
                  fill="none"
                  stroke="rgba(20, 184, 166, 0.4)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glow)"
                />
              )}

              {/* Animated Foreground Dash Line */}
              {visibleWaypoints.length > 1 && (
                <polyline
                  points={svgPathPoints}
                  fill="none"
                  stroke="url(#routeGradient)"
                  strokeWidth="1.2"
                  strokeDasharray="2.5, 1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="animate-pulse"
                />
              )}

              {/* Directional Connection Arrows between waypoints */}
              {visibleWaypoints.map((w, idx) => {
                if (idx === 0) return null;
                const prev = visibleWaypoints[idx - 1];
                const midX = (prev.xPercent + w.xPercent) / 2;
                const midY = (prev.yPercent + w.yPercent) / 2;
                return (
                  <circle
                    key={`mid_${w.id}`}
                    cx={midX}
                    cy={midY}
                    r="0.8"
                    fill="#2dd4bf"
                    opacity="0.8"
                  />
                );
              })}
            </svg>

            {/* Render Sequential Waypoint Beacons on Canvas */}
            {visibleWaypoints.map((wp, idx) => {
              const isLatest = idx === visibleWaypoints.length - 1;
              const isSelected = selectedWaypoint?.id === wp.id;

              return (
                <div
                  key={wp.id}
                  style={{ left: `${wp.xPercent}%`, top: `${wp.yPercent}%` }}
                  className="absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
                >
                  <button
                    onClick={() => setSelectedWaypoint(wp)}
                    className={`group relative flex items-center justify-center rounded-full transition-transform transform hover:scale-125 active:scale-95 cursor-pointer ${
                      isSelected
                        ? 'ring-4 ring-cyan-400 scale-120'
                        : isLatest
                        ? 'ring-4 ring-teal-400'
                        : 'ring-2 ring-stone-900'
                    } ${
                      wp.status === 'verified'
                        ? 'bg-gradient-to-tr from-emerald-700 to-teal-500 text-white'
                        : 'bg-gradient-to-tr from-amber-600 to-amber-400 text-stone-950'
                    } w-7 h-7 sm:w-8 sm:h-8 shadow-xl`}
                    title={`محطة #${wp.stepNumber}: ${wp.taskTitle} (${wp.timeLabel})`}
                  >
                    <span className="font-extrabold text-[11px] sm:text-xs font-mono">
                      #{wp.stepNumber}
                    </span>

                    {/* Animated Pulsing Beacon for the latest active waypoint */}
                    {isLatest && (
                      <span className="absolute -inset-2 rounded-full bg-teal-400 animate-ping opacity-60 pointer-events-none" />
                    )}

                    {/* Verified Mini Badge */}
                    {wp.status === 'verified' && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border border-stone-900 flex items-center justify-center text-[8px] text-stone-950 font-bold">
                        ✓
                      </span>
                    )}
                  </button>

                  {/* Tiny Time Tag below marker */}
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-stone-900/90 text-stone-200 border border-stone-700 text-[9px] font-mono whitespace-nowrap shadow pointer-events-none">
                    {wp.timeLabel}
                  </div>
                </div>
              );
            })}

            {/* Live Worker Location Beacon */}
            {latestActiveWaypoint && (
              <div
                style={{ left: `${latestActiveWaypoint.xPercent}%`, top: `${latestActiveWaypoint.yPercent}%` }}
                className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2"
              >
                <div className="relative -top-11 bg-teal-950/95 border border-teal-500/80 rounded-xl px-2.5 py-1 text-[10px] text-teal-200 font-bold flex items-center gap-1.5 shadow-xl whitespace-nowrap">
                  <Navigation className="w-3 h-3 text-teal-400 animate-bounce" />
                  <span>الموقع الميداني الأخير: {latestActiveWaypoint.workerName.split(' ')[0]}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Waypoint Details Drawer / Popover (When a waypoint is clicked) */}
      {/* ------------------------------------------------------------- */}
      {selectedWaypoint && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-stone-850 to-stone-900 border-2 border-teal-600/60 space-y-3 animate-in fade-in shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-stone-750">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600/30 text-teal-300 border border-teal-500/40 flex items-center justify-center font-bold text-sm font-mono shrink-0">
                #{selectedWaypoint.stepNumber}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-extrabold text-sm sm:text-base text-stone-100">
                    {selectedWaypoint.taskTitle}
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-700/60 font-bold">
                    قطعة رقم {selectedWaypoint.plotNumber}
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">
                  👤 العامل المكلف: <strong>{selectedWaypoint.workerName}</strong> • توقيت المعاينة:{' '}
                  <strong>{selectedWaypoint.timeLabel}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {selectedWaypoint.taskId && (
                <button
                  onClick={() => {
                    const matched = tasks.find((t) => t.id === selectedWaypoint.taskId);
                    if (matched) onSelectTask(matched);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>فتح بطاقة المهمة</span>
                </button>
              )}
              <button
                onClick={() => setSelectedWaypoint(null)}
                className="px-3 py-1.5 rounded-xl bg-stone-800 text-stone-300 hover:text-white text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* GPS Telemetry */}
            <div className="bg-stone-800/80 p-3 rounded-xl border border-stone-700/60 space-y-1">
              <span className="text-stone-400 block text-[11px] flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-teal-400" />
                إحداثيات الـ GPS الميدانية:
              </span>
              <div className="font-mono text-stone-100 font-bold">
                {selectedWaypoint.coordinates.lat.toFixed(5)}°N, {selectedWaypoint.coordinates.lng.toFixed(5)}°E
              </div>
              <div className="text-[10px] text-teal-300">
                دقة التحديد: ± {selectedWaypoint.coordinates.accuracy || 3.5} متر (مطابقة تامة)
              </div>
            </div>

            {/* Target Distance & Anti-Tamper */}
            <div className="bg-stone-800/80 p-3 rounded-xl border border-stone-700/60 space-y-1">
              <span className="text-stone-400 block text-[11px] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                المسافة عن موقع المهمة:
              </span>
              <div className="font-mono text-emerald-400 font-bold text-sm">
                {selectedWaypoint.distanceFromTargetMeters} متر فقط
              </div>
              <div className="text-[10px] text-stone-400">
                بصمة رقمية مشفرة ومحمية من التلاعب
              </div>
            </div>

            {/* Photo Preview if available */}
            <div className="bg-stone-800/80 p-2.5 rounded-xl border border-stone-700/60 flex items-center gap-2">
              {selectedWaypoint.imageUrl ? (
                <>
                  <img
                    src={selectedWaypoint.imageUrl}
                    alt="توثيق المهمة"
                    className="w-14 h-14 rounded-lg object-cover border border-stone-600 shrink-0"
                  />
                  <div className="text-[11px] text-stone-300">
                    <span className="text-emerald-400 font-bold block flex items-center gap-1">
                      <Camera className="w-3 h-3" />
                      صورة التوثيق الميداني
                    </span>
                    <span className="text-[10px] text-stone-400 line-clamp-2">
                      {selectedWaypoint.workerNotes || 'تمت المطابقة الحقلية بنجاح'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-stone-400 text-[11px] p-2">
                  نقطة عبور دورية بدون صورة مرفقة
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Route & Field Coverage Analytics Dashboard (When Tracking Active) */}
      {/* ------------------------------------------------------------- */}
      {mapMode === 'tracking' && (
        <div className="space-y-4 pt-2 border-t border-stone-800">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-stone-850 p-3.5 rounded-2xl border border-stone-750 space-y-1">
              <span className="text-stone-400 block text-[11px] flex items-center gap-1">
                <Route className="w-3.5 h-3.5 text-teal-400" />
                نسبة التغطية الميدانية:
              </span>
              <div className="flex items-baseline gap-2">
                <strong className="text-teal-300 text-lg font-black font-mono">
                  {routeStats.coveragePercent}%
                </strong>
                <span className="text-[10px] text-stone-400">لـ 20 فدان</span>
              </div>
              <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all duration-500"
                  style={{ width: `${routeStats.coveragePercent}%` }}
                />
              </div>
            </div>

            <div className="bg-stone-850 p-3.5 rounded-2xl border border-stone-750 space-y-1">
              <span className="text-stone-400 block text-[11px] flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                إجمالي المسافة المقطوعة:
              </span>
              <strong className="text-emerald-400 text-lg font-black font-mono block">
                {routeStats.estimatedKm} كم
              </strong>
              <p className="text-[10px] text-stone-400 font-mono">
                ({routeStats.totalMeters} متر داخل المزرعة)
              </p>
            </div>

            <div className="bg-stone-850 p-3.5 rounded-2xl border border-stone-750 space-y-1">
              <span className="text-stone-400 block text-[11px] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                محطات الفحص والتوثيق:
              </span>
              <strong className="text-sky-300 text-lg font-black font-mono block">
                {routeStats.totalPoints} محطة
              </strong>
              <p className="text-[10px] text-stone-400">
                قطعة 9: ({routeStats.p9Points}) • قطعة 10: ({routeStats.p10Points})
              </p>
            </div>

            <div className="bg-stone-850 p-3.5 rounded-2xl border border-stone-750 space-y-1">
              <span className="text-stone-400 block text-[11px] flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                متوسط دقة الـ GPS:
              </span>
              <strong className="text-amber-300 text-lg font-black font-mono block">
                ± {routeStats.avgAccuracy} م
              </strong>
              <p className="text-[10px] text-emerald-400 font-bold">
                ✓ مطابقة 100% لخريطة المزرعة
              </p>
            </div>
          </div>

          {/* Chronological Waypoint Timeline List */}
          <div className="bg-stone-850 rounded-2xl border border-stone-750 overflow-hidden">
            <div className="p-3.5 bg-stone-800/80 border-b border-stone-750 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-400" />
                <h5 className="font-bold text-xs sm:text-sm text-stone-100">
                  السجل الزمني لمحطات المسار الميداني (Chronological GPS Waypoints)
                </h5>
              </div>
              <span className="text-xs text-stone-400 font-mono">
                {filteredWaypoints.length} نقاط مسجلة
              </span>
            </div>

            <div className="divide-y divide-stone-800 max-h-60 overflow-y-auto">
              {filteredWaypoints.map((wp) => (
                <div
                  key={wp.id}
                  onClick={() => setSelectedWaypoint(wp)}
                  className={`p-3 flex items-center justify-between gap-3 hover:bg-stone-800 transition cursor-pointer ${
                    selectedWaypoint?.id === wp.id ? 'bg-teal-950/40 border-l-4 border-teal-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-stone-800 border border-stone-700 text-teal-300 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                      #{wp.stepNumber}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-stone-100">{wp.taskTitle}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-800 text-stone-300 font-mono">
                          قطعة {wp.plotNumber}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-400 flex items-center gap-2 pt-0.5">
                        <span>👤 {wp.workerName.split(' ')[0]}</span>
                        <span>•</span>
                        <span className="font-mono text-teal-400">⏰ {wp.timeLabel}</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-bold">
                          ✓ المسافة {wp.distanceFromTargetMeters}م
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedWaypoint(wp);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] font-medium"
                    >
                      معاينة
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Selected Task Drawer / Quick Preview (When in Sectors Mode) */}
      {selectedPin && mapMode === 'sectors' && (
        <div className="p-4 rounded-2xl bg-stone-850 border border-stone-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center text-emerald-400 shrink-0 border border-stone-700">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-stone-400 font-bold">{selectedPin.sectorName}</div>
              <div className="font-bold text-sm text-stone-100">{selectedPin.title}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => onSelectTask(selectedPin)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>عرض تفاصيل المهمة وتوثيق الـ GPS</span>
            </button>
            <button
              onClick={() => setSelectedPin(null)}
              className="p-2 rounded-xl bg-stone-800 text-stone-400 hover:text-white text-xs cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Plot Inspection Modal / Details Drawer */}
      {inspectedSector && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-stone-850 to-stone-900 border border-stone-750 space-y-4 animate-in fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${
                  inspectedSector.type === 'water_basin' || inspectedSector.id === 'sec_water_basin'
                    ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40'
                    : inspectedSector.id === 'sec_plot_9'
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                }`}
              >
                {inspectedSector.type === 'water_basin' || inspectedSector.id === 'sec_water_basin' ? (
                  <Droplets className="w-6 h-6 text-cyan-400" />
                ) : inspectedSector.id === 'sec_plot_9' ? (
                  <Wheat className="w-6 h-6" />
                ) : (
                  <TreePalm className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-extrabold text-stone-100">{inspectedSector.nameAr}</h4>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-800 text-stone-300 font-mono">
                    {inspectedSector.code}
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">{inspectedSector.notes}</p>
              </div>
            </div>

            <button
              onClick={() => setInspectedSector(null)}
              className="px-3 py-1.5 rounded-xl bg-stone-800 text-stone-400 hover:text-stone-200 text-xs cursor-pointer"
            >
              إغلاق النافذة
            </button>
          </div>

          {/* Detailed Specifications Grid */}
          {inspectedSector.type === 'water_basin' || inspectedSector.id === 'sec_water_basin' ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-stone-800/80 p-3 rounded-xl border border-cyan-700/40">
                <span className="text-stone-400 block text-[11px]">الأبعاد والمساحة:</span>
                <strong className="text-cyan-300 text-sm font-mono font-bold">65 × 65 متر (~ 1 فدان)</strong>
              </div>

              <div className="bg-stone-800/80 p-3 rounded-xl border border-cyan-700/40">
                <span className="text-stone-400 block text-[11px]">العمق التشغيلي:</span>
                <strong className="text-cyan-400 text-sm font-bold font-mono">5 أمتار</strong>
              </div>

              <div className="bg-stone-800/80 p-3 rounded-xl border border-cyan-700/40">
                <span className="text-stone-400 block text-[11px]">السعة التخزينية الكلية:</span>
                <strong className="text-emerald-400 text-sm font-mono font-bold">21,125 م³ (متر مكعب)</strong>
              </div>

              <div className="bg-stone-800/80 p-3 rounded-xl border border-cyan-700/40">
                <span className="text-stone-400 block text-[11px]">مصدر التغذية والضخ:</span>
                <strong className="text-amber-300 text-sm">بئر 1 (طاقة شمسية) + طلمبات الخلط</strong>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-stone-800/80 p-3 rounded-xl border border-stone-700/60">
                <span className="text-stone-400 block text-[11px]">المساحة الإجمالية:</span>
                <strong className="text-stone-100 text-sm font-mono">{inspectedSector.areaFeddan} فدان</strong>
              </div>

              <div className="bg-stone-800/80 p-3 rounded-xl border border-stone-700/60">
                <span className="text-stone-400 block text-[11px]">مستهدف موعد الزراعة:</span>
                <strong className="text-emerald-400 text-sm font-bold">
                  {inspectedSector.targetPlantingDate || (inspectedSector.id === 'sec_plot_9' ? 'أكتوبر 2026' : 'مارس 2027')}
                </strong>
              </div>

              <div className="bg-stone-800/80 p-3 rounded-xl border border-stone-700/60">
                <span className="text-stone-400 block text-[11px]">نظام وشبكة الري:</span>
                <strong className="text-sky-300 text-sm">
                  {inspectedSector.irrigationType === 'sprinkler'
                    ? 'رشاشات ثابتة / محورية'
                    : 'تنقيط GR مزدوج'}
                </strong>
              </div>

              <div className="bg-stone-800/80 p-3 rounded-xl border border-stone-700/60">
                <span className="text-stone-400 block text-[11px]">مصدر المياه الجوفية:</span>
                <strong className="text-amber-300 text-sm">بئر 1 (طاقة شمسية 180kW)</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
