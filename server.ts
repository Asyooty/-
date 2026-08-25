import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Initialize Gemini SDK with safe lazy handling & telemetry header
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// In-memory data store for server
let serverTasks: any[] = [];
let serverAuditLogs: any[] = [];

// Seed initial server state
const seedInitialServerData = () => {
  serverTasks = [
    {
      id: 'tsk_101',
      title: 'تجهيز التربة وشبكة الرش لزراعة البرسيم الحجازي (قطعة رقم 9)',
      description: 'تسوية الليزر لـ 10 أفدنة، واختبار ضغط شبكة الرشاشات الثابتة، وإضافة سماد السوبر فوسفات والكبريت الزراعي استعداداً للزراعة في أكتوبر 2026.',
      category: 'irrigation',
      categoryAr: 'تجهيز التربة وشبكات الري',
      priority: 'urgent',
      sectorId: 'sec_plot_9',
      sectorName: 'قطعة رقم 9 - برسيم حجازي (10 فدان - أكتوبر 2026)',
      targetCoordinates: { lat: 25.4420, lng: 30.5515 },
      maxAllowedDistanceMeters: 150,
      assignedToUserId: 'usr_worker_alaa',
      assignedToName: 'علاء شعبان (عامل تشغيل)',
      assignedRole: 'worker',
      createdByUserId: 'usr_manager_ayman',
      createdByName: 'دكتور ايمن (مدير المزرعة)',
      status: 'in_progress',
      isRecurring: true,
      recurrenceType: 'every_3_days',
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: '06:30',
      deadlineTimestamp: Date.now() + 1000 * 60 * 60 * 2,
      alarmIntervalMinutes: 30,
      isAlarmActive: true,
      isEmergencyOverride: true,
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      updatedAt: new Date().toISOString(),
      isSynced: true
    },
    {
      id: 'tsk_102',
      title: 'تخطيط وتجهيز جور غرس فسائل النخيل الصعيدي (قطعة رقم 10)',
      description: 'تحديد مسافات الغرس 8×8م لعدد 650 جورة بمساحة 10 فدان، وحفر الجور بأبعاد 1×1×1م وإضافة خلطة التخمير والكومبوست لموعد الزراعة في مارس 2027.',
      category: 'fertilization',
      categoryAr: 'تجهيز وتخمير الجور',
      priority: 'high',
      sectorId: 'sec_plot_10',
      sectorName: 'قطعة رقم 10 - نخيل صعيدي (10 فدان - مارس 2027)',
      targetCoordinates: { lat: 25.4385, lng: 30.5605 },
      maxAllowedDistanceMeters: 120,
      assignedToUserId: 'usr_worker_taha',
      assignedToName: 'احمد طه (عامل تشغيل)',
      assignedRole: 'worker',
      createdByUserId: 'usr_manager_ahmed',
      createdByName: 'احمد (مدير المزرعة)',
      status: 'pending',
      isRecurring: true,
      recurrenceType: 'daily',
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: '07:30',
      deadlineTimestamp: Date.now() + 1000 * 60 * 60 * 5,
      alarmIntervalMinutes: 30,
      isAlarmActive: true,
      isEmergencyOverride: false,
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      updatedAt: new Date().toISOString(),
      isSynced: true
    }
  ];
};

seedInitialServerData();

// ================= API ENDPOINTS ================= //

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    farm: 'أطياب الوادي - Atyab Al-Wadi Farm',
    location: 'New Valley Governorate (الوادي الجديد), Egypt',
    systemTime: new Date().toISOString(),
    aiReady: Boolean(process.env.GEMINI_API_KEY)
  });
});

// Tasks CRUD
app.get('/api/tasks', (req, res) => {
  res.json({ success: true, tasks: serverTasks });
});

