/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db.ts';
import { Employee, HRSystemConfig } from '../types.ts';

/**
 * Mock HR System Integration Service
 * This proposes how the ministry can integrate with existing HR systems (ERP, SAP, Oracle, or Custom PHP/SQL systems)
 */
export const HRIntegrationService = {
  /**
   * Sync configuration from local storage or DB
   */
  async getConfig(): Promise<HRSystemConfig | null> {
    const config = await db.hrConfig.toCollection().first();
    return config || null;
  },

  /**
   * Proposed mechanism: REST API Pull from HR Server
   */
  async fetchExternalEmployees(): Promise<Partial<Employee>[]> {
    const config = await this.getConfig();
    if (!config || !config.apiEndpoint) {
      console.warn("HR System Integration not configured.");
      return [];
    }

    try {
      // Logic for fetching:
      // const response = await fetch(`${config.apiEndpoint}/employees?apiKey=${config.apiKey}`);
      // const data = await response.json();
      
      // For now, return mock data representing "New Hires" in the HR System
      return [
        { name: 'محمد ناصر صالح', employeeId: 'MET-2001', department: 'نظم المعلومات', position: 'مبرمج تطبيقات', type: 'technical', joinDate: '2024-04-01' },
        { name: 'آمال عبدالكريم', employeeId: 'MET-2002', department: 'الموارد البشرية', position: 'أخصائي تدريب', type: 'non-technical', joinDate: '2024-04-05' }
      ];
    } catch (error) {
      console.error("HR Sync Error:", error);
      return [];
    }
  },

  /**
   * Automatically update local DB with external data
   */
  async syncNow(): Promise<number> {
    const externalEmployees = await this.fetchExternalEmployees();
    let updatedCount = 0;

    for (const extEmp of externalEmployees) {
      const existing = await db.employees.where('employeeId').equals(extEmp.employeeId!).first();
      if (!existing) {
        await db.employees.add(extEmp as Employee);
        updatedCount++;
      } else {
        // Update existing if needed
        await db.employees.update(existing.id!, extEmp);
      }
    }

    // Update last sync time
    const config = await this.getConfig();
    if (config) {
      await db.hrConfig.update(config.id!, { lastSync: new Date().toISOString() });
    }

    return updatedCount;
  },

  /**
   * Proposed mechanism: Push evaluation results back to HR Payroll/Promotion system
   */
  async exportEvaluationToHR(evaluationId: number) {
     const evaluation = await db.evaluations.get(evaluationId);
     const employee = evaluation ? await db.employees.get(evaluation.employeeId) : null;
     
     if (!evaluation || !employee) return;

     // Proposed payload for promotion/bonus calculation
     const payload = {
        empId: employee.employeeId,
        score: evaluation.totalScore,
        period: evaluation.period,
        date: evaluation.date,
        recommendations: evaluation.trainingNeeds,
        aiInsights: evaluation.aiAnalysis
     };

     console.log("Pushing evaluation to HR system...", payload);
     // await fetch('/hr-api/evaluation-results', { method: 'POST', body: JSON.stringify(payload) });
  }
};
