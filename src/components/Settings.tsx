/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../db.ts';
import { 
  Settings as SettingsIcon, 
  Database, 
  Shield, 
  History, 
  Trash2, 
  Download, 
  Upload, 
  FileJson, 
  AlertTriangle, 
  CheckCircle2, 
  Cpu, 
  Info,
  Server,
  Cloud,
  Layers,
  Lock,
  Smartphone,
  Globe,
  Bell,
  ChevronRight,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Settings() {
  const [dbStats, setDbStats] = useState({ employees: 0, evaluations: 0, users: 0 });
  const [isExporting, setIsExporting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      const emps = await db.employees.count();
      const evals = await db.evaluations.count();
      const users = await db.users.count();
      setDbStats({ employees: emps, evaluations: evals, users: users });
    };
    fetchStats();
  }, []);

  const exportBackup = async () => {
    setIsExporting(true);
    const emps = await db.employees.toArray();
    const evals = await db.evaluations.toArray();
    const models = await db.evaluationModels.toArray();
    const users = await db.users.toArray();
    
    const backup = {
      version: '4.0.0-SOVEREIGN',
      timestamp: new Date().toISOString(),
      data: { employees: emps, evaluations: evals, models, users }
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MTIT_SOVEREIGN_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    setIsExporting(false);
  };

  const clearDatabase = async () => {
    await db.delete();
    window.location.reload();
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 text-right pb-20" dir="rtl">
      {/* Ministry Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-10 rounded-[3rem] shadow-premium border-b-8 border-accent relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-6">
           <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center text-accent shadow-massive">
              <SettingsIcon size={40} />
           </div>
           <div>
              <h2 className="text-4xl font-black text-primary tracking-tighter">إعدادات النظام والتحكم السيادي</h2>
              <p className="text-sm font-bold text-text-muted mt-2 uppercase tracking-widest">Sovereign System Architecture & Governance</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* System Health & Stats */}
        <div className="lg:col-span-2 space-y-10">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-[#0f172a] rounded-[3rem] p-10 shadow-massive relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                 <div className="relative z-10 space-y-8">
                    <div className="flex items-center gap-4 border-r-4 border-accent pr-4">
                       <Cpu className="text-accent" />
                       <h4 className="text-sm font-black text-white uppercase tracking-[0.2em]">حالة معالجة النظام</h4>
                    </div>
                    <div className="space-y-4">
                       <HealthRow label="قاعدة البيانات المحلية" value="Optimal" isSuccess />
                       <HealthRow label="بوابة المزامنة (Biometric)" value={dbStats.employees > 0 ? "Linked" : "Awaiting"} />
                       <HealthRow label="محرك الذكاء الاصطناعي" value="Ready" isSuccess />
                       <HealthRow label="اتصال الشبكة الحكومية" value="Secure Tunnel" isSuccess />
                    </div>
                 </div>
              </div>

              <div className="bg-white rounded-[3rem] p-10 shadow-premium border border-slate-100 flex flex-col justify-between">
                 <div>
                    <div className="flex items-center gap-4 mb-8 border-r-4 border-primary pr-4">
                       <Database className="text-primary" />
                       <h4 className="text-sm font-black text-primary uppercase tracking-[0.2em]">تعداد السجلات الرقمية</h4>
                    </div>
                    <div className="space-y-4">
                       <StatRow label="إجمالي الكادر المسجل" value={dbStats.employees} />
                       <StatRow label="تقارير الأداء المعتمدة" value={dbStats.evaluations} />
                       <StatRow label="الحسابات المفوضة" value={dbStats.users} />
                    </div>
                 </div>
                 <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 italic text-[11px] text-text-muted font-bold">
                    * يتم تحديث هذه البيانات لحظياً عند كل عملية إدراج أو حذف سيادية.
                 </div>
              </div>
           </div>

           {/* Security Logs Placeholder */}
           <div className="bg-white rounded-[3rem] p-10 shadow-premium border border-slate-100 space-y-8">
              <div className="flex justify-between items-center">
                 <div className="flex items-center gap-4 border-r-8 border-primary pr-6">
                    <History className="text-primary" size={32} />
                    <div>
                      <h4 className="text-xl font-black text-primary tracking-tighter">سجل العمليات الرقابية</h4>
                      <p className="text-xs font-bold text-text-muted">نظام تعقب كافة التغييرات على البيانات الحساسة (Audit Log)</p>
                    </div>
                 </div>
                 <button className="text-[11px] font-black text-primary hover:text-secondary uppercase tracking-[0.2em]">Full History Report</button>
              </div>

              <div className="space-y-4">
                 <LogRow user="ADMIN_01" action="إضافة موظف جديد" target="وحدة الهندسة" time="10:45 ص - 2024/05/20" />
                 <LogRow user="EVAL_UNIT_X" action="إعتماد تقييم شهري" target="محمد اليماني" time="09:30 ص - 2024/05/20" isUpdate />
                 <LogRow user="SEC_DEPT" action="تعديل صلاحيات" target="لجنة التقييم" time="08:15 ص - 2024/05/20" isCritical />
              </div>
           </div>
        </div>

        {/* Maintenance & Backup */}
        <div className="lg:col-span-1 space-y-8">
           <div className="bg-white p-8 rounded-[3rem] shadow-premium border border-slate-100 space-y-10">
              <div className="space-y-4 border-r-4 border-secondary pr-4">
                 <h3 className="text-sm font-black text-primary uppercase tracking-[0.3em]">الصيانة والاستعادة</h3>
                 <p className="text-[11px] font-bold text-text-muted">أدوات إدارة التخزين المحلي والنسخ الاحتياطي اليدوي</p>
              </div>

              <div className="space-y-4">
                 <button 
                  onClick={exportBackup}
                  disabled={isExporting}
                  className="w-full flex items-center justify-between p-6 bg-slate-50 hover:bg-primary hover:text-white rounded-[2rem] border-2 border-transparent hover:border-primary/20 transition-all group shadow-sm text-right"
                 >
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-sm">
                          <Download size={24} />
                       </div>
                       <div>
                          <p className="text-[13px] font-black">تصدير النسخة الاحتياطية</p>
                          <p className="text-[9px] font-bold opacity-60">JSON Intelligence Backup</p>
                       </div>
                    </div>
                    <ChevronRight size={20} className="opacity-20 group-hover:opacity-100" />
                 </button>

                 <div className="w-full flex items-center justify-between p-6 bg-slate-50/50 grayscale opacity-50 rounded-[2rem] border-2 border-dashed border-slate-200 cursor-not-allowed">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-300">
                          <Upload size={24} />
                       </div>
                       <div>
                          <p className="text-[13px] font-black">استيراد بيانات خارجية</p>
                          <p className="text-[9px] font-bold">Cloud Data Sync (Coming Soon)</p>
                       </div>
                    </div>
                 </div>

                 <button 
                  onClick={() => setShowClearConfirm(true)}
                  className="w-full flex items-center justify-between p-6 bg-red-50 hover:bg-red-500 hover:text-white rounded-[2rem] border-2 border-transparent hover:border-red-100 transition-all group shadow-sm text-right"
                 >
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform shadow-sm">
                          <Trash2 size={24} />
                       </div>
                       <div>
                          <p className="text-[13px] font-black">تصفير كافة السجلات</p>
                          <p className="text-[9px] font-bold opacity-60 text-red-400 group-hover:text-white/60">Dangerous Action</p>
                       </div>
                    </div>
                 </button>
              </div>

              <div className="p-6 bg-amber-50 rounded-[2rem] border-2 border-dashed border-amber-200">
                 <div className="flex gap-4 items-start">
                    <div className="p-2 bg-white rounded-xl shadow-sm text-amber-500">
                       <AlertTriangle size={20} />
                    </div>
                    <p className="text-[11px] font-bold text-amber-800 leading-relaxed">
                       تحذير: مسح قاعدة البيانات سيؤدي إلى فقدان كافة سجلات الموظفين والتقييمات المخزنة محلياً بشكل نهائي وغير قابل للاستعادة.
                    </p>
                 </div>
              </div>
           </div>

           {/* System Settings Meta */}
           <div className="bg-white p-8 rounded-[3rem] shadow-premium border border-slate-100 space-y-6">
              <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.2em] border-r-4 border-accent pr-4">إعدادات الواجهات المحيطية</h4>
              <div className="space-y-3">
                 <ToggleRow icon={<Bell />} label="التنبيهات الفورية" active />
                 <ToggleRow icon={<Globe />} label="المزامنة السحابية" />
                 <ToggleRow icon={<Smartphone />} label="الوصول عبر الأجهزة الذكية" active />
                 <ToggleRow icon={<Lock />} label="المصادقة ثنائية العوامل" active />
              </div>
           </div>
        </div>
      </div>

      {/* Clear DB Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-4 z-[100]">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="bg-white rounded-[4rem] shadow-massive p-16 max-w-md w-full text-center border-b-[12px] border-red-500"
            >
               <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-xl border border-red-100">
                  <AlertTriangle size={48} className="animate-pulse" />
               </div>
               <h3 className="text-3xl font-black text-primary mb-4 tracking-tighter">تطهير السجلات السيادية؟</h3>
               <p className="text-sm font-bold text-text-muted leading-relaxed mb-12">
                  أنت على وشك تنفيذ عملية مسح شامل لكافة البيانات المخزنة من موظفين وتقييمات وإعدادات. هذا الإجراء نهائي ولا يمكن التراجع عنه.
               </p>
               <div className="flex flex-col gap-4">
                  <button 
                    onClick={clearDatabase}
                    className="w-full h-20 bg-red-500 text-white font-black rounded-3xl hover:bg-red-600 transition-all shadow-massive uppercase tracking-[0.2em] text-xs"
                  >
                    نعم، معالجة المسح النهائي
                  </button>
                  <button 
                    onClick={() => setShowClearConfirm(false)}
                    className="w-full h-20 bg-slate-50 text-slate-400 font-black rounded-3xl hover:bg-slate-100 transition-all border-2 border-slate-100 uppercase tracking-[0.2em] text-xs"
                  >
                    تراجع، الحفاظ على السجلات
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HealthRow({ label, value, isSuccess = false }: { label: string, value: string, isSuccess?: boolean }) {
  return (
    <div className="flex justify-between items-center py-4 border-b border-white/5 last:border-0 group">
       <span className="text-[11px] font-black text-white/50 uppercase tracking-widest group-hover:text-accent transition-colors">{label}</span>
       <span className={`text-[12px] font-black ${isSuccess ? 'text-emerald-500' : 'text-accent animate-pulse'}`}>{value}</span>
    </div>
  );
}

function StatRow({ label, value }: { label: string, value: number }) {
  return (
    <div className="flex justify-between items-center py-4 border-b border-slate-50 last:border-0 group">
       <span className="text-[11px] font-black text-text-muted uppercase tracking-widest group-hover:text-primary transition-colors">{label}</span>
       <span className="text-xl font-black text-primary">{value}</span>
    </div>
  );
}

function LogRow({ user, action, target, time, isUpdate = false, isCritical = false }: { user: string, action: string, target: string, time: string, isUpdate?: boolean, isCritical?: boolean }) {
  return (
    <div className="flex items-center gap-6 p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:border-primary/20 transition-all shadow-sm group">
       <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm border ${
         isCritical ? 'bg-red-50 text-red-500 border-red-100' : 
         isUpdate ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-white text-primary border-slate-100'
       }`}>
          {isCritical ? <ShieldAlert size={20} /> : isUpdate ? <CheckCircle2 size={20} /> : <Info size={20} />}
       </div>
       <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
             <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10">{user}</span>
             <span className="text-xs font-black text-text-dark">{action}: {target}</span>
          </div>
          <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest font-mono">{time}</p>
       </div>
       <div className="hidden md:block">
          <button className="p-3 text-slate-300 hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
             <ArrowRight size={18} />
          </button>
       </div>
    </div>
  );
}

function ToggleRow({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
       <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border ${active ? 'bg-white text-primary border-slate-200' : 'bg-slate-100/50 text-slate-300 border-transparent'}`}>
             {React.cloneElement(icon as React.ReactElement<any>, { size: 18 })}
          </div>
          <span className="text-xs font-black text-text-dark">{label}</span>
       </div>
       <div className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${active ? 'bg-emerald-500' : 'bg-slate-200'}`}>
          <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${active ? 'translate-x-6' : 'translate-x-0'}`} />
       </div>
    </div>
  );
}
