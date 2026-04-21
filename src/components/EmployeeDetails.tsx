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
  FileEdit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  LineChart, 
  Line, 
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
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-muted bg-white/10 backdrop-blur-sm w-fit px-5 py-2 rounded-full border border-white/20 shadow-sm mb-8">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-1.5 hover:text-primary transition-colors hover:scale-105 active:scale-95"
        >
          <LayoutDashboard size={12} className="text-primary" />
          لوحة التحكم
        </button>
        <ChevronLeft size={10} className="opacity-30 mx-1" />
        <button 
          onClick={() => navigate('/employees')} 
          className="flex items-center gap-1.5 hover:text-primary transition-colors hover:scale-105 active:scale-95"
        >
          <Users size={12} className="text-secondary" />
          الموظفين
        </button>
        <ChevronLeft size={10} className="opacity-30 mx-1" />
        <span className="text-primary flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-lg border border-primary/10 font-black">
          <User size={12} />
          {employee.name}
        </span>
      </nav>

      {/* Header Profile Section */}
      <div className="bg-white rounded-3xl border border-border-theme shadow-lg overflow-hidden">
        <div className="bg-primary p-8 text-white relative">
          <div className="absolute top-0 left-0 w-64 h-full bg-accent/20 skew-x-[-20deg] origin-top translate-x-12 hidden lg:block" />
          
          <button 
            onClick={() => navigate('/employees')}
            className="absolute top-6 left-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white border border-white/10 flex items-center justify-center"
            title="العودة للقائمة"
          >
            <ArrowRight size={20} />
          </button>

          <div className="absolute top-6 right-6 flex flex-wrap justify-end gap-3 z-20">
            <button 
              onClick={() => employee && onEditEmployee?.(employee)}
              className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-black transition-all"
            >
              <FileEdit size={16} />
              تعديل بيانات الموظف
            </button>
            <button 
              onClick={downloadProfileReport}
              disabled={isDownloadingProfile}
              className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-black transition-all"
            >
              {isDownloadingProfile ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Printer size={16} />}
              Download Employee Profile PDF
            </button>
            <button 
              onClick={downloadPagePDF}
              disabled={isDownloadingPage}
              className="flex items-center gap-2 px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-black transition-all"
            >
              {isDownloadingPage ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FileDown size={16} />}
              تصدير الصفحة (PDF)
            </button>
            <button 
              onClick={() => employee && onEvaluateUser?.(employee)}
              className="flex items-center gap-2 px-6 py-2 bg-accent text-primary rounded-xl text-xs font-black shadow-lg shadow-accent/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={16} />
              تقييم جديد
            </button>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            <div className="flex flex-col items-center gap-4">
              <div className={`w-32 h-32 rounded-3xl flex items-center justify-center text-4xl font-black border-4 border-white/20 shadow-2xl relative ${
                latestEvaluation?.totalScore >= 90 ? 'bg-emerald-500' :
                latestEvaluation?.totalScore >= 75 ? 'bg-blue-500' :
                latestEvaluation?.totalScore >= 50 ? 'bg-amber-500' : 
                latestEvaluation ? 'bg-red-500' : 'bg-slate-400'
              }`}>
                {employee.name[0]}
                {latestEvaluation && (
                  <span className={`absolute -top-2 -right-2 w-8 h-8 rounded-full border-4 border-primary flex items-center justify-center text-xs ${
                    latestEvaluation.totalScore >= 90 ? 'bg-emerald-500' :
                    latestEvaluation.totalScore >= 75 ? 'bg-blue-500' :
                    latestEvaluation.totalScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  }`}>
                    %{latestEvaluation.totalScore.toFixed(0)}
                  </span>
                )}
              </div>
              <button 
                onClick={() => navigate('/employees')}
                className="flex items-center gap-2 px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-white/10"
              >
                <Users size={12} />
                العودة لقائمة الموظفين
              </button>
            </div>

            <div className="text-center md:text-right flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-2">
                <h2 className="text-3xl font-black">{employee.name}</h2>
                <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  employee.type === 'technical' ? 'bg-[#e3f2fd] text-[#1565c0]' : 'bg-[#f3e5f5] text-[#7b1fa2]'
                }`}>
                  {employee.type === 'technical' ? 'كادر فني' : 'كادر إداري'}
                </span>
                <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  employee.category === 'consultant' ? 'bg-amber-100 text-amber-700' :
                  employee.category === 'contractor' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {employee.category === 'internal' ? 'موظف رسمي' : 
                   employee.category === 'consultant' ? 'مستشار خارجي' : 'متعاقد'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-6 text-white/80 font-bold text-sm">
                <span className="flex items-center gap-2"><Briefcase size={16} className="text-accent" /> {employee.position}</span>
                <span className="flex items-center gap-2">
                  <Building2 size={16} className="text-accent" /> 
                  <div className="flex flex-col">
                    <span>{employee.department} (رئيسي)</span>
                    {employee.secondDepartment && (
                      <span className="text-[10px] text-white/60">مستعان به في: {employee.secondDepartment}</span>
                    )}
                  </div>
                </span>
                <span className="flex items-center gap-2"><Hash size={16} className="text-accent" /> {employee.employeeId}</span>
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
            className={`flex-1 min-w-[150px] py-4 font-black text-xs uppercase tracking-widest transition-all relative ${
              activeSubTab === 'info' ? 'text-primary' : 'text-text-muted hover:bg-slate-50'
            }`}
          >
            بيانات الكادر التفصيلية
            {activeSubTab === 'info' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />}
          </button>
          <button 
            onClick={() => setActiveSubTab('history')}
            className={`flex-1 min-w-[150px] py-4 font-black text-xs uppercase tracking-widest transition-all relative ${
              activeSubTab === 'history' ? 'text-primary' : 'text-text-muted hover:bg-slate-50'
            }`}
          >
            السجل التاريخي للتقييمات
            {activeSubTab === 'history' && <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />}
          </button>
          <button 
            onClick={() => setActiveSubTab('compare')}
            className={`flex-1 min-w-[150px] py-4 font-black text-xs uppercase tracking-widest transition-all relative ${
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
                        <h4 className="text-xs font-black uppercase tracking-[0.2em] opacity-80 mb-1">ملخص آخر حالة تقييم</h4>
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
                      </div>
                    ) : (
                      <div className="p-8 text-center text-text-muted italic text-sm">
                        لم يتم تسجيل أي تقييمات لهذا الموظف حتى الآن
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
        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">{label}</p>
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
    excellent: { color: 'text-emerald-500 bg-emerald-50 border-emerald-100', icon: <CheckCircle2 size={14} />, label: 'ممتاز' },
    good: { color: 'text-blue-500 bg-blue-50 border-blue-100', icon: <Clock size={14} />, label: 'جيد' },
    average: { color: 'text-amber-500 bg-amber-50 border-amber-100', icon: <AlertCircle size={14} />, label: 'متوسط' },
    poor: { color: 'text-red-500 bg-red-50 border-red-100', icon: <XCircle size={14} />, label: 'ضعيف' },
  };
  const config = configs[status];
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-tighter ${config.color}`}>
      {config.icon}
      {showText && config.label}
    </div>
  );
}

function DisciplineBadge({ status, showText = false }: { status: Evaluation['discipline'], showText?: boolean }) {
  const configs = {
    committed: { color: 'text-emerald-500 bg-emerald-50 border-emerald-100', icon: <CheckCircle2 size={14} />, label: 'منضبط' },
    'needs-improvement': { color: 'text-amber-500 bg-amber-50 border-amber-100', icon: <AlertCircle size={14} />, label: 'يحتاج تحسين' },
    warning: { color: 'text-red-500 bg-red-50 border-red-100', icon: <XCircle size={14} />, label: 'إنذار' },
  };
  const config = configs[status];
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-tighter ${config.color}`}>
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
