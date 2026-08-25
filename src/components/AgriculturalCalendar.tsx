import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Download,
  Plus,
  Layers,
  Sun,
  Droplets,
  Sprout,
  TreePalm,
  Wheat,
  Scissors,
  ShieldCheck,
  TrendingUp,
  FileText,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  Info
} from 'lucide-react';
import {
  AgriCalendarEvent,
  AgriActivityCategory,
  AgriSeason,
  FarmSector,
  FarmTask,
  User,
  WeatherData
} from '../types';
import { AGRICULTURAL_YEARLY_PLANS } from '../data/agriculturalCalendarData';

interface AgriculturalCalendarProps {
  events: AgriCalendarEvent[];
  sectors: FarmSector[];
  currentUser: User;
  weather?: WeatherData;
  onAddEvent?: (event: AgriCalendarEvent) => void;
  onUpdateEvent?: (event: AgriCalendarEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
  onCreateTaskFromEvent?: (taskData: Partial<FarmTask>) => void;
}

export const AgriculturalCalendar: React.FC<AgriculturalCalendarProps> = ({
  events = [],
  sectors = [],
  currentUser,
  weather,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onCreateTaskFromEvent
}) => {
  // State for Filters & Navigation
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<'all' | 'sec_plot_9' | 'sec_plot_10'>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | AgriActivityCategory>('all');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [activeViewTab, setActiveViewTab] = useState<'timeline' | 'grid' | 'roadmap' | 'yield'>('timeline');
  
  // Grid month state (for calendar grid view)
  const [currentMonth, setCurrentMonth] = useState<number>(10); // Default October 2026 (Alfalfa planting)
  
  // Selected event modal
  const [selectedEvent, setSelectedEvent] = useState<AgriCalendarEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isCreatingNewEvent, setIsCreatingNewEvent] = useState(false);

