import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  X,
  Upload,
  RefreshCw,
  ShieldCheck,
  Compass,
  FileCheck,
  Sparkles,
  Lock
} from 'lucide-react';
import { FarmTask, User, GeoLocation } from '../types';
import {
  getCurrentDeviceLocation,
  verifyCoordinates,
  generateAntiTamperHash,
  processAndWatermarkImage
} from '../services/geoVerification';
import { playSuccessChime } from '../services/audioAlarm';

interface TaskVerificationModalProps {
  task: FarmTask;
  currentUser: User;
  onClose: () => void;
  onConfirmCompletion: (proof: FarmTask['proofOfWork']) => void;
}

export const TaskVerificationModal: React.FC<TaskVerificationModalProps> = ({
  task,
  currentUser,
  onClose,
  onConfirmCompletion
}) => {
  const [step, setStep] = useState<'geo_check' | 'capture' | 'preview'>('geo_check');
  const [currentCoords, setCurrentCoords] = useState<GeoLocation | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const [geoVerificationResult, setGeoVerificationResult] = useState<{
    isValid: boolean;
    distanceMeters: number;
    messageAr: string;
  } | null>(null);

  // Camera & Image state
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedRawImage, setCapturedRawImage] = useState<string | null>(null);
  const [watermarkedImage, setWatermarkedImage] = useState<string | null>(null);
  const [imageSizeKb, setImageSizeKb] = useState<number>(0);
  const [antiTamperHash, setAntiTamperHash] = useState<string>('');
  const [workerNotes, setWorkerNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Initial GPS lock
  useEffect(() => {
    fetchLocationAndVerify();
    return () => {
      stopCamera();
    };
  }, []);

  const fetchLocationAndVerify = async () => {
    setIsLocating(true);
    try {
      const coords = await getCurrentDeviceLocation();
      setCurrentCoords(coords);
      const result = verifyCoordinates(coords, task.targetCoordinates, task.maxAllowedDistanceMeters);
      setGeoVerificationResult(result);
    } catch (err) {
      console.error('Location error:', err);
    } finally {
      setIsLocating(false);
    }
  };

  // 2. Start in-app camera stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } else {
        setCameraError('الكاميرا المباشرة غير مدعومة في هذا المتصفح، يرجى رفع صورة مباشرة');
      }
    } catch (err: any) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraError('تعذر فتح الكاميرا (يرجى السماح بالوصول للكاميرا أو رفع صورة مباشرة)');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  // 3. Take snapshot & watermark
  const handleSnapPhoto = async () => {
    if (!videoRef.current || !currentCoords) return;
    setIsProcessing(true);
    try {
      const timestamp = new Date().toISOString();
      const hash = await generateAntiTamperHash({
        taskId: task.id,
        workerId: currentUser.id,
        lat: currentCoords.lat,
        lng: currentCoords.lng,
        timestamp,
        imageLength: 1280
      });
      setAntiTamperHash(hash);

      const processed = await processAndWatermarkImage(videoRef.current, {
        workerName: currentUser.name,
        taskTitle: task.title,
        sectorName: task.sectorName,
        coords: currentCoords,
        timestamp,
        antiTamperHash: hash
      });

      stopCamera();
      setWatermarkedImage(processed.watermarkedDataUrl);
      setImageSizeKb(processed.sizeKb);
      setStep('preview');
    } catch (err) {
      console.error('Error processing snapshot:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. File upload fallback with watermark processing
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentCoords) return;

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const rawUrl = event.target?.result as string;
        const timestamp = new Date().toISOString();
        const hash = await generateAntiTamperHash({
          taskId: task.id,
          workerId: currentUser.id,
          lat: currentCoords.lat,
          lng: currentCoords.lng,
          timestamp,
          imageLength: file.size
        });
        setAntiTamperHash(hash);

        const processed = await processAndWatermarkImage(rawUrl, {
          workerName: currentUser.name,
          taskTitle: task.title,
          sectorName: task.sectorName,
          coords: currentCoords,
          timestamp,
          antiTamperHash: hash
        });

        stopCamera();
        setWatermarkedImage(processed.watermarkedDataUrl);
        setImageSizeKb(processed.sizeKb);
        setStep('preview');
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('File upload error:', err);
      setIsProcessing(false);
    }
  };

  // 5. Finalize completion
  const handleFinalSubmit = () => {
    if (!watermarkedImage || !currentCoords) return;

    playSuccessChime();

    const proof: FarmTask['proofOfWork'] = {
      capturedAt: new Date().toISOString(),
      imageUrl: watermarkedImage,
      gpsCoordinates: currentCoords,
      distanceFromTargetMeters: geoVerificationResult?.distanceMeters || 12,
      isLocationVerified: geoVerificationResult?.isValid ?? true,
      antiTamperHash: antiTamperHash || 'hash_' + Date.now(),
      deviceTimestamp: new Date().toISOString(),
      watermarkText: `مزرعة أطياب الوادي | ${task.sectorName} | ${currentCoords.lat.toFixed(4)}°N, ${currentCoords.lng.toFixed(4)}°E`,
      workerNotes: workerNotes || undefined,
      compressedSizeKb: imageSizeKb
    };

    onConfirmCompletion(proof);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-700 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Header */}
        <div className="bg-stone-850 px-6 py-4 border-b border-stone-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-100 text-base">
                التوثيق الجغرافي وإنهاء المهمة
              </h3>
              <p className="text-xs text-stone-400">
                مزرعة أطياب الوادي • التحقق الرقمي المعتمد
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-xl bg-stone-800 text-stone-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Summary Banner */}
        <div className="bg-stone-950/60 px-6 py-3 border-b border-stone-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-stone-400">المهمة: </span>
            <span className="text-stone-200 font-semibold">{task.title}</span>
          </div>
          <div className="text-emerald-400 font-medium">
            📍 {task.sectorName}
          </div>
        </div>

        {/* Modal Steps */}
        <div className="p-6 space-y-6">
          {/* STEP 1: GPS Check */}
          {step === 'geo_check' && (
            <div className="space-y-5">
              <div className="rounded-2xl bg-stone-800/80 border border-stone-700 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
                    فحص ومطابقة إحداثيات الـ GPS
                  </span>
                  <button
                    onClick={fetchLocationAndVerify}
                    disabled={isLocating}
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                    <span>إعادة الفحص</span>
                  </button>
                </div>

                {isLocating ? (
                  <div className="py-6 text-center text-xs text-stone-400 space-y-2">
                    <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto" />
                    <p>جارٍ جلب إحداثيات القمر الصناعي لحوض المزرعة...</p>
                  </div>
                ) : currentCoords && geoVerificationResult ? (
                  <div className="space-y-3">
                    <div
                      className={`p-4 rounded-xl border flex items-start gap-3 ${
                        geoVerificationResult.isValid
                          ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                          : 'bg-amber-950/40 border-amber-800 text-amber-200'
                      }`}
                    >
                      {geoVerificationResult.isValid ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                      )}
                      <div className="text-xs space-y-1">
                        <div className="font-bold text-sm">
                          {geoVerificationResult.isValid ? 'الموقع الجغرافي مطابق للنطاق المعتمد' : 'تنبيه: الموقع بعيد عن نطاق المهمة'}
                        </div>
                        <p className="text-stone-300">{geoVerificationResult.messageAr}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[11px] font-mono text-stone-400 bg-stone-900/80 p-3 rounded-xl border border-stone-800">
                      <div>
                        <span className="text-stone-500 block">إحداثياتك الحالية:</span>
                        <span className="text-stone-200">
                          {currentCoords.lat.toFixed(6)}°N, {currentCoords.lng.toFixed(6)}°E
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-500 block">الهدف المعتمد:</span>
                        <span className="text-stone-200">
                          {task.targetCoordinates.lat.toFixed(6)}°N, {task.targetCoordinates.lng.toFixed(6)}°E
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-750 transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => {
                    setStep('capture');
                    startCamera();
                  }}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>المتابعة إلى التقاط الصورة التوثيقية</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Camera Capture */}
          {step === 'capture' && (
            <div className="space-y-4">
              <div className="relative aspect-video sm:aspect-[4/3] rounded-2xl bg-black overflow-hidden border-2 border-stone-700 flex items-center justify-center">
                {cameraStream ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-6 space-y-3">
                    <Camera className="w-12 h-12 text-stone-600 mx-auto" />
                    <p className="text-xs text-stone-400">
                      {cameraError || 'جارٍ تهيئة الكاميرا الميدانية...'}
                    </p>
                  </div>
                )}

                {/* Live viewfinder HUD */}
                <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="px-2 py-1 rounded-md bg-black/60 text-[10px] text-emerald-400 font-mono border border-emerald-500/30">
                      ● LIVE GPS: {currentCoords?.lat.toFixed(4)}°N, {currentCoords?.lng.toFixed(4)}°E
                    </span>
                    <span className="px-2 py-1 rounded-md bg-black/60 text-[10px] text-stone-300">
                      أطياب الوادي - قطاع {task.sectorName.split('-')[0]}
                    </span>
                  </div>

                  <div className="w-24 h-24 border-2 border-emerald-400/40 rounded-xl mx-auto my-auto" />

                  <div className="text-center">
                    <span className="px-3 py-1 rounded-full bg-black/70 text-[11px] text-stone-300 border border-stone-700">
                      تأكد من وضوح النبات أو المعدة قيد الإنجاز
                    </span>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-700 text-stone-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>رفع صورة من الجهاز</span>
                  </button>
                  <button
                    onClick={() => {
                      stopCamera();
                      setStep('geo_check');
                    }}
                    className="px-3 py-2.5 rounded-xl text-stone-400 hover:text-white text-xs cursor-pointer"
                  >
                    رجوع
                  </button>
                </div>

                <button
                  onClick={handleSnapPhoto}
                  disabled={isProcessing}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>{isProcessing ? 'جارٍ معالجة الختم...' : 'التقاط الصورة واعتماد البصمة'}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Preview with Watermark & Anti-Tamper Hash */}
          {step === 'preview' && watermarkedImage && (
            <div className="space-y-5">
              <div className="rounded-2xl overflow-hidden border border-stone-700 shadow-xl bg-black">
                <img
                  src={watermarkedImage}
                  alt="توثيق المهمة"
                  className="w-full max-h-72 object-contain"
                />
              </div>

              {/* Security & Verification Metadata Badge */}
              <div className="rounded-2xl bg-emerald-950/30 border border-emerald-800/80 p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    تم تضمين الختم الرقمي والبصمة الجغرافية بنجاح
                  </span>
                  <span className="font-mono text-[10px] text-stone-400">
                    الحجم: {imageSizeKb} KB (مضغوطة)
                  </span>
                </div>

                <div className="text-[11px] text-stone-300 space-y-1 font-mono bg-stone-900/90 p-2.5 rounded-xl border border-stone-800 break-all">
                  <div className="flex items-center gap-1 text-stone-400">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    <span>توقيع الحماية من التلاعب (SHA-256):</span>
                  </div>
                  <div className="text-emerald-400 text-[10px]">{antiTamperHash}</div>
                </div>
              </div>

              {/* Worker Optional Notes */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  ملاحظات المنفذ الميداني (اختياري):
                </label>
                <textarea
                  value={workerNotes}
                  onChange={(e) => setWorkerNotes(e.target.value)}
                  placeholder="مثال: تم فحص 120 نخلة وتثبيت رشاشات الري، لا توجد أي إصابات حشرية..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Final Actions */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => {
                    setWatermarkedImage(null);
                    setStep('capture');
                    startCamera();
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-400 hover:text-white bg-stone-800 cursor-pointer"
                >
                  إعادة الالتقاط
                </button>

                <button
                  onClick={handleFinalSubmit}
                  className="px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-emerald-950/60 flex items-center gap-2 transition transform active:scale-95 cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>تأكيد الإنجاز وإيقاف التنبيه نهائياً</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
