/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../db.ts';
import { Employee, Evaluation, EvaluationPeriod } from '../types.ts';
import { 
  User, 
  Users,
  LayoutDashboard,
  ChevronLeft,
  History, 
  ArrowRight, 
  Calendar, 
  Briefcase, 
  Building2, 
  Hash, 
  Award, 
  TrendingUp, 
  Target,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  FileText,
  FileDown,
  ArrowLeftRight,
  Cpu,
  UserPlus,
  ArrowUpRight,
  Printer,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  GripVertical,
  Plus,
  RefreshCw,
  ShieldCheck,
  FileEdit,
  Activity,
  Trash2,
  Lightbulb,
  Star,
  Fingerprint,
  Wifi,
  MoreVertical,
  BarChart3,
  Dna
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from 'recharts';

interface EmployeeDetailsProps {
  onEditEmployee?: (employee: Employee) => void;
  onEvaluateUser?: (employee: Employee) => void;
}

export default function EmployeeDetails({ onEditEmployee, onEvaluateUser }: EmployeeDetailsProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'info' | 'history' | 'compare'>('info');
  const [loading, setLoading] = useState(true);
  const [expandedEvalId, setExpandedEvalId] = useState<number | null>(null);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [compareEmployeeId, setCompareEmployeeId] = useState<number | null>(null);
  const [compareEvaluations, setCompareEvaluations] = useState<Evaluation[]>([]);
  const [isDownloadingProfile, setIsDownloadingProfile] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      const empId = parseInt(id);
      const emp = await db.employees.get(empId);
      if (emp) {
        setEmployee(emp);
        const evals = await db.evaluations
          .where('employeeId')
          .equals(empId)
          .sortBy('date');
        setEvaluations(evals.reverse());
      }
      
      const allEmps = await db.employees.toArray();
      setAllEmployees(allEmps.filter(e => e.id !== empId));
      
      setLoading(false);
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    const fetchCompareData = async () => {
      if (!compareEmployeeId) {
        setCompareEvaluations([]);
        return;
      }
      const evals = await db.evaluations
        .where('employeeId')
        .equals(compareEmployeeId)
        .sortBy('date');
      setCompareEvaluations(evals.reverse());
    };
    fetchCompareData();
  }, [compareEmployeeId]);

  const downloadProfileReport = async () => {
    if (!employee || isDownloadingProfile) return;
    setIsDownloadingProfile(true);
    const element = document.getElementById('employee-details-page');
    if (!element) return;

    try {
      const scrollPos = window.scrollY;
      window.scrollTo(0, 0);

      const canvas = await html2canvas(element, { 
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.setR2L(true);
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Personnel_Intelligence_Profile_${employee.name}.pdf`);
      
      window.scrollTo(0, scrollPos);
    } catch (err) {
      console.error('Profile export failed:', err);
    } finally {
      setIsDownloadingProfile(false);
    }
  };

  const averageScore = useMemo(() => {
    if (evaluations.length === 0) return 0;
    return evaluations.reduce((acc, curr) => acc + curr.totalScore, 0) / evaluations.length;
  }, [evaluations]);

  const latestEvaluation = evaluations[0];

  const chartData = useMemo(() => {
    return evaluations.slice().reverse().map(e => ({
      date: e.date,
      score: e.totalScore,
      month: new Date(e.date).toLocaleDateString('ar-YE', { month: 'short' })
    }));
  }, [evaluations]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/10 border-t-accent rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!employee) return <div>Employee Not Found</div>;

  return (
    <div id="employee-details-page" className="min-h-screen bg-[#f8fafc] text-right" dir="rtl">
      {/* Sovereignty Top Utility Bar */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/employees')}
            className="w-12 h-12 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-primary rounded-2xl transition-all shadow-sm group"
          >
            <ChevronRight className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </button>
          <div>
            <h1 className="text-xl font-black text-primary tracking-tight">{employee.name}</h1>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mt-0.5">Sovereign Personnel Record / {employee.employeeId}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={downloadProfileReport}
            disabled={isDownloadingProfile}
            className="h-12 px-6 bg-white border-2 border-slate-100 hover:border-primary/20 text-primary rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-3 disabled:opacity-50"
          >
            {isDownloadingProfile ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            تصدير ملف الاستخبارات الوظيفية
          </button>
          <button 
            onClick={() => onEvaluateUser?.(employee)}
            className="h-12 px-8 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-premium hover:bg-secondary transition-all flex items-center gap-3"
          >
            <BarChart3 className="w-4 h-4" />
            إجراء تقييم استراتيجي
          </button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto p-8 space-y-10">
        {/* Profile Hero Block */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-10">
          <div className="xl:col-span-1 space-y-10">
            {/* Identity Card */}
            <div className="bg-white rounded-[3.5rem] p-8 shadow-premium border border-slate-100 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
               <div className="flex flex-col items-center text-center space-y-8 relative z-10">
                  <div className="relative">
                    <div className="w-48 h-48 rounded-[3.5rem] bg-slate-100 flex items-center justify-center text-7xl font-black text-primary border-8 border-white shadow-massive relative overflow-hidden group-hover:scale-105 transition-transform duration-700">
                       {employee.name[0]}
                       <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white px-5 py-2 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-2">
                       <span className={`w-3 h-3 rounded-full ${employee.biometricStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                       <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                         {employee.biometricStatus === 'online' ? 'Connected' : 'System Offline'}
                       </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-3xl font-black text-primary tracking-tighter leading-tight px-4">{employee.name}</h2>
                    <div className="flex flex-col items-center gap-2">
                      <span className="px-4 py-1.5 bg-slate-50 text-text-muted rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-slate-100">
                        {employee.position}
                      </span>
                      <span className="text-sm font-bold text-slate-400">{employee.department}</span>
                    </div>
                  </div>

                  <div className="w-full grid grid-cols-2 gap-4 pt-6 border-t border-slate-50">
                    <div className="text-center">
                       <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">متوسط الأداء</p>
                       <p className="text-2xl font-black text-primary">%{averageScore.toFixed(1)}</p>
                    </div>
                    <div className="text-center">
                       <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">الرتبة الوظيفية</p>
                       <p className="text-sm font-black text-primary uppercase">{employee.type === 'technical' ? 'فنية' : 'إدارية'}</p>
                    </div>
                  </div>
               </div>
            </div>

            {/* Quick Metrics */}
            <div className="space-y-6">
               <h3 className="text-[11px] font-black text-primary border-r-4 border-accent pr-4 uppercase tracking-[0.3em]">مؤشرات الكفاءة الحيوية</h3>
               <div className="grid grid-cols-1 gap-4">
                  <MetricCard 
                    label="المواظبة السنوية" 
                    value="98.2%" 
                    icon={<Clock className="text-secondary" />} 
                    trend="+1.2%" 
                  />
                  <MetricCard 
                    label="الالتزام بالمعايير" 
                    value="100%" 
                    icon={<ShieldCheck className="text-emerald-500" />} 
                    trend="Stable"
                  />
                  <MetricCard 
                    label="النمو المهني" 
                    value="High" 
                    icon={<TrendingUp className="text-blue-500" />} 
                    trend="Promising"
                  />
               </div>
            </div>
          </div>

          {/* Performance Analytics Column */}
          <div className="xl:col-span-3 space-y-10">
            {/* Visual Analytics Dashboard */}
            <div className="bg-white rounded-[3.5rem] p-10 shadow-premium border border-slate-100 space-y-10">
               <div className="flex justify-between items-end">
                  <div className="space-y-2">
                     <h3 className="text-3xl font-black text-primary tracking-tighter">تحليل منحنى الأداء التاريخي</h3>
                     <p className="text-sm font-bold text-text-muted">نظام تحليل البيانات الضخمة لأداء الموظف خلال الفترات السابقة</p>
                  </div>
                  <div className="flex gap-2">
                     <button className="px-4 py-2 bg-slate-50 text-primary rounded-xl text-[10px] font-black uppercase border border-slate-100">Yearly</button>
                     <button className="px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-primary/20">Monthly</button>
                  </div>
               </div>

               <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} 
                        dy={15}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} 
                        dx={-15}
                        domain={[0, 100]}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          border: 'none', 
                          borderRadius: '1.5rem', 
                          padding: '1.5rem',
                          color: '#fff',
                          boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                        }}
                        itemStyle={{ fontWeight: 900, fontSize: '12px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="score" 
                        stroke="var(--primary)" 
                        strokeWidth={4} 
                        fillOpacity={1} 
                        fill="url(#colorScore)" 
                        animationDuration={2000}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* Tactical Stats Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
               {/* Core Information */}
               <div className="bg-white rounded-[3.5rem] p-10 shadow-premium border border-slate-100 space-y-8">
                  <div className="flex items-center gap-4 border-r-4 border-accent pr-4">
                     <Dna className="text-secondary" />
                     <h4 className="text-sm font-black text-primary uppercase tracking-[0.2em]">البيانات التعريفية والبيومترية</h4>
                  </div>
                  <div className="space-y-4">
                     <DetailRow label="الرقم الوظيفي المركزي" value={employee.employeeId} isMono />
                     <DetailRow label="كود البصمة الموحد" value={employee.biometricId || 'N/A'} isMono />
                     <DetailRow label="تاريخ مباشرة العمل" value={employee.joinDate} />
                     <DetailRow label="نوع الكادر الوظيفي" value={employee.type === 'technical' ? 'كادر تقني متخصص' : 'كادر إداري عام'} />
                     <DetailRow label="حالة التحقق الأمني" value="Verified" isSuccess />
                  </div>
               </div>

               {/* Latest Insights */}
               <div className="bg-[#0f172a] rounded-[3.5rem] p-10 shadow-massive relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/az-subtle.png')] opacity-10" />
                  <div className="relative z-10 space-y-8">
                     <div className="flex items-center gap-4 border-r-4 border-accent pr-4">
                        <Cpu className="text-accent" />
                        <h4 className="text-sm font-black text-white uppercase tracking-[0.2em]">رؤى الذكاء الاصطناعي</h4>
                     </div>
                     <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10">
                        <p className="text-[13px] text-white/70 leading-relaxed italic">
                          "بناءً على التوجهات الأخيرة، يظهر الموظف استقراراً عالياً في جودة تسليم المشاريع التقنية مع تحسن ملحوظ في سرعة الاستجابة للأعطال الطارئة. نوصي بتوجيهه نحو برنامج القيادة الرقمية المتقدمة."
                        </p>
                        <div className="mt-6 flex items-center gap-4">
                           <div className="px-3 py-1 bg-accent/20 text-accent rounded-full text-[10px] font-black uppercase tracking-widest border border-accent/30">Strategic Growth Path</div>
                           <div className="h-px flex-1 bg-white/10" />
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Evaluation History Section */}
            <div className="space-y-8">
               <div className="flex justify-between items-center border-r-8 border-primary pr-6">
                  <div>
                    <h3 className="text-2xl font-black text-primary tracking-tighter">السجل التاريخي للتقييمات</h3>
                    <p className="text-sm font-bold text-text-muted mt-1">عرض كافة دورات التقييم المؤرشفة في سجلات الوزارة</p>
                  </div>
                  <button onClick={() => navigate('/evaluations')} className="text-[12px] font-black text-primary hover:text-secondary uppercase tracking-[0.2em] flex items-center gap-2 group">
                    <span>View Full Log</span>
                    <ArrowLeftRight size={16} className="group-hover:rotate-180 transition-transform" />
                  </button>
               </div>

               <div className="grid grid-cols-1 gap-6">
                  {evaluations.length > 0 ? (
                    evaluations.slice(0, 3).map((evalItem, idx) => (
                      <motion.div 
                        key={evalItem.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8 group hover:border-primary/20 transition-all hover:scale-[1.01]"
                      >
                        <div className="flex items-center gap-6">
                           <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black border-4 border-white shadow-xl ${
                             evalItem.totalScore >= 90 ? 'bg-emerald-500 text-white' : 
                             evalItem.totalScore >= 70 ? 'bg-blue-500 text-white' : 
                             'bg-amber-500 text-white'
                           }`}>
                             %{evalItem.totalScore.toFixed(0)}
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">{evalItem.date}</p>
                              <h4 className="text-lg font-black text-primary">{evalItem.period === 'monthly' ? 'تقييم شهري' : 'تقييم ربع سنوي'}</h4>
                              <p className="text-xs font-bold text-slate-400">بواسطة: {evalItem.evaluatorId || 'نظام ذكي'}</p>
                           </div>
                        </div>

                        <div className="flex items-center gap-12">
                           <div className="text-center">
                              <p className="text-[10px] font-black text-text-muted uppercase mb-1">الرتبة</p>
                              <p className="text-sm font-black text-primary">{evalItem.totalScore >= 90 ? 'ممتاز' : 'جيد جداً'}</p>
                           </div>
                           <div className="text-center">
                              <p className="text-[10px] font-black text-text-muted uppercase mb-1">المعايير</p>
                              <p className="text-sm font-black text-primary">{evalItem.criteria.length}</p>
                           </div>
                           <div className="w-px h-10 bg-slate-100" />
                           <button className="p-4 bg-slate-50 text-slate-400 hover:text-primary hover:bg-white border border-transparent hover:border-slate-100 rounded-2xl transition-all shadow-sm">
                             <ArrowUpRight size={20} />
                           </button>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="bg-slate-50 rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-100 opacity-40 italic text-xl font-bold">
                       لا توجد سجلات تقييم مؤرشفة لهذا الموظف
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, trend }: { label: string, value: string, icon: React.ReactNode, trend: string }) {
  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-premium border border-slate-100 flex items-center justify-between group hover:border-primary/20 transition-all">
       <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-primary border border-slate-100 group-hover:bg-white group-hover:shadow-lg transition-all">
             {icon}
          </div>
          <div>
            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest leading-none mb-1">{label}</p>
            <p className="text-xl font-black text-primary leading-tight">{value}</p>
          </div>
       </div>
       <div className="text-[10px] font-black text-emerald-500 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
          <TrendingUp size={12} />
          {trend}
       </div>
    </div>
  );
}

function InfoCard({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:bg-white hover:border-primary/20 transition-all shadow-sm hover:shadow-lg">
       <div className="flex items-center gap-3 mb-2 text-primary/40 group-hover:text-primary transition-colors">
          {icon}
          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{label}</span>
       </div>
       <p className="text-sm font-black text-primary truncate">{value}</p>
    </div>
  );
}

function DetailRow({ label, value, isMono = false, isSuccess = false }: { label: string, value: string, isMono?: boolean, isSuccess?: boolean }) {
  return (
    <div className="flex justify-between items-center py-4 border-b border-slate-50 last:border-0 group">
       <span className="text-[11px] font-black text-text-muted uppercase tracking-widest group-hover:text-primary transition-colors">{label}</span>
       <span className={`text-[12px] font-black ${isMono ? 'font-mono' : ''} ${isSuccess ? 'px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 text-[10px]' : 'text-primary'}`}>
          {value}
       </span>
    </div>
  );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="px-10 py-10 flex items-center gap-6 group hover:bg-white transition-colors">
       <div className="w-14 h-14 bg-white rounded-2xl shadow-premium flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform">
          {React.cloneElement(icon as React.ReactElement<any>, { size: 28 })}
       </div>
       <div>
          <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] leading-normal mb-1">{label}</p>
          <p className="text-3xl font-black text-primary tracking-tighter leading-none">{value}</p>
       </div>
    </div>
  );
}

function AttendanceBadge({ status, showText = false }: { status: string, showText?: boolean }) {
  const config: Record<string, { color: string, label: string }> = {
    'excellent': { color: 'bg-emerald-500', label: 'ممتاز' },
    'good': { color: 'bg-blue-500', label: 'جيد' },
    'average': { color: 'bg-amber-500', label: 'متوسط' },
    'poor': { color: 'bg-red-500', label: 'ضعيف' }
  };
  const { color, label } = config[status] || config['average'];
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      {showText && <span className="text-xs font-black text-primary">{label}</span>}
    </div>
  );
}

function DisciplineBadge({ status, showText = false }: { status: string, showText?: boolean }) {
  const config: Record<string, { color: string, label: string }> = {
    'committed': { color: 'bg-emerald-500', label: 'ملتزم' },
    'needs-improvement': { color: 'bg-amber-500', label: 'يحتاج تحسين' },
    'warning': { color: 'bg-red-500', label: 'إنذار' }
  };
  const { color, label } = config[status] || config['committed'];
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      {showText && <span className="text-xs font-black text-primary">{label}</span>}
    </div>
  );
}
