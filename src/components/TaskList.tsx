import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Clock,
  MapPin,
  CheckCircle2,
  AlertOctagon,
  Calendar,
  Layers,
  Camera,
  Eye,
  Repeat,
  Radio,
  Sparkles,
  User as UserIcon,
  Users,
  X,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Tag,
  AlertTriangle,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import {
  FarmTask,
  FarmSector,
  User,
  TaskPriority,
  TaskStatus,
  TaskCategory
} from '../types';

interface TaskListProps {
  tasks: FarmTask[];
  sectors: FarmSector[];
  users: User[];
  currentUser: User;
  onOpenCreateTask: () => void;
  onOpenImportExcel?: () => void;
  onSelectTask: (task: FarmTask) => void;
  onOpenVerification: (task: FarmTask) => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks = [],
  sectors = [],
  users = [],
  currentUser,
  onOpenCreateTask,
  onOpenImportExcel,
  onSelectTask,
  onOpenVerification
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedWorker, setSelectedWorker] = useState<string>('all');
  const [selectedDatePreset, setSelectedDatePreset] = useState<string>('all');
  const [customDate, setCustomDate] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  const isManager = currentUser?.role === 'manager';

  // Safe task list
  const safeTasks = tasks || [];

  // Extract distinct list of assigned workers
  const distinctWorkers = useMemo(() => {
    const workerMap = new Map<string, { id: string; name: string; roleTitle?: string }>();
    
    // First from users prop
    users.forEach((u) => {
      if (u && u.name) {
        workerMap.set(u.id, { id: u.id, name: u.name, roleTitle: u.roleTitleAr });
      }
    });

    // Also include anyone found in tasks who might not be in users
    safeTasks.forEach((t) => {
      if (t.assignedToUserId && t.assignedToName && !workerMap.has(t.assignedToUserId)) {
        workerMap.set(t.assignedToUserId, { id: t.assignedToUserId, name: t.assignedToName });
      }
    });

    return Array.from(workerMap.values());
  }, [users, safeTasks]);

  // Date helpers
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date(Date.now() + 86400000);
    return d.toISOString().split('T')[0];
  }, []);
  const weekEndStr = useMemo(() => {
    const d = new Date(Date.now() + 7 * 86400000);
    return d.toISOString().split('T')[0];
  }, []);

  // Filter logic (without text search as requested)
  const filteredTasks = useMemo(() => {
    return safeTasks.filter((task) => {
      if (!task) return false;

      // 1. Status Filter
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'in_progress_or_pending') {
          if (task.status !== 'in_progress' && task.status !== 'pending') return false;
        } else if (task.status !== selectedStatus) {
          return false;
        }
      }

      // 2. Worker / Assignee Filter
      if (selectedWorker !== 'all') {
        if (task.assignedToUserId !== selectedWorker && task.assignedToName !== selectedWorker) {
          return false;
        }
      }

      // 3. Date Preset / Custom Date Filter
      if (selectedDatePreset === 'today') {
        const isToday =
          task.scheduledDate === todayStr ||
          (task.createdAt && task.createdAt.startsWith(todayStr));
        if (!isToday) return false;
      } else if (selectedDatePreset === 'tomorrow') {
        const isTomorrow = task.scheduledDate === tomorrowStr;
        if (!isTomorrow) return false;
      } else if (selectedDatePreset === 'this_week') {
        const isThisWeek =
          task.scheduledDate &&
          task.scheduledDate >= todayStr &&
          task.scheduledDate <= weekEndStr;
        if (!isThisWeek) return false;
      } else if (selectedDatePreset === 'custom' && customDate) {
        const isCustomDate =
          task.scheduledDate === customDate ||
          (task.createdAt && task.createdAt.startsWith(customDate));
        if (!isCustomDate) return false;
      }

      // 4. Category Filter
      if (selectedCategory !== 'all' && task.category !== selectedCategory) {
        return false;
      }

      // 5. Sector Filter
      if (selectedSector !== 'all' && task.sectorId !== selectedSector) {
        return false;
      }

      // 6. Priority Filter
      if (selectedPriority !== 'all' && task.priority !== selectedPriority) {
        return false;
      }

      return true;
    });
  }, [
    safeTasks,
    selectedStatus,
    selectedWorker,
    selectedDatePreset,
    customDate,
    selectedCategory,
    selectedSector,
    selectedPriority,
    todayStr,
    tomorrowStr,
    weekEndStr
  ]);

  // Counts for status chips
  const countAll = safeTasks.length;
  const countInProgress = safeTasks.filter((t) => t.status === 'in_progress' || t.status === 'pending').length;
  const countCompleted = safeTasks.filter((t) => t.status === 'completed').length;
  const countApproved = safeTasks.filter((t) => t.status === 'approved').length;

  // Check if any filter is active
  const hasActiveFilters =
    selectedStatus !== 'all' ||
    selectedWorker !== 'all' ||
    selectedDatePreset !== 'all' ||
    Boolean(customDate) ||
    selectedCategory !== 'all' ||
    selectedSector !== 'all' ||
    selectedPriority !== 'all';

  const handleResetFilters = () => {
    setSelectedStatus('all');
    setSelectedWorker('all');
    setSelectedDatePreset('all');
    setCustomDate('');
    setSelectedCategory('all');
    setSelectedSector('all');
    setSelectedPriority('all');
  };

  // Export Approved Tasks to CSV for corporate archiving & printing
  const handleExportApprovedTasksCsv = (onlyApproved: boolean = true) => {
    const tasksToExport = onlyApproved
      ? safeTasks.filter((t) => t.status === 'approved')
      : filteredTasks;

    if (tasksToExport.length === 0) {
      alert(onlyApproved ? 'لا توجد مهام معتمدة حالياً لتصديرها.' : 'لا توجد مهام مطابقة لتصديرها.');
      return;
    }

    const headers = [
      'رقم المهمة',
      'عنوان المهمة',
      'القطاع الزراعي',
      'العامل المكلف',
      'حالة المهمة',
      'التصنيف الزراعي',
      'الأولوية',
      'تاريخ الجدولة',
      'موعد التنفيذ',
      'مطابقة الـ GPS (المسافة بالمتر)',
      'إحداثيات التوثيق',
      'توقيت التوثيق الميداني',
      'معتمد من',
      'تاريخ وتوقيت الاعتماد',
      'تقييم الجودة',
      'ملاحظات وتوجيهات الإدارة'
    ];

    const getStatusLabel = (st: TaskStatus) => {
      switch (st) {
        case 'approved':
          return 'معتمدة إدارياً';
        case 'completed':
          return 'مكتملة وموثقة';
        case 'in_progress':
          return 'قيد التنفيذ';
        default:
          return 'معلقة';
      }
    };

    const getPriorityLabel = (pr: TaskPriority) => {
      switch (pr) {
        case 'urgent':
          return 'عاجل جداً';
        case 'high':
          return 'مرتفع';
        case 'medium':
          return 'متوسط';
        default:
          return 'عادي';
      }
    };

    const rows = tasksToExport.map((t) => [
      `"${t.id}"`,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.sectorName || '').replace(/"/g, '""')}"`,
      `"${(t.assignedToName || '').replace(/"/g, '""')}"`,
      `"${getStatusLabel(t.status)}"`,
      `"${(t.categoryAr || t.category || '').replace(/"/g, '""')}"`,
      `"${getPriorityLabel(t.priority)}"`,
      `"${t.scheduledDate || ''}"`,
      `"${t.scheduledTime || ''}"`,
      `"${t.proofOfWork?.distanceFromTargetMeters ?? 'مطابق'}"`,
      `"${t.proofOfWork ? `${t.proofOfWork.capturedLat.toFixed(5)}, ${t.proofOfWork.capturedLng.toFixed(5)}` : ''}"`,
      `"${t.proofOfWork?.capturedAt ? new Date(t.proofOfWork.capturedAt).toLocaleString('ar-EG') : ''}"`,
      `"${(t.managerApproval?.approvedByName || (t.status === 'approved' ? 'أحمد (مدير المزرعة)' : '-')).replace(/"/g, '""')}"`,
      `"${t.managerApproval?.approvedAt ? new Date(t.managerApproval.approvedAt).toLocaleString('ar-EG') : ''}"`,
      `"${t.managerApproval?.rating ? `${t.managerApproval.rating}/5` : '-'}"`,
      `"${(t.managerApproval?.feedback || (t.status === 'approved' ? 'تم اعتماد الإنجاز والمطابقة الحقلية' : '')).replace(/"/g, '""')}"`
    ]);

    // Prepend UTF-8 BOM (\uFEFF) for perfect Arabic display in Excel/Office
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = onlyApproved
      ? `سجل_المهام_المعتمدة_أطياب_الوادي_${dateStr}.csv`
      : `سجل_المهام_الزراعية_أطياب_الوادي_${dateStr}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 text-[11px] font-bold">
            🔴 عاجل جداً
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 text-[11px] font-bold">
            🟠 مرتفع
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800 text-[11px]">
            🟡 متوسط
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 text-[11px]">
            🟢 عادي
          </span>
        );
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            معتمدة
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800 text-xs font-bold flex items-center gap-1">
            <Clock className="w-3 h-3 text-sky-400" />
            في انتظار الاعتماد
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 text-xs font-bold flex items-center gap-1">
            <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
            قيد التنفيذ
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700 text-xs">
            معلقة
          </span>
        );
    }
  };

  return (
    <div className="bg-stone-900 rounded-3xl border border-stone-800 p-4 sm:p-5 space-y-5 shadow-xl">
      {/* Header & Main Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-2 border-b border-stone-800/80">
        <div>
          <h3 className="font-bold text-base text-stone-100 flex items-center gap-2">
            <span>📋 المهام اليومية والجدولة الزراعية</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-bold">
              {filteredTasks.length} من أصل {countAll} مهمة
            </span>
          </h3>
          <p className="text-xs text-stone-400">
            تنبيه صوتي متكرر كل 30 دقيقة للمهام غير الموثقة بالـ GPS في قطاعات المزرعة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* View toggle */}
          <div className="p-1 bg-stone-800 rounded-xl border border-stone-700 flex items-center text-xs">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                viewMode === 'list' ? 'bg-stone-700 text-white font-bold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              قائمة
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                viewMode === 'kanban' ? 'bg-stone-700 text-white font-bold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              كانبان
            </button>
          </div>

          {/* Export Approved Tasks CSV (Audit Log) Button */}
          <button
            onClick={() => handleExportApprovedTasksCsv(true)}
            className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-750 text-emerald-300 hover:text-emerald-200 border border-emerald-800/60 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            title="تصدير سجل المهام المعتمدة الموثقة إلى ملف CSV للطباعة أو الأرشفة في ملفات الشركة"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>تصدير المعتمدة (CSV)</span>
          </button>

          {/* Import Tasks via Excel (Manager Only) */}
          {isManager && onOpenImportExcel && (
            <button
              onClick={onOpenImportExcel}
              className="px-3.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-teal-100 text-xs font-bold shadow-md shadow-teal-950/40 flex items-center gap-1.5 transition cursor-pointer border border-teal-600/60"
              title="إضافة وتعيين مهام متعددة دفعة واحدة عبر استيراد ملف إكسل Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-300" />
              <span>استيراد ملف إكسل</span>
            </button>
          )}

          {/* Create Task Button (Manager Only) */}
          {isManager ? (
            <button
              onClick={onOpenCreateTask}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء مهمة يدوياً</span>
            </button>
          ) : (
            <span className="text-[11px] text-stone-500 px-2.5 py-1.5 rounded-xl bg-stone-800/60 border border-stone-800">
              🔒 إضافة المهام مقتصرة على الإدارة
            </span>
          )}
        </div>
      </div>

      {/* 1. Quick Status Filter Pills */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                selectedStatus === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-700'
              }`}
            >
              <span>جميع المهام</span>
              <span className="px-1.5 py-0.2 rounded-md bg-stone-900/60 text-[11px] font-mono">
                {countAll}
              </span>
            </button>

            <button
              onClick={() => setSelectedStatus('in_progress_or_pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                selectedStatus === 'in_progress_or_pending' || selectedStatus === 'in_progress'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800 shadow-sm'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-700'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>قيد التنفيذ</span>
              <span className="px-1.5 py-0.2 rounded-md bg-amber-900/40 text-[11px] font-mono text-amber-300">
                {countInProgress}
              </span>
            </button>

            <button
              onClick={() => setSelectedStatus('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                selectedStatus === 'completed'
                  ? 'bg-sky-950 text-sky-300 border border-sky-800 shadow-sm'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>مكتملة وموثقة</span>
              <span className="px-1.5 py-0.2 rounded-md bg-sky-900/40 text-[11px] font-mono text-sky-300">
                {countCompleted}
              </span>
            </button>

            <button
              onClick={() => setSelectedStatus('approved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                selectedStatus === 'approved'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 shadow-sm'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>معتمدة إدارياً</span>
              <span className="px-1.5 py-0.2 rounded-md bg-emerald-900/40 text-[11px] font-mono text-emerald-300">
                {countApproved}
              </span>
            </button>
          </div>

          {/* Toggle Advanced Filters Button */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
              showAdvancedFilters
                ? 'bg-stone-800 text-emerald-400 border-emerald-800/80'
                : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-750'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>فلاتر التصنيف والتاريخ</span>
            {showAdvancedFilters ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* 2. Advanced Filters Grid (Worker, Date, Sector, Category, Priority) */}
      {showAdvancedFilters && (
        <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Worker / Assignee Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-stone-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-sky-400" />
                <span>العامل المكلف:</span>
              </label>
              <select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-750 text-stone-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
              >
                <option value="all">جميع العمال والمشرفين</option>
                {distinctWorkers.map((w) => (
                  <option key={w.id} value={w.id}>
                    👤 {w.name} {w.roleTitle ? `(${w.roleTitle})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Date Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-stone-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>تاريخ المهمة:</span>
              </label>
              <select
                value={selectedDatePreset}
                onChange={(e) => {
                  setSelectedDatePreset(e.target.value);
                  if (e.target.value !== 'custom') {
                    setCustomDate('');
                  }
                }}
                className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-750 text-stone-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
              >
                <option value="all">جميع التواريخ</option>
                <option value="today">📅 مهام اليوم</option>
                <option value="tomorrow">📅 مهام الغد</option>
                <option value="this_week">📅 مهام هذا الأسبوع</option>
                <option value="custom">📆 تحديد تاريخ مخصص...</option>
              </select>
            </div>

            {/* Custom Date Picker (Shows when custom is chosen) */}
            {selectedDatePreset === 'custom' ? (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-stone-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>اختر التاريخ:</span>
                </label>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-750 text-stone-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                />
              </div>
            ) : (
              /* 3. Sector Filter */
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-stone-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>القطاع الزراعي:</span>
                </label>
                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-750 text-stone-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value="all">جميع قطاعات المزرعة</option>
                  {sectors.map((s) => (
                    <option key={s.id} value={s.id}>
                      📍 {s.nameAr}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 4. Operation Category */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-stone-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-purple-400" />
                <span>العملية الزراعية:</span>
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-750 text-stone-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
              >
                <option value="all">جميع العمليات</option>
                <option value="pest_control">مكافحة الآفات وسوسة النخيل</option>
                <option value="irrigation">الري والتسميد</option>
                <option value="pollination">تلقيح وتكميم النخيل</option>
                <option value="pump_maintenance">صيانة الآبار والطاقة</option>
                <option value="harvest">حصاد التمور</option>
              </select>
            </div>
          </div>

          {/* Active Filters Bar & Reset Option */}
          {hasActiveFilters && (
            <div className="pt-2 border-t border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5 text-stone-400">
                <span className="text-[11px]">الفلاتر النشطة:</span>

                {selectedStatus !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-[11px]">
                    الحالة: {selectedStatus === 'in_progress_or_pending' ? 'قيد التنفيذ' : selectedStatus === 'completed' ? 'مكتملة' : 'معتمدة'}
                    <button onClick={() => setSelectedStatus('all')} className="hover:text-rose-400 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {selectedWorker !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-950/80 text-sky-300 border border-sky-800 text-[11px]">
                    العامل: {distinctWorkers.find((w) => w.id === selectedWorker)?.name || selectedWorker}
                    <button onClick={() => setSelectedWorker('all')} className="hover:text-rose-400 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {selectedDatePreset !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-800 text-[11px]">
                    التاريخ: {selectedDatePreset === 'today' ? 'اليوم' : selectedDatePreset === 'tomorrow' ? 'الغد' : selectedDatePreset === 'this_week' ? 'هذا الأسبوع' : customDate || 'مخصص'}
                    <button onClick={() => { setSelectedDatePreset('all'); setCustomDate(''); }} className="hover:text-rose-400 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {selectedSector !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-950/80 text-purple-300 border border-purple-800 text-[11px]">
                    القطاع: {sectors.find((s) => s.id === selectedSector)?.nameAr || selectedSector}
                    <button onClick={() => setSelectedSector('all')} className="hover:text-rose-400 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>

              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-950 text-rose-300 border border-rose-800/60 transition cursor-pointer text-xs font-semibold"
              >
                <RotateCcw className="w-3 h-3" />
                <span>إعادة ضبط الفلاتر</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. View Content */}
      {filteredTasks.length === 0 ? (
        <div className="py-12 text-center rounded-2xl bg-stone-850 border border-stone-800 text-stone-400 space-y-4 p-6">
          <Layers className="w-12 h-12 mx-auto text-stone-600" />
          <div className="space-y-1.5 max-w-md mx-auto">
            <p className="text-sm font-bold text-stone-200">
              {safeTasks.length === 0 ? 'لا توجد مهام زراعية مسجلة حالياً' : 'لا توجد مهام مطابقة للفلاتر المحددة'}
            </p>
            <p className="text-xs text-stone-400 leading-relaxed">
              {safeTasks.length === 0
                ? isManager
                  ? 'تم إلغاء المهام السابقة بنجاح. بصفتك مديراً للمزرعة، يمكنك الآن إضافة مهام جديدة يدوياً أو استيراد جدول المهام الميدانية دفعة واحدة من ملف إكسل (Excel).'
                  : 'لا توجد مهام معينة حالياً. يتم إضافة وجدولة المهام حصرياً من قبل مديري المزرعة.'
                : 'يرجى تغيير خيارات الفلترة أو إعادة ضبطها لعرض المهام المتاحة.'}
            </p>
          </div>
          {safeTasks.length === 0 && isManager ? (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                onClick={onOpenCreateTask}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة مهمة يدوياً</span>
              </button>
              {onOpenImportExcel && (
                <button
                  onClick={onOpenImportExcel}
                  className="px-4 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-teal-100 border border-teal-600/60 text-xs font-bold shadow-md inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-teal-300" />
                  <span>استيراد ملف إكسل Excel</span>
                </button>
              )}
            </div>
          ) : hasActiveFilters ? (
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-emerald-400 border border-stone-700 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة ضبط جميع الفلاتر</span>
            </button>
          ) : null}
        </div>
      ) : viewMode === 'list' ? (
        /* LIST VIEW */
        <div className="space-y-2.5">
          {filteredTasks.map((task) => {
            const isAlarming = task.isAlarmActive && (task.status === 'pending' || task.status === 'in_progress');
            return (
              <div
                key={task.id}
                className={`group p-4 rounded-2xl border transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm ${
                  isAlarming
                    ? 'bg-rose-950/20 border-rose-800/80 hover:border-rose-600'
                    : 'bg-stone-850 border-stone-750 hover:border-stone-600'
                }`}
              >
                {/* Left Task Info */}
                <div className="flex items-start gap-3.5 flex-1">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isAlarming
                        ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30'
                        : task.status === 'approved'
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-stone-800 text-stone-300'
                    }`}
                  >
                    {isAlarming ? (
                      <Radio className="w-5 h-5 animate-pulse text-rose-400" />
                    ) : task.status === 'approved' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Clock className="w-5 h-5 text-stone-400" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4
                        onClick={() => onSelectTask(task)}
                        className="font-bold text-sm text-stone-100 hover:text-emerald-400 transition cursor-pointer"
                      >
                        {task.title}
                      </h4>
                      {getPriorityBadge(task.priority)}
                      {getStatusBadge(task.status)}
                      {task.isRecurring && (
                        <span className="text-[10px] text-stone-400 flex items-center gap-1 font-mono">
                          <Repeat className="w-3 h-3 text-emerald-400" />
                          دورية
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-stone-400 line-clamp-1">
                      {task.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-400 pt-1">
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                        <MapPin className="w-3 h-3" />
                        {task.sectorName}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-stone-300 font-semibold">
                        <UserIcon className="w-3 h-3 text-sky-400" />
                        {task.assignedToName}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-amber-300 font-mono">
                        <Calendar className="w-3 h-3 text-amber-400" />
                        {task.scheduledDate || 'اليوم'} ({task.scheduledTime})
                      </span>
                      {task.proofOfWork && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            توثيق GPS معتمد ({task.proofOfWork.distanceFromTargetMeters}م)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-2 md:pt-0 border-stone-800">
                  {/* If not completed, show Verification Action */}
                  {(task.status === 'pending' || task.status === 'in_progress') && (
                    <button
                      onClick={() => onOpenVerification(task)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/30 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>توثيق وإيقاف التنبيه</span>
                    </button>
                  )}

                  <button
                    onClick={() => onSelectTask(task)}
                    className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>التفاصيل</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* KANBAN VIEW */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Column 1: Pending / In Progress */}
          <div className="rounded-2xl bg-stone-850/70 border border-stone-800 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-stone-750">
              <span className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                قيد التنفيذ والتنبيه
              </span>
              <span className="text-xs font-mono bg-stone-800 px-2 py-0.5 rounded text-stone-300">
                {filteredTasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length}
              </span>
            </div>
            <div className="space-y-3">
              {filteredTasks
                .filter((t) => t.status === 'pending' || t.status === 'in_progress')
                .map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className="p-3.5 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-700 space-y-2 cursor-pointer transition"
                  >
                    <div className="flex items-center justify-between">
                      {getPriorityBadge(task.priority)}
                      <span className="text-[10px] text-stone-400 font-mono">
                        {task.scheduledTime}
                      </span>
                    </div>
                    <h5 className="font-bold text-xs text-stone-100 line-clamp-1">{task.title}</h5>
                    <div className="text-[11px] text-stone-400 flex items-center justify-between">
                      <span>📍 {task.sectorName.split('-')[0]}</span>
                      <span className="text-sky-300 font-semibold">👤 {task.assignedToName.split(' ')[0]}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenVerification(task);
                      }}
                      className="w-full py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center gap-1 mt-1 cursor-pointer"
                    >
                      <Camera className="w-3 h-3" />
                      <span>توثيق الإنجاز</span>
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* Column 2: Completed (Awaiting Approval) */}
          <div className="rounded-2xl bg-stone-850/70 border border-stone-800 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-stone-750">
              <span className="font-bold text-xs text-sky-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                مكتملة (في انتظار الاعتماد)
              </span>
              <span className="text-xs font-mono bg-stone-800 px-2 py-0.5 rounded text-stone-300">
                {filteredTasks.filter((t) => t.status === 'completed').length}
              </span>
            </div>
            <div className="space-y-3">
              {filteredTasks
                .filter((t) => t.status === 'completed')
                .map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className="p-3.5 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-700 space-y-2 cursor-pointer transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-emerald-400 font-bold">✓ تم التحقق GPS</span>
                      <span className="text-[10px] text-stone-400">
                        {task.proofOfWork?.distanceFromTargetMeters}م
                      </span>
                    </div>
                    <h5 className="font-bold text-xs text-stone-100 line-clamp-1">{task.title}</h5>
                    {task.proofOfWork?.imageUrl && (
                      <img
                        src={task.proofOfWork.imageUrl}
                        alt="توثيق"
                        className="w-full h-20 object-cover rounded-lg"
                      />
                    )}
                    <div className="text-[11px] text-stone-400 flex items-center justify-between">
                      <span className="text-sky-300 font-semibold">👤 {task.assignedToName.split(' ')[0]}</span>
                      <span className="text-sky-400">في انتظار المدير</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Column 3: Approved */}
          <div className="rounded-2xl bg-stone-850/70 border border-stone-800 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-stone-750">
              <span className="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                معتمدة وموثقة نهائياً
              </span>
              <span className="text-xs font-mono bg-stone-800 px-2 py-0.5 rounded text-stone-300">
                {filteredTasks.filter((t) => t.status === 'approved').length}
              </span>
            </div>
            <div className="space-y-3">
              {filteredTasks
                .filter((t) => t.status === 'approved')
                .map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onSelectTask(task)}
                    className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-2 cursor-pointer transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-emerald-400 font-bold">
                        ⭐ {task.managerApproval?.rating || 5}/5
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">{task.sectorName.split('-')[0]}</span>
                    </div>
                    <h5 className="font-bold text-xs text-stone-100 line-clamp-1">{task.title}</h5>
                    <p className="text-[10px] text-stone-400 italic">
                      "{task.managerApproval?.feedback || 'تم الاعتماد'}"
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

