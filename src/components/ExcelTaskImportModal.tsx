import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Calendar,
  Clock,
  User as UserIcon,
  MapPin,
  Trash2,
  Sparkles,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { FarmTask, FarmSector, User, TaskPriority, TaskCategory, RecurrenceType } from '../types';

interface ExcelTaskImportModalProps {
  currentUser: User;
  sectors: FarmSector[];
  users: User[];
  onClose: () => void;
  onImportTasks: (newTasks: FarmTask[]) => void;
}

interface ParsedTaskDraft {
  id: string;
  title: string;
  description: string;
  sectorId: string;
  sectorName: string;
  assignedToUserId: string;
  assignedToName: string;
  assignedRole: 'worker' | 'supervisor' | 'manager';
  priority: TaskPriority;
  category: TaskCategory;
  categoryAr: string;
  scheduledDate: string;
  scheduledTime: string;
  isRecurring: boolean;
  recurrenceType: RecurrenceType;
  alarmIntervalMinutes: number;
  isValid: boolean;
  validationError?: string;
  selected: boolean;
}

export const ExcelTaskImportModal: React.FC<ExcelTaskImportModalProps> = ({
  currentUser,
  sectors,
  users,
  onClose,
  onImportTasks
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedDrafts, setParsedDrafts] = useState<ParsedTaskDraft[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download Sample Template XLSX
  const handleDownloadTemplate = () => {
    const today = new Date().toISOString().split('T')[0];
    const templateData = [
      {
        'عنوان المهمة *': 'فحص وضبط محابس شبكة الرشاشات (قطعة 9)',
        'الوصف التفصيلي': 'مراجعة ضغط المياه على 2.0 بار وتنظيف فلاتر الخط الرئيسي لزراعة البرسيم الحجازي',
        'اسم القطاع': sectors[0]?.nameAr || 'قطعة رقم 9 - برسيم حجازي',
        'اسم العامل المكلف': users.find((u) => u.role === 'worker')?.name || 'علاء شعبان (عامل تشغيل)',
        'التصنيف الزراعي': 'تجهيز التربة وشبكات الري',
        'الأولوية (عاجل/مرتفع/متوسط/عادي)': 'عاجل',
        'تاريخ التنفيذ (YYYY-MM-DD)': today,
        'وقت التنفيذ (HH:MM)': '07:00',
        'تكرار المهمة (بدون/يومي/كل 3 أيام/أسبوعي)': 'كل 3 أيام',
        'مدة جرس الإنذار بالدقائق': 30
      },
      {
        'عنوان المهمة *': 'تجهيز وتخمير جور النخيل الصعيدي (قطعة 10)',
        'الوصف التفصيلي': 'توزيع سماد الكومبوست وسوبر الفوسفات داخل الجور المحفورة بمعدل 25 كجم لكل جورة',
        'اسم القطاع': sectors[1]?.nameAr || 'قطعة رقم 10 - نخيل صعيدي',
        'اسم العامل المكلف': users.filter((u) => u.role === 'worker')[1]?.name || 'احمد طه (عامل تشغيل)',
        'التصنيف الزراعي': 'تجهيز وتخمير الجور',
        'الأولوية (عاجل/مرتفع/متوسط/عادي)': 'مرتفع',
        'تاريخ التنفيذ (YYYY-MM-DD)': today,
        'وقت التنفيذ (HH:MM)': '08:00',
        'تكرار المهمة (بدون/يومي/كل 3 أيام/أسبوعي)': 'يومي',
        'مدة جرس الإنذار بالدقائق': 30
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    // Auto-fit column widths
    worksheet['!cols'] = [
      { wch: 45 },
      { wch: 55 },
      { wch: 35 },
      { wch: 30 },
      { wch: 25 },
      { wch: 20 },
      { wch: 22 },
      { wch: 18 },
      { wch: 25 },
      { wch: 20 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'نموذج_المهام_الزراعية');
    XLSX.writeFile(workbook, `نموذج_إدخال_مهام_مزرعة_أطياب_الوادي_${today}.xlsx`);
  };

  // Helper to map priority text
  const mapPriority = (val: any): TaskPriority => {
    const str = String(val || '').trim().toLowerCase();
    if (str.includes('عاجل') || str.includes('urgent')) return 'urgent';
    if (str.includes('مرتفع') || str.includes('high')) return 'high';
    if (str.includes('متوسط') || str.includes('medium')) return 'medium';
    return 'low';
  };

  // Helper to map category
  const mapCategory = (val: any): { category: TaskCategory; categoryAr: string } => {
    const str = String(val || '').trim().toLowerCase();
    if (str.includes('ري') || str.includes('شبك') || str.includes('رش') || str.includes('تنقيط') || str.includes('irrigation')) {
      return { category: 'irrigation', categoryAr: 'تجهيز التربة وشبكات الري' };
    }
    if (str.includes('سماد') || str.includes('تسميد') || str.includes('جور') || str.includes('fertilization')) {
      return { category: 'fertilization', categoryAr: 'تجهيز وتخمير الجور والتسميد' };
    }
    if (str.includes('مكافح') || str.includes('رش') || str.includes('وقاي') || str.includes('pest')) {
      return { category: 'pest_control', categoryAr: 'مكافحة الآفات والوقاية' };
    }
    if (str.includes('حصاد') || str.includes('تعبئ') || str.includes('harvest')) {
      return { category: 'harvest', categoryAr: 'الحصاد والجني' };
    }
    if (str.includes('طلمب') || str.includes('بئر') || str.includes('صيان') || str.includes('pump')) {
      return { category: 'pump_maintenance', categoryAr: 'صيانة الآبار والمضخات' };
    }
    if (str.includes('تلقيح') || str.includes('تأبير') || str.includes('pollination')) {
      return { category: 'pollination', categoryAr: 'تلقيح وتأبير النخيل' };
    }
    if (str.includes('تقليم') || str.includes('تكريب') || str.includes('pruning')) {
      return { category: 'pruning', categoryAr: 'تقليم وتكريب النخيل' };
    }
    return { category: 'general', categoryAr: val ? String(val).trim() : 'عمليات زراعية عامة' };
  };

  // Helper to map recurrence
  const mapRecurrence = (val: any): { isRecurring: boolean; recurrenceType: RecurrenceType } => {
    const str = String(val || '').trim().toLowerCase();
    if (str.includes('يومي') || str.includes('daily')) {
      return { isRecurring: true, recurrenceType: 'daily' };
    }
    if (str.includes('3') || str.includes('ثلاث') || str.includes('3_days')) {
      return { isRecurring: true, recurrenceType: 'every_3_days' };
    }
    if (str.includes('أسبوع') || str.includes('اسبوع') || str.includes('weekly')) {
      return { isRecurring: true, recurrenceType: 'weekly' };
    }
    return { isRecurring: false, recurrenceType: 'none' };
  };

  const processFile = async (file: File) => {
    setErrorMsg(null);
    setIsProcessing(true);
    setFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!jsonRows || jsonRows.length === 0) {
        setErrorMsg('الملف فارغ أو لا يحتوي على أي صفوف بيانات صالحة.');
        setIsProcessing(false);
        return;
      }

      const drafts: ParsedTaskDraft[] = [];
      const defaultSector = sectors[0];
      const defaultWorker = users.find((u) => u.role === 'worker') || users[0];
      const today = new Date().toISOString().split('T')[0];

      jsonRows.forEach((row, index) => {
        // Extract title
        const title = (
          row['عنوان المهمة *'] ||
          row['عنوان المهمة'] ||
          row['المهمة'] ||
          row['Title'] ||
          row['Task'] ||
          row['title'] ||
          ''
        ).toString().trim();

        if (!title) {
          return; // skip empty rows
        }

        const description = (
          row['الوصف التفصيلي'] ||
          row['الوصف'] ||
          row['Description'] ||
          row['description'] ||
          ''
        ).toString().trim();

        // Match Sector
        const sectorInput = (
          row['اسم القطاع'] ||
          row['القطاع'] ||
          row['Sector'] ||
          row['sector'] ||
          ''
        ).toString().trim();

        let matchedSector = sectors.find(
          (s) =>
            s.id === sectorInput ||
            s.nameAr.toLowerCase().includes(sectorInput.toLowerCase()) ||
            (sectorInput.includes('9') && s.id.includes('9')) ||
            (sectorInput.includes('10') && s.id.includes('10')) ||
            (sectorInput.includes('برسيم') && s.id.includes('9')) ||
            (sectorInput.includes('نخيل') && s.id.includes('10'))
        ) || defaultSector;

        // Match Worker
        const workerInput = (
          row['اسم العامل المكلف'] ||
          row['العامل'] ||
          row['المكلف'] ||
          row['Worker'] ||
          row['Assignee'] ||
          row['worker'] ||
          ''
        ).toString().trim();

        let matchedWorker = users.find(
          (u) =>
            u.id === workerInput ||
            u.name.toLowerCase().includes(workerInput.toLowerCase()) ||
            u.username.toLowerCase() === workerInput.toLowerCase()
        ) || defaultWorker;

        // Priority
        const priorityInput = row['الأولوية (عاجل/مرتفع/متوسط/عادي)'] || row['الأولوية'] || row['Priority'];
        const priority = mapPriority(priorityInput);

        // Category
        const categoryInput = row['التصنيف الزراعي'] || row['التصنيف'] || row['Category'];
        const { category, categoryAr } = mapCategory(categoryInput);

        // Date
        let dateInput = (
          row['تاريخ التنفيذ (YYYY-MM-DD)'] ||
          row['تاريخ التنفيذ'] ||
          row['التاريخ'] ||
          row['Date'] ||
          today
        ).toString().trim();

        // If date formatted like DD/MM/YYYY or DD-MM-YYYY
        if (dateInput.includes('/')) {
          const parts = dateInput.split('/');
          if (parts.length === 3 && parts[2].length === 4) {
            dateInput = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }

        // Time
        let timeInput = (
          row['وقت التنفيذ (HH:MM)'] ||
          row['وقت التنفيذ'] ||
          row['الوقت'] ||
          row['Time'] ||
          '07:00'
        ).toString().trim();

        // Recurrence
        const recurrenceInput = row['تكرار المهمة (بدون/يومي/كل 3 أيام/أسبوعي)'] || row['تكرار المهمة'] || row['Recurrence'];
        const { isRecurring, recurrenceType } = mapRecurrence(recurrenceInput);

        // Alarm interval
        const alarmInterval = parseInt(row['مدة جرس الإنذار بالدقائق'] || row['جرس الإنذار'] || '30', 10) || 30;

        drafts.push({
          id: `draft_${Date.now()}_${index}`,
          title,
          description,
          sectorId: matchedSector ? matchedSector.id : (defaultSector?.id || 'sec_plot_9'),
          sectorName: matchedSector ? matchedSector.nameAr : (defaultSector?.nameAr || 'قطاع زراعي'),
          assignedToUserId: matchedWorker ? matchedWorker.id : (defaultWorker?.id || 'usr_worker'),
          assignedToName: matchedWorker ? matchedWorker.name : (defaultWorker?.name || 'عامل تشغيل'),
          assignedRole: (matchedWorker?.role || 'worker') as any,
          priority,
          category,
          categoryAr,
          scheduledDate: dateInput || today,
          scheduledTime: timeInput || '07:00',
          isRecurring,
          recurrenceType,
          alarmIntervalMinutes: alarmInterval,
          isValid: Boolean(title && matchedSector),
          selected: true
        });
      });

      if (drafts.length === 0) {
        setErrorMsg('لم يتم العثور على عناوين مهام صحيحة في الملف. يرجى استخدام النموذج المعتمد.');
      } else {
        setParsedDrafts(drafts);
      }
    } catch (err: any) {
      console.error('Failed to parse Excel file:', err);
      setErrorMsg(`حدث خطأ أثناء قراءة الملف: ${err.message || 'تنسيق غير مدعوم'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleToggleSelectDraft = (draftId: string) => {
    setParsedDrafts((prev) =>
      prev.map((d) => (d.id === draftId ? { ...d, selected: !d.selected } : d))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setParsedDrafts((prev) => prev.map((d) => ({ ...d, selected: select })));
  };

  const handleRemoveDraft = (draftId: string) => {
    setParsedDrafts((prev) => prev.filter((d) => d.id !== draftId));
  };

  const handleFinalImport = () => {
    const selectedDrafts = parsedDrafts.filter((d) => d.selected && d.isValid);
    if (selectedDrafts.length === 0) {
      setErrorMsg('يرجى تحديد مهمة واحدة على الأقل للاستيراد.');
      return;
    }

    const createdTasks: FarmTask[] = selectedDrafts.map((d, i) => {
      const sector = sectors.find((s) => s.id === d.sectorId) || sectors[0];
      const targetCoords = sector ? sector.centerCoordinates : { lat: 25.4420, lng: 30.5515 };

      return {
        id: `tsk_xl_${Date.now()}_${i}`,
        title: d.title,
        description: d.description,
        category: d.category,
        categoryAr: d.categoryAr,
        priority: d.priority,
        sectorId: d.sectorId,
        sectorName: d.sectorName,
        targetCoordinates: targetCoords,
        maxAllowedDistanceMeters: 150,
        assignedToUserId: d.assignedToUserId,
        assignedToName: d.assignedToName,
        assignedRole: d.assignedRole,
        createdByUserId: currentUser.id,
        createdByName: currentUser.name,
        status: 'pending',
        isRecurring: d.isRecurring,
        recurrenceType: d.recurrenceType,
        scheduledDate: d.scheduledDate,
        scheduledTime: d.scheduledTime,
        deadlineTimestamp: Date.now() + 1000 * 60 * 60 * 6,
        alarmIntervalMinutes: d.alarmIntervalMinutes,
        isAlarmActive: true,
        isEmergencyOverride: d.priority === 'urgent',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSynced: true
      };
    });

    onImportTasks(createdTasks);
  };

  const selectedCount = parsedDrafts.filter((d) => d.selected && d.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div
        className="relative w-full max-w-4xl bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-950/60 via-stone-900 to-stone-900 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-100 flex items-center gap-2">
                <span>استيراد المهام من ملف إكسل (Excel / CSV)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
                  مقتصر على المديرين
                </span>
              </h3>
              <p className="text-xs text-stone-400">
                إضافة مجمعة للمهام وتعيين العمال والقطاعات وجدولتها آلياً
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Quick Info & Template Download Banner */}
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-emerald-300">
                  هل تحتاج إلى نموذج جاهز لتعبئة المهام؟
                </div>
                <div className="text-[11px] text-stone-400">
                  حمّل ملف الإكسل المنظم لقطاعات المزرعة والعمال، واملأ المهام ثم ارفعه هنا بضغطة زر.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>تحميل نموذج إكسل (.xlsx)</span>
            </button>
          </div>

          {/* Drag & Drop Upload Box */}
          {parsedDrafts.length === 0 && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 sm:p-10 rounded-3xl border-2 border-dashed text-center transition cursor-pointer space-y-3 ${
                dragActive
                  ? 'border-emerald-400 bg-emerald-950/30'
                  : 'border-stone-750 hover:border-emerald-600 bg-stone-950/40 hover:bg-stone-950/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div className="w-14 h-14 rounded-3xl bg-stone-850 border border-stone-750 mx-auto flex items-center justify-center text-emerald-400 shadow-inner">
                {isProcessing ? (
                  <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-7 h-7" />
                )}
              </div>

              <div>
                <p className="text-sm font-bold text-stone-200">
                  {isProcessing
                    ? 'جارٍ قراءة وتحليل ملف الإكسل...'
                    : 'اسحب وأفلت ملف الإكسل هنا، أو اضغط للاختيار من جهازك'}
                </p>
                <p className="text-xs text-stone-400 mt-1">
                  يدعم صيغ Excel (.xlsx, .xls) والملفات المجدولة (.csv)
                </p>
              </div>

              <div className="inline-flex items-center gap-2 text-[11px] text-stone-400 bg-stone-900 px-3 py-1.5 rounded-full border border-stone-800">
                <Info className="w-3.5 h-3.5 text-emerald-400" />
                <span>يتعرف النظام تلقائياً على أسماء القطاعات والعمال والأولويات</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Parsed Drafts Preview & Selection Table */}
          {parsedDrafts.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-stone-200">
                    تم استخراج {parsedDrafts.length} مهمة من الملف ({fileName}):
                  </span>
                  <span className="text-xs font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800">
                    محدد للاستيراد: {selectedCount}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleSelectAll(true)}
                    className="text-stone-300 hover:text-emerald-400 underline transition cursor-pointer"
                  >
                    تحديد الكل
                  </button>
                  <span className="text-stone-600">•</span>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(false)}
                    className="text-stone-300 hover:text-rose-400 underline transition cursor-pointer"
                  >
                    إلغاء التحديد
                  </button>
                  <span className="text-stone-600">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setParsedDrafts([]);
                      setFileName(null);
                    }}
                    className="text-amber-400 hover:text-amber-300 underline transition cursor-pointer"
                  >
                    رفع ملف آخر
                  </button>
                </div>
              </div>

              {/* Tasks Preview List */}
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {parsedDrafts.map((draft) => (
                  <div
                    key={draft.id}
                    className={`p-3.5 rounded-2xl border transition flex items-start justify-between gap-3 ${
                      draft.selected
                        ? 'bg-stone-850 border-emerald-800/80 shadow-md'
                        : 'bg-stone-900/60 border-stone-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={draft.selected}
                        onChange={() => handleToggleSelectDraft(draft.id)}
                        className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-stone-900 border-stone-700 cursor-pointer"
                      />
                      <div className="space-y-1">
                        <div className="font-bold text-xs text-stone-100 flex items-center gap-2">
                          <span>{draft.title}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              draft.priority === 'urgent'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : draft.priority === 'high'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-stone-800 text-stone-300'
                            }`}
                          >
                            {draft.priority === 'urgent'
                              ? '🔴 عاجل'
                              : draft.priority === 'high'
                              ? '🟠 مرتفع'
                              : '🟢 عادي'}
                          </span>
                        </div>

                        {draft.description && (
                          <p className="text-[11px] text-stone-400 line-clamp-1">{draft.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-stone-400 pt-1">
                          <span className="flex items-center gap-1 bg-stone-900 px-2 py-0.5 rounded border border-stone-800 text-stone-300">
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            {draft.sectorName}
                          </span>
                          <span className="flex items-center gap-1 bg-stone-900 px-2 py-0.5 rounded border border-stone-800 text-stone-300">
                            <UserIcon className="w-3 h-3 text-sky-400" />
                            {draft.assignedToName}
                          </span>
                          <span className="flex items-center gap-1 bg-stone-900 px-2 py-0.5 rounded border border-stone-800 text-amber-300">
                            <Calendar className="w-3 h-3 text-amber-400" />
                            {draft.scheduledDate} ({draft.scheduledTime})
                          </span>
                          {draft.isRecurring && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                              🔄 متكررة ({draft.recurrenceType})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveDraft(draft.id)}
                      className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-stone-800 rounded-lg transition cursor-pointer"
                      title="حذف هذا الصف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleFinalImport}
            disabled={selectedCount === 0}
            className={`px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
              selectedCount > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50'
                : 'bg-stone-800 text-stone-500 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>تأكيد استيراد {selectedCount} مهمة إلى المنظومة</span>
          </button>
        </div>
      </div>
    </div>
  );
};
