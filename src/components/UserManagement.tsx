/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../db.ts';
import { User as UserIcon, Shield, ShieldAlert, Trash2, Plus, Search, UserCheck, Key, ShieldCheck, Mail, Briefcase, Info, X, MoreVertical, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types.ts';

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState<Omit<User, 'id'>>({
    username: '',
    password: '',
    fullName: '',
    role: 'evaluator',
    department: 'تقنية المعلومات'
  });

  useEffect(() => {
    const fetchUsers = async () => {
      const allUsers = await db.users.toArray();
      setUsers(allUsers);
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await db.users.add(newUser as any);
      const allUsers = await db.users.toArray();
      setUsers(allUsers);
      setShowAddModal(false);
      setNewUser({
        username: '',
        password: '',
        role: 'evaluator',
        fullName: '',
        email: '',
        department: 'تقنية المعلومات'
      });
    } catch (err) {
      console.error(err);
      alert('فشل إضافة المستخدم. قد يكون اسم المستخدم مكرراً.');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذا الحساب السيادي؟ سيتم سحب كافة الصلاحيات فوراً.')) {
      await db.users.delete(id);
      setUsers(users.filter(u => u.id !== id));
    }
  };

  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.department && u.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 text-right" dir="rtl">
      {/* Sovereignty Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-10 rounded-[3rem] shadow-premium border-b-8 border-accent relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-6">
           <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center text-accent shadow-massive">
              <Shield size={40} />
           </div>
           <div>
              <h2 className="text-4xl font-black text-primary tracking-tighter">إدارة حسابات النظام السيادي</h2>
              <p className="text-sm font-bold text-text-muted mt-2 uppercase tracking-widest">Access Control & Identity Management Division</p>
           </div>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="relative z-10 px-8 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-premium hover:bg-secondary transition-all flex items-center gap-3 border-b-4 border-accent active:translate-y-1"
        >
          <Plus size={18} strokeWidth={3} />
          تأسيس حساب وصلاحيات جديدة
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-slate-100 space-y-8">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] block pr-1">محرك بحث الهويات</label>
                 <div className="relative group">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                    <input 
                      type="text"
                      className="w-full pr-12 pl-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-primary focus:bg-white transition-all text-right"
                      placeholder="بحث بالاسم أو الكود..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                 </div>
              </div>

              <div className="pt-6 border-t border-slate-50 space-y-4">
                 <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.2em] mb-4">إحصائيات الصلاحيات</h4>
                 <div className="space-y-3">
                    <StatRow label="إجمالي الحسابات" value={users.length} />
                    <StatRow label="مدراء النظام (Admins)" value={users.filter(u => u.role === 'admin').length} isAlert />
                    <StatRow label="لجان التقييم" value={users.filter(u => u.role === 'evaluator').length} />
                 </div>
              </div>

              <div className="p-6 bg-secondary/5 rounded-3xl border-2 border-dashed border-secondary/10">
                 <div className="flex gap-4 items-start">
                    <div className="p-2 bg-white rounded-xl shadow-sm text-secondary">
                       <Info size={20} />
                    </div>
                    <p className="text-[11px] font-bold text-secondary leading-relaxed">
                       جميع عمليات الدخول والتعديل مسجلة في سجل التعقب الأمني (Audit Trail) للوزارة.
                    </p>
                 </div>
              </div>
           </div>
        </div>

        <div className="lg:col-span-3">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <AnimatePresence>
                {filteredUsers.map((user, idx) => (
                  <motion.div 
                    key={user.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group bg-white rounded-[2.5rem] p-8 shadow-premium border border-slate-100 hover:border-primary/20 transition-all hover:scale-[1.02]"
                  >
                    <div className="flex justify-between items-start mb-6">
                       <div className="flex items-center gap-5">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black border-4 border-white shadow-xl ${
                            user.role === 'admin' ? 'bg-primary text-white' : 'bg-slate-100 text-primary'
                          }`}>
                            {user.fullName?.[0]}
                          </div>
                          <div>
                             <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">{user.username}</p>
                             <h4 className="text-xl font-black text-primary truncate max-w-[200px]">{user.fullName}</h4>
                          </div>
                       </div>
                       <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                         user.role === 'admin' ? 'bg-primary/5 text-primary border-primary/20' : 'bg-secondary/5 text-secondary border-secondary/20'
                       }`}>
                         {user.role === 'admin' ? 'System Administrator' : 'Department Evaluator'}
                       </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-slate-50">
                       <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
                          <Building2 size={18} className="text-primary/40" />
                          <span>{user.department}</span>
                       </div>
                       <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
                          <Mail size={18} className="text-primary/40" />
                          <span className="truncate">{user.email}</span>
                       </div>
                    </div>

                    <div className="mt-8 flex gap-3">
                       <button className="flex-1 h-12 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-primary rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-100 flex items-center justify-center gap-2">
                          <Key size={14} /> إعادة تعيين كلمة المرور
                       </button>
                       <button 
                        onClick={() => user.id && handleDeleteUser(user.id)}
                        className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-100"
                       >
                          <Trash2 size={18} />
                       </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
           </div>
        </div>
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-[#0a192f]/90 backdrop-blur-xl flex items-center justify-center p-4 z-[100]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-white rounded-[3.5rem] shadow-massive w-full max-w-2xl overflow-hidden border border-white/20 text-right"
            >
              <div className="bg-primary p-12 text-white relative overflow-hidden border-b-8 border-accent">
                 <div className="absolute top-0 right-0 w-48 h-48 bg-accent/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                 <div className="relative z-10 flex justify-between items-center">
                    <div>
                       <h3 className="text-3xl font-black tracking-tighter">إنشاء تفويض جديد</h3>
                       <p className="text-[10px] font-black text-accent uppercase tracking-[0.4em] mt-2">Identity Creation Protocol v2.5</p>
                    </div>
                    <button onClick={() => setShowAddModal(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10">
                       <X className="w-6 h-6" />
                    </button>
                 </div>
              </div>

              <form onSubmit={handleAddUser} className="p-12 space-y-10">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block pr-2">اسم المستخدم (Username)</label>
                       <input 
                         required
                         className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black focus:border-primary outline-none transition-all font-mono"
                         value={newUser.username}
                         onChange={e => setNewUser({...newUser, username: e.target.value})}
                         placeholder="ADMIN_USER_X"
                       />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block pr-2">كلمة المرور الأولية</label>
                       <input 
                         type="password"
                         required
                         className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black focus:border-primary outline-none transition-all font-mono"
                         value={newUser.password}
                         onChange={e => setNewUser({...newUser, password: e.target.value})}
                         placeholder="••••••••"
                       />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block pr-2">الاسم الكامل للإسناد</label>
                       <input 
                         required
                         className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black focus:border-primary outline-none transition-all text-right"
                         value={newUser.fullName}
                         onChange={e => setNewUser({...newUser, fullName: e.target.value})}
                         placeholder="د. أحمد محمد اليماني"
                       />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block pr-2">البريد الإلكتروني الرسمي</label>
                       <input 
                         type="email"
                         required
                         className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black focus:border-primary outline-none transition-all font-mono"
                         value={newUser.email}
                         onChange={e => setNewUser({...newUser, email: e.target.value})}
                         placeholder="official@mtit.gov.ye"
                       />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block pr-2">مستوى الصلاحية</label>
                       <select 
                         className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black focus:border-primary outline-none transition-all appearance-none text-right"
                         value={newUser.role}
                         onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                       >
                          <option value="evaluator">لجنة تقييم (Standard Access)</option>
                          <option value="admin">مدير نظام (High-Level Clearance)</option>
                       </select>
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block pr-2">الإدارة التابع لها</label>
                       <input 
                         required
                         className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black focus:border-primary outline-none transition-all text-right"
                         value={newUser.department}
                         onChange={e => setNewUser({...newUser, department: e.target.value})}
                         placeholder="الإدارة العامة للرقابة..."
                       />
                    </div>
                 </div>

                 <button 
                  type="submit"
                  className="w-full h-20 bg-primary text-white rounded-[2rem] text-lg font-black uppercase tracking-[0.3em] shadow-premium hover:bg-secondary transition-all border-b-8 border-accent group active:translate-y-2 flex items-center justify-center gap-6"
                 >
                    <ShieldCheck size={28} className="text-accent group-hover:scale-110 transition-transform" />
                    إعتماد إنشاء الهوية
                 </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatRow({ label, value, isAlert = false }: { label: string, value: number, isAlert?: boolean }) {
  return (
    <div className="flex justify-between items-center py-4 border-b border-slate-50 last:border-0 group">
       <span className="text-[11px] font-black text-text-muted uppercase tracking-widest group-hover:text-primary transition-colors">{label}</span>
       <span className={`text-xl font-black ${isAlert ? 'text-red-500' : 'text-primary'}`}>{value}</span>
    </div>
  );
}
