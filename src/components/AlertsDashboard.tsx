/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../db.ts';
import { AlertCircle, TrendingDown, Clock, UserMinus, ShieldAlert, CheckCircle2, ChevronRight, Bell, Search, Filter, ArrowUpRight, ArrowDownRight, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Employee, Evaluation } from '../types.ts';

interface Alert {
  id: string;
  type: 'drop' | 'attendance' | 'discipline' | 'missing';
  severity: 'high' | 'medium' | 'low';
  employeeName: string;
  employeeId: number;
  message: string;
  date: string;
  isRead: boolean;
}

export default function AlertsDashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium'>('all');

  useEffect(() => {
    const generateAlerts = async () => {
      const allEmployees = await db.employees.toArray();
      const allEvaluations = await db.evaluations.toArray();
      
      const newAlerts: Alert[] = [];

      allEmployees.forEach(emp => {
        const empEvals = allEvaluations
          .filter(ev => ev.employeeId === emp.id)
          .sort((a, b) => b.date.localeCompare(a.date));

        // 1. Performance Drop Alert
        if (empEvals.length >= 2) {
          const latest = empEvals[0].totalScore;
          const previous = empEvals[1].totalScore;
          if (latest < previous * 0.8) {
            newAlerts.push({
              id: `drop-${emp.id}`,
              type: 'drop',
              severity: 'high',
              employeeName: emp.name,
              employeeId: emp.id!,
              message: `انخفاض حاد في مستوى الأداء بنسبة ${((previous - latest) / previous * 100).toFixed(0)}% عن الدورة السابقة.`,
              date: empEvals[0].date,
              isRead: false
            });
          }
        }

        // 2. Attendance Warning
        if (empEvals.length > 0 && (empEvals[0].attendance === 'poor' || empEvals[0].attendance === 'average')) {
          newAlerts.push({
            id: `att-${emp.id}-${empEvals[0].id}`,
            type: 'attendance',
            severity: empEvals[0].attendance === 'poor' ? 'high' : 'medium',
            employeeName: emp.name,
            employeeId: emp.id!,
            message: `تنبيه انضباط: تم رصد تراجع في مستوى الحضور والمواظبة في الدورة الأخيرة.`,
            date: empEvals[0].date,
            isRead: false
          });
        }

        // 3. Discipline Alert
        if (empEvals.length > 0 && empEvals[0].discipline === 'warning') {
          newAlerts.push({
            id: `disc-${emp.id}-${empEvals[0].id}`,
            type: 'discipline',
            severity: 'high',
            employeeName: emp.name,
            employeeId: emp.id!,
            message: `مخالفة إدارية: تسجيل تنبيه رسمي في ملف الموظف يستدعي المراجعة الفورية.`,
            date: empEvals[0].date,
            isRead: false
          });
        }
      });

      setAlerts(newAlerts.sort((a, b) => b.date.localeCompare(a.date)));
      setLoading(false);
    };

    generateAlerts();
  }, []);

  const filteredAlerts = alerts.filter(a => filter === 'all' || a.severity === filter);

  const markAsRead = (id: string) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, isRead: true } : a));
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 text-right pb-20" dir="rtl">
      {/* Ministry Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-10 rounded-[3rem] shadow-premium border-b-8 border-accent relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-6">
           <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center text-accent shadow-massive relative">
              <Bell size={40} />
              {alerts.filter(a => !a.isRead && a.severity === 'high').length > 0 && (
                <span className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full border-4 border-white flex items-center justify-center text-[10px] font-black text-white animate-bounce">
                  {alerts.filter(a => !a.isRead && a.severity === 'high').length}
                </span>
              )}
           </div>
           <div>
              <h2 className="text-4xl font-black text-primary tracking-tighter">مركز التنبيهات والرقابة الذكية</h2>
              <p className="text-sm font-bold text-text-muted mt-2 uppercase tracking-widest">Intelligent Personnel Oversight & Alert Center</p>
           </div>
        </div>

        <div className="relative z-10 flex gap-2">
           <button 
            onClick={() => setFilter('all')}
            className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
              filter === 'all' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-white'
            }`}
           >
             All Alerts
           </button>
           <button 
            onClick={() => setFilter('high')}
            className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
              filter === 'high' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-white'
            }`}
           >
             High Priority
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        {/* Risk Analysis Sidebar */}
        <div className="lg:col-span-1 space-y-8">
           <div className="bg-[#0f172a] rounded-[2.5rem] p-8 shadow-massive relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/az-subtle.png')] opacity-10" />
              <div className="relative z-10 space-y-8">
                 <div className="flex items-center gap-4 border-r-4 border-red-500 pr-4">
                    <ShieldAlert className="text-red-500" />
                    <h4 className="text-sm font-black text-white uppercase tracking-[0.2em]">تحليل المخاطر الوظيفية</h4>
                 </div>
                 <div className="space-y-6">
                    <RiskItem label="انخفاض مفاجئ في الأداء" count={alerts.filter(a => a.type === 'drop').length} color="bg-red-500" />
                    <RiskItem label="مشكلات الانضباط والحضور" count={alerts.filter(a => a.type === 'attendance').length} color="bg-amber-500" />
                    <RiskItem label="مخالفات السلوك الإداري" count={alerts.filter(a => a.type === 'discipline').length} color="bg-secondary" />
                 </div>
                 <div className="pt-6 border-t border-white/10">
                    <p className="text-[10px] text-white/40 leading-relaxed font-bold italic">
                       نظام الرقابة يرصد السلوك التراكمي للموظفين ويقوم بتحذير الجهات الإشرافية عند استشعار تراجع الكفاءة النوعية.
                    </p>
                 </div>
              </div>
           </div>

           <div className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-slate-100 space-y-6">
              <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.2em] border-r-4 border-accent pr-4">إجراءات المراجعة الموصى بها</h4>
              <div className="space-y-4">
                 <ActionRecommendation icon={<Info size={14} />} label="استدعاء الموظفين ذوي التقييم المتدني" />
                 <ActionRecommendation icon={<Clock size={14} />} label="مراجعة سجلات البصمة للأسبوع الحالي" />
                 <ActionRecommendation icon={<CheckCircle2 size={14} />} label="تفعيل برامج التحفيز للفرق المستقرة" />
              </div>
           </div>
        </div>

        {/* Alerts Feed */}
        <div className="lg:col-span-3 space-y-6">
           {filteredAlerts.length > 0 ? (
             <AnimatePresence>
                {filteredAlerts.map((alert, idx) => (
                  <motion.div 
                    key={alert.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`group relative h-32 bg-white rounded-[2rem] border-2 transition-all hover:scale-[1.01] flex items-center gap-8 px-10 shadow-premium overflow-hidden ${
                      alert.isRead ? 'border-slate-100 grayscale opacity-60' : 
                      alert.severity === 'high' ? 'border-red-100 hover:border-red-200 shadow-red-500/5' : 'border-slate-100 hover:border-primary/20'
                    }`}
                  >
                    {/* Severity Indicator Bar */}
                    <div className={`absolute right-0 top-0 w-3 h-full ${
                      alert.severity === 'high' ? 'bg-red-500' : 'bg-amber-500'
                    }`} />
                    
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-4 border-white shadow-xl ${
                      alert.type === 'drop' ? 'bg-red-50 text-red-500' : 
                      alert.type === 'attendance' ? 'bg-amber-50 text-amber-500' : 'bg-secondary/5 text-secondary'
                    }`}>
                      {alert.type === 'drop' ? <TrendingDown size={32} /> : 
                       alert.type === 'attendance' ? <Clock size={32} /> : <ShieldAlert size={32} />}
                    </div>

                    <div className="flex-1">
                       <div className="flex items-center gap-4 mb-1">
                          <h4 className="text-lg font-black text-primary">{alert.employeeName}</h4>
                          <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                            alert.severity === 'high' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
                          }`}>
                            {alert.severity === 'high' ? 'Immediate Priority' : 'Attention Needed'}
                          </span>
                       </div>
                       <p className="text-sm font-bold text-text-muted leading-relaxed">{alert.message}</p>
                    </div>

                    <div className="flex items-center gap-10">
                       <div className="text-left">
                          <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">التاريخ المرصود</p>
                          <p className="text-sm font-black text-primary font-mono">{alert.date}</p>
                       </div>
                       <div className="flex gap-2">
                          {!alert.isRead && (
                             <button 
                              onClick={() => markAsRead(alert.id)}
                              className="w-12 h-12 flex items-center justify-center bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition-all border border-emerald-100"
                             >
                                <CheckCircle2 size={18} />
                             </button>
                          )}
                          <button className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-primary hover:bg-white border border-slate-100 rounded-xl transition-all">
                             <ChevronRight size={20} />
                          </button>
                       </div>
                    </div>
                  </motion.div>
                ))}
             </AnimatePresence>
           ) : (
             <div className="h-[500px] flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[4rem] text-center p-20 text-slate-300">
                <div className="w-32 h-32 bg-white rounded-[2.5rem] shadow-sm flex items-center justify-center mb-10 border border-slate-100">
                    <Bell size={64} strokeWidth={1} className="opacity-20" />
                </div>
                <h3 className="text-3xl font-black mb-4">لا توجد تنبيهات نشطة</h3>
                <p className="text-lg font-bold max-w-md">كافة الأنظمة والمؤشرات تعمل ضمن النطاق الآمن المعتمد للوزارة.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

function RiskItem({ label, count, color }: { label: string, count: number, color: string }) {
  return (
    <div className="space-y-2">
       <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
          <span className="text-white/60">{label}</span>
          <span className="text-white">{count}</span>
       </div>
       <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(count * 20, 100)}%` }}
            className={`h-full ${color}`}
          />
       </div>
    </div>
  );
}

function ActionRecommendation({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:border-primary/20 transition-all cursor-pointer">
       <div className="p-2 bg-white rounded-lg shadow-sm text-primary group-hover:scale-110 transition-transform">
          {icon}
       </div>
       <span className="text-[11px] font-bold text-text-muted group-hover:text-primary transition-colors">{label}</span>
    </div>
  );
}
