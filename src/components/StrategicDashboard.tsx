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
  Sparkles,
  Cpu
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
    <div className="space-y-12 pb-24 px-4 md:px-8 max-w-[1600px] mx-auto animate-in fade-in duration-1000">
      {/* Strategic Hero Section - Ministry Grade */}
      <div className="relative min-h-[550px] rounded-[4rem] bg-primary overflow-hidden flex flex-col justify-center px-12 md:px-20 shadow-premium group">
        <div className="absolute inset-0 glossy-mesh opacity-60" />
        <div className="absolute top-0 right-0 w-full h-full opacity-20 overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-1/2 h-1/2 bg-accent rounded-full blur-[150px] animate-pulse" />
          <div className="absolute bottom-[-10%] left-[-10%] w-1/3 h-1/3 bg-blue-400 rounded-full blur-[120px]" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
        </div>
        
        <div className="relative z-10 max-w-5xl">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-4 px-8 py-3 bg-white/10 backdrop-blur-xl rounded-full text-accent text-[12px] font-black uppercase tracking-[0.4em] mb-12 border border-white/20 shadow-premium"
          >
            <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
            Strategic Intelligence Division
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-black text-white leading-[1] tracking-tighter mb-10"
          >
            مركز تحليل <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-accent/80 to-accent/40 drop-shadow-2xl">الأداء الاستراتيجي</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-2xl text-white/60 font-medium leading-relaxed max-w-3xl mb-14"
          >
            النظام السيادي الموحد لاستشراف جودة المخرجات المؤسسية وقياس مؤشرات النمو في الكادر البشري التابع لوزارة الاتصالات وتقنية المعلومات.
          </motion.p>
          <div className="flex flex-wrap gap-6">
            <button 
              onClick={runStrategicAnalysis}
              disabled={isAnalyzing}
              className="btn-modern bg-accent text-primary flex items-center gap-5 px-12 h-20 text-[15px] font-black group disabled:opacity-50 shadow-premium hover:shadow-accent/20"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="animate-spin" size={26} />
                  جاري تحليل الارتباطات الضخمة...
                </>
              ) : (
                <>
                  <BrainCircuit size={26} className="group-hover:rotate-12 transition-transform" />
                  تفعيل الخوارزمية الاستراتيجية
                </>
              )}
            </button>
            <div className="flex items-center gap-5 px-8 h-20 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md">
               <div className="text-right">
                  <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Status</div>
                  <div className="text-emerald-400 text-sm font-black flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-emerald-400" /> Operational
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Grid - Reusing StrategicStat with Ministry Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StrategicStat 
          label="معدل الكفاءة الموحد" 
          value={`${stats.avgScore.toFixed(1)}%`} 
          desc="المتوسط الوزاري العام للأداء" 
          icon={<Activity />} 
        />
        <StrategicStat 
          label="السجلات المعتمدة" 
          value={stats.totalEvaluations} 
          desc="إجمالي دورات التقييم المكتملة" 
          icon={<Zap />} 
        />
        <StrategicStat 
          label="قطاع التميز" 
          value={stats.topDept} 
          desc="الإدارة الحائزة على أعلى تقييم" 
          icon={<Trophy />} 
        />
        <StrategicStat 
          label="المؤشر الاستباقي" 
          value={stats.riskDept} 
          desc="القطاع المستهدف للتحسين" 
          icon={<Target />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Department Performance Chart Case */}
        <div className="lg:col-span-2 ministry-card p-12 relative overflow-hidden bg-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16 relative z-10">
               <div>
                 <div className="flex items-center gap-4 mb-4">
                    <div className="w-1.5 h-6 bg-accent rounded-full" />
                    <span className="text-[12px] font-black text-accent uppercase tracking-[0.4em]">Sectoral Benchmark Matrix</span>
                 </div>
                 <h3 className="text-4xl font-black text-primary tracking-tighter">مقارنة أداء القطاعات</h3>
               </div>
               <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-[10px] font-black text-text-muted uppercase tracking-widest opacity-50">Data Refresh Rate</div>
                    <div className="text-[12px] font-black text-primary">Live Ministry Feed</div>
                  </div>
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-accent border border-slate-100 shadow-inner">
                    <BarChart3 size={24} />
                  </div>
               </div>
            </div>
            
            <div className="h-[550px] relative z-10 pr-4">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={deptChartData} layout="vertical" margin={{ left: 40, right: 40, top: 0, bottom: 0 }}>
                   <defs>
                     <linearGradient id="premiumBarGradient" x1="0" y1="0" x2="1" y2="0">
                       <stop offset="0%" stopColor="#0a192f" />
                       <stop offset="100%" stopColor="#c5a059" stopOpacity={0.8} />
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="8 8" horizontal={false} vertical={true} stroke="#f1f5f9" />
                   <XAxis type="number" domain={[0, 100]} hide />
                   <YAxis 
                     dataKey="name" 
                     type="category" 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{ fontSize: 13, fontWeight: 900, fill: '#0a192f', fontFamily: 'Vazirmatn' }} 
                     width={180} 
                     textAnchor="end"
                     dx={-15}
                   />
                   <Tooltip 
                     cursor={{ fill: 'rgba(10, 25, 47, 0.02)' }}
                     contentStyle={{ 
                       borderRadius: '2rem', 
                       border: 'none', 
                       boxShadow: '0 40px 60px -15px rgba(0,0,0,0.15)', 
                       fontSize: '13px', 
                       direction: 'rtl', 
                       fontWeight: 900,
                       background: 'rgba(255,255,255,0.95)',
                       backdropFilter: 'blur(10px)',
                       padding: '20px'
                     }}
                   />
                   <Bar 
                     dataKey="avg" 
                     fill="url(#premiumBarGradient)" 
                     radius={[0, 20, 20, 0]} 
                     barSize={32}
                     animationBegin={500}
                     animationDuration={1500}
                   >
                     {deptChartData.map((entry, index) => (
                       <Cell key={`cell-${index}`} className="hover:opacity-80 transition-opacity" />
                     ))}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
            </div>
            {/* Artistic background element */}
            <div className="absolute bottom-[-10%] right-[-5%] w-1/3 h-1/3 bg-slate-50 rounded-full blur-[100px] pointer-events-none" />
        </div>

        {/* AI Strategic Intelligence Feed */}
        <div className="ministry-card flex flex-col bg-white overflow-hidden shadow-premium group">
            <div className="ministry-banner p-10 relative overflow-hidden flex flex-col justify-center">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-[70px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-4">
                     <BrainCircuit className="text-accent animate-pulse" size={28} />
                     <span className="text-[11px] font-black text-accent uppercase tracking-[0.3em]">Institutional Intelligence Matrix</span>
                  </div>
                  <h3 className="text-3xl font-black text-white leading-tight">توصيات القيادة السيادية</h3>
                  <div className="h-0.5 w-16 bg-accent mt-6" />
                </div>
            </div>

            <div className="p-10 flex-1 overflow-y-auto max-h-[700px] custom-scrollbar bg-slate-50/20 relative">
               {isAnalyzing ? (
                 <div className="h-full flex flex-col items-center justify-center gap-10">
                    <div className="relative">
                      <div className="w-24 h-24 border-4 border-accent/10 border-t-accent rounded-full animate-spin shadow-premium" />
                      <div className="absolute inset-0 flex items-center justify-center">
                         <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-accent shadow-2xl">
                            <Cpu size={28} className="animate-pulse" />
                         </div>
                      </div>
                    </div>
                    <div className="text-center space-y-4">
                      <p className="text-sm font-black tracking-[0.2em] uppercase text-primary animate-pulse">Running Neural Grid Analysis</p>
                      <p className="text-[11px] font-bold text-text-muted opacity-60">Cross-referencing multi-departmental KPIs and performance risk vectors...</p>
                    </div>
                 </div>
               ) : strategicInsights ? (
                 <motion.div 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   className="prose prose-slate prose-sm text-right leading-loose font-medium ai-markdown-container max-w-none"
                 >
                    <Markdown>{strategicInsights}</Markdown>
                 </motion.div>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center gap-10 text-center py-24 group-hover:scale-105 transition-transform duration-700">
                    <div className="w-28 h-28 bg-white rounded-[3rem] shadow-premium flex items-center justify-center text-slate-100 border border-slate-100 relative group-hover:rotate-12 transition-all">
                       <FileSearch size={48} className="text-slate-200" />
                       <div className="absolute top-2 right-2 w-4 h-4 bg-accent rounded-full border-4 border-white shadow-sm" />
                    </div>
                    <div className="space-y-4">
                      <p className="text-sm font-black text-primary max-w-[250px] leading-relaxed mx-auto uppercase tracking-widest">النظام بانتظار أمر التحليل</p>
                      <p className="text-[11px] font-bold text-text-muted opacity-50 px-8">اضغط على زر "تفعيل الخوارزمية" لبدء المعالجة الذكية لبيانات الوزارة المجمعة.</p>
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


