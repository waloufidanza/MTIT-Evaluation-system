/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../db.ts';
import { User } from '../types.ts';
import { UserPlus, Shield, User as UserIcon, Trash2, Key, Info, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState<Omit<User, 'id'>>({
    username: '',
    password: '',
    fullName: '',
    role: 'evaluator',
    department: ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const allUsers = await db.users.toArray();
    setUsers(allUsers);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) return;

    try {
      await db.users.add(newUser as any);
      setShowAddUser(false);
      setNewUser({
        username: '',
        password: '',
        fullName: '',
        role: 'evaluator',
        department: ''
      });
      loadUsers();
    } catch (err) {
      console.error("Failed to add user:", err);
      alert("حدث خطأ أثناء إضافة المستخدم. قد يكون اسم المستخدم موجوداً مسبقاً.");
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المستخدم؟ لن يؤثر ذلك على بيانات التقييم التي أدخلها.')) {
      await db.users.delete(id);
      loadUsers();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-12">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-border-theme shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center p-1 border border-primary/20 shadow-sm overflow-hidden">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Coat_of_arms_of_Yemen.svg/1024px-Coat_of_arms_of_Yemen.svg.png" 
              alt="شعار وزارة الاتصالات" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h2 className="text-xl font-black text-text-dark">إدارة المستخدمين والصلاحيات</h2>
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider">التحكم في وصول مسؤولي التقييم للنظام</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddUser(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-lg hover:bg-secondary transition-all shadow-md active:translate-y-1"
        >
          <UserPlus size={16} />
          إضافة مسؤول جديد
        </button>
      </div>

      <div className="bg-white rounded-xl border border-border-theme overflow-hidden shadow-sm">
        <table className="w-full text-right">
          <thead className="bg-[#f8f9fa] border-b border-border-theme">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">الاسم الكامل</th>
              <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">اسم المستخدم</th>
              <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">الإدارة</th>
              <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">الدور</th>
              <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] text-left">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-theme">
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <p className="text-text-muted text-xs font-bold italic">لا يوجد مستخدمين إضافيين مسجلين حالياً</p>
                </td>
              </tr>
            )}
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-primary font-black text-xs uppercase">
                      {user.fullName[0]}
                    </div>
                    <span className="text-sm font-bold text-text-dark">{user.fullName}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-medium text-text-muted font-mono">{user.username}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-bold text-text-dark">{user.department || 'غير محدد'}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                    user.role === 'admin' 
                    ? 'bg-amber-100 text-amber-700' 
                    : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {user.role === 'admin' ? 'مدير نظام' : 'مسؤول تقييم'}
                  </span>
                </td>
                <td className="px-6 py-4 text-left">
                   <button 
                     onClick={() => handleDeleteUser(user.id!)}
                     className="p-2 text-red-300 hover:text-red-500 transition-colors"
                     title="حذف المستخدم"
                   >
                     <Trash2 size={16} />
                   </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showAddUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-border-theme"
            >
              <div className="bg-primary p-6 text-white flex justify-between items-center border-b-4 border-accent">
                <div className="flex items-center gap-3">
                  <UserPlus className="w-6 h-6 text-accent" />
                  <h3 className="font-black text-lg uppercase">إضافة عضو جديد للجهاز</h3>
                </div>
                <button onClick={() => setShowAddUser(false)} className="hover:bg-white/10 p-1 rounded transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddUser} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block">الاسم الكامل</label>
                    <input 
                      type="text" 
                      required
                      value={newUser.fullName}
                      onChange={e => setNewUser({...newUser, fullName: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-border-theme rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all"
                      placeholder="أدخل الاسم الرباعي"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block">الإدارة / القسم</label>
                    <input 
                      type="text" 
                      value={newUser.department}
                      onChange={e => setNewUser({...newUser, department: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-border-theme rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all"
                      placeholder="اسم الإدارة التابع لها"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block">اسم المستخدم</label>
                    <div className="relative">
                      <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        type="text" 
                        required
                        value={newUser.username}
                        onChange={e => setNewUser({...newUser, username: e.target.value})}
                        className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-border-theme rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all font-mono"
                        placeholder="username"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block">كلمة المرور</label>
                    <div className="relative">
                      <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        type="password" 
                        required
                        value={newUser.password}
                        onChange={e => setNewUser({...newUser, password: e.target.value})}
                        className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-border-theme rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all font-mono"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block">صلاحيات النظام</label>
                    <select 
                      value={newUser.role}
                      onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-border-theme rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-primary transition-all"
                    >
                      <option value="evaluator">مسؤول تقييم (Evaluator)</option>
                      <option value="admin">مدير نظام (Admin)</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-lg hover:bg-secondary transition-all shadow-lg border-b-4 border-accent active:translate-y-1"
                  >
                    <Save size={16} />
                    حفظ ونشر الحساب
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowAddUser(false)}
                    className="px-8 py-3 bg-white border border-border-theme text-text-muted font-black text-xs uppercase tracking-widest rounded-lg hover:bg-slate-50 transition-all active:translate-y-1"
                  >
                    إلغاء
                  </button>
                </div>
              </form>

              <div className="p-4 bg-amber-50 border-t border-amber-100 flex gap-3 text-amber-700">
                <Info size={16} className="shrink-0 mt-0.5" />
                <p className="text-[10px] font-medium leading-relaxed">
                  ملاحظة: تأكد من تزويد المسؤول ببيانات الدخول بشكل آمن. للمسؤول الجديد القدرة على الدخول الكامل للتقييمات.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
