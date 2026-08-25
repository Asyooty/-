import {
  FarmSector,
  FarmTask,
  User,
  WeatherData,
  AuditLog,
  WeatherAlertRecord,
  WeatherThresholdSettings
} from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr_manager_ayman',
    name: 'دكتور ايمن (مدير المزرعة)',
    role: 'manager',
    roleTitleAr: 'مدير عام المزرعة واستشاري الإدارة',
    phone: '+201009988776',
    email: 'ayman@atyabalwadi.eg',
    username: 'ayman',
    password: 'ayman123',
    is2FAEnabled: true,
    pinCode: '1234'
  },
  {
    id: 'usr_manager_ahmed',
    name: 'احمد (مدير المزرعة)',
    role: 'manager',
    roleTitleAr: 'مدير المزرعة (المسؤول الحصري عن إدارة وتعديل المستخدمين)',
    phone: '+201001234567',
    email: 'ahmed@atyabalwadi.eg',
    username: 'ahmed',
    password: 'ahmed123',
    is2FAEnabled: true,
    pinCode: '1234'
  },
  {
    id: 'usr_manager_islam',
    name: 'اسلام (مدير المزرعة)',
    role: 'manager',
    roleTitleAr: 'مدير تنفيذي وتخطيط زراعي',
    phone: '+201002345678',
    email: 'islam@atyabalwadi.eg',
    username: 'islam',
    password: 'islam123',
    is2FAEnabled: true,
    pinCode: '5678'
  },
  {
    id: 'usr_engineer',
    name: 'المهندس الزراعي',
    role: 'supervisor',
    roleTitleAr: 'مهندس زراعي عام ومكافحة آفات',
    phone: '+201098765432',
    email: 'engineer@atyabalwadi.eg',
    username: 'engineer',
    password: 'eng123',
    is2FAEnabled: false,
    pinCode: '2345'
  },
  {
    id: 'usr_supervisor',
    name: 'المشرف الميداني',
    role: 'supervisor',
    roleTitleAr: 'مشرف عمليات ميدانية وتدقيق GPS',
    phone: '+201011223344',
    email: 'supervisor@atyabalwadi.eg',
    username: 'supervisor',
    password: 'sup123',
    is2FAEnabled: false,
    pinCode: '3456'
  },
  {
    id: 'usr_worker_alaa',
    name: 'علاء شعبان (عامل تشغيل)',
    role: 'worker',
    roleTitleAr: 'عامل تشغيل وصيانة شبكات ري',
    phone: '+201112233445',
    email: 'alaa@atyabalwadi.eg',
    username: 'alaa',
    password: 'alaa123',
    assignedSectorId: 'sec_plot_9',
    is2FAEnabled: false,
    pinCode: '4567'
  },
  {
    id: 'usr_worker_taha',
    name: 'احمد طه (عامل تشغيل)',
    role: 'worker',
    roleTitleAr: 'عامل تشغيل وغرس وتسميد',
    phone: '+201155667788',
    email: 'ahmed_taha@atyabalwadi.eg',
    username: 'ahmed_taha',
    password: 'taha123',
    assignedSectorId: 'sec_plot_10',
    is2FAEnabled: false,
    pinCode: '5678'
  }
];

