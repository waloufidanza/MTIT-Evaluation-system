/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../db.ts';
import { Employee, Evaluation } from '../types.ts';
import { 
  ArrowLeftRight, 
  Search, 
  User, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Award, 
  Filter, 
  X, 
  Info,
  Building2,
  ChevronRight,
  ShieldCheck,
  BarChart3,
  Scale
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer, 
  Legend, 
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell
} from 'recharts';

export default function ComparisonView() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [evaluations, setEvaluations] = useState<Record<number, Evaluation[]>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const allEmps = await db.employees.toArray();
      setEmployees(allEmps);
      
      const allEvals = await db.evaluations.toArray();
      const evalMap: Record<number, Evaluation[]> = {};
      allEvals.forEach(ev => {
        if (!evalMap[ev.employeeId]) evalMap[ev.employeeId] = [];
        evalMap[ev.employeeId].push(ev);
      });
      setEvaluations(evalMap);
      setIsLoading(false);
    };
    fetchAll();
  }, []);

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      if (selectedIds.length < 3) {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const comparisonData = useMemo(() => {
    if (selectedIds.length === 0) return [];

    // Common criteria labels found across all selected employees (or at least some)
    const commonLabels = new Set<string>();
    selectedIds.forEach(id => {
      const evals = evaluations[id] || [];
      if (evals.length > 0) {
        evals[0].criteria.forEach(c => commonLabels.add(c.label));
      }
    });

    return Array.from(commonLabels).map(label => {
      const entry: any = { subject: label };
      selectedIds.forEach(id => {
        const empName = employees.find(e => e.id === id)?.name || id.toString();
        const evals = evaluations[id] || [];
        const latest = evals[0];
        const crit = latest?.criteria.find(c => c.label === label);
        entry[empName] = crit ? crit.score : 0;
      });
      return entry;
    });
  }, [selectedIds, evaluations, employees]);

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 text-right pb-20" dir="rtl">
      {/* Sovereignty Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-10 rounded-[3rem] shadow-premium border-b-8 border-accent relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-6">
           <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center text-accent shadow-massive">
              <Scale size={40} />
           </div>
           <div>
              <h2 className="text-4xl font-black text-primary tracking-tighter">مصفوفة المقارنة المتقدمة</h2>
              <p className="text-sm font-bold text-text-muted mt-2 uppercase tracking-widest">Cross-Personnel Intelligence Comparison Matrix</p>
           </div>
        </div>

        <div className="relative z-10 w-full md:w-96">
           <div className="relative group">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
              <input 
                type="text"
                className="w-full pr-12 pl-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-primary focus:bg-white transition-all text-right"
                placeholder="البحث عن كادر للمقارنة..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        {/* Selection Sidebar */}
        <div className="lg:col-span-1 space-y-8">
           <div className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-slate-100 space-y-6">
              <div className="flex justify-between items-center pr-1 border-r-4 border-accent">
                 <h3 className="text-sm font-black text-primary uppercase tracking-widest">قائمة المستهدفين</h3>
                 <span className="text-[10px] font-black text-secondary bg-secondary/5 px-2 py-1 rounded-lg">Max 3</span>
              </div>
              
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
                {filteredEmployees.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => emp.id && toggleSelect(emp.id)}
                    className={`w-full text-right p-4 rounded-2xl border-2 transition-all group ${
                      selectedIds.includes(emp.id!) 
                      ? 'bg-primary border-primary text-white shadow-xl flex items-center justify-between' 
                      : 'bg-white border-slate-50 text-text-dark hover:border-slate-100'
                    }`}
                  >
                    <div>
                      <p className={`text-[11px] font-black truncate ${selectedIds.includes(emp.id!) ? 'text-white' : 'text-primary'}`}>{emp.name}</p>
                      <p className={`text-[9px] font-bold ${selectedIds.includes(emp.id!) ? 'text-white/60' : 'text-slate-400'}`}>{emp.department}</p>
                    </div>
                    {selectedIds.includes(emp.id!) && <ShieldCheck className="text-accent" size={18} />}
                  </button>
                ))}
              </div>

              {selectedIds.length === 0 && (
                <div className="p-10 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100 italic text-[11px] font-bold text-text-muted opacity-40">
                  يرجى اختيار موظفين للمقارنة من القائمة أعلاه
                </div>
              )}

              {selectedIds.length > 0 && (
                 <button 
                  onClick={() => setSelectedIds([])}
                  className="w-full py-4 bg-red-50 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                 >
                   <X size={14} /> تصفية القائمة بالكامل
                 </button>
              )}
           </div>
        </div>

        {/* Main Comparison Area */}
        <div className="lg:col-span-3 space-y-10">
           {selectedIds.length > 0 ? (
             <div className="space-y-10">
                {/* Visual Radar Matrix */}
                <div className="bg-white rounded-[3.5rem] p-10 shadow-premium border border-slate-100">
                   <div className="flex justify-between items-end mb-10">
                      <div className="space-y-2">
                        <h3 className="text-2xl font-black text-primary tracking-tighter">مخطط الكفاءة المتعدد</h3>
                        <p className="text-sm font-bold text-text-muted">تحليل بصمة الأداء النوعي بمقارنة 3 محاور بحد أقصى</p>
                      </div>
                      <BarChart3 className="text-accent" size={32} />
                   </div>

                   <div className="h-[500px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={comparisonData}>
                          <PolarGrid stroke="#f1f5f9" />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                          <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 8 }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '1rem', color: '#fff' }}
                            itemStyle={{ fontWeight: 900, fontSize: '10px' }}
                          />
                          <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 900, fontSize: '12px' }} />
                          {selectedIds.map((id, index) => {
                            const name = employees.find(e => e.id === id)?.name || id.toString();
                            const colors = ['#0f172a', '#d4af37', '#10b981'];
                            return (
                              <Radar
                                key={id}
                                name={name}
                                dataKey={name}
                                stroke={colors[index % colors.length]}
                                fill={colors[index % colors.length]}
                                fillOpacity={0.4}
                                strokeWidth={3}
                                animationDuration={1500}
                              />
                            );
                          })}
                        </RadarChart>
                      </ResponsiveContainer>
                   </div>
                </div>

                {/* Score Comparison Bars */}
                <div className="bg-white rounded-[3.5rem] p-10 shadow-premium border border-slate-100 space-y-10">
                   <div className="flex items-center gap-4 border-r-8 border-secondary pr-6">
                      <TrendingUp className="text-secondary" size={32} />
                      <h4 className="text-xl font-black text-primary uppercase tracking-tighter">تفاوت المؤشرات الكلية</h4>
                   </div>

                   <div className="grid grid-cols-1 gap-8">
                      {selectedIds.map(id => {
                        const emp = employees.find(e => e.id === id)!;
                        const evals = evaluations[id] || [];
                        const score = evals.length > 0 ? evals[0].totalScore : 0;
                        return (
                          <div key={id} className="space-y-3">
                             <div className="flex justify-between items-end">
                                <div>
                                   <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">{emp.department}</p>
                                   <p className="text-lg font-black text-primary">{emp.name}</p>
                                </div>
                                <span className="text-2xl font-black text-primary">%{score.toFixed(1)}</span>
                             </div>
                             <div className="h-6 w-full bg-slate-50 rounded-2xl p-1.5 border border-slate-100 relative group overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${score}%` }}
                                  transition={{ duration: 1.5, ease: 'circOut' }}
                                  className={`h-full rounded-xl transition-colors ${
                                    score >= 90 ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 
                                    score >= 70 ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-amber-500 shadow-lg shadow-amber-500/20'
                                  }`}
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                             </div>
                          </div>
                        );
                      })}
                   </div>
                </div>

                {/* Comparison Insights */}
                <div className="p-10 bg-[#0f172a] rounded-[3.5rem] shadow-massive relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-48 h-48 bg-accent/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                   <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                      <div className="w-24 h-24 bg-white/5 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center text-accent border border-white/10">
                         <Activity size={40} className="animate-pulse" />
                      </div>
                      <div className="flex-1 space-y-3 text-center md:text-right">
                         <h4 className="text-xl font-black text-white tracking-tight uppercase">رؤى التحليل المقارن (Intelligence Insight)</h4>
                         <p className="text-[13px] text-white/60 leading-relaxed font-bold">
                            الذكاء الاصطناعي يرصد تفاوت بمقدار <span className="text-accent underline text-base">%{Math.abs((evaluations[selectedIds[0]]?.[0]?.totalScore || 0) - (evaluations[selectedIds[1]]?.[0]?.totalScore || 0)).toFixed(1)}</span> في مستويات الكفاءة بين المستهدفين الأوائل. نوصي بمراجعة معيار "سرعة الإنجاز" حيث يتفوق الطرف الأول بفارق مهني ملحوظ.
                         </p>
                      </div>
                   </div>
                </div>
             </div>
           ) : (
             <div className="h-[600px] flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[4rem] text-center p-20 text-slate-300">
                <div className="w-32 h-32 bg-white rounded-[2.5rem] shadow-sm flex items-center justify-center mb-10 border border-slate-100">
                    <Scale size={64} strokeWidth={1} className="opacity-20" />
                </div>
                <h3 className="text-3xl font-black mb-4">في انتظار اختيار الكوادر</h3>
                <p className="text-lg font-bold max-w-md">قم بتحديد حتى 3 موظفين من القائمة الجانبية لتوليد مصفوفة المقارنة التكتيكية الفورية.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
