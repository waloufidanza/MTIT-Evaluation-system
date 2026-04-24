/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../db.ts';
import { Employee, DEPARTMENTS } from '../types.ts';
import { 
  UserPlus, 
  Trash2, 
  Save, 
  X, 
  Building2, 
  Briefcase, 
  Calendar, 
  AlertCircle,
  Hash,
  ShieldCheck,
  User,
  Info,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EmployeeFormProps {
  employee?: Employee;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EmployeeForm({ employee, onClose, onSuccess }: EmployeeFormProps) {
  const [formData, setFormData] = useState<Omit<Employee, 'id'>>({
    name: employee?.name || '',
    employeeId: employee?.employeeId || '',
    department: employee?.department || DEPARTMENTS[0],
    secondDepartment: employee?.secondDepartment || '',
    position: employee?.position || '',
    joinDate: employee?.joinDate || new Date().toISOString().split('T')[0],
    type: employee?.type || 'technical',
    category: employee?.category || 'contractor',
    biometricStatus: employee?.biometricStatus || 'offline',
    attendanceHistory: employee?.attendanceHistory || [],
    notes: employee?.notes || '',
    customCriteria: employee?.customCriteria || []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate unique ID
      const existingById = await db.employees.where('employeeId').equals(formData.employeeId).first();
      if (existingById && existingById.id !== employee?.id) {
        throw new Error('الرقم الوظيفي موجود مسبقاً لموظف آخر');
      }

      // Validate unique Name
      const existingByName = await db.employees.where('name').equals(formData.name).first();
      if (existingByName && existingByName.id !== employee?.id) {
        throw new Error('اسم الموظف موجود مسبقاً في القاعدة');
      }

      if (employee?.id) {
        await db.employees.update(employee.id, formData);
      } else {
        await db.employees.add(formData as any);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'حدث خطأ في معالجة البيانات');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!employee?.id) return;
    try {
      // Cascade delete evaluations
      await db.evaluations.where('employeeId').equals(employee.id).delete();
      await db.employees.delete(employee.id);
      onSuccess();
      onClose();
    } catch (err) {
       console.error(err);
       setError('فشل حذف ملف الموظف');
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0a192f]/90 backdrop-blur-xl flex items-center justify-center p-4 z-50 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[3rem] shadow-massive w-full max-w-4xl overflow-hidden relative my-8 border border-white/20 text-right"
      >
        {/* Ministry Grade Header */}
        <div className="bg-primary p-10 md:p-14 text-white relative overflow-hidden border-b-8 border-accent">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/az-subtle.png')] opacity-10 pointer-events-none" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white rounded-3xl p-3 flex items-center justify-center shadow-premium group">
                 <UserPlus className="w-10 h-10 text-primary transition-transform group-hover:scale-110" />
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-black tracking-tighter">
                  {employee ? 'تحديث ملف الكادر الوظيفي' : 'تسجيل موظف جديد بالوزارة'}
                </h2>
                <div className="flex items-center gap-3 mt-2">
                  <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black text-accent uppercase tracking-widest border border-accent/20">
                    Personnel Management Division
                  </div>
                  <div className="h-1 w-8 bg-accent/30 rounded-full" />
                  <p className="text-white/60 text-[11px] font-bold uppercase tracking-widest italic font-mono">
                    {employee ? `ID-TOKEN: ${employee.employeeId}` : 'AWAITING IDENTIFICATION'}
                  </p>
                </div>
              </div>
            </div>
            
            <button 
              onClick={onClose} 
              className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10 group"
            >
              <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-10 md:p-16 space-y-12">
          {error && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="bg-red-50 border-r-8 border-red-500 p-6 rounded-2xl text-red-700 text-sm font-black flex items-center gap-4"
            >
              <AlertCircle className="w-6 h-6" />
              {error}
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Primary Info */}
            <div className="space-y-8">
              <div className="flex items-center gap-4 mb-4 border-r-4 border-accent pr-4">
                 <User className="text-primary" size={24} />
                 <h3 className="text-sm font-black text-primary uppercase tracking-widest">المعلومات التعريفية</h3>
              </div>
              
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] block pr-1">الاسم الرباعي الكامل</label>
                <input 
                  type="text"
                  required
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-primary focus:bg-white transition-all text-right"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="أدخل الاسم كما هو في الهوية الرسمية..."
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] block pr-1">الرقم الوظيفي السيادي</label>
                <div className="relative group">
                  <Hash className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                  <input 
                    type="text"
                    required
                    className="w-full pr-12 pl-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-primary focus:bg-white transition-all font-mono"
                    value={formData.employeeId}
                    onChange={e => setFormData({...formData, employeeId: e.target.value})}
                    placeholder="MTIT-XXXXX"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] block pr-1">تاريخ الالتحاق بالمؤسسة</label>
                <div className="relative group">
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                  <input 
                    type="date"
                    required
                    className="w-full pr-12 pl-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-primary focus:bg-white transition-all font-mono"
                    value={formData.joinDate}
                    onChange={e => setFormData({...formData, joinDate: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Employment Details */}
            <div className="space-y-8">
              <div className="flex items-center gap-4 mb-4 border-r-4 border-accent pr-4">
                 <Briefcase className="text-primary" size={24} />
                 <h3 className="text-sm font-black text-primary uppercase tracking-widest">التفاصيل الوظيفية والقطاع</h3>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] block pr-1">الإدارة العامة / القطاع</label>
                <div className="relative group">
                  <Building2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                  <select 
                    className="w-full pr-12 pl-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-primary focus:bg-white transition-all cursor-pointer appearance-none text-right"
                    value={formData.department}
                    onChange={e => setFormData({...formData, department: e.target.value})}
                  >
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] block pr-1">الإدارة المستعان بها (اختياري)</label>
                <input 
                  type="text"
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-primary focus:bg-white transition-all text-right"
                  value={formData.secondDepartment}
                  onChange={e => setFormData({...formData, secondDepartment: e.target.value})}
                  placeholder="في حال كان الموظف منتدباً لإدارة أخرى..."
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] block pr-1">المسمى الوظيفي والدرجة</label>
                <input 
                  type="text"
                  required
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-primary focus:bg-white transition-all text-right"
                  value={formData.position}
                  onChange={e => setFormData({...formData, position: e.target.value})}
                  placeholder="مثلاً: رئيس قسم أمن الشبكات..."
                />
              </div>
            </div>

            {/* Classification */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-10 pt-6 border-t border-slate-100">
               <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] block pr-1">تصنيف المسار الوظيفي</label>
                <div className="flex gap-4">
                  {(['technical', 'non-technical'] as const).map(type => (
                    <label key={type} className={`flex-1 p-5 rounded-2xl border-2 transition-all cursor-pointer text-center group ${
                      formData.type === type 
                      ? 'bg-primary border-primary text-white shadow-premium' 
                      : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                    }`}>
                      <input 
                        type="radio"
                        className="hidden"
                        checked={formData.type === type}
                        onChange={() => setFormData({...formData, type})}
                      />
                      <span className="text-[11px] font-black uppercase tracking-widest">
                        {type === 'technical' ? 'كادر فني / تقني' : 'كادر إداري / مالي'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] block pr-1">نوع التعاقد / الفئة</label>
                <div className="flex gap-4">
                  {(['internal', 'consultant', 'contractor'] as const).map(cat => (
                    <label key={cat} className={`flex-1 p-5 rounded-2xl border-2 transition-all cursor-pointer text-center group ${
                      formData.category === cat 
                      ? 'bg-secondary border-secondary text-white shadow-premium' 
                      : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                    }`}>
                      <input 
                        type="radio"
                        className="hidden"
                        checked={formData.category === cat}
                        onChange={() => setFormData({...formData, category: cat})}
                      />
                      <span className="text-[11px] font-black uppercase tracking-widest">
                        {cat === 'internal' ? 'موظف رسمي' : cat === 'consultant' ? 'مستشار' : 'موظف متعاقد'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-12 border-t border-slate-100 flex flex-col md:flex-row gap-6">
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-20 bg-primary text-white text-lg font-black uppercase tracking-[0.3em] rounded-3xl hover:bg-secondary transition-all shadow-premium border-b-8 border-accent group active:translate-y-2 flex items-center justify-center gap-6"
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck size={28} className="text-accent group-hover:scale-110 transition-transform" />
                  إعتماد وحفظ بيانات الملف
                </>
              )}
            </button>
            
            {employee && (
              <button 
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="h-20 px-10 bg-red-50 text-red-500 rounded-3xl hover:bg-red-100 transition-all border-2 border-red-100 font-black text-sm flex items-center justify-center gap-4 group"
              >
                <Trash2 size={24} className="group-hover:rotate-12 transition-transform" />
                حذف الملف نهائياً
              </button>
            )}

            <button 
              type="button"
              onClick={onClose}
              className="h-20 px-10 bg-slate-50 text-slate-400 rounded-3xl hover:bg-slate-100 transition-all border-2 border-slate-100 font-black text-sm"
            >
              إلغاء
            </button>
          </div>
        </form>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-6 items-center">
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center border border-slate-100 text-accent">
               <Info size={24} />
            </div>
            <p className="text-[11px] font-bold text-text-muted leading-relaxed">
              تنبيه أمان: كافة التغييرات على ملفات الكادر مسجلة في سجلات الرقابة (Audit Logs). تأكد من صحة البيانات المدخلة قبل الاعتماد الرسمي.
            </p>
        </div>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-3xl flex items-center justify-center p-4 z-[60]">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[3rem] shadow-massive p-10 max-w-md w-full text-center border-b-8 border-red-500"
            >
              <div className="w-24 h-24 bg-red-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 text-red-500">
                <Trash2 size={48} />
              </div>
              <h3 className="text-2xl font-black text-primary mb-4 tracking-tighter">تأكيد الحذف النهائي</h3>
              <p className="text-sm font-bold text-text-muted leading-relaxed mb-10 px-4">
                أنت على وشك حذف ملف الموظف <span className="text-red-500 font-black">{employee?.name}</span> وكافة سجلات تقييمه التاريخية. هذا الإجراء غير قابل للتراجع.
              </p>
              <div className="flex flex-col gap-4">
                <button
                  onClick={handleDelete}
                  className="w-full py-5 bg-red-500 text-white font-black rounded-2xl hover:bg-red-600 transition-all shadow-xl uppercase tracking-widest text-xs"
                >
                  نعم، حذف السجلات نهائياً
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="w-full py-5 bg-slate-50 text-slate-400 font-black rounded-2xl hover:bg-slate-100 transition-all text-xs uppercase tracking-widest border border-slate-100"
                >
                  تراجع عن الإجراء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