// New Valley Governorate (Kharga/Dakhla oasis region center: ~25.44°N, 30.55°E)
export const INITIAL_SECTORS: FarmSector[] = [
  {
    id: 'sec_plot_9',
    nameAr: 'قطعة رقم 9 - برسيم حجازي',
    code: 'PLOT-09-ALFALFA',
    type: 'alfalfa',
    typeAr: 'برسيم حجازي (علفي تصديري)',
    centerCoordinates: { lat: 25.4420, lng: 30.5515 },
    polygon: [
      { lat: 25.4445, lng: 30.5485 },
      { lat: 25.4448, lng: 30.5545 },
      { lat: 25.4395, lng: 30.5548 },
      { lat: 25.4392, lng: 30.5482 }
    ],
    areaFeddan: 10,
    targetPlantingDate: 'أكتوبر 2026 (10-2026)',
    wellsCount: 1,
    irrigationType: 'sprinkler',
    notes: 'المساحة: 10 فدان • مستهدف الزراعة: أكتوبر 2026 • محصول برسيم حجازي عالي البروتين • تجهيز شبكة الرش وتسميد الخدمة الشتوية'
  },
  {
    id: 'sec_plot_10',
    nameAr: 'قطعة رقم 10 - نخيل صعيدي',
    code: 'PLOT-10-SAIDI-PALM',
    type: 'date_palm_saidi',
    typeAr: 'نخيل صعيدي (سيوي فاخر)',
    centerCoordinates: { lat: 25.4385, lng: 30.5605 },
    polygon: [
      { lat: 25.4410, lng: 30.5575 },
      { lat: 25.4412, lng: 30.5635 },
      { lat: 25.4360, lng: 30.5638 },
      { lat: 25.4358, lng: 30.5572 }
    ],
    areaFeddan: 10,
    plantsCount: 650,
    targetPlantingDate: 'مارس 2027 (03-2027)',
    wellsCount: 1,
    irrigationType: 'drip',
    notes: 'المساحة: 10 فدان • مستهدف الزراعة: مارس 2027 • غرس 650 نخلة صعيدي (سيوي) • حفر وتخمير الجور وشبكة التنقيط المزدوجة'
  },
  {
    id: 'sec_water_basin',
    nameAr: 'بركة المياه (حوض التخزين الاستراتيجي)',
    code: 'WATER-BASIN-65X65',
    type: 'water_basin',
    typeAr: 'بركة مياه استراتيجية (تخزين وخلط)',
    centerCoordinates: { lat: 25.4402, lng: 30.5560 },
    polygon: [
      { lat: 25.4408, lng: 30.5552 },
      { lat: 25.4408, lng: 30.5568 },
      { lat: 25.4396, lng: 30.5568 },
      { lat: 25.4396, lng: 30.5552 }
    ],
    areaFeddan: 1.01,
    dimensions: '65 × 65 متر',
    depthMeters: 5,
    capacityM3: 21125,
    wellsCount: 1,
    irrigationType: 'drip',
    notes: 'الأبعاد: 65×65 م • العمق: 5 أمتار • السعة التخزينية: 21,125 م³ (متر مكعب) • خزان وبحيرة أرضية مبطنة لترسيب وتدفئة وضخ مياه الري الجوفية'
  }
];

export const INITIAL_TASKS: FarmTask[] = [];

export const INITIAL_WEATHER: WeatherData = {
  locationName: 'مزرعة أطياب الوادي - واحة الخارجة',
  governorate: 'محافظة الوادي الجديد',
  region: 'الواحات الجنوبية - مصر',
  temperatureC: 33.0,
  feelsLikeC: 34.0,
  humidityPercent: 24,
  windSpeedKmH: 14,
  windDirection: 'شمالية معتدلة',
  uvIndex: 6,
  evapotranspirationMmDay: 6.0,
  conditionAr: 'طقس معتدل ومناسب للعمليات الحقلية',
  conditionCode: 'sunny',
  updatedAt: new Date().toISOString(),
  alerts: []
};

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log_01',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    userId: 'usr_worker_alaa',
    userName: 'علاء شعبان (عامل تشغيل)',
    userRole: 'worker',
    action: 'task_completed',
    actionTitleAr: 'إنجاز مهمة وتوثيق جغرافي',
    details: 'أتم مهمة صيانة محبس التغذية الرئيسي مع رفع صورة وبصمة GPS مطابقة بنسبة 100% (المسافة 12.2 م)',
    ipAddress: '197.38.12.94 (شريحة فودافون مصر - الوادي)',
    deviceInfo: 'Samsung Galaxy A54 (Android 14) / Mobile WebApp',
    severity: 'info',
    sectorId: 'sec_plot_9',
    taskId: 'tsk_103'
  },
  {
    id: 'log_02',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    userId: 'usr_manager_ahmed',
    userName: 'احمد (مدير المزرعة)',
    userRole: 'manager',
    action: 'task_approved',
    actionTitleAr: 'اعتماد وتقييم إداري',
    details: 'اعتمد إنجاز مهمة شبكة الري ومنح تقييم 5/5 مع توجيه شكر للعامل',
    ipAddress: '156.204.88.12 (الخارجة - إدارة المزرعة)',
    deviceInfo: 'Apple iPad Pro (iOS 17) / Web Portal',
    severity: 'info',
    taskId: 'tsk_103'
  },
  {
    id: 'log_03',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    userId: 'usr_manager_ayman',
    userName: 'دكتور ايمن (مدير المزرعة)',
    userRole: 'manager',
    action: 'task_created',
    actionTitleAr: 'إنشاء وتعيين مهمة عاجلة',
    details: 'أنشأ مهمة تجهيز التربة وشبكة الرش لزراعة البرسيم الحجازي (قطعة رقم 9) مع تفعيل التنبيه الصوتي الدوري كل 30 دقيقة',
    ipAddress: '156.204.88.12',
    deviceInfo: 'Chrome Desktop / Management Console',
    severity: 'info',
    sectorId: 'sec_plot_9',
    taskId: 'tsk_101'
  }
];

