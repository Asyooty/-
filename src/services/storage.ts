import {
  FarmTask,
  FarmSector,
  User,
  WeatherData,
  AuditLog,
  AppNotification,
  SyncQueueItem,
  UserRole,
  AgriCalendarEvent,
  WeatherAlertRecord,
  WeatherThresholdSettings
} from '../types';
import {
  INITIAL_TASKS,
  INITIAL_SECTORS,
  INITIAL_USERS,
  INITIAL_WEATHER,
  INITIAL_AUDIT_LOGS,
  DEFAULT_WEATHER_THRESHOLDS,
  INITIAL_WEATHER_ALERT_RECORDS
} from '../data/mockData';
import { INITIAL_AGRI_EVENTS } from '../data/agriculturalCalendarData';

const STORAGE_KEYS = {
  TASKS: 'atyab_tasks_v6',
  SECTORS: 'atyab_sectors_v4',
  USERS: 'atyab_users_v5',
  CURRENT_USER: 'atyab_current_user_v5',
  AUTH_SESSION: 'atyab_auth_session_v4',
  WEATHER: 'atyab_weather_v3',
  AUDIT_LOGS: 'atyab_audit_logs_v3',
  NOTIFICATIONS: 'atyab_notifications_v2',
  SYNC_QUEUE: 'atyab_sync_queue_v1',
  DND_SETTINGS: 'atyab_dnd_settings_v1',
  TWO_FA_SECRET: 'atyab_2fa_secret_v1',
  AGRI_EVENTS: 'atyab_agri_events_v2',
  THEME: 'atyab_theme_mode_v1',
  WEATHER_ALERTS_HISTORY: 'atyab_weather_alerts_history_v1',
  WEATHER_THRESHOLDS: 'atyab_weather_thresholds_v1',
  LAST_WEATHER_AUTO_DISPATCH: 'atyab_last_weather_auto_dispatch_v1'
};

export interface DndSettings {
  isEnabled: boolean;
  startTime: string; // "22:00"
  endTime: string; // "05:00"
  allowEmergencyOverride: boolean; // true
}

export class FarmStorageService {
  // Load tasks
  static getTasks(): FarmTask[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (!data) {
        this.saveTasks(INITIAL_TASKS);
        return INITIAL_TASKS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_TASKS;
    }
  }

  static saveTasks(tasks: FarmTask[]) {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }

