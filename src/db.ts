/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Dexie, { type Table } from 'dexie';
import { Employee, Evaluation, User, EvaluationModel, HRSystemConfig } from './types.ts';

export class MinistryDB extends Dexie {
  employees!: Table<Employee>;
  evaluations!: Table<Evaluation>;
  users!: Table<User>;
  evaluationModels!: Table<EvaluationModel>;
  hrConfig!: Table<HRSystemConfig>;

  constructor() {
    super('MinistryEvaluationDB');
    this.version(3).stores({
      employees: '++id, employeeId, name, department, type',
      evaluations: '++id, employeeId, period, date, year, month, totalScore',
      users: '++id, username, role',
      evaluationModels: '++id, name',
      hrConfig: '++id'
    });
  }
}

export const db = new MinistryDB();