export const DEFAULT_WEATHER_THRESHOLDS: WeatherThresholdSettings = {
  autoDispatchEnabled: true,
  heatWarningTempC: 40.0,
  heatDangerTempC: 43.0,
  windWarningSpeedKmH: 30.0,
  windDangerSpeedKmH: 45.0,
  uvDangerIndex: 10,
  cooldownMinutes: 45,
  soundAlertEnabled: true,
  pushNotificationEnabled: true
};

export const INITIAL_WEATHER_ALERT_RECORDS: WeatherAlertRecord[] = [
  {
    id: 'w_rec_01',
    timestamp: new Date(Date.now() - 3600000 * 2.5).toISOString(),
    alertType: 'heatwave',
    title: '🚨 تنبيه تلقائي: موجة حرارية خطرة (41.5°م)',
    message: 'تجاوزت درجات الحرارة حاجز الأمان (40°م). يرجى من جميع العمال التوقف عن الرش الكيماوي، أخذ فترات راحة مظللة، والالتزام بشرب الماء.',
    triggerValue: '41.5°م (المحسوسة: 43.8°م)',
    thresholdCrossed: 'تجاوز حد الخطر الميداني (40.0°م)',
    severity: 'danger',
    recipientsCount: 4,
    recipientRoles: ['worker', 'technician', 'supervisor'],
    affectedSectors: ['sec_plot_9', 'sec_plot_10'],
    autoTriggered: true,
    dispatchedByName: 'نظام الأرصاد التلقائي الذكي (Agro-IoT Safety Engine)',
    acknowledgedByWorkerIds: ['usr_worker_alaa', 'usr_worker_taha'],
    acknowledgedByWorkerNames: ['علاء شعبان (عامل تشغيل)', 'احمد طه (عامل تشغيل)']
  },
  {
    id: 'w_rec_02',
    timestamp: new Date(Date.now() - 3600000 * 26).toISOString(),
    alertType: 'dust_storm',
    title: '⚠️ تحذير تلقائي: نشاط رياح خماسينية محملة بالأتربة (48 كم/س)',
    message: 'سرعة الرياح بلغت 48 كم/س متجاوزة الحد الآمن للرشاشات (30 كم/س). تم التوجيه بوقف الرشاشات وتأمين شتلات النخيل وألواح الطاقة.',
    triggerValue: '48.0 كم/س (رياح جنوبية غربية)',
    thresholdCrossed: 'تجاوز حد سرعة الرياح الآمنة (30.0 كم/س)',
    severity: 'warning',
    recipientsCount: 4,
    recipientRoles: ['worker', 'technician'],
    affectedSectors: ['sec_plot_9', 'sec_plot_10'],
    autoTriggered: true,
    dispatchedByName: 'نظام الأرصاد التلقائي الذكي (Agro-IoT Safety Engine)',
    acknowledgedByWorkerIds: ['usr_worker_alaa', 'usr_worker_taha', 'usr_supervisor_hassan'],
    acknowledgedByWorkerNames: ['علاء شعبان (عامل تشغيل)', 'احمد طه (عامل تشغيل)', 'حسن مدبولي (مشرف القطاع)']
  },
  {
    id: 'w_rec_03',
    timestamp: new Date(Date.now() - 3600000 * 50).toISOString(),
    alertType: 'custom_broadcast',
    title: '📢 بث سلامة يدوي: تعليق الأعمال الشاقة في وقت الظهيرة',
    message: 'بقرار من إدارة المزرعة: تعليق حفر الجور وأعمال العزيق حتى الساعة 3:30 عصراً لتفادي الإجهاد الحراري المباشر.',
    triggerValue: '39.8°م (مؤشر UV: 11)',
    thresholdCrossed: 'قرار استثنائي من مدير المزرعة',
    severity: 'warning',
    recipientsCount: 4,
    recipientRoles: ['worker', 'technician'],
    affectedSectors: ['sec_plot_9', 'sec_plot_10'],
    autoTriggered: false,
    dispatchedByName: 'احمد (مدير المزرعة)',
    acknowledgedByWorkerIds: ['usr_worker_alaa'],
    acknowledgedByWorkerNames: ['علاء شعبان (عامل تشغيل)']
  }
];

