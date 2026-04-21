/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../db.ts';
import { Employee, StaffType, EmployeeCategory } from '../types.ts';
import { UserPlus, X, Briefcase, Hash, Building2, User, Save, Users2, Calendar, ArrowLeft, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EmployeeFormProps {
  onClose: () => void;
  onSuccess: () => void;
  employee?: Employee | null;
}

export default function EmployeeForm({ onClose, onSuccess, employee }: EmployeeFormProps) {
  const [formData, setFormData] = useState<Omit<Employee, 'id'> & { id?: number }>({
    name: '',
    employeeId: '',
    department: '',
    position: '',
    type: 'technical' as StaffType,
    category: 'internal' as EmployeeCategory,
    joinDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (employee) {
      setFormData(employee);
    }
  }, [employee]);

  const DEPARTMENTS = [
    'وكلاء وزارة الاتصالات',
    'مكتب الوزير',
    'مستشارين الوزير',
    'ادارة الشؤون القانونية',
    'ادارة الرقابة والتفتيش',
    'ادارة العلاقات العامة والإعلام',
    'الإدارة العامة للمتابعة والتنسيق',
    'الإدارة العامة للشؤون المالية',
    'الإدارة العامة لشؤون الموظفين',
    'المكتب الفني',
    'الإدارة العامة للتخطيط والعلاقات الدولية',
    'الإدارة العامة لشؤون تنظيم البريد',
    'الإدارة العامة لشؤون تنظيم الاتصالات',
    'ادارة التراخيص',
    'ادارة الموافقة النوعية',
    'ادارة الهاتف النقال',
    'الإدارة العامة لتنظيم استخدام الترددات',
    'ادارة الاجور',
    'المؤسسة العامة للاتصالات السلكية واللاسلكية',
    'الهيئة العامة للبريد والتوفير البريدي',
    'الشركة اليمنية للاتصالات الدولية (تيليمن)',
    'مشروع تطوير وتحسين الاتصالات (عدن نت)',
    'شركات الهاتف النقال'
  ];

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      // Duplicate and Conflict Checks
      const existingByName = await db.employees
        .where('name')
        .equals(formData.name.trim())
        .first();
        
      const existingByCode = await db.employees
        .where('employeeId')
        .equals(formData.employeeId.trim())
        .first();

      // If adding new OR editing as a different record
      if (existingByName && existingByName.id !== formData.id) {
        setError(`اسم الموظف "${formData.name}" موجود مسبقاً في السجل`);
        return;
      }
      
      if (existingByCode && existingByCode.id !== formData.id) {
        setError(`الرقم الوظيفي "${formData.employeeId}" مستخدم مسبقاً للموظف: ${existingByCode.name}`);
        return;
      }

      if (formData.id) {
        await db.employees.put(formData as Employee);
      } else {
        await db.employees.add(formData as Employee);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to save employee data:", err);
      const errorMsg = err instanceof Error ? err.message : "حدث خطأ غير معروف";
      setError(`فشل حفظ البيانات: ${errorMsg}`);
    }
  };

  const [hasSecondDept, setHasSecondDept] = useState(!!employee?.secondDepartment);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative my-8"
      >
        <div className="bg-primary p-6 text-white flex justify-between items-center border-b-4 border-accent">
          <div className="flex items-center gap-3">
            <UserPlus className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-bold">{formData.id ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-600 text-xs font-bold flex items-center gap-3"
              >
                <AlertTriangle size={16} className="shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black text-text-muted flex items-center gap-2 uppercase tracking-widest mb-1">
                <User className="w-3 h-3 text-primary" /> اسم الموظف كما في الهوية
              </label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border-theme focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-bold bg-slate-50"
                placeholder="أحمد يحيى الخالد"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-text-muted flex items-center gap-2 uppercase tracking-widest mb-1">
                <Hash className="w-3 h-3 text-primary" /> الرقم الوظيفي
              </label>
              <input
                required
                type="text"
                value={formData.employeeId}
                onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border-theme focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-black bg-slate-50"
                placeholder="0001"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-text-muted flex items-center gap-2 uppercase tracking-widest mb-1">
                <Briefcase className="w-3 h-3 text-primary" /> المسمى الوظيفي الحالي
              </label>
              <input
                required
                type="text"
                value={formData.position}
                onChange={e => setFormData({ ...formData, position: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border-theme focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-bold bg-slate-50"
                placeholder="باحث قانوني"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] font-black text-text-muted flex items-center gap-2 uppercase tracking-widest mb-1">
                <Building2 className="w-3 h-3 text-primary" /> الإدارة العامة الرئيسية
              </label>
              <select
                required
                value={formData.department}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border-theme focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-bold bg-white"
              >
                <option value="">اختر الإدارة...</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
                <option value="أخرى">أخرى / غير مدرج</option>
              </select>
            </div>

            {/* Borrowed / Second Department Logic */}
            <div className="md:col-span-2 space-y-4 pt-2">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-border-theme hover:bg-slate-50 cursor-pointer transition-colors group">
                <input 
                  type="checkbox"
                  checked={hasSecondDept}
                  onChange={e => {
                    setHasSecondDept(e.target.checked);
                    if (!e.target.checked) setFormData({ ...formData, secondDepartment: undefined });
                  }}
                  className="w-4 h-4 accent-primary"
                />
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-text-dark uppercase tracking-tight">هل الموظف مستعان به في إدارة أخرى؟</span>
                  <span className="text-[9px] text-text-muted font-bold">تفعيل هذا الخيار يسمح بتقديم تقييمات منفصلة لكل إدارة</span>
                </div>
              </label>

              <AnimatePresence>
                {hasSecondDept && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-1"
                  >
                    <label className="text-[10px] font-black text-secondary flex items-center gap-2 uppercase tracking-widest mb-1 bg-secondary/5 p-2 rounded w-fit">
                      <Building2 className="w-3 h-3" /> الإدارة المستعان بها (الإضافية)
                    </label>
                    <select
                      required={hasSecondDept}
                      value={formData.secondDepartment || ''}
                      onChange={e => setFormData({ ...formData, secondDepartment: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-secondary/20 focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all text-sm font-bold bg-white"
                    >
                      <option value="">اختر الإدارة المستعان بها...</option>
                      {DEPARTMENTS.map(dept => (
                        <option key={dept} value={dept} disabled={dept === formData.department}>{dept}</option>
                      ))}
                    </select>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-text-muted flex items-center gap-2 uppercase tracking-widest mb-1">
                <Calendar className="w-3 h-3 text-primary" /> تاريخ المباشرة
              </label>
              <input
                required
                type="date"
                value={formData.joinDate}
                onChange={e => setFormData({ ...formData, joinDate: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border-theme focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-bold bg-slate-50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-text-muted flex items-center gap-2 uppercase tracking-widest mb-1">
                <Users2 className="w-3 h-3 text-primary" /> فئة التوظيف
              </label>
              <select
                required
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value as EmployeeCategory })}
                className="w-full px-4 py-3 rounded-xl border border-border-theme focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-bold bg-white"
              >
                <option value="internal">موظف رسمي</option>
                <option value="consultant">مستشار</option>
                <option value="contractor">متعاقد</option>
              </select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">نوع الكادر الوظيفي المهني</label>
              <div className="flex gap-4">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    checked={formData.type === 'technical'}
                    onChange={() => setFormData({ ...formData, type: 'technical' })}
                    className="hidden peer"
                  />
                  <div className="py-4 text-center rounded-xl border border-border-theme peer-checked:bg-primary peer-checked:text-white peer-checked:border-primary transition-all font-black text-xs uppercase tracking-widest shadow-sm hover:bg-slate-50 peer-checked:hover:bg-primary">
                    كادر فني / تقني
                  </div>
                </label>
                <label className="flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    checked={formData.type === 'non-technical'}
                    onChange={() => setFormData({ ...formData, type: 'non-technical' })}
                    className="hidden peer"
                  />
                  <div className="py-4 text-center rounded-xl border border-border-theme peer-checked:bg-primary peer-checked:text-white peer-checked:border-primary transition-all font-black text-xs uppercase tracking-widest shadow-sm hover:bg-slate-50 peer-checked:hover:bg-primary">
                    كادر إداري / عام
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col md:flex-row gap-4">
             <button
              type="submit"
              className="flex-[2] flex items-center justify-center gap-3 bg-primary text-white font-black text-sm uppercase tracking-widest py-5 rounded-2xl hover:bg-secondary transition-all shadow-xl hover:shadow-primary/20 border-b-4 border-accent active:translate-y-1 group order-1 md:order-2"
            >
              <Save size={20} className="group-hover:scale-110 transition-transform" />
              {formData.id ? 'حفظ التغييرات النهائية' : 'إعتماد تسجيل الموظف'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-text-muted font-black text-xs uppercase tracking-widest py-5 rounded-2xl hover:bg-slate-200 transition-all border-b-4 border-slate-300 active:translate-y-1 order-2 md:order-1"
            >
              <ArrowLeft size={18} />
              إلغاء العملية
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
