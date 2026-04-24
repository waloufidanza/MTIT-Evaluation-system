/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type StaffType = 'technical' | 'non-technical';
export type EmployeeCategory = 'internal' | 'consultant' | 'contractor';

export type EvaluationPeriod = 'monthly' | 'quarterly' | 'semi-annual' | 'annual';

export interface Employee {
  id?: number;
  name: string;
  employeeId: string;
  biometricId?: string; // رقم البصمة التحضيرية
  biometricStatus?: 'online' | 'offline' | 'unknown';
  lastBiometricSync?: string;
  department: string;
  position: string;
  type: StaffType;
  category?: EmployeeCategory;
  joinDate: string;
  secondDepartment?: string;
  customCriteria?: { label: string; weight: number; description?: string }[];
  attendanceHistory?: any[]; // Added for lint fix
  notes?: string;           // Added for lint fix
}

export interface EvaluationCriteria {
  label: string;
  score: number; // 1-5
  weight: number;
  description?: string;
}

export interface Evaluation {
  id?: number;
  employeeId: number;
  evaluatorId?: number; // Added for lint fix
  period: EvaluationPeriod;
  date: string;
  year: number;
  month?: number; // 1-12
  criteria: EvaluationCriteria[];
  attendance: 'excellent' | 'good' | 'average' | 'poor';
  discipline: 'committed' | 'needs-improvement' | 'warning';
  willingnessToImprove?: number; // 0-100
  trainingNeeds: string[];
  notes: string;
  totalScore: number;
  evaluatingDepartment?: string;
  aiAnalysis?: string;
}

export interface Notification {
  id: string;
  type: 'upcoming' | 'overdue' | 'completed' | 'performance-alert';
  title: string;
  message: string;
  date: string;
  employeeId: number;
  remainingDays?: number;
  scoreDrop?: number;
}

export interface DashboardSettings {
  visibleWidgets: string[];
  widgetOrder: string[];
}

export interface User {
  id?: number;
  username: string;
  password: string;
  fullName: string;
  email?: string;
  role: 'admin' | 'evaluator' | 'manager';
  department?: string;
  dashboardSettings?: DashboardSettings;
}

export interface AIAnalysisResult {
  summary: string;
  recommendations: string[];
  strengths: string[];
  weaknesses: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface EvaluationModel {
  id?: number;
  name: string;
  positionTags: string[]; // e.g. ["مهندس برمجيات", "مدير مشروع"]
  departmentTags: string[]; // e.g. ["تطوير", "البنية التحتية"]
  typeTags?: string[]; // e.g. ["technical", "non-technical"]
  categoryTags?: string[]; // e.g. ["internal", "consultant"]
  criteria: {
    label: string;
    weight: number;
    description: string;
  }[];
}

export const DEPARTMENTS = [
  'المكتب الفني',
  'نظم المعلومات',
  'الأمن السيبراني',
  'ادارة العلاقات العامة والإعلام',
  'ادارة الموافقة النوعية',
  'الشؤون القانونية',
  'الشؤون المالية',
  'الإدارة العامة',
  'التخطيط',
  'إدارة الموارد البشرية',
  'إدارة الرقابة والتفتيش',
  'الجودة والمقاييس',
  'الأمن والحراسات',
  'السلامة المهنية',
  'الخدمات العامة والصيانة'
];

export interface HRSystemConfig {
  id?: number;
  apiEndpoint: string;
  apiKey: string;
  lastSync?: string;
  autoSyncEnabled: boolean;
}
