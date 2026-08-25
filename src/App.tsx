import React, { useState, useEffect } from 'react';
import {
  Layers,
  MapPin,
  Sun,
  Shield,
  Sparkles,
  Database,
  Volume2,
  RefreshCw,
  Plus,
  Compass,
  CheckCircle2,
  AlertCircle,
  Calendar
} from 'lucide-react';
import {
  User,
  FarmSector,
  FarmTask,
  WeatherData,
  AuditLog,
  GeoLocation,
  AgriCalendarEvent
} from './types';
import { FarmStorageService } from './services/storage';
import { getCurrentDeviceLocation } from './services/geoVerification';
import { playSirenAlarm, playSuccessChime } from './services/audioAlarm';

import { Header } from './components/Header';
import { AlarmBanner } from './components/AlarmBanner';
import { TaskList } from './components/TaskList';
import { FarmMap } from './components/FarmMap';
import { AgriculturalCalendar } from './components/AgriculturalCalendar';
import { WeatherWidget } from './components/WeatherWidget';
import { SecurityAndAuditHub } from './components/SecurityAndAuditHub';
import { TaskVerificationModal } from './components/TaskVerificationModal';
import { TaskDetailsModal } from './components/TaskDetailsModal';
import { TaskFormModal } from './components/TaskFormModal';
import { AiAgronomistDrawer } from './components/AiAgronomistDrawer';
import { ApiAndErExplorer } from './components/ApiAndErExplorer';
import { LoginScreen } from './components/LoginScreen';
import { ExcelTaskImportModal } from './components/ExcelTaskImportModal';

