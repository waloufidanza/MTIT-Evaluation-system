/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { db } from '../db.ts';
import { User } from '../types.ts';
import { Lock, User as UserIcon, ShieldCheck, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Check for hardcoded admin first for convenience/bootstrap
      if (username === 'mtitye-td' && password === 'walou7429') {
        const admin: User = {
          username: 'mtitye-td',
          password: 'walou7429',
          fullName: 'مدير النظام الأصلي',
          role: 'admin'
        };
        onLogin(admin);
        return;
      }

      const user = await db.users.where('username').equals(username).first();
      if (user && user.password === password) {
        onLogin(user);
      } else {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch (err) {
      console.error("Login error:", err);
      setError('حدث خطأ أثناء الاتصال بالنظام');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-theme flex items-center justify-center p-4">
      <div className="absolute top-0 left-0 w-full h-1 bg-accent" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-border-theme relative"
      >
        <div className="p-8 pb-4 text-center">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 border-b-2 border-primary rotate-3 transform transition-transform hover:rotate-0 overflow-hidden p-2 shadow-md">
             <img 
               src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Coat_of_arms_of_Yemen.svg/1024px-Coat_of_arms_of_Yemen.svg.png" 
               alt="شعار وزارة الاتصالات" 
               className="w-full h-full object-contain"
               referrerPolicy="no-referrer"
             />
          </div>
          <h2 className="text-2xl font-black text-text-dark uppercase tracking-wide">النفاذ الموحد</h2>
          <p className="text-text-muted text-[10px] font-bold uppercase tracking-[0.2em] mt-2">منصة تقييم الكادر - وزارة الاتصالات</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3 bg-red-50 border border-red-100 rounded text-[11px] font-bold text-red-600 text-center uppercase"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block pr-1">اسم المستخدم</label>
              <div className="relative group">
                <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                <input 
                  type="text" 
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:ring-1 focus:ring-primary focus:bg-white outline-none transition-all"
                  placeholder="Username / ID"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block pr-1">كلمة المرور</label>
              <div className="relative group">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pr-10 pl-12 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:ring-1 focus:ring-primary focus:bg-white outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-text-dark transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-lg hover:bg-secondary transition-all shadow-xl border-b-4 border-accent active:translate-y-1 flex items-center justify-center gap-2 group"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                تسجيل الدخول للنظام
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="p-6 bg-[#fafafa] border-t border-border-theme text-center">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
            تحذير: النظام مخصص للمصرح لهم فقط. يتم تسجيل كافة محاولات الدخول.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