  // New Event Form State
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventSectorId, setNewEventSectorId] = useState<'sec_plot_9' | 'sec_plot_10'>('sec_plot_9');
  const [newEventCategory, setNewEventCategory] = useState<AgriActivityCategory>('planting');
  const [newEventStartDate, setNewEventStartDate] = useState('2026-10-15');
  const [newEventEndDate, setNewEventEndDate] = useState('2026-10-25');
  const [newEventInstructions, setNewEventInstructions] = useState('');
  const [newEventExpectedYield, setNewEventExpectedYield] = useState('');
  const [newEventIsHarvest, setNewEventIsHarvest] = useState(false);
  const [newEventIsPlanting, setNewEventIsPlanting] = useState(false);

  // Sector 9 & 10 definitions
  const sector9 = sectors.find((s) => s.id === 'sec_plot_9') || {
    id: 'sec_plot_9',
    nameAr: 'قطعة رقم 9 - برسيم حجازي',
    areaFeddan: 10,
    targetPlantingDate: 'أكتوبر 2026 (10-2026)'
  };

  const sector10 = sectors.find((s) => s.id === 'sec_plot_10') || {
    id: 'sec_plot_10',
    nameAr: 'قطعة رقم 10 - نخيل صعيدي',
    areaFeddan: 10,
    targetPlantingDate: 'مارس 2027 (03-2027)'
  };

  // Filtered Events List
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // Sector filter
      if (selectedSectorFilter !== 'all' && ev.sectorId !== selectedSectorFilter) {
        return false;
      }
      // Category filter
      if (selectedCategoryFilter !== 'all' && ev.activityCategory !== selectedCategoryFilter) {
        return false;
      }
      // Year filter (if not in roadmap/all-years mode)
      if (activeViewTab !== 'roadmap' && activeViewTab !== 'yield' && ev.year !== selectedYear) {
        return false;
      }
      return true;
    }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [events, selectedSectorFilter, selectedCategoryFilter, selectedYear, activeViewTab]);

  // Months labels in Arabic
  const ARABIC_MONTHS = [
    { num: 1, name: 'يناير (1)' },
    { num: 2, name: 'فبراير (2)' },
    { num: 3, name: 'مارس (3)' },
    { num: 4, name: 'أبريل (4)' },
    { num: 5, name: 'مايو (5)' },
    { num: 6, name: 'يونيو (6)' },
    { num: 7, name: 'يوليو (7)' },
    { num: 8, name: 'أغسطس (8)' },
    { num: 9, name: 'سبتمبر (9)' },
    { num: 10, name: 'أكتوبر (10)' },
    { num: 11, name: 'نوفمبر (11)' },
    { num: 12, name: 'ديسمبر (12)' }
  ];

  // Helper for Category Styling and Icons
  const getCategoryBadge = (cat: AgriActivityCategory) => {
    switch (cat) {
      case 'planting':
        return {
          label: 'غرس وزراعة',
          bg: 'bg-emerald-950 text-emerald-300 border-emerald-800',
          icon: <Sprout className="w-3.5 h-3.5 text-emerald-400" />
        };
      case 'harvest_cutting':
        return {
          label: 'حش وحصاد',
          bg: 'bg-amber-950 text-amber-300 border-amber-800',
          icon: <Scissors className="w-3.5 h-3.5 text-amber-400" />
        };
      case 'soil_preparation':
        return {
          label: 'تجهيز التربة والجور',
          bg: 'bg-stone-800 text-stone-300 border-stone-700',
          icon: <Layers className="w-3.5 h-3.5 text-stone-400" />
        };
      case 'irrigation_schedule':
        return {
          label: 'برنامج الري والتسميد',
          bg: 'bg-sky-950 text-sky-300 border-sky-800',
          icon: <Droplets className="w-3.5 h-3.5 text-sky-400" />
        };
      case 'pollination':
        return {
          label: 'تلقيح وتأبير',
          bg: 'bg-purple-950 text-purple-300 border-purple-800',
          icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" />
        };
      case 'pest_protection':
        return {
          label: 'وقاية ومكافحة آفات',
          bg: 'bg-rose-950 text-rose-300 border-rose-800',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
        };
      default:
        return {
          label: 'رعاية عامة',
          bg: 'bg-stone-800 text-stone-300 border-stone-700',
          icon: <Clock className="w-3.5 h-3.5 text-stone-400" />
        };
    }
  };

  // Convert an event to a live field task
  const handleCreateTaskFromAgriEvent = (ev: AgriCalendarEvent) => {
    if (!onCreateTaskFromEvent) return;

    onCreateTaskFromEvent({
      title: `${ev.title} (${ev.sectorNameAr})`,
      description: `${ev.keyInstructions}\n\nالإرشادات المناخية: ${ev.climateAdvisory || 'متوافق مع خطة الوادي الجديد'}\nالإنتاجية المستهدفة: ${ev.expectedYield || 'حسب الخطة الموسمية'}`,
      category: ev.isHarvest ? 'harvest' : ev.isPlanting ? 'general' : ev.activityCategory === 'pollination' ? 'pollination' : 'irrigation',
      priority: ev.isMilestone ? 'urgent' : 'high',
      sectorId: ev.sectorId,
      sectorName: ev.sectorNameAr,
      assignedToUserId: ev.sectorId === 'sec_plot_9' ? 'usr_worker_alaa' : 'usr_worker_taha',
      assignedToName: ev.sectorId === 'sec_plot_9' ? 'علاء شعبان (عامل تشغيل)' : 'احمد طه (عامل تشغيل)',
      scheduledDate: ev.startDate,
      scheduledTime: '06:00'
    });
  };

  // Quick export CSV of the agricultural plan
  const handleExportCsv = () => {
    const headers = [
      'رقم المعرف',
      'القطاع',
      'المحصول',
      'النشاط',
      'تاريخ البدء',
      'تاريخ الانتهاء',
      'السنة',
      'الموسم',
      'نوع الحدث',
      'الإنتاجية المتوقعة',
      'التعليمات الميدانية',
      'المنفذ المقترح'
    ];

    const rows = filteredEvents.map((ev) => [
      `"${ev.id}"`,
      `"${ev.sectorNameAr}"`,
      `"${ev.cropType === 'alfalfa' ? 'برسيم حجازي' : 'نخيل صعيدي'}"`,
      `"${ev.title}"`,
      `"${ev.startDate}"`,
      `"${ev.endDate}"`,
      `"${ev.year}"`,
      `"${ev.seasonAr}"`,
      `"${ev.isHarvest ? 'حصاد/حش' : ev.isPlanting ? 'زراعة/غرس' : 'عمليات خدمة'}"`,
      `"${ev.expectedYield || '-'}"`,
      `"${ev.keyInstructions.replace(/"/g, '""')}"`,
      `"${ev.assignedWorkerName || '-'}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `التقويم_الزراعي_قطاعات_9_و_10_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-stone-900 rounded-3xl border border-stone-800 p-4 sm:p-6 space-y-6 shadow-xl text-stone-100" dir="rtl">
      {/* 1. Header & Quick Stats */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-stone-800 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-emerald-950/60 shrink-0">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg sm:text-xl text-stone-100 flex items-center gap-2.5 flex-wrap">
              <span>التقويم الزراعي التفاعلي للقطاعات (9 و 10)</span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                مخطط زمني طويل المدى (2026 - 2030+)
              </span>
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              مواعيد الزراعة، دورات الحش والحصاد، وجداول التسميد والري المصممة لتربة ومناخ محافظة الوادي الجديد
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-700 text-stone-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>تصدير الخطة (CSV)</span>
          </button>

          {currentUser.role === 'manager' && (
            <button
              onClick={() => {
                setIsCreatingNewEvent(true);
                setIsEventModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة موعد زراعي</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Key Sector Target Summary Cards (Plot 9 & Plot 10) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sector 9 Card */}
        <div
          onClick={() => setSelectedSectorFilter(selectedSectorFilter === 'sec_plot_9' ? 'all' : 'sec_plot_9')}
          className={`p-4 rounded-3xl border transition cursor-pointer relative overflow-hidden ${
            selectedSectorFilter === 'sec_plot_9'
              ? 'bg-gradient-to-br from-emerald-950/40 via-stone-850 to-stone-900 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
              : 'bg-stone-850/80 border-stone-750 hover:border-stone-600'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Wheat className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-stone-100 flex items-center gap-2">
                  <span>قطعة رقم 9: برسيم حجازي</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-200 font-normal">
                    10 فدان
                  </span>
                </h4>
                <p className="text-xs text-stone-400">محصول علفي تصديري - شبكة رشاشات</p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-xl border border-emerald-800">
              الزراعة: أكتوبر 2026
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-stone-800 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-stone-900/60 border border-stone-800">
              <div className="text-[10px] text-stone-400">الحشة الأولى</div>
              <div className="font-bold text-stone-200 mt-0.5">ديسمبر 2026</div>
            </div>
            <div className="p-2 rounded-xl bg-stone-900/60 border border-stone-800">
              <div className="text-[10px] text-stone-400">الدورات السنوية</div>
              <div className="font-bold text-emerald-400 mt-0.5">8 - 10 حشات/سنة</div>
            </div>
            <div className="p-2 rounded-xl bg-stone-900/60 border border-stone-800">
              <div className="text-[10px] text-stone-400">الإنتاجية المستهدفة</div>
              <div className="font-bold text-stone-200 mt-0.5">55 طن أخضر/فدان</div>
            </div>
          </div>
        </div>

        {/* Sector 10 Card */}
        <div
          onClick={() => setSelectedSectorFilter(selectedSectorFilter === 'sec_plot_10' ? 'all' : 'sec_plot_10')}
          className={`p-4 rounded-3xl border transition cursor-pointer relative overflow-hidden ${
            selectedSectorFilter === 'sec_plot_10'
              ? 'bg-gradient-to-br from-amber-950/40 via-stone-850 to-stone-900 border-amber-500 shadow-md ring-2 ring-amber-500/20'
              : 'bg-stone-850/80 border-stone-750 hover:border-stone-600'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <TreePalm className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-stone-100 flex items-center gap-2">
                  <span>قطعة رقم 10: نخيل صعيدي (سيوي)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900 text-amber-200 font-normal">
                    10 فدان (650 نخلة)
                  </span>
                </h4>
                <p className="text-xs text-stone-400">تمور نصف جافة فاخرة - شبكة تنقيط مزدوجة</p>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded-xl border border-amber-800">
              الغرس: مارس 2027
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-stone-800 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-stone-900/60 border border-stone-800">
              <div className="text-[10px] text-stone-400">تجهيز الجور</div>
              <div className="font-bold text-stone-200 mt-0.5">يناير - فبراير 2027</div>
            </div>
            <div className="p-2 rounded-xl bg-stone-900/60 border border-stone-800">
              <div className="text-[10px] text-stone-400">بشائر التزهير</div>
              <div className="font-bold text-amber-400 mt-0.5">مارس 2029</div>
            </div>
            <div className="p-2 rounded-xl bg-stone-900/60 border border-stone-800">
              <div className="text-[10px] text-stone-400">الحصاد الاقتصادي</div>
              <div className="font-bold text-stone-200 mt-0.5">سبتمبر 2030 (25 طن)</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Navigation Controls: Views & Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-stone-950/80 border border-stone-800 p-2 rounded-2xl">
        {/* View Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveViewTab('timeline')}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeViewTab === 'timeline'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>الجدول الزمني التفاعلي (Timeline)</span>
          </button>

          <button
            onClick={() => setActiveViewTab('grid')}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeViewTab === 'grid'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>عرض التقويم الشهري</span>
          </button>

          <button
            onClick={() => setActiveViewTab('roadmap')}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeViewTab === 'roadmap'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>خارطة طريق المحاصيل (2026 - 2030)</span>
          </button>

          <button
            onClick={() => setActiveViewTab('yield')}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeViewTab === 'yield'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>توقعات الحصاد والإنتاجية</span>
          </button>
        </div>

        {/* Year Selector */}
        {(activeViewTab === 'timeline' || activeViewTab === 'grid') && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-stone-400 font-semibold">السنة:</span>
            <div className="flex items-center bg-stone-900 border border-stone-750 rounded-xl p-0.5">
              {[2026, 2027, 2028, 2029, 2030].map((yr) => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedYear === yr
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Activity Category Filters Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-stone-400 text-xs font-semibold shrink-0 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-stone-500" />
          تصفية العمليات:
        </span>

        <button
          onClick={() => setSelectedCategoryFilter('all')}
          className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 font-medium ${
            selectedCategoryFilter === 'all'
              ? 'bg-stone-100 text-stone-900 font-bold'
              : 'bg-stone-850 text-stone-400 hover:text-stone-200 border border-stone-750'
          }`}
        >
          كافة العمليات ({events.length})
        </button>

        <button
          onClick={() => setSelectedCategoryFilter('planting')}
          className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1.5 font-medium ${
            selectedCategoryFilter === 'planting'
              ? 'bg-emerald-600 text-white font-bold'
              : 'bg-stone-850 text-stone-400 hover:text-stone-200 border border-stone-750'
          }`}
        >
          <Sprout className="w-3.5 h-3.5" />
          <span>مواعيد الزراعة والغرس</span>
        </button>

        <button
          onClick={() => setSelectedCategoryFilter('harvest_cutting')}
          className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1.5 font-medium ${
            selectedCategoryFilter === 'harvest_cutting'
              ? 'bg-amber-600 text-white font-bold'
              : 'bg-stone-850 text-stone-400 hover:text-stone-200 border border-stone-750'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>مواعيد الحش والحصاد</span>
        </button>

        <button
          onClick={() => setSelectedCategoryFilter('soil_preparation')}
          className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1.5 font-medium ${
            selectedCategoryFilter === 'soil_preparation'
              ? 'bg-stone-700 text-white font-bold'
              : 'bg-stone-850 text-stone-400 hover:text-stone-200 border border-stone-750'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>تجهيز التربة والجور</span>
        </button>

        <button
          onClick={() => setSelectedCategoryFilter('irrigation_schedule')}
          className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1.5 font-medium ${
            selectedCategoryFilter === 'irrigation_schedule'
              ? 'bg-sky-600 text-white font-bold'
              : 'bg-stone-850 text-stone-400 hover:text-stone-200 border border-stone-750'
          }`}
        >
          <Droplets className="w-3.5 h-3.5" />
          <span>برامج الري والتسميد</span>
        </button>

        <button
          onClick={() => setSelectedCategoryFilter('pollination')}
          className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1.5 font-medium ${
            selectedCategoryFilter === 'pollination'
              ? 'bg-purple-600 text-white font-bold'
              : 'bg-stone-850 text-stone-400 hover:text-stone-200 border border-stone-750'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>التلقيح والتأبير</span>
        </button>

        <button
          onClick={() => setSelectedCategoryFilter('pest_protection')}
          className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1.5 font-medium ${
            selectedCategoryFilter === 'pest_protection'
              ? 'bg-rose-600 text-white font-bold'
              : 'bg-stone-850 text-stone-400 hover:text-stone-200 border border-stone-750'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>مكافحة الآفات وسوسة النخيل</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* VIEW 1: TIMELINE & GANTT VIEW */}
      {/* ========================================================= */}
      {activeViewTab === 'timeline' && (
        <div className="space-y-4 animate-in fade-in">
          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center bg-stone-850/60 rounded-3xl border border-stone-800 space-y-3">
              <CalendarIcon className="w-10 h-10 text-stone-600 mx-auto" />
              <p className="text-sm font-semibold text-stone-300">
                لا توجد مواعيد زراعية تطابق الفلاتر المحددة لعام {selectedYear}.
              </p>
              <p className="text-xs text-stone-500">
                يمكنك التبديل إلى سنة أخرى أو تغيير تصفية القطاعات أعلاه.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((ev) => {
                const badge = getCategoryBadge(ev.activityCategory);
                const isSec9 = ev.sectorId === 'sec_plot_9';

                return (
                  <div
                    key={ev.id}
                    className={`p-4 sm:p-5 rounded-3xl border transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                      ev.isMilestone
                        ? isSec9
                          ? 'bg-gradient-to-r from-emerald-950/40 via-stone-850 to-stone-900 border-emerald-700/80 shadow-md'
                          : 'bg-gradient-to-r from-amber-950/40 via-stone-850 to-stone-900 border-amber-700/80 shadow-md'
                        : 'bg-stone-850/70 border-stone-750 hover:border-stone-600'
                    }`}
                  >
                    {/* Left: Event Details & Badges */}
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Sector Tag */}
                        <span
                          className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                            isSec9
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {isSec9 ? <Wheat className="w-3 h-3" /> : <TreePalm className="w-3 h-3" />}
                          <span>{ev.sectorNameAr}</span>
                        </span>

                        {/* Category Badge */}
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${badge.bg}`}>
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>

                        {/* Season & Month */}
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-900 text-stone-300 border border-stone-800">
                          {ev.seasonAr} • شهر {ev.month}
                        </span>

                        {/* Harvest / Planting Specific Banner */}
                        {ev.isPlanting && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-200 border border-emerald-700 font-bold">
                            🌱 موعد زراعة رئيسي
                          </span>
                        )}
                        {ev.isHarvest && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900 text-amber-200 border border-amber-700 font-bold">
                            🧺 موعد حش / حصاد
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="font-bold text-sm sm:text-base text-stone-100 flex items-center gap-2">
                        <span>{ev.title}</span>
                      </h4>

                      {/* Instructions */}
                      <p className="text-xs text-stone-300 leading-relaxed">
                        {ev.keyInstructions}
                      </p>

                      {/* Expected Yield & Climate Advisory */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-[11px] pt-1">
                        {ev.expectedYield && (
                          <div className="flex items-center gap-1.5 text-amber-300 font-semibold bg-amber-950/50 px-2.5 py-1 rounded-xl border border-amber-900">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>المحصول المتوقع: {ev.expectedYield}</span>
                          </div>
                        )}

                        {ev.climateAdvisory && (
                          <div className="flex items-center gap-1.5 text-sky-300 bg-sky-950/40 px-2.5 py-1 rounded-xl border border-sky-900">
                            <Sun className="w-3.5 h-3.5 text-sky-400" />
                            <span>الإرشاد المناخي: {ev.climateAdvisory}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Date Box & Action CTA */}
                    <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-stone-800 shrink-0">
                      {/* Dates Display */}
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                          <CalendarIcon className="w-3.5 h-3.5" />
                          <span>{ev.startDate}</span>
                          <span className="text-stone-500">إلى</span>
                          <span>{ev.endDate}</span>
                        </div>
                        {ev.assignedWorkerName && (
                          <div className="text-[11px] text-stone-400 mt-0.5">
                            المسؤول: {ev.assignedWorkerName}
                          </div>
                        )}
                      </div>

                      {/* Quick Convert Button */}
                      <button
                        onClick={() => handleCreateTaskFromAgriEvent(ev)}
                        className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-emerald-600 hover:text-white border border-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                        title="تحويل هذا الموعد إلى مهمة ميدانية فورية وتعيينها للعامل"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 group-hover:text-white" />
                        <span>تحويل لمهمة ميدانية</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 2: MONTHLY CALENDAR GRID VIEW */}
      {/* ========================================================= */}
      {activeViewTab === 'grid' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Month Selector Carousel */}
          <div className="flex items-center justify-between bg-stone-950 p-2.5 rounded-2xl border border-stone-800">
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {ARABIC_MONTHS.map((m) => {
                const monthEventsCount = events.filter((e) => e.year === selectedYear && e.month === m.num).length;
                return (
                  <button
                    key={m.num}
                    onClick={() => setCurrentMonth(m.num)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      currentMonth === m.num
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850'
                    }`}
                  >
                    <span>{m.name}</span>
                    {monthEventsCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-emerald-950 text-emerald-300 text-[10px] flex items-center justify-center border border-emerald-700">
                        {monthEventsCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Month Highlights & Climate Outlook */}
          <div className="p-4 rounded-3xl bg-stone-850/80 border border-stone-750 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-stone-100">
                  الأجندة الزراعية لشهر {ARABIC_MONTHS.find((m) => m.num === currentMonth)?.name} {selectedYear}
                </h4>
                <p className="text-stone-400">
                  {selectedYear === 2026 && currentMonth === 10 && '🌱 الموعد الاستراتيجي لزراعة البرسيم الحجازي بقطعة 9 في جو الوادي الجديد المثالي.'}
                  {selectedYear === 2026 && currentMonth === 12 && '🧺 موعد الحشة الأولى (الفطام) للبرسيم الحجازي لتقوية التيجان.'}
                  {selectedYear === 2027 && currentMonth === 3 && '🌴 الموعد الذهبي لغرس 650 فسيلة نخيل صعيدي في قطعة 10 وحشة الربيع للبرسيم.'}
                  {selectedYear >= 2030 && currentMonth === 9 && '🍯 بدء الحصاد الاقتصادي الذهبي لتمور النخيل الصعيدي (سيوي) عالية السكر.'}
                  {!(selectedYear === 2026 && (currentMonth === 10 || currentMonth === 12)) && !(selectedYear === 2027 && currentMonth === 3) && !(selectedYear >= 2030 && currentMonth === 9) && 'متابعة دورات الري والتسميد الفوسفاتي والوقاية الدورية من الآفات.'}
                </p>
              </div>
            </div>

            <div className="text-left md:text-right shrink-0">
              <span className="text-[11px] px-3 py-1 rounded-full bg-stone-900 text-stone-300 border border-stone-800 font-mono">
                محافظة الوادي الجديد • مناخ جاف ومشمس
              </span>
            </div>
          </div>

          {/* Month Events Cards Grid */}
          {(() => {
            const currentMonthEvents = events.filter((e) => {
              if (selectedSectorFilter !== 'all' && e.sectorId !== selectedSectorFilter) return false;
              if (selectedCategoryFilter !== 'all' && e.activityCategory !== selectedCategoryFilter) return false;
              return e.year === selectedYear && e.month === currentMonth;
            });

            if (currentMonthEvents.length === 0) {
              return (
                <div className="p-8 text-center bg-stone-850/40 rounded-3xl border border-stone-800 text-stone-400 text-xs">
                  لا توجد عمليات أو مواعيد رئيسية مسجلة في هذا الشهر لعام {selectedYear}.
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentMonthEvents.map((ev) => {
                  const badge = getCategoryBadge(ev.activityCategory);
                  const isSec9 = ev.sectorId === 'sec_plot_9';
                  return (
                    <div
                      key={ev.id}
                      className="p-4 rounded-3xl bg-stone-850 border border-stone-750 space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                              isSec9
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {isSec9 ? <Wheat className="w-3 h-3" /> : <TreePalm className="w-3 h-3" />}
                            <span>{ev.sectorNameAr}</span>
                          </span>

                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </div>

                        <h4 className="font-bold text-sm text-stone-100">{ev.title}</h4>
                        <p className="text-xs text-stone-300">{ev.keyInstructions}</p>

                        {ev.expectedYield && (
                          <div className="text-[11px] text-amber-300 bg-amber-950/40 p-2 rounded-xl border border-amber-900">
                            المحصول: {ev.expectedYield}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs">
                        <span className="font-mono text-emerald-400 font-bold">
                          {ev.startDate}
                        </span>
                        <button
                          onClick={() => handleCreateTaskFromAgriEvent(ev)}
                          className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-emerald-600 hover:text-white border border-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>تكليف بمهمة</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 3: CROP ROADMAP & MILESTONES (2026 - 2030) */}
      {/* ========================================================= */}
      {activeViewTab === 'roadmap' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Intro Roadmap Box */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-stone-900 to-amber-950/40 border border-stone-750 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-amber-600 flex items-center justify-center text-white shadow-lg shrink-0">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-base text-stone-100">
                  خارطة الطريق الزراعية متعددة السنوات (مزرعة أطياب الوادي)
                </h4>
                <p className="text-xs text-stone-400">
                  التسلسل التأسيسي والإنتاجي الشامل لمحصول البرسيم الحجازي (قطعة 9) ومزرعة النخيل الصعيدي (قطعة 10)
                </p>
              </div>
            </div>
          </div>

          {/* Multi-Year Cards Roadmap */}
          <div className="space-y-4">
            {AGRICULTURAL_YEARLY_PLANS.map((plan) => {
              const isCurrentYear = plan.year === 2026;
              return (
                <div
                  key={plan.year}
                  className={`p-5 rounded-3xl border transition relative overflow-hidden ${
                    isCurrentYear
                      ? 'bg-gradient-to-br from-emerald-950/30 via-stone-850 to-stone-900 border-emerald-600/80 shadow-lg ring-1 ring-emerald-500/20'
                      : 'bg-stone-850/80 border-stone-750'
                  }`}
                >
                  {/* Year Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-stone-800 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold font-mono text-emerald-400 bg-emerald-950/80 px-3.5 py-1 rounded-2xl border border-emerald-800">
                        عام {plan.year}
                      </span>
                      <h4 className="font-bold text-sm sm:text-base text-stone-100">
                        {plan.theme}
                      </h4>
                    </div>

                    {isCurrentYear && (
                      <span className="text-xs font-bold text-emerald-300 bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-700">
                        العام الحالي (قيد التنفيذ)
                      </span>
                    )}
                  </div>

                  {/* Sector 9 vs Sector 10 Milestones in this Year */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                    {/* Plot 9 Milestones */}
                    <div className="p-4 rounded-2xl bg-stone-900/90 border border-emerald-950 space-y-2.5">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                        <Wheat className="w-4 h-4" />
                        <span>قطعة رقم 9 (برسيم حجازي - 10 أفدنة)</span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-stone-300">
                        {plan.sector9Milestones.map((m, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-emerald-400 mt-0.5">•</span>
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="pt-2 border-t border-stone-800 text-[11px] text-stone-400 flex items-center justify-between">
                        <span>الحشات المتوقعة: <b className="text-stone-200">{plan.expectedHarvestSummary.sector9AlfalfaCuts} حشات</b></span>
                        <span>الإنتاج الأخضر: <b className="text-emerald-400">{plan.expectedHarvestSummary.sector9TotalGreenTons} طن</b></span>
                      </div>
                    </div>

                    {/* Plot 10 Milestones */}
                    <div className="p-4 rounded-2xl bg-stone-900/90 border border-amber-950 space-y-2.5">
                      <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                        <TreePalm className="w-4 h-4" />
                        <span>قطعة رقم 10 (نخيل صعيدي - 650 نخلة)</span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-stone-300">
                        {plan.sector10Milestones.map((m, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-amber-400 mt-0.5">•</span>
                            <span>{m}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="pt-2 border-t border-stone-800 text-[11px] text-stone-400 flex items-center justify-between">
                        <span>المرحلة: <b className="text-stone-200">{plan.expectedHarvestSummary.sector10DatesStage}</b></span>
                        <span>الإنتاج: <b className="text-amber-400">{plan.expectedHarvestSummary.sector10ExpectedTons} طن تمور</b></span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 4: LONG-TERM YIELD & HARVEST PROJECTIONS */}
      {/* ========================================================= */}
      {activeViewTab === 'yield' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Top Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750 space-y-1.5">
              <div className="text-xs text-stone-400">إجمالي مساحة القطاعين</div>
              <div className="text-xl font-bold text-stone-100 font-mono">20 فدان</div>
              <div className="text-[11px] text-emerald-400">10 فدان برسيم + 10 فدان نخيل</div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750 space-y-1.5">
              <div className="text-xs text-stone-400">مجموع أشجار النخيل (قطعة 10)</div>
              <div className="text-xl font-bold text-amber-400 font-mono">650 نخلة</div>
              <div className="text-[11px] text-stone-400">صنف صعيدي سيوي فاخر (8م × 8م)</div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750 space-y-1.5">
              <div className="text-xs text-stone-400">متوسط حشات البرسيم السنوية</div>
              <div className="text-xl font-bold text-emerald-400 font-mono">8 - 9 حشات</div>
              <div className="text-[11px] text-stone-400">550 طن أخضر / 135 طن دريس سنوياً</div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750 space-y-1.5">
              <div className="text-xs text-stone-400">ذروة إنتاج التمور (2031+)</div>
              <div className="text-xl font-bold text-amber-400 font-mono">65 - 75 طن</div>
              <div className="text-[11px] text-stone-400">100-115 كجم لكل نخلة سنوياً</div>
            </div>
          </div>

          {/* Comprehensive Yield Table */}
          <div className="bg-stone-850/90 rounded-3xl border border-stone-750 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-750 flex items-center justify-between">
              <h4 className="font-bold text-sm sm:text-base text-stone-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>جدول المحاكاة والإنتاجية التقديرية للقطاعين (2026 - 2031+)</span>
              </h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-stone-900/90 text-stone-400 border-b border-stone-800">
                    <th className="p-3.5">السنة</th>
                    <th className="p-3.5">المحصول 1 (قطعة 9 - برسيم)</th>
                    <th className="p-3.5">عدد الحشات</th>
                    <th className="p-3.5">الإنتاج الأخضر (طن)</th>
                    <th className="p-3.5">دريس جاف (طن)</th>
                    <th className="p-3.5">المحصول 2 (قطعة 10 - نخيل)</th>
                    <th className="p-3.5">مرحلة النخيل</th>
                    <th className="p-3.5">إنتاج التمور (طن)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800 text-stone-300">
                  <tr className="hover:bg-stone-800/40">
                    <td className="p-3.5 font-bold font-mono text-emerald-400">2026</td>
                    <td className="p-3.5 font-semibold text-stone-200">الزراعة (أكتوبر)</td>
                    <td className="p-3.5 font-mono">1 (فطام)</td>
                    <td className="p-3.5 font-mono text-emerald-400">15 طن</td>
                    <td className="p-3.5 font-mono">3.5 طن</td>
                    <td className="p-3.5 font-semibold text-stone-200">تجهيز الجور والشبكة</td>
                    <td className="p-3.5 text-stone-400">تأسيس</td>
                    <td className="p-3.5 font-mono text-stone-500">0 طن</td>
                  </tr>

                  <tr className="hover:bg-stone-800/40">
                    <td className="p-3.5 font-bold font-mono text-emerald-400">2027</td>
                    <td className="p-3.5 font-semibold text-stone-200">إنتاج دوري كامل</td>
                    <td className="p-3.5 font-mono">8 حشات</td>
                    <td className="p-3.5 font-mono text-emerald-400">520 طن</td>
                    <td className="p-3.5 font-mono">125 طن</td>
                    <td className="p-3.5 font-semibold text-stone-200">الغرس (مارس 2027)</td>
                    <td className="p-3.5 text-stone-400">تجذير ونمو خضري</td>
                    <td className="p-3.5 font-mono text-stone-500">0 طن</td>
                  </tr>

                  <tr className="hover:bg-stone-800/40">
                    <td className="p-3.5 font-bold font-mono text-emerald-400">2028</td>
                    <td className="p-3.5 font-semibold text-stone-200">ذروة الإنتاج العلفي</td>
                    <td className="p-3.5 font-mono">9 حشات</td>
                    <td className="p-3.5 font-mono text-emerald-400">580 طن</td>
                    <td className="p-3.5 font-mono">140 طن</td>
                    <td className="p-3.5 font-semibold text-stone-200">السنة الثانية للنخيل</td>
                    <td className="p-3.5 text-stone-400">بناء الهيكل والسعف</td>
                    <td className="p-3.5 font-mono text-stone-500">0 طن</td>
                  </tr>

                  <tr className="hover:bg-stone-800/40">
                    <td className="p-3.5 font-bold font-mono text-emerald-400">2029</td>
                    <td className="p-3.5 font-semibold text-stone-200">إنتاج مستمر عالي الجودة</td>
                    <td className="p-3.5 font-mono">8 حشات</td>
                    <td className="p-3.5 font-mono text-emerald-400">510 طن</td>
                    <td className="p-3.5 font-mono">120 طن</td>
                    <td className="p-3.5 font-semibold text-amber-300">السنة الثالثة (تزهير أولي)</td>
                    <td className="p-3.5 text-amber-400">بشائر إثمار تجريبي</td>
                    <td className="p-3.5 font-mono text-amber-400">3.5 طن</td>
                  </tr>

                  <tr className="hover:bg-stone-800/40">
                    <td className="p-3.5 font-bold font-mono text-emerald-400">2030</td>
                    <td className="p-3.5 font-semibold text-stone-200">نهاية الدورة الزراعية الأولى</td>
                    <td className="p-3.5 font-mono">7 حشات</td>
                    <td className="p-3.5 font-mono text-emerald-400">450 طن</td>
                    <td className="p-3.5 font-mono">105 طن</td>
                    <td className="p-3.5 font-semibold text-amber-300">السنة الرابعة (إنتاج اقتصادي)</td>
                    <td className="p-3.5 text-amber-400">حصاد اقتصادي أول</td>
                    <td className="p-3.5 font-mono text-amber-400 font-bold">23 - 26 طن</td>
                  </tr>

                  <tr className="bg-emerald-950/30 hover:bg-emerald-950/40 border-t border-emerald-900/50">
                    <td className="p-3.5 font-bold font-mono text-emerald-300">2031+</td>
                    <td className="p-3.5 font-semibold text-stone-200">تجديد أو تناوب المحاصيل</td>
                    <td className="p-3.5 font-mono">دورة جديدة</td>
                    <td className="p-3.5 font-mono text-emerald-300">550 طن/سنة</td>
                    <td className="p-3.5 font-mono">130 طن</td>
                    <td className="p-3.5 font-semibold text-amber-300">الإنتاج الكامل المستدام</td>
                    <td className="p-3.5 text-emerald-400 font-bold">طاقة إنتاجية قصوى</td>
                    <td className="p-3.5 font-mono text-amber-300 font-bold">65 - 75 طن/سنة</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. EVENT CREATION / EDITING MODAL */}
      {/* ========================================================= */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-stone-900 border border-stone-750 rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="font-bold text-base text-stone-100 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-emerald-400" />
                <span>إضافة موعد زراعي جديد للتقويم</span>
              </h3>
              <button
                onClick={() => setIsEventModalOpen(false)}
                className="text-stone-400 hover:text-stone-200 text-xs cursor-pointer"
              >
                إلغاء
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newEventTitle.trim()) return;

                const startD = new Date(newEventStartDate);
                const year = startD.getFullYear();
                const month = startD.getMonth() + 1;

                const newEv: AgriCalendarEvent = {
                  id: `ev_custom_${Date.now()}`,
                  sectorId: newEventSectorId,
                  sectorNameAr: newEventSectorId === 'sec_plot_9' ? 'قطعة رقم 9 - برسيم حجازي' : 'قطعة رقم 10 - نخيل صعيدي',
                  cropType: newEventSectorId === 'sec_plot_9' ? 'alfalfa' : 'date_palm_saidi',
                  title: newEventTitle.trim(),
                  activityCategory: newEventCategory,
                  activityCategoryAr: getCategoryBadge(newEventCategory).label,
                  startDate: newEventStartDate,
                  endDate: newEventEndDate || newEventStartDate,
                  year: year,
                  month: month,
                  season: month >= 9 && month <= 11 ? 'autumn' : month === 12 || month <= 2 ? 'winter' : month >= 3 && month <= 5 ? 'spring' : 'summer',
                  seasonAr: month >= 9 && month <= 11 ? 'الخريف' : month === 12 || month <= 2 ? 'الشتاء' : month >= 3 && month <= 5 ? 'الربيع' : 'الصيف',
                  isHarvest: newEventIsHarvest,
                  isPlanting: newEventIsPlanting,
                  expectedYield: newEventExpectedYield || undefined,
                  keyInstructions: newEventInstructions.trim() || 'تعليمات ميدانية عامة',
                  status: 'scheduled',
                  assignedWorkerName: newEventSectorId === 'sec_plot_9' ? 'علاء شعبان (عامل تشغيل)' : 'احمد طه (عامل تشغيل)',
                  isMilestone: newEventIsHarvest || newEventIsPlanting
                };

                if (onAddEvent) {
                  onAddEvent(newEv);
                }
                setIsEventModalOpen(false);
                setNewEventTitle('');
                setNewEventInstructions('');
              }}
              className="space-y-3.5 text-xs"
            >
              {/* Sector Pick */}
              <div>
                <label className="block text-stone-400 font-semibold mb-1">القطاع المستهدف:</label>
                <select
                  value={newEventSectorId}
                  onChange={(e) => setNewEventSectorId(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-stone-850 border border-stone-750 text-stone-100 font-semibold focus:outline-none focus:border-emerald-500"
                >
                  <option value="sec_plot_9">قطعة رقم 9 - برسيم حجازي (10 فدان)</option>
                  <option value="sec_plot_10">قطعة رقم 10 - نخيل صعيدي (10 فدان - 650 نخلة)</option>
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-stone-400 font-semibold mb-1">عنوان العملية / الموعد:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: الحشة الثالثة للبرسيم أو غرس فسائل النخيل"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-stone-850 border border-stone-750 text-stone-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Category & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-stone-400 font-semibold mb-1">نوع العملية:</label>
                  <select
                    value={newEventCategory}
                    onChange={(e) => setNewEventCategory(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-stone-850 border border-stone-750 text-stone-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="planting">غرس وزراعة 🌱</option>
                    <option value="harvest_cutting">حش وحصاد 🧺</option>
                    <option value="soil_preparation">تجهيز تربة وجور 🚜</option>
                    <option value="irrigation_schedule">ري وتسميد 💧</option>
                    <option value="pollination">تلقيح وتأبير 🌾</option>
                    <option value="pest_protection">وقاية ومكافحة 🛡️</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-400 font-semibold mb-1">تاريخ البدء:</label>
                  <input
                    type="date"
                    required
                    value={newEventStartDate}
                    onChange={(e) => setNewEventStartDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-stone-850 border border-stone-750 text-stone-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-stone-400 font-semibold mb-1">تاريخ الانتهاء:</label>
                  <input
                    type="date"
                    required
                    value={newEventEndDate}
                    onChange={(e) => setNewEventEndDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-stone-850 border border-stone-750 text-stone-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Flags */}
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-stone-300">
                  <input
                    type="checkbox"
                    checked={newEventIsHarvest}
                    onChange={(e) => setNewEventIsHarvest(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 bg-stone-800 border-stone-700 focus:ring-0"
                  />
                  <span>موعد حش / حصاد رئيسي</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-stone-300">
                  <input
                    type="checkbox"
                    checked={newEventIsPlanting}
                    onChange={(e) => setNewEventIsPlanting(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 bg-stone-800 border-stone-700 focus:ring-0"
                  />
                  <span>موعد زراعة / غرس</span>
                </label>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-stone-400 font-semibold mb-1">التعليمات الميدانية والفنية:</label>
                <textarea
                  rows={3}
                  placeholder="أدخل الإرشادات الميدانية، المقننات المائية، أو أصناف المبيدات والأسمدة الموصى بها..."
                  value={newEventInstructions}
                  onChange={(e) => setNewEventInstructions(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-stone-850 border border-stone-750 text-stone-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Yield */}
              <div>
                <label className="block text-stone-400 font-semibold mb-1">الإنتاجية التقديرية (اختياري):</label>
                <input
                  type="text"
                  placeholder="مثال: 60 طن أخضر للـ 10 أفدنة أو 30 كجم لكل نخلة"
                  value={newEventExpectedYield}
                  onChange={(e) => setNewEventExpectedYield(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-stone-850 border border-stone-750 text-stone-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-750 transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition cursor-pointer shadow-lg shadow-emerald-950/60"
                >
                  حفظ الموعد في التقويم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
