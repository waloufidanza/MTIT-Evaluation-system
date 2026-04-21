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
  department: string;
  position: string;
  type: StaffType;
  category?: EmployeeCategory;
  joinDate: string;
  secondDepartment?: string;
}

export interface EvaluationCriteria {
  label: string;
  score: number; // 1-5
  weight: number;
}

export interface Evaluation {
  id?: number;
  employeeId: number;
  period: EvaluationPeriod;
  date: string;
  year: number;
  month?: number; // 1-12
  criteria: EvaluationCriteria[];
  attendance: 'excellent' | 'good' | 'average' | 'poor';
  discipline: 'committed' | 'needs-improvement' | 'warning';
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
  role: 'admin' | 'evaluator';
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
  criteria: {
    label: string;
    weight: number;
    description: string;
  }[];
}

export interface HRSystemConfig {
  id?: number;
  apiEndpoint: string;
  apiKey: string;
  lastSync?: string;
  autoSyncEnabled: boolean;
}