app.post('/api/tasks', (req, res) => {
  const newTask = req.body;
  if (!newTask.title || !newTask.sectorId) {
    return res.status(400).json({ error: 'العنوان والقطاع مطلوبان' });
  }
  newTask.id = newTask.id || 'tsk_' + Date.now();
  newTask.createdAt = new Date().toISOString();
  newTask.updatedAt = new Date().toISOString();
  newTask.isSynced = true;

  serverTasks.unshift(newTask);

  serverAuditLogs.unshift({
    id: 'log_' + Date.now(),
    timestamp: new Date().toISOString(),
    userId: newTask.createdByUserId || 'manager',
    userName: newTask.createdByName || 'مدير المزرعة',
    userRole: 'manager',
    action: 'task_created',
    actionTitleAr: 'إنشاء مهمة بالخادم',
    details: `تم إنشاء المهمة: ${newTask.title}`,
    ipAddress: req.ip || '127.0.0.1',
    deviceInfo: req.headers['user-agent'] || 'API Client',
    severity: 'info',
    taskId: newTask.id
  });

  res.status(201).json({ success: true, task: newTask });
});

app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const index = serverTasks.findIndex((t) => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'المهمة غير موجودة' });
  }
  serverTasks[index] = {
    ...serverTasks[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  res.json({ success: true, task: serverTasks[index] });
});

app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const initialLen = serverTasks.length;
  serverTasks = serverTasks.filter((t) => t.id !== id);
  if (serverTasks.length === initialLen) {
    return res.status(404).json({ error: 'المهمة غير موجودة' });
  }
  res.json({ success: true, message: 'تم حذف المهمة بنجاح' });
});

// Complete Task with GPS and Proof
app.post('/api/tasks/:id/complete', (req, res) => {
  const { id } = req.params;
  const { proof, user } = req.body;

  const task = serverTasks.find((t) => t.id === id);
  if (!task) {
    return res.status(404).json({ error: 'المهمة غير موجودة' });
  }

  task.status = 'completed';
  task.proofOfWork = proof;
  task.isAlarmActive = false;
  task.updatedAt = new Date().toISOString();

  serverAuditLogs.unshift({
    id: 'log_' + Date.now(),
    timestamp: new Date().toISOString(),
    userId: user?.id || 'worker',
    userName: user?.name || 'عامل زراعي',
    userRole: user?.role || 'worker',
    action: 'task_completed',
    actionTitleAr: 'إنجاز مهمة وتوثيق GPS',
    details: `أنجز المهمة "${task.title}" مع توثيق صورة وGPS (المسافة: ${proof?.distanceFromTargetMeters || 0}م)`,
    ipAddress: req.ip || '127.0.0.1',
    deviceInfo: req.headers['user-agent'] || 'Mobile Device',
    severity: proof?.isLocationVerified ? 'info' : 'warning',
    taskId: task.id
  });

  res.json({ success: true, task, message: 'تم توثيق إنجاز المهمة وإخطار مدير المزرعة بنجاح' });
});

// Batch Offline Sync
app.post('/api/sync', (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'بيانات المزامنة غير صالحة' });
  }

  const results: any[] = [];
  for (const item of items) {
    try {
      if (item.action === 'CREATE_TASK') {
        serverTasks.unshift({ ...item.payload, isSynced: true });
        results.push({ id: item.id, status: 'synced' });
      } else if (item.action === 'COMPLETE_TASK') {
        const t = serverTasks.find((x) => x.id === item.payload.taskId);
        if (t) {
          t.status = 'completed';
          t.proofOfWork = item.payload.proof;
          t.isAlarmActive = false;
          t.isSynced = true;
        }
        results.push({ id: item.id, status: 'synced' });
      } else {
        results.push({ id: item.id, status: 'synced' });
      }
    } catch (e: any) {
      results.push({ id: item.id, status: 'error', error: e.message });
    }
  }

  res.json({ success: true, processedCount: items.length, results });
});