export const App: React.FC = () => {
  // Session & Authentication State
  const [sessionUser, setSessionUser] = useState<User | null>(FarmStorageService.getSessionUser());
  const [currentUser, setCurrentUser] = useState<User>(
    FarmStorageService.getSessionUser() || FarmStorageService.getCurrentUser()
  );
  const [users, setUsers] = useState<User[]>(FarmStorageService.getUsers());
  const [sectors, setSectors] = useState<FarmSector[]>(FarmStorageService.getSectors());
  const [tasks, setTasks] = useState<FarmTask[]>(FarmStorageService.getTasks());
  const [weather, setWeather] = useState<WeatherData>(FarmStorageService.getWeather());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(FarmStorageService.getAuditLogs());
  const [agriEvents, setAgriEvents] = useState<AgriCalendarEvent[]>(
    FarmStorageService.getAgriEvents()
  );
  const [syncQueueCount, setSyncQueueCount] = useState<number>(
    FarmStorageService.getSyncQueue().length
  );
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [dndEnabled, setDndEnabled] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<GeoLocation | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(FarmStorageService.getTheme());

  // Active View Tabs
  const [activeTab, setActiveTab] = useState<'tasks' | 'map' | 'calendar' | 'weather' | 'security'>('tasks');

  // Modal Controls
  const [verifyingTask, setVerifyingTask] = useState<FarmTask | null>(null);
  const [detailsTask, setDetailsTask] = useState<FarmTask | null>(null);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<FarmTask | null>(null);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isApiExplorerOpen, setIsApiExplorerOpen] = useState(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Initial GPS Lock & Online/Offline event listeners
  useEffect(() => {
    getCurrentDeviceLocation()
      .then((loc) => setUserLocation(loc))
      .catch((e) => console.warn('Could not acquire device coordinates:', e));

    const handleOnline = () => {
      setIsOffline(false);
      showToast('🟢 تم استعادة الاتصال بالإنترنت، جارٍ مزامنة المهام...');
      handleTriggerSync();
    };
    const handleOffline = () => {
      setIsOffline(true);
      showToast('🟠 تم التحول إلى وضع العمل دون اتصال (Offline-First)');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Automated Weather Hazard Monitor Effect
  useEffect(() => {
    const res = FarmStorageService.checkAndAutoDispatchWeatherAlerts(weather);
    if (res.dispatched && res.record) {
      setAuditLogs(FarmStorageService.getAuditLogs());
      showToast(`🚨 تنبيه أرصاد تلقائي: ${res.record.title}`);
    }
  }, [weather.temperatureC, weather.windSpeedKmH, weather.conditionCode]);

  // Sync Theme class to Document Element and Body
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
      document.documentElement.classList.remove('theme-dark');
      document.body.classList.add('theme-light');
      document.body.classList.remove('theme-dark');
    } else {
      document.documentElement.classList.add('theme-dark');
      document.documentElement.classList.remove('theme-light');
      document.body.classList.add('theme-dark');
      document.body.classList.remove('theme-light');
    }
  }, [theme]);

  // Handler: Toggle Theme (Dark vs Sunlight Light Mode)
  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    FarmStorageService.setTheme(nextTheme);
    if (nextTheme === 'light') {
      showToast('☀️ تم تفعيل النمط النهاري (المريح في ضوء الشمس المباشر)');
    } else {
      showToast('🌙 تم تفعيل النمط الليلي (المريح للعينين في الإضاءة الخافتة)');
    }
  };

  // Handler: Change User
  const handleUserChange = (user: User) => {
    setCurrentUser(user);
    setSessionUser(user);
    FarmStorageService.setSessionUser(user);
    FarmStorageService.setCurrentUser(user);
    showToast(`تم تبديل المستخدم الحالي إلى: ${user.name} (${user.roleTitleAr})`);
  };

  // Handler: Logout
  const handleLogout = () => {
    FarmStorageService.logout();
    setSessionUser(null);
    showToast('تم تسجيل الخروج وقفل المنظومة بنجاح.');
  };

  // Handler: Manual Sync Trigger
  const handleTriggerSync = () => {
    const remainingQueue = FarmStorageService.executeSyncQueue();
    setSyncQueueCount(remainingQueue.length);
    setTasks(FarmStorageService.getTasks());
    setAuditLogs(FarmStorageService.getAuditLogs());
    showToast('✓ تمت مزامنة كافة العمليات بنجاح مع الخادم المركزي');
  };

  // Handler: Save or Update Task (Manager Only)
  const handleSaveTask = (task: FarmTask) => {
    FarmStorageService.saveTask(task);
    setTasks(FarmStorageService.getTasks());
    setAuditLogs(FarmStorageService.getAuditLogs());
    setSyncQueueCount(FarmStorageService.getSyncQueue().length);
    showToast(`✓ تم إصدار المهمة: "${task.title}" وتعيينها للمنفذ.`);
  };

  // Handler: Import Tasks from Excel (Manager Only)
  const handleImportTasksFromExcel = (importedTasks: FarmTask[]) => {
    const updatedTasks = FarmStorageService.addTasksBulk(importedTasks, currentUser);
    setTasks(updatedTasks);
    setAuditLogs(FarmStorageService.getAuditLogs());
    setSyncQueueCount(FarmStorageService.getSyncQueue().length);
    showToast(`✅ تم بنجاح استيراد وجدولة ${importedTasks.length} مهمة زراعية من ملف الإكسل!`);
  };

  // Handler: Delete Task
  const handleDeleteTask = (taskId: string) => {
    FarmStorageService.deleteTask(taskId);
    setTasks(FarmStorageService.getTasks());
    setAuditLogs(FarmStorageService.getAuditLogs());
    setSyncQueueCount(FarmStorageService.getSyncQueue().length);
    showToast('تم حذف المهمة من النظام بنجاح.');
  };

  // Handler: Confirm Completion & Geo-Proof
  const handleConfirmCompletion = (proof: FarmTask['proofOfWork']) => {
    if (!verifyingTask) return;
    FarmStorageService.completeTask(verifyingTask.id, proof);
    setTasks(FarmStorageService.getTasks());
    setAuditLogs(FarmStorageService.getAuditLogs());
    setSyncQueueCount(FarmStorageService.getSyncQueue().length);
    setVerifyingTask(null);
    showToast('🎉 تم توثيق المهمة بالـ GPS والبصمة الرقمية وإيقاف التنبيه الصوتي!');
  };

  // Handler: Approve Task (Manager Only)
  const handleApproveTask = (taskId: string, rating: number, feedback: string) => {
    FarmStorageService.approveTask(taskId, currentUser.id, currentUser.name, rating, feedback);
    setTasks(FarmStorageService.getTasks());
    setAuditLogs(FarmStorageService.getAuditLogs());
    setSyncQueueCount(FarmStorageService.getSyncQueue().length);
    if (detailsTask && detailsTask.id === taskId) {
      const updated = FarmStorageService.getTasks().find((t) => t.id === taskId);
      if (updated) setDetailsTask(updated);
    }
    showToast('✓ تم اعتماد المهمة رسمياً وتقييم الإنجاز.');
  };

  // Handler: Toggle 2FA
  const handleToggle2FA = (userId: string) => {
    FarmStorageService.toggleUser2FA(userId);
    const updatedUsers = FarmStorageService.getUsers();
    setUsers(updatedUsers);
    const me = updatedUsers.find((u) => u.id === currentUser.id);
    if (me) setCurrentUser(me);
    setAuditLogs(FarmStorageService.getAuditLogs());
    showToast('تم تحديث حالة المصادقة الثنائية (2FA) للمستخدم.');
  };

  // Handler: Update User (Ahmed only)
  const handleUpdateUser = (updatedUser: User) => {
    const success = FarmStorageService.updateUser(updatedUser, currentUser);
    if (success) {
      const refreshedUsers = FarmStorageService.getUsers();
      setUsers(refreshedUsers);
      if (currentUser.id === updatedUser.id) {
        setCurrentUser(updatedUser);
      }
      setAuditLogs(FarmStorageService.getAuditLogs());
      showToast(`✓ تم تحديث بيانات المستخدم (${updatedUser.name}) بنجاح`);
    }
  };

  // Handler: Create User (Ahmed only)
  const handleCreateUser = (newUser: User) => {
    const success = FarmStorageService.createUser(newUser, currentUser);
    if (success) {
      setUsers(FarmStorageService.getUsers());
      setAuditLogs(FarmStorageService.getAuditLogs());
      showToast(`✓ تم إنشاء حساب المستخدم (${newUser.name}) بنجاح`);
    }
  };

  // Handler: Delete User (Ahmed only)
  const handleDeleteUser = (userId: string) => {
    const success = FarmStorageService.deleteUser(userId, currentUser);
    if (success) {
      setUsers(FarmStorageService.getUsers());
      setAuditLogs(FarmStorageService.getAuditLogs());
      showToast('✓ تم حذف المستخدم من المنظومة بنجاح');
    }
  };

  // Handler: Agricultural Calendar Operations
  const handleAddAgriEvent = (newEvent: AgriCalendarEvent) => {
    FarmStorageService.addAgriEvent(newEvent, currentUser);
    setAgriEvents(FarmStorageService.getAgriEvents());
    setAuditLogs(FarmStorageService.getAuditLogs());
    showToast(`✓ تمت إضافة الموعد الزراعي: "${newEvent.title}" بنجاح`);
  };

  const handleUpdateAgriEvent = (updatedEvent: AgriCalendarEvent) => {
    FarmStorageService.updateAgriEvent(updatedEvent, currentUser);
    setAgriEvents(FarmStorageService.getAgriEvents());
    setAuditLogs(FarmStorageService.getAuditLogs());
    showToast(`✓ تم تحديث الموعد الزراعي: "${updatedEvent.title}"`);
  };

  const handleDeleteAgriEvent = (eventId: string) => {
    FarmStorageService.deleteAgriEvent(eventId, currentUser);
    setAgriEvents(FarmStorageService.getAgriEvents());
    setAuditLogs(FarmStorageService.getAuditLogs());
    showToast('✓ تم حذف الموعد من التقويم الزراعي');
  };

  const handleCreateTaskFromAgriEvent = (taskData: Partial<FarmTask>) => {
    const isSec9 = taskData.sectorId === 'sec_plot_9';
    const sectorCoord = isSec9
      ? { lat: 25.4523, lng: 30.5521 }
      : { lat: 25.4565, lng: 30.5582 };

    const newTask: FarmTask = {
      id: 'tsk_' + Date.now(),
      title: taskData.title || 'مهمة زراعية جديدة',
      description: taskData.description || '',
      category: taskData.category || 'irrigation',
      categoryAr:
        taskData.category === 'harvest'
          ? 'حصاد وحش'
          : taskData.category === 'pollination'
          ? 'تلقيح وتأبير'
          : 'ري وتسميد',
      priority: taskData.priority || 'high',
      sectorId: taskData.sectorId || 'sec_plot_9',
      sectorName: taskData.sectorName || 'قطعة رقم 9',
      targetCoordinates: sectorCoord,
      maxAllowedDistanceMeters: 150,
      assignedToUserId: taskData.assignedToUserId || 'usr_worker_alaa',
      assignedToName: taskData.assignedToName || 'علاء شعبان (عامل تشغيل)',
      assignedRole: 'worker',
      status: 'pending',
      scheduledDate: taskData.scheduledDate || new Date().toISOString().split('T')[0],
      scheduledTime: taskData.scheduledTime || '06:00',
      deadlineTimestamp: Date.now() + 86400000,
      isRecurring: false,
      recurrenceType: 'none',
      alarmIntervalMinutes: 30,
      isAlarmActive: false,
      isEmergencyOverride: false,
      createdByUserId: currentUser.id,
      createdByName: currentUser.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSynced: true
    };

    const saved = FarmStorageService.saveTask(newTask);
    setTasks(FarmStorageService.getTasks());
    setAuditLogs(FarmStorageService.getAuditLogs());
    showToast(`✓ تم إنشاء وتكليف المهمة الميدانية: "${saved.title}"`);
  };

  // If user is not authenticated, display the locked Login Gate
  if (!sessionUser) {
    return (
      <LoginScreen
        availableUsers={users}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onLoginSuccess={(authenticatedUser) => {
          setSessionUser(authenticatedUser);
          setCurrentUser(authenticatedUser);
          FarmStorageService.setSessionUser(authenticatedUser);
          showToast(`مرحباً بك: ${authenticatedUser.name} (${authenticatedUser.roleTitleAr})`);
        }}
      />
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'light' ? 'bg-[#f4f5f7] text-stone-900' : 'bg-[#11100f] text-stone-100'} flex flex-col antialiased selection:bg-emerald-600 selection:text-white transition-colors duration-200`} dir="rtl">
      {/* 1. Main Application Header */}
      <Header
        currentUser={currentUser}
        users={users}
        allUsers={users}
        weather={weather}
        notifications={FarmStorageService.getNotifications()}
        onSwitchUser={handleUserChange}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        syncQueueCount={syncQueueCount}
        isOffline={isOffline}
        isOnline={!isOffline}
        dndEnabled={dndEnabled}
        onToggleDnd={() => setDndEnabled(!dndEnabled)}
        onTriggerSync={handleTriggerSync}
        onManualSync={handleTriggerSync}
        onOpenAiAgronomist={() => setIsAiDrawerOpen(true)}
        onOpenAiDrawer={() => setIsAiDrawerOpen(true)}
        onOpenApiDocs={() => setIsApiExplorerOpen(true)}
        onOpenApiExplorer={() => setIsApiExplorerOpen(true)}
      />

      {/* 2. Persistent 30-Minute Alarm Banner for Unverified Tasks */}
      <AlarmBanner
        activeTasks={tasks}
        currentUser={currentUser}
        dndEnabled={dndEnabled}
        onOpenVerification={(task) => setVerifyingTask(task)}
      />

      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 left-5 z-50 bg-stone-900 border border-emerald-500 text-stone-100 text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 3. Main Body Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-900/90 border border-stone-800 p-2 rounded-2xl">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'tasks'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>المهام الميدانية</span>
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'map'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>خريطة المزرعة والقطاعات</span>
            </button>

            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'calendar'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>التقويم الزراعي (قطاع 9 و 10)</span>
            </button>

            <button
              onClick={() => setActiveTab('weather')}
              className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'weather'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>أرصاد وتنبيهات الوادي</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'security'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>الأمن وسجل التدقيق</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct Alarm Sound Test */}
            <button
              onClick={() => playSirenAlarm(1.5)}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-700 text-stone-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="تجربة صوت إنذار الـ 30 دقيقة"
            >
              <Volume2 className="w-3.5 h-3.5 text-rose-400" />
              <span>فحص الصوت</span>
            </button>

            {/* Quick AI Trigger */}
            <button
              onClick={() => setIsAiDrawerOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow flex items-center gap-1.5 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>المرشد الزراعي الذكي</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Task Management */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <TaskList
              tasks={tasks}
              sectors={sectors}
              users={users}
              currentUser={currentUser}
              onOpenCreateTask={() => {
                setEditingTask(null);
                setIsTaskFormOpen(true);
              }}
              onOpenImportExcel={() => setIsExcelImportOpen(true)}
              onSelectTask={(task) => setDetailsTask(task)}
              onOpenVerification={(task) => setVerifyingTask(task)}
            />
          </div>
        )}

        {/* Tab 2: Interactive Farm Map */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            <FarmMap
              sectors={sectors}
              tasks={tasks}
              users={users}
              weather={weather}
              userLocation={userLocation}
              onSelectTask={(task) => setDetailsTask(task)}
              onSelectSector={(sector) => {
                showToast(`القطاع: ${sector.nameAr}`);
              }}
            />
          </div>
        )}

        {/* Tab 3: Interactive Agricultural Calendar (Sectors 9 & 10) */}
        {activeTab === 'calendar' && (
          <div className="space-y-6">
            <AgriculturalCalendar
              events={agriEvents}
              sectors={sectors}
              currentUser={currentUser}
              weather={weather}
              onAddEvent={handleAddAgriEvent}
              onUpdateEvent={handleUpdateAgriEvent}
              onDeleteEvent={handleDeleteAgriEvent}
              onCreateTaskFromEvent={handleCreateTaskFromAgriEvent}
            />
          </div>
        )}

        {/* Tab 4: Weather & Agro-Advisories */}
        {activeTab === 'weather' && (
          <div className="space-y-6">
            <WeatherWidget
              weather={weather}
              currentUser={currentUser}
              users={users}
              onShowToast={showToast}
              onUpdateWeather={(newW) => {
                setWeather(newW);
                FarmStorageService.setWeather(newW);
                showToast('تم تحديث بيانات محطة الأرصاد الجوية الزراعية');
              }}
            />
          </div>
        )}

        {/* Tab 4: Security & Audit Trails */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <SecurityAndAuditHub
              tasks={tasks}
              auditLogs={auditLogs}
              currentUser={currentUser}
              users={users}
              sectors={sectors}
              onToggle2FA={handleToggle2FA}
              onUpdateUser={handleUpdateUser}
              onCreateUser={handleCreateUser}
              onDeleteUser={handleDeleteUser}
            />
          </div>
        )}
      </main>

      {/* 4. MODALS & DRAWERS */}

      {/* Geo-Verification & Watermarked Camera Modal */}
      {verifyingTask && (
        <TaskVerificationModal
          task={verifyingTask}
          currentUser={currentUser}
          onClose={() => setVerifyingTask(null)}
          onConfirmCompletion={handleConfirmCompletion}
        />
      )}

      {/* Task Details & Approval Modal */}
      {detailsTask && (
        <TaskDetailsModal
          task={detailsTask}
          currentUser={currentUser}
          onClose={() => setDetailsTask(null)}
          onOpenVerification={(task) => {
            setDetailsTask(null);
            setVerifyingTask(task);
          }}
          onApproveTask={handleApproveTask}
          onDeleteTask={handleDeleteTask}
        />
      )}

      {/* Task Creation & Edit Modal (Manager Only) */}
      {isTaskFormOpen && (
        <TaskFormModal
          sectors={sectors}
          users={users}
          currentUser={currentUser}
          initialTask={editingTask}
          onClose={() => {
            setIsTaskFormOpen(false);
            setEditingTask(null);
          }}
          onSaveTask={handleSaveTask}
        />
      )}

      {/* Excel Task Import Modal (Manager Only) */}
      {isExcelImportOpen && (
        <ExcelTaskImportModal
          currentUser={currentUser}
          sectors={sectors}
          users={users}
          onClose={() => setIsExcelImportOpen(false)}
          onImportTasks={handleImportTasksFromExcel}
        />
      )}

      {/* AI Agronomist Chat Drawer (Gemini 3.7 Flash) */}
      {isAiDrawerOpen && (
        <AiAgronomistDrawer
          tasks={tasks}
          sectors={sectors}
          weather={weather}
          onClose={() => setIsAiDrawerOpen(false)}
        />
      )}

      {/* Technical Architecture & REST API / ER Model Explorer */}
      {isApiExplorerOpen && (
        <ApiAndErExplorer onClose={() => setIsApiExplorerOpen(false)} />
      )}

      {/* Footer */}
      <footer className="border-t border-stone-850 py-4 px-6 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>نظام أطياب الوادي لإدارة المهام والعمليات الزراعية الذكية © 2026</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsApiExplorerOpen(true)}
              className="text-stone-400 hover:text-emerald-400 transition cursor-pointer flex items-center gap-1"
            >
              <Database className="w-3 h-3" />
              <span>مخطط الـ ER وواجهات الـ REST API</span>
            </button>
            <span>•</span>
            <span className="text-stone-500">واحة الخارجة - محافظة الوادي الجديد</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default App;
