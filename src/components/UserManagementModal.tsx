import React, { useState } from 'react';
import {
  X,
  User as UserIcon,
  Lock,
  Phone,
  Mail,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MapPin,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { User, UserRole, FarmSector } from '../types';

interface UserManagementModalProps {
  userToEdit: User | null;
  currentUser: User;
  sectors: FarmSector[];
  onClose: () => void;
  onSave: (userData: User) => void;
  onDelete?: (userId: string) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  userToEdit,
  currentUser,
  sectors,
  onClose,
  onSave,
  onDelete
}) => {
  const isEditing = Boolean(userToEdit);
  const isAhmed =
    currentUser?.role === 'manager' &&
    (currentUser.username?.toLowerCase() === 'ahmed' ||
      currentUser.id === 'usr_manager_ahmed' ||
      currentUser.name?.includes('أحمد') ||
      currentUser.name?.includes('احمد'));

  const [name, setName] = useState(userToEdit?.name || '');
  const [username, setUsername] = useState(userToEdit?.username || '');
  const [password, setPassword] = useState(userToEdit?.password || '');
  const [showPassword, setShowPassword] = useState(true);
  const [role, setRole] = useState<UserRole>(userToEdit?.role || 'worker');
  const [roleTitleAr, setRoleTitleAr] = useState(userToEdit?.roleTitleAr || '');
  const [phone, setPhone] = useState(userToEdit?.phone || '');
  const [email, setEmail] = useState(userToEdit?.email || '');
  const [assignedSectorId, setAssignedSectorId] = useState(userToEdit?.assignedSectorId || '');
  const [is2FAEnabled, setIs2FAEnabled] = useState(userToEdit?.is2FAEnabled || false);
  const [pinCode, setPinCode] = useState(userToEdit?.pinCode || '1234');
  const [error, setError] = useState<string | null>(null);

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (!roleTitleAr || roleTitleAr === 'عامل تشغيل' || roleTitleAr === 'مدير مزرعة' || roleTitleAr === 'مشرف ميداني') {
      if (newRole === 'manager') setRoleTitleAr('مدير مزرعة');
      else if (newRole === 'supervisor') setRoleTitleAr('مشرف ميداني');
      else setRoleTitleAr('عامل تشغيل');
    }
  };

  const generateRandomPassword = () => {
    const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
    let newPass = '';
    for (let i = 0; i < 6; i++) {
      newPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(username ? `${username.slice(0, 3)}${newPass}` : `atyab${newPass}`);
    setShowPassword(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isAhmed) {
      setError('عذراً، تعديل وإدارة المستخدمين محظورة ومحصورة بمدير المزرعة (أحمد) فقط.');
      return;
    }

    if (!name.trim()) {
      setError('يرجى كتابة الاسم الكامل للمستخدم');
      return;
    }
    if (!username.trim()) {
      setError('يرجى تحديد اسم المستخدم (اليوزر - Username)');
      return;
    }
    if (!password.trim()) {
      setError('يرجى تحديد كلمة المرور (الكلمة السرية - Password)');
      return;
    }

    const updated: User = {
      id: userToEdit ? userToEdit.id : 'usr_' + Date.now(),
      name: name.trim(),
      username: username.trim().toLowerCase(),
      password: password.trim(),
      role,
      roleTitleAr: roleTitleAr.trim() || (role === 'manager' ? 'مدير مزرعة' : role === 'supervisor' ? 'مشرف ميداني' : 'عامل تشغيل'),
      phone: phone.trim() || '+201000000000',
      email: email.trim() || `${username.trim()}@atyabalwadi.eg`,
      assignedSectorId: assignedSectorId || undefined,
      is2FAEnabled,
      pinCode: pinCode.trim() || '1234'
    };

    onSave(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in" dir="rtl">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-950/50">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
                <span>{isEditing ? `تعديل حساب: ${userToEdit?.name}` : 'إضافة مستخدم جديد للنظام'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                  صلاحية أحمد
                </span>
              </h3>
              <p className="text-xs text-stone-400">
                {isEditing ? 'تعديل اسم المستخدم، الكلمة السرية، والدور الوظيفي' : 'إنشاء حساب جديد وتعيين كلمة المرور والصلاحيات'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Ahmed Notice */}
          <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/30 via-emerald-950/30 to-stone-900 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              🔒 بصفتك مدير المزرعة (أحمد)، يتم توثيق أي تعديل في سجل التدقيق الأمني المعتمد.
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name Field */}
          <div className="space-y-1 text-right">
            <label className="block text-xs font-semibold text-stone-300">
              الاسم الكامل للمستخدم *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: علاء شعبان (عامل تشغيل)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Username & Password Grid (Main Focus of User Request) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right">
            {/* Username / اليوزر */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-300 flex items-center justify-between">
                <span>اسم المستخدم (اليوزر) *</span>
                <span className="text-[10px] text-stone-500 font-mono">Username</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="مثال: alaa"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Password / الكلمة السرية */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-stone-300">
                  كلمة المرور (السرية) *
                </label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>توليد كلمة سر</span>
                </button>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="مثال: alaa123"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-emerald-400 font-mono text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-2.5 text-stone-400 hover:text-stone-200 transition cursor-pointer p-1"
                  title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Role & Role Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-300">
                نوع الحساب / الصلاحية (Role)
              </label>
              <select
                value={role}
                onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
              >
                <option value="manager">مدير مزرعة (Manager)</option>
                <option value="supervisor">مشرف ميداني (Supervisor)</option>
                <option value="worker">عامل تشغيل (Worker)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-300">
                المسمى الوظيفي العربي
              </label>
              <input
                type="text"
                value={roleTitleAr}
                onChange={(e) => setRoleTitleAr(e.target.value)}
                placeholder="مثال: عامل تشغيل وري"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-300">
                رقم الهاتف (واتساب / اتصال)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+201112233445"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-300">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@atyabalwadi.eg"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Assigned Sector & PIN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-300">
                القطاع المكلف به
              </label>
              <select
                value={assignedSectorId}
                onChange={(e) => setAssignedSectorId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
              >
                <option value="">كافة قطاعات المزرعة (عام)</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nameAr} ({s.areaFeddan} فدان)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-300">
                رمز PIN السريع (للمصادقة الميدانية)
              </label>
              <input
                type="text"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="1234"
                maxLength={6}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none text-center font-bold"
              />
            </div>
          </div>

          {/* 2FA Toggle */}
          <div className="p-3 rounded-2xl bg-stone-850 border border-stone-750 flex items-center justify-between">
            <div className="text-right">
              <div className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                المصادقة الثنائية (2FA)
              </div>
              <div className="text-[11px] text-stone-400">
                مطالبة المستخدم برمز تحقق إضافي لحماية الحساب
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={is2FAEnabled}
                onChange={(e) => setIs2FAEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Buttons Footer */}
          <div className="pt-3 border-t border-stone-800 flex items-center justify-between gap-3">
            {isEditing && userToEdit?.id !== 'usr_manager_ahmed' && userToEdit?.username !== 'ahmed' && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`هل أنت متأكد من رغبتك في حذف حساب "${userToEdit?.name}" بشكل نهائي؟`)) {
                    onDelete(userToEdit.id);
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف المستخدم</span>
              </button>
            )}

            <div className="flex items-center gap-2 mr-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-300 text-xs font-semibold transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isEditing ? 'حفظ التعديلات' : 'إنشاء الحساب'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

