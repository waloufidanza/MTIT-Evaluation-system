import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../db.ts';
import { Employee, Evaluation, EvaluationPeriod } from '../types.ts';
import { History, X, Calendar, FileText, ChevronDown, ChevronUp, Award, Filter, Search, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EvaluationHistoryProps {
  employee: Employee;
  onClose: () => void;
}

export default function EvaluationHistory({ employee, onClose }: EvaluationHistoryProps) {
  const [history, setHistory] = useState<Evaluation[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  // Filter States
  const [filterPeriod, setFilterPeriod] = useState<EvaluationPeriod | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadHistory();
  }, [employee.id]);

  const loadHistory = async () => {
    if (employee.id) {
      const data = await db.evaluations
        .where('employeeId')
        .equals(employee.id)
        .sortBy('date');
      setHistory(data.reverse());
    }
  };

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const matchesPeriod = filterPeriod === 'all' || item.period === filterPeriod;
      const matchesStart = !startDate || item.date >= startDate;
      const matchesEnd = !endDate || item.date <= endDate;
      
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        (item.notes && item.notes.toLowerCase().includes(searchLower)) ||
        item.criteria.some(c => c.label.toLowerCase().includes(searchLower));
        
      return matchesPeriod && matchesStart && matchesEnd && matchesSearch;
    });
  }, [history, filterPeriod, startDate, endDate, searchTerm]);

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'monthly': return 'شهري';
      case 'quarterly': return 'ربع سنوي';
      case 'semi-annual': return 'نصف سنوي';
      case 'annual': return 'سنوي';
      default: return period;
    }
  };

  return (
    <div className="fixed inset-0 bg-primary/40 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl overflow-hidden relative my-8 border border-white/20"
      >
        <div className="bg-primary p-8 text-white flex justify-between items-center relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent opacity-5 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2" />
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-accent">
              <History size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter">سجل تقييمات الكادر</h2>
              <p className="text-white/50 text-[10px] uppercase font-black tracking-[0.2em] mt-1">{employee.name} | الرقم الوظيفي #{employee.employeeId}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-2xl transition-all relative z-10 group"
          >
            <X className="w-6 h-6 transition-transform group-hover:rotate-90" />
          </button>
        </div>

        {/* Filter Section */}
        <div className="bg-slate-50 border-b border-border-theme p-6 px-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-label">نوع التقييم</label>
              <select 
                value={filterPeriod}
                onChange={e => setFilterPeriod(e.target.value as any)}
                className="w-full px-4 py-3 bg-white border border-border-theme rounded-2xl text-xs font-bold outline-none shadow-sm focus:ring-2 focus:ring-accent/20"
              >
                <option value="all">كل الفترات</option>
                <option value="monthly">شهري</option>
                <option value="quarterly">ربع سنوي</option>
                <option value="semi-annual">نصف سنوي</option>
                <option value="annual">سنوي</option>
              </select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-label">البحث المحتوى (المعايير أو الملاحظات)</label>
              <div className="relative text-right">
                <Search size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input 
                  type="text"
                  placeholder="ابحث..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pr-11 pl-4 py-3 bg-white border border-border-theme rounded-2xl text-xs font-bold outline-none shadow-sm focus:ring-2 focus:ring-accent/20"
                />
              </div>
            </div>

            <div className="flex gap-2">
               <div className="flex-1 space-y-1">
                 <label className="text-[9px] font-black text-text-muted uppercase">من</label>
                 <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full h-11 px-3 bg-white border border-border-theme rounded-xl text-[10px] font-bold" />
               </div>
               <div className="flex-1 space-y-1">
                 <label className="text-[9px] font-black text-text-muted uppercase">إلى</label>
                 <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full h-11 px-3 bg-white border border-border-theme rounded-xl text-[10px] font-bold" />
               </div>
               <button 
                 onClick={() => { setFilterPeriod('all'); setStartDate(''); setEndDate(''); setSearchTerm(''); }}
                 className="h-11 px-4 bg-white border border-border-theme rounded-xl text-[10px] font-black text-red-500 hover:bg-red-50 transition-all uppercase"
               >
                 تصفير
               </button>
            </div>
          </div>
        </div>

        <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar text-right">
          {filteredHistory.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 border border-slate-100">
                <Search size={40} className="text-slate-200" />
              </div>
              <p className="text-text-muted font-black uppercase tracking-widest text-sm">لم يتم العثور على تقييمات</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredHistory.map((evalItem) => (
                <div key={evalItem.id} className="bg-white border border-border-theme rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-md transition-all">
                  <div 
                    onClick={() => setExpandedId(expandedId === evalItem.id ? null : evalItem.id!)}
                    className="p-6 md:p-8 hover:bg-slate-50/50 cursor-pointer flex items-center justify-between transition-colors group"
                  >
                    <div className="flex flex-wrap items-center gap-10">
                      <div className="flex flex-col">
                        <span className="text-label mb-1">تاريخ التقييم</span>
                        <div className="flex items-center gap-2 text-sm font-black text-primary">
                          <Calendar size={16} className="text-accent" />
                          {evalItem.date}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-label mb-1">نوع الدورة</span>
                        <span className="text-sm font-black text-primary bg-slate-100 px-3 py-1 rounded-full">{getPeriodLabel(evalItem.period)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-label mb-1">النتيجة النهائية</span>
                        <div className="flex items-center gap-2">
                          <Award size={18} className="text-accent" />
                          <span className={`text-xl font-black ${
                            evalItem.totalScore >= 90 ? 'text-emerald-600' :
                            evalItem.totalScore >= 75 ? 'text-blue-600' :
                            evalItem.totalScore >= 50 ? 'text-amber-600' : 'text-red-600'
                          }`}>%{evalItem.totalScore.toFixed(0)}</span>
                        </div>
                      </div>
                      {evalItem.evaluatingDepartment && (
                        <div className="flex flex-col border-r-2 border-slate-100 pr-10">
                          <span className="text-label mb-1">الإدارة المقيمة</span>
                          <span className="text-sm font-black text-primary">{evalItem.evaluatingDepartment}</span>
                        </div>
                      )}
                    </div>
                    <div className={`w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center transition-all ${expandedId === evalItem.id ? 'rotate-180 bg-accent/10 text-accent' : 'group-hover:bg-slate-100'}`}>
                      <ChevronDown size={20} />
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedId === evalItem.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-slate-50/50 border-t border-border-theme"
                      >
                        <div className="p-8 md:p-10 space-y-10">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            <div className="space-y-6">
                              <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-3">
                                 <div className="w-1.5 h-1.5 bg-accent rounded-full" /> تفاصيل معايير الأداء
                              </h4>
                              <div className="grid grid-cols-1 gap-3">
                                {evalItem.criteria.map((c, idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-border-theme shadow-sm">
                                    <span className="text-xs font-black text-primary">{c.label}</span>
                                    <div className="flex items-center gap-2">
                                       <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                          <div className="h-full bg-accent" style={{ width: `${(c.score/5)*100}%` }} />
                                       </div>
                                       <span className="text-xs font-black text-accent">{c.score} / 5</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-8">
                               <div className="space-y-6">
                                  <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-3">
                                     <div className="w-1.5 h-1.5 bg-accent rounded-full" /> السلوك والنمو
                                  </h4>
                                  <div className="grid grid-cols-2 gap-4">
                                     <div className="bg-white p-4 rounded-2xl border border-border-theme shadow-sm">
                                        <p className="text-[10px] font-black text-text-muted uppercase mb-1">الانضباط والحضور</p>
                                        <p className="text-xs font-black text-primary uppercase">{evalItem.attendance}</p>
                                     </div>
                                     <div className="bg-white p-4 rounded-2xl border border-border-theme shadow-sm">
                                        <p className="text-[10px] font-black text-text-muted uppercase mb-1">الرغبة في التطوير</p>
                                        <p className="text-xs font-black text-primary uppercase">{evalItem.willingnessToImprove}</p>
                                     </div>
                                  </div>
                               </div>

                               <div className="space-y-4">
                                  <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-3">
                                     <div className="w-1.5 h-1.5 bg-accent rounded-full" /> الملاحظات والتوجيهات
                                  </h4>
                                  <div className="bg-white p-6 rounded-2xl border border-border-theme shadow-sm text-sm font-medium leading-loose text-primary italic">
                                     {evalItem.notes || 'لا توجد ملاحظات إضافية مسجلة.'}
                                  </div>
                               </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
