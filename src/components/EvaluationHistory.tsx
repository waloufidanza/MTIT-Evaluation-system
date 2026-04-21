import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../db.ts';
import { Employee, Evaluation, EvaluationPeriod } from '../types.ts';
import { History, X, Calendar, FileText, ChevronDown, ChevronUp, Award, Filter, Search } from 'lucide-react';
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
      return matchesPeriod && matchesStart && matchesEnd;
    });
  }, [history, filterPeriod, startDate, endDate]);

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg shadow-2xl w-full max-w-4xl overflow-hidden relative my-8 border-b-4 border-accent"
      >
        <div className="bg-primary p-6 text-white flex justify-between items-center border-b border-white/10">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-accent" />
            <div>
              <h2 className="text-lg font-bold">سجل التقييمات الكامل</h2>
              <p className="text-white/70 text-[10px] uppercase font-bold tracking-widest">الموظف: {employee.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filter Section */}
        <div className="bg-slate-50 border-b border-border-theme p-4 px-6 md:px-8">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[150px]">
              <label className="text-[10px] font-bold text-text-muted uppercase mb-1 block">تصفية حسب نوع التقييم</label>
              <div className="relative">
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                <select 
                  value={filterPeriod}
                  onChange={e => setFilterPeriod(e.target.value as any)}
                  className="w-full pr-9 pl-3 py-2 bg-white border border-border-theme rounded text-xs focus:ring-1 focus:ring-primary outline-none appearance-none"
                >
                  <option value="all">كل الفترات</option>
                  <option value="monthly">شهري</option>
                  <option value="quarterly">ربع سنوي</option>
                  <option value="semi-annual">نصف سنوي</option>
                  <option value="annual">سنوي</option>
                </select>
              </div>
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="text-[10px] font-bold text-text-muted uppercase mb-1 block">من تاريخ</label>
              <input 
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-border-theme rounded text-xs focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            <div className="flex-1 min-w-[150px]">
              <label className="text-[10px] font-bold text-text-muted uppercase mb-1 block">إلى تاريخ</label>
              <input 
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-border-theme rounded text-xs focus:ring-1 focus:ring-primary outline-none"
              />
            </div>

            <button 
              onClick={() => {
                setFilterPeriod('all');
                setStartDate('');
                setEndDate('');
              }}
              className="text-[10px] font-bold text-primary hover:text-secondary px-2 py-2 underline"
            >
              إعادة تعيين
            </button>
          </div>
        </div>

        <div className="p-6 md:p-8 max-h-[60vh] overflow-y-auto">
          {filteredHistory.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-border-theme">
                <Search className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-text-muted font-bold">لم يتم العثور على تقييمات تطابق خيارات التصفية</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHistory.map((evalItem) => (
                <div key={evalItem.id} className="border border-border-theme rounded overflow-hidden shadow-sm">
                  <div 
                    onClick={() => setExpandedId(expandedId === evalItem.id ? null : evalItem.id!)}
                    className="p-4 bg-white hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-text-muted uppercase">تاريخ التقييم</span>
                        <div className="flex items-center gap-2 text-sm font-bold text-text-dark">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          {evalItem.date}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-text-muted uppercase">نوع التقييم</span>
                        <span className="text-sm font-bold text-primary">{getPeriodLabel(evalItem.period)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-text-muted uppercase">الدرجة النهائية</span>
                        <div className="flex items-center gap-2">
                          <Award className="w-3.5 h-3.5 text-accent" />
                          <span className="text-base font-black text-secondary">%{evalItem.totalScore.toFixed(0)}</span>
                        </div>
                      </div>
                      {evalItem.evaluatingDepartment && (
                        <div className="flex flex-col border-r border-border-theme pr-4">
                          <span className="text-[9px] font-bold text-secondary uppercase mb-0.5">الإدارة</span>
                          <span className="text-[11px] font-black text-secondary">{evalItem.evaluatingDepartment}</span>
                        </div>
                      )}
                    </div>
                    {expandedId === evalItem.id ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                  </div>

                  <AnimatePresence>
                    {expandedId === evalItem.id && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden bg-[#fafafa] border-t border-border-theme"
                      >
                        <div className="p-6 space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <h4 className="text-[11px] font-bold text-primary uppercase tracking-widest border-r-2 border-primary pr-2">تفاصيل المعايير</h4>
                              <div className="space-y-2">
                                {evalItem.criteria.map((c, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-xs p-2 bg-white rounded border border-border-theme">
                                    <span className="text-text-dark font-medium">{c.label}</span>
                                    <span className="font-bold text-secondary">{c.score} / 5</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-6">
                              <div className="space-y-3">
                                <h4 className="text-[11px] font-bold text-primary uppercase tracking-widest border-r-2 border-primary pr-2">التقييم السلوكي والإداري</h4>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="p-2 bg-white rounded border border-border-theme">
                                    <p className="text-[9px] text-text-muted font-bold uppercase mb-1">الانضباط</p>
                                    <p className="text-[10px] font-black text-text-dark text-center">
                                      {evalItem.attendance === 'excellent' ? 'ممتاز' : 
                                       evalItem.attendance === 'good' ? 'جيد' : 
                                       evalItem.attendance === 'average' ? 'متوسط' : 'ضعيف'}
                                    </p>
                                  </div>
                                  <div className="p-2 bg-white rounded border border-border-theme">
                                    <p className="text-[9px] text-text-muted font-bold uppercase mb-1">الالتزام</p>
                                    <p className="text-[10px] font-black text-text-dark text-center">
                                      {evalItem.discipline === 'committed' ? 'ملتزم جداً' : 
                                       evalItem.discipline === 'needs-improvement' ? 'يحتاج تحسين' : 'لديه تنبيهات'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              {evalItem.trainingNeeds && evalItem.trainingNeeds.length > 0 && (
                                <div className="space-y-3">
                                  <h4 className="text-[11px] font-bold text-primary uppercase tracking-widest border-r-2 border-primary pr-2">الاحتياجات التدريبية</h4>
                                  <div className="flex flex-wrap gap-1">
                                    {evalItem.trainingNeeds.map((need, idx) => (
                                      <span key={idx} className="text-[9px] font-bold bg-secondary/5 text-secondary border border-secondary/10 px-2 py-1 rounded">
                                        {need}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="space-y-3">
                                <h4 className="text-[11px] font-bold text-primary uppercase tracking-widest border-r-2 border-primary pr-2">ملاحظات التقييم</h4>
                                <div className="p-4 bg-white rounded border border-border-theme text-xs text-text-dark min-h-[60px] leading-relaxed">
                                  {evalItem.notes || <span className="text-slate-300 italic">لا توجد ملاحظات مسجلة</span>}
                                </div>
                              </div>
                            </div>
                          </div>

                          {evalItem.aiAnalysis && (
                            <div className="space-y-3">
                              <h4 className="text-[11px] font-bold text-accent uppercase tracking-widest border-r-2 border-accent pr-2 flex items-center gap-2">
                                <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                                التحليل الذكي للوزارة
                              </h4>
                              <div className="p-4 ai-gradient text-white rounded text-[11px] leading-relaxed shadow-inner opacity-90 prose-invert prose-sm max-w-none text-right">
                                <div dangerouslySetInnerHTML={{ __html: evalItem.aiAnalysis.replace(/\n/g, '<br/>') }} />
                              </div>
                            </div>
                          )}
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
