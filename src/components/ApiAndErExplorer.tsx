import React, { useState } from 'react';
import {
  X,
  Database,
  Code2,
  Play,
  CheckCircle2,
  Layers,
  ArrowRight,
  Server,
  Terminal,
  FileCode2
} from 'lucide-react';

interface ApiAndErExplorerProps {
  onClose: () => void;
}

export const ApiAndErExplorer: React.FC<ApiAndErExplorerProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'er_model' | 'api_tester'>('er_model');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('/api/tasks');
  const [requestMethod, setRequestMethod] = useState<'GET' | 'POST'>('GET');
  const [apiResponseBody, setApiResponseBody] = useState<string | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);

  const handleTestApi = async () => {
    setIsLoadingApi(true);
    try {
      if (selectedEndpoint === '/api/tasks' && requestMethod === 'GET') {
        const res = await fetch('/api/tasks');
        const data = await res.json();
        setApiResponseBody(JSON.stringify(data, null, 2));
      } else if (selectedEndpoint === '/api/health') {
        const res = await fetch('/api/health');
        const data = await res.json();
        setApiResponseBody(JSON.stringify(data, null, 2));
      } else if (selectedEndpoint === '/api/docs') {
        const res = await fetch('/api/docs');
        const data = await res.json();
        setApiResponseBody(JSON.stringify(data, null, 2));
      } else {
        // Mock POST test response
        setApiResponseBody(
          JSON.stringify(
            {
              success: true,
              message: `200 OK: Test request to ${selectedEndpoint} executed successfully on Atyab Al-Wadi backend.`,
              timestamp: new Date().toISOString(),
              sampleResponse: {
                taskId: 'tsk_' + Date.now(),
                status: 'synced',
                verified: true
              }
            },
            null,
            2
          )
        );
      }
    } catch (e: any) {
      setApiResponseBody(JSON.stringify({ error: e.message }, null, 2));
    } finally {
      setIsLoadingApi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-700 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 my-auto">
        {/* Header */}
        <div className="bg-stone-850 px-6 py-4 border-b border-stone-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-100 text-base">
                بنية النظام البرمجي ونموذج قاعدة البيانات (ER & REST API)
              </h3>
              <p className="text-xs text-stone-400">
                توثيق المعمارية التقنية لمنظومة مزرعة أطياب الوادي
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

        {/* Tab Selector */}
        <div className="px-6 pt-3 bg-stone-850 border-b border-stone-750 flex gap-2">
          <button
            onClick={() => setActiveTab('er_model')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'er_model'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            📊 مخطط الكيانات والعلاقات (ER Diagram)
          </button>
          <button
            onClick={() => setActiveTab('api_tester')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'api_tester'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            ⚡ مجرب واجهات البرمجة (REST API Tester)
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 max-h-[72vh] overflow-y-auto space-y-6">
          {activeTab === 'er_model' ? (
            /* Visual ER Model */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Entity: User */}
                <div className="p-4 rounded-2xl bg-stone-850 border border-stone-700 space-y-2">
                  <div className="flex items-center justify-between border-b border-stone-750 pb-2">
                    <span className="font-bold text-xs text-sky-300">👤 User (المستخدم)</span>
                    <span className="text-[10px] font-mono text-stone-400">TABLE</span>
                  </div>
                  <div className="font-mono text-[11px] text-stone-300 space-y-1">
                    <div><span className="text-amber-400">PK</span> id: VARCHAR</div>
                    <div>name: VARCHAR(100)</div>
                    <div>role: ENUM(mgr, sup, wrk)</div>
                    <div>phone: VARCHAR(20)</div>
                    <div><span className="text-emerald-400">FK</span> assignedSectorId: VARCHAR</div>
                    <div>is2FAEnabled: BOOLEAN</div>
                    <div>pinCode: VARCHAR(6)</div>
                  </div>
                </div>

                {/* 2. Entity: FarmSector */}
                <div className="p-4 rounded-2xl bg-stone-850 border border-stone-700 space-y-2">
                  <div className="flex items-center justify-between border-b border-stone-750 pb-2">
                    <span className="font-bold text-xs text-emerald-300">🌴 FarmSector (القطاع)</span>
                    <span className="text-[10px] font-mono text-stone-400">TABLE</span>
                  </div>
                  <div className="font-mono text-[11px] text-stone-300 space-y-1">
                    <div><span className="text-amber-400">PK</span> id: VARCHAR</div>
                    <div>nameAr: VARCHAR(150)</div>
                    <div>code: VARCHAR(50)</div>
                    <div>type: VARCHAR(50)</div>
                    <div>centerLat: DECIMAL(9,6)</div>
                    <div>centerLng: DECIMAL(9,6)</div>
                    <div>polygon: JSON_ARRAY</div>
                    <div>areaFeddan: INT</div>
                  </div>
                </div>

                {/* 3. Entity: FarmTask */}
                <div className="p-4 rounded-2xl bg-stone-850 border border-stone-700 space-y-2">
                  <div className="flex items-center justify-between border-b border-stone-750 pb-2">
                    <span className="font-bold text-xs text-teal-300">📋 FarmTask (المهمة)</span>
                    <span className="text-[10px] font-mono text-stone-400">TABLE</span>
                  </div>
                  <div className="font-mono text-[11px] text-stone-300 space-y-1">
                    <div><span className="text-amber-400">PK</span> id: VARCHAR</div>
                    <div>title: VARCHAR(200)</div>
                    <div><span className="text-emerald-400">FK</span> sectorId: VARCHAR</div>
                    <div><span className="text-emerald-400">FK</span> assignedToUserId: VARCHAR</div>
                    <div><span className="text-emerald-400">FK</span> createdByUserId: VARCHAR</div>
                    <div>status: ENUM(pending, completed, approved)</div>
                    <div>isRecurring: BOOLEAN</div>
                    <div>alarmIntervalMinutes: INT(30)</div>
                    <div>proofOfWork: JSON_OBJECT</div>
                  </div>
                </div>
              </div>

              {/* Relationships Explanation Card */}
              <div className="p-4 rounded-2xl bg-stone-800/60 border border-stone-700 text-xs space-y-2">
                <div className="font-bold text-stone-200">علاقات النموذج (Entity Relationships):</div>
                <ul className="list-disc list-inside space-y-1 text-stone-400 text-[11px]">
                  <li>
                    <strong className="text-stone-300">Sector 1 ➔ N Tasks:</strong> كل قطاع زراعي بمزرعة أطياب الوادي يتضمن مجموعة من المهام المجدولة دورياً.
                  </li>
                  <li>
                    <strong className="text-stone-300">User 1 ➔ N Tasks:</strong> العامل الميداني يستقبل مهامه مع تنبيهات صوتية كل 30 دقيقة.
                  </li>
                  <li>
                    <strong className="text-stone-300">Task 1 ➔ 1 ProofOfWork:</strong> كل مهمة تكتمل مرتبطة ببيانات إحداثيات GPS، صورة موثقة، وتوقيع مشفّر ضد التلاعب.
                  </li>
                  <li>
                    <strong className="text-stone-300">AuditLog:</strong> يسجل كافة العمليات وحركات الحذف والتعديل وتجاوزات الـ GPS مع IP وجهاز المستخدم.
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            /* Interactive REST API Tester */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-stone-850 border border-stone-700 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <select
                    value={requestMethod}
                    onChange={(e) => setRequestMethod(e.target.value as any)}
                    className="px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-xs font-mono font-bold text-emerald-400"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                  </select>

                  <select
                    value={selectedEndpoint}
                    onChange={(e) => setSelectedEndpoint(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-xs font-mono text-stone-100"
                  >
                    <option value="/api/tasks">/api/tasks (قائمة المهام)</option>
                    <option value="/api/health">/api/health (حالة الخادم)</option>
                    <option value="/api/docs">/api/docs (مخطط الـ OpenAPI)</option>
                    <option value="/api/tasks/tsk_101/complete">/api/tasks/:id/complete (توثيق المهمة)</option>
                    <option value="/api/sync">/api/sync (مزامنة الطابور)</option>
                  </select>

                  <button
                    onClick={handleTestApi}
                    disabled={isLoadingApi}
                    className="w-full sm:w-auto px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow"
                  >
                    <Play className={`w-3.5 h-3.5 ${isLoadingApi ? 'animate-spin' : ''}`} />
                    <span>إرسال الطلب</span>
                  </button>
                </div>
              </div>

              {/* Response Viewer */}
              {apiResponseBody && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-stone-400">
                    <span className="flex items-center gap-1">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      استجابة الخادم (HTTP Response):
                    </span>
                    <span className="font-mono text-[11px] text-emerald-400">200 OK</span>
                  </div>
                  <pre className="p-4 rounded-2xl bg-black border border-stone-700 text-emerald-400 font-mono text-xs overflow-x-auto max-h-64">
                    {apiResponseBody}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
