/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../db.ts';
import { Employee, Evaluation } from '../types.ts';
import { 
  Building2, 
  Users, 
  BarChart3, 
  ChevronDown, 
  ChevronUp, 
  Award, 
  TrendingUp, 
  Target,
  ArrowRight,
  Filter,
  ArrowUpDown,
  Download,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Search,
  BookOpen,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function DepartmentReports() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'name' | 'staffCount' | 'score' | 'rate'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showOnlyAlerts, setShowOnlyAlerts] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const allEmps = await db.employees.toArray();
      const allEvals = await db.evaluations.toArray();
      setEmployees(allEmps);
      setEvaluations(allEvals);
    };
    loadData();
  }, []);

  const alertEmployees = useMemo(() => {
    return employees.filter(emp => {
      const empEvals = evaluations.filter(e => e.employeeId === emp.id);
      if (empEvals.length === 0) return false;
      
      const lastEval = [...empEvals].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      const lowAttendance = ['poor', 'average'].includes(lastEval.attendance);
      const lowDiscipline = ['needs-improvement', 'warning'].includes(lastEval.discipline);
      
      return lowAttendance || lowDiscipline;
    }).map(emp => {
      const empEvals = evaluations.filter(e => e.employeeId === emp.id);
      const lastEval = [...empEvals].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      return { ...emp, lastEval };
    });
  }, [employees, evaluations]);

  const CATEGORIES = {
    'القيادة والدعم': [
      'وكلاء وزارة الاتصالات',
      'مكتب الوزير',
      'مستشارين الوزير',
      'ادارة الشؤون القانونية',
      'ادارة الرقابة والتفتيش',
      'ادارة العلاقات العامة والإعلام',
      'المكتب الفني'
    ],
    'إدارات العامة – خط مركزي': [
      'الإدارة العامة للتخطيط والعلاقات الدولية',
      'الإدارة العامة لشؤون تنظيم البريد',
      'الإدارة العامة لشؤون تنظيم الاتصالات',
      'ادارة التراخيص',
      'ادارة الموافقة النوعية',
      'ادارة الهاتف النقال',
      'الإدارة العامة لتنظيم استخدام الترددات',
      'ادارة الاجور'
    ],
    'الجهات التابعة': [
      'المؤسسة العامة للاتصالات السلكية واللاسلكية',
      'الهيئة العامة للبريد والتوفير البريدي',
      'الشركة اليمنية للاتصالات الدولية (تيليمن)',
      'مشروع تطوير وتحسين الاتصالات (عدن نت)',
      'شركات الهاتف النقال'
    ]
  };

  const getCategory = (deptName: string) => {
    for (const [cat, depts] of Object.entries(CATEGORIES)) {
      if (depts.includes(deptName)) return cat;
    }
    return 'أخرى / غير مصنف';
  };

  const departmentData = useMemo(() => {
    const depts: Record<string, { 
      name: string; 
      category: string;
      staffCount: number; 
      evaluatedCount: number; 
      averageScore: number;
      evaluations: Evaluation[];
      employees: Employee[];
    }> = {};

    employees.forEach(emp => {
      if (!depts[emp.department]) {
        depts[emp.department] = { 
          name: emp.department, 
          category: getCategory(emp.department),
          staffCount: 0, 
          evaluatedCount: 0, 
          averageScore: 0,
          evaluations: [],
          employees: []
        };
      }
      depts[emp.department].staffCount++;
      depts[emp.department].employees.push(emp);
    });

    evaluations.forEach(evalu => {
      const emp = employees.find(e => e.id === evalu.employeeId);
      if (emp && depts[emp.department]) {
        depts[emp.department].evaluatedCount++;
        depts[emp.department].evaluations.push(evalu);
      }
    });

    const processed = Object.values(depts).map(d => {
      const totalScore = d.evaluations.reduce((acc, curr) => acc + curr.totalScore, 0);
      return {
        ...d,
        averageScore: d.evaluations.length > 0 ? totalScore / d.evaluations.length : 0,
        completionRate: d.staffCount > 0 ? (d.evaluatedCount / d.staffCount) * 100 : 0
      };
    });

    // Filter by category
    const filtered = selectedCategory === 'All' 
      ? processed 
      : processed.filter(d => d.category === selectedCategory);

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let valA: any, valB: any;
      if (sortBy === 'name') { valA = a.name; valB = b.name; }
      else if (sortBy === 'staffCount') { valA = a.staffCount; valB = b.staffCount; }
      else if (sortBy === 'score') { valA = a.averageScore; valB = b.averageScore; }
      else { valA = a.completionRate; valB = b.completionRate; }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Group by category (if All) or just return list
    if (selectedCategory !== 'All') {
      return { [selectedCategory]: sorted };
    }

    const grouped: Record<string, typeof processed> = {};
    sorted.forEach(d => {
      if (!grouped[d.category]) grouped[d.category] = [];
      grouped[d.category].push(d);
    });

    return grouped;
  }, [employees, evaluations, selectedCategory, sortBy, sortOrder]);

  const handleExportCSV = () => {
    const allData = Object.values(departmentData).flat();
    const headers = ['Department Name', 'Category', 'Staff Count', 'Completion Rate (%)', 'Average Score (%)'];
    const rows = allData.map(d => [
      d.name,
      d.category,
      d.staffCount,
      d.completionRate.toFixed(1),
      d.averageScore.toFixed(1)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `department_performance_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-12 pb-24 px-4 md:px-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="ministry-card overflow-hidden bg-white shadow-premium">
        <div className="ministry-banner p-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-premium">
              <Building2 size={36} className="text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
                <span className="text-[10px] text-accent font-black uppercase tracking-[0.4em]">Organizational Integrity Hub</span>
              </div>
              <h2 className="text-4xl font-black text-white italic tracking-tighter">تحليل الأداء المؤسسي الشامل</h2>
            </div>
          </div>
          <div className="flex gap-4">
             <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md text-right">
                <div className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Last Update</div>
                <div className="text-white text-xs font-black">اليوم، {new Date().toLocaleTimeString('ar-YE')}</div>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-border-theme bg-slate-50/30">
          <StatBox 
             icon={<Users className="text-primary" />}
             label="إجمالي الوحدات التابعة"
             value={Object.keys(departmentData).length.toString()}
          />
          <StatBox 
             icon={<Target className="text-accent" />}
             label="أعلى مؤشر كفاءة قطاعي"
             value={`${Math.max(...Object.values(departmentData).flat().map(d => d.completionRate), 0).toFixed(0)}%`}
          />
          <StatBox 
             icon={<Award className="text-primary" />}
             label="معدل المخرجات الوزاري"
             value={`${(Object.values(departmentData).flat().reduce((acc, d) => acc + d.averageScore, 0) / (Object.values(departmentData).flat().length || 1)).toFixed(1)}%`}
          />
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-3xl border border-border-theme p-6 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-premium">
        <div className="flex flex-wrap items-center gap-6 w-full lg:w-auto">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-primary border border-slate-200">
              <Filter size={18} />
            </div>
            <div className="flex flex-col">
               <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">تصفية حسب النطاق</span>
               <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-sm font-black text-primary outline-none cursor-pointer py-1"
               >
                <option value="All">كافة القطاعات السيادية</option>
                {Object.keys(CATEGORIES).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="أخرى / غير مصنف">أخرى / غير مصنف</option>
               </select>
            </div>
          </div>

          <div className="h-10 w-px bg-border-theme hidden lg:block" />

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-primary border border-slate-200">
              <ArrowUpDown size={18} />
            </div>
            <div className="flex flex-col">
               <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">فرز المؤشرات</span>
               <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-sm font-black text-primary outline-none cursor-pointer py-1"
               >
                <option value="score">ترتيب حسب متوسط الأداء</option>
                <option value="staffCount">ترتيب حسب القوة البشرية</option>
                <option value="rate">ترتيب حسب نضج الإنجاز</option>
                <option value="name">ترتيب أبجدي تصاعدي</option>
               </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full lg:w-auto justify-end">
          <button 
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className={`p-3 rounded-xl border transition-all shadow-sm ${sortOrder === 'asc' ? 'bg-primary text-white border-primary' : 'bg-white text-primary border-border-theme'}`}
          >
            <ArrowUpDown size={20} />
          </button>
          
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-3 px-8 py-3.5 bg-emerald-600 text-white rounded-xl text-[13px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-premium"
          >
            <Download size={18} /> استخراج البيانات CSV
          </button>
        </div>
      </div>

      {/* Critical Risk / Alert Section */}
      <div className="bg-red-50/30 border border-red-100 rounded-[3rem] p-10 shadow-inner relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-100/20 rounded-full blur-[80px] -translate-y-20 translate-x-20 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12 relative z-10">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shadow-sm">
                 <ShieldAlert size={28} />
              </div>
              <h3 className="text-2xl font-black text-red-900 tracking-tighter">تقرير المخاطر والاحتياجات التدريبية</h3>
            </div>
            <p className="text-sm font-bold text-red-700/60 max-w-xl leading-relaxed">تحليل الكادر الذي يظهر تراجعاً في مؤشرات الانضباط السلوكي أو الحضور الميداني، مع تحديد المسارات التصحيحية المقترحة.</p>
          </div>
          <div className="flex items-center gap-4 px-8 py-4 bg-white rounded-2xl border border-red-100 shadow-premium">
             <div className="text-right">
                <div className="text-[9px] font-black text-red-900/40 uppercase tracking-widest">Active Alerts</div>
                <div className="text-xl font-black text-red-600"> {alertEmployees.length} حالة حرجة</div>
             </div>
             <AlertTriangle size={24} className="text-red-500 animate-pulse" />
          </div>
        </div>

        {alertEmployees.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {alertEmployees.map((emp, i) => (
              <motion.div 
                key={emp.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-3xl p-8 border border-red-100 shadow-premium flex flex-col lg:flex-row items-center gap-10 hover:shadow-red-900/5 transition-all"
              >
                <div className="flex items-center gap-6 flex-1">
                  <div className="w-16 h-16 bg-red-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg shadow-red-200">
                    {emp.name[0]}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-black text-primary mb-1">{emp.name}</h4>
                    <div className="flex items-center gap-3">
                       <span className="text-[11px] font-black text-text-muted uppercase tracking-wider">{emp.position}</span>
                       <div className="w-1 h-1 rounded-full bg-slate-300" />
                       <span className="text-[11px] font-bold text-accent italic">{emp.department}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                  <div className="px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100 text-center min-w-[140px] shadow-inner">
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">مؤشر الحضور</p>
                    <p className={`text-sm font-black ${['poor', 'average'].includes(emp.lastEval.attendance) ? 'text-red-600' : 'text-emerald-600'}`}>
                      {emp.lastEval.attendance === 'poor' ? 'عجز حاد (ضعيف)' : emp.lastEval.attendance === 'average' ? 'تحت المتوسط' : emp.lastEval.attendance}
                    </p>
                  </div>
                  <div className="px-6 py-3 bg-slate-50 rounded-2xl border border-slate-100 text-center min-w-[140px] shadow-inner">
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">الانضباط العام</p>
                    <p className={`text-sm font-black ${['warning', 'needs-improvement'].includes(emp.lastEval.discipline) ? 'text-red-600' : 'text-emerald-600'}`}>
                      {emp.lastEval.discipline === 'warning' ? 'تحذير سيادي' : emp.lastEval.discipline === 'needs-improvement' ? 'يحتاج توجيه' : emp.lastEval.discipline}
                    </p>
                  </div>
                </div>

                <div className="w-full lg:w-1/3 bg-slate-900 p-6 rounded-2xl text-white relative overflow-hidden group/training">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-accent/20 rounded-full blur-2xl -translate-y-10 translate-x-10" />
                  <p className="text-[10px] font-black text-accent uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
                    <BookOpen size={14} /> التدخل التدريبي اللازم
                  </p>
                  <div className="flex flex-wrap gap-2 relative z-10">
                    {emp.lastEval.trainingNeeds && emp.lastEval.trainingNeeds.length > 0 ? (
                      emp.lastEval.trainingNeeds.map((need: string, idx: number) => (
                        <span key={idx} className="px-3 py-1 bg-white/10 text-white text-[11px] font-bold rounded-lg border border-white/5 backdrop-blur-sm">
                          {need}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-white/40 italic">بانتظار اعتماد مسار التطوير الاستراتيجي</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-16 text-center bg-white/50 rounded-[3rem] border-2 border-dashed border-red-200 shadow-inner">
             <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Target size={40} />
             </div>
             <h4 className="text-xl font-black text-primary mb-2 italic">صفر من حالة الخطر المكتشفة</h4>
             <p className="text-xs text-text-muted font-bold">كافة وحدات الكادر تعمل ضمن النطاق الآمن للأداء المؤسسي.</p>
          </div>
        )}
      </div>

      {Object.entries(departmentData).map(([category, depts]) => (
        <div key={category} className="space-y-8 animate-in fade-in duration-1000">
          <div className="flex items-center gap-6 mb-10">
            <div className="h-[2px] bg-gradient-to-l from-primary/20 to-transparent flex-1" />
            <h3 className="text-sm font-black text-primary uppercase tracking-[0.4em] bg-bg-theme px-8">{category}</h3>
            <div className="h-[2px] bg-gradient-to-r from-primary/20 to-transparent flex-1" />
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {depts.map((dept, idx) => (
              <motion.div 
                key={dept.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`ministry-card transition-all duration-500 overflow-hidden group/dept ${
                  expandedDept === dept.name ? 'ring-2 ring-accent border-accent shadow-2xl scale-[1.01]' : 'bg-white hover:border-slate-300'
                }`}
              >
            <div 
              className="p-8 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-10"
              onClick={() => setExpandedDept(expandedDept === dept.name ? null : dept.name)}
            >
              <div className="flex items-center gap-8 flex-1">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl shadow-premium border transition-all group-hover/dept:rotate-6 ${
                  dept.averageScore >= 90 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                  dept.averageScore >= 75 ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-600 border-slate-100'
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-primary mb-2 group-hover/dept:text-accent transition-colors">{dept.name}</h3>
                  <div className="flex items-center gap-6">
                    <span className="text-[11px] font-black text-text-muted uppercase flex items-center gap-2 opacity-60">
                      <Users size={14} /> {dept.staffCount} موظف ضمن الهيكل
                    </span>
                    <span className="text-[11px] font-black text-emerald-600 uppercase flex items-center gap-2">
                       <ShieldCheck size={14} /> تقييم {dept.evaluatedCount} كادر
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-12">
                <div className="text-left">
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 opacity-50">Score Benchmark</p>
                  <p className={`text-4xl font-black tracking-tighter ${
                    dept.averageScore >= 90 ? 'text-emerald-600' :
                    dept.averageScore >= 75 ? 'text-blue-600' : 'text-amber-600'
                  }`}>%{dept.averageScore.toFixed(0)}</p>
                </div>
                
                <div className="w-[1px] h-14 bg-slate-100" />
                
                <div className="flex items-center gap-6">
                   <div className="relative w-16 h-16">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path className="text-slate-100 stroke-current" strokeWidth="3" fill="none" d="M18 1.5 a 16.5 16.5 0 0 1 0 33 a 16.5 16.5 0 0 1 0 -33" />
                        <motion.path 
                          initial={{ strokeDasharray: "0, 100" }}
                          animate={{ strokeDasharray: `${dept.completionRate}, 100` }}
                          transition={{ duration: 1.5, ease: "circOut" }}
                          className="text-primary stroke-current" 
                          strokeWidth="3.5" 
                          strokeLinecap="round"
                          fill="none" 
                          d="M18 1.5 a 16.5 16.5 0 0 1 0 33 a 16.5 16.5 0 0 1 0 -33" 
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black tracking-tighter text-primary">%{dept.completionRate.toFixed(0)}</div>
                   </div>
                   <div className={`p-2 rounded-lg transition-all ${expandedDept === dept.name ? 'bg-primary text-white rotate-180' : 'bg-slate-50 text-slate-400 group-hover/dept:bg-slate-100'}`}>
                      <ChevronDown size={20} />
                   </div>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {expandedDept === dept.name && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-slate-100 bg-slate-50/30"
                >
                  <div className="p-10">
                     <div className="ministry-card border-slate-200 overflow-hidden bg-white shadow-inner">
                        <table className="w-full text-right text-xs">
                           <thead className="bg-[#f8f9fa]/80 border-b border-slate-200">
                              <tr>
                                 <th className="px-8 py-5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">اسم الموظف الثلاثي</th>
                                 <th className="px-8 py-5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">المسمى الوظيفي المعتمد</th>
                                 <th className="px-8 py-5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">مؤشر آخر تقييم</th>
                                 <th className="px-8 py-5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] text-left">الحالة</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {dept.employees.map(emp => {
                                 const lastEval = dept.evaluations.find(e => e.employeeId === emp.id);
                                 return (
                                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                                       <td className="px-8 py-5 font-black text-primary text-sm">{emp.name}</td>
                                       <td className="px-8 py-5 font-bold text-text-muted italic">{emp.position}</td>
                                       <td className="px-8 py-5">
                                          <div className="flex items-center gap-3">
                                             <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden w-24">
                                                <div className={`h-full rounded-full ${
                                                  lastEval ? (lastEval.totalScore >= 90 ? 'bg-emerald-500' : lastEval.totalScore >= 75 ? 'bg-blue-500' : 'bg-amber-500') : 'bg-transparent'
                                                }`} style={{ width: lastEval ? `${lastEval.totalScore}%` : '0%' }} />
                                             </div>
                                             <span className="font-black text-primary min-w-[35px]">
                                                {lastEval ? `%${lastEval.totalScore.toFixed(0)}` : 'N/A'}
                                             </span>
                                          </div>
                                       </td>
                                       <td className="px-8 py-5 text-left">
                                          <span className={`px-4 py-1.5 rounded-[0.75rem] text-[10px] font-black uppercase tracking-widest shadow-sm ${
                                             lastEval ? 'bg-emerald-600 text-white' : 'bg-red-500/10 text-red-600 border border-red-200'
                                          }`}>
                                             {lastEval ? 'مكتمل دورياً' : 'متأخر معلق'}
                                          </span>
                                       </td>
                                    </tr>
                                 );
                              })}
                           </tbody>
                        </table>
                     </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatBox({ icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="p-8 flex items-center gap-5">
      <div className="p-3 bg-slate-50 rounded-2xl border border-border-theme">
        {React.cloneElement(icon as React.ReactElement<any>, { size: 24 })}
      </div>
      <div>
        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-black text-text-dark">{value}</p>
      </div>
    </div>
  );
}
