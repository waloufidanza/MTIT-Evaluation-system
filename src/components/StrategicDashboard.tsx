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
        <div className="lg:col-span-2 luxury-card p-12 relative">
            <div className="flex justify-between items-center mb-16">
               <div>
                 <h3 className="text-3xl font-black text-primary tracking-tighter">مؤشرات الكفاءة القطاعية</h3>
                 <p className="technical-label mt-2">Departmental Performance Benchmarking v4.0</p>
               </div>
               <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                  <Activity size={24} className="text-accent" />
               </div>
            </div>
            <div className="h-[480px]">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={deptChartData} layout="vertical" margin={{ left: 30, right: 30 }}>
                   <defs>
                     <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                       <stop offset="0%" stopColor="#0a192f" />
                       <stop offset="100%" stopColor="#c5a059" />
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="6 6" horizontal={true} vertical={false} stroke="#f1f5f9" />
                   <XAxis type="number" domain={[0, 100]} hide />
                   <YAxis 
                     dataKey="name" 
                     type="category" 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{ fontSize: 13, fontWeight: 'black', fill: '#0a192f', fontFamily: 'Inter' }} 
                     width={150} 
                   />
                   <Tooltip 
                     cursor={{ fill: 'rgba(10, 25, 47, 0.03)' }}
                     contentStyle={{ 
                       borderRadius: '24px', 
                       border: '1px solid #e2e8f0', 
                       boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', 
                       fontSize: '12px', 
                       direction: 'rtl', 
                       fontWeight: 'bold',
                       background: 'white'
                     }}
                   />
                   <Bar 
                     dataKey="avg" 
                     fill="url(#barGradient)" 
                     radius={[0, 10, 10, 0]} 
                     barSize={32}
                   >
                     {deptChartData.map((entry, index) => (
                       <Cell key={`cell-${index}`} />
                     ))}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
            </div>
        </div>

        <div className="luxury-card flex flex-col group">
              <div className="p-10 bg-primary border-b border-primary/20 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-40 h-40 bg-accent/20 rounded-full blur-[60px] -translate-y-20 -translate-x-10 pointer-events-none" />
                 <div className="relative z-10">
                   <h3 className="text-xl font-bold flex items-center gap-4 text-white uppercase tracking-tight">
                      <BrainCircuit className="text-accent" size={24} />
                      تقرير هيئة الاستخبارات الإدارية
                   </h3>
                   <div className="technical-label text-white/40 mt-3 opacity-100">CONFIDENTIAL • AI STRATEGIC BRIEF</div>
                 </div>
              </div>
          <div className="p-10 flex-1 overflow-y-auto max-h-[650px] custom-scrollbar bg-slate-50/30">
             {isAnalyzing ? (
               <div className="h-full flex flex-col items-center justify-center gap-8 text-text-muted">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
                    <BrainCircuit size={24} className="absolute inset-0 m-auto text-accent animate-pulse" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm font-black tracking-widest uppercase text-primary animate-pulse">Processing Ministry Intelligence...</p>
                    <p className="text-[10px] technical-label text-text-muted">Analyzing correlation patterns and risk vectors</p>
                  </div>
               </div>
             ) : strategicInsights ? (
               <div className="prose prose-slate prose-sm text-right leading-loose font-medium ai-markdown-container max-w-none">
                  <Markdown>{strategicInsights}</Markdown>
               </div>
             ) : (
               <div className="h-full flex flex-col items-center justify-center gap-8 text-center py-20 opacity-40">
                  <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-lg flex items-center justify-center text-slate-200 border border-slate-100">
                     <FileSearch size={44} />
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-primary max-w-[250px] leading-relaxed mx-auto uppercase tracking-widest">Awaiting Analysis Command</p>
                    <p className="text-[10px] technical-label">System idle. Performance data available for processing.</p>
                  </div>
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


