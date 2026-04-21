/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { db } from '../db.ts';
import { Download, FileDown, Calendar, Filter, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Employee, Evaluation } from '../types.ts';

interface ExportEvaluationsProps {
  onClose: () => void;
}

export default function ExportEvaluations({ onClose }: ExportEvaluationsProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'technical' | 'non-technical'>('all');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const allEvaluations = await db.evaluations.toArray();
      const allEmployees = await db.employees.toArray();
      const employeeMap = new Map(allEmployees.map(e => [e.id, e]));

      let filteredEvals = allEvaluations;

      // Filter by date
      if (startDate) {
        filteredEvals = filteredEvals.filter(e => new Date(e.date) >= new Date(startDate));
      }
      if (endDate) {
        filteredEvals = filteredEvals.filter(e => new Date(e.date) <= new Date(endDate));
      }

      // Filter by type
      if (typeFilter !== 'all') {
        filteredEvals = filteredEvals.filter(e => {
          const emp = employeeMap.get(e.employeeId);
          return emp?.type === typeFilter;
        });
      }

      if (filteredEvals.length === 0) {
        alert('لا توجد تقييمات مطابقة للفلاتر المختارة');
        setIsExporting(false);
        return;
      }

      // Prepare CSV content
      const headers = [
        'اسم الموظف',
        'الرقم الوظيفي',
        'الإدارة',
        'المسمى الوظيفي',
        'نوع الكادر',
        'تاريخ التقييم',
        'فترة التقييم',
        'النسبة المئوية',
        'المواظبة',
        'الانضباط',
        'ملاحظات'
      ];

      const rows = filteredEvals.map(ev => {
        const emp = employeeMap.get(ev.employeeId);
        return [
          emp?.name || 'N/A',
          emp?.employeeId || 'N/A',
          emp?.department || 'N/A',
          emp?.position || 'N/A',
          emp?.type === 'technical' ? 'فني' : 'إداري',
          ev.date,
          ev.period,
          `${ev.totalScore.toFixed(2)}%`,
          ev.attendance,
          ev.discipline,
          `"${ev.notes.replace(/"/g, '""')}"`
        ];
      });

      const csvContent = "\uFEFF" + [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `evaluations_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
      alert('حدث خطأ أثناء تصدير البيانات');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] text-right" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-border-theme"
      >
        <div className="bg-primary p-6 text-white flex justify-between items-center border-b-4 border-accent">
          <div className="flex items-center gap-3">
            <Download className="w-6 h-6 text-accent" />
            <h3 className="text-lg font-black uppercase">تصدير بيانات التقييم</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                <Calendar size={12} className="text-primary" /> النطاق الزمني
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[9px] text-text-muted">من تاريخ</span>
                  <input 
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-text-muted">إلى تاريخ</span>
                  <input 
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                <Filter size={12} className="text-primary" /> نوع الكادر
              </label>
              <select 
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">كل الكوادر</option>
                <option value="technical">كادر فني</option>
                <option value="non-technical">كادر إداري</option>
              </select>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-100/50 rounded-xl text-[10px] text-blue-700 leading-relaxed font-medium">
            سيتم تصدير ملف CSV متوافق مع Excel يتضمن كافة تفاصيل التقييمات بما في ذلك الدرجات والملاحظات والالتزام السلوكي للموظفين المحددين.
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full py-4 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-secondary transition-all shadow-xl border-b-4 border-accent active:translate-y-1 flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileDown size={16} />
            )}
            {isExporting ? 'جاري تجهيز البيانات...' : 'تصدير الملف الآن'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
