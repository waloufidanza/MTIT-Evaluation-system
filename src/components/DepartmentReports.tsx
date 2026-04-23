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
  BookOpen
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
    <div className="space-y-12 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white rounded-[2.5rem] border border-border-theme shadow-sm overflow-hidden">
        <div className="p-8 border-b-4 border-accent bg-primary text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl">
              <Building2 size={32} className="text-accent" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-wide italic">تقارير الهيكل التنظيمي للوزارة</h2>
              <p className="text-[11px] text-white/70 font-bold uppercase tracking-[0.2em] mt-1">تحليل الأداء الوظيفي حسب القطاعات الرئيسية</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-border-theme">
          <StatBox 
             icon={<Users className="text-blue-500" />}
             label="إجمالي القطاعات النشطة"
             value={Object.keys(departmentData).length.toString()}
          />
          <StatBox 
             icon={<Target className="text-emerald-500" />}
             label="أعلى نسبة إنجاز"
             value={`${Math.max(...Object.values(departmentData).flat().map(d => d.completionRate), 0).toFixed(0)}%`}
          />
          <StatBox 
             icon={<Award className="text-amber-500" />}
             label="المتوسط العام للوزارة"
             value={`${(Object.values(departmentData).flat().reduce((acc, d) => acc + d.averageScore, 0) / (Object.values(departmentData).flat().length || 1)).toFixed(1)}%`}
          />
        </div>
      </div>

      {/* Filters and Sorting */}
      <div className="bg-white rounded-xl border border-border-theme p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm mb-8">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-2 bg-slate-50 border border-border-theme rounded-lg text-primary">
            <Filter size={18} />
          </div>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-transparent text-xs font-black uppercase tracking-wider outline-none cursor-pointer p-1"
          >
            <option value="All">كافة القطاعات</option>
            {Object.keys(CATEGORIES).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
            <option value="أخرى / غير مصنف">أخرى / غير مصنف</option>
          </select>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest whitespace-nowrap">فرز حسب:</span>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-border-theme rounded px-3 py-1.5 text-[11px] font-bold outline-none cursor-pointer focus:ring-1 focus:ring-primary transition-all"
            >
              <option value="score">متوسط الأداء</option>
              <option value="staffCount">عدد الكادر</option>
              <option value="rate">نسبة الإنجاز</option>
              <option value="name">الاسم</option>
            </select>
          </div>
          <button 
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="p-2 bg-white border border-border-theme rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            title={sortOrder === 'asc' ? 'ترتيب تنازلي' : 'ترتيب تصاعدي'}
          >
            <ArrowUpDown size={16} className={sortOrder === 'asc' ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
          
          <div className="w-px h-6 bg-border-theme hidden md:block mx-2" />

          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-[11px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200"
          >
            <Download size={14} /> تصدير CSV
          </button>
        </div>
      </div>

      {/* Alerts & Training Needs Section */}
      <div className="bg-red-50/50 border border-red-100 rounded-[2.5rem] p-8 mb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h3 className="text-sm font-bold text-red-600 uppercase tracking-widest flex items-center gap-2">
              <ShieldAlert size={20} /> تقرير التنبيهات والاحتياجات التدريبية
            </h3>
            <p className="text-[10px] text-red-600/70 font-bold mt-1 uppercase">حصر الكادر ذوي الأداء المنخفض في الانضباط أو الحضور</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-red-100 shadow-sm">
             <AlertTriangle size={14} className="text-red-500" />
             <span className="text-[11px] font-black text-red-600">إجمالي التنبيهات: {alertEmployees.length}</span>
          </div>
        </div>

        {alertEmployees.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {alertEmployees.map(emp => (
              <motion.div 
                key={emp.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                className="bg-white rounded-2xl p-6 border border-red-100 shadow-sm flex flex-col lg:flex-row items-center gap-6"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center font-black uppercase">
                    {emp.name[0]}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-text-dark">{emp.name}</h4>
                    <p className="text-[10px] text-text-muted font-bold uppercase truncate">{emp.position} - {emp.department}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="px-4 py-2 bg-slate-50 rounded-xl border border-border-theme text-center min-w-[120px]">
                    <p className="text-[8px] font-black text-text-muted uppercase mb-1">حالة الحضور</p>
                    <p className={`text-[10px] font-black ${['poor', 'average'].includes(emp.lastEval.attendance) ? 'text-red-600' : 'text-emerald-600'}`}>
                      {emp.lastEval.attendance === 'poor' ? 'تحذير (ضعيف)' : emp.lastEval.attendance === 'average' ? 'يحتاج تحسين' : emp.lastEval.attendance}
                    </p>
                  </div>
                  <div className="px-4 py-2 bg-slate-50 rounded-xl border border-border-theme text-center min-w-[120px]">
                    <p className="text-[8px] font-black text-text-muted uppercase mb-1">الالتزام السلوكي</p>
                    <p className={`text-[10px] font-black ${['warning', 'needs-improvement'].includes(emp.lastEval.discipline) ? 'text-red-600' : 'text-emerald-600'}`}>
                      {emp.lastEval.discipline === 'warning' ? 'تحذير إداري' : emp.lastEval.discipline === 'needs-improvement' ? 'يحتاج تحسين' : emp.lastEval.discipline}
                    </p>
                  </div>
                </div>

                <div className="w-full lg:w-1/3 bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                  <p className="text-[9px] font-black text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <BookOpen size={12} /> الاحتياجات التدريبية المقترحة
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {emp.lastEval.trainingNeeds && emp.lastEval.trainingNeeds.length > 0 ? (
                      emp.lastEval.trainingNeeds.map((need: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-white text-amber-700 text-[9px] font-bold rounded-md border border-amber-200">
                          {need}
                        </span>
                      ))
                    ) : (
                      <span className="text-[9px] text-amber-600 italic">بانتظار تحديد المسار التدريبي</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-white/50 rounded-2xl border border-dashed border-red-200">
             <p className="text-sm text-red-400 font-bold italic">لا توجد تنبيهات نشطة حالياً. كافة الكادر ضمن مستويات الأداء المطلوبة.</p>
          </div>
        )}
      </div>

      {Object.entries(departmentData).map(([category, depts]) => (
        <div key={category} className="space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px bg-border-theme flex-1" />
            <h3 className="text-xs font-black text-primary uppercase tracking-[0.3em] bg-bg-theme px-4">{category}</h3>
            <div className="h-px bg-border-theme flex-1" />
          </div>
          
          <div className="space-y-4">
            {depts.map((dept, idx) => (
              <motion.div 
                key={dept.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`bg-white rounded-xl border transition-all duration-300 overflow-hidden ${
                  expandedDept === dept.name ? 'border-primary ring-1 ring-primary/20 shadow-xl' : 'border-border-theme shadow-sm hover:border-text-muted/20'
                }`}
              >
            <div 
              className="p-6 cursor-pointer flex items-center justify-between gap-6"
              onClick={() => setExpandedDept(expandedDept === dept.name ? null : dept.name)}
            >
              <div className="flex items-center gap-5 flex-1">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-black text-xl ${
                  dept.averageScore >= 90 ? 'bg-emerald-100 text-emerald-700' :
                  dept.averageScore >= 75 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-black text-text-dark">{dept.name}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-[10px] font-bold text-text-muted uppercase flex items-center gap-1">
                      <Users size={12} /> {dept.staffCount} موظف
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1">
                      <TrendingUp size={12} /> تم تقييم {dept.evaluatedCount}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-left">
                  <p className="text-[10px] font-black text-text-muted uppercase mb-1">متوسط الأداء</p>
                  <p className={`text-2xl font-black ${
                    dept.averageScore >= 90 ? 'text-emerald-600' :
                    dept.averageScore >= 75 ? 'text-blue-600' : 'text-amber-600'
                  }`}>%{dept.averageScore.toFixed(0)}</p>
                </div>
                
                <div className="w-px h-10 bg-border-theme" />
                
                <div className="flex items-center gap-3">
                   <div className="relative w-12 h-12">
                      <svg className="w-full h-full" viewBox="0 0 36 36">
                        <path className="text-slate-100 stroke-current" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="text-primary stroke-current" strokeWidth="3" strokeDasharray={`${dept.completionRate}, 100`} fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold">%{dept.completionRate.toFixed(0)}</div>
                   </div>
                   {expandedDept === dept.name ? <ChevronUp size={20} className="text-text-muted" /> : <ChevronDown size={20} className="text-text-muted" />}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {expandedDept === dept.name && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-border-theme bg-slate-50/50"
                >
                  <div className="p-8">
                     <div className="bg-white rounded-xl border border-border-theme overflow-hidden">
                        <table className="w-full text-right text-xs">
                           <thead className="bg-[#f8f9fa] border-b border-border-theme">
                              <tr>
                                 <th className="px-6 py-4 font-black text-text-muted uppercase tracking-wider">اسم الموظف</th>
                                 <th className="px-6 py-4 font-black text-text-muted uppercase tracking-wider">المسمى الوظيفي</th>
                                 <th className="px-6 py-4 font-black text-text-muted uppercase tracking-wider">آخر تقييم</th>
                                 <th className="px-6 py-4 font-black text-text-muted uppercase tracking-wider text-left">الحالة</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-border-theme">
                              {dept.employees.map(emp => {
                                 const lastEval = dept.evaluations.find(e => e.employeeId === emp.id);
                                 return (
                                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                                       <td className="px-6 py-4 font-bold text-text-dark">{emp.name}</td>
                                       <td className="px-6 py-4 text-text-muted">{emp.position}</td>
                                       <td className="px-6 py-4 font-black text-primary">
                                          {lastEval ? `%${lastEval.totalScore.toFixed(0)}` : 'لم يتم التقييم'}
                                       </td>
                                       <td className="px-6 py-4 text-left">
                                          <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${
                                             lastEval ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                          }`}>
                                             {lastEval ? 'مكتمل' : 'معلق'}
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
