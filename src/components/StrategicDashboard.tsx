/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../db.ts';
import { Evaluation } from '../types.ts';
import { 
  BarChart3, 
  TrendingUp, 
  ShieldCheck, 
  BrainCircuit, 
  Users, 
  Target, 
  AlertCircle,
  RefreshCw,
  FileSearch,
  ChevronRight,
  Trophy,
  Activity,
  Zap,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { aggregateMinistryAnalysis } from '../services/geminiService.ts';
import Markdown from 'react-markdown';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area
} from 'recharts';

export default function StrategicDashboard() {
  const [allEvaluations, setAllEvaluations] = useState<Evaluation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [strategicInsights, setStrategicInsights] = useState<string | null>(null);
  const [stats, setStats] = useState({
    avgScore: 0,
    totalEvaluations: 0,
    topDept: '',
    riskDept: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      const evals = await db.evaluations.toArray();
      setAllEvaluations(evals);

      if (evals.length > 0) {
        const avg = evals.reduce((acc, curr) => acc + curr.totalScore, 0) / evals.length;
        
        // Group by dept
        const deptScores: Record<string, { total: number, count: number }> = {};
        evals.forEach(e => {
          const dept = e.evaluatingDepartment || 'غير مصنف';
          if (!deptScores[dept]) deptScores[dept] = { total: 0, count: 0 };
          deptScores[dept].total += e.totalScore;
          deptScores[dept].count += 1;
        });

        const deptAverages = Object.entries(deptScores).map(([name, data]) => ({
          name,
          avg: data.total / data.count
        })).sort((a, b) => b.avg - a.avg);

        setStats({
          avgScore: avg,
          totalEvaluations: evals.length,
          topDept: deptAverages[0]?.name || 'N/A',
          riskDept: deptAverages[deptAverages.length - 1]?.name || 'N/A'
        });
      }
    };
    fetchData();
  }, []);

  const runStrategicAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await aggregateMinistryAnalysis(allEvaluations);
      setStrategicInsights(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const deptChartData = useMemo(() => {
    const depts: Record<string, { total: number, count: number }> = {};
    allEvaluations.forEach(e => {
        const d = e.evaluatingDepartment || 'أخرى';
        if (!depts[d]) depts[d] = { total: 0, count: 0 };
        depts[d].total += e.totalScore;
        depts[d].count += 1;
    });
    return Object.entries(depts).map(([name, data]) => ({
      name,
      avg: data.total / data.count
    })).sort((a, b) => b.avg - a.avg);
  }, [allEvaluations]);

  return (
    <div className="space-y-12 pb-20">
      {/* Strategic Hero Section */}
      <div className="relative h-[480px] rounded-[3.5rem] bg-primary overflow-hidden flex flex-col justify-center px-16 shadow-2xl">
        <div className="absolute top-0 right-0 w-full h-full opacity-10">
          <div className="absolute top-10 right-20 w-96 h-96 bg-accent rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-10 left-20 w-[500px] h-[500px] bg-secondary rounded-full blur-[150px]" />
        </div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5" />
        
        <div className="relative z-10 max-w-4xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-6 py-2.5 bg-white/10 backdrop-blur-md rounded-full text-accent text-[11px] font-black uppercase tracking-[0.3em] mb-10 border border-white/10 shadow-inner"
          >
            <Sparkles size={14} className="animate-spin-slow" /> Strategic Performance Unit
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-7xl font-black text-white leading-[1.1] tracking-tighter mb-8"
          >
            منصة التحليل <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent/60">الاستراتيجي</span> الذكي
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-white/50 font-medium leading-relaxed max-w-2xl mb-12"
          >
            نظام متقدم يعتمد على الذكاء الاصطناعي لرصد التوجهات الاستراتيجية، قياس الكفاءة المؤسسية، واستشراف مستقبل الأداء في كافة قطاعات الوزارة.
          </motion.p>
          <div className="flex gap-4">
            <button 
              onClick={runStrategicAnalysis}
              disabled={isAnalyzing}
              className="btn-modern btn-accent flex items-center gap-4 px-10 h-16 text-[13px] group disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="animate-spin" size={24} />
                  جاري معالجة البيانات الضخمة...
                </>
              ) : (
                <>
                  <BrainCircuit size={24} className="group-hover:rotate-12 transition-transform" />
                  توليد التقرير الاستراتيجي
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StrategicStat 
          label="كفاءة الأداء العام" 
          value={`${stats.avgScore.toFixed(1)}%`} 
          desc="متوسط مؤشر الإنجاز المؤسسي" 
          icon={<Activity />} 
        />
        <StrategicStat 
          label="إجمالي التقارير" 
          value={stats.totalEvaluations} 
          desc="سجلات التقييم المعتمدة" 
          icon={<Zap />} 
        />
        <StrategicStat 
          label="الإدارة الأعلى أداءً" 
          value={stats.topDept} 
          desc="التميز التشغيلي والقيادي" 
          icon={<Trophy />} 
        />
        <StrategicStat 
          label="نطاق التحدي" 
          value={stats.riskDept} 
          desc="تتطلب تطوير ومتابعة حثيثة" 
          icon={<Target />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white rounded-[3rem] border border-border-theme p-10 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
           <div className="flex justify-between items-center mb-12 relative z-10">
              <h3 className="text-2xl font-black flex items-center gap-4 text-primary uppercase tracking-tight">
                 <BarChart3 className="text-accent" size={28} />
                 ترتيب القطاعات حسب الكفاءة النوعية
              </h3>
           </div>
           <div className="h-[450px] relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptChartData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 13, fontWeight: 'black', fill: '#64748b' }} width={140} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', fontSize: '12px', direction: 'rtl', fontWeight: 'bold' }}
                  />
                  <Bar 
                    dataKey="avg" 
                    fill="#0a192f" 
                    radius={[0, 12, 12, 0]} 
                    barSize={24}
                  >
                    {deptChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.avg >= 85 ? '#c5a059' : '#0a192f'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white rounded-[3rem] border border-border-theme overflow-hidden shadow-sm flex flex-col group">
              <div className="p-10 bg-slate-50 border-b border-border-theme group-hover:bg-slate-100 transition-colors">
                 <h3 className="text-xl font-bold flex items-center gap-4 text-primary uppercase">
                    <BrainCircuit className="text-accent" size={24} />
                    مخرجات المحلل الذكي
                 </h3>
                 <p className="text-[10px] font-bold text-text-muted mt-2 tracking-widest">Generative Strategic Insights v4.0</p>
              </div>
          <div className="p-10 flex-1 overflow-y-auto max-h-[600px] custom-scrollbar">
             {isAnalyzing ? (
               <div className="h-60 flex flex-col items-center justify-center gap-6 text-text-muted">
                  <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
                  <p className="text-sm font-black animate-pulse tracking-widest uppercase">Analyzing ministry data patterns...</p>
               </div>
             ) : strategicInsights ? (
               <div className="prose prose-slate prose-sm text-right leading-loose font-medium ai-markdown-container">
                  <Markdown>{strategicInsights}</Markdown>
               </div>
             ) : (
               <div className="h-60 flex flex-col items-center justify-center gap-6 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 border border-slate-100">
                     <BrainCircuit size={40} />
                  </div>
                  <p className="text-xs font-bold text-text-muted max-w-[220px] leading-relaxed">
                    محرك التحليل الاستراتيجي بانتظار أمر التنشيط لبدء معالجة البيانات الحالية.
                  </p>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StrategicStat({ label, value, desc, icon }: { label: string, value: string | number, desc: string, icon: any }) {
  return (
    <div className="bg-white p-10 rounded-[2.5rem] border border-border-theme shadow-sm group hover:border-accent transition-all duration-500 hover:shadow-xl hover:-translate-y-2 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl -translate-y-16 translate-x-16 pointer-events-none" />
      <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center mb-8 group-hover:bg-accent/10 transition-all border border-slate-100 group-hover:shadow-[0_0_20px_rgba(197,160,89,0.2)]">
        {React.cloneElement(icon, { size: 28, className: "transition-transform group-hover:scale-110" })}
      </div>
      <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-[0.25em] mb-3 relative z-10">{label}</h3>
      <div className="text-4xl font-black text-primary mb-3 tracking-tighter relative z-10">{value}</div>
      <p className="text-xs text-text-muted font-bold leading-relaxed relative z-10">{desc}</p>
    </div>
  );
}


