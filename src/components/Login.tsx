/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { db } from '../db.ts';
import { User } from '../types.ts';
import { Lock, User as UserIcon, ShieldCheck, ArrowLeft, Eye, EyeOff, ShieldAlert, AlertCircle, Shield as ShieldIcon } from 'lucide-react';
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
    <div className="min-h-screen bg-[#050a14] flex items-center justify-center p-4 relative overflow-hidden font-sans" dir="rtl">
      {/* Sovereignty Backdrop */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-primary/20 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-accent/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 mix-blend-overlay" />
        
        {/* Geometric Technical Patterns */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #d4af37 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-[540px] relative z-10"
      >
        <div className="bg-[#0c1626]/80 backdrop-blur-2xl rounded-[3.5rem] border border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] overflow-hidden">
          {/* Header Section */}
          <div className="relative p-14 pb-10 text-center border-b border-white/5 overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-1 bg-gradient-to-r from-transparent via-accent to-transparent" />
            
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="w-28 h-28 bg-white/5 rounded-[2.5rem] mx-auto mb-8 p-4 border border-white/10 shadow-2xl backdrop-blur-xl relative group"
            >
              <div className="absolute inset-0 bg-accent/20 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Coat_of_arms_of_Yemen.svg/1024px-Coat_of_arms_of_Yemen.svg.png" 
                alt="Republic of Yemen" 
                className="w-full h-full object-contain relative z-10"
                referrerPolicy="no-referrer"
              />
            </motion.div>

            <div className="space-y-3">
              <h1 className="text-4xl font-black text-white tracking-tighter drop-shadow-sm">بوابة الدخول الموحد</h1>
              <div className="flex items-center justify-center gap-4 text-accent/70">
                <div className="h-px w-8 bg-accent/30" />
                <span className="text-[10px] font-black uppercase tracking-[0.5em]">Central Assessment Portal</span>
                <div className="h-px w-8 bg-accent/30" />
              </div>
            </div>
          </div>

          <div className="p-14 space-y-10">
            {/* Security Notice */}
            <div className="p-5 bg-primary/30 border border-white/5 rounded-2xl flex gap-5 items-center">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent shrink-0">
                <ShieldCheck size={20} />
              </div>
              <p className="text-[11px] font-bold text-slate-400 leading-relaxed">
                يتم تأمين كافة الاتصالات عبر بروتوكول مشفر. يرجى إدخال بيانات الاعتماد الرسمية للمتابعة.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-7">
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-accent uppercase tracking-widest block pr-2">الرقم الوظيفي أو المعرف</label>
                  <div className="relative group">
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-accent transition-colors">
                      <UserIcon size={20} />
                    </div>
                    <input
                      type="text"
                      required
                      className="w-full pr-16 pl-6 py-5 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-accent focus:bg-white/10 transition-all font-mono placeholder:text-slate-600"
                      placeholder="ENTER ID CODE"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-black text-accent uppercase tracking-widest block pr-2">كلمة مرور النظام</label>
                  <div className="relative group">
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-accent transition-colors">
                      <Lock size={20} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      className="w-full pr-16 pl-16 py-5 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-accent focus:bg-white/10 transition-all font-mono text-left placeholder:text-slate-600"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 hover:text-accent transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-6 bg-accent text-primary text-[14px] font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-[#c4a02d] transition-all shadow-[0_20px_40px_-10px_rgba(212,175,55,0.3)] disabled:opacity-50 active:translate-y-1 flex items-center justify-center gap-4 group"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-3 border-primary/30 border-t-primary rounded-full" />
                      جاري التحقق...
                    </>
                  ) : (
                    <>
                      تأكيد الهوية والدخول
                      <ShieldIcon size={20} className="group-hover:scale-110 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-500"
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                  <ShieldAlert size={20} />
                </div>
                <p className="text-[12px] font-black uppercase tracking-tight">{error}</p>
              </motion.div>
            )}
          </div>

          {/* Footer Security Footer */}
          <div className="bg-black/40 py-8 px-14 flex justify-between items-center border-t border-white/5">
             <div className="flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
               <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Global Sec-Sync Active</span>
             </div>
             <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">v2.4.0 SOVEREIGN EDITION</span>
          </div>
        </div>
        
        <p className="mt-10 text-center text-[11px] font-bold text-white/30 uppercase tracking-[0.4em] leading-loose">
          MTIT Intelligence & Strategic Systems Division<br/>
          Unauthorized access is strictly prohibited under international cyber law.
        </p>
      </motion.div>
    </div>
  );
}

// Sub-components used
