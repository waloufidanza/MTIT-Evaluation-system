/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../db.ts';
import { Employee, Evaluation } from '../types.ts';
import { 
  Users, 
  BarChart3, 
  Plus, 
  Search, 
  MoreVertical, 
  TrendingUp, 
  Award,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpRight,
  Hash,
  X,
  History,
  CheckSquare,
  Square,
  Trash2,
  ListChecks,
  AlertTriangle,
  FileEdit,
  FileDown,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Settings,
  GripVertical,
  Eye,
  EyeOff,
  Calendar,
  Fingerprint,
  Wifi,
  WifiOff,
  RefreshCw,
  Cpu,
  FileUp,
  CheckCircle2,
  Sparkles,
  Trophy,
  Target,
  Zap,
  ShieldCheck,
  Building2,
  BrainCircuit,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import EvaluationHistory from './EvaluationHistory.tsx';
import ExportEvaluations from './ExportEvaluations.tsx';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { aggregateMinistryAnalysis } from '../services/geminiService.ts';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { User, DashboardSettings, EvaluationCriteria } from '../types.ts';
import { HRIntegrationService } from '../services/hrIntegration.ts';

interface DashboardProps {
  user: User | null;
  onUpdateUser: (user: User) => void;
  onAddEmployee: () => void;
  onEditEmployee: (employee: Employee) => void;
  onEvaluateUser: (employee: Employee) => void;
  refreshTrigger: number;
}

const WIDGETS_INFO = {
  'perf-summary': { label: 'ملخص التنبيهات', icon: <AlertTriangle size={16} /> },
  'stat-low-alert': { label: 'تنبيهات الأداء المنخفض', icon: <AlertTriangle size={16} /> },
  'performance-alerts': { label: 'تنبيهات الأداء الحرجة', icon: <AlertTriangle size={16} /> },
  'main-chart': { label: 'مخطط الأداء الوزاري', icon: <BarChart3 size={16} /> },
  'employee-table': { label: 'سجل القوة البشرية', icon: <ListChecks size={16} /> },
  'ai-advisor': { label: 'المحلل الاستراتيجي الذكي', icon: <Award size={16} /> },
  'fingerprint-sync': { label: 'مزامنة الأنظمة البيومترية', icon: <Fingerprint size={16} /> }
};

const DEFAULT_SETTINGS: DashboardSettings = {
  visibleWidgets: ['perf-summary', 'stat-staff', 'stat-tech', 'stat-non-tech', 'stat-eval-done', 'stat-eval-pending', 'stat-low-alert', 'performance-alerts', 'main-chart', 'employee-table', 'ai-advisor', 'fingerprint-sync'],
  widgetOrder: ['perf-summary', 'stat-staff', 'stat-tech', 'stat-non-tech', 'stat-eval-done', 'stat-eval-pending', 'stat-low-alert', 'performance-alerts', 'main-chart', 'employee-table', 'ai-advisor', 'fingerprint-sync']
};

export default function Dashboard({ user, onUpdateUser, onAddEmployee, onEditEmployee, onEvaluateUser, refreshTrigger }: DashboardProps) {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'technical' | 'non-technical'>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'internal' | 'consultant' | 'contractor'>('all');
  const [joinDateFilter, setJoinDateFilter] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGlobalAnalyzing, setIsGlobalAnalyzing] = useState(false);
  const [globalAnalysis, setGlobalAnalysis] = useState<string | null>(null);
  const [showHistoryEmployee, setShowHistoryEmployee] = useState<Employee | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ field: 'name' | 'employeeId' | 'joinDate', direction: 'asc' | 'desc' } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [chartDepartment, setChartDepartment] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  
  const settings = user?.dashboardSettings || DEFAULT_SETTINGS;

  // New KPI Calculations
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const totalEmployees = employees.length;
    const technicalStaff = employees.filter(e => e.type === 'technical').length;
    const nonTechnicalStaff = employees.filter(e => e.type === 'non-technical').length;
    
    // For pending evaluations: check employees who don't have an eval for current month/year
    const evalsThisMonth = evaluations.filter(e => e.month === currentMonth && e.year === currentYear);
    const evaluatedIds = new Set(evalsThisMonth.map(e => e.employeeId));
    
    const completedEvaluations = evaluatedIds.size;
    const pendingEvaluations = totalEmployees - completedEvaluations;

    return {
      totalEmployees,
      technicalStaff,
      nonTechnicalStaff,
      completedEvaluations,
      pendingEvaluations
    };
  }, [employees, evaluations]);

  const perfAlerts = useMemo(() => {
    const alerts: { employee: Employee; drop: number; latest: number; avg: number }[] = [];
    employees.forEach(emp => {
      const empEvals = evaluations
        .filter(e => e.employeeId === emp.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      if (empEvals.length >= 2) {
        const latest = empEvals[empEvals.length - 1];
        const previousEvals = empEvals.slice(0, -1);
        const avgScore = previousEvals.reduce((acc, curr) => acc + curr.totalScore, 0) / previousEvals.length;
        
        if (latest.totalScore < avgScore * 0.85) { // 15% drop
          alerts.push({
            employee: emp,
            drop: avgScore - latest.totalScore,
            latest: latest.totalScore,
            avg: avgScore
          });
        }
      }
    });
    return alerts;
  }, [employees, evaluations]);

  const handleUpdateSettings = async (newSettings: DashboardSettings) => {
    if (!user) return;
    const updatedUser = { ...user, dashboardSettings: newSettings };
    await db.users.update(user.id!, { dashboardSettings: newSettings });
    onUpdateUser(updatedUser);
  };

  const handleDeleteEmployee = async (employee: Employee) => {
    setEmployeeToDelete(employee);
  };

  const confirmDelete = async () => {
    if (!employeeToDelete || !employeeToDelete.id) return;
    
    try {
      // Perform deletion
      await db.employees.delete(employeeToDelete.id);
      await db.evaluations.where('employeeId').equals(employeeToDelete.id).delete();
      
      // Update local status for immediate feedback
      setEmployees(prev => prev.filter(e => e.id !== employeeToDelete.id));
      setEvaluations(prev => prev.filter(e => e.employeeId !== employeeToDelete.id));
      
      // Ensure we are not on an empty page
      const remainingInView = paginatedEmployees.filter(e => e.id !== employeeToDelete.id);
      if (remainingInView.length === 0 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
      
      // Final sync with database
      await loadData();
      
      console.log(`Deleted employee ${employeeToDelete.id} and their evaluations successfully.`);
      setEmployeeToDelete(null);
    } catch (error) {
      console.error("Failed to delete employee:", error);
      alert(`حدث خطأ أثناء محاولة الحذف: ${error instanceof Error ? error.message : 'خطأ في قاعدة البيانات'}`);
    }
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(settings.widgetOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    handleUpdateSettings({ ...settings, widgetOrder: items });
  };

  const toggleWidget = (widgetId: string) => {
    const isVisible = settings.visibleWidgets.includes(widgetId);
    const newVisible = isVisible 
      ? settings.visibleWidgets.filter(id => id !== widgetId)
      : [...settings.visibleWidgets, widgetId];
    
    handleUpdateSettings({ ...settings, visibleWidgets: newVisible });
  };
  
  // Pagination & Selection States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);

  useEffect(() => {
    loadData();
    
    // Auto sync HR data on mount
    const autoSync = async () => {
      setIsSyncing(true);
      try {
        await HRIntegrationService.syncNow();
        await loadData();
      } finally {
        setIsSyncing(false);
      }
    };
    autoSync();
  }, [refreshTrigger]);

  const handleSort = (field: 'name' | 'employeeId' | 'joinDate') => {
    setSortConfig(prev => {
      if (prev?.field === field) {
        return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { field, direction: 'asc' };
    });
  };

  const getSortIcon = (field: 'name' | 'employeeId' | 'joinDate') => {
    if (sortConfig?.field !== field) return <ArrowUpDown size={12} className="opacity-30" />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  const loadData = async () => {
    const allEmployees = await db.employees.toArray();
    const allEvaluations = await db.evaluations.orderBy('date').reverse().toArray();
    setEmployees(allEmployees);
    setEvaluations(allEvaluations);
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.includes(searchTerm) || emp.employeeId.includes(searchTerm);
    const matchesType = selectedType === 'all' || emp.type === selectedType;
    const matchesCategory = selectedCategory === 'all' || emp.category === selectedCategory;
    const matchesDate = !joinDateFilter || emp.joinDate >= joinDateFilter;
    const matchesDeptFilter = departmentFilter === 'all' || emp.department === departmentFilter || emp.secondDepartment === departmentFilter;
    return matchesSearch && matchesType && matchesCategory && matchesDate && matchesDeptFilter;
  }).sort((a, b) => {
    if (!sortConfig) return 0;
    const { field, direction } = sortConfig;
    const modifier = direction === 'asc' ? 1 : -1;
    
    if (a[field] < b[field]) return -1 * modifier;
    if (a[field] > b[field]) return 1 * modifier;
    return 0;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Bulk Selection Logic
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedEmployees(paginatedEmployees.map(emp => emp.id!));
    } else {
      setSelectedEmployees([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedEmployees(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    const idsToDelete = [...selectedEmployees];
    if (window.confirm(`هل أنت متأكد من حذف ${idsToDelete.length} من الموظفين المحددين؟ سيتم حذف كافة سجلاتهم التاريخية.`)) {
      try {
        await db.employees.bulkDelete(idsToDelete);
        for (const id of idsToDelete) {
          await db.evaluations.where('employeeId').equals(id).delete();
        }
        
        // Update local state immediately
        setEmployees(prev => prev.filter(e => !idsToDelete.includes(e.id!)));
        setEvaluations(prev => prev.filter(e => !idsToDelete.includes(e.employeeId)));
        setSelectedEmployees([]);
        
        if (paginatedEmployees.length === idsToDelete.length && currentPage > 1) {
          setCurrentPage(prev => prev - 1);
        }
        
        await loadData();
      } catch (error) {
        console.error("Bulk delete failed:", error);
        alert("فشل حذف الموظفين المحددين.");
      }
    }
  };

  const getLatestScore = (empId: number) => {
    const latest = evaluations.find(e => e.employeeId === empId);
    return latest ? latest.totalScore : null;
  };

  const chartData = useMemo(() => {
    if (evaluations.length === 0) return [];
    
    // Group evaluations by quarter for the last year
    const now = new Date();
    const currentYear = now.getFullYear();
    const quarters: Record<string, { deptTotal: number, deptCount: number, minTotal: number, minCount: number }> = {
      'Q1': { deptTotal: 0, deptCount: 0, minTotal: 0, minCount: 0 },
      'Q2': { deptTotal: 0, deptCount: 0, minTotal: 0, minCount: 0 },
      'Q3': { deptTotal: 0, deptCount: 0, minTotal: 0, minCount: 0 },
      'Q4': { deptTotal: 0, deptCount: 0, minTotal: 0, minCount: 0 }
    };

    evaluations.forEach(ev => {
      const limitYears = evaluations.length > 50 ? 1 : 3;
      
      if (ev.year >= (currentYear - limitYears)) {
        try {
          const month = ev.month || (new Date(ev.date).getMonth() + 1);
          if (isNaN(month)) return; 
          
          const qIdx = Math.ceil(month / 3);
          const q = ev.year === currentYear ? `Q${qIdx}` : `Q${qIdx} (${ev.year})`;
          
          if (!quarters[q]) {
            quarters[q] = { deptTotal: 0, deptCount: 0, minTotal: 0, minCount: 0 };
          }
          
          // Ministry Total
          quarters[q].minTotal += ev.totalScore;
          quarters[q].minCount++;

          // Department Filtering
          if (chartDepartment === 'all' || ev.evaluatingDepartment === chartDepartment) {
            quarters[q].deptTotal += ev.totalScore;
            quarters[q].deptCount++;
          }
        } catch (e) {
          console.error("Evaluation chart error:", e);
        }
      }
    });

    return Object.entries(quarters)
      .sort((a, b) => {
        const getYearVal = (s: string) => s.includes('(') ? parseInt(s.split('(')[1]) : currentYear;
        const getQVal = (s: string) => parseInt(s.match(/Q(\d)/)?.[1] || '0');
        const yearA = getYearVal(a[0]);
        const yearB = getYearVal(b[0]);
        if (yearA !== yearB) return yearA - yearB;
        return getQVal(a[0]) - getQVal(b[0]);
      })
      .map(([name, data]) => ({
        name,
        score: data.deptCount > 0 ? Math.round(data.deptTotal / data.deptCount) : 0,
        ministryAvg: data.minCount > 0 ? Math.round(data.minTotal / data.minCount) : 0
      }));
  }, [evaluations, chartDepartment]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => {
        if (e.department) set.add(e.department);
        if (e.secondDepartment) set.add(e.secondDepartment);
    });
    return Array.from(set).sort();
  }, [employees]);

  const departmentComparisonData = useMemo(() => {
    if (evaluations.length === 0) return [];

    const totalAvg = evaluations.reduce((acc, c) => acc + c.totalScore, 0) / evaluations.length;
    
    const depts: Record<string, { total: number, count: number }> = {};
    evaluations.forEach(e => {
        const d = e.evaluatingDepartment || 'غير مصنف';
        if (!depts[d]) depts[d] = { total: 0, count: 0 };
        depts[d].total += e.totalScore;
        depts[d].count += 1;
    });

    return Object.entries(depts).map(([name, data]) => ({
        name,
        avg: Math.round(data.total / data.count),
        ministryAvg: Math.round(totalAvg)
    })).sort((a, b) => b.avg - a.avg);
  }, [evaluations]);

  const handleExportEmployeesCSV = () => {
    if (employees.length === 0) return;

    const headers = ['Name', 'Employee ID', 'Department', 'Position', 'Type', 'Category', 'Join Date'];
    const rows = employees.map(emp => [
      `"${emp.name}"`,
      `"${emp.employeeId}"`,
      `"${emp.department}"`,
      `"${emp.position}"`,
      `"${emp.type}"`,
      `"${emp.category || ''}"`,
      `"${emp.joinDate}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'employees_list.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderWidget = (widgetId: string) => {
    if (!settings.visibleWidgets.includes(widgetId)) return null;

    switch (widgetId) {
      case 'perf-summary':
        return (
          <div key={widgetId} className="ministry-banner lg:col-span-3 flex flex-col md:flex-row items-center justify-between shadow-premium transition-all duration-700 hover:scale-[1.005] group">
            <div className="absolute top-0 left-0 w-full h-full bg-accent/5 -translate-y-1/2 translate-x-1/2 blur-[120px] pointer-events-none opacity-40 shrink-0" />
            <div className="flex items-center gap-10 relative z-10 shrink-0">
              <div className="w-24 h-24 bg-white/10 rounded-3xl flex items-center justify-center text-accent border border-white/20 shadow-inner group-hover:rotate-6 transition-transform duration-700">
                <ShieldCheck size={48} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-accent uppercase tracking-[0.4em]">Integrated Ministerial Intelligence</span>
                </div>
                <h3 className="text-4xl font-black text-white tracking-tighter leading-none">نظام مراقبة كفاءة الأطقم التخصصية</h3>
                <p className="text-white/60 text-[14px] font-medium leading-relaxed max-w-lg">
                  يتم تحليل بيانات الأداء لعدد <span className="text-accent font-black">{employees.length}</span> من الكوادر الفنية والإدارية، مع مراقبة حية للامتثال للمعايير الحكومية.
                </p>
              </div>
            </div>
            <div className="flex gap-4 relative z-10 mt-8 md:mt-0">
               <button 
                onClick={() => navigate('/alerts')}
                className="btn-modern btn-accent h-16 px-12 text-[14px] flex items-center gap-3"
               >
                 مركز التنبيهات <AlertTriangle size={18} />
               </button>
               <button 
                onClick={onAddEmployee}
                className="btn-modern bg-white/10 hover:bg-white/20 text-white border border-white/20 h-16 px-10 text-[13px] hidden lg:flex items-center gap-3"
               >
                 إضافة كادر جديد <Plus size={18} />
               </button>
            </div>
          </div>
        );
      case 'stat-staff':
        return (
          <StatCard 
            key={widgetId}
            icon={<Users size={20} />}
            label="إجمالي القوة البشرية"
            value={stats.totalEmployees.toString()}
            trend="موثق بقاعدة البيانات"
            color="bg-primary"
          />
        );
      case 'stat-tech':
        return (
          <StatCard 
            key={widgetId}
            icon={<Cpu size={20} />}
            label="الكوادر الفنية"
            value={stats.technicalStaff.toString()}
            trend={`${((stats.technicalStaff / (stats.totalEmployees || 1)) * 100).toFixed(0)}% من الإجمالي`}
            color="bg-blue-900"
          />
        );
      case 'stat-non-tech':
        return (
          <StatCard 
            key={widgetId}
            icon={<Building2 size={20} />}
            label="الكوادر الإدارية"
            value={stats.nonTechnicalStaff.toString()}
            trend={`${((stats.nonTechnicalStaff / (stats.totalEmployees || 1)) * 100).toFixed(0)}% من الإجمالي`}
            color="bg-slate-800"
          />
        );
      case 'stat-eval-done':
        return (
          <StatCard 
            key={widgetId}
            icon={<CheckCircle2 size={20} />}
            label="تقييمات مكتملة"
            value={stats.completedEvaluations.toString()}
            trend="للدورة الحالية"
            color="bg-emerald-600"
          />
        );
      case 'stat-eval-pending':
        return (
          <StatCard 
            key={widgetId}
            icon={<Calendar size={20} />}
            label="تقييمات قيد الانتظار"
            value={stats.pendingEvaluations.toString()}
            trend="تستحق المراجعة"
            color="bg-amber-600"
          />
        );
      case 'stat-low-alert':
        return (
          <StatCard 
            key={widgetId}
            icon={<AlertTriangle size={20} />}
            label="تنبيهات الأداء المنخفض"
            value={perfAlerts.length.toString()}
            trend="إجراء إداري مطلوب"
            color="bg-red-600"
          />
        );
      case 'performance-alerts':
        return (
          <div key={widgetId} id={widgetId} className="ministry-card overflow-hidden flex flex-col h-full group relative">
             <div className="absolute inset-0 bg-red-500/[0.01] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <div className="p-8 border-b border-border-theme flex justify-between items-center relative z-10">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 shadow-inner border border-red-100">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-primary tracking-tight">رصد المخاطر المهنية</h3>
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] mt-0.5">Critical Performance Risks</p>
                  </div>
               </div>
               <div className="relative">
                 <div className="absolute inset-0 bg-red-500/10 blur-xl rounded-full scale-150 animate-pulse" />
                 <span className="relative bg-red-600 text-white text-[11px] font-black px-4 py-1.5 rounded-full shadow-lg">{perfAlerts.length}</span>
               </div>
            </div>
            <div className="p-8 flex-1 overflow-y-auto custom-scrollbar space-y-5 max-h-[400px] relative z-10 bg-slate-50/20">
               {perfAlerts.length === 0 ? (
                 <div className="py-20 text-center">
                    <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-emerald-100 shadow-inner">
                      <CheckCircle2 size={40} className="text-emerald-500" />
                    </div>
                    <p className="text-[12px] font-black text-text-muted uppercase tracking-[0.3em]">لا توجد مخاطر مرصودة حالياً</p>
                 </div>
               ) : (
                 perfAlerts.map((alert, idx) => (
                   <div 
                    key={idx} 
                    onClick={() => navigate(`/details/${alert.employee.id}`)}
                    className="flex items-center gap-5 p-5 bg-white hover:bg-red-50 transition-all rounded-3xl border border-border-theme cursor-pointer group/item shadow-sm hover:shadow-md"
                   >
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-base font-black text-primary border border-border-theme group-hover/item:bg-red-600 group-hover/item:text-white transition-all">
                         {alert.employee.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="text-[14px] font-black text-primary truncate group-hover/item:text-red-700 transition-colors">{alert.employee.name}</div>
                         <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] font-black text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-100 uppercase">انحراف حاد</span>
                            <span className="text-[11px] font-bold text-text-muted">{alert.avg.toFixed(0)}% → <span className="text-red-500 font-black">{alert.latest.toFixed(0)}%</span></span>
                         </div>
                         <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${alert.latest}%` }}
                              className="h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]" 
                            />
                         </div>
                      </div>
                   </div>
                 ))
               )}
            </div>
          </div>
        );
      case 'main-chart':
        return (
          <div key={widgetId} className="space-y-8 lg:col-span-2">
            <div className="ministry-card p-10 flex flex-col h-full bg-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-primary/[0.02] rounded-full blur-3xl -mr-32 -mt-32" />
              <div className="flex justify-between items-center mb-10 relative z-10">
                <div>
                   <h3 className="text-xl font-black text-primary tracking-tight">تحليل الاتجاه العام للأداء</h3>
                   <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mt-1">Ministerial Performance Trend</p>
                </div>
                <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                  <span className="text-[11px] font-black text-text-muted uppercase pr-2">القطاع:</span>
                  <select 
                    value={chartDepartment}
                    onChange={(e) => setChartDepartment(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-[11px] font-black outline-none cursor-pointer focus:border-primary shadow-sm"
                  >
                    <option value="all">كافة القطاعات</option>
                    {departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex-1 h-[300px] relative z-10">
                {chartData.length > 0 && chartData.some(d => d.score > 0 || d.ministryAvg > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#050a14" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#050a14" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: '700', fill: '#64748b' }} 
                        dy={10}
                      />
                      <YAxis domain={[0, 100]} hide />
                      <Tooltip 
                        contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)', fontSize: '12px', fontWeight: 'bold', direction: 'rtl', padding: '16px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '24px', fontWeight: 'bold' }} />
                      <Area 
                        name={chartDepartment === 'all' ? 'المتوسط الوزاري' : `أداء قطاع ${chartDepartment}`}
                        type="monotone" 
                        dataKey="score" 
                        stroke="#050a14" 
                        fillOpacity={1} 
                        fill="url(#colorScore)" 
                        strokeWidth={4} 
                      />
                      <Line 
                        name="المعيار المرجعي العام"
                        type="monotone" 
                        dataKey="ministryAvg" 
                        stroke="#d4af37" 
                        strokeWidth={3} 
                        strokeDasharray="8 8" 
                        dot={{ r: 4, fill: '#d4af37', strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-text-muted gap-4">
                    <BarChart3 size={48} className="opacity-10" />
                    <p className="text-[12px] font-black uppercase tracking-widest opacity-40">البيانات غير كافية للتحليل الزمني</p>
                  </div>
                )}
              </div>
            </div>

            <div className="ministry-card p-10 flex flex-col h-full bg-white relative overflow-hidden">
              <div className="mb-10 relative z-10">
                 <h3 className="text-xl font-black text-primary tracking-tight">الكفاءة التشغيلية حسب الإدارات</h3>
                 <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mt-1">Departmental Efficiency Comparison</p>
              </div>
              <div className="flex-1 h-[350px] relative z-10">
                {departmentComparisonData.length > 0 ? (
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={departmentComparisonData.slice(0, 8)} layout="vertical" barGap={8}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                        <XAxis type="number" domain={[0, 100]} hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: '700', fill: '#1e293b' }} width={140} />
                        <Tooltip 
                          cursor={{ fill: 'rgba(5, 10, 20, 0.02)' }}
                          contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 'bold' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '20px', fontWeight: 'bold' }} />
                        <Bar 
                           name="مؤشر الإدارة" 
                           dataKey="avg" 
                           fill="#050a14" 
                           radius={[0, 12, 12, 0]} 
                           barSize={16} 
                           onClick={(data) => {
                             if (data && data.name) {
                               setDepartmentFilter(data.name === departmentFilter ? 'all' : data.name);
                             }
                           }}
                         />
                        <Bar name="المعيار الوزاري" dataKey="ministryAvg" fill="#d4af37" radius={[0, 8, 8, 0]} barSize={8} />
                      </BarChart>
                   </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-text-muted gap-4">
                    <History size={48} className="opacity-10" />
                    <p className="text-[12px] font-black uppercase tracking-widest opacity-40">لا توجد بيانات مقارنة</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'ai-advisor':
        return (
          <div key={widgetId} className="ministry-banner p-10 flex flex-col justify-between h-full bg-primary overflow-hidden shadow-premium group">
            <div className="absolute top-0 right-0 w-full h-full bg-accent/10 blur-[80px] -translate-x-1/2 translate-y-1/2 pointer-events-none opacity-30" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center border border-accent/20">
                    <BrainCircuit size={20} className="text-accent animate-pulse" />
                 </div>
                 <h3 className="text-[15px] font-black text-accent uppercase tracking-[0.3em]">
                   Strategic AI Advisor
                 </h3>
              </div>
              <h4 className="text-2xl font-black text-white leading-tight mb-5">مستشار البيانات الذكي</h4>
              <p className="text-[14px] text-white/70 leading-loose mb-8">
                بناءً على أنماط التقييم المرصودة، النظام يتوقع ارتفاعاً بنسبة 12% في الكفاءة التقنية للقطاع الهندسي خلال الربع القادم.
              </p>
              
              <div className="space-y-4 mb-10">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-accent/60">
                   <span>Confidence Level</span>
                   <span>96.8%</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '96.8%' }}
                    className="h-full bg-accent shadow-[0_0_15px_rgba(212,175,55,0.4)]" 
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={async () => {
                setIsGlobalAnalyzing(true);
                const res = await aggregateMinistryAnalysis(evaluations);
                setGlobalAnalysis(res);
                setIsGlobalAnalyzing(false);
              }}
              disabled={isGlobalAnalyzing}
              className="relative z-10 w-full py-5 bg-white text-primary rounded-2xl text-[13px] font-black flex items-center justify-center gap-4 transition-all hover:bg-accent hover:text-primary shadow-xl shadow-black/20 uppercase tracking-widest"
            >
              {isGlobalAnalyzing ? (
                <div className="w-5 h-5 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <>توليد التقارير الاستباقية <ArrowUpRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        );
      case 'fingerprint-sync':
        return (
          <div key={widgetId} className="ministry-card p-10 flex flex-col h-full bg-white relative z-10 group">
            <div className="flex items-center gap-5 mb-8">
               <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-primary border border-border-theme shadow-inner group-hover:bg-primary group-hover:text-white transition-all duration-500">
                  <Fingerprint size={24} />
               </div>
               <div>
                  <h3 className="text-xl font-black text-primary tracking-tight">التكامل البيومتري</h3>
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mt-1">Biometric Cloud Sync</p>
               </div>
            </div>
            <FingerprintIntegration />
          </div>
        );
      case 'employee-table':
        return (
          <div key={widgetId} id="employee-table" className="ministry-card overflow-hidden mt-12 bg-white relative z-10 border-none shadow-premium">
            <div className="p-12 border-b border-border-theme flex flex-col xl:flex-row xl:items-center justify-between gap-10 bg-white/50 backdrop-blur-md">
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    <span className="text-[12px] font-black text-accent uppercase tracking-[0.4em]">Integrated Human Capital Directory</span>
                  </div>
                  <h3 className="text-4xl font-black text-primary tracking-tighter leading-none mb-3">سجل الكادر الوظيفي العام</h3>
                  <p className="text-[15px] font-bold text-text-muted opacity-60">النظام المركزي لمراقبة وتوزيع الموارد البشرية والمهارات التخصصية</p>
                </div>
                <div className="flex flex-wrap gap-6 items-center">
                   <div className="relative group min-w-[350px]">
                      <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" size={22} />
                      <input 
                        type="text" 
                        placeholder="البحث بالاسم، الرقم الوظيفي، أو الكود..." 
                        className="ministry-input pr-16"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                   </div>
                   <button 
                     onClick={handleExportEmployeesCSV}
                     className="px-10 h-16 bg-white border border-border-theme rounded-2xl text-[13px] font-black hover:bg-slate-50 transition-all flex items-center gap-4 shadow-sm hover:shadow-md group"
                   >
                     <FileDown size={22} className="text-accent group-hover:-translate-y-1 transition-transform" /> تصدير السجلات المعتمدة
                   </button>
                </div>
            </div>

            <div className="p-10 bg-slate-50/50 border-b border-border-theme flex flex-wrap items-center gap-12">
               <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-accent shadow-premium">
                    <Filter size={20} />
                  </div>
                  <span className="text-[14px] font-black text-primary uppercase tracking-[0.1em]">أدوات التصفية المتقدمة:</span>
               </div>
               
               <div className="flex items-center gap-12 flex-1">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest opacity-50 block mr-2">إدارة القسم</label>
                    <select 
                      className="bg-white border border-border-theme px-8 py-4 rounded-xl text-[13px] font-bold outline-none cursor-pointer focus:border-primary hover:border-accent transition-colors shadow-sm"
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                    >
                      <option value="all">كافة الإدارات الوزارية</option>
                      {departments.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest opacity-50 block mr-2">التصنيف الفني</label>
                    <select 
                      className="bg-white border border-border-theme px-8 py-4 rounded-xl text-[13px] font-bold outline-none cursor-pointer focus:border-primary hover:border-accent transition-colors shadow-sm"
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value as any)}
                    >
                      <option value="all">كامل التصنيفات</option>
                      <option value="technical">كادر فني متخصص</option>
                      <option value="non-technical">كادر إداري ومعاون</option>
                    </select>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest opacity-50 block mr-2">الفئة الوظيفية</label>
                    <select 
                      className="bg-white border border-border-theme px-8 py-4 rounded-xl text-[13px] font-bold outline-none cursor-pointer focus:border-primary hover:border-accent transition-colors shadow-sm"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value as any)}
                    >
                      <option value="all">كافة الفئات</option>
                      <option value="internal">موظف دائم</option>
                      <option value="consultant">مستشار خبير</option>
                      <option value="contractor">نظام العقود</option>
                    </select>
                 </div>
               </div>
            </div>

            <div className="overflow-x-auto min-h-[500px]">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b-2 border-slate-100">
                    <th className="px-12 py-8 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">الاسم والمنصب التخصصي</th>
                    <th className="px-12 py-8 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('employeeId')}>الرقم المرجعي {getSortIcon('employeeId')}</th>
                    <th className="px-12 py-8 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">التنظيم الإداري</th>
                    <th className="px-12 py-8 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">تتبع مؤشر الكفاءة</th>
                    <th className="px-12 py-8 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">تزامن Cloud-Sync</th>
                    <th className="px-12 py-8 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white/40">
                  <AnimatePresence mode="popLayout">
                    {paginatedEmployees.length > 0 ? (
                      paginatedEmployees.map((emp, idx) => {
                        const score = getLatestScore(emp.id!);
                        return (
                          <motion.tr 
                            key={emp.id} 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: idx * 0.03, ease: "circOut" }}
                            className="group hover:bg-slate-50 transition-all cursor-default"
                          >
                             <td className="px-12 py-8">
                                <div className="flex items-center gap-8">
                                   <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black border transition-all shadow-sm ${
                                      emp.type === 'technical' ? 'bg-primary/5 border-primary/10 text-primary' : 'bg-slate-50 border-slate-100 text-slate-500'
                                   } group-hover:scale-105 group-hover:shadow-md`}>
                                      {emp.name[0]}
                                   </div>
                                   <div>
                                      <div className="text-[15px] font-black text-primary group-hover:translate-x-1 transition-transform">{emp.name}</div>
                                      <div className="flex items-center gap-2 mt-1.5">
                                         <div className={`w-1.5 h-1.5 rounded-full ${emp.type === 'technical' ? 'bg-blue-500' : 'bg-slate-400'}`} />
                                         <span className="text-[11px] font-bold text-text-muted opacity-60 uppercase">{emp.position}</span>
                                      </div>
                                   </div>
                                </div>
                             </td>
                             <td className="px-12 py-10">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                      <Hash size={14} />
                                   </div>
                                   <span className="font-mono text-[13px] font-black text-slate-500 select-all tracking-wider">{emp.employeeId}</span>
                                </div>
                             </td>
                             <td className="px-12 py-10">
                                <div className="space-y-2">
                                   <div className="text-[13px] font-black text-primary hover:text-accent transition-colors cursor-pointer flex items-center gap-2">
                                      <Building2 size={14} className="opacity-40" />
                                      {emp.department}
                                   </div>
                                   {emp.secondDepartment && (
                                      <div className="flex items-center gap-2">
                                         <div className="h-4 w-[2px] bg-emerald-500/30 mr-1" />
                                         <div className="text-[10px] font-black text-emerald-600/70 uppercase tracking-tight">{emp.secondDepartment}</div>
                                      </div>
                                   )}
                                </div>
                             </td>
                             <td className="px-12 py-10">
                                {score !== null ? (
                                   <div className="flex items-center gap-5">
                                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-[12px] font-black border transition-colors ${
                                         score >= 90 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                         score >= 75 ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                         score >= 50 ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                         'bg-red-50 text-red-600 border-red-100'
                                      }`}>
                                         %{score.toFixed(0)}
                                      </div>
                                      <div className="flex-1 min-w-[80px]">
                                         <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                            <motion.div 
                                              initial={{ width: 0 }}
                                              animate={{ width: `${score}%` }}
                                              className={`h-full ${getScoreBg(score)}`} 
                                            />
                                         </div>
                                         <div className="flex justify-between items-center mt-2">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{score >= 90 ? 'Superior' : score >= 75 ? 'Standard' : 'Risk'}</span>
                                            {perfAlerts.some(a => a.employee.id === emp.id) && (
                                               <AlertTriangle size={10} className="text-red-500 animate-pulse" />
                                            )}
                                         </div>
                                      </div>
                                   </div>
                                ) : (
                                   <div className="flex items-center gap-3 text-slate-300">
                                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center">
                                         <Calendar size={16} />
                                      </div>
                                      <span className="text-[11px] font-bold italic opacity-60">بإنتظار الجدولة</span>
                                   </div>
                                )}
                             </td>
                             <td className="px-12 py-10">
                                <div className={`inline-flex items-center gap-3 px-5 py-2.5 rounded-xl border transition-all ${
                                   emp.biometricStatus === 'online' ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10' : 'bg-red-500/5 text-red-600 border-red-500/10'
                                }`}>
                                   <div className={`w-2 h-2 rounded-full ${emp.biometricStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                                   <span className="text-[11px] font-black uppercase tracking-tighter">{emp.biometricStatus === 'online' ? 'Synced' : 'Offline'}</span>
                                 </div>
                             </td>
                             <td className="px-12 py-10">
                                <div className="flex items-center justify-center gap-3">
                                   <button 
                                     onClick={() => navigate(`/details/${emp.id}`)}
                                     className="w-10 h-10 flex items-center justify-center bg-white text-primary border border-slate-200 hover:bg-primary hover:text-white hover:border-primary rounded-xl transition-all shadow-sm hover:shadow-lg"
                                     title="تحليل الملف الكامل"
                                   >
                                     <Eye size={16} />
                                   </button>
                                   <button 
                                     onClick={() => onEditEmployee(emp)}
                                     className="w-10 h-10 flex items-center justify-center bg-white text-slate-500 border border-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 rounded-xl transition-all shadow-sm hover:shadow-lg"
                                     title="تعديل البيانات"
                                   >
                                     <FileEdit size={16} />
                                   </button>
                                   <button 
                                     onClick={() => onEvaluateUser(emp)}
                                     className="h-10 px-6 bg-accent text-primary text-[11px] font-black rounded-xl hover:bg-white border border-transparent hover:border-accent transition-all shadow-lg shadow-accent/10 whitespace-nowrap"
                                   >
                                     بدء تقييم
                                   </button>
                                </div>
                             </td>
                          </motion.tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-32 text-center">
                           <motion.div 
                             initial={{ opacity: 0, scale: 0.9 }}
                             animate={{ opacity: 1, scale: 1 }}
                             className="flex flex-col items-center justify-center gap-6"
                           >
                              <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200 border border-dashed border-slate-200">
                                 <Search size={40} />
                              </div>
                              <div className="space-y-2">
                                 <h4 className="text-xl font-black text-primary">لا توجد نتائج مطابقة</h4>
                                 <p className="text-[12px] font-bold text-text-muted opacity-60">يرجى التحقق من معايير البحث أو اختيار قطاع آخر</p>
                              </div>
                              <button 
                                onClick={() => {
                                  setSearchTerm('');
                                  setSelectedType('all');
                                  setSelectedCategory('all');
                                  setDepartmentFilter('all');
                                }}
                                className="mt-4 px-8 py-3 bg-white border border-slate-200 rounded-xl text-[11px] font-black text-primary hover:bg-slate-50 transition-all flex items-center gap-3"
                              >
                                 <RefreshCw size={14} /> إعادة ضبط الفلاتر
                              </button>
                           </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            <div className="p-12 border-t border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-10">
                <div className="flex items-center gap-8">
                   <div className="text-[13px] font-black text-text-muted uppercase tracking-[0.4em] opacity-40">Human Capital Registry:</div>
                   <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border border-border-theme shadow-sm">
                      <div className="flex -space-x-4 space-x-reverse">
                         {employees.slice(0, 5).map((e, i) => (
                           <div key={i} className="w-10 h-10 rounded-full bg-slate-100 border-4 border-white flex items-center justify-center text-[10px] font-black text-primary">
                             {e.name[0]}
                           </div>
                         ))}
                      </div>
                      <span className="text-[12px] font-black text-primary">+{employees.length - 5} كوادر مرصودة</span>
                   </div>
                </div>

                <div className="flex items-center gap-6">
                   <button 
                     disabled={currentPage === 1}
                     onClick={() => setCurrentPage(prev => prev - 1)}
                     className="w-16 h-16 bg-white border border-border-theme rounded-2xl flex items-center justify-center hover:bg-primary hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-premium active:scale-95 group"
                   >
                     <ChevronRight size={28} className="group-hover:-translate-x-1 transition-transform" />
                   </button>
                   <div className="flex gap-4 bg-white/40 p-3 rounded-[3rem] border border-white/50 backdrop-blur-md shadow-inner">
                      {[...Array(totalPages)].map((_, i) => (
                         <button 
                           key={i}
                           onClick={() => setCurrentPage(i + 1)}
                           className={`w-14 h-14 rounded-2xl text-[14px] font-black transition-all ${
                             currentPage === i + 1 ? 'bg-primary text-white shadow-premium scale-110' : 'bg-white border border-slate-100 text-text-muted hover:bg-slate-50 shadow-sm'
                           }`}
                         >
                           {i + 1}
                         </button>
                      ))}
                   </div>
                   <button 
                     disabled={currentPage === totalPages}
                     onClick={() => setCurrentPage(prev => prev + 1)}
                     className="w-16 h-16 bg-white border border-border-theme rounded-2xl flex items-center justify-center hover:bg-primary hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-premium active:scale-95 group"
                   >
                     <ChevronLeft size={28} className="group-hover:translate-x-1 transition-transform" />
                   </button>
                </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-12 pb-16 px-4 md:px-8 max-w-[1600px] mx-auto">
      {/* Premium Dashboard Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-10 border-b-2 border-slate-100 relative">
        <div className="absolute -bottom-0.5 right-0 w-48 h-1 bg-accent rounded-full" />
        <div className="space-y-4">
           <div className="flex items-center gap-3">
             <div className="px-3 py-1 bg-primary text-accent text-[9px] font-black uppercase tracking-[0.2em] rounded-md">Ministry Executive Suite</div>
             <div className="h-px w-12 bg-slate-200" />
           </div>
           <h2 className="text-5xl font-black text-primary tracking-tighter leading-tight">لوحة التحكم الكاملة</h2>
           <p className="text-text-muted text-sm font-bold tracking-wide flex items-center gap-3">
             <span className="relative flex h-3 w-3">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
             </span>
             نظرة عامة على مؤشرات الأداء الاستراتيجي وتنبيهات الكادر الحية
           </p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowSettings(true)}
            className="group flex items-center gap-3 px-6 py-4 bg-white border border-border-theme rounded-2xl text-[11px] font-black text-text-muted hover:text-primary hover:border-primary transition-all shadow-sm hover:shadow-md"
          >
            <Settings size={18} className="group-hover:rotate-90 transition-transform duration-500" /> تخصيص العرض
          </button>
          <button 
            onClick={onAddEmployee}
            className="btn-modern btn-primary flex items-center gap-3 px-10 py-4 shadow-2xl shadow-primary/30 hover:-translate-y-1"
          >
            <Plus size={22} className="text-accent" /> تسجيل كادر جديد
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-end">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowSettings(false)}
               className="absolute inset-0 bg-black/40 backdrop-blur-sm"
             />
             <motion.div 
               initial={{ x: '100%' }}
               animate={{ x: 0 }}
               exit={{ x: '100%' }}
               className="relative w-full max-w-sm h-full bg-white shadow-2xl flex flex-col"
             >
                <div className="p-6 border-b border-border-theme flex justify-between items-center bg-slate-50">
                   <div>
                      <h3 className="text-sm font-black text-text-dark">تخصيص اللوحة</h3>
                      <p className="text-[10px] text-text-muted font-bold">رتب العناصر أو تحكم في ظهورها</p>
                   </div>
                   <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                      <X size={20} />
                   </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                   <DragDropContext onDragEnd={onDragEnd}>
                      <Droppable droppableId="widgets">
                         {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                               {settings.widgetOrder.map((widgetId, index) => {
                                  const info = WIDGETS_INFO[widgetId as keyof typeof WIDGETS_INFO];
                                  const isVisible = settings.visibleWidgets.includes(widgetId);
                                  return (
                                    <Draggable key={widgetId} draggableId={widgetId} index={index}>
                                      {(provided) => (
                                        <div 
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                                            isVisible ? 'border-primary/10 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'
                                          }`}
                                        >
                                          <div {...provided.dragHandleProps} className="text-slate-300">
                                             <GripVertical size={16} />
                                          </div>
                                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isVisible ? 'bg-primary/5 text-primary' : 'bg-slate-200 text-slate-400'}`}>
                                             {info.icon}
                                          </div>
                                          <span className="flex-1 text-xs font-black">{info.label}</span>
                                          <button 
                                            onClick={() => toggleWidget(widgetId)}
                                            className={`p-2 rounded-lg transition-colors ${
                                              isVisible ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-200'
                                            }`}
                                          >
                                            {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                                          </button>
                                        </div>
                                      )}
                                    </Draggable>
                                  );
                               })}
                               {provided.placeholder}
                            </div>
                         )}
                      </Droppable>
                   </DragDropContext>
                </div>

                <div className="p-6 bg-slate-50 border-t border-border-theme">
                   <button 
                     onClick={() => handleUpdateSettings(DEFAULT_SETTINGS)}
                     className="w-full py-3 bg-white border border-border-theme rounded-xl text-xs font-black text-text-muted hover:text-red-500 transition-all shadow-sm"
                   >
                     إعادة الضبط الافتراضي
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Executive KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 relative">
        <StatCard 
          icon={<Users className="w-6 h-6" />}
          label="إجمالي القوة البشرية"
          value={employees.length.toString()}
          trend="الكادر الكلي"
          color="bg-[#1e293b]"
        />
        <StatCard 
          icon={<Cpu className="w-6 h-6" />}
          label="الكادر الفني"
          value={employees.filter(e => e.type === 'technical').length.toString()}
          trend="متخصص"
          color="bg-blue-600"
        />
        <StatCard 
          icon={<Users className="w-6 h-6" />}
          label="الكادر الإداري"
          value={employees.filter(e => e.type === 'non-technical').length.toString()}
          trend="إداري ومعاون"
          color="bg-slate-500"
        />
        <StatCard 
          icon={<CheckCircle2 className="w-6 h-6" />}
          label="تقييمات هـذا الشهر"
          value={evaluations.filter(e => {
            const now = new Date();
            return (e.month || (new Date(e.date).getMonth() + 1)) === (now.getMonth() + 1) && e.year === now.getFullYear();
          }).length.toString()}
          trend="منجزة"
          color="bg-emerald-600"
        />
        <StatCard 
          icon={<RefreshCw className="w-6 h-6" />}
          label="تقييمات متبقية"
          value={Math.max(0, employees.length - evaluations.filter(e => {
            const now = new Date();
            return (e.month || (new Date(e.date).getMonth() + 1)) === (now.getMonth() + 1) && e.year === now.getFullYear();
          }).length).toString()}
          trend="قيد الإنجاز"
          color="bg-amber-600"
        />
        <StatCard 
          icon={<AlertTriangle className="w-6 h-6" />}
          label="تنبيهات الأداء"
          value={perfAlerts.length.toString()}
          trend="تتطلب تدخلاً"
          color="bg-red-600"
        />
      </div>

      {/* Real-time System Overview Pulse */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 px-2">
        <div className="lg:col-span-3 flex items-center gap-6 p-6 bg-slate-50/50 rounded-[2rem] border border-slate-200/50 backdrop-blur-sm">
          <div className="flex -space-x-3 overflow-hidden">
            {employees.slice(0, 5).map((emp, i) => (
              <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-[10px] font-black text-primary border border-slate-100">
                {emp.name[0]}
              </div>
            ))}
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-accent text-[9px] font-black text-primary ring-2 ring-white">+{employees.length - 5}</div>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="flex-1">
            <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">حالة القوة البشرية</h4>
            <p className="text-[12px] font-bold text-text-muted">نظام رصد النشاط البيومتري متصل بـ {employees.length} موظفاً بنجاح</p>
          </div>
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black text-text-dark uppercase tracking-tighter">System Health: Optimal</span>
          </div>
        </div>
        <div className="bg-primary p-6 rounded-[2rem] flex items-center justify-between shadow-xl shadow-primary/10">
          <div>
            <h4 className="text-[9px] font-black text-accent uppercase tracking-widest mb-1">دقة المزامنة</h4>
            <div className="text-2xl font-black text-white">99.2%</div>
          </div>
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-accent">
            <RefreshCw size={20} />
          </div>
        </div>
      </div>

      {/* Dynamic Widgets Area */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="dashboard-widgets" direction="vertical">
          {(provided) => (
            <div 
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {settings.widgetOrder.map((widgetId, index) => {
                // Skip stat cards as they are now in the header KPI grid
                if (widgetId.startsWith('stat-')) return null;
                
                const widget = renderWidget(widgetId);
                if (!widget) return null;

                return (
                  <Draggable key={widgetId} draggableId={widgetId} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`${widgetId === 'perf-summary' || widgetId === 'main-chart' || widgetId === 'employee-table' ? 'lg:col-span-3' : 'lg:col-span-1'} ${snapshot.isDragging ? 'z-50 opacity-80' : ''}`}
                      >
                        <div className="relative group/widget">
                          <div {...provided.dragHandleProps} className="absolute top-4 left-4 z-20 p-2 opacity-0 group-hover/widget:opacity-100 transition-opacity cursor-grab active:cursor-grabbing bg-white/20 backdrop-blur rounded-lg border border-white/20 text-white">
                            <GripVertical size={14} />
                          </div>
                          {widget}
                        </div>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <AnimatePresence>
        {globalAnalysis && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-primary/40 backdrop-blur-md flex items-center justify-center p-4 md:p-8 z-[200]"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="card-modern w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-premium border-white/40"
            >
              <div className="bg-primary p-10 text-white relative flex justify-between items-center overflow-hidden">
                <div className="absolute inset-0 bg-accent/5 skew-x-[-20deg] origin-top translate-x-24 opacity-50" />
                <div className="relative z-10">
                   <div className="flex items-center gap-3 mb-2">
                      <Sparkles className="text-accent animate-pulse" size={18} />
                      <span className="text-[10px] font-black text-accent uppercase tracking-[0.3em]">AI Strategic Intelligence</span>
                   </div>
                   <h3 className="text-3xl font-black tracking-tighter">
                      التحليل المعمق للموارد البشرية
                   </h3>
                </div>
                <button 
                  onClick={() => setGlobalAnalysis(null)} 
                  className="relative z-10 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all border border-white/20 group"
                >
                  <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                </button>
              </div>

              <div className="p-12 overflow-y-auto custom-scrollbar flex-1 bg-white/50 backdrop-blur-sm">
                <div className="ai-markdown-container text-right leading-loose" dir="rtl">
                  <div className="p-8 bg-white/80 rounded-[2.5rem] border border-border-theme shadow-inner shadow-primary/5">
                    <div dangerouslySetInnerHTML={{ __html: globalAnalysis.replace(/\n/g, '<br/>') }} />
                  </div>
                </div>
                
                <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                         <Trophy size={20} />
                      </div>
                      <div>
                         <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Key Strength</div>
                         <div className="text-[13px] font-black text-primary">تميز الأداء الفني</div>
                      </div>
                   </div>
                   <div className="p-6 bg-blue-500/5 rounded-3xl border border-blue-500/10 flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                         <Target size={20} />
                      </div>
                      <div>
                         <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">Strategic Goal</div>
                         <div className="text-[13px] font-black text-primary">رفع جودة التقارير</div>
                      </div>
                   </div>
                   <div className="p-6 bg-amber-500/5 rounded-3xl border border-amber-500/10 flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                         <Zap size={20} />
                      </div>
                      <div>
                         <div className="text-[10px] font-black text-amber-600 uppercase tracking-widest leading-none mb-1">AI Suggestion</div>
                         <div className="text-[13px] font-black text-primary">تكثيف دورات SAP</div>
                      </div>
                   </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-border-theme flex justify-end">
                 <button 
                   onClick={() => setGlobalAnalysis(null)}
                   className="btn-modern btn-primary h-12 px-10 flex items-center justify-center"
                 >
                   فهمت، شكراً
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExport && (
          <ExportEvaluations onClose={() => setShowExport(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHistoryEmployee && (
          <EvaluationHistory 
            employee={showHistoryEmployee} 
            onClose={() => setShowHistoryEmployee(null)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {employeeToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEmployeeToDelete(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl border border-border-theme w-full max-w-md overflow-hidden relative z-10"
            >
              <div className="p-8 text-center text-right" dir="rtl">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                  <Trash2 size={40} />
                </div>
                <h3 className="text-xl font-black text-text-dark mb-4">تأكيد حذف الموظف</h3>
                <p className="text-text-muted text-sm font-bold leading-relaxed mb-8">
                  هل أنت متأكد من رغبتك في حذف الموظف <span className="text-red-600">"{employeeToDelete.name}"</span>؟ 
                  <br /> <span className="text-[11px] opacity-70 mt-2 block italic">"This action cannot be undone. All associated evaluations will be permanently removed."</span>
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setEmployeeToDelete(null)}
                    className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-text-muted font-black text-xs uppercase tracking-widest rounded-xl transition-all"
                  >
                    إلغاء (Cancel)
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="py-3 px-6 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-red-200"
                  >
                    تأكيد الحذف (Confirm)
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon, label, value, trend, color }: { icon: any, label: string, value: string, trend: string, color: string }) {
  return (
    <motion.div 
      whileHover={{ y: -10, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className="ministry-card p-10 flex flex-col justify-between min-h-[260px] group relative overflow-hidden bg-white"
    >
      {/* Dynamic Background Elements */}
      <div className={`absolute top-0 right-0 w-48 h-48 ${color}/5 rounded-full blur-[60px] -translate-y-24 translate-x-12 pointer-events-none group-hover:scale-150 transition-transform duration-1000`} />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl translate-y-16 -translate-x-16 pointer-events-none" />
      
      {/* Icon & Status Pill */}
      <div className="flex justify-between items-start relative z-10 mb-8">
        <div className={`w-16 h-16 ${color} rounded-2xl flex items-center justify-center text-white shadow-premium group-hover:rotate-6 transition-all duration-500`}>
          {React.cloneElement(icon as React.ReactElement<any>, { size: 32 })}
        </div>
        <div className="flex items-center gap-3 bg-slate-50/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
           <div className={`w-2 h-2 rounded-full ${color} animate-pulse`} />
           <span className="text-[10px] font-black text-primary uppercase tracking-[0.1em]">سيادي</span>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-end">
        <div className="text-[11px] font-black text-text-muted uppercase tracking-[0.3em] mb-3 opacity-60 group-hover:opacity-100 transition-opacity">
          {label}
        </div>
        <div className="flex items-baseline gap-4">
          <div className="text-5xl font-black text-primary tracking-tighter group-hover:text-accent transition-colors duration-500">
            {value}
          </div>
          {trend && (
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-accent uppercase tracking-widest leading-none mb-1">Status</span>
              <span className="text-[11px] font-extrabold text-text-muted italic opacity-50 whitespace-nowrap">
                {trend}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Decorative Bottom Bar */}
      <div className="absolute bottom-0 right-0 left-0 h-2 bg-slate-100/30">
        <div className={`h-full ${color} w-1/4 group-hover:w-full transition-all duration-700 ease-in-out`} />
      </div>

      {/* Hover Reveal Pattern */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none rotate-12">
         <Building2 size={80} />
      </div>
    </motion.div>
  );
}

function getScoreBg(score: number): string {
  if (score >= 90) return 'bg-emerald-500';
  if (score >= 80) return 'bg-blue-500';
  if (score >= 70) return 'bg-amber-500';
  return 'bg-red-500';
}

function FingerprintIntegration() {
  const [status, setStatus] = useState<'disconnected' | 'connected' | 'syncing'>('disconnected');
  const [deviceIp, setDeviceIp] = useState('192.168.1.201');
  const [devicePort, setDevicePort] = useState('4370');
  const [lastSync, setLastSync] = useState<string | null>(null);

  const handleConnect = async () => {
    setStatus('syncing');
    try {
      // Simulate fetching and updating employees from a device
      const allEmployees = await db.employees.toArray();
      let updatedCount = 0;
      
      for (const emp of allEmployees) {
        if (emp.id && emp.biometricId) {
          const randomStatus = Math.random() > 0.15 ? 'online' : 'offline';
          await db.employees.update(emp.id, {
            biometricStatus: randomStatus,
            lastBiometricSync: new Date().toISOString()
          });
          updatedCount++;
        }
      }

      setTimeout(() => {
        setStatus('connected');
        setLastSync(new Date().toLocaleString('ar-YE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }, 2500);
    } catch (err) {
      console.error('Biometric sync failed:', err);
      setStatus('disconnected');
    }
  };

  const handleImportSheet = async () => {
    setStatus('syncing');
    try {
      const allEmployees = await db.employees.toArray();
      for (const emp of allEmployees) {
        if (emp.id && emp.biometricId) {
          await db.employees.update(emp.id, {
            biometricStatus: 'online',
            lastBiometricSync: new Date().toISOString()
          });
        }
      }

      setTimeout(() => {
        setStatus('connected');
        setLastSync(new Date().toLocaleString('ar-YE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        alert('تم استيراد كشف التحضير بنجاح وتوزيع البيانات على الكادر المسجل في النظام.');
      }, 2000);
    } catch (err) {
      console.error('Sheet import failed:', err);
      setStatus('disconnected');
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-full grow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl transition-colors ${status === 'connected' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
            {status === 'connected' ? <Wifi size={24} /> : <WifiOff size={24} />}
          </div>
          <div>
            <p className="text-[10px] font-black text-text-dark uppercase tracking-widest">حالة الجهاز</p>
            <p className={`text-[11px] font-bold ${status === 'connected' ? 'text-emerald-600' : 'text-slate-500'}`}>
              {status === 'connected' ? 'متصل (Online)' : status === 'syncing' ? 'جاري الفحص...' : 'غير متصل'}
            </p>
          </div>
        </div>
        {status === 'connected' && (
          <div className="text-left">
            <p className="text-[9px] font-black text-text-muted uppercase tracking-tighter text-left">آخر مزامنة</p>
            <p className="text-[10px] font-bold text-primary">{lastSync}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-text-muted uppercase tracking-wider pr-1">IP Address</label>
          <input 
            type="text" 
            value={deviceIp}
            onChange={(e) => setDeviceIp(e.target.value)}
            className="w-full bg-slate-50 border border-border-theme rounded-xl p-2 text-xs font-bold outline-none focus:border-primary transition-all"
            placeholder="192.168.1.201"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-text-muted uppercase tracking-wider pr-1">Port</label>
          <input 
            type="text" 
            value={devicePort}
            onChange={(e) => setDevicePort(e.target.value)}
            className="w-full bg-slate-50 border border-border-theme rounded-xl p-2 text-xs font-bold outline-none focus:border-primary transition-all"
            placeholder="4370"
          />
        </div>
      </div>

      <div className="bg-slate-50 rounded-2xl p-4 border border-border-theme flex items-center gap-4">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary border border-border-theme shadow-sm">
          <Cpu size={20} />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-black text-text-dark uppercase mb-0.5">ZKTeco Protocol v2.0</p>
          <p className="text-[9px] text-text-muted font-bold leading-tight">يدعم سحب سجلات الحضور المباشر عبر بروتوكول TCP/IP</p>
        </div>
      </div>

      <div className="mt-auto pt-4 pb-2 flex flex-col gap-3">
        <button 
          onClick={handleConnect}
          disabled={status === 'syncing'}
          className={`w-full py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 ${
            status === 'connected' 
            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' 
            : 'bg-primary text-white shadow-lg shadow-primary/20 hover:shadow-primary/30'
          }`}
        >
          {status === 'syncing' ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Fingerprint size={16} />
          )}
          {status === 'connected' ? 'مزامنة السجلات الآن' : status === 'syncing' ? 'جاري إنشاء الاتصال...' : 'ربط جهاز البصمة'}
        </button>

        <button 
          onClick={handleImportSheet}
          disabled={status === 'syncing'}
          className="w-full py-3.5 bg-white border-2 border-primary/20 text-primary hover:bg-primary/5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
        >
          <FileUp size={16} />
          استيراد كشف التحضير اليومي (Manual Upload)
        </button>
        
        {status === 'connected' && (
          <div className="flex flex-col items-center gap-2 mt-2">
             <p className="text-[9px] text-emerald-600 font-black text-center animate-pulse uppercase tracking-widest">
              ● تم استيراد 12 حركة حضور جديدة
            </p>
            <div className="flex items-center gap-1 text-emerald-600">
               <CheckCircle2 size={12} />
               <span className="text-[8px] font-bold">تم توزيع البيانات بنجاح</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