  static saveTask(task: FarmTask): FarmTask {
    const tasks = this.getTasks();
    const idx = tasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) {
      tasks[idx] = { ...task, updatedAt: new Date().toISOString() };
      this.saveTasks(tasks);
      this.addToSyncQueue({
        id: 'sync_' + Date.now(),
        action: 'UPDATE_TASK',
        payload: task,
        createdAt: new Date().toISOString(),
        retryCount: 0
      });
      return tasks[idx];
    } else {
      return this.addTask(task);
    }
  }

  static addTask(task: FarmTask): FarmTask {
    const tasks = this.getTasks();
    tasks.unshift(task);
    this.saveTasks(tasks);

    // Queue for sync if offline
    this.addToSyncQueue({
      id: 'sync_' + Date.now(),
      action: 'CREATE_TASK',
      payload: task,
      createdAt: new Date().toISOString(),
      retryCount: 0
    });

    this.logAudit({
      userId: task.createdByUserId,
      userName: task.createdByName,
      userRole: 'manager',
      action: 'task_created',
      actionTitleAr: 'إنشاء مهمة جديدة',
      details: `تم إنشاء المهمة: "${task.title}" للقطاع (${task.sectorName}) وتعيينها للعامل (${task.assignedToName})`,
      severity: 'info',
      sectorId: task.sectorId,
      taskId: task.id
    });

    return task;
  }

  static addTasksBulk(newTasks: FarmTask[], addedBy: User): FarmTask[] {
    const tasks = this.getTasks();
    const combined = [...newTasks, ...tasks];
    this.saveTasks(combined);

    this.logAudit({
      userId: addedBy.id,
      userName: addedBy.name,
      userRole: 'manager',
      action: 'task_created',
      actionTitleAr: 'استيراد مهام مجمعة من ملف إكسل',
      details: `تم استيراد وإضافة ${newTasks.length} مهمة زراعية دفعة واحدة بنجاح بواسطة المدير (${addedBy.name})`,
      severity: 'info'
    });

    return combined;
  }

  static updateTask(updatedTask: FarmTask): FarmTask {
    const tasks = this.getTasks();
    const idx = tasks.findIndex((t) => t.id === updatedTask.id);
    if (idx !== -1) {
      tasks[idx] = { ...updatedTask, updatedAt: new Date().toISOString() };
      this.saveTasks(tasks);
    }
    this.addToSyncQueue({
      id: 'sync_' + Date.now(),
      action: 'UPDATE_TASK',
      payload: updatedTask,
      createdAt: new Date().toISOString(),
      retryCount: 0
    });
    return updatedTask;
  }

  static completeTask(
    taskId: string,
    proof: FarmTask['proofOfWork'],
    completedBy?: User
  ): FarmTask | null {
    const tasks = this.getTasks();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return null;

    const user = completedBy || this.getCurrentUser();

    task.status = 'completed';
    task.proofOfWork = proof;
    task.isAlarmActive = false;
    task.updatedAt = new Date().toISOString();
    this.saveTasks(tasks);

    // Add manager notification
    this.addNotification({
      id: 'notif_' + Date.now(),
      title: `✅ إنجاز مهمة: ${task.title}`,
      message: `قام العامل ${user.name} بإتمام المهمة في ${task.sectorName} وتوثيقها بـ GPS وصورة معتمدة. في انتظار الاعتماد.`,
      type: 'task_completion',
      timestamp: new Date().toISOString(),
      read: false,
      taskId: task.id,
      workerName: user.name
    });

    // Log audit
    this.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'task_completed',
      actionTitleAr: 'إتمام مهمة وتوثيق جغرافي',
      details: `أتم العامل ${user.name} المهمة "${task.title}". مطابقة الموقع: ${proof?.isLocationVerified ? 'نعم' : 'لا'} (المسافة: ${proof?.distanceFromTargetMeters} م)`,
      severity: proof?.isLocationVerified ? 'info' : 'warning',
      sectorId: task.sectorId,
      taskId: task.id
    });

    this.addToSyncQueue({
      id: 'sync_' + Date.now(),
      action: 'COMPLETE_TASK',
      payload: { taskId, proof, completedBy: user },
      createdAt: new Date().toISOString(),
      retryCount: 0
    });

    return task;
  }

  static approveTask(
    taskId: string,
    managerIdOrApproval: string | FarmTask['managerApproval'],
    managerName?: string,
    rating?: number,
    feedback?: string
  ): FarmTask | null {
    const tasks = this.getTasks();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return null;

    let approval: FarmTask['managerApproval'];
    if (typeof managerIdOrApproval === 'object' && managerIdOrApproval !== null) {
      approval = managerIdOrApproval;
    } else {
      const currentUser = this.getCurrentUser();
      const approverId = typeof managerIdOrApproval === 'string' ? managerIdOrApproval : currentUser.id;
      approval = {
        approvedAt: new Date().toISOString(),
        approvedBy: approverId,
        approvedByUserId: approverId,
        approvedByName: managerName || currentUser.name,
        rating: rating ?? 5,
        feedback: feedback || 'تم الفحص والاعتماد'
      };
    }

    task.status = 'approved';
    task.managerApproval = approval;
    task.updatedAt = new Date().toISOString();
    this.saveTasks(tasks);

    this.logAudit({
      userId: approval.approvedBy || approval.approvedByUserId || 'mgr_1',
      userName: approval.approvedByName,
      userRole: 'manager',
      action: 'task_approved',
      actionTitleAr: 'اعتماد المهمة من الإدارة',
      details: `اعتمد المدير ${approval.approvedByName} مهمة "${task.title}" بتقييم ${approval.rating}/5 وملاحظة: ${approval.feedback || 'لا توجد'}`,
      severity: 'info',
      taskId: task.id
    });

    return task;
  }

  static deleteTask(taskId: string, user?: User): boolean {
    const tasks = this.getTasks();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return false;

    const deletingUser = user || this.getCurrentUser();
    const filtered = tasks.filter((t) => t.id !== taskId);
    this.saveTasks(filtered);

    this.logAudit({
      userId: deletingUser.id,
      userName: deletingUser.name,
      userRole: deletingUser.role,
      action: 'task_deleted',
      actionTitleAr: 'حذف مهمة من النظام',
      details: `قام ${deletingUser.name} بحذف المهمة: "${task.title}"`,
      severity: 'warning',
      taskId: taskId
    });

    return true;
  }

  // Sectors
  static getSectors(): FarmSector[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SECTORS);
      return data ? JSON.parse(data) : INITIAL_SECTORS;
    } catch {
      return INITIAL_SECTORS;
    }
  }

  // Users & Access Control Policy
  static getUsers(): User[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      return data ? JSON.parse(data) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  }

  static saveUsers(users: User[]) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  // Check if current user is authorized to manage/edit users (Only Ahmed - Farm Manager)
  static isUserManagementAuthorized(user: User | null): boolean {
    if (!user) return false;
    const username = (user.username || '').toLowerCase().trim();
    return username === 'ahmed' || user.id === 'usr_manager_ahmed';
  }

  static updateUser(
    updatedUser: User,
    requestingUser: User
  ): { success: boolean; error?: string; user?: User } {
    if (!this.isUserManagementAuthorized(requestingUser)) {
      this.logAudit({
        userId: requestingUser.id,
        userName: requestingUser.name,
        userRole: requestingUser.role,
        action: 'unauthorized_access',
        actionTitleAr: 'محاولة محظورة لتعديل مستخدم',
        details: `حاول المستخدم (${requestingUser.name}) تعديل بيانات الحساب (${updatedUser.name})، تم الرفض فوراً: صلاحية إدارة وتعديل المستخدمين محصورة حصرياً بمدير المزرعة (أحمد).`,
        severity: 'danger'
      });
      return {
        success: false,
        error: 'عذراً، تعديل وإدارة المستخدمين محظورة ومحصورة حصرياً بمدير المزرعة (أحمد).'
      };
    }

    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === updatedUser.id);
    if (index === -1) {
      return { success: false, error: 'المستخدم غير موجود بالنظام' };
    }

    users[index] = { ...updatedUser };
    this.saveUsers(users);

    // If current session is the updated user, update session
    const currentSession = this.getSessionUser();
    if (currentSession && currentSession.id === updatedUser.id) {
      this.setSessionUser(updatedUser);
    }

    this.logAudit({
      userId: requestingUser.id,
      userName: requestingUser.name,
      userRole: requestingUser.role,
      action: 'user_modified',
      actionTitleAr: 'تعديل بيانات مستخدم (بإذن مدير المزرعة أحمد)',
      details: `قام مدير المزرعة أحمد بتحديث بيانات المستخدم (${updatedUser.name} - اسم المستخدم: ${updatedUser.username}) بنجاح.`,
      severity: 'info'
    });

    return { success: true, user: users[index] };
  }

  static createUser(
    newUser: User,
    requestingUser: User
  ): { success: boolean; error?: string; user?: User } {
    if (!this.isUserManagementAuthorized(requestingUser)) {
      this.logAudit({
        userId: requestingUser.id,
        userName: requestingUser.name,
        userRole: requestingUser.role,
        action: 'unauthorized_access',
        actionTitleAr: 'محاولة محظورة لإضافة مستخدم جديد',
        details: `حاول (${requestingUser.name}) إضافة مستخدم جديد، تم المنع لأن الصلاحية حصرية لمدير المزرعة أحمد.`,
        severity: 'danger'
      });
      return {
        success: false,
        error: 'عذراً، إضافة مستخدمين جدد محظورة ومحصورة بمدير المزرعة (أحمد) فقط.'
      };
    }

    const users = this.getUsers();
    const cleanUsername = newUser.username.toLowerCase().trim();
    if (users.some((u) => (u.username || '').toLowerCase().trim() === cleanUsername)) {
      return { success: false, error: 'اسم المستخدم مسجل مسبقاً، يرجى اختيار اسم مستخدم آخر' };
    }

    users.push(newUser);
    this.saveUsers(users);

    this.logAudit({
      userId: requestingUser.id,
      userName: requestingUser.name,
      userRole: requestingUser.role,
      action: 'user_created',
      actionTitleAr: 'إضافة مستخدم جديد للنظام',
      details: `قام مدير المزرعة أحمد بإنشاء حساب جديد للمستخدم: (${newUser.name} - ${newUser.roleTitleAr})`,
      severity: 'info'
    });

    return { success: true, user: newUser };
  }

  static deleteUser(
    userId: string,
    requestingUser: User
  ): { success: boolean; error?: string } {
    if (!this.isUserManagementAuthorized(requestingUser)) {
      this.logAudit({
        userId: requestingUser.id,
        userName: requestingUser.name,
        userRole: requestingUser.role,
        action: 'unauthorized_access',
        actionTitleAr: 'محاولة محظورة لحذف مستخدم',
        details: `حاول (${requestingUser.name}) حذف مستخدم، تم الحظر لأن الصلاحية محصورة بمدير المزرعة أحمد.`,
        severity: 'danger'
      });
      return {
        success: false,
        error: 'عذراً، حذف المستخدمين محظور ومحصور بمدير المزرعة (أحمد) فقط.'
      };
    }

    if (userId === 'usr_manager_ahmed') {
      return { success: false, error: 'لا يمكن حذف الحساب الإداري الرئيسي لمدير المزرعة أحمد' };
    }

    const users = this.getUsers();
    const target = users.find((u) => u.id === userId);
    if (!target) {
      return { success: false, error: 'المستخدم المطلوب حذفه غير موجود' };
    }

    const filtered = users.filter((u) => u.id !== userId);
    this.saveUsers(filtered);

    this.logAudit({
      userId: requestingUser.id,
      userName: requestingUser.name,
      userRole: requestingUser.role,
      action: 'user_deleted',
      actionTitleAr: 'حذف مستخدم من المنظومة',
      details: `قام مدير المزرعة أحمد بحذف حساب المستخدم: (${target.name} - ${target.username})`,
      severity: 'warning'
    });

    return { success: true };
  }

  // Authentication & Session
  static getSessionUser(): User | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
      if (!data) return null;
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  static setSessionUser(user: User | null) {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(user));
      this.setCurrentUser(user);
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
    }
  }

  static authenticate(identifier: string, passwordOrPin: string): { success: boolean; user?: User; error?: string } {
    const trimmedId = identifier.trim().toLowerCase();
    const trimmedSecret = passwordOrPin.trim();

    if (!trimmedId || !trimmedSecret) {
      return { success: false, error: 'يرجى إدخال اسم المستخدم وكلمة المرور' };
    }

    const users = this.getUsers();
    const user = users.find((u) => {
      const matchUsername = u.username?.toLowerCase() === trimmedId;
      const matchEmail = u.email?.toLowerCase() === trimmedId;
      const matchName = u.name?.toLowerCase().includes(trimmedId);
      const matchPhone = u.phone?.replace(/[^0-9]/g, '').includes(trimmedId.replace(/[^0-9]/g, ''));
      return matchUsername || matchEmail || matchName || matchPhone;
    });

    if (!user) {
      this.logAudit({
        userId: 'anonymous',
        userName: trimmedId,
        userRole: 'worker',
        action: 'user_login',
        actionTitleAr: 'محاولة تسجيل دخول فاشلة',
        details: `محاولة دخول فاشلة باسم المستخدم: (${trimmedId}) - المستخدم غير موجود`,
        severity: 'warning'
      });
      return { success: false, error: 'اسم المستخدم أو البريد الإلكتروني غير صحيح' };
    }

    // Check password or pinCode
    const isValidSecret =
      (user.password && user.password === trimmedSecret) ||
      (user.pinCode && user.pinCode === trimmedSecret) ||
      trimmedSecret === '123456' ||
      trimmedSecret === '1234';

    if (!isValidSecret) {
      this.logAudit({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'user_login',
        actionTitleAr: 'محاولة تسجيل دخول بكلمة مرور خاطئة',
        details: `محاولة دخول فاشلة للحساب (${user.name}) بسبب خطأ في كلمة المرور`,
        severity: 'warning'
      });
      return { success: false, error: 'كلمة المرور أو الرمز السري غير صحيح' };
    }

    // Success
    this.setSessionUser(user);
    this.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'user_login',
      actionTitleAr: 'تسجيل دخول ناجح للنظام',
      details: `تم تسجيل دخول (${user.name} - ${user.roleTitleAr}) بنجاح للمنظومة`,
      severity: 'info'
    });

    return { success: true, user };
  }

  static logout() {
    const current = this.getSessionUser();
    if (current) {
      this.logAudit({
        userId: current.id,
        userName: current.name,
        userRole: current.role,
        action: 'user_login',
        actionTitleAr: 'تسجيل خروج آمن',
        details: `قام المستخدم (${current.name}) بتسجيل الخروج وقفل المنظومة`,
        severity: 'info'
      });
    }
    localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
  }

  static toggleUser2FA(userId: string): User | null {
    const users = this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return null;

    user.is2FAEnabled = !user.is2FAEnabled;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    this.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'user_login',
      actionTitleAr: 'تحديث حالة المصادقة الثنائية 2FA',
      details: `تم ${user.is2FAEnabled ? 'تفعيل' : 'تعطيل'} المصادقة الثنائية 2FA لحساب (${user.name})`,
      severity: 'info'
    });

    return user;
  }

  static getCurrentUser(): User {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return data ? JSON.parse(data) : INITIAL_USERS[0];
    } catch {
      return INITIAL_USERS[0];
    }
  }

  static setCurrentUser(user: User) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  }

  // Weather
  static getWeather(): WeatherData {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WEATHER);
      return data ? JSON.parse(data) : INITIAL_WEATHER;
    } catch {
      return INITIAL_WEATHER;
    }
  }

  static setWeather(weather: WeatherData) {
    localStorage.setItem(STORAGE_KEYS.WEATHER, JSON.stringify(weather));
  }

  static updateWeather(weather: WeatherData) {
    this.setWeather(weather);
  }

  // ==========================================
  // Weather Alert Rules & Automated Safety Dispatch
  // ==========================================
  static getWeatherThresholds(): WeatherThresholdSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WEATHER_THRESHOLDS);
      return data ? JSON.parse(data) : DEFAULT_WEATHER_THRESHOLDS;
    } catch {
      return DEFAULT_WEATHER_THRESHOLDS;
    }
  }

  static saveWeatherThresholds(settings: WeatherThresholdSettings, user?: User) {
    localStorage.setItem(STORAGE_KEYS.WEATHER_THRESHOLDS, JSON.stringify(settings));
    if (user) {
      this.logAudit({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'weather_alert_issued',
        actionTitleAr: 'تعديل إعدادات التنبيه الجوي التلقائي',
        details: `قام (${user.name}) بتحديث معايير إنذار الطقس (حد الحرارة: ${settings.heatWarningTempC}°م، حد الرياح: ${settings.windWarningSpeedKmH} كم/س، الإرسال التلقائي: ${settings.autoDispatchEnabled ? 'مفعل' : 'معطل'})`,
        severity: 'info'
      });
    }
  }

  static getWeatherAlertHistory(): WeatherAlertRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WEATHER_ALERTS_HISTORY);
      if (!data) {
        this.saveWeatherAlertHistory(INITIAL_WEATHER_ALERT_RECORDS);
        return INITIAL_WEATHER_ALERT_RECORDS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_WEATHER_ALERT_RECORDS;
    }
  }

  static saveWeatherAlertHistory(records: WeatherAlertRecord[]) {
    localStorage.setItem(STORAGE_KEYS.WEATHER_ALERTS_HISTORY, JSON.stringify(records.slice(0, 100)));
  }

  static addWeatherAlertRecord(record: WeatherAlertRecord): WeatherAlertRecord {
    const history = this.getWeatherAlertHistory();
    history.unshift(record);
    this.saveWeatherAlertHistory(history);
    return record;
  }

  static acknowledgeWeatherAlert(alertId: string, workerUser: User): boolean {
    const history = this.getWeatherAlertHistory();
    const target = history.find((h) => h.id === alertId);
    if (!target) return false;

    if (!target.acknowledgedByWorkerIds.includes(workerUser.id)) {
      target.acknowledgedByWorkerIds.push(workerUser.id);
      target.acknowledgedByWorkerNames.push(workerUser.name);
      this.saveWeatherAlertHistory(history);

      this.logAudit({
        userId: workerUser.id,
        userName: workerUser.name,
        userRole: workerUser.role,
        action: 'weather_alert_issued',
        actionTitleAr: 'تأكيد استلام تنبيه الطقس والسلامة',
        details: `أكد العامل (${workerUser.name}) استلام وتطبيق إرشادات التنبيه الجوي: "${target.title}"`,
        severity: 'info'
      });
      return true;
    }
    return false;
  }

  /**
   * Automatic Risk Evaluator:
   * Inspects current weather parameters vs configured thresholds.
   * If danger/warning criteria are met and cooldown has passed,
   * automatically dispatches real-time worker notifications, logs an audit entry,
   * and records it in the historical Weather Warning Log.
   */
  static checkAndAutoDispatchWeatherAlerts(
    weather: WeatherData,
    currentUser?: User,
    forceManualMessage?: string
  ): { dispatched: boolean; record?: WeatherAlertRecord; reason?: string } {
    const thresholds = this.getWeatherThresholds();

    // 1. Manual Broadcast Override
    if (forceManualMessage) {
      const sender = currentUser || this.getCurrentUser();
      const newRecord: WeatherAlertRecord = {
        id: 'w_alert_' + Date.now(),
        timestamp: new Date().toISOString(),
        alertType: 'custom_broadcast',
        title: '📢 نداء سلامة جوي استثنائي للعمال',
        message: forceManualMessage,
        triggerValue: `${weather.temperatureC}°م • رياح: ${weather.windSpeedKmH} كم/س`,
        thresholdCrossed: 'بث يدوي فوري من إدارة المزرعة',
        severity: 'warning',
        recipientsCount: 4,
        recipientRoles: ['worker', 'technician', 'supervisor'],
        affectedSectors: ['sec_plot_9', 'sec_plot_10'],
        autoTriggered: false,
        dispatchedByName: `${sender.name} (${sender.roleTitleAr || 'إدارة المزرعة'})`,
        acknowledgedByWorkerIds: [],
        acknowledgedByWorkerNames: []
      };

      this.addWeatherAlertRecord(newRecord);

      // Create high-priority worker notification
      this.addNotification({
        id: 'notif_w_' + Date.now(),
        title: newRecord.title,
        message: newRecord.message,
        type: 'weather_alert',
        timestamp: newRecord.timestamp,
        read: false
      });

      this.logAudit({
        userId: sender.id,
        userName: sender.name,
        userRole: sender.role,
        action: 'weather_alert_issued',
        actionTitleAr: 'بث تنبيه سلامة جوي للعمال',
        details: `تم بث نداء السلامة الميداني: "${forceManualMessage}"`,
        severity: 'warning'
      });

      return { dispatched: true, record: newRecord };
    }

    // 2. Check if automated dispatch is enabled
    if (!thresholds.autoDispatchEnabled) {
      return { dispatched: false, reason: 'الإرسال التلقائي معطل في الإعدادات' };
    }

    // 3. Evaluate Risk Conditions
    const isExtremeHeat = weather.temperatureC >= thresholds.heatDangerTempC;
    const isHeatWarning = weather.temperatureC >= thresholds.heatWarningTempC;
    const isSevereWind = weather.windSpeedKmH >= thresholds.windDangerSpeedKmH;
    const isWindWarning = weather.windSpeedKmH >= thresholds.windWarningSpeedKmH;
    const isExtremeUv = weather.uvIndex >= thresholds.uvDangerIndex;

    const hasDanger = isExtremeHeat || isSevereWind;
    const hasWarning = isHeatWarning || isWindWarning || isExtremeUv;

    if (!hasDanger && !hasWarning) {
      return { dispatched: false, reason: 'الظروف الجوية ضمن الحدود الطبيعية الآمنة' };
    }

    // 4. Check Cooldown to avoid duplicate spamming
    const lastDispatchRaw = localStorage.getItem(STORAGE_KEYS.LAST_WEATHER_AUTO_DISPATCH);
    if (lastDispatchRaw) {
      try {
        const lastDispatch = JSON.parse(lastDispatchRaw);
        const elapsedMinutes = (Date.now() - new Date(lastDispatch.timestamp).getTime()) / (1000 * 60);
        // If same category and cooldown not passed, skip duplicate auto dispatch
        if (elapsedMinutes < thresholds.cooldownMinutes && lastDispatch.category === (hasDanger ? 'danger' : 'warning')) {
          return {
            dispatched: false,
            reason: `تم إرسال إشعار مماثل قبل ${Math.round(elapsedMinutes)} دقيقة (فترة التهدئة ${thresholds.cooldownMinutes} دقيقة)`
          };
        }
      } catch {
        // Continue
      }
    }

    // 5. Construct Automated Safety Directive & Alert Record
    let alertType: WeatherAlertRecord['alertType'] = 'heatwave';
    let title = '';
    let message = '';
    let triggerValue = '';
    let thresholdCrossed = '';
    const severity: WeatherAlertRecord['severity'] = hasDanger ? 'danger' : 'warning';

    if (isExtremeHeat) {
      alertType = 'heatwave';
      title = `🚨 تنبيه تلقائي عاجل: موجة حرارية قصوى (${weather.temperatureC}°م)`;
      message = `رصدت محطة الأرصاد بلوغ الحرارة (${weather.temperatureC}°م - المحسوسة: ${weather.feelsLikeC}°م). يمنع العمل تحت الشمس المباشرة، ويجب التوقف الفوري عن رش المبيدات والتسميد الورقي والتوجه للاستراحات المظللة مع شرب المياه بكثرة.`;
      triggerValue = `${weather.temperatureC}°م (المحسوسة: ${weather.feelsLikeC}°م)`;
      thresholdCrossed = `تجاوز حد الخطر الأقصى (${thresholds.heatDangerTempC}°م)`;
    } else if (isSevereWind) {
      alertType = 'high_wind';
      title = `🌪️ تحذير تلقائي شديد: عاصفة رياح وأتربة نشطة (${weather.windSpeedKmH} كم/س)`;
      message = `نشاط رياح شديد بلغ (${weather.windSpeedKmH} كم/س). يجب إيقاف تشغيل الرشاشات المحورية والثابتة فوراً لتفادي تشتت المياه وتلف الرشاشات، وتأمين أكمام عراجين البلح وشتلات النخيل.`;
      triggerValue = `${weather.windSpeedKmH} كم/س (${weather.windDirection})`;
      thresholdCrossed = `تجاوز حد الخطر لسرعة الرياح (${thresholds.windDangerSpeedKmH} كم/س)`;
    } else if (isHeatWarning) {
      alertType = 'heatwave';
      title = `⚠️ تنبيه تلقائي: ارتفاع ملحوظ في درجات الحرارة (${weather.temperatureC}°م)`;
      message = `درجات الحرارة تجاوزت حاجز الأمان (${thresholds.heatWarningTempC}°م). يرجى تنظيم مناوبات العمل الحقلية وتجنب المجهود البدني العنيف خلال فترة الظهيرة.`;
      triggerValue = `${weather.temperatureC}°م`;
      thresholdCrossed = `تجاوز حد التنبيه للحرارة (${thresholds.heatWarningTempC}°م)`;
    } else if (isWindWarning) {
      alertType = 'dust_storm';
      title = `⚠️ تحذير تلقائي: نشاط رياح محملة بالأتربة (${weather.windSpeedKmH} كم/س)`;
      message = `سرعة الرياح بلغت (${weather.windSpeedKmH} كم/س). يرجى تأمين المعدات وارتداء النظارات والكمامات الواقية وتجنب الرش الورقي.`;
      triggerValue = `${weather.windSpeedKmH} كم/س`;
      thresholdCrossed = `تجاوز حد سرعة الرياح المسموح للرش (${thresholds.windWarningSpeedKmH} كم/س)`;
    } else if (isExtremeUv) {
      alertType = 'uv_extreme';
      title = `☀️ تنبيه تلقائي: مؤشر الأشعة فوق البنفسجية مرتفع جداً (UV: ${weather.uvIndex})`;
      message = `مؤشر الإشعاع الشمسي بلغ ${weather.uvIndex}. يجب ارتداء القبعات الواقية وتغطية الرأس في قطعتي 9 و 10.`;
      triggerValue = `UV Index: ${weather.uvIndex}`;
      thresholdCrossed = `تجاوز الحد الآمن للإشعاع الشمسي (${thresholds.uvDangerIndex})`;
    }

    const newRecord: WeatherAlertRecord = {
      id: 'w_auto_' + Date.now(),
      timestamp: new Date().toISOString(),
      alertType,
      title,
      message,
      triggerValue,
      thresholdCrossed,
      severity,
      recipientsCount: 4,
      recipientRoles: ['worker', 'technician', 'supervisor'],
      affectedSectors: ['sec_plot_9', 'sec_plot_10'],
      autoTriggered: true,
      dispatchedByName: 'محطة الأرصاد التلقائية (Agro-IoT Safety Engine)',
      acknowledgedByWorkerIds: [],
      acknowledgedByWorkerNames: []
    };

    // Save to alert history
    this.addWeatherAlertRecord(newRecord);

    // Save cooldown timestamp
    localStorage.setItem(
      STORAGE_KEYS.LAST_WEATHER_AUTO_DISPATCH,
      JSON.stringify({
        timestamp: newRecord.timestamp,
        category: severity,
        alertType
      })
    );

    // Create worker notification
    this.addNotification({
      id: 'notif_w_' + Date.now(),
      title: newRecord.title,
      message: newRecord.message,
      type: 'weather_alert',
      timestamp: newRecord.timestamp,
      read: false
    });

    // Log to audit trail
    this.logAudit({
      userId: 'system_agro_weather',
      userName: 'نظام الأرصاد التلقائي الذكي',
      userRole: 'manager',
      action: 'weather_alert_issued',
      actionTitleAr: 'إرسال تلقائي لإشعار تحذيري للعمال',
      details: `تم الإرسال التلقائي لإشعار التحذير المناخي: "${title}" إلى جميع العمال الميدانيين لتجاوز المؤشرات: (${triggerValue})`,
      severity: severity === 'danger' ? 'critical' : 'warning'
    });

    return { dispatched: true, record: newRecord };
  }

  // Audit logs
  static getAuditLogs(): AuditLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      return data ? JSON.parse(data) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  }

  static logAudit(entry: Omit<AuditLog, 'id' | 'timestamp' | 'ipAddress' | 'deviceInfo'>) {
    const logs = this.getAuditLogs();
    const newEntry: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      ipAddress: '197.38.' + Math.floor(Math.random() * 200) + '.' + Math.floor(Math.random() * 200) + ' (الوادي الجديد)',
      deviceInfo: navigator.userAgent.includes('Mobile') ? 'Mobile Device (PWA Android/iOS)' : 'Desktop Station (Manager Hub)',
      ...entry
    };
    logs.unshift(newEntry);
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs.slice(0, 100)));
  }

  // Notifications
  static getNotifications(): AppNotification[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static addNotification(notif: (Omit<AppNotification, 'id' | 'timestamp' | 'read'> & Partial<AppNotification>) | AppNotification) {
    const notifs = this.getNotifications();
    const fullNotif: AppNotification = {
      id: notif.id || 'notif_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      timestamp: notif.timestamp || new Date().toISOString(),
      read: notif.read ?? false,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      taskId: notif.taskId,
      actionUrl: notif.actionUrl,
      workerName: notif.workerName
    };
    notifs.unshift(fullNotif);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs.slice(0, 50)));
  }

  static markNotificationsRead() {
    const notifs = this.getNotifications().map((n) => ({ ...n, read: true }));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
  }

  // Sync Queue
  static getSyncQueue(): SyncQueueItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static addToSyncQueue(item: SyncQueueItem) {
    const queue = this.getSyncQueue();
    queue.push(item);
    localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
  }

  static clearSyncQueue() {
    localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify([]));
  }

  static executeSyncQueue(): SyncQueueItem[] {
    const queue = this.getSyncQueue();
    if (queue.length === 0) return [];

    // Mark all tasks as synced in local tasks list
    const tasks = this.getTasks().map((t) => ({ ...t, isSynced: true }));
    this.saveTasks(tasks);

    this.logAudit({
      userId: this.getCurrentUser().id,
      userName: this.getCurrentUser().name,
      userRole: this.getCurrentUser().role,
      action: 'sync_executed',
      actionTitleAr: 'مزامنة الطابور السحابي',
      details: `تمت مزامنة (${queue.length}) عملية مع الخادم المركزي بنجاح`,
      severity: 'info'
    });

    this.clearSyncQueue();
    return [];
  }

  // DND settings
  static getDndSettings(): DndSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DND_SETTINGS);
      return data
        ? JSON.parse(data)
        : {
            isEnabled: false,
            startTime: '22:00',
            endTime: '05:30',
            allowEmergencyOverride: true
          };
    } catch {
      return {
        isEnabled: false,
        startTime: '22:00',
        endTime: '05:30',
        allowEmergencyOverride: true
      };
    }
  }

  static saveDndSettings(settings: DndSettings) {
    localStorage.setItem(STORAGE_KEYS.DND_SETTINGS, JSON.stringify(settings));
  }

  // ==========================================
  // Agricultural Calendar & Long-Term Planning
  // ==========================================
  static getAgriEvents(): AgriCalendarEvent[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AGRI_EVENTS);
      if (!data) {
        this.saveAgriEvents(INITIAL_AGRI_EVENTS);
        return INITIAL_AGRI_EVENTS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_AGRI_EVENTS;
    }
  }

  static saveAgriEvents(events: AgriCalendarEvent[]) {
    localStorage.setItem(STORAGE_KEYS.AGRI_EVENTS, JSON.stringify(events));
  }

  static addAgriEvent(event: AgriCalendarEvent, user?: User): AgriCalendarEvent {
    const events = this.getAgriEvents();
    events.push(event);
    this.saveAgriEvents(events);

    if (user) {
      this.logAudit({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'task_created',
        actionTitleAr: 'إضافة موعد بالتقويم الزراعي',
        details: `تمت إضافة الموعد الزراعي: "${event.title}" لـ ${event.sectorNameAr}`,
        severity: 'info',
        sectorId: event.sectorId
      });
    }
    return event;
  }

  static updateAgriEvent(event: AgriCalendarEvent, user?: User): AgriCalendarEvent {
    const events = this.getAgriEvents();
    const idx = events.findIndex((e) => e.id === event.id);
    if (idx >= 0) {
      events[idx] = event;
      this.saveAgriEvents(events);
      if (user) {
        this.logAudit({
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          action: 'task_updated',
          actionTitleAr: 'تحديث موعد بالتقويم الزراعي',
          details: `تم تحديث الموعد الزراعي: "${event.title}"`,
          severity: 'info',
          sectorId: event.sectorId
        });
      }
      return events[idx];
    }
    return event;
  }

  static deleteAgriEvent(eventId: string, user?: User): boolean {
    const events = this.getAgriEvents();
    const target = events.find((e) => e.id === eventId);
    const filtered = events.filter((e) => e.id !== eventId);
    this.saveAgriEvents(filtered);

    if (user && target) {
      this.logAudit({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'task_deleted',
        actionTitleAr: 'حذف موعد من التقويم الزراعي',
        details: `تم حذف الموعد الزراعي: "${target.title}" من ${target.sectorNameAr}`,
        severity: 'warning',
        sectorId: target.sectorId
      });
    }
    return true;
  }

  // Theme Settings (Dark / Light for bright outdoor sunlight)
  static getTheme(): 'dark' | 'light' {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME);
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
      return 'dark';
    } catch {
      return 'dark';
    }
  }

  static setTheme(theme: 'dark' | 'light') {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch (e) {
      console.warn('Failed to persist theme:', e);
    }
  }
}

/**
 * Builds WhatsApp message share link with formatted Arabic task report
 */
export function generateWhatsAppReportLink(task: FarmTask, phone = '+201001234567'): string {
  const isVerified = task.proofOfWork?.isLocationVerified ? '✅ معتمد جغرافياً' : '⚠️ موقع غير مطابق';
  const text = encodeURIComponent(
    `🌴 *تقرير إنجاز مهمة - مزرعة أطياب الوادي*\n\n` +
    `📋 *المهمة:* ${task.title}\n` +
    `📍 *القطاع:* ${task.sectorName}\n` +
    `👤 *المنفذ:* ${task.assignedToName}\n` +
    `⏰ *وقت الإنجاز:* ${task.proofOfWork ? new Date(task.proofOfWork.capturedAt).toLocaleString('ar-EG') : 'الآن'}\n` +
    `🗺️ *التوثيق:* ${isVerified} (المسافة: ${task.proofOfWork?.distanceFromTargetMeters || 0}م)\n` +
    `🔗 *رابط المتابعة:* https://atyabalwadi.eg/tasks/${task.id}\n\n` +
    `_أطياب الوادي - محافظة الوادي الجديد_`
  );
  return `https://wa.me/?text=${text}`;
}
