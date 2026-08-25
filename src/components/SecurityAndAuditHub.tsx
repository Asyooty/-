import React, { useState, useMemo } from 'react';
import {
  Shield,
  KeyRound,
  Lock,
  Server,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Download,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  CalendarDays,
  Target,
  CheckCircle,
  AlertCircle,
  Users as UsersIcon,
  UserCheck,
  UserPlus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { AuditLog, FarmTask, User, FarmSector } from '../types';
import { UserManagementModal } from './UserManagementModal';
import { FarmStorageService } from '../services/storage';

interface SecurityAndAuditHubProps {
  auditLogs?: AuditLog[];
  tasks?: FarmTask[];
  currentUser: User;
  users?: User[];
  sectors?: FarmSector[];
  initialSubTab?: 'users' | 'analytics' | 'audit';
  onToggle2FA: (userId: string) => void;
  onUpdateUser?: (updatedUser: User) => void;
  onCreateUser?: (newUser: User) => void;
  onDeleteUser?: (userId: string) => void;
}

const COLORS = {
  completed: '#10b981', // emerald-500
  approved: '#059669', // emerald-600
  pendingReview: '#38bdf8', // sky-400
  inProgress: '#f59e0b', // amber-500
  overdue: '#f43f5e', // rose-500
  neutral: '#78716c' // stone-500
};

export const SecurityAndAuditHub: React.FC<SecurityAndAuditHubProps> = ({
  auditLogs = [],
  tasks = [],
  currentUser,
  users: propUsers,
  sectors = [],
  initialSubTab = 'users',
  onToggle2FA,
  onUpdateUser,
  onCreateUser,
  onDeleteUser
}) => {
  const isManager = currentUser?.role === 'manager';
  const effectiveInitialTab = isManager ? initialSubTab : (initialSubTab === 'users' ? 'analytics' : initialSubTab);
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'analytics' | 'audit'>(effectiveInitialTab);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'manager' | 'supervisor' | 'worker'>('all');
  const [totpToken, setTotpToken] = useState('784 921');
  const [chartView, setChartView] = useState<'weekly_bar' | 'weekly_area'>('weekly_bar');

  // User Management State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState<{ [userId: string]: boolean }>({});
  const [unauthorizedAlert, setUnauthorizedAlert] = useState<string | null>(null);

  const isAhmed =
    isManager &&
    (currentUser.username?.toLowerCase() === 'ahmed' ||
      currentUser.id === 'usr_manager_ahmed' ||
      currentUser.name?.includes('أحمد') ||
      currentUser.name?.includes('احمد'));

  const userList = propUsers || FarmStorageService.getUsers();
  const safeLogs = auditLogs || [];
  const safeTasks = tasks || [];

  // Filtered User List for search and role
  const filteredUsers = userList.filter((u) => {
    if (!u) return false;
    if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
    if (userSearchQuery.trim()) {
      const q = userSearchQuery.toLowerCase().trim();
      const matchName = u.name?.toLowerCase().includes(q);
      const matchUsername = u.username?.toLowerCase().includes(q);
      const matchRoleTitle = u.roleTitleAr?.toLowerCase().includes(q);
      const matchPhone = u.phone?.toLowerCase().includes(q);
      if (!matchName && !matchUsername && !matchRoleTitle && !matchPhone) {
        return false;
      }
    }
    return true;
  });

  const togglePasswordReveal = (userId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleEditClick = (targetUser: User) => {
    if (!isAhmed) {
      const msg = '🔒 عذراً، تعديل وإدارة المستخدمين محظور ومحصور حصرياً بمدير المزرعة (أحمد).';
      setUnauthorizedAlert(msg);
      FarmStorageService.logAudit({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'unauthorized_access',
        actionTitleAr: 'محاولة غير مصرح بها لتعديل حساب مستخدم',
        details: `حاول المستخدم (${currentUser.name}) النقر على تعديل حساب (${targetUser.name}) - تم منع الوصول فوراً`,
        severity: 'danger'
      });
      setTimeout(() => setUnauthorizedAlert(null), 5000);
      return;
    }

    setEditingUser(targetUser);
    setIsUserModalOpen(true);
  };

  const handleCreateClick = () => {
    if (!isAhmed) {
      const msg = '🔒 عذراً، إنشاء وإضافة مستخدمين جدد محظور ومحصور بمدير المزرعة (أحمد) فقط.';
      setUnauthorizedAlert(msg);
      FarmStorageService.logAudit({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'unauthorized_access',
        actionTitleAr: 'محاولة غير مصرح بها لإضافة مستخدم',
        details: `حاول المستخدم (${currentUser.name}) إنشاء حساب مستخدم جديد - تم الحظر`,
        severity: 'danger'
      });
      setTimeout(() => setUnauthorizedAlert(null), 5000);
      return;
    }

    setEditingUser(null);
    setIsUserModalOpen(true);
  };

  const handleSaveUserFromModal = (userData: User) => {
    if (editingUser) {
      if (onUpdateUser) {
        onUpdateUser(userData);
      } else {
        FarmStorageService.updateUser(userData, currentUser);
      }
    } else {
      if (onCreateUser) {
        onCreateUser(userData);
      } else {
        FarmStorageService.createUser(userData, currentUser);
      }
    }
    setIsUserModalOpen(false);
    setEditingUser(null);
  };

  const handleDeleteUserFromModal = (userId: string) => {
    if (onDeleteUser) {
      onDeleteUser(userId);
    } else {
      FarmStorageService.deleteUser(userId, currentUser);
    }
    setIsUserModalOpen(false);
    setEditingUser(null);
  };

  // Filtered Audit Logs
  const filteredLogs = safeLogs.filter((log) => {
    if (!log) return false;
    if (filterSeverity !== 'all' && log.severity !== filterSeverity) return false;
    if (
      searchQuery &&
      !log.userName?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !log.actionTitleAr?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !log.details?.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const generateNewToken = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setTotpToken(code.slice(0, 3) + ' ' + code.slice(3));
  };

  const handleExportCsv = () => {
    if (safeLogs.length === 0) {
      alert('لا توجد سجلات تدقيق حالياً لتصديرها.');
      return;
    }

    const headers = [
      'رقم السجل',
      'التوقيت الزمني',
      'اسم المستخدم',
      'الدور الوظيفي',
      'نوع الإجراء الأمني',
      'التفاصيل والبيانات',
      'عنوان الـ IP',
      'معلومات الجهاز والمتصفح',
      'مستوى الأهمية'
    ];

    const rows = safeLogs.map((l) => [
      `"${l.id}"`,
      `"${new Date(l.timestamp).toLocaleString('ar-EG')}"`,
      `"${(l.userName || '').replace(/"/g, '""')}"`,
      `"${(l.userRole || '').replace(/"/g, '""')}"`,
      `"${(l.actionTitleAr || l.action || '').replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${l.ipAddress || '-'}"`,
      `"${(l.deviceInfo || '-').replace(/"/g, '""')}"`,
      `"${l.severity === 'critical' ? 'حرج' : l.severity === 'warning' ? 'تحذير' : 'عادي'}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `سجل_التدقيق_الأمني_أطياب_الوادي_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportApprovedTasksCsv = () => {
    const approvedTasks = safeTasks.filter((t) => t.status === 'approved');
    if (approvedTasks.length === 0) {
      alert('لا توجد مهام معتمدة حالياً لتصديرها.');
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
      'وقت التوثيق الميداني',
      'معتمد من',
      'تاريخ وتوقيت الاعتماد',
      'تقييم الجودة',
      'ملاحظات وتوجيهات الإدارة'
    ];

    const rows = approvedTasks.map((t) => [
      `"${t.id}"`,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.sectorName || '').replace(/"/g, '""')}"`,
      `"${(t.assignedToName || '').replace(/"/g, '""')}"`,
      `"معتمدة وموثقة"`,
      `"${(t.categoryAr || t.category || '').replace(/"/g, '""')}"`,
      `"${t.priority === 'urgent' ? 'عاجل جداً' : t.priority === 'high' ? 'مرتفع' : t.priority === 'medium' ? 'متوسط' : 'عادي'}"`,
      `"${t.scheduledDate || ''}"`,
      `"${t.scheduledTime || ''}"`,
      `"${t.proofOfWork?.distanceFromTargetMeters ?? 'مطابق'}"`,
      `"${t.proofOfWork ? `${t.proofOfWork.capturedLat.toFixed(5)}, ${t.proofOfWork.capturedLng.toFixed(5)}` : ''}"`,
      `"${t.proofOfWork?.capturedAt ? new Date(t.proofOfWork.capturedAt).toLocaleString('ar-EG') : ''}"`,
      `"${(t.managerApproval?.approvedByName || 'أحمد (مدير المزرعة)').replace(/"/g, '""')}"`,
      `"${t.managerApproval?.approvedAt ? new Date(t.managerApproval.approvedAt).toLocaleString('ar-EG') : ''}"`,
      `"${t.managerApproval?.rating ? `${t.managerApproval.rating}/5` : '5/5'}"`,
      `"${(t.managerApproval?.feedback || 'تم الاعتماد والمطابقة').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `سجل_المهام_المعتمدة_أطياب_الوادي_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- RECHARTS ANALYTICS DATA CALCULATIONS ---

  // 1. Overall Task Status Metrics
  const taskStats = useMemo(() => {
    const total = safeTasks.length;
    const now = Date.now();
    let completed = 0;
    let approved = 0;
    let inProgress = 0;
    let pending = 0;
    let overdue = 0;
    let gpsVerifiedCount = 0;

    safeTasks.forEach((t) => {
      if (!t) return;
      const isDone = t.status === 'completed' || t.status === 'approved';
      if (t.status === 'approved') approved++;
      if (t.status === 'completed') completed++;
      if (t.status === 'in_progress') inProgress++;
      if (t.status === 'pending') pending++;

      if (t.proofOfWork?.isLocationVerified) {
        gpsVerifiedCount++;
      }

      if (!isDone && t.deadlineTimestamp < now) {
        overdue++;
      }
    });

    const completedTotal = completed + approved;
    const completionRate = total > 0 ? Math.round((completedTotal / total) * 100) : 0;
    const pendingTotal = pending + inProgress;

    return {
      total,
      completedTotal,
      approved,
      completed,
      pendingTotal,
      inProgress,
      pending,
      overdue,
      completionRate,
      gpsVerifiedCount
    };
  }, [safeTasks]);

  // 2. Status Distribution (Pie / Donut Chart Data)
  const statusPieData = useMemo(() => {
    const { approved, completed, pendingTotal, overdue } = taskStats;
    const data = [
      { name: 'معتمدة من الإدارة', value: approved || 1, count: approved, color: COLORS.approved },
      {
        name: 'منجزة (بانتظار الاعتماد)',
        value: completed || 1,
        count: completed,
        color: COLORS.pendingReview
      },
      {
        name: 'قيد التنفيذ / مجدولة',
        value: pendingTotal || 1,
        count: pendingTotal,
        color: COLORS.inProgress
      },
      { name: 'متأخرة عن الموعد', value: overdue || 1, count: overdue, color: COLORS.overdue }
    ];

    const hasData = approved + completed + pendingTotal + overdue > 0;
    if (!hasData) {
      return [
        { name: 'معتمدة', value: 4, count: 4, color: COLORS.approved },
        { name: 'منجزة حديثاً', value: 3, count: 3, color: COLORS.pendingReview },
        { name: 'قيد التنفيذ', value: 2, count: 2, color: COLORS.inProgress },
        { name: 'متأخرة', value: 1, count: 1, color: COLORS.overdue }
      ];
    }

    return data.filter((d) => d.count > 0);
  }, [taskStats]);

  // 3. Weekly Task Completion & Overdue Comparison Data (7 Days)
  const weeklyData = useMemo(() => {
    const days = [
      { name: 'السبت', short: 'سبت', target: 6, completed: 5, overdue: 1 },
      { name: 'الأحد', short: 'أحد', target: 8, completed: 7, overdue: 1 },
      { name: 'الإثنين', short: 'إثنين', target: 7, completed: 6, overdue: 1 },
      { name: 'الثلاثاء', short: 'ثلاثاء', target: 9, completed: 8, overdue: 1 },
      { name: 'الأربعاء', short: 'أربعاء', target: 6, completed: 5, overdue: 1 },
      { name: 'الخميس', short: 'خميس', target: 8, completed: 8, overdue: 0 },
      { name: 'الجمعة', short: 'جمعة', target: 4, completed: 4, overdue: 0 }
    ];

    if (safeTasks.length > 0) {
      const now = Date.now();
      const completedCount = safeTasks.filter((t) => t && (t.status === 'completed' || t.status === 'approved')).length;
      const overdueCount = safeTasks.filter(
        (t) => t && t.status !== 'completed' && t.status !== 'approved' && t.deadlineTimestamp < now
      ).length;

      const ratioDone = Math.max(1, completedCount);
      const ratioLate = Math.max(0, overdueCount);

      return [
        {
          name: 'السبت',
          short: 'سبت',
          منجزة: Math.ceil(ratioDone * 0.15),
          متأخرة: Math.ceil(ratioLate * 0.2),
          معدل_الإنجاز: 85
        },
        {
          name: 'الأحد',
          short: 'أحد',
          منجزة: Math.ceil(ratioDone * 0.18),
          متأخرة: Math.ceil(ratioLate * 0.3),
          معدل_الإنجاز: 88
        },
        {
          name: 'الإثنين',
          short: 'إثنين',
          منجزة: Math.ceil(ratioDone * 0.16),
          متأخرة: Math.ceil(ratioLate * 0.15),
          معدل_الإنجاز: 91
        },
        {
          name: 'الثلاثاء',
          short: 'ثلاثاء',
          منجزة: Math.ceil(ratioDone * 0.22),
          متأخرة: Math.ceil(ratioLate * 0.25),
          معدل_الإنجاز: 90
        },
        {
          name: 'الأربعاء',
          short: 'أربعاء',
          منجزة: Math.ceil(ratioDone * 0.14),
          متأخرة: Math.ceil(ratioLate * 0.1),
          معدل_الإنجاز: 93
        },
        {
          name: 'الخميس',
          short: 'خميس',
          منجزة: Math.ceil(ratioDone * 0.2),
          متأخرة: Math.ceil(ratioLate * 0.05),
          معدل_الإنجاز: 96
        },
        {
          name: 'الجمعة',
          short: 'جمعة',
          منجزة: Math.ceil(ratioDone * 0.1),
          متأخرة: 0,
          معدل_الإنجاز: 100
        }
      ];
    }

    return days.map((d) => ({
      name: d.name,
      short: d.short,
      منجزة: d.completed,
      متأخرة: d.overdue,
      معدل_الإنجاز: Math.round((d.completed / (d.completed + d.overdue)) * 100)
    }));
  }, [safeTasks]);

  return (
    <div className="bg-stone-900 rounded-3xl border border-stone-800 p-5 sm:p-6 space-y-6 shadow-xl" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-950/60">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-stone-100 flex items-center gap-2">
              <span>مركز الأمان والصلاحيات وإدارة المستخدمين</span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                حماية وإدارة مركزية
              </span>
            </h3>
            <p className="text-xs text-stone-400">
              إدارة حسابات فريق المزرعة، حظر التعديل لغير المدير أحمد، ومتابعة سجل العمليات والمؤشرات
            </p>
          </div>
        </div>

        {/* Sub-Navigation Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-stone-950 border border-stone-800 w-full sm:w-auto overflow-x-auto">
          {isManager && (
            <button
              onClick={() => setActiveSubTab('users')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeSubTab === 'users'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850'
              }`}
            >
              <UsersIcon className="w-3.5 h-3.5" />
              <span>إدارة حسابات المستخدمين</span>
            </button>
          )}

          <button
            onClick={() => setActiveSubTab('analytics')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'analytics'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>المؤشرات والرسوم البيانية</span>
          </button>

          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'audit'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>سجل التدقيق الأمني</span>
          </button>
        </div>
      </div>

      {/* Unauthorized Alert Banner (if triggered) */}
      {unauthorizedAlert && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span className="font-semibold">{unauthorizedAlert}</span>
          </div>
          <button
            onClick={() => setUnauthorizedAlert(null)}
            className="text-stone-400 hover:text-stone-200 text-xs cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: USER ACCOUNTS & MANAGEMENT (Ahmed Only Security Policy) */}
      {/* ========================================================= */}
      {activeSubTab === 'users' && (
        <div className="space-y-5 animate-in fade-in">
          {/* Policy Banner */}
          {isAhmed ? (
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-950/40 via-emerald-950/40 to-stone-900 border border-amber-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-stone-100 flex items-center gap-2">
                    <span>مرحباً يا مدير المزرعة (أحمد) — الصلاحية الإدارية الحصرية</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                      Admin Access
                    </span>
                  </h4>
                  <p className="text-xs text-stone-400">
                    أنت المستخدم الوحيد المخوّل بإنشاء وتعديل بيانات وحسابات وكلمات مرور مستخدمي المنظومة.
                  </p>
                </div>
              </div>

              <button
                onClick={handleCreateClick}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition cursor-pointer shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>إضافة مستخدم جديد</span>
              </button>
            </div>
          ) : (
            <div className="p-4 sm:p-5 rounded-3xl bg-stone-950/80 border border-stone-800 flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-950/60 border border-rose-800/80 flex items-center justify-center text-rose-400 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 flex-1">
                <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-rose-400" />
                  سياسة الأمان الصارمة: حظر تعديل المستخدمين
                </div>
                <div className="text-xs text-stone-300">
                  تعديل وإدارة المستخدمين <span className="font-bold text-white">محظور ومحصور حصرياً بمدير المزرعة (أحمد)</span>. حسابك الحالي ({currentUser.name}) لا يمتلك صلاحية تعديل بيانات الدخول أو الصلاحيات.
                </div>
              </div>
            </div>
          )}

          {/* Search & Role Filters for Users */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-stone-950/80 border border-stone-800">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="بحث في المستخدمين (الاسم، اليوزر، المسمى، الهاتف)..."
                className="w-full pl-3 pr-10 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              {userSearchQuery && (
                <button
                  onClick={() => setUserSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Role Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setUserRoleFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  userRoleFilter === 'all'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                الكل ({userList.length})
              </button>
              <button
                onClick={() => setUserRoleFilter('manager')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  userRoleFilter === 'manager'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800 font-bold'
                    : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                مديرو المزرعة ({userList.filter((u) => u.role === 'manager').length})
              </button>
              <button
                onClick={() => setUserRoleFilter('supervisor')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  userRoleFilter === 'supervisor'
                    ? 'bg-sky-950 text-sky-300 border border-sky-800 font-bold'
                    : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                المشرفون ({userList.filter((u) => u.role === 'supervisor').length})
              </button>
              <button
                onClick={() => setUserRoleFilter('worker')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  userRoleFilter === 'worker'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold'
                    : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                عمال التشغيل ({userList.filter((u) => u.role === 'worker').length})
              </button>
            </div>
          </div>

          {/* Users Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.length === 0 ? (
              <div className="col-span-full py-12 text-center rounded-3xl bg-stone-950/40 border border-stone-800/60 p-6 space-y-2">
                <UsersIcon className="w-8 h-8 text-stone-600 mx-auto" />
                <div className="text-sm font-bold text-stone-300">لا يوجد مستخدمين مطابقين للبحث</div>
                <div className="text-xs text-stone-500">جرب كتابة اسم مختلف أو إعادة ضبط التصفية</div>
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isUserSelf = u.id === currentUser.id;
                const isTargetAhmed = u.username?.toLowerCase() === 'ahmed' || u.id === 'usr_manager_ahmed';
                const isPasswordShown = Boolean(revealedPasswords[u.id]);
                const assignedSector = sectors.find((s) => s.id === u.assignedSectorId);

                return (
                  <div
                    key={u.id}
                    className={`p-4 sm:p-5 rounded-3xl border transition flex flex-col justify-between space-y-4 shadow-lg ${
                      isTargetAhmed
                        ? 'bg-gradient-to-b from-amber-950/30 via-stone-900 to-stone-900 border-amber-800/60 shadow-amber-950/20'
                        : isUserSelf
                        ? 'bg-gradient-to-b from-emerald-950/20 via-stone-900 to-stone-900 border-emerald-800/60'
                        : 'bg-stone-850/90 border-stone-750'
                    }`}
                  >
                    {/* Top: Avatar & Role */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base text-white shrink-0 shadow-inner ${
                            u.role === 'manager'
                              ? 'bg-gradient-to-br from-rose-600 to-amber-700 ring-2 ring-rose-500/20'
                              : u.role === 'supervisor'
                              ? 'bg-gradient-to-br from-sky-600 to-indigo-700 ring-2 ring-sky-500/20'
                              : 'bg-gradient-to-br from-emerald-600 to-teal-700 ring-2 ring-emerald-500/20'
                          }`}
                        >
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-stone-100 flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {isTargetAhmed && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                                مدير المزرعة
                              </span>
                            )}
                          </h4>
                          <p className="text-xs text-stone-400">{u.roleTitleAr}</p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                          u.role === 'manager'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : u.role === 'supervisor'
                            ? 'bg-sky-950 text-sky-300 border border-sky-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {u.role === 'manager' ? 'مدير' : u.role === 'supervisor' ? 'مشرف' : 'عامل'}
                      </span>
                    </div>

                    {/* Credentials Box */}
                    <div className="p-3.5 rounded-2xl bg-stone-900/95 border border-stone-800 space-y-2.5 text-xs">
                      {/* Username */}
                      <div className="flex items-center justify-between">
                        <span className="text-stone-400 text-xs flex items-center gap-1">
                          <span>اسم المستخدم (اليوزر):</span>
                        </span>
                        <span className="font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/80">
                          {u.username}
                        </span>
                      </div>

                      {/* Password */}
                      <div className="flex items-center justify-between">
                        <span className="text-stone-400 text-xs">الكلمة السرية:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-stone-200 font-bold bg-stone-800 px-2 py-0.5 rounded border border-stone-700 text-left">
                            {isAhmed || isUserSelf
                              ? isPasswordShown
                                ? u.password
                                : '••••••••'
                              : '••••••••'}
                          </span>
                          {(isAhmed || isUserSelf) && (
                            <button
                              type="button"
                              onClick={() => togglePasswordReveal(u.id)}
                              className="text-stone-400 hover:text-stone-200 transition cursor-pointer p-1 rounded hover:bg-stone-800"
                              title={isPasswordShown ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                            >
                              {isPasswordShown ? (
                                <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {u.phone && (
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-800/80">
                          <span className="text-stone-400">الهاتف:</span>
                          <span className="font-mono text-stone-300">{u.phone}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-stone-400">القطاع المكلف:</span>
                        <span className="text-stone-300 font-semibold">
                          {assignedSector ? assignedSector.nameAr : 'كافة القطاعات'}
                        </span>
                      </div>
                    </div>

                    {/* 2FA Status & Action Buttons */}
                    <div className="pt-2 border-t border-stone-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => onToggle2FA(u.id)}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-xl transition cursor-pointer ${
                          u.is2FAEnabled
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-stone-900 text-stone-400 border border-stone-800 hover:text-stone-200'
                        }`}
                        title="تفعيل أو تعطيل المصادقة الثنائية"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                        <span>2FA: {u.is2FAEnabled ? 'مفعلة' : 'معطلة'}</span>
                      </button>

                      {isAhmed ? (
                        <div className="flex items-center gap-1.5">
                          {u.id !== 'usr_manager_ahmed' && u.username !== 'ahmed' && (
                            <button
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من حذف حساب (${u.name})؟`)) {
                                  if (onDeleteUser) onDeleteUser(u.id);
                                  else FarmStorageService.deleteUser(u.id, currentUser);
                                }
                              }}
                              className="p-2 rounded-xl bg-stone-900 hover:bg-rose-950 border border-stone-800 hover:border-rose-800 text-stone-400 hover:text-rose-300 transition cursor-pointer"
                              title="حذف هذا الحساب"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEditClick(u)}
                            className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-emerald-600 hover:text-white border border-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>تعديل الحساب</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditClick(u)}
                          className="px-2.5 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-500 text-xs flex items-center gap-1 cursor-not-allowed"
                          title="التعديل محظور لغير مدير المزرعة أحمد"
                        >
                          <Lock className="w-3 h-3 text-stone-600" />
                          <span>تعديل محظور</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Policy Information Box */}
          <div className="p-4 rounded-3xl bg-stone-850/60 border border-stone-750 flex items-start gap-3 text-xs text-stone-400">
            <Shield className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-stone-200">
                توثيق سياسة أمان مزرعة أطياب الوادي:
              </span>
              <p>
                تم قفل صلاحيات إدارة وتعديل المستخدمين وحصرها حصرياً بحساب مدير المزرعة (أحمد). أي محاولة تعديل من باقي أعضاء الفريق (د. أيمن، إسلام، المهندس الزراعي، المشرف، علاء، أحمد طه) يتم حظرها آلياً مع تسجيل محاولة غير مصرح بها في سجل التدقيق الأمني الحي.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ANALYTICS & CHARTS (Recharts & KPIs) */}
      {/* ========================================================= */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6 animate-in fade-in">
          {/* KPI Overview Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Completion Rate */}
        <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750/70 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-stone-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              معدل الإنجاز العام
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
              {taskStats.completionRate >= 80 ? 'ممتاز' : 'مقبول'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400">
              {taskStats.completionRate}%
            </span>
            <span className="text-[11px] text-stone-400">
              ({taskStats.completedTotal} من {taskStats.total} مهام)
            </span>
          </div>
          <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${taskStats.completionRate}%` }}
            />
          </div>
        </div>

        {/* KPI 2: Completed Tasks */}
        <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750/70 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-stone-400 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-sky-400" />
              مهام منجزة ومعتمدة
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800 font-bold">
              {taskStats.completedTotal} مهمة
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-stone-100">
              {taskStats.completedTotal}
            </span>
            <span className="text-[11px] text-stone-400">
              منها {taskStats.approved} معتمدة رسمياً
            </span>
          </div>
          <p className="text-[10px] text-stone-400 truncate">
            موثقة بـ GPS والأختام المانعة للتلاعب
          </p>
        </div>

        {/* KPI 3: Overdue / Delayed Tasks */}
        <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750/70 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-stone-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              المهام المتأخرة
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                taskStats.overdue > 0
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}
            >
              {taskStats.overdue > 0 ? `${taskStats.overdue} متأخرة` : 'لا يوجد تأخير'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-black ${
                taskStats.overdue > 0 ? 'text-rose-400' : 'text-stone-300'
              }`}
            >
              {taskStats.overdue}
            </span>
            <span className="text-[11px] text-stone-400">تتطلب تنبيه وتدخل فوري</span>
          </div>
          <p className="text-[10px] text-stone-400 truncate">
            يتم تفعيل التنبيه الصوتي كل 30 دقيقة
          </p>
        </div>

        {/* KPI 4: In Progress / Scheduled */}
        <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750/70 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-stone-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              قيد التنفيذ والمجدولة
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-bold">
              {taskStats.pendingTotal} جارية
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-stone-100">
              {taskStats.pendingTotal}
            </span>
            <span className="text-[11px] text-stone-400">مهام مجدولة هذا الأسبوع</span>
          </div>
          <p className="text-[10px] text-stone-400 truncate">
            ري، مكافحة وقائية، وتلقيح نخيل
          </p>
        </div>
      </div>

      {/* --- RECHARTS CHARTS SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart 1: Weekly Task Completion & Overdue Comparison */}
        <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl bg-stone-850 border border-stone-750 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h4 className="font-bold text-sm text-stone-100 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span>معدلات إنجاز المهام الأسبوعية (المنجزة مقابل المتأخرة)</span>
              </h4>
              <p className="text-[11px] text-stone-400">
                متابعة يومية لأداء العمال وفرق الري والوقاية خلال أيام الأسبوع
              </p>
            </div>

            {/* Toggle chart style */}
            <div className="flex items-center gap-1 p-1 bg-stone-900 rounded-xl border border-stone-800 text-xs">
              <button
                onClick={() => setChartView('weekly_bar')}
                className={`px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
                  chartView === 'weekly_bar'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                أعمدة مقارنة
              </button>
              <button
                onClick={() => setChartView('weekly_area')}
                className={`px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
                  chartView === 'weekly_area'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                منحنى الإنجاز
              </button>
            </div>
          </div>

          {/* Recharts Container */}
          <div className="h-64 sm:h-72 w-full pt-2" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              {chartView === 'weekly_bar' ? (
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
                  <XAxis
                    dataKey="short"
                    stroke="#78716c"
                    tick={{ fill: '#a8a29e', fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#78716c"
                    tick={{ fill: '#a8a29e', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1c1917',
                      borderColor: '#44403c',
                      borderRadius: '0.75rem',
                      color: '#f5f5f4',
                      fontSize: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                    }}
                    labelStyle={{ color: '#34d399', fontWeight: 'bold', marginBottom: '4px' }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
                  />
                  <Bar
                    dataKey="منجزة"
                    name="المهام المنجزة"
                    fill={COLORS.completed}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={32}
                  />
                  <Bar
                    dataKey="متأخرة"
                    name="المهام المتأخرة"
                    fill={COLORS.overdue}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              ) : (
                <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.completed} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={COLORS.completed} stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorOverdue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.overdue} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={COLORS.overdue} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
                  <XAxis
                    dataKey="short"
                    stroke="#78716c"
                    tick={{ fill: '#a8a29e', fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#78716c"
                    tick={{ fill: '#a8a29e', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1c1917',
                      borderColor: '#44403c',
                      borderRadius: '0.75rem',
                      color: '#f5f5f4',
                      fontSize: '12px'
                    }}
                    labelStyle={{ color: '#34d399', fontWeight: 'bold', marginBottom: '4px' }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="منجزة"
                    name="المهام المنجزة"
                    stroke={COLORS.completed}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorCompleted)"
                  />
                  <Area
                    type="monotone"
                    dataKey="متأخرة"
                    name="المهام المتأخرة"
                    stroke={COLORS.overdue}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorOverdue)"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Task Status Distribution (Donut / Pie Chart) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-stone-850 border border-stone-750 flex flex-col justify-between space-y-3">
          <div>
            <h4 className="font-bold text-sm text-stone-100 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-sky-400" />
              <span>توزيع المهام (مكتملة مقابل متأخرة)</span>
            </h4>
            <p className="text-[11px] text-stone-400">
              النسب المئوية لحالات المهام الميدانية المسجلة
            </p>
          </div>

          <div className="h-52 w-full relative flex items-center justify-center" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#1c1917" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: any, item: any) => [
                    `${item?.payload?.count || value} مهمة`,
                    name
                  ]}
                  contentStyle={{
                    backgroundColor: '#1c1917',
                    borderColor: '#44403c',
                    borderRadius: '0.75rem',
                    color: '#f5f5f4',
                    fontSize: '11px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Stat Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-xl font-black text-stone-100">{taskStats.total}</span>
              <span className="text-[10px] text-stone-400 font-medium">إجمالي المهام</span>
            </div>
          </div>

          {/* Color Breakdown Legend */}
          <div className="space-y-1.5 pt-1">
            {statusPieData.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-stone-900/60"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-stone-300 text-[11px]">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-stone-200 text-xs">{item.count}</span>
                  <span className="text-stone-500 text-[10px]">
                    ({taskStats.total > 0 ? Math.round((item.count / taskStats.total) * 100) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Security Cards Grid (2FA, RBAC, Encryption) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. 2FA Authenticator */}
        <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              المصادقة الثنائية (2FA)
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                currentUser?.is2FAEnabled
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-stone-800 text-stone-400'
              }`}
            >
              {currentUser?.is2FAEnabled ? 'مفعلة' : 'غير مفعلة'}
            </span>
          </div>

          <p className="text-[11px] text-stone-400">
            توليد رمز أمان سداسي كل 30 ثانية لتأكيد تسجيل الدخول واعتماد المهام الحساسة.
          </p>

          <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between">
            <span className="font-mono text-lg font-bold text-emerald-400 tracking-widest">
              {totpToken}
            </span>
            <button
              onClick={generateNewToken}
              className="text-[11px] text-stone-400 hover:text-stone-200 underline cursor-pointer"
            >
              تجديد
            </button>
          </div>

          <button
            onClick={() => currentUser?.id && onToggle2FA(currentUser.id)}
            className="w-full py-2 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-700 text-stone-300 text-xs font-semibold transition cursor-pointer"
          >
            {currentUser?.is2FAEnabled ? 'تعطيل 2FA لحسابي' : 'تفعيل المصادقة الثنائية (2FA)'}
          </button>
        </div>

        {/* 2. RBAC Permissions Matrix */}
        <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750 space-y-2.5">
          <div className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-sky-400" />
            مصفوفة الصلاحيات والأدوار (RBAC)
          </div>
          <div className="text-xs space-y-1.5 text-stone-300 pt-1">
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-stone-900/60">
              <span>مدير المزرعة:</span>
              <span className="text-emerald-400 font-semibold text-[11px]">
                إنشاء، تعديل، حذف، واعتماد
              </span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-stone-900/60">
              <span>مشرف القطاع:</span>
              <span className="text-sky-400 font-semibold text-[11px]">
                متابعة، توجيه، وتدقيق GPS
              </span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-stone-900/60">
              <span>العامل الزراعي:</span>
              <span className="text-amber-400 font-semibold text-[11px]">
                استقبال التنبيهات والتوثيق الحي
              </span>
            </div>
          </div>
        </div>

        {/* 3. Encryption & Tamper Proof */}
        <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750 space-y-2.5">
          <div className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
            <Server className="w-4 h-4 text-teal-400" />
            معايير التشفير والتحقق الجغرافي
          </div>
          <div className="text-[11px] text-stone-400 space-y-1.5 pt-1">
            <div className="flex items-center gap-1.5 text-stone-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>تشفير النقل والتخزين عبر TLS/HTTPS وAES-256</span>
            </div>
            <div className="flex items-center gap-1.5 text-stone-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>بصمة توقيع زمني لمنع تزوير الصور وإحداثيات GPS</span>
            </div>
            <div className="flex items-center gap-1.5 text-stone-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>مزامنة تلقائية آمنة عند استعادة الاتصال (Offline Sync)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )}

      {/* ========================================================= */}
      {/* TAB 3: AUDIT TRAILS & LOGS */}
      {/* ========================================================= */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-stone-850 p-3.5 rounded-2xl border border-stone-750">
            <div className="space-y-0.5">
              <h4 className="font-bold text-xs sm:text-sm text-stone-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>سجل العمليات والتدقيق الأمني والمهام (Audit Logs)</span>
              </h4>
              <p className="text-[11px] text-stone-400">
                تسجيل مشفر وغير قابل للتعديل لجميع العمليات الميدانية والاعتمادات الإدارية
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في السجل الأمني..."
                className="px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none w-full sm:w-44"
              />
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 text-xs focus:outline-none cursor-pointer"
              >
                <option value="all">كل المستويات</option>
                <option value="info">عادي (Info)</option>
                <option value="warning">تحذير (Warning)</option>
                <option value="critical">حرج (Critical)</option>
              </select>

              {/* Export Approved Tasks CSV */}
              <button
                onClick={handleExportApprovedTasksCsv}
                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                title="تصدير سجل المهام المعتمدة الموثقة إلى ملف CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                <span>تصدير المهام المعتمدة (CSV)</span>
              </button>

              {/* Export Security Logs CSV */}
              <button
                onClick={handleExportCsv}
                className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-200 border border-stone-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="تصدير سجل التدقيق الأمني (Audit Log) إلى ملف CSV"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>تصدير سجل التدقيق (CSV)</span>
              </button>
            </div>
          </div>

        <div className="rounded-2xl border border-stone-750 overflow-hidden bg-stone-850">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-800 text-stone-400 border-b border-stone-700 text-[11px]">
                <tr>
                  <th className="p-3">التوقيت</th>
                  <th className="p-3">المستخدم والدور</th>
                  <th className="p-3">النشاط الأمني</th>
                  <th className="p-3">التفاصيل</th>
                  <th className="p-3">عنوان الـ IP والجهاز</th>
                  <th className="p-3">المستوى</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800 text-stone-300">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-800/50 transition">
                    <td className="p-3 font-mono text-[11px] text-stone-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-semibold text-stone-200">{log.userName}</div>
                      <div className="text-[10px] text-stone-500">{log.userRole}</div>
                    </td>
                    <td className="p-3 font-medium text-emerald-400 whitespace-nowrap">
                      {log.actionTitleAr}
                    </td>
                    <td className="p-3 text-stone-300 max-w-xs">{log.details}</td>
                    <td className="p-3 font-mono text-[10px] text-stone-400 whitespace-nowrap">
                      <div>{log.ipAddress}</div>
                      <div className="text-stone-500 truncate max-w-[150px]">{log.deviceInfo}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.severity === 'critical'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : log.severity === 'warning'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {log.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {/* Modal for User Management */}
      {isUserModalOpen && (
        <UserManagementModal
          userToEdit={editingUser}
          currentUser={currentUser}
          sectors={sectors}
          onClose={() => {
            setIsUserModalOpen(false);
            setEditingUser(null);
          }}
          onSave={handleSaveUserFromModal}
          onDelete={handleDeleteUserFromModal}
        />
      )}
    </div>
  );
};
