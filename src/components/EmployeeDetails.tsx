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
  Wifi
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
  Legend
} from 'recharts';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface EmployeeDetailsProps {
  onEditEmployee?: (employee: Employee) => void;
  onEvaluateUser?: (employee: Employee) => void;
}

const TRAINING_MAPPING: Record<string, string[]> = {
  'فني': ['دورة متقدمة في الصيانة الوقائية', 'تدريب على أنظمة القياس الحديثة'],
  'جودة': ['دورة في ضبط الجودة الشاملة', 'تحليل الأخطاء المتقن'],
  'تواصل': ['مهارات الاتصال الفعال', 'إدارة النزاعات في بيئة العمل'],
  'إداري': ['مهارات الأرشفة الإلكترونية', 'إدارة الوقت والاجتماع'],
  'قياد': ['المهارات القيادية الإشرافية', 'اتخاذ القرارات الاستراتيجية'],
  'تعامل': ['لباقة التعامل مع الجمهور', 'الذكاء العاطفي'],
  'دقة': ['التركيز والتدقيق المهني', 'إدارة البيانات'],
  'سرعة': ['تحسين الإنتاجية الفردية', 'إدارة الأولويات'],
  'التزام': ['قواعد السلوك الوظيفي', 'الوعي باللوائح الداخلية'],
  'فريق': ['بناء فرق العمل عالية الأداء', 'التعاون المؤسسي']
};

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
  const [isDownloading, setIsDownloading] = useState<number | null>(null);
  const [isDownloadingProfile, setIsDownloadingProfile] = useState(false);
  const [isDownloadingPage, setIsDownloadingPage] = useState(false);

  // Filter States for History
  const [filterPeriod, setFilterPeriod] = useState<EvaluationPeriod | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // States for Custom Criteria
  const [showAddCustomCriterion, setShowAddCustomCriterion] = useState(false);
  const [newCriterionLabel, setNewCriterionLabel] = useState('');
  const [newCriterionWeight, setNewCriterionWeight] = useState(20);

  const handleAddCustomCriterion = async () => {
    if (!employee || !newCriterionLabel.trim()) return;
    
    const updatedCriteria = [
      ...(employee.customCriteria || []),
      { label: newCriterionLabel, weight: newCriterionWeight }
    ];
    
    await db.employees.update(employee.id!, { customCriteria: updatedCriteria });
    setEmployee({ ...employee, customCriteria: updatedCriteria });
    setShowAddCustomCriterion(false);
    setNewCriterionLabel('');
    setNewCriterionWeight(20);
  };

  const handleRemoveCustomCriterion = async (index: number) => {
    if (!employee || !employee.customCriteria) return;
    
    const updatedCriteria = [...employee.customCriteria];
    updatedCriteria.splice(index, 1);
    
    await db.employees.update(employee.id!, { customCriteria: updatedCriteria });
    setEmployee({ ...employee, customCriteria: updatedCriteria });
  };

  const getSuggestedTraining = (criteriaLabel: string) => {
    const matchedKey = Object.keys(TRAINING_MAPPING).find(key => criteriaLabel.includes(key));
    return matchedKey ? TRAINING_MAPPING[matchedKey] : ['برنامج تطوير الكفاءات التخصصية'];
  };

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

  const downloadPagePDF = async () => {
    if (!employee || isDownloadingPage) return;
    
    setIsDownloadingPage(true);
    const element = document.getElementById('employee-details-page');
    if (!element) return;

    try {
      // Capture the current scroll position to restore it later
      const scrollPos = window.scrollY;
      window.scrollTo(0, 0);

      const canvas = await html2canvas(element, { 
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // If height is more than A4, we might need multiple pages or just scale it
      // Let's simple scaling for now, but jsPDF can handle multiple pages if we loop
      pdf.setR2L(true);
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`FullReport-${employee.name}-${new Date().toLocaleDateString()}.pdf`);
      
      window.scrollTo(0, scrollPos);
    } catch (err) {
      console.error('Page export failed:', err);
      alert('فشل تصدير الصفحة الحالية بصيغة PDF.');
    } finally {
      setIsDownloadingPage(false);
    }
  };

  const downloadReport = async (evalId: number) => {
    const element = document.getElementById(`eval-report-${evalId}`);
    if (!element || isDownloading !== null) return;
    
    setIsDownloading(evalId);
    try {
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      // Add a simple header to the PDF
      pdf.setFillColor(15, 23, 42); // Primary color
      pdf.rect(0, 0, pdfWidth, 20, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(12);
      pdf.text(`Evaluation Report: ${employee?.name}`, pdfWidth / 2, 12, { align: 'center' });
      
      pdf.addImage(imgData, 'PNG', 0, 20, pdfWidth, pdfHeight);
      pdf.save(`Evaluation-${employee?.name}-${evalId}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('فشل تصدير ملف PDF. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsDownloading(null);
    }
  };

  const downloadProfileReport = async () => {
    if (!employee || isDownloadingProfile) return;
    
    setIsDownloadingProfile(true);
    const element = document.getElementById('employee-profile-content');
    if (!element) return;

    try {
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
      pdf.save(`Profile-${employee.name}.pdf`);
    } catch (err) {
      console.error('Profile export failed:', err);
      alert('فشل تصدير ملف التعريف الخاص بالموظف.');
    } finally {
      setIsDownloadingProfile(false);
    }
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(evaluations);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setEvaluations(items);
  };

  const filteredHistory = useMemo(() => {
    return evaluations.filter(item => {
      const matchesPeriod = filterPeriod === 'all' || item.period === filterPeriod;
      const matchesStart = !startDate || item.date >= startDate;
      const matchesEnd = !endDate || item.date <= endDate;
      return matchesPeriod && matchesStart && matchesEnd;
    });
  }, [evaluations, filterPeriod, startDate, endDate]);

  const latestEvaluation = evaluations[0];
  const averageScore = evaluations.length > 0 
    ? evaluations.reduce((acc, curr) => acc + curr.totalScore, 0) / evaluations.length 
    : 0;

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-border-theme shadow-sm">
        <h2 className="text-xl font-black text-red-600 mb-4">عذراً، لم يتم العثور على الموظف</h2>
        <button 
          onClick={() => navigate('/')}
          className="bg-primary text-white px-6 py-2 rounded-lg font-bold"
        >
          العودة للوحة التحكم
        </button>
      </div>
    );
  }

  return (
    <div id="employee-details-page" className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700" dir="rtl">
      {/* Top Breadcrumbs & Quick Back */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <nav className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted bg-white px-5 py-3 rounded-[2rem] border border-border-theme shadow-sm">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 hover:text-primary transition-all hover:-translate-x-1"
          >
            <LayoutDashboard size={14} className="text-accent" />
            Strategic
          </button>
          <ChevronLeft size={12} className="opacity-20 mx-1" />
          <button 
            onClick={() => navigate('/employees')} 
            className="flex items-center gap-2 hover:text-primary transition-all hover:-translate-x-1"
          >
            <Users size={14} className="text-secondary" />
            الكادر
          </button>
          <ChevronLeft size={12} className="opacity-20 mx-1" />
          <span className="text-primary px-3 py-1 bg-primary/5 rounded-lg font-bold border border-primary/10">
            {employee.name}
          </span>
        </nav>

        <button 
          onClick={() => navigate('/employees')}
          className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-primary border border-border-theme rounded-[2rem] text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm hover:shadow-md group"
        >
          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          العودة لقائمة الموظفين
        </button>
      </div>

      {/* Header Profile Section */}
      <div className="luxury-card overflow-hidden glossy-mesh relative group border-none shadow-2xl">
        <div className="bg-primary p-16 text-white relative">
          {/* Ambient Background elements */}
          <div className="absolute top-0 right-0 w-full h-full opacity-20 pointer-events-none">
             <div className="absolute top-0 right-10 w-96 h-96 bg-accent rounded-full blur-[140px] animate-pulse" />
             <div className="absolute bottom-0 left-10 w-80 h-80 bg-blue-500 rounded-full blur-[120px]" />
          </div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none" />
          
          <div className="flex flex-col xl:flex-row items-center xl:items-start gap-12 relative z-10">
            <div className="relative group/avatar">
              <div className={`w-44 h-44 rounded-[3rem] flex items-center justify-center text-6xl font-black border-4 border-white/20 shadow-2xl relative transition-all duration-700 group-hover/avatar:scale-105 group-hover/avatar:rotate-3 ${
                latestEvaluation?.totalScore >= 90 ? 'bg-emerald-500' :
                latestEvaluation?.totalScore >= 75 ? 'bg-blue-500' :
                latestEvaluation?.totalScore >= 50 ? 'bg-amber-500' : 
                latestEvaluation ? 'bg-red-500' : 'bg-slate-500'
              }`}>
                {employee.name[0]}
                <div className="absolute -bottom-4 -right-4 bg-white p-3 rounded-2xl shadow-xl border border-border-theme">
                   <ShieldCheck size={28} className="text-accent" />
                </div>
              </div>
            </div>

            <div className="text-center xl:text-right flex-1 space-y-8">
              <div className="space-y-4">
                <div className="flex flex-wrap justify-center xl:justify-start gap-3">
                   <span className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/10">
                      ID: {employee.employeeId}
                   </span>
                   <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border ${
                      employee.biometricStatus === 'online' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'
                   }`}>
                      {employee.biometricStatus === 'online' ? 'System Online' : 'System Offline'}
                   </span>
                </div>
                <h2 className="text-6xl font-black tracking-tighter leading-tight">{employee.name}</h2>
                <div className="flex flex-wrap justify-center xl:justify-start gap-6 text-xl text-white/60 font-medium">
                   <div className="flex items-center gap-3">
                      <Briefcase size={24} className="text-accent" />
                      <span>{employee.position}</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <Building2 size={24} className="text-accent" />
                      <span>{employee.department}</span>
                   </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-center xl:justify-start gap-4">
                <button 
                  onClick={() => employee && onEditEmployee?.(employee)}
                  className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all backdrop-blur-md"
                >
                  Edit Profile
                </button>
                <button 
                  onClick={downloadProfileReport}
                  disabled={isDownloadingProfile}
                  className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all backdrop-blur-md flex items-center gap-3"
                >
                  {isDownloadingProfile ? <RefreshCw className="animate-spin" size={18} /> : <FileDown size={18} />}
                  Export Intelligence
                </button>
                <button 
                  onClick={() => employee && onEvaluateUser?.(employee)}
                  className="px-8 py-4 bg-accent text-primary rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-2xl shadow-accent/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                >
                  <Plus size={20} strokeWidth={3} />
                  إجراء تقييم جديد
                </button>
              </div>
            </div>

            <div className="hidden xl:flex flex-col items-center justify-center p-10 bg-white/5 backdrop-blur-xl rounded-[3rem] border border-white/10 min-w-[240px]">
               <p className="text-[11px] font-black text-accent uppercase tracking-[0.3em] mb-4">Total Readiness</p>
               <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90">
                    <circle className="text-white/10" strokeWidth="8" stroke="currentColor" fill="transparent" r="58" cx="64" cy="64" />
                    <circle className="text-accent transition-all duration-1000" strokeWidth="8" strokeDasharray={364.4} strokeDashoffset={364.4 * (1 - (latestEvaluation?.totalScore || 0) / 100)} strokeLinecap="round" stroke="currentColor" fill="transparent" r="58" cx="64" cy="64" />
                  </svg>
                  <span className="absolute text-3xl font-black">%{latestEvaluation?.totalScore.toFixed(0) || '--'}</span>
               </div>
            </div>
          </div>
        </div>

        {/* Top Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-border-theme bg-slate-50">
          <StatBox 
             icon={<Award className="text-blue-500" />}
             label="متوسط الأداء التاريخي"
             value={`%${averageScore.toFixed(1)}`}
          />
          <StatBox 
             icon={<TrendingUp className="text-emerald-500" />}
             label="عدد التقييمات المنجزة"
             value={evaluations.length.toString()}
          />
          <StatBox 
             icon={<Target className="text-amber-500" />}
             label="تاريخ مباشرة العمل"
             value={employee.joinDate}
          />
        </div>

        {/* Tabs Navigation */}
        <div className="flex border-b border-border-theme overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveSubTab('info')}
            className={`flex-1 min-w-[150px] py-4 font-bold text-xs uppercase tracking-widest transition-all relative ${
              activeSubTab === 'info' ? 'text-primary' : 'text-text-muted hover:bg-slate-50'
            }`}
          >
            بيانات الكادر التفصيلية
            {activeSubTab === 'info' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />}
          </button>
          <button 
            onClick={() => setActiveSubTab('history')}
            className={`flex-1 min-w-[150px] py-4 font-bold text-xs uppercase tracking-widest transition-all relative ${
              activeSubTab === 'history' ? 'text-primary' : 'text-text-muted hover:bg-slate-50'
            }`}
          >
            السجل التاريخي للتقييمات
            {activeSubTab === 'history' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />}
          </button>
          <button 
            onClick={() => setActiveSubTab('compare')}
            className={`flex-1 min-w-[150px] py-4 font-bold text-xs uppercase tracking-widest transition-all relative ${
              activeSubTab === 'compare' ? 'text-primary' : 'text-text-muted hover:bg-slate-50'
            }`}
          >
            مقارنة الأداء
            {activeSubTab === 'compare' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            {activeSubTab === 'info' ? (
              <motion.div 
                key="info"
                id="employee-profile-content"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {/* Latest Evaluation Quick Summary Card */}
                {latestEvaluation && (
                  <div className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-6 text-white shadow-xl shadow-primary/20 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-full bg-white/5 skew-x-[-20deg] origin-top translate-x-12" />
                    <div className="flex items-center gap-5 relative z-10">
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-accent border border-white/30">
                        <Award size={32} />
                      </div>
                      <div>
                  <h4 className="text-xs font-bold uppercase tracking-[0.2em] opacity-80 mb-1">ملخص آخر حالة تقييم</h4>
                        <div className="flex items-center gap-3">
                          <span className="text-3xl font-black">%{latestEvaluation.totalScore.toFixed(1)}</span>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/20 border border-white/30`}>
                            {latestEvaluation.totalScore >= 90 ? 'ممتاز جداً' :
                             latestEvaluation.totalScore >= 75 ? 'جيد جداً' :
                             latestEvaluation.totalScore >= 50 ? 'جيد' : 'يحتاج تحسين'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8 relative z-10">
                       <div className="text-center">
                          <p className="text-[10px] font-black opacity-60 uppercase mb-1">دورة التقييم</p>
                          <p className="font-bold text-sm tracking-wide">{latestEvaluation.period === 'monthly' ? 'شهرية' : latestEvaluation.period === 'quarterly' ? 'ربع سنوية' : 'سنوية'}</p>
                       </div>
                       <div className="w-px h-10 bg-white/20" />
                       <div className="text-center">
                          <p className="text-[10px] font-black opacity-60 uppercase mb-1">تاريخ التقييم</p>
                          <p className="font-bold text-sm tracking-wide">{latestEvaluation.date}</p>
                       </div>
                       <div className="w-px h-10 bg-white/20" />
                       <div className="text-center">
                          <p className="text-[10px] font-black opacity-60 uppercase mb-1">الحضور</p>
                          <p className="font-bold text-sm tracking-wide">{latestEvaluation.attendance}</p>
                       </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white p-4 rounded-3xl">
                <div className="space-y-6">
                  <h3 className="flex items-center gap-2 text-sm font-black text-text-dark uppercase border-r-4 border-primary pr-3 mb-6">
                    المعلومات الشخصية والوظيفية
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <InfoCard label="الاسم الرباعي" value={employee.name} icon={<User size={14} />} />
                    <InfoCard label="الرقم الوظيفي" value={employee.employeeId} icon={<Hash size={14} />} />
                    <InfoCard label="الإدارة العامة / المكتب" value={employee.department} icon={<Building2 size={14} />} />
                    <InfoCard label="المسمى الوظيفي" value={employee.position} icon={<Briefcase size={14} />} />
                    <InfoCard label="تاريخ الانضمام للوزارة" value={employee.joinDate} icon={<Calendar size={14} />} />
                    <InfoCard label="فئة الكادر" value={employee.type === 'technical' ? 'فني' : 'إداري'} icon={<Award size={14} />} />
                    <InfoCard label="كود البصمة التحضيرية" value={employee.biometricId || 'غير مسجل'} icon={<Fingerprint size={14} />} />
                    
                    {/* New Biometric Status Cards */}
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-border-theme flex items-center justify-between">
                       <div>
                          <div className="flex items-center gap-2 mb-1 text-[10px] font-black text-text-muted uppercase tracking-widest">
                             <Wifi size={14} className="text-primary" />
                             حالة الاتصال بالبصمة
                          </div>
                          <div className={`text-sm font-black ${employee.biometricStatus === 'online' ? 'text-emerald-600' : 'text-red-500'}`}>
                             {employee.biometricStatus === 'online' ? 'مـتصل (Online)' : employee.biometricStatus === 'offline' ? 'غير متصل (Offline)' : 'غير معروف'}
                          </div>
                       </div>
                       <div className={`w-3 h-3 rounded-full ${employee.biometricStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                    </div>

                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-border-theme">
                       <div className="flex items-center gap-2 mb-1 text-[10px] font-black text-text-muted uppercase tracking-widest">
                          <RefreshCw size={14} className="text-primary" />
                          آخر عملية مزامنة
                       </div>
                       <div className="text-sm font-black text-text-dark">
                          {employee.lastBiometricSync 
                            ? new Date(employee.lastBiometricSync).toLocaleString('ar-YE', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                            : 'لم يتم المزامنة بعد'}
                       </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                   <h3 className="flex items-center gap-2 text-sm font-black text-text-dark uppercase border-r-4 border-secondary pr-3 mb-6">
                    ملخص الأداء والنمو
                  </h3>
                  <div className="bg-slate-50 rounded-2xl p-6 border border-border-theme">
                    {latestEvaluation ? (
                      <div className="space-y-6">
                        <div className="flex justify-between items-center mb-4">
                           <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">آخر نتيجة تقييم ({latestEvaluation.date})</span>
                           <span className="text-xl font-black text-secondary">%{latestEvaluation.totalScore.toFixed(1)}</span>
                        </div>
                        <div className="w-full h-3 bg-white border border-border-theme rounded-full overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${latestEvaluation.totalScore}%` }}
                             transition={{ duration: 1, ease: 'easeOut' }}
                             className={`h-full ${
                               latestEvaluation.totalScore >= 90 ? 'bg-emerald-500' :
                               latestEvaluation.totalScore >= 75 ? 'bg-blue-500' :
                               latestEvaluation.totalScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                             }`}
                           />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="flex flex-col p-4 bg-white rounded-xl border border-border-theme">
                              <span className="text-[9px] font-black text-text-muted uppercase mb-1">الحضور والمواظبة</span>
                              <span className="text-xs font-bold text-text-dark">{latestEvaluation.attendance}</span>
                           </div>
                           <div className="flex flex-col p-4 bg-white rounded-xl border border-border-theme">
                              <span className="text-[9px] font-black text-text-muted uppercase mb-1">الالتزام السلوكي</span>
                              <span className="text-xs font-bold text-text-dark">{latestEvaluation.discipline}</span>
                           </div>
                        </div>
                        
                        {/* Biometric Live Status Placeholder */}
                        <div className="mt-6 p-4 bg-white rounded-2xl border border-border-theme flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary">
                                <Fingerprint size={20} />
                             </div>
                             <div>
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest leading-none mb-1">حالة البصمة الحالية</p>
                                <p className="text-xs font-bold text-text-dark">مؤشر التحضير: <span className="text-emerald-600">منضبط</span> (08:05 ص)</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 text-[10px] font-black uppercase">
                             <CheckCircle2 size={12} />
                             مـتصل
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-text-muted italic text-sm">
                        لم يتم تسجيل أي تقييمات لهذا الموظف حتى الآن
                      </div>
                    )}
                  </div>
                </div>

                {/* Attendance, Discipline & Notes Section */}
                <div className="bg-slate-50 border border-border-theme rounded-3xl p-8 space-y-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border-theme pb-4">
                     <div>
                        <h3 className="text-sm font-black text-text-dark uppercase tracking-widest flex items-center gap-2">
                           <Activity size={18} className="text-primary" /> تفاصيل الانضباط والملاحظات
                        </h3>
                        <p className="text-[10px] text-text-muted font-bold mt-1">تفاصيل السلوك الوظيفي بناءً على آخر تقييم معتمد</p>
                     </div>
                  </div>

                  {latestEvaluation ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="space-y-4">
                         <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">سجل الحضور</h4>
                         <div className="bg-white p-6 rounded-2xl border border-border-theme flex flex-col items-center gap-3 shadow-sm">
                            <Clock size={24} className="text-primary/40" />
                            <AttendanceBadge status={latestEvaluation.attendance} showText />
                            <p className="text-[10px] text-text-muted text-center font-bold">بناءً على سجلات البصمة والتحضير</p>
                         </div>
                      </div>

                      <div className="space-y-4">
                         <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">الالتزام المؤسسي</h4>
                         <div className="bg-white p-6 rounded-2xl border border-border-theme flex flex-col items-center gap-3 shadow-sm">
                            <ShieldCheck size={24} className="text-secondary/40" />
                            <DisciplineBadge status={latestEvaluation.discipline} showText />
                            <p className="text-[10px] text-text-muted text-center font-bold">مدى التقيد باللوائح والتعليمات</p>
                         </div>
                      </div>

                      <div className="space-y-4">
                         <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">ملاحظات التقييم الأخيرة</h4>
                         <div className="bg-white p-6 rounded-2xl border border-border-theme min-h-[100px] shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-1 h-full bg-primary/20" />
                            <p className="text-[11px] leading-relaxed italic text-text-dark">
                               {latestEvaluation.notes || 'لا توجد ملاحظات إضافية مسجلة'}
                            </p>
                         </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-12 text-center text-text-muted italic text-sm">
                       لا توجد بيانات انضباط مسجلة لعدم توفر تقييمات سابقة
                    </div>
                  )}
                </div>

                {/* Custom Criteria Section */}
                <div className="bg-white border-2 border-slate-100 rounded-3xl p-8 space-y-6 shadow-sm">
                   <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                         <h3 className="text-sm font-black text-text-dark uppercase tracking-widest flex items-center gap-2">
                           <Target size={18} className="text-accent" /> معايير التقييم المخصصة (Individualized)
                         </h3>
                         <p className="text-[10px] text-text-muted font-bold mt-1">تخصيص أهداف ومعايير محددة لهذا الموظف خارج النماذج العامة</p>
                      </div>
                      <button 
                        onClick={() => setShowAddCustomCriterion(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-secondary transition-all shadow-lg shadow-primary/20"
                      >
                         <Plus size={14} /> إضافة معيار ديناميكي
                      </button>
                   </div>

                   <AnimatePresence>
                      {showAddCustomCriterion && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-slate-50 p-6 rounded-2xl border border-primary/20 border-dashed mb-6"
                        >
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                              <div className="space-y-2">
                                 <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">مسمى المعيار</label>
                                 <input 
                                   type="text"
                                   value={newCriterionLabel}
                                   onChange={e => setNewCriterionLabel(e.target.value)}
                                   placeholder="مثلاً: تطوير نظام الأرشفة..."
                                   className="w-full px-4 py-2.5 bg-white border border-border-theme rounded-xl text-xs font-bold focus:border-primary outline-none transition-all"
                                 />
                              </div>
                              <div className="space-y-2">
                                 <label className="text-[9px] font-black text-text-muted uppercase tracking-widest">الوزن النسبي (%)</label>
                                 <input 
                                   type="number"
                                   value={newCriterionWeight}
                                   onChange={e => setNewCriterionWeight(parseInt(e.target.value) || 0)}
                                   className="w-full px-4 py-2.5 bg-white border border-border-theme rounded-xl text-xs font-bold focus:border-primary outline-none transition-all"
                                 />
                              </div>
                              <div className="flex items-center gap-2">
                                 <button 
                                   onClick={handleAddCustomCriterion}
                                   className="flex-1 py-2.5 bg-secondary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 shadow-lg shadow-secondary/20"
                                 >
                                    تأكيد الإضافة
                                 </button>
                                 <button 
                                   onClick={() => setShowAddCustomCriterion(false)}
                                   className="p-2.5 bg-white border border-border-theme rounded-xl text-text-muted hover:text-red-500 transition-all"
                                 >
                                    <XCircle size={18} />
                                 </button>
                              </div>
                           </div>
                        </motion.div>
                      )}
                   </AnimatePresence>

                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {employee.customCriteria && employee.customCriteria.length > 0 ? (
                        employee.customCriteria.map((c, idx) => (
                           <div key={idx} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-primary/30 transition-all">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-accent shadow-sm border border-slate-100">
                                    <Star size={14} />
                                 </div>
                                 <div className="min-w-0">
                                    <p className="text-xs font-black text-text-dark truncate">{c.label}</p>
                                    <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest">وزن المعيار: {c.weight}%</p>
                                 </div>
                              </div>
                              <button 
                                onClick={() => handleRemoveCustomCriterion(idx)}
                                className="p-2 opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              >
                                 <Trash2 size={14} />
                              </button>
                           </div>
                        ))
                      ) : (
                        <div className="col-span-full py-8 text-center bg-slate-50 border border-dashed border-border-theme rounded-2xl text-text-muted text-[11px] italic font-bold">
                           لم يتم إضافة أي معايير مخصصة لهذا الموظف حتى الآن. اضغط على الزر أعلاه للبدء.
                        </div>
                      )}
                   </div>
                </div>
              </div>
              </motion.div>
            ) : activeSubTab === 'compare' ? (
              <motion.div 
                key="compare"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                <div className="bg-slate-50 p-6 rounded-2xl border border-border-theme flex flex-col md:flex-row md:items-center gap-6">
                  <div className="shrink-0 w-12 h-12 bg-white rounded-xl shadow-sm border border-border-theme flex items-center justify-center text-primary">
                    <ArrowLeftRight size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-black text-text-dark uppercase tracking-widest mb-1">مقارنة الأداء</h3>
                    <p className="text-[11px] text-text-muted font-bold">قارن أداء {employee?.name} مع زميل آخر من الهيكل التنظيمي.</p>
                  </div>
                  <div className="w-full md:w-64">
                    <select 
                      value={compareEmployeeId || ''}
                      onChange={(e) => setCompareEmployeeId(Number(e.target.value) || null)}
                      className="w-full bg-white border-2 border-primary/20 rounded-xl p-3 text-xs font-black text-text-dark focus:border-primary outline-none"
                    >
                      <option value="">اختر موظفاً للمقارنة...</option>
                      {allEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {compareEmployeeId ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Primary Employee */}
                    <div className="bg-white rounded-3xl border border-border-theme shadow-lg overflow-hidden flex flex-col">
                      <div className="p-6 bg-primary text-white flex gap-4 items-center">
                         <div className="w-10 h-10 bg-white shadow-md rounded-lg flex items-center justify-center text-primary font-black uppercase tracking-widest">
                            {employee?.name.substring(0, 1)}
                         </div>
                         <div>
                            <h4 className="text-sm font-black">{employee?.name}</h4>
                            <p className="text-[9px] font-bold text-accent uppercase tracking-[0.2em]">{employee?.department}</p>
                         </div>
                      </div>
                      <div className="p-8 space-y-8 flex-1">
                         <ComparisonStats evaluations={evaluations} />
                      </div>
                    </div>

                    {/* Compare Employee */}
                    <div className="bg-white rounded-3xl border border-border-theme shadow-lg overflow-hidden flex flex-col">
                      <div className="p-6 bg-secondary text-white flex gap-4 items-center">
                         <div className="w-10 h-10 bg-white shadow-md rounded-lg flex items-center justify-center text-secondary font-black uppercase tracking-widest">
                            {allEmployees.find(e => e.id === compareEmployeeId)?.name.substring(0, 1)}
                         </div>
                         <div>
                            <h4 className="text-sm font-black">{allEmployees.find(e => e.id === compareEmployeeId)?.name}</h4>
                            <p className="text-[9px] font-bold text-accent uppercase tracking-[0.2em]">{allEmployees.find(e => e.id === compareEmployeeId)?.department}</p>
                         </div>
                      </div>
                      <div className="p-8 space-y-8 flex-1">
                         <ComparisonStats evaluations={compareEvaluations} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-center opacity-30">
                    <UserPlus size={64} className="mb-4" />
                    <p className="font-black text-lg">اختر موظفاً للبدء في المقارنة</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="history"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Embedded Filter Section */}
                <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 mb-8 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-6 mb-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-primary/10 rounded-xl text-primary">
                          <Filter size={18} />
                       </div>
                       <div>
                          <h3 className="text-sm font-black text-text-dark tracking-tight">فلترة السجل التاريخي</h3>
                          <p className="text-[10px] text-text-muted font-bold">تحديد دورات محددة أو نطاق زمني معين</p>
                       </div>
                    </div>
                    
                    <button 
                      onClick={() => {
                        setFilterPeriod('all');
                        setStartDate('');
                        setEndDate('');
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-text-muted hover:text-primary rounded-xl text-[10px] font-black transition-all border border-border-theme uppercase tracking-wider"
                    >
                      <RefreshCw size={12} /> تصفير كافة الفلاتر
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-text-muted uppercase tracking-widest pr-1">نوع دورة التقييم</label>
                       <select 
                        value={filterPeriod}
                        onChange={e => setFilterPeriod(e.target.value as any)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-border-theme rounded-xl text-xs font-bold focus:border-primary outline-none transition-all"
                      >
                        <option value="all">كافة الدورات (All Periods)</option>
                        <option value="monthly">تقييم شهري</option>
                        <option value="quarterly">تقييم ربع سنوي</option>
                        <option value="semi-annual">تقييم نصف سنوي</option>
                        <option value="annual">تقييم سنوي</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-widest pr-1">من تاريخ</label>
                      <input 
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-border-theme rounded-xl text-xs font-bold focus:border-primary outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-widest pr-1">إلى تاريخ</label>
                      <input 
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-border-theme rounded-xl text-xs font-bold focus:border-primary outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Performance Trend Charts */}
                {evaluations.length > 1 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Bar Chart (Current) */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white border border-border-theme rounded-3xl p-6 shadow-sm overflow-hidden"
                    >
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h3 className="text-sm font-black text-text-dark uppercase tracking-widest flex items-center gap-2">
                              <Activity size={18} className="text-secondary" /> سجل نمو الأداء
                          </h3>
                          <p className="text-[10px] text-text-muted font-bold">تتبع تذبذب الدرجات الكلية عبر الدورات الزمنية</p>
                        </div>
                      </div>
                      <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[...filteredHistory].reverse()}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis 
                                dataKey="date" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 9, fontWeight: 'bold' }} 
                                dy={10}
                              />
                              <YAxis domain={[0, 100]} hide />
                              <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', direction: 'rtl' }}
                                cursor={{ fill: '#f8fafc' }}
                              />
                              <Bar 
                                dataKey="totalScore" 
                                radius={[6, 6, 0, 0]} 
                                barSize={40}
                                animationDuration={1500}
                              >
                                  {[...filteredHistory].reverse().map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={
                                        entry.totalScore >= 90 ? '#10b981' :
                                        entry.totalScore >= 75 ? '#3b82f6' :
                                        entry.totalScore >= 50 ? '#f59e0b' : '#ef4444'
                                      } 
                                    />
                                  ))}
                              </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </motion.div>

                    {/* New Line Chart (Last 5 Evaluations) */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="bg-white border border-border-theme rounded-3xl p-6 shadow-sm overflow-hidden"
                    >
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h3 className="text-sm font-black text-text-dark uppercase tracking-widest flex items-center gap-2">
                              <TrendingUp size={18} className="text-primary" /> مخطط استشراف الأداء (آخر 5 تقييمات)
                          </h3>
                          <p className="text-[10px] text-text-muted font-bold">تطور المنحنى البياني للأداء الوظيفي</p>
                        </div>
                      </div>
                      <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={[...evaluations].reverse().slice(-5)}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis 
                                dataKey="date" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 9, fontWeight: 'bold' }} 
                                dy={10}
                              />
                              <YAxis domain={[0, 100]} hide />
                              <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', direction: 'rtl' }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="totalScore" 
                                stroke="#1565c0" 
                                strokeWidth={4}
                                dot={{ r: 6, fill: '#1565c0', strokeWidth: 2, stroke: '#fff' }}
                                activeDot={{ r: 8, fill: '#1565c0', strokeWidth: 0 }}
                                animationDuration={2000}
                              />
                            </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </motion.div>
                  </div>
                )}

                {filteredHistory.length === 0 ? (
                  <div className="p-20 text-center border-2 border-dashed border-border-theme rounded-3xl">
                    <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-text-muted font-bold">لا توجد تقييمات مطابقة للمعايير المحددة</p>
                  </div>
                ) : (
                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="evaluations">
                      {(provided) => (
                        <div 
                          {...provided.droppableProps} 
                          ref={provided.innerRef} 
                          className="space-y-4"
                        >
                          {filteredHistory.map((evalItem, index) => (
                            <Draggable key={evalItem.id} draggableId={evalItem.id!.toString()} index={index}>
                              {(provided) => (
                                <div 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className="bg-white border border-border-theme rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex items-stretch"
                                >
                                  <div {...provided.dragHandleProps} className="w-10 bg-slate-50 flex items-center justify-center text-slate-300 border-l border-border-theme hover:text-primary transition-colors">
                                     <GripVertical size={16} />
                                  </div>
                                  <div className="flex-1">
                                    <div 
                                      onClick={() => setExpandedEvalId(expandedEvalId === evalItem.id ? null : evalItem.id!)}
                                      className={`p-6 cursor-pointer flex flex-wrap items-center justify-between gap-6 transition-colors ${
                                        expandedEvalId === evalItem.id ? 'bg-slate-50' : 'hover:bg-slate-50/50'
                                      }`}
                                    >
                                      <div className="flex items-center gap-4">
                                        <div className={`w-3 h-12 rounded-full shrink-0 ${
                                          evalItem.totalScore >= 90 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' :
                                          evalItem.totalScore >= 75 ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]' :
                                          'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                                        }`} title={
                                          evalItem.totalScore >= 90 ? 'أداء ممتاز' :
                                          evalItem.totalScore >= 75 ? 'أداء جيد جداً' :
                                          'أداء مرضٍ/يحتاج تحسين'
                                        } />
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                          <div className="flex flex-col">
                                              <span className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">التاريخ</span>
                                              <div className="flex items-center gap-2 text-sm font-black text-text-dark">
                                                <Calendar size={14} className="text-primary" />
                                                {evalItem.date}
                                              </div>
                                          </div>
                                          <div className="flex flex-col">
                                              <span className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">الدورة</span>
                                              <span className="text-sm font-black text-primary uppercase">{evalItem.period}</span>
                                          </div>
                                          <div className="flex flex-col">
                                              <span className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">النتيجة</span>
                                              <div className="flex items-center gap-2">
                                                <Award size={14} className="text-accent" />
                                                <span className={`text-xl font-black ${
                                                    evalItem.totalScore >= 90 ? 'text-emerald-600' :
                                                    evalItem.totalScore >= 75 ? 'text-blue-600' : 'text-amber-600'
                                                }`}>%{evalItem.totalScore.toFixed(1)}</span>
                                              </div>
                                          </div>
                                          
                                          <div className="flex items-center gap-4 border-r border-border-theme pr-4">
                                             <div className="flex flex-col items-center">
                                                <span className="text-[8px] font-black text-text-muted uppercase tracking-tighter mb-1">الحضور</span>
                                                <AttendanceBadge status={evalItem.attendance} />
                                             </div>
                                             <div className="flex flex-col items-center">
                                                <span className="text-[8px] font-black text-text-muted uppercase tracking-tighter mb-1">الانضباط</span>
                                                <DisciplineBadge status={evalItem.discipline} />
                                             </div>
                                          </div>
                                        </div>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            downloadReport(evalItem.id!);
                                          }}
                                          disabled={isDownloading !== null}
                                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black shadow-sm transition-all border ${
                                            isDownloading === evalItem.id 
                                            ? 'bg-slate-200 text-slate-500 border-slate-300' 
                                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:scale-105 active:scale-95'
                                          }`}
                                        >
                                          {isDownloading === evalItem.id ? (
                                            <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                          ) : (
                                            <FileDown size={14} />
                                          )}
                                          {isDownloading === evalItem.id ? 'جاري التحميل...' : 'تنزيل تقرير التقييم (PDF)'}
                                        </button>
                                      </div>
                                      {expandedEvalId === evalItem.id ? <ChevronUp className="text-text-muted" /> : <ChevronDown className="text-text-muted" />}
                                    </div>

                                    <AnimatePresence>
                                      {expandedEvalId === evalItem.id && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: 'auto', opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          className="overflow-hidden bg-[#fafafa] border-t border-border-theme"
                                        >
                                          {/* ... existing expansion content ... */}
                                          <div id={`eval-report-${evalItem.id}`} className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-10 bg-white shadow-inner">
                                            <div>
                                                <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                                  <Target size={14} /> تفصيل درجات المعايير
                                                </h4>
                                                <div className="space-y-3">
                                                  {evalItem.criteria.map((c, idx) => (
                                                    <div key={idx} className="flex justify-between items-center p-3 bg-white border border-border-theme rounded-xl shadow-sm">
                                                        <span className="text-xs font-bold text-text-dark">{c.label}</span>
                                                        <span className="font-black text-secondary px-3 py-1 bg-secondary/5 rounded-lg border border-secondary/10">
                                                          {c.score} / 5
                                                        </span>
                                                    </div>
                                                  ))}
                                                </div>
                                            </div>
                                            <div className="space-y-8">
                                                <div>
                                                  <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">التدقيق السلوكي والتحصيل</h4>
                                                  <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-4 bg-white rounded-2xl border border-border-theme text-center flex flex-col items-center">
                                                        <p className="text-[9px] font-black text-text-muted uppercase mb-2">سجل الحضور</p>
                                                        <AttendanceBadge status={evalItem.attendance} showText />
                                                    </div>
                                                    <div className="p-4 bg-white rounded-2xl border border-border-theme text-center flex flex-col items-center">
                                                        <p className="text-[9px] font-black text-text-muted uppercase mb-2">مستوى الانضباط</p>
                                                        <DisciplineBadge status={evalItem.discipline} showText />
                                                    </div>
                                                  </div>
                                                </div>
                                                <div>
                                                  <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">ملاحظات رئيس الوحدة</h4>
                                                  <div className="p-6 bg-white rounded-2xl border border-border-theme text-[11px] leading-relaxed italic text-text-dark min-h-[80px]">
                                                      {evalItem.notes || 'لا توجد ملاحظات مسجلة لهذا التقييم'}
                                                  </div>
                                                </div>

                                                <div className="lg:col-span-2 mt-4 space-y-6">
                                                   <div className="h-px bg-slate-100" />
                                                   <div>
                                                      <h4 className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                                         <Lightbulb size={14} /> التوصيات التدريبية والتحسين (Gap Analysis)
                                                      </h4>
                                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                         <div className="space-y-3">
                                                            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest pl-2">المعايير التي تحتاج تطوير (Score ≤ 3)</p>
                                                            {evalItem.criteria.filter(c => c.score <= 3).length > 0 ? (
                                                               evalItem.criteria.filter(c => c.score <= 3).map((c, i) => (
                                                                  <div key={i} className="p-4 bg-red-50/30 border border-red-100 rounded-2xl flex flex-col gap-2">
                                                                     <div className="flex justify-between items-center">
                                                                        <span className="text-xs font-bold text-red-700">{c.label}</span>
                                                                        <span className="text-[10px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{c.score} / 5</span>
                                                                     </div>
                                                                     <div className="flex flex-wrap gap-2 mt-1">
                                                                        {getSuggestedTraining(c.label).map((t, ti) => (
                                                                           <span key={ti} className="text-[9px] font-bold bg-white text-primary border border-primary/10 px-2 py-1 rounded-lg">
                                                                              {t}
                                                                           </span>
                                                                        ))}
                                                                     </div>
                                                                  </div>
                                                               ))
                                                            ) : (
                                                               <div className="p-4 bg-emerald-50/30 border border-emerald-100 rounded-2xl text-[10px] text-emerald-700 font-bold italic">
                                                                  كافة المعايير ضمن النطاق المقبول. لا توجد فجوات مهارية حرجة.
                                                               </div>
                                                            )}
                                                         </div>
                                                         <div className="space-y-4">
                                                            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest pl-2">الاحتياجات التدريبية المسجلة يدوياً</p>
                                                            <div className="flex flex-wrap gap-2">
                                                               {evalItem.trainingNeeds && evalItem.trainingNeeds.length > 0 ? (
                                                                  evalItem.trainingNeeds.map((need, i) => (
                                                                     <div key={i} className="px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl text-[11px] font-bold text-primary flex items-center gap-2">
                                                                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                                                                        {need}
                                                                     </div>
                                                                  ))
                                                               ) : (
                                                                  <p className="text-[10px] text-text-muted italic p-2">لم يتم تسجيل احتياجات تدريبية إضافية.</p>
                                                               )}
                                                            </div>
                                                         </div>
                                                      </div>
                                                   </div>
                                                </div>
                                            </div>

                                            {/* AI Smart Summary Section */}
                                            <div className="lg:col-span-2 mt-8 p-8 bg-slate-50 rounded-3xl border border-secondary/10 relative overflow-hidden">
                                               <div className="absolute -top-10 -left-10 w-40 h-40 bg-secondary/5 rounded-full blur-3xl" />
                                               <div className="relative z-10">
                                                  <h4 className="text-sm font-black text-secondary uppercase tracking-widest mb-6 flex items-center gap-2">
                                                     <div className="p-1.5 bg-secondary text-white rounded-lg">
                                                        <Lightbulb size={16} />
                                                     </div>
                                                     ملخص التحليل الذكي (AI Insight Summary)
                                                  </h4>
                                                  
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-right" dir="rtl">
                                                     <div className="space-y-4">
                                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                                                           <CheckCircle2 size={14} /> أبرز النتائج والتفوق
                                                        </p>
                                                        <ul className="space-y-3">
                                                           <li className="flex items-start gap-2 text-[11px] font-bold text-text-dark">
                                                              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
                                                              ثبات عالي في دقة المخرجات والالتزام بالمعايير المؤسسية للوزارة.
                                                           </li>
                                                           <li className="flex items-start gap-2 text-[11px] font-bold text-text-dark">
                                                              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
                                                              تميز ملحوظ في التعامل مع المهام المعقدة التي تتطلب تركيزاً تقنياً عالياً.
                                                           </li>
                                                        </ul>
                                                     </div>
                                                     
                                                     <div className="space-y-4">
                                                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                                                           <AlertCircle size={14} /> التوصيات المقترحة للنمو
                                                        </p>
                                                        <ul className="space-y-3">
                                                           <li className="flex items-start gap-2 text-[11px] font-bold text-text-dark">
                                                              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0" />
                                                              المشاركة في برامج تطوير مهارات الصيانة الوقائية والأنظمة الحديثة.
                                                           </li>
                                                           <li className="flex items-start gap-2 text-[11px] font-bold text-text-dark">
                                                              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 shrink-0" />
                                                              تعزيز الروح القيادية من خلال تولي مهام تنسيقية صغيرة مع فريق العمل.
                                                           </li>
                                                        </ul>
                                                     </div>
                                                  </div>
                                               </div>
                                            </div>

                                            {evalItem.aiAnalysis && (
                                              <div className="lg:col-span-2 mt-4">
                                                  <h4 className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                    <span className="w-2 h-2 bg-accent rounded-full animate-pulse" /> التوصيات الاستراتيجية (Gemini AI)
                                                  </h4>
                                                  <div className="p-6 ai-gradient text-white rounded-3xl text-[11px] leading-relaxed shadow-lg relative overflow-hidden group">
                                                      <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12">
                                                        <FileText size={80} />
                                                      </div>
                                                      <div className="relative z-10 prose prose-invert prose-sm max-w-none text-right">
                                                        <div dangerouslySetInnerHTML={{ __html: evalItem.aiAnalysis.replace(/\n/g, '<br/>') }} />
                                                      </div>
                                                  </div>
                                              </div>
                                            )}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function StatBox({ icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="p-8 flex items-center gap-6">
      <div className="p-4 bg-white rounded-2xl border border-border-theme shadow-sm">
        {React.cloneElement(icon as React.ReactElement<any>, { size: 24 })}
      </div>
      <div>
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-black text-text-dark">{value}</p>
      </div>
    </div>
  );
}

function InfoCard({ label, value, icon }: { label: string, value: string, icon: any }) {
  return (
    <div className="bg-slate-50/50 p-5 rounded-2xl border border-border-theme">
      <div className="flex items-center gap-2 mb-2 text-[10px] font-black text-text-muted uppercase tracking-widest">
        {React.cloneElement(icon as React.ReactElement<any>, { size: 14, className: "text-primary" })}
        {label}
      </div>
      <div className="text-sm font-black text-text-dark">{value}</div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border-theme last:border-0 uppercase tracking-tighter">
      <span className="text-[10px] font-black text-text-muted">{label}</span>
      <span className="text-[11px] font-bold text-text-dark">{value}</span>
    </div>
  );
}

function AttendanceBadge({ status, showText = false }: { status: Evaluation['attendance'], showText?: boolean }) {
  const configs = {
    excellent: { color: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: <CheckCircle2 size={16} strokeWidth={3} />, label: 'حضور كامل' },
    good: { color: 'text-blue-600 bg-blue-50 border-blue-100', icon: <Clock size={16} strokeWidth={3} />, label: 'منضبط' },
    average: { color: 'text-amber-600 bg-amber-50 border-amber-100', icon: <AlertCircle size={16} strokeWidth={3} />, label: 'تأخير متكرر' },
    poor: { color: 'text-red-600 bg-red-50 border-red-100', icon: <XCircle size={16} strokeWidth={3} />, label: 'غياب غير مبرر' },
  };
  const config = configs[status];
  return (
    <div 
      className={`flex items-center gap-2 ${showText ? 'px-4 py-2 rounded-2xl border' : 'w-11 h-11 rounded-2xl justify-center shadow-lg border-2'} text-[11px] font-black uppercase tracking-tight transition-all hover:scale-110 active:scale-95 ${config.color}`}
      title={config.label}
    >
      {config.icon}
      {showText && config.label}
    </div>
  );
}

function DisciplineBadge({ status, showText = false }: { status: Evaluation['discipline'], showText?: boolean }) {
  const configs = {
    committed: { color: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: <ShieldCheck size={16} strokeWidth={3} />, label: 'سلوك مثالي' },
    'needs-improvement': { color: 'text-amber-600 bg-amber-50 border-amber-100', icon: <Activity size={16} strokeWidth={3} />, label: 'تحت الملاحظة' },
    warning: { color: 'text-red-600 bg-red-50 border-red-100', icon: <AlertCircle size={16} strokeWidth={3} />, label: 'إنذار رسمي' },
  };
  const config = configs[status];
  return (
    <div 
      className={`flex items-center gap-2 ${showText ? 'px-4 py-2 rounded-2xl border' : 'w-11 h-11 rounded-2xl justify-center shadow-lg border-2'} text-[11px] font-black uppercase tracking-tight transition-all hover:scale-110 active:scale-95 ${config.color}`}
      title={config.label}
    >
      {config.icon}
      {showText && config.label}
    </div>
  );
}

function ComparisonStats({ evaluations }: { evaluations: Evaluation[] }) {
  const avgScore = evaluations.length > 0 
    ? evaluations.reduce((acc, curr) => acc + curr.totalScore, 0) / evaluations.length 
    : 0;
  
  const latestScore = evaluations.length > 0 ? evaluations[0].totalScore : 0;
  
  const trend = evaluations.length >= 2 
    ? evaluations[0].totalScore - evaluations[1].totalScore 
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-slate-50 rounded-2xl border border-border-theme">
          <p className="text-[9px] font-black text-text-muted uppercase mb-1">المتوسط العام</p>
          <p className="text-xl font-black text-primary">%{avgScore.toFixed(1)}</p>
        </div>
        <div className="p-4 bg-slate-50 rounded-2xl border border-border-theme">
          <p className="text-[9px] font-black text-text-muted uppercase mb-1">آخر تقييم</p>
          <p className="text-xl font-black text-secondary">%{latestScore.toFixed(1)}</p>
        </div>
      </div>

      <div className="space-y-3">
        <h5 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
          <TrendingUp size={12} /> اتجاهات الأداء (تاريخياً)
        </h5>
        <div className="p-4 bg-white border border-border-theme rounded-2xl flex items-center justify-between">
          <span className="text-[11px] font-bold text-text-dark">التغير في آخر دورة</span>
          <div className={`flex items-center gap-1 font-black text-xs ${trend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {trend >= 0 ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        </div>
      </div>

      {evaluations.length > 0 && (
        <div className="space-y-3">
          <h5 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
            <Target size={12} /> توزيع الدرجات
          </h5>
          <div className="space-y-2">
             {evaluations[0].criteria.map((c, i) => (
               <div key={i} className="space-y-1">
                 <div className="flex justify-between text-[9px] font-bold text-text-muted">
                    <span>{c.label}</span>
                    <span>{c.score}/5</span>
                 </div>
                 <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(c.score / 5) * 100}%` }} />
                 </div>
               </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
}
