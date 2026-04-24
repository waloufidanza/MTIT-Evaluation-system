/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../db.ts';
import { Calendar, Plus, Trash2, Clock, CheckCircle2, AlertCircle, CalendarRange, ArrowRight, ShieldCheck, History, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EvaluationCycle {
  id?: number;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'closed' | 'upcoming';
  description: string;
}

export default function EvaluationPeriodManager() {
  const [cycles, setCycles] = useState<EvaluationCycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCycle, setNewCycle] = useState<Omit<EvaluationCycle, 'id'>>({
    name: '',
    year: new Date().getFullYear(),
    startDate: '',
    endDate: '',
    status: 'upcoming',
    description: ''
  });

  useEffect(() => {
    // Note: We'll store these in a new table in db.ts if it exists, 
    // or just use a mock state for this UI-only demonstration if the schema isn't ready.
    // For now, I'll check if evaluationCycles table exists.
    const fetchCycles = async () => {
      try {
        // Mock data for UI presentation since we are in UI-only finalization mode
        const mockCycles: EvaluationCycle[] = [
          { id: 1, name: 'الربع الأول 2024', year: 2024, startDate: '2024-01-01', endDate: '2024-03-31', status: 'closed', description: 'دورة تقييم الربع الأول لكافة قطاعات الوزارة' },
          { id: 2, name: 'الربع الثاني 2024', year: 2024, startDate: '2024-04-01', endDate: '2024-06-30', status: 'active', description: 'الدورة الحالية النشطة' },
          { id: 3, name: 'الربع الثالث 2024', year: 2024, startDate: '2024-07-01', endDate: '2024-09-30', status: 'upcoming', description: 'دورة قادمة مخططة' }
        ];
        setCycles(mockCycles);
        setIsLoading(false);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCycles();
  }, []);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 text-right" dir="rtl">
      {/* Ministry Grade Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-10 rounded-[3rem] shadow-premium border-b-8 border-accent relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-6">
           <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center text-accent shadow-massive">
              <CalendarRange size={40} />
           </div>
           <div>
              <h2 className="text-4xl font-black text-primary tracking-tighter">إدارة الدورات الزمنية للتقييم</h2>
              <p className="text-sm font-bold text-text-muted mt-2 uppercase tracking-widest">Temporal Evaluation Strategy & Oversight</p>
           </div>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="relative z-10 px-8 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-premium hover:bg-secondary transition-all flex items-center gap-3 border-b-4 border-accent active:translate-y-1"
        >
          <Plus size={18} strokeWidth={3} />
          فتح دورة تقييم استراتيجية
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-slate-100 space-y-8">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] block pr-1">الحالة الإحصائية</label>
                 <div className="space-y-3">
                    <StatRow label="إجمالي الدورات" value={cycles.length} />
                    <StatRow label="الدورات النشطة" value={cycles.filter(c => c.status === 'active').length} isAlert />
                    <StatRow label="الدورات المكتملة" value={cycles.filter(c => c.status === 'closed').length} />
                 </div>
              </div>

              <div className="p-6 bg-secondary/5 rounded-3xl border-2 border-dashed border-secondary/10">
                 <div className="flex gap-4 items-start">
                    <div className="p-2 bg-white rounded-xl shadow-sm text-secondary">
                       <Info size={20} />
                    </div>
                    <p className="text-[11px] font-bold text-secondary leading-relaxed">
                       إغلاق دورة التقييم يعني أرشفة النتائج نهائياً ومنع أي تعديل لاحق عليها.
                    </p>
                 </div>
              </div>
           </div>
        </div>

        <div className="lg:col-span-3">
           <div className="grid grid-cols-1 gap-6">
              <AnimatePresence>
                {cycles.map((cycle, idx) => (
                  <motion.div 
                    key={cycle.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group bg-white rounded-[2.5rem] p-8 shadow-premium border border-slate-100 hover:border-primary/20 transition-all flex flex-col md:flex-row items-center gap-10"
                  >
                    <div className="flex-1 flex items-center gap-8">
                       <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white border-4 border-white shadow-xl ${
                         cycle.status === 'active' ? 'bg-emerald-500 animate-pulse' : 
                         cycle.status === 'closed' ? 'bg-slate-400' : 'bg-primary'
                       }`}>
                         {cycle.status === 'active' ? <Clock size={28} /> : cycle.status === 'closed' ? <CheckCircle2 size={28} /> : <Calendar size={28} />}
                       </div>
                       <div>
                          <div className="flex items-center gap-3 mb-2">
                             <h4 className="text-xl font-black text-primary">{cycle.name}</h4>
                             <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                               cycle.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                               cycle.status === 'closed' ? 'bg-slate-50 text-slate-400 border-slate-100' : 
                               'bg-primary/5 text-primary border-primary/10'
                             }`}>
                               {cycle.status === 'active' ? 'نشطة حالياً (Active)' : cycle.status === 'closed' ? 'مؤرشفة (Closed)' : 'قادمة (Upcoming)'}
                             </span>
                          </div>
                          <p className="text-xs font-bold text-slate-400 leading-relaxed max-w-lg">{cycle.description}</p>
                       </div>
                    </div>

                    <div className="flex items-center gap-10">
                       <div className="text-center">
                          <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">فترة البداية</p>
                          <p className="text-sm font-black text-primary font-mono">{cycle.startDate}</p>
                       </div>
                       <div className="w-px h-10 bg-slate-100" />
                       <div className="text-center">
                          <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">فترة النهاية</p>
                          <p className="text-sm font-black text-primary font-mono">{cycle.endDate}</p>
                       </div>
                       <div className="w-px h-10 bg-slate-100" />
                       <div className="flex gap-2">
                          <button className="p-4 bg-slate-50 text-slate-400 hover:text-primary hover:bg-white border border-transparent hover:border-slate-100 rounded-2xl transition-all">
                             <History size={18} />
                          </button>
                          <button className="p-4 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-2xl transition-all border border-red-100">
                             <Trash2 size={18} />
                          </button>
                       </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
           </div>
        </div>
      </div>

      {/* Add Cycle Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-[#0a192f]/90 backdrop-blur-xl flex items-center justify-center p-4 z-[100]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-white rounded-[3.5rem] shadow-massive w-full max-w-2xl overflow-hidden border border-white/20 text-right"
            >
              <div className="bg-primary p-12 text-white relative overflow-hidden border-b-8 border-accent">
                 <div className="absolute top-0 right-0 w-48 h-48 bg-accent/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                 <div className="relative z-10 flex justify-between items-center">
                    <div>
                       <h3 className="text-3xl font-black tracking-tighter">فتح دورة تقييم جديدة</h3>
                       <p className="text-[10px] font-black text-accent uppercase tracking-[0.4em] mt-2">Temporal Strategy Setup v3.0</p>
                    </div>
                    <button onClick={() => setShowAddModal(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10">
                       <X className="w-6 h-6" />
                    </button>
                 </div>
              </div>

              <form className="p-12 space-y-10">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3 md:col-span-2">
                       <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block pr-2">مسمى دورة التقييم</label>
                       <input 
                         required
                         className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black focus:border-primary outline-none transition-all text-right"
                         placeholder="مثلاً: دورة الربع الأخير للعام الحالي..."
                         value={newCycle.name}
                         onChange={e => setNewCycle({...newCycle, name: e.target.value})}
                       />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block pr-2">تاريخ بدء الدورة</label>
                       <input 
                         type="date"
                         className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black focus:border-primary outline-none transition-all font-mono"
                         value={newCycle.startDate}
                         onChange={e => setNewCycle({...newCycle, startDate: e.target.value})}
                       />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block pr-2">تاريخ إغلاق الدورة</label>
                       <input 
                         type="date"
                         className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black focus:border-primary outline-none transition-all font-mono"
                         value={newCycle.endDate}
                         onChange={e => setNewCycle({...newCycle, endDate: e.target.value})}
                       />
                    </div>
                    <div className="space-y-3 md:col-span-2">
                       <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block pr-2">الوصف الاستراتيجي للدورة</label>
                       <textarea 
                         className="w-full h-32 px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black focus:border-primary outline-none transition-all text-right resize-none"
                         placeholder="أدخل تفاصيل عن أهداف هذه الدورة..."
                         value={newCycle.description}
                         onChange={e => setNewCycle({...newCycle, description: e.target.value})}
                       />
                    </div>
                 </div>

                 <button 
                  className="w-full h-20 bg-primary text-white rounded-[2rem] text-lg font-black uppercase tracking-[0.3em] shadow-premium hover:bg-secondary transition-all border-b-8 border-accent group active:translate-y-2 flex items-center justify-center gap-6"
                 >
                    <ShieldCheck size={28} className="text-accent group-hover:scale-110 transition-transform" />
                    إطلاق دورة التقييم
                 </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatRow({ label, value, isAlert = false }: { label: string, value: number, isAlert?: boolean }) {
  return (
    <div className="flex justify-between items-center py-4 border-b border-slate-50 last:border-0 group">
       <span className="text-[11px] font-black text-text-muted uppercase tracking-widest group-hover:text-primary transition-colors">{label}</span>
       <span className={`text-xl font-black ${isAlert ? 'text-secondary' : 'text-primary'}`}>{value}</span>
    </div>
  );
}