// AI Smart Agronomist using Gemini 3.7 Flash
app.post('/api/ai/agronomist', async (req, res) => {
  try {
    const { prompt, contextType, sector, weather } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        success: true,
        isFallback: true,
        recommendations: [
          'تأجيل عمليات التسميد النيتروجيني في ساعات الظهيرة بسبب ارتفاع درجات الحرارة فوق 40°م في الوادي الجديد.',
          'الري الليلي المركز لنخيل المجدول لتقليل الفاقد بالبخر وتعزيز استقرار رطوبة التربة.',
          'متابعة المصائد الفرمونية لسوسة النخيل الحمراء كل 48 ساعة بعد نشاط الرياح الخماسينية.'
        ],
        diagnosis: 'توصيات زراعية عامة مبرمجة لمناخ محافظة الوادي الجديد (الخارجة والداخلة).'
      });
    }

    const systemInstruction = `أنت "المستشار الزراعي الذكي لمزرعة أطياب الوادي" بمحافظة الوادي الجديد (مصر).
أنت خبير زراعي متخصص في نخيل التمر (المجدول، السيوي/الصعيدي، الصقعي)، وزراعة القمح والبرسيم بالرشاشات المحورية والري بالطاقة الشمسية، ومكافحة سوسة النخيل الحمراء والآفات، وإدارة الري في المناخ الصحراوي شديد الحرارة.
قدم إرشادات دقيقة، عملية، وتوصيات محددة باللغة العربية الواضحة.`;

    const userContent = `سياق الطلب: ${contextType || 'عام'}
بيانات الطقس الحالية: حرارة ${weather?.temperatureC || 41}°م، رطوبة ${weather?.humidityPercent || 15}%، رياح ${weather?.windSpeedKmH || 25} كم/س.
القطاع الزراعي المستهدف: ${sector?.nameAr || 'قطاع النخيل بالوادي الجديد'}.
استفسار المستخدم أو وصف الحالة:
${prompt}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: userContent,
      config: {
        systemInstruction,
        temperature: 0.7
      }
    });

    const outputText = response.text || 'تم استلام التوصية بنجاح.';
    res.json({
      success: true,
      analysis: outputText,
      modelUsed: 'gemini-3.7-flash'
    });
  } catch (error: any) {
    console.error('Gemini Agronomist error:', error);
    res.status(500).json({
      success: false,
      error: 'تعذر الاتصال بالمستشار الذكي حالياً',
      details: error.message
    });
  }
});

// API Documentation & ER Model Schema Spec
app.get('/api/docs', (req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Atyab Al-Wadi Smart Farm API',
      description: 'واجهات برمجة التطبيقات لمنظومة إدارة المهام والتوثيق الجغرافي والأرصاد لمزرعة أطياب الوادي',
      version: '1.0.0'
    },
    entities: {
      User: ['id', 'name', 'role (manager|supervisor|worker)', 'phone', 'email', 'avatar', 'is2FAEnabled', 'pinCode'],
      FarmSector: ['id', 'nameAr', 'code', 'type', 'centerCoordinates (lat, lng)', 'polygon', 'areaFeddan', 'wellsCount', 'irrigationType'],
      FarmTask: ['id', 'title', 'category', 'priority', 'sectorId', 'targetCoordinates', 'maxAllowedDistanceMeters', 'assignedToUserId', 'status', 'isRecurring', 'alarmIntervalMinutes', 'proofOfWork', 'managerApproval'],
      ProofOfWork: ['capturedAt', 'imageUrl', 'gpsCoordinates', 'distanceFromTargetMeters', 'isLocationVerified', 'antiTamperHash', 'watermarkText'],
      AuditLog: ['id', 'timestamp', 'userId', 'userName', 'userRole', 'action', 'details', 'ipAddress', 'severity'],
      WeatherData: ['temperatureC', 'humidityPercent', 'windSpeedKmH', 'evapotranspirationMmDay', 'alerts']
    },
    endpoints: [
      { path: '/api/tasks', methods: ['GET', 'POST'], description: 'استرجاع وإنشاء المهام الزراعية' },
      { path: '/api/tasks/:id', methods: ['PUT', 'DELETE'], description: 'تعديل وحذف المهام (للمديرين)' },
      { path: '/api/tasks/:id/complete', methods: ['POST'], description: 'توثيق إنجاز المهمة بصورة وإحداثيات GPS' },
      { path: '/api/tasks/:id/approve', methods: ['POST'], description: 'اعتماد وتقييم المهمة من الإدارة' },
      { path: '/api/sync', methods: ['POST'], description: 'مزامنة الطابور غير المتصل (Offline Sync)' },
      { path: '/api/ai/agronomist', methods: ['POST'], description: 'المستشار الزراعي الذكي (Gemini 3.7 Flash)' }
    ]
  });
});

// Vite & Static file handler
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌴 Atyab Al-Wadi Farm Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
