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
  ShieldCheck
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
  'stat-staff': { label: 'إجمالي الكادر', icon: <Users size={16} /> },
  'stat-evals': { label: 'تقييمات الشهر', icon: <BarChart3 size={16} /> },
  'stat-avg': { label: 'متوسط الأداء', icon: <Award size={16} /> },
  'stat-top': { label: 'المتميزين', icon: <TrendingUp size={16} /> },
  'stat-alerts': { label: 'تنبيهات الأداء', icon: <AlertTriangle size={16} /> },
  'performance-alerts': { label: 'تنبيهات الأداء الحارجة', icon: <AlertTriangle size={16} /> },
  'main-chart': { label: 'مخطط الأداء', icon: <BarChart3 size={16} /> },
  'employee-table': { label: 'جدول الموظفين', icon: <ListChecks size={16} /> },
  'ai-advisor': { label: 'المحلل الذكي', icon: <Award size={16} /> },
  'fingerprint-sync': { label: 'ربط أجهزة البصمة', icon: <Fingerprint size={16} /> }
};

const DEFAULT_SETTINGS: DashboardSettings = {
  visibleWidgets: ['perf-summary', 'stat-staff', 'stat-evals', 'stat-avg', 'stat-top', 'stat-alerts', 'performance-alerts', 'main-chart', 'employee-table', 'ai-advisor', 'fingerprint-sync'],
  widgetOrder: ['perf-summary', 'stat-staff', 'stat-evals', 'stat-avg', 'stat-top', 'stat-alerts', 'performance-alerts', 'main-chart', 'employee-table', 'ai-advisor', 'fingerprint-sync']
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
          <div key={widgetId} className="bg-primary/95 backdrop-blur-3xl rounded-[3rem] p-10 flex flex-col md:flex-row items-center justify-between shadow-[0_30px_60px_-15px_rgba(5,10,20,0.4)] lg:col-span-2 relative overflow-hidden group border border-white/10 transition-all duration-700 hover:scale-[1.01]">
            <div className="absolute top-0 left-0 w-full h-full bg-accent/10 -translate-y-1/2 translate-x-1/2 blur-[100px] pointer-events-none opacity-40 shrink-0" />
            <div className="flex items-center gap-10 relative z-10 shrink-0">
              <div className="w-28 h-28 bg-white/5 rounded-[2rem] flex items-center justify-center text-accent border border-white/10 shadow-[inner_0_0_20px_rgba(255,255,255,0.05)] group-hover:rotate-12 transition-transform duration-700 relative">
                <div className="absolute inset-0 bg-accent/20 rounded-[2rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <AlertTriangle size={56} className="relative z-10" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-accent uppercase tracking-[0.3em]">System Intelligence</span>
                </div>
                <h3 className="text-3xl font-black text-white tracking-tighter leading-none">مركز تنبيهات الأنظمة</h3>
                <p className="text-white/50 text-[15px] font-medium leading-relaxed max-w-sm">
                  تم رصد <span className="text-white font-bold underline decoration-accent/40 underline-offset-8">{perfAlerts.length}</span> انحرافات حادة في مستوى الأداء مقارنة بالسلاسل الزمنية المعتمدة للوزارة.
                </p>
              </div>
            </div>
            <button 
              onClick={() => {
                const alertsWidget = document.getElementById('performance-alerts');
                if (alertsWidget) alertsWidget.scrollIntoView({ behavior: 'smooth' });
              }}
              className="mt-8 md:mt-0 px-12 py-6 bg-accent text-primary rounded-2xl text-[13px] font-black shadow-[0_20px_40px_rgba(212,175,55,0.3)] hover:scale-105 transition-all uppercase tracking-[0.2em] active:scale-95 border border-white/20 hover:bg-white hover:text-primary"
            >
              مراجعة التنبيهات (Action Required)
            </button>
          </div>
        );
      case 'stat-staff':
        return (
          <StatCard 
            key={widgetId}
            icon={<Users className="w-6 h-6" />}
            label="إجمالي الكادر"
            value={employees.length.toString()}
            trend="+2 موظفين"
            color="bg-blue-500"
          />
        );
      case 'stat-evals':
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        const thisMonthCount = evaluations.filter(e => e.month === currentMonth && e.year === currentYear).length;
        
        return (
          <StatCard 
            key={widgetId}
            icon={<BarChart3 className="w-6 h-6" />}
            label="تقييمات الشهر الحالي"
            value={thisMonthCount.toString()}
            trend="تحديث تلقائي"
            color="bg-emerald-500"
          />
        );
      case 'stat-avg':
        return (
          <StatCard 
            key={widgetId}
            icon={<Award className="w-6 h-6" />}
            label="متوسط الأداء الوزاري"
            value={`${(evaluations.reduce((acc, c) => acc + c.totalScore, 0) / (evaluations.length || 1)).toFixed(1)}%`}
            trend="مستقر"
            color="bg-amber-500"
          />
        );
      case 'stat-top':
        return (
          <StatCard 
            key={widgetId}
            icon={<TrendingUp className="w-6 h-6" />}
            label="المتميزين"
            value={evaluations.filter(e => e.totalScore >= 90).length.toString()}
            trend="نخبة الكادر"
            color="bg-violet-500"
          />
        );
      case 'stat-alerts':
        return (
          <StatCard 
            key={widgetId}
            icon={<AlertTriangle className="w-6 h-6" />}
            label="تنبيهات هبوط الأداء"
            value={perfAlerts.length.toString()}
            trend="تتطلب متابعة"
            color="bg-red-500"
          />
        );
      case 'performance-alerts':
        return (
          <div key={widgetId} className="card-modern overflow-hidden flex flex-col h-full group relative glossy-mesh">
             <div className="absolute inset-0 bg-red-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <div className="p-8 border-b border-border-theme flex justify-between items-center relative z-10">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-600 shadow-inner">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-primary tracking-tight">تنبيهات حرجة</h3>
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] mt-0.5">Urgent Performance Risks</p>
                  </div>
               </div>
               <div className="relative">
                 <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full scale-150 animate-pulse" />
                 <span className="relative bg-red-600 text-white text-[11px] font-black px-4 py-1.5 rounded-full shadow-2xl shadow-red-200">{perfAlerts.length}</span>
               </div>
            </div>
            <div className="p-8 flex-1 overflow-y-auto custom-scrollbar space-y-5 max-h-[400px] relative z-10">
               {perfAlerts.length === 0 ? (
                 <div className="py-20 text-center">
                    <div className="w-20 h-20 bg-slate-50/50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-inner">
                      <CheckCircle2 size={40} className="text-emerald-300" />
                    </div>
                    <p className="text-[12px] font-black text-text-muted uppercase tracking-[0.3em]">وضع النظام: آمن</p>
                 </div>
               ) : (
                 perfAlerts.map((alert, idx) => (
                   <div 
                    key={idx} 
                    onClick={() => navigate(`/details/${alert.employee.id}`)}
                    className="flex items-center gap-5 p-5 bg-white/60 backdrop-blur-md hover:bg-red-50/[0.4] rounded-[2rem] border border-border-theme cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg group/item"
                   >
                      <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-base font-black text-primary border border-border-theme shadow-sm group-hover/item:bg-red-600 group-hover/item:text-white transition-colors">
                         {alert.employee.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="text-[13px] font-black text-primary truncate group-hover/item:text-red-700 transition-colors">{alert.employee.name}</div>
                         <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100 uppercase">هبوط: {alert.drop.toFixed(0)}%</span>
                            <span className="text-[10px] font-bold text-text-muted">{alert.avg.toFixed(0)}% → <span className="text-red-500 font-black">{alert.latest.toFixed(0)}%</span></span>
                         </div>
                         <div className="mt-3 h-2 w-full bg-slate-100/50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${alert.latest}%` }}
                              className="h-full bg-gradient-to-r from-red-400 to-red-600 shadow-[0_0_12px_rgba(239,68,68,0.4)]" 
                            />
                         </div>
                      </div>
                   </div>
                 ))
               )}
            </div>
            {perfAlerts.length > 0 && (
              <div className="p-6 bg-red-500/[0.03] border-t border-red-500/10 mt-auto backdrop-blur-md">
                <div className="flex items-center gap-3 justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  <p className="text-[10px] font-black text-red-700/80 uppercase tracking-widest leading-none">يُنصح بإصدار إشعار إداري عاجل</p>
                </div>
              </div>
            )}
          </div>
        );
      case 'main-chart':
        return (
          <div key={widgetId} className="space-y-6 lg:col-span-2">
            <div className="bg-card-bg rounded-lg shadow-sm border border-border-theme p-5 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold flex items-center gap-2 text-text-dark">
                  مؤشر أداء الكادر (الربع السنوي)
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-text-muted uppercase">تصفية حسب القسم:</span>
                  <select 
                    value={chartDepartment}
                    onChange={(e) => setChartDepartment(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 text-[10px] font-bold outline-none cursor-pointer focus:border-primary"
                  >
                    <option value="all">كافة الوزارة</option>
                    {departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex-1 h-[250px] flex items-center justify-center relative overflow-hidden">
                {chartData.length > 0 && chartData.some(d => d.score > 0 || d.ministryAvg > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#004a99" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#004a99" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fontWeight: 'black', fill: '#64748b' }} 
                        dy={10}
                      />
                      <YAxis domain={[0, 100]} hide />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', fontSize: '11px', fontWeight: 'bold', direction: 'rtl' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                      <Area 
                        name={chartDepartment === 'all' ? 'متوسط الوزارة' : `أداء ${chartDepartment}`}
                        type="monotone" 
                        dataKey="score" 
                        stroke="#004a99" 
                        fillOpacity={1} 
                        fill="url(#colorScore)" 
                        strokeWidth={4} 
                        animationDuration={1500}
                      />
                      <Line 
                        name="المتوسط العام للوزارة"
                        type="monotone" 
                        dataKey="ministryAvg" 
                        stroke="#d4af37" 
                        strokeWidth={2} 
                        strokeDasharray="5 5" 
                        dot={{ r: 3, fill: '#d4af37' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center text-text-muted gap-4">
                    <BarChart3 size={32} className="opacity-20" />
                    <p className="text-[10px] font-bold">بيانات غير كافية للمخطط الزمني</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-border-theme p-5 flex flex-col">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-6 text-text-dark shrink-0">
                مقارنة أداء الإدارات مقابل المتوسط العام
              </h3>
              <div className="flex-1 h-[300px]">
                {departmentComparisonData.length > 0 ? (
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={departmentComparisonData.slice(0, 8)} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                        <XAxis type="number" domain={[0, 100]} hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} width={100} />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                                 <Bar 
                           name="متوسط الإدارة" 
                           dataKey="avg" 
                           fill="#004a99" 
                           radius={[0, 4, 4, 0]} 
                           barSize={12} 
                           onClick={(data) => {
                             if (data && data.name) {
                               setDepartmentFilter(data.name === departmentFilter ? 'all' : data.name);
                               const table = document.getElementById('employee-table');
                               if (table) table.scrollIntoView({ behavior: 'smooth' });
                             }
                           }}
                           className="cursor-pointer hover:opacity-80 transition-opacity"
                         />

                        <Bar name="المتوسط العام للوزارة" dataKey="ministryAvg" fill="#d4af37" radius={[0, 4, 4, 0]} barSize={8} />
                      </BarChart>
                   </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-text-muted gap-2">
                    <History size={32} className="opacity-20" />
                    <p className="text-[10px] font-bold">لا توجد بيانات مقارنة كافية</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'ai-advisor':
        return (
          <div key={widgetId} className="ai-gradient rounded-lg shadow-md p-5 text-white overflow-hidden relative group h-full flex flex-col justify-between">
            <div>
              <h3 className="text-[13px] font-bold mb-4 flex items-center gap-2 text-accent relative z-10">
                 ✧ تحليل الذكاء الاصطناعي للنمو
              </h3>
              <p className="text-[12px] text-white/90 leading-relaxed mb-4 relative z-10">
                بناءً على التقييمات الشهرية الأخيرة، لوحظ تحسن ملحوظ في مؤشرات الأداء الوزاري.
              </p>
              
              <div className="visual-bar mb-3 relative z-10 bg-white/10">
                <div className="h-full bg-accent" style={{ width: '75%' }}></div>
              </div>
              <div className="text-[10px] opacity-70 mb-6 relative z-10 text-right">دقة التنبؤ المستندة للبيانات: 94.2%</div>
            </div>

            <button 
              onClick={async () => {
                setIsGlobalAnalyzing(true);
                const res = await aggregateMinistryAnalysis(evaluations);
                setGlobalAnalysis(res);
                setIsGlobalAnalyzing(false);
              }}
              disabled={isGlobalAnalyzing}
              className="w-full py-2 bg-white/10 hover:bg-white/20 rounded text-[11px] font-bold flex items-center justify-center gap-2 transition-all relative z-10 border border-white/20 uppercase tracking-widest"
            >
              {isGlobalAnalyzing ? (
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>توليد التقرير الاستراتيجي <ArrowUpRight className="w-3 h-3" /></>
              )}
            </button>
          </div>
        );
      case 'fingerprint-sync':
        return (
          <div key={widgetId} className="bg-white rounded-lg border border-border-theme p-6 shadow-sm h-full flex flex-col">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-6 text-text-dark">
              <Fingerprint size={18} className="text-primary" />
              تكامل أجهزة البصمة الذكية
            </h3>
            <FingerprintIntegration />
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {settings.widgetOrder
          .filter(id => id.startsWith('stat-'))
          .map(id => renderWidget(id))}
      </div>

      {/* General Widgets (Performance Summary, etc.) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settings.widgetOrder
          .filter(id => id === 'perf-summary')
          .map(id => renderWidget(id))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-3 space-y-12">
          {/* Main Chart Section */}
          {settings.widgetOrder
            .filter(id => id === 'main-chart')
            .map(id => renderWidget(id))}

          {/* Employee Table Section - Operational Readiness Division */}
          {settings.visibleWidgets.includes('employee-table') && (
            <div id="employee-table" className="card-modern overflow-hidden transition-all duration-700 relative glossy-mesh border-accent/10">
              <div className="p-8 border-b border-border-theme relative z-10">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
                  <div>
                    <div className="flex items-center gap-4 mb-3">
                       <div className="flex -space-x-2">
                          {[1,2,3].map(i => (
                             <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-accent/20 flex items-center justify-center">
                                <ShieldCheck size={10} className="text-accent" />
                             </div>
                          ))}
                       </div>
                       <div className="h-px w-8 bg-accent/30" />
                       <span className="text-[12px] font-black text-accent uppercase tracking-[0.4em] drop-shadow-sm">Operational Readiness Division</span>
                    </div>
                    <h2 className="text-4xl font-black text-primary tracking-tighter leading-none mb-2">إدارة القوة البشرية والبيانات البيومترية</h2>
                    <div className="flex items-center gap-3 mt-3">
                       <p className="text-text-muted text-[13px] font-bold opacity-60">قاعدة بيانات الكادر الوظيفي المتكاملة والمحدثة لحظياً عبر الحوسبة السحابية</p>
                       {departmentFilter !== 'all' && (
                         <span className="flex items-center gap-2 px-4 py-1.5 bg-accent text-primary rounded-2xl text-[11px] font-black shadow-lg shadow-accent/20">
                           <Filter size={14} /> {departmentFilter}
                           <button onClick={() => setDepartmentFilter('all')} className="hover:scale-125 transition-transform"><X size={14} /></button>
                         </span>
                       )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 w-full lg:w-auto items-center">
                    {selectedEmployees.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        className="flex items-center gap-4 bg-red-500 text-white px-5 py-2.5 rounded-2xl shadow-xl shadow-red-500/20 border border-red-400 group"
                      >
                        <span className="text-[11px] font-black uppercase tracking-tight">Selected: {selectedEmployees.length} Units</span>
                        <button 
                          onClick={handleBulkDelete}
                          className="p-1.5 bg-white/20 hover:bg-white/40 rounded-lg transition-all"
                          title="حذف المحدد"
                        >
                          <Trash2 size={16} />
                        </button>
                      </motion.div>
                    )}
                    
                    <button 
                      onClick={() => {
                        setIsSyncing(true);
                        setTimeout(() => {
                          HRIntegrationService.syncNow().then(async () => {
                            await loadData();
                            setIsSyncing(false);
                          });
                        }, 1000);
                      }}
                      disabled={isSyncing}
                      className="btn-modern btn-primary flex items-center gap-3 h-14 px-8"
                    >
                      <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} /> 
                      <div className="flex flex-col items-start leading-none gap-1">
                        <span className="text-[12px]">مزامنة HR</span>
                        <span className="text-[9px] opacity-40 font-bold uppercase tracking-widest">Full DB Sync</span>
                      </div>
                    </button>

                    <button 
                      onClick={onAddEmployee}
                      className="btn-modern btn-accent flex items-center gap-3 h-14 px-8"
                    >
                      <Plus className="w-5 h-5" />
                      <div className="flex flex-col items-start leading-none gap-1">
                        <span className="text-[12px]">إضافة كادر</span>
                        <span className="text-[9px] opacity-60 font-bold uppercase tracking-widest">New Entry</span>
                      </div>
                    </button>

                    <button 
                      onClick={handleExportEmployeesCSV}
                      className="h-14 w-14 glass text-primary rounded-2xl flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 transition-all shadow-modern border border-border-theme group"
                      title="Cloud Export (CSV)"
                    >
                      <FileUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* Advanced Search & Filter Bar */}
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6 items-end bg-white/40 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white/60 shadow-inner group transition-all">
                  <div className="space-y-3 lg:col-span-1">
                     <label className="text-label flex items-center gap-2">
                        <Search size={14} className="text-accent" /> البحث الذكي
                     </label>
                     <div className="relative group">
                       <input 
                         type="text" 
                         placeholder="الاسم، الرقم الوظيفي..." 
                         value={searchTerm}
                         onChange={e => {
                           setSearchTerm(e.target.value);
                           setCurrentPage(1);
                         }}
                         className="w-full px-5 py-4 bg-white/80 border border-border-theme rounded-2xl text-[13px] font-bold focus:ring-4 focus:ring-accent/10 focus:border-accent outline-none shadow-sm transition-all placeholder:opacity-30"
                       />
                       <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-50 flex items-center justify-center rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity">
                         <ChevronLeft size={14} className="text-accent" />
                       </div>
                     </div>
                  </div>
                  
                  <div className="space-y-3">
                     <label className="text-label flex items-center gap-2">
                        <Filter size={14} className="text-accent" /> تصنيف الاختصاص
                     </label>
                     <select
                       value={selectedType}
                       onChange={e => setSelectedType(e.target.value as any)}
                       className="w-full px-5 py-4 bg-white/80 border border-border-theme rounded-2xl text-[13px] font-bold outline-none shadow-sm focus:ring-4 focus:ring-accent/10 focus:border-accent appearance-none cursor-pointer hover:bg-white transition-colors"
                     >
                        <option value="all">كافة التخصصات (All)</option>
                        <option value="technical">كادر فني (Technical)</option>
                        <option value="non-technical">كادر إداري (General)</option>
                     </select>
                  </div>

                  <div className="space-y-3">
                     <label className="text-label flex items-center gap-2">
                        <Users size={14} className="text-accent" /> الفئة التعاقدية
                     </label>
                     <select
                       value={selectedCategory}
                       onChange={e => setSelectedCategory(e.target.value as any)}
                       className="w-full px-5 py-4 bg-white/80 border border-border-theme rounded-2xl text-[13px] font-bold outline-none shadow-sm focus:ring-4 focus:ring-accent/10 focus:border-accent appearance-none cursor-pointer hover:bg-white transition-colors"
                     >
                        <option value="all">كافة الفئات (Global)</option>
                        <option value="internal">موظف رسمي (Permanent)</option>
                        <option value="contractor">نظام التعاقد (Contract)</option>
                        <option value="consultant">مستشار (Consultant)</option>
                     </select>
                  </div>

                  <div className="space-y-3">
                     <label className="text-label flex items-center gap-2">
                        <Calendar size={14} className="text-accent" /> نافذة التاريخ
                     </label>
                     <input 
                      type="date"
                      value={joinDateFilter}
                      onChange={e => setJoinDateFilter(e.target.value)}
                      className="w-full px-5 py-4 bg-white/80 border border-border-theme rounded-2xl text-[13px] font-bold outline-none shadow-sm focus:ring-4 focus:ring-accent/10 focus:border-accent transition-all"
                    />
                  </div>

                  <div>
                     <button 
                      onClick={() => {
                          setSearchTerm('');
                          setSelectedType('all');
                          setSelectedCategory('all');
                          setJoinDateFilter('');
                      }}
                      className="w-full py-4 bg-red-500/5 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-2xl text-[11px] font-black text-red-600 transition-all uppercase tracking-[0.14em] shadow-sm active:scale-95 flex items-center justify-center gap-2"
                     >
                        <RefreshCw size={14} /> تصفير المعايير
                     </button>
                  </div>
                </div>

                {isSyncing && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 text-[11px] font-black text-primary p-4 bg-primary/5 rounded-2xl border border-primary/10 mt-6"
                  >
                     <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                     </div>
                     جاري مزامنة قاعدة البيانات المركزية مع الأنظمة الوزارية...
                  </motion.div>
                )}
              </div>

              <div className="relative z-10 px-8 pb-8">
                <div className="overflow-x-auto custom-scrollbar rounded-[2rem] border border-border-theme bg-white/40 shadow-inner">
                  <table className="w-full text-right border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-border-theme">
                    <th className="px-8 py-6 w-16">
                      <input 
                        type="checkbox" 
                        onChange={handleSelectAll}
                        checked={selectedEmployees.length === paginatedEmployees.length && paginatedEmployees.length > 0}
                        className="w-5 h-5 accent-accent rounded cursor-pointer"
                      />
                    </th>
                    <th className="px-8 py-6 text-label">
                      <button 
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-2 hover:text-accent transition-all group font-bold"
                      >
                        اسم الموظف <ArrowUpDown size={14} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </th>
                    <th className="px-8 py-6 text-label">الإدارة / المسمى الوظيفي</th>
                    <th className="px-8 py-6 text-label">
                      <button 
                        onClick={() => handleSort('employeeId')}
                        className="flex items-center gap-2 hover:text-accent transition-all group font-bold"
                      >
                        الرقم الوظيفي <ArrowUpDown size={14} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </th>
                    <th className="px-8 py-6 text-label">مؤشر البصمة</th>
                    <th className="px-8 py-6 text-label">
                      <button 
                        onClick={() => handleSort('joinDate')}
                        className="flex items-center gap-2 hover:text-accent transition-all group font-bold"
                      >
                        تاريخ التوظيف <ArrowUpDown size={14} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </th>
                    <th className="px-8 py-6 text-label text-left uppercase">Performance & Status</th>
                    <th className="px-8 py-6 text-label text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-theme/50">
                  {paginatedEmployees.map(emp => (
                    <tr 
                      key={emp.id} 
                      onClick={() => navigate(`/details/${emp.id}`)}
                      className={`hover:bg-white/60 transition-all cursor-pointer group ${selectedEmployees.includes(emp.id!) ? 'bg-accent/5' : ''}`}
                    >
                      <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={selectedEmployees.includes(emp.id!)}
                          onChange={() => handleSelectOne(emp.id!)}
                          className="w-4 h-4 accent-accent rounded cursor-pointer"
                        />
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 border border-white shadow-premium relative transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ${
                            getLatestScore(emp.id!) === null ? 'bg-slate-200 text-slate-500' :
                            getLatestScore(emp.id!)! >= 90 ? 'bg-emerald-500 text-white shadow-emerald-500/20' :
                            getLatestScore(emp.id!)! >= 75 ? 'bg-blue-500 text-white shadow-blue-500/20' :
                            getLatestScore(emp.id!)! >= 50 ? 'bg-amber-500 text-white shadow-amber-500/20' : 'bg-red-500 text-white shadow-red-500/20'
                          }`}>
                            {emp.name[0]}
                            {getLatestScore(emp.id!) !== null && (
                              <div className={`absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-black shadow-lg ${
                                getLatestScore(emp.id!)! >= 90 ? 'bg-emerald-600' :
                                getLatestScore(emp.id!)! >= 75 ? 'bg-blue-600' :
                                getLatestScore(emp.id!)! >= 50 ? 'bg-amber-600' : 'bg-red-600'
                              }`}>
                                {getLatestScore(emp.id!)?.toFixed(0)}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-black text-[16px] text-primary group-hover:text-accent transition-colors truncate tracking-tighter">
                              {emp.name}
                            </div>
                            <div className="text-[11px] text-text-muted font-bold tracking-[0.15em] mt-1 opacity-60 font-sans uppercase">Emp ID: {emp.employeeId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-[13px] font-black text-primary group-hover:translate-x-2 transition-transform">{emp.department}</div>
                        <div className="text-[11px] text-text-muted font-bold mt-1 opacity-60 tracking-tight">{emp.position}</div>
                      </td>
                      <td className="px-8 py-6 shrink-0">
                        <span className="font-mono text-[12px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 group-hover:border-accent/40 group-hover:text-primary transition-all">
                          {emp.employeeId}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3 text-[12px] font-black text-slate-600">
                          <Fingerprint size={16} className="text-accent/60 group-hover:text-accent transition-colors" />
                          {emp.biometricId || <span className="opacity-30">---</span>}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-[12px] font-black text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 inline-block group-hover:bg-white transition-colors">
                           {emp.joinDate}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex gap-2">
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                              emp.type === 'technical' ? 'bg-[#e3f2fd] text-[#1565c0] border border-[#bbdefb]' : 'bg-[#f3e5f5] text-[#7b1fa2] border border-[#e1bee7]'
                            }`}>
                              {emp.type === 'technical' ? 'فني' : 'إداري'}
                            </span>
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                              emp.category === 'consultant' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                              emp.category === 'contractor' ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}>
                              {emp.category === 'internal' ? 'رسمي' : 
                               emp.category === 'consultant' ? 'مستشار' : 'متعاقد'}
                            </span>
                          </div>
                          {getLatestScore(emp.id!) && (
                            <span className="text-[11px] font-black text-primary bg-white/60 px-3 py-1 rounded-lg border border-white/80 shadow-sm">
                              ACHIEVED %{getLatestScore(emp.id!)!.toFixed(0)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-left" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2 pr-4">
                          <button 
                            type="button"
                            onClick={() => navigate(`/details/${emp.id}`)}
                            className="p-2.5 bg-white text-primary border border-border-theme rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm hover:shadow-md active:scale-90"
                            title="عرض السجل"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => onEditEmployee(emp)}
                            className="p-2.5 bg-white border border-border-theme rounded-xl text-text-muted hover:text-accent hover:border-accent transition-all shadow-sm hover:shadow-md active:scale-90"
                            title="تعديل البيانات"
                          >
                            <FileEdit size={16} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleDeleteEmployee(emp)}
                            className="p-2.5 bg-red-50/50 border border-red-100 rounded-xl text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-sm hover:shadow-md active:scale-90"
                            title="حذف الموظف"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Enhanced Pagination Controls */}
              {totalPages > 1 && (
                <div className="p-8 border-t border-border-theme bg-white/60 flex items-center justify-between z-10 relative px-12">
                  <div className="text-[11px] font-black text-text-muted uppercase tracking-[0.2em] flex items-center gap-4">
                    <span className="opacity-40">System Entries:</span>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-border-theme shadow-modern">
                      <span className="text-primary">{(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredEmployees.length)}</span>
                      <span className="opacity-30">/</span>
                      <span className="text-accent">{filteredEmployees.length}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                      className="p-3 bg-white border border-border-theme rounded-2xl hover:shadow-md disabled:opacity-30 transition-all active:scale-90"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    
                    <div className="flex items-center gap-1.5 bg-white/50 backdrop-blur-md p-2 rounded-3xl border border-white/60 shadow-inner">
                      {[...Array(totalPages)].map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`w-10 h-10 flex items-center justify-center rounded-2xl text-[11px] font-black transition-all ${
                            currentPage === i + 1 
                            ? 'bg-primary text-white shadow-xl shadow-primary/30 scale-110' 
                            : 'hover:bg-white text-text-muted hover:text-primary'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>

                    <button 
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      className="p-3 bg-white border border-border-theme rounded-2xl hover:shadow-md disabled:opacity-30 transition-all active:scale-90"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {filteredEmployees.length === 0 && (
                <div className="p-24 text-center z-10 relative">
                  <div className="w-24 h-24 bg-slate-50/50 backdrop-blur-sm rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 border border-white/60 shadow-inner animate-pulse">
                    <Users className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-black text-primary mb-2 tracking-tighter">قاعدة البيانات خالية حالياً</h3>
                  <p className="text-text-muted font-bold text-sm">ابحث بمعايير أخرى أو قم بتصفير الفلاتر للنتائج المرجوة</p>
                </div>
              )}
              </div>
            </div>
          </div>
        )}
      </div>

        {/* Sidebar: Analytics & Charts */}
        <div className="space-y-6">
          {settings.widgetOrder
            .filter(id => id === 'ai-advisor' || id === 'performance-alerts')
            .map(id => renderWidget(id))}

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
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend, color }: { icon: any, label: string, value: string, trend: string, color: string }) {
  return (
    <motion.div 
      whileHover={{ y: -12, scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="card-modern p-10 flex flex-col justify-between min-h-[220px] group relative overflow-hidden active:scale-95 transition-all duration-500"
    >
      <div className={`absolute top-0 right-0 w-32 h-32 ${color.replace('bg-', 'bg-')}/5 rounded-full blur-3xl -translate-y-16 -translate-x-16 pointer-events-none group-hover:scale-150 transition-transform duration-700`} />
      
      <div className="flex justify-between items-start relative z-10">
        <div className={`w-16 h-16 ${color} rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-primary/10 group-hover:rotate-6 transition-transform duration-500`}>
          {React.cloneElement(icon as React.ReactElement<any>, { size: 28 })}
        </div>
                    <div className="flex flex-col items-end">
                       <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-1 opacity-50 font-sans">Status</span>
                       <span className="px-3 py-1.5 bg-white/50 backdrop-blur-md rounded-full text-[9px] font-bold text-emerald-600 border border-emerald-100 flex items-center gap-1.5 shadow-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          ACTIVE
                       </span>
                    </div>
      </div>

      <div className="mt-8 relative z-10">
        <div className="text-[11px] font-bold text-text-muted uppercase tracking-[0.25em] mb-3 opacity-60 group-hover:opacity-100 transition-opacity font-sans">{label}</div>
        <div className="flex items-baseline gap-3">
          <div className="text-5xl font-black text-primary tracking-tighter group-hover:text-accent transition-colors duration-500">
            {value}
          </div>
          {trend && (
            <div className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 mb-1">
              {trend}
            </div>
          )}
        </div>
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
