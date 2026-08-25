import React, { useState } from 'react';
import {
  X,
  MapPin,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Star,
  Share2,
  MessageSquare,
  Camera,
  Lock,
  ExternalLink,
  Trash2,
  Edit
} from 'lucide-react';
import { FarmTask, User as UserType } from '../types';
import { generateWhatsAppReportLink } from '../services/storage';

interface TaskDetailsModalProps {
  task: FarmTask;
  currentUser: UserType;
  onClose: () => void;
  onOpenVerification: (task: FarmTask) => void;
  onApproveTask: (taskId: string, rating: number, feedback: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  task,
  currentUser,
  onClose,
  onOpenVerification,
  onApproveTask,
  onDeleteTask
}) => {
  const [rating, setRating] = useState<number>(5);
  const [feedback, setFeedback] = useState<string>('تم الفحص والاعتماد، عمل متقن');
  const [isCopied, setIsCopied] = useState(false);

  const isCompleted = task.status === 'completed' || task.status === 'approved';
  const isManager = currentUser.role === 'manager';

  const handleShareWhatsApp = () => {
    const link = generateWhatsAppReportLink(task, currentUser.phone);
    window.open(link, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleApprove = () => {
    onApproveTask(task.id, rating, feedback);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-700 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 my-auto">
        {/* Modal Header */}
        <div className="bg-stone-850 px-6 py-4 border-b border-stone-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                task.status === 'approved'
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                  : task.status === 'completed'
                  ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30'
                  : 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {task.status === 'approved' ? (
                <ShieldCheck className="w-5 h-5" />
              ) : task.status === 'completed' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 font-mono">
                  {task.id}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    task.status === 'approved'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : task.status === 'completed'
                      ? 'bg-sky-950 text-sky-300 border border-sky-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}
                >
                  {task.status === 'approved'
                    ? 'معتمدة إدارياً'
                    : task.status === 'completed'
                    ? 'مكتملة (في انتظار الاعتماد)'
                    : 'قيد التنفيذ'}
                </span>
              </div>
              <h3 className="font-bold text-stone-100 text-base mt-1 line-clamp-1">
                {task.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 text-stone-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Main Info Card */}
          <div className="rounded-2xl bg-stone-800/60 border border-stone-700 p-4 space-y-3">
            <p className="text-xs text-stone-300 leading-relaxed">
              {task.description || 'لا يوجد وصف تفصيلي إضافي.'}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs border-t border-stone-700 text-stone-400">
              <div>
                <span className="text-stone-500 block text-[11px]">القطاع:</span>
                <span className="text-stone-200 font-semibold">{task.sectorName}</span>
              </div>
              <div>
                <span className="text-stone-500 block text-[11px]">المنفذ:</span>
                <span className="text-stone-200 font-semibold">{task.assignedToName}</span>
              </div>
              <div>
                <span className="text-stone-500 block text-[11px]">التصنيف:</span>
                <span className="text-emerald-400 font-semibold">{task.categoryAr}</span>
              </div>
              <div>
                <span className="text-stone-500 block text-[11px]">التكرار:</span>
                <span className="text-stone-200">
                  {task.isRecurring ? 'متكررة دورياً' : 'مهمة واحدة'}
                </span>
              </div>
            </div>
          </div>

          {/* Proof of Work & Geo-Verification Section (if completed) */}
          {task.proofOfWork ? (
            <div className="rounded-2xl bg-stone-850 border border-stone-700 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  توثيق الإنجاز بالصورة وبصمة الـ GPS
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                  {task.proofOfWork.isLocationVerified ? '✓ تم التحقق الجغرافي' : '⚠️ موقع غير مطابق'}
                </span>
              </div>

              {/* Photo View */}
              <div className="rounded-xl overflow-hidden border border-stone-700 shadow-lg bg-black">
                <img
                  src={task.proofOfWork.imageUrl}
                  alt="توثيق المهمة"
                  className="w-full max-h-72 object-contain"
                />
              </div>

              {/* Metadata Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-stone-800/80 border border-stone-700 space-y-1">
                  <div className="text-stone-400 text-[11px]">إحداثيات الالتقاط:</div>
                  <div className="font-mono text-emerald-400 font-semibold">
                    {task.proofOfWork.gpsCoordinates.lat.toFixed(6)}°N, {task.proofOfWork.gpsCoordinates.lng.toFixed(6)}°E
                  </div>
                  <div className="text-stone-400 text-[11px]">
                    المسافة عن القطاع: {task.proofOfWork.distanceFromTargetMeters} متر
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-stone-800/80 border border-stone-700 space-y-1">
                  <div className="text-stone-400 text-[11px]">توقيت الالتقاط المعتمد:</div>
                  <div className="text-stone-200 font-semibold">
                    {new Date(task.proofOfWork.capturedAt).toLocaleString('ar-EG')}
                  </div>
                  <div className="text-stone-400 text-[11px] truncate">
                    كود الحماية: {task.proofOfWork.antiTamperHash.slice(0, 16)}...
                  </div>
                </div>
              </div>

              {task.proofOfWork.workerNotes && (
                <div className="p-3 rounded-xl bg-stone-800/40 border border-stone-700 text-xs text-stone-300">
                  <span className="text-stone-400 block text-[11px] mb-1">ملاحظات المنفذ:</span>
                  <p>{task.proofOfWork.workerNotes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-800/40 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>المهمة لم توثق بعد، التنبيه الصوتي ينشط تلقائياً</span>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenVerification(task);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>توثيق الآن</span>
              </button>
            </div>
          )}

          {/* Manager Approval View / Form */}
          {task.managerApproval ? (
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  معتمدة بواسطة: {task.managerApproval.approvedByName}
                </span>
                <div className="flex items-center gap-0.5 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < (task.managerApproval?.rating || 5)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-stone-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
              {task.managerApproval.feedback && (
                <p className="text-xs text-stone-300 bg-stone-900/60 p-2.5 rounded-xl">
                  {task.managerApproval.feedback}
                </p>
              )}
            </div>
          ) : isManager && task.status === 'completed' ? (
            <div className="p-4 rounded-2xl bg-stone-850 border border-emerald-800/60 space-y-3">
              <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                اعتماد وتقييم المهمة (صلاحية المدير)
              </h4>

              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-300">تقييم جودة الإنجاز:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="cursor-pointer p-1"
                    >
                      <Star
                        className={`w-5 h-5 transition ${
                          star <= rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-stone-600 hover:text-stone-400'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="ملاحظات الاعتماد وتوجيهات المدير..."
                  className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <button
                onClick={handleApprove}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>اعتماد المهمة رسميّاً وتسجيلها في السجل الأمني</span>
              </button>
            </div>
          ) : null}

          {/* WhatsApp & Export Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-700">
            <div className="flex items-center gap-2">
              <button
                onClick={handleShareWhatsApp}
                className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="إرسال تقرير عبر الواتساب"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>مشاركة تقرير عبر WhatsApp</span>
              </button>
            </div>

            {isManager && (
              <button
                onClick={() => {
                  if (confirm('هل أنت متأكد من حذف هذه المهمة من النظام؟')) {
                    onDeleteTask(task.id);
                    onClose();
                  }
                }}
                className="px-3 py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف المهمة</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
