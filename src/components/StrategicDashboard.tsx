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
  FileSearch,
  ChevronRight
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
  Pie
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
    }));
  }, [allEvaluations]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="space-y-8 pb-12" dir="rtl">
      {/* Hero Header */}
      <div className="bg-primary p-12 rounded-[40px] text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-full bg-accent/5 skew-x-[-15deg] origin-top translate-x-24" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="w-24 h-24 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/20">
            <ShieldCheck size={48} className="text-accent" />
          </div>
          <div className="text-center md:text-right flex-1">
            <h1 className="text-3xl font-black mb-2 uppercase tracking-tight">غرفة التحكم والذكاء الاستراتيجي</h1>
            <p className="text-white/60 font-medium text-sm">تحليل مؤشرات الأداء الكلي لكوادر وزارة الاتصالات وتقنية المعلومات</p>
          </div>
          <button 
            onClick={runStrategicAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-3 px-8 py-4 bg-accent text-primary rounded-2xl font-black text-sm shadow-xl shadow-accent/20 hover:scale-105 active:scale-95 transition-all"
          >
            {isAnalyzing ? <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <BrainCircuit size={20} />}
            تشغيل المحلل الاستراتيجي (AI)
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <InsightCard 
          icon={<TrendingUp className="text-emerald-500" />}
          label="المعدل العام للمؤسسة"
          value={`%${stats.avgScore.toFixed(1)}`}
          trend="+1.2% من الشهر السابق"
        />
        <InsightCard 
          icon={<Users className="text-blue-500" />}
          label="إجمالي دورات التقييم"
          value={stats.totalEvaluations.toString()}
          trend="بيانات مكتملة بنسبة 98%"
        />
        <InsightCard 
          icon={<Target className="text-amber-500" />}
          label="القطاع الأعلى أداءً"
          value={stats.topDept}
          trend="يتجاوز المستهدف بـ 5%"
        />
        <InsightCard 
          icon={<AlertCircle className="text-red-500" />}
          label="قطاع تحت المراقبة"
          value={stats.riskDept}
          trend="انخفاض ملحوظ في الإنتاجية"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Insights (AI generated) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[32px] border border-border-theme shadow-lg min-h-[400px]">
            <h3 className="text-lg font-black text-primary mb-8 flex items-center gap-3">
              <FileSearch size={24} className="text-accent" />
              الرؤى والتحليلات الاستراتيجية
            </h3>
            
            <AnimatePresence mode="wait">
              {isAnalyzing ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="w-16 h-16 border-4 border-slate-100 border-t-accent rounded-full animate-spin mb-6" />
                  <p className="text-text-muted font-black animate-pulse">جاري جمع البيانات وتحليل الاتجاهات العميقة...</p>
                </motion.div>
              ) : strategicInsights ? (
                <motion.div 
                  key="content"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="prose prose-slate prose-sm max-w-none text-right"
                >
                  <div className="markdown-body">
                    <Markdown>{strategicInsights}</Markdown>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center py-20 text-center opacity-30"
                >
                  <BrainCircuit size={64} className="mb-4" />
                  <p className="font-bold">قم بتشغيل المحلل للحصول على رؤى استراتيجية</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Supporting Charts */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[32px] border border-border-theme shadow-md">
            <h4 className="text-xs font-black text-text-muted uppercase tracking-widest mb-6">توزيع الأداء حسب القطاعات</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" hide />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px' }}
                  />
                  <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                    {deptChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {deptChartData.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-[10px] font-bold">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-text-muted">{d.name}</span>
                  </div>
                  <span className="text-primary">%{d.avg.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-8 bg-slate-900 rounded-[32px] text-white">
            <h4 className="text-xs font-black text-accent uppercase tracking-widest mb-4">التوصيات الاستباقية</h4>
            <div className="space-y-4">
              <RecommendationItem text="تكثيف دورات الأمن السيبراني لقطاع النظم" />
              <RecommendationItem text="مراجعة الحوافز للإدارة العامة للعلاقات" />
              <RecommendationItem text="تحديث نماذج تقييم الكادر الفني" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InsightCard({ icon, label, value, trend }: { icon: any, label: string, value: string, trend: string }) {
  return (
    <div className="bg-white p-6 rounded-[32px] border border-border-theme shadow-md hover:shadow-lg transition-all group">
      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        {React.cloneElement(icon, { size: 24 })}
      </div>
      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">{label}</p>
      <h3 className="text-xl font-black text-text-dark mb-2">{value}</h3>
      <p className="text-[9px] font-bold text-emerald-500 flex items-center gap-1">
        <TrendingUp size={10} /> {trend}
      </p>
    </div>
  );
}

function RecommendationItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 group">
      <div className="w-1.5 h-1.5 bg-accent rounded-full mt-1.5 shrink-0" />
      <p className="text-[11px] font-bold text-white/70 group-hover:text-white transition-colors cursor-default">{text}</p>
    </div>
  );
}


