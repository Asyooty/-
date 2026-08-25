import React, { useState } from 'react';
import {
  X,
  PlusCircle,
  Clock,
  MapPin,
  UserCheck,
  Tag,
  AlertCircle,
  Repeat,
  BellRing,
  ShieldAlert
} from 'lucide-react';
import {
  FarmTask,
  FarmSector,
  User,
  TaskCategory,
  TaskPriority,
  RecurrenceType
} from '../types';

interface TaskFormModalProps {
  sectors: FarmSector[];
  users: User[];
  currentUser: User;
  onClose: () => void;
  onSaveTask: (task: FarmTask) => void;
  initialTask?: FarmTask | null;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  sectors = [],
  users = [],
  currentUser,
  onClose,
  onSaveTask,
  initialTask
}) => {
  const safeUsers = users || [];
  const safeSectors = sectors || [];
  const workers = safeUsers.filter((u) => u && u.role === 'worker');

  const [title, setTitle] = useState(initialTask?.title || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  const [category, setCategory] = useState<TaskCategory>(initialTask?.category || 'pest_control');
  const [priority, setPriority] = useState<TaskPriority>(initialTask?.priority || 'high');
  const [sectorId, setSectorId] = useState(initialTask?.sectorId || safeSectors[0]?.id || '');
  const [assignedToUserId, setAssignedToUserId] = useState(
    initialTask?.assignedToUserId || workers[0]?.id || ''
  );
  const [isRecurring, setIsRecurring] = useState(initialTask?.isRecurring ?? true);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(
    initialTask?.recurrenceType || 'every_3_days'
  );
  const [scheduledDate, setScheduledDate] = useState(
    initialTask?.scheduledDate || new Date().toISOString().split('T')[0]
  );
  const [scheduledTime, setScheduledTime] = useState(initialTask?.scheduledTime || '07:00');
  const [alarmIntervalMinutes, setAlarmIntervalMinutes] = useState(
    initialTask?.alarmIntervalMinutes || 30
  );
  const [isEmergencyOverride, setIsEmergencyOverride] = useState(
    initialTask?.isEmergencyOverride ?? false
  );

  const selectedSector = sectors.find((s) => s.id === sectorId) || sectors[0];
  const selectedWorker = users.find((u) => u.id === assignedToUserId) || workers[0];

  const getCategoryTitleAr = (cat: TaskCategory) => {
    const map: Record<TaskCategory, string> = {
      pest_control: 'مكافحة الآفات وسوسة النخيل',
      irrigation: 'الري والتسميد',
      pollination: 'تلقيح وتكميم النخيل',
      fertilization: 'تسميد عضوي وكيميائي',
      pruning: 'تقليم وتنظيف الجريد',
      harvest: 'حصاد وجمع التمور',
      pump_maintenance: 'صيانة الآبار والطاقة الشمسية',
      general: 'أعمال عامة'
    };
    return map[cat] || 'أعمال زراعية';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedSector || !selectedWorker) return;

    const task: FarmTask = {
      id: initialTask?.id || 'tsk_' + Date.now(),
      title: title.trim(),
      description: description.trim(),
      category,
      categoryAr: getCategoryTitleAr(category),
      priority,
      sectorId: selectedSector.id,
      sectorName: selectedSector.nameAr,
      targetCoordinates: selectedSector.centerCoordinates,
      maxAllowedDistanceMeters: 150,
      assignedToUserId: selectedWorker.id,
      assignedToName: selectedWorker.name,
      assignedRole: selectedWorker.role,
      createdByUserId: currentUser.id,
      createdByName: currentUser.name,
      status: initialTask?.status || 'pending',
      isRecurring,
      recurrenceType: isRecurring ? recurrenceType : 'none',
      scheduledDate,
      scheduledTime,
      deadlineTimestamp: Date.now() + 1000 * 60 * 60 * 4, // 4 hours default
      alarmIntervalMinutes,
      isAlarmActive: true,
      isEmergencyOverride,
      createdAt: initialTask?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSynced: false
    };

    onSaveTask(task);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-700 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 my-auto">
        {/* Header */}
        <div className="bg-stone-850 px-6 py-4 border-b border-stone-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-100 text-base">
                {initialTask ? 'تعديل المهمة الزراعية' : 'إنشاء مهمة زراعية جديدة'}
              </h3>
              <p className="text-xs text-stone-400">
                صلاحية خاصة بمديري مزرعة أطياب الوادي
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-stone-300 mb-1.5">
              عنوان المهمة الزراعية *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: فحص دوري لسوسة النخيل الحمراء بالقطاع (أ)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-stone-300 mb-1.5">
              تفاصيل وتعليمات التنفيذ
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب الإرشادات الدقيقة للعامل الفني والخطوط المستهدفة..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1.5">
                تصنيف العمليات الزراعية
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="pest_control">مكافحة الآفات وسوسة النخيل</option>
                <option value="irrigation">الري والتسميد بالشبكات</option>
                <option value="pollination">تلقيح وتكميم شماريخ النخيل</option>
                <option value="fertilization">تسميد أرضي وورقي</option>
                <option value="pruning">تقليم وتكريب النخيل</option>
                <option value="pump_maintenance">صيانة طلمبات الآبار والطاقة الشمسية</option>
                <option value="harvest">حصاد وفرز التمور والمحاصيل</option>
                <option value="general">أعمال زراعية عامة</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1.5">
                مستوى الأولوية
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="urgent">🔴 عاجل جداً (أولوية قصوى)</option>
                <option value="high">🟠 مرتفع</option>
                <option value="medium">🟡 متوسط</option>
                <option value="low">🟢 عادي</option>
              </select>
            </div>
          </div>

          {/* Target Sector & Assignee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1.5">
                القطاع المستهدف بالمزرعة
              </label>
              <select
                value={sectorId}
                onChange={(e) => setSectorId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nameAr} ({s.areaFeddan} فدان)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1.5">
                العامل الفني المسؤول
              </label>
              <select
                value={assignedToUserId}
                onChange={(e) => setAssignedToUserId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} - ({w.roleTitleAr})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Recurrence & Alarm Settings */}
          <div className="rounded-2xl bg-stone-800/60 border border-stone-700 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                <Repeat className="w-4 h-4 text-emerald-400" />
                جدولة المهمة وتكرارها
              </span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs text-stone-300">مهمة متكررة دورياً</span>
              </label>
            </div>

            {isRecurring && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] text-stone-400 mb-1">دورة التكرار:</label>
                  <select
                    value={recurrenceType}
                    onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
                    className="w-full px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 text-xs"
                  >
                    <option value="daily">يومياً</option>
                    <option value="every_3_days">كل 3 أيام</option>
                    <option value="weekly">أسبوعياً</option>
                    <option value="custom_season">حسب الطور المحصولي (موسمي)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-stone-400 mb-1">فترة تكرار التنبيه الصوتي:</label>
                  <select
                    value={alarmIntervalMinutes}
                    onChange={(e) => setAlarmIntervalMinutes(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 text-xs"
                  >
                    <option value={15}>كل 15 دقيقة</option>
                    <option value={30}>كل 30 دقيقة (الافتراضي)</option>
                    <option value={60}>كل ساعة</option>
                  </select>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-stone-700 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEmergencyOverride}
                  onChange={(e) => setIsEmergencyOverride(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span className="text-xs text-rose-300 font-semibold flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  تجاوز وضع عدم الإزعاج (طوارئ قصوى)
                </span>
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-400 hover:text-white bg-stone-800 transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{initialTask ? 'حفظ التعديلات' : 'إصدار وتكليف المهمة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
