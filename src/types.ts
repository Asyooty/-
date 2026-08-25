export type UserRole = 'manager' | 'supervisor' | 'worker';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  roleTitleAr: string;
  phone: string;
  email: string;
  username: string;
  password?: string;
  avatar?: string;
  assignedSectorId?: string;
  is2FAEnabled: boolean;
  pinCode?: string;
}

export type SectorCropType =
  | 'alfalfa'
  | 'date_palm_saidi'
  | 'date_palm_sewi'
  | 'date_palm_medjool'
  | 'wheat'
  | 'olive'
  | 'irrigation_well'
  | 'water_basin'
  | 'solar_station'
  | 'nursery';

export interface GeoLocation {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface FarmSector {
  id: string;
  nameAr: string;
  code: string;
  type: SectorCropType;
  typeAr: string;
  centerCoordinates: GeoLocation;
  polygon: GeoLocation[];
  areaFeddan: number;
  dimensions?: string;
  depthMeters?: number;
  capacityM3?: number;
  targetPlantingDate?: string;
  wellsCount: number;
  plantsCount?: number;
  irrigationType: 'drip' | 'pivot' | 'flood' | 'sprinkler';
  notes: string;
}

export type TaskCategory =
  | 'irrigation'
  | 'pest_control'
  | 'pollination'
  | 'fertilization'
  | 'pruning'
  | 'harvest'
  | 'pump_maintenance'
  | 'general';

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'approved'
  | 'rejected';

export type RecurrenceType = 'none' | 'daily' | 'every_3_days' | 'weekly' | 'custom_season';

export interface ProofOfWork {
  capturedAt: string;
  imageUrl: string;
  gpsCoordinates: GeoLocation;
  distanceFromTargetMeters: number;
  isLocationVerified: boolean;
  antiTamperHash: string;
  deviceTimestamp: string;
  watermarkText: string;
  workerNotes?: string;
  compressedSizeKb?: number;
}

export interface ManagerApproval {
  approvedAt: string;
  approvedBy: string;
  approvedByUserId?: string;
  approvedByName: string;
  rating: number; // 1-5
  feedback?: string;
}

export interface FarmTask {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  categoryAr: string;
  priority: TaskPriority;
  sectorId: string;
  sectorName: string;
  targetCoordinates: GeoLocation;
  maxAllowedDistanceMeters: number; // Default 150m
  assignedToUserId: string;
  assignedToName: string;
  assignedRole: UserRole;
  createdByUserId: string;
  createdByName: string;
  status: TaskStatus;
  isRecurring: boolean;
  recurrenceType: RecurrenceType;
  scheduledDate: string;
  scheduledTime: string;
  deadlineTimestamp: number; // ms
  alarmIntervalMinutes: number; // e.g., 30 min
  lastAlarmTriggeredAt?: string;
  isAlarmActive: boolean;
  isEmergencyOverride: boolean;
  proofOfWork?: ProofOfWork;
  managerApproval?: ManagerApproval;
  createdAt: string;
  updatedAt: string;
  isSynced: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action:
    | 'task_created'
    | 'task_updated'
    | 'task_deleted'
    | 'task_completed'
    | 'task_approved'
    | 'alarm_triggered'
    | 'gps_verification_passed'
    | 'gps_verification_failed'
    | 'dnd_activated'
    | 'weather_alert_issued'
    | 'offline_sync_executed'
    | 'sync_executed'
    | 'user_login'
    | 'user_created'
    | 'user_modified'
    | 'user_deleted'
    | 'unauthorized_access';
  actionTitleAr: string;
  details: string;
  ipAddress: string;
  deviceInfo: string;
  severity: 'info' | 'warning' | 'critical' | 'danger';
  sectorId?: string;
  taskId?: string;
}

export interface WeatherAlertRecord {
  id: string;
  timestamp: string;
  alertType: 'heatwave' | 'dust_storm' | 'high_wind' | 'frost' | 'uv_extreme' | 'custom_broadcast';
  title: string;
  message: string;
  triggerValue: string; // e.g. "44.5°م" or "48 كم/س"
  thresholdCrossed: string; // e.g. "درجة الحرارة تجاوزت 40°م"
  severity: 'warning' | 'danger' | 'critical';
  recipientsCount: number;
  recipientRoles: string[]; // ['worker', 'technician', 'supervisor']
  affectedSectors: string[]; // ['sec_plot_9', 'sec_plot_10']
  autoTriggered: boolean;
  dispatchedByName: string;
  acknowledgedByWorkerIds: string[];
  acknowledgedByWorkerNames: string[];
}

export interface WeatherThresholdSettings {
  autoDispatchEnabled: boolean;
  heatWarningTempC: number; // default 40
  heatDangerTempC: number; // default 43
  windWarningSpeedKmH: number; // default 30
  windDangerSpeedKmH: number; // default 45
  uvDangerIndex: number; // default 10
  cooldownMinutes: number; // default 60 (to prevent duplicate spam)
  soundAlertEnabled: boolean;
  pushNotificationEnabled: boolean;
}

export interface WeatherData {
  locationName: string;
  governorate: string; // الوادي الجديد
  region: string; // الخارجة / الداخلة
  temperatureC: number;
  feelsLikeC: number;
  humidityPercent: number;
  windSpeedKmH: number;
  windDirection: string;
  uvIndex: number;
  evapotranspirationMmDay: number;
  conditionAr: string;
  conditionCode: 'sunny' | 'heatwave' | 'dust_storm' | 'partly_cloudy' | 'windy';
  updatedAt: string;
  alerts: {
    id: string;
    title: string;
    description: string;
    level: 'advisory' | 'warning' | 'danger';
    category: 'heat' | 'sandstorm' | 'spray_warning' | 'irrigation';
    actionRequired: string;
  }[];
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'task_completion' | 'alarm_escalation' | 'weather_alert' | 'approval_required' | 'sync_status';
  timestamp: string;
  read: boolean;
  taskId?: string;
  actionUrl?: string;
  workerName?: string;
}

export interface SyncQueueItem {
  id: string;
  action: 'CREATE_TASK' | 'UPDATE_TASK' | 'COMPLETE_TASK' | 'APPROVE_TASK' | 'LOG_AUDIT';
  payload: any;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

export type AgriActivityCategory =
  | 'soil_preparation'
  | 'planting'
  | 'irrigation_schedule'
  | 'fertilization'
  | 'pollination'
  | 'care_pruning'
  | 'pest_protection'
  | 'harvest_cutting'
  | 'post_harvest';

export type AgriSeason = 'autumn' | 'winter' | 'spring' | 'summer';

export interface AgriCalendarEvent {
  id: string;
  sectorId: 'sec_plot_9' | 'sec_plot_10' | string;
  sectorNameAr: string;
  cropType: SectorCropType;
  title: string;
  activityCategory: AgriActivityCategory;
  activityCategoryAr: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  year: number;
  month: number; // 1-12
  season: AgriSeason;
  seasonAr: string;
  isHarvest: boolean;
  isPlanting: boolean;
  expectedYield?: string;
  keyInstructions: string;
  recommendedTimeOfDay?: 'early_morning' | 'sunset' | 'night' | 'all_day';
  climateAdvisory?: string;
  status: 'scheduled' | 'active' | 'completed';
  assignedWorkerName?: string;
  isMilestone?: boolean;
}

export interface AgriYearlyPlan {
  year: number;
  theme: string;
  sector9Milestones: string[];
  sector10Milestones: string[];
  expectedHarvestSummary: {
    sector9AlfalfaCuts: number;
    sector9TotalGreenTons: number;
    sector9DryHayTons: number;
    sector10DatesStage: string;
    sector10ExpectedTons: number;
  };
}
