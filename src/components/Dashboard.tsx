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
  Calendar
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
  'ai-advisor': { label: 'المحلل الذكي', icon: <Award size={16} /> }
};

const DEFAULT_SETTINGS: DashboardSettings = {
  visibleWidgets: ['perf-summary', 'stat-staff', 'stat-evals', 'stat-avg', 'stat-top', 'stat-alerts', 'performance-alerts', 'main-chart', 'employee-table', 'ai-advisor'],
  widgetOrder: ['perf-summary', 'stat-staff', 'stat-evals', 'stat-avg', 'stat-top', 'stat-alerts', 'performance-alerts', 'main-chart', 'employee-table', 'ai-advisor']
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

  const renderWidget = (widgetId: string) => {
    if (!settings.visibleWidgets.includes(widgetId)) return null;

    switch (widgetId) {
      case 'perf-summary':
        return (
          <div key={widgetId} className="bg-white rounded-lg border-2 border-red-100 p-6 flex items-center justify-between shadow-sm lg:col-span-2">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 border border-red-100">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h3 className="text-lg font-black text-text-dark mb-1">ملخص تنبيهات الأداء</h3>
                <p className="text-text-muted text-xs font-bold leading-relaxed max-w-md">
                  تم رصد <span className="text-red-600 px-1">{perfAlerts.length}</span> موظفين يعانون من هبوط في مستوى الأداء بنسبة تتجاوز 15% مقارنة بمتوسطهم التاريخي.
                </p>
              </div>
            </div>
            <button 
              onClick={() => {
                const alertsWidget = document.getElementById('performance-alerts');
                if (alertsWidget) alertsWidget.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-xs font-black shadow-lg shadow-red-200 hover:bg-red-700 transition-all uppercase tracking-widest whitespace-nowrap"
            >
              مراجعة التنبيهات
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
        return (
          <StatCard 
            key={widgetId}
            icon={<BarChart3 className="w-6 h-6" />}
            label="تقييمات الشهر"
            value={evaluations.filter(e => e.period === 'monthly').length.toString()}
            trend="12% زيادة"
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
          <div key={widgetId} className="bg-white rounded-lg border border-border-theme overflow-hidden shadow-sm flex flex-col">
            <div className="p-4 bg-red-50 border-b border-red-100 flex justify-between items-center">
               <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle size={18} />
                  <h3 className="text-xs font-black uppercase tracking-widest">تنبيهات هبوط الأداء</h3>
               </div>
               <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{perfAlerts.length}</span>
            </div>
            <div className="p-4 flex-1 overflow-y-auto max-h-[300px] space-y-3">
               {perfAlerts.length === 0 ? (
                 <div className="py-8 text-center text-text-muted text-[11px] italic">
                    لا توجد تنبيهات حالية
                 </div>
               ) : (
                 perfAlerts.map((alert, idx) => (
                   <div key={idx} className="flex gap-3 p-3 bg-slate-50 rounded border border-slate-200">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-xs font-black text-red-600 shrink-0">
                         {alert.employee.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                         <div 
                           onClick={() => navigate(`/details/${alert.employee.id}`)}
                           className="text-[11px] font-black truncate cursor-pointer hover:text-primary"
                         >
                           {alert.employee.name}
                         </div>
                         <p className="text-[9px] text-text-muted">هبوط بنسبة {alert.drop.toFixed(1)}%</p>
                         <div className="mt-1.5 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500" style={{ width: `${alert.latest}%` }} />
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
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-xl font-black text-text-dark uppercase tracking-wider">لوحة التحكم الاستراتيجية</h2>
           <p className="text-[11px] text-text-muted font-bold">ملخص الأداء والتحليلات للوزارة</p>
        </div>
        <button 
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-border-theme rounded-xl text-xs font-black text-text-muted hover:text-primary transition-all shadow-sm"
        >
          <Settings size={16} /> تخصيص اللوحة
        </button>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {settings.widgetOrder
          .filter(id => id.startsWith('stat-'))
          .map(id => renderWidget(id))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Main Chart Section */}
          {settings.widgetOrder
            .filter(id => id === 'main-chart')
            .map(id => renderWidget(id))}

          {/* Employee Table Section */}
          {settings.visibleWidgets.includes('employee-table') && (
            <div id="employee-table" className="bg-card-bg rounded-lg border border-border-theme overflow-hidden shadow-sm">
            <div className="p-5 border-b border-border-theme bg-white flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div>
                    <h2 className="text-base font-bold text-text-dark">إدارة بيانات القوة البشرية</h2>
                    <div className="flex items-center gap-2">
                       <p className="text-text-muted text-[11px] uppercase tracking-wide">فلترة وبحث متقدم في سجلات الكادر</p>
                       {departmentFilter !== 'all' && (
                         <span className="flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent rounded-md text-[9px] font-black border border-accent/20">
                           <Filter size={10} /> تصفية: {departmentFilter}
                           <button onClick={() => setDepartmentFilter('all')} className="hover:text-red-500"><X size={10} /></button>
                         </span>
                       )}
                    </div>
                  </div>
                  {selectedEmployees.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 bg-red-50 px-3 py-1.5 rounded border border-red-100"
                    >
                      <span className="text-[10px] font-black text-red-600">تم تحديد {selectedEmployees.length}</span>
                      <button 
                        onClick={handleBulkDelete}
                        className="text-red-500 hover:text-red-700 transition-colors"
                        title="حذف المحدد"
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  )}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    onClick={onAddEmployee}
                    className="bg-primary text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-secondary transition-colors shadow-sm text-xs font-bold"
                  >
                    <Plus className="w-4 h-4" /> إضافة موظف
                  </button>
                  <button 
                    onClick={() => setShowExport(true)}
                    className="bg-white border border-border-theme text-text-dark p-2 rounded hover:bg-slate-50 transition-colors shadow-sm"
                    title="تصدير البيانات"
                  >
                    <FileDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Advanced Search & Filter Bar */}
              <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-1.5 lg:col-span-1">
                   <label className="text-[9px] font-black text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                      <Search size={10} /> ابحث بالاسم أو الرقم
                   </label>
                   <input 
                    type="text" 
                    placeholder="أبحث..." 
                    value={searchTerm}
                    onChange={e => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-4 py-2 bg-white border border-border-theme rounded-lg text-xs font-bold focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                      <Filter size={10} /> نوع الكادر
                   </label>
                   <select
                     value={selectedType}
                     onChange={e => setSelectedType(e.target.value as any)}
                     className="w-full px-3 py-2 bg-white border border-border-theme rounded-lg text-xs font-bold outline-none"
                   >
                      <option value="all">الكل</option>
                      <option value="technical">كادر فني</option>
                      <option value="non-technical">كادر إداري</option>
                   </select>
                </div>

                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                      <Users size={10} /> فئة التوظيف
                   </label>
                   <select
                     value={selectedCategory}
                     onChange={e => setSelectedCategory(e.target.value as any)}
                     className="w-full px-3 py-2 bg-white border border-border-theme rounded-lg text-xs font-bold outline-none"
                   >
                      <option value="all">الكل</option>
                      <option value="internal">رسمي</option>
                      <option value="contractor">متعاقد</option>
                      <option value="consultant">مستشار</option>
                   </select>
                </div>

                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                      <Calendar size={10} /> تاريخ الانضمام (من)
                   </label>
                   <input 
                    type="date"
                    value={joinDateFilter}
                    onChange={e => setJoinDateFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-border-theme rounded-lg text-xs font-bold outline-none"
                  />
                </div>

                <div className="lg:col-span-1">
                   <button 
                    onClick={() => {
                        setSearchTerm('');
                        setSelectedType('all');
                        setSelectedCategory('all');
                        setJoinDateFilter('');
                    }}
                    className="w-full py-2 bg-white border border-border-theme rounded-lg text-[10px] font-black text-red-500 hover:bg-red-50 transition-colors uppercase"
                   >
                      إعادة تعيين 
                   </button>
                </div>
              </div>

              {isSyncing && (
                <div className="flex items-center gap-2 text-[10px] font-bold text-primary animate-pulse py-1">
                   <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                   جاري مزامنة بيانات الموظفين مع نظام الموارد البشرية الخارجي...
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-[#f8f9fa] text-text-muted text-[11px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-4 border-b-2 border-border-theme w-10">
                      <input 
                        type="checkbox" 
                        onChange={handleSelectAll}
                        checked={selectedEmployees.length === paginatedEmployees.length && paginatedEmployees.length > 0}
                        className="w-3.5 h-3.5 accent-primary cursor-pointer"
                      />
                    </th>
                    <th className="px-5 py-4 border-b-2 border-border-theme">
                      <button 
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-2 hover:text-primary transition-colors focus:outline-none"
                      >
                        اسم الموظف {getSortIcon('name')}
                      </button>
                    </th>
                    <th className="px-5 py-4 border-b-2 border-border-theme">الإدارة / القسم</th>
                    <th className="px-5 py-4 border-b-2 border-border-theme">
                      <button 
                        onClick={() => handleSort('employeeId')}
                        className="flex items-center gap-2 hover:text-primary transition-colors focus:outline-none"
                      >
                        الرقم الوظيفي {getSortIcon('employeeId')}
                      </button>
                    </th>
                    <th className="px-5 py-4 border-b-2 border-border-theme">
                      <button 
                        onClick={() => handleSort('joinDate')}
                        className="flex items-center gap-2 hover:text-primary transition-colors focus:outline-none"
                      >
                        تاريخ الانضمام {getSortIcon('joinDate')}
                      </button>
                    </th>
                    <th className="px-5 py-4 border-b-2 border-border-theme text-left">التفاصيل</th>
                    <th className="px-5 py-4 border-b-2 border-border-theme text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-theme">
                  {paginatedEmployees.map(emp => (
                    <tr 
                      key={emp.id} 
                      onClick={() => navigate(`/details/${emp.id}`)}
                      className={`hover:bg-slate-50 transition-colors group cursor-pointer ${selectedEmployees.includes(emp.id!) ? 'bg-blue-50/30' : ''}`}
                    >
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={selectedEmployees.includes(emp.id!)}
                          onChange={() => handleSelectOne(emp.id!)}
                          className="w-3.5 h-3.5 accent-primary cursor-pointer"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 relative ${
                            getLatestScore(emp.id!) === null ? 'bg-slate-100 text-primary' :
                            getLatestScore(emp.id!)! >= 90 ? 'bg-emerald-100 text-emerald-700' :
                            getLatestScore(emp.id!)! >= 75 ? 'bg-blue-100 text-blue-700' :
                            getLatestScore(emp.id!)! >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {emp.name[0]}
                            {getLatestScore(emp.id!) !== null && (
                              <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                                getLatestScore(emp.id!)! >= 90 ? 'bg-emerald-500' :
                                getLatestScore(emp.id!)! >= 75 ? 'bg-blue-500' :
                                getLatestScore(emp.id!)! >= 50 ? 'bg-amber-500' : 'bg-red-500'
                              }`} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-text-dark truncate">
                              {emp.name}
                            </div>
                            <div className="text-[10px] text-text-muted uppercase">ID: {emp.employeeId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs font-bold text-text-dark">{emp.department}</div>
                        <div className="text-[10px] text-text-muted">{emp.position}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs font-bold text-text-dark">{emp.employeeId}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs font-bold text-slate-500">{emp.joinDate}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex gap-1">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              emp.type === 'technical' ? 'bg-[#e3f2fd] text-[#1565c0]' : 'bg-[#f3e5f5] text-[#7b1fa2]'
                            }`}>
                              {emp.type === 'technical' ? 'فني' : 'إداري'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              emp.category === 'consultant' ? 'bg-amber-100 text-amber-700' :
                              emp.category === 'contractor' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {emp.category === 'internal' ? 'رسمي' : 
                               emp.category === 'consultant' ? 'مستشار' : 'متعاقد'}
                            </span>
                          </div>
                          {getLatestScore(emp.id!) && (
                            <span className="text-[10px] font-bold text-primary">%{getLatestScore(emp.id!)!.toFixed(0)} حُقق</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-left" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            type="button"
                            onClick={() => setShowHistoryEmployee(emp)}
                            title="عرض السجل"
                            className="p-1.5 bg-white border border-border-theme rounded text-text-muted hover:text-primary hover:border-primary transition-all shadow-sm flex items-center gap-1"
                          >
                            <History size={14} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => onEditEmployee(emp)}
                            title="تعديل البيانات"
                            className="p-1.5 bg-white border border-border-theme rounded text-text-muted hover:text-secondary hover:border-secondary transition-all shadow-sm"
                          >
                            <FileEdit size={14} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleDeleteEmployee(emp)}
                            title="حذف الموظف"
                            className="p-1.5 bg-red-50 border border-red-200 rounded text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-sm flex items-center gap-1 group/del"
                          >
                            <Trash2 size={14} className="group-hover/del:scale-110 transition-transform" />
                            <span className="text-[10px] font-bold hidden sm:inline">حذف</span>
                          </button>
                          <button 
                            type="button"
                            onClick={() => onEvaluateUser(emp)}
                            className="px-4 py-1.5 bg-white border border-border-theme rounded text-[11px] font-bold text-text-dark hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm whitespace-nowrap"
                          >
                            تقييم الأداء
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-border-theme bg-[#f8f9fa] flex items-center justify-between">
                  <p className="text-[10px] font-bold text-text-muted uppercase">
                    عرض الفرع {(currentPage - 1) * itemsPerPage + 1} إلى {Math.min(currentPage * itemsPerPage, filteredEmployees.length)} من {filteredEmployees.length} موظف
                  </p>
                  <div className="flex items-center gap-1">
                    <button 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                      className="p-1 border border-border-theme rounded hover:bg-white disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-7 h-7 flex items-center justify-center rounded text-xs font-bold transition-all ${
                          currentPage === i + 1 
                          ? 'bg-primary text-white shadow-sm' 
                          : 'bg-white border border-border-theme text-text-muted hover:border-primary'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button 
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      className="p-1 border border-border-theme rounded hover:bg-white disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {filteredEmployees.length === 0 && (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-slate-400">لا يوجد موظفين في هذه القائمة</p>
                </div>
              )}
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
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[60]"
              >
                <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
                  <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                    <h3 className="font-bold text-xl flex items-center gap-2">
                       التحليل الاستراتيجي للموارد البشرية
                    </h3>
                    <button onClick={() => setGlobalAnalysis(null)} className="p-2 hover:bg-white/10 rounded-full">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="p-8 overflow-y-auto prose prose-slate max-w-none text-right" dir="rtl">
                    <div dangerouslySetInnerHTML={{ __html: globalAnalysis.replace(/\n/g, '<br/>') }} />
                  </div>
                </div>
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
    <div className="bg-card-bg p-5 rounded-lg border border-border-theme shadow-sm">
      <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2">{label}</h3>
      <div className="flex items-center justify-between">
        <div className="value text-2xl font-bold text-primary">{value}</div>
        <div className={`p-2 rounded-md ${color} text-white`}>
          {React.cloneElement(icon as React.ReactElement<any>, { size: 18 })}
        </div>
      </div>
      <p className="text-[10px] font-bold text-emerald-600 mt-2">{trend}</p>
    </div>
  );
}

function getScoreBg(score: number): string {
  if (score >= 90) return 'bg-emerald-500';
  if (score >= 80) return 'bg-blue-500';
  if (score >= 70) return 'bg-amber-500';
  return 'bg-red-500';
}
