/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  Settings, 
  Menu, 
  X, 
  LogOut, 
  Bell, 
  UserCircle, 
  Globe,
  LayoutDashboard,
  ClipboardList,
  Plus,
  ShieldCheck,
  Building2,
  ArrowLeft,
  TrendingUp
} from 'lucide-react';
import Dashboard from './components/Dashboard.tsx';
import EmployeeForm from './components/EmployeeForm.tsx';
import EvaluationForm from './components/EvaluationForm.tsx';
import UserManagement from './components/UserManagement.tsx';
import Login from './components/Login.tsx';
import EvaluationHistory from './components/EvaluationHistory.tsx';
import DepartmentReports from './components/DepartmentReports.tsx';
import EmployeeDetails from './components/EmployeeDetails.tsx';
import StrategicDashboard from './components/StrategicDashboard.tsx';
import { Employee, Evaluation, User, Notification, EvaluationModel } from './types.ts';
import { motion, AnimatePresence } from 'motion/react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { db } from './db.ts';
import NotificationTray from './components/NotificationTray.tsx';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'users' | 'reports' | 'strategic'>('dashboard');

  useEffect(() => {
    const path = location.pathname;
    if (path === '/') setActiveTab('dashboard');
    else if (path === '/employees') setActiveTab('employees');
    else if (path === '/reports') setActiveTab('reports');
    else if (path === '/users') setActiveTab('users');
    else if (path === '/strategic') setActiveTab('strategic');
    else if (path.startsWith('/details')) setActiveTab('employees');
  }, [location.pathname]);

  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ministry_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const seedIfEmpty = async () => {
      // Seed Employees
      const empCount = await db.employees.count();
      if (empCount === 0) {
        const demoEmployees: Employee[] = [
          { name: 'أحمد محمد علي', employeeId: 'MET-1001', department: 'ادارة العلاقات العامة والإعلام', position: 'مدير مكتب', type: 'non-technical', category: 'internal', joinDate: '2023-01-15' },
          { name: 'سارة خالد عبدالله', employeeId: 'MET-1002', department: 'المكتب الفني', position: 'مهندس اتصالات', type: 'technical', category: 'internal', joinDate: '2023-05-20' },
          { name: 'فؤاد سالم حسن', employeeId: 'MET-1003', department: 'ادارة الموافقة النوعية', position: 'محلل بيانات', type: 'technical', category: 'contractor', joinDate: '2024-02-10' },
        ];
        
        const empIds = await db.employees.bulkAdd(demoEmployees, { allKeys: true });
        
        const now = new Date();
        const year = now.getFullYear();
        
        const demoEvaluations: Evaluation[] = [
          { 
            employeeId: Number(empIds[0]), period: 'monthly', date: `${year}-01-10`, year, month: 1, totalScore: 88, 
            attendance: 'excellent', discipline: 'committed', notes: 'أداء متميز في التنسيق الإعلامي.', 
            trainingNeeds: [],
            criteria: [{ label: 'جودة العمل الإداري', weight: 20, score: 4 }, { label: 'مهارات التواصل', weight: 20, score: 5 }] 
          },
        ];
        
        await db.evaluations.bulkAdd(demoEvaluations);
      }

      // Seed Evaluation Models
      const modelCount = await db.evaluationModels.count();
      if (modelCount === 0) {
        const defaultModels: EvaluationModel[] = [
          {
            name: 'نموذج المهندسين والتقنيين',
            positionTags: ['مهندس', 'تقني', 'محلل بيانات', 'برمجيات'],
            departmentTags: ['المكتب الفني', 'نظم المعلومات', 'الاتصالات'],
            criteria: [
              { label: 'الدقة التقنية وجودة المخرجات', weight: 30, description: 'مدى سلامة الحلول التقنية المطبقة' },
              { label: 'السرعة في الإنجاز وحل الأعطال', weight: 25, description: 'الزمن المستغرق لمعالجة الطلبات' },
              { label: 'المبادرة والابتكار التقني', weight: 25, description: 'تقديم اقتراحات لتطوير الأنظمة' },
              { label: 'العمل بروح الفريق والمعرفة المشتركة', weight: 20, description: 'مشاركة المعرفة مع الزملاء' }
            ]
          },
          {
            name: 'نموذج القياديين ومدراء المشاريع',
            positionTags: ['مدير', 'رئيس', 'قائد'],
            departmentTags: ['الإدارة العامة', 'التخطيط'],
            criteria: [
              { label: 'المهارات القيادية واتخاذ القرار', weight: 30, description: 'القدرة على توجيه الفريق' },
              { label: 'إدارة الموارد والوقت', weight: 25, description: 'الاستغلال الأمثل للموارد' },
              { label: 'تحقيق الأهداف الاستراتيجية', weight: 25, description: 'مدى مطابقة الإنجاز للخطة' },
              { label: 'التطوير الذاتي وتطوير فريق العمل', weight: 20, description: 'الاستثمار في الكادر' }
            ]
          },
          {
            name: 'نموذج الإداريين والسكرتارية',
            positionTags: ['إداري', 'سكرتير', 'منسق'],
            departmentTags: ['العلاقات العامة', 'الموارد البشرية'],
            criteria: [
              { label: 'الدقة في المراسلات والأرشفة', weight: 30, description: 'جودة وتنظيم العمل المكتبي' },
              { label: 'التواصل الفعال مع الجمهور', weight: 20, description: 'لباقة التعامل' },
              { label: 'سرعة الاستجابة للطلبات الإدارية', weight: 25, description: 'كفاءة التنفيذ' },
              { label: 'الالتزام الكامل باللوائح المنظمة', weight: 25, description: 'الانضباط المؤسسي' }
            ]
          }
        ];
        await db.evaluationModels.bulkAdd(defaultModels);
      }
      
      setRefreshTrigger(prev => prev + 1);
    };
    seedIfEmpty();
  }, []);

  useEffect(() => {
    if (currentUser) {
      updateNotifications();
    }
  }, [refreshTrigger, currentUser]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('ministry_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('ministry_user');
    setActiveTab('dashboard');
    setShowLogoutConfirm(false);
  };

  const updateNotifications = async () => {
    const employees = await db.employees.toArray();
    const newNotifs: Notification[] = [];
    const now = new Date();

    for (const emp of employees) {
      const allEvals = await db.evaluations
        .where('employeeId')
        .equals(emp.id!)
        .toArray();
      
      // Sort manually to be sure
      const sortedEvals = allEvals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const last = sortedEvals[0];
      
      if (!last) {
        const joined = new Date(emp.joinDate);
        const diffDays = Math.floor((now.getTime() - joined.getTime()) / (1000 * 3600 * 24));
        if (diffDays > 30) {
          newNotifs.push({
            id: `overdue-${emp.id}`,
            type: 'overdue',
            title: 'تقييم أول متأخر',
            message: `الموظف ${emp.name} لم يتم تقييمه منذ انضمامه قبل ${diffDays} يوم. يرجى المباشرة بالتقييم فوراً.`,
            date: emp.joinDate,
            employeeId: emp.id!
          });
        } else if (diffDays > 20) {
          newNotifs.push({
            id: `upcoming-${emp.id}`,
            type: 'upcoming',
            title: 'تقييم أول استباقي',
            message: `الموظف الجديد ${emp.name} يستحق تقييماً أولياً قريباً.`,
            date: emp.joinDate,
            employeeId: emp.id!,
            remainingDays: 30 - diffDays
          });
        }
      } else {
        const lastDate = new Date(last.date);
        const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
        
        let limit = 30; // default monthly
        if (last.period === 'quarterly') limit = 90;
        if (last.period === 'semi-annual') limit = 180;
        if (last.period === 'annual') limit = 365;

        if (diffDays > limit) {
          newNotifs.push({
            id: `overdue-eval-${emp.id}`,
            type: 'overdue',
            title: 'تقييم دوري متأخر',
            message: `الموظف ${emp.name} تجاوز دورة التقييم ال${last.period === 'monthly' ? 'شهرية' : 'قانونية'} بـ ${diffDays - limit} أيام.`,
            date: last.date,
            employeeId: emp.id!
          });
        } else if (diffDays > (limit - 10)) {
          newNotifs.push({
            id: `upcoming-eval-${emp.id}`,
            type: 'upcoming',
            title: 'تنبيه استباقي لموعد تقييم',
            message: `الموظف ${emp.name} يقترب من موعد تقييمه الدوري القادم (بعد ${limit - diffDays} أيام).`,
            date: last.date,
            employeeId: emp.id!,
            remainingDays: limit - diffDays
          });
        }

        // Performance Drop Detection
        const empEvals = allEvals.filter(e => e.employeeId === emp.id).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        if (empEvals.length >= 2) {
          const latest = empEvals[empEvals.length - 1];
          const previousEvals = empEvals.slice(0, -1);
          const avgScore = previousEvals.reduce((acc, curr) => acc + curr.totalScore, 0) / previousEvals.length;
          
          if (latest.totalScore < avgScore * 0.85) { // 15% drop
            newNotifs.push({
              id: `perf-alert-${emp.id}`,
              type: 'performance-alert',
              title: 'تنبيه هبوط مستوى الأداء',
              message: `لوحظ هبوط حاد في أداء ${emp.name} (بنسبة ${(avgScore - latest.totalScore).toFixed(1)}%). يوصى بمراجعة الأسباب ومناقشة التقرير مع الموظف.`,
              date: latest.date,
              employeeId: emp.id!,
              scoreDrop: avgScore - latest.totalScore
            });
          }
        }
      }
    }
    setNotifications(newNotifs);
  };

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  const handleNotifAction = async (employeeId: number) => {
    const emp = await db.employees.get(employeeId);
    if (emp) setSelectedEmployee(emp);
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-bg-theme flex font-sans text-text-dark selection:bg-accent/30" dir="rtl">
      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] lg:hidden"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-[280px] bg-primary z-[101] lg:hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-primary shadow-lg shadow-accent/20">
                    <Building2 size={18} />
                  </div>
                  <span className="font-black text-sm uppercase tracking-widest text-white">نظام التقييم</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-white/70">
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 py-6 px-4 space-y-2">
                <MobileNavItem 
                  active={activeTab === 'dashboard'} 
                  onClick={() => { navigate('/'); setIsMobileMenuOpen(false); }}
                  icon={<LayoutDashboard size={20} />}
                  label="لوحة التحكم"
                />
                <MobileNavItem 
                  active={activeTab === 'employees'} 
                  onClick={() => { navigate('/employees'); setIsMobileMenuOpen(false); }}
                  icon={<Users size={20} />}
                  label="قاعدة بيانات الكادر"
                />
                {currentUser.role === 'admin' && (
                  <MobileNavItem 
                    active={activeTab === 'users'} 
                    onClick={() => { navigate('/users'); setIsMobileMenuOpen(false); }}
                    icon={<ShieldCheck size={20} />}
                    label="إدارة المستخدمين"
                  />
                )}
                <MobileNavItem 
                  active={activeTab === 'strategic'} 
                  onClick={() => { navigate('/strategic'); setIsMobileMenuOpen(false); }}
                  icon={<ShieldCheck size={20} />}
                  label="الذكاء الاستراتيجي"
                />
                <MobileNavItem 
                  active={activeTab === 'reports'} 
                  onClick={() => { navigate('/reports'); setIsMobileMenuOpen(false); }}
                  icon={<BarChart3 size={20} />}
                  label="تقارير الإدارات"
                />
              </nav>

              <div className="p-6 border-t border-white/10 bg-black/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center">
                    <UserCircle className="w-6 h-6 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white truncate">{currentUser.fullName}</p>
                    <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest">
                      {currentUser.role === 'admin' ? 'مدير النظام' : 'مسؤول تقييم'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-3 rounded-xl text-xs font-black transition-all border border-red-500/20 shadow-sm"
                >
                  <LogOut size={14} /> تسجيل الخروج
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Rail Sidebar */}
      <aside 
        className={`hidden lg:flex flex-col border-l border-border-theme bg-primary text-white sticky top-0 h-screen transition-all duration-500 ease-in-out z-50 overflow-hidden ${isSidebarOpen ? 'w-64' : 'w-20'}`}
      >
        <div className="h-20 flex items-center px-6 border-b border-white/5 shrink-0 overflow-hidden">
          <div className="flex items-center gap-4 min-w-[200px]">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-primary shadow-lg shadow-accent/20 shrink-0">
              <Building2 size={18} />
            </div>
            <motion.span 
              animate={{ opacity: isSidebarOpen ? 1 : 0, x: isSidebarOpen ? 0 : 20 }}
              className="font-black text-xs uppercase tracking-widest text-white whitespace-nowrap"
            >
              نظام التقييم
            </motion.span>
          </div>
        </div>

        <nav className="flex-1 py-8 px-3 space-y-2 overflow-y-auto no-scrollbar">
          <NavItem 
            active={activeTab === 'dashboard'} 
            expanded={isSidebarOpen}
            onClick={() => navigate('/')}
            icon={<LayoutDashboard size={20} />}
            label="لوحة التحكم"
          />
          <NavItem 
            active={activeTab === 'employees'} 
            expanded={isSidebarOpen}
            onClick={() => navigate('/employees')}
            icon={<Users size={20} />}
            label="قاعدة بيانات الكادر"
          />
          {currentUser.role === 'admin' && (
            <NavItem 
              active={activeTab === 'users'} 
              expanded={isSidebarOpen}
              onClick={() => navigate('/users')}
              icon={<ShieldCheck size={20} />}
              label="إدارة المستخدمين"
            />
          )}
          <NavItem 
            active={activeTab === 'strategic'} 
            expanded={isSidebarOpen}
            onClick={() => navigate('/strategic')}
            icon={<ShieldCheck size={20} />}
            label="الذكاء الاستراتيجي"
          />
          <NavItem 
            active={activeTab === 'reports'} 
            expanded={isSidebarOpen}
            onClick={() => navigate('/reports')}
            icon={<BarChart3 size={20} />}
            label="تقارير الإدارات"
          />
        </nav>

        <div className="p-4 border-t border-white/5 bg-black/10">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center justify-center p-2 hover:bg-white/5 rounded-lg text-white/50 hover:text-white transition-colors"
          >
            <motion.div animate={{ rotate: isSidebarOpen ? 0 : 180 }}>
              <ArrowLeft size={18} />
            </motion.div>
          </button>
          
          <div className="mt-4 overflow-hidden">
            <div className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${isSidebarOpen ? 'bg-white/5' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0">
                <UserCircle className="w-5 h-5 text-accent" />
              </div>
              {isSidebarOpen && (
                <div className="min-w-0">
                  <p className="text-[11px] font-black truncate">{currentUser.fullName}</p>
                  <p className="text-[9px] text-white/40 font-bold uppercase tracking-tighter">
                    {currentUser.role === 'admin' ? 'مدير النظام' : 'مسؤول تقييم'}
                  </p>
                </div>
              )}
            </div>
            {isSidebarOpen && (
              <button 
                onClick={handleLogout}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-red-500/10 hover:text-red-400 py-2.5 rounded-xl text-[10px] font-black transition-all border border-transparent hover:border-red-500/20"
              >
                <LogOut size={12} /> تسجيل الخروج
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header (Glass Morph) */}
        <header className="h-20 shrink-0 glass flex items-center justify-between px-6 md:px-10 sticky top-0 z-[60] border-b-2 border-accent/20">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2.5 bg-primary text-white rounded-xl shadow-lg shadow-primary/10 hover:scale-105 active:scale-95 transition-all"
            >
              <Menu size={22} />
            </button>
            
            <div className="flex items-center gap-4 group">
              <div className="w-12 h-12 bg-white p-1 rounded-2xl shadow-sm border border-border-theme transition-transform group-hover:scale-110">
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/8/87/%D8%B4%D8%B9%D8%A7%D8%B1_%D8%A7%D9%84%D8%AC%D9%85%D9%87%D9%88%D8%B1%D9%8A%D8%A9_%D8%A7%D9%84%D9%8I%D9%85%D9%86%D9%8A%D8%A9.png" 
                  alt="شعار الوزارة" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="brand-text hidden sm:block">
                <div className="flex items-center gap-3">
                  <h1 className="text-md font-black text-primary leading-none tracking-tight">منصة التقييم المؤسسي</h1>
                  <div className="h-4 w-[2px] bg-accent/30 rounded-full" />
                  <span className="text-[11px] font-black text-accent bg-accent/10 px-3 py-1 rounded-lg uppercase tracking-wider">
                    {activeTab === 'dashboard' ? 'لوحة القيادة' : 
                     activeTab === 'employees' ? 'الكادر الوظيفي' : 
                     activeTab === 'reports' ? 'التقارير' : 'الصلاحيات'}
                  </span>
                </div>
                <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest mt-1">وزارة الاتصالات وتقنية المعلومات</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-5">
            <div className="hidden xl:flex items-center gap-3 bg-slate-100/50 rounded-2xl px-4 py-2 border border-border-theme">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">اتصال آمن مع قاعدة البيانات</span>
            </div>

            <div className="h-8 w-[1px] bg-border-theme mx-2 hidden sm:block" />

            <div className="flex items-center gap-3">
              <div 
                className="relative p-2.5 rounded-xl bg-white border border-border-theme text-primary hover:bg-slate-50 transition-all cursor-pointer group"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={20} className="group-hover:rotate-12 transition-transform" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center animate-bounce shadow-lg">
                    {notifications.length}
                  </span>
                )}
              </div>
              
              <NotificationTray 
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
                notifications={notifications}
                onAction={handleNotifAction}
              />

              <div className="hidden md:flex items-center gap-3 bg-white border border-border-theme rounded-2xl p-1.5 pl-4 hover:shadow-md transition-shadow cursor-default">
                 <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-black text-xs shadow-sm shadow-primary/20 capitalize">
                    {currentUser.fullName.charAt(0)}
                 </div>
                 <div className="text-right">
                    <p className="text-[11px] font-black leading-tight text-primary">{currentUser.fullName.split(' ')[0]}</p>
                    <p className="text-[9px] text-accent font-bold uppercase tracking-widest">{currentUser.department || 'إدارة التقييم'}</p>
                 </div>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto bg-bg-theme relative scroll-smooth no-scrollbar">
          {/* Background Decorative Elements */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px] -z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

          <div className="p-6 md:p-10 max-w-[1600px] mx-auto min-h-full flex flex-col">
            <div className="mb-8">
               <motion.div 
                 key={location.pathname}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="flex items-center gap-3 mb-2"
               >
                 <div className="w-1.5 h-6 bg-accent rounded-full" />
                 <h2 className="text-2xl font-black text-primary tracking-tight">
                    {activeTab === 'dashboard' ? 'لوحة المعلومات والذكاء' : 
                     activeTab === 'employees' ? 'إدارة بيانات القوة البشرية' : 
                     activeTab === 'reports' ? 'التقارير التحليلية والمؤشرات' : 
                     'إدارة الهوية والصلاحيات'}
                 </h2>
               </motion.div>
               <p className="text-[12px] text-text-muted font-bold opacity-70">
                  {activeTab === 'dashboard' ? 'نظرة عامة على مؤشرات الأداء وتنبيهات النظام' : 
                   activeTab === 'employees' ? 'السجل الإلكتروني الشامل لكادر الوزارة' : 
                   activeTab === 'reports' ? 'تحليل التنافسية والإنجاز على مستوى القطاعات' : 
                   'إعداد الحسابات وصلاحيات الوصول للنظام'}
               </p>
            </div>

            <div className="flex-1">
              <Routes>
                <Route path="/" element={
                  <Dashboard 
                    user={currentUser}
                    onUpdateUser={handleLogin}
                    refreshTrigger={refreshTrigger}
                    onAddEmployee={() => { setEditingEmployee(null); setShowAddEmployee(true); }}
                    onEditEmployee={(emp) => { setEditingEmployee(emp); setShowAddEmployee(true); }}
                    onEvaluateUser={(emp) => setSelectedEmployee(emp)}
                  />
                } />
                <Route path="/employees" element={
                  <Dashboard 
                    user={currentUser}
                    onUpdateUser={handleLogin}
                    refreshTrigger={refreshTrigger}
                    onAddEmployee={() => { setEditingEmployee(null); setShowAddEmployee(true); }}
                    onEditEmployee={(emp) => { setEditingEmployee(emp); setShowAddEmployee(true); }}
                    onEvaluateUser={(emp) => setSelectedEmployee(emp)}
                  />
                } />
                <Route path="/reports" element={<DepartmentReports />} />
                <Route path="/users" element={
                  currentUser?.role === 'admin' ? <UserManagement /> : <Dashboard 
                    user={currentUser} 
                    onUpdateUser={handleLogin} 
                    refreshTrigger={refreshTrigger} 
                    onAddEmployee={() => { setEditingEmployee(null); setShowAddEmployee(true); }} 
                    onEditEmployee={(emp) => { setEditingEmployee(emp); setShowAddEmployee(true); }}
                    onEvaluateUser={(emp) => setSelectedEmployee(emp)} 
                  />
                } />
                <Route path="/strategic" element={<StrategicDashboard />} />
                <Route path="/details/:id" element={
                  <EmployeeDetails 
                    onEditEmployee={(emp) => { setEditingEmployee(emp); setShowAddEmployee(true); }}
                    onEvaluateUser={(emp) => setSelectedEmployee(emp)}
                  />
                } />
              </Routes>
            </div>

            {/* Micro Footer */}
            <footer className="mt-12 py-8 border-t border-border-theme/60 flex flex-col md:flex-row items-center justify-between gap-4 opacity-50 hover:opacity-100 transition-opacity">
               <div className="flex items-center gap-3">
                  <Globe size={14} className="text-primary" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">المكتب الفني - الموارد البشرية</p>
               </div>
               <p className="text-[10px] font-bold text-text-muted text-center md:text-right">
                تصميم وتطوير: م. وائل صلاح القاسمي © {new Date().getFullYear()} - وزارة الاتصالات وتقنية المعلومات اليمنية
               </p>
            </footer>
          </div>
        </div>

        {/* Quick Actions (Floating) */}
        <div className="fixed bottom-8 left-8 z-[50]">
           <button 
             onClick={() => { setEditingEmployee(null); setShowAddEmployee(true); }}
             className="w-14 h-14 bg-accent text-primary rounded-full shadow-2xl shadow-accent/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
             title="إضافة موظف سريع"
           >
             <Plus size={28} className="group-hover:rotate-90 transition-transform duration-500" />
           </button>
        </div>
      </main>


      {/* Modals */}
      <AnimatePresence>
        {showAddEmployee && (
          <EmployeeForm 
            onClose={() => { setShowAddEmployee(false); setEditingEmployee(null); }} 
            onSuccess={triggerRefresh}
            employee={editingEmployee}
          />
        )}
        {selectedEmployee && (
          <EvaluationForm 
            employee={selectedEmployee} 
            onClose={() => setSelectedEmployee(null)} 
            onSuccess={triggerRefresh} 
          />
        )}
      </AnimatePresence>

      {/* Confirmation Dialogs */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[200]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-border-theme text-right"
            >
              <div className="bg-slate-900 p-6 text-white text-center border-b-4 border-red-500">
                 <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                   <LogOut className="w-8 h-8 text-red-400" />
                 </div>
                 <h3 className="text-xl font-black uppercase tracking-wide">تسجيل الخروج</h3>
                 <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest mt-1">هل أنت متأكد من رغبتك في تسجيل الخروج؟</p>
              </div>

              <div className="p-8 space-y-4">
                <button
                  onClick={confirmLogout}
                  className="w-full py-4 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-xl shadow-red-200 border-b-4 border-red-800 active:translate-y-1"
                >
                  نعم، سجل الخروج
                </button>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="w-full py-3 bg-white text-text-muted font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all border border-border-theme"
                >
                  إلغاء العملية
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ active, expanded, onClick, icon, label }: { active: boolean, expanded: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`group w-full flex items-center gap-4 p-3.5 rounded-2xl text-xs font-black transition-all duration-300 relative ${
        active 
        ? 'bg-accent text-primary shadow-lg shadow-accent/20' 
        : 'text-white/50 hover:text-white hover:bg-white/5'
      }`}
    >
      <div className={`transition-transform duration-300 shrink-0 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
        {icon}
      </div>
      
      {expanded && (
        <motion.span 
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="whitespace-nowrap tracking-wide"
        >
          {label}
        </motion.span>
      )}

      {active && !expanded && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-accent rounded-l-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
      )}

      {/* Tooltip for collapsed mode */}
      {!expanded && (
        <div className="absolute right-full mr-4 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-black opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap shadow-xl z-[100] border border-white/10">
          {label}
          <div className="absolute left-full top-1/2 -translate-y-1/2 border-8 border-transparent border-l-slate-900" />
        </div>
      )}
    </button>
  );
}

function MobileNavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl text-sm font-black transition-all ${
        active 
        ? 'bg-accent text-primary shadow-xl shadow-accent/20 translate-x--2' 
        : 'text-white/50 hover:bg-white/5'
      }`}
    >
      <div className={active ? 'scale-110' : ''}>{icon}</div>
      <span>{label}</span>
    </button>
  );
}

