import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, AlertCircle, Clock, CheckCircle2, TrendingDown } from 'lucide-react';
import { Notification } from '../types.ts';

interface NotificationTrayProps {
  notifications: Notification[];
  isOpen: boolean;
  onClose: () => void;
  onAction: (employeeId: number) => void;
}

export default function NotificationTray({ notifications, isOpen, onClose, onAction }: NotificationTrayProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-[60] bg-black/5 lg:bg-transparent" 
            onClick={onClose} 
          />
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-20 left-10 w-96 max-h-[500px] bg-white rounded-lg shadow-2xl border border-border-theme z-[70] flex flex-col overflow-hidden"
          >
            <div className="p-4 bg-primary text-white flex justify-between items-center border-b border-white/10">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-accent" />
                <h3 className="font-bold text-sm">مركز التنبيهات الوزاري</h3>
              </div>
              <button 
                onClick={onClose}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50">
              {notifications.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 border border-border-theme">
                    <CheckCircle2 className="text-slate-300" size={24} />
                  </div>
                  <p className="text-text-muted text-xs font-bold uppercase tracking-wider">لا توجد تنبيهات حالية</p>
                  <p className="text-[10px] text-slate-400 mt-1">كافة تقييمات الكادر محدثة</p>
                </div>
              ) : (
                <div className="divide-y divide-border-theme">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      onClick={() => {
                        onAction(notif.employeeId);
                        onClose();
                      }}
                      className="p-4 hover:bg-white cursor-pointer transition-colors group relative"
                    >
                      <div className="flex gap-3">
                        <div className={`shrink-0 w-8 h-8 rounded flex items-center justify-center ${
                          notif.type === 'overdue' ? 'bg-red-50 text-red-500' : 
                          notif.type === 'performance-alert' ? 'bg-indigo-50 text-indigo-500' : 'bg-amber-50 text-amber-500'
                        }`}>
                          {notif.type === 'overdue' ? <AlertCircle size={16} /> : 
                           notif.type === 'performance-alert' ? <TrendingDown size={16} /> : <Clock size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[11px] font-black text-text-dark uppercase mb-1 flex justify-between items-center">
                            <span className="truncate ml-2">{notif.title}</span>
                            {notif.remainingDays !== undefined && notif.type === 'upcoming' && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[8px] font-black whitespace-nowrap">
                                متبقي {notif.remainingDays} أيام
                              </span>
                            )}
                            {notif.type === 'overdue' && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[8px] font-black whitespace-nowrap">
                                متأخر
                              </span>
                            )}
                            {notif.type === 'performance-alert' && (
                              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[8px] font-black whitespace-nowrap">
                                تنبيه أداء
                              </span>
                            )}
                          </h4>
                          <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-[8px] text-slate-400 mt-1 uppercase font-bold tracking-wider italic">تاريخ الاستحقاق التقريبي: {notif.date}</p>
                        </div>
                      </div>
                      <div className="absolute left-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className="text-[9px] font-black text-primary border-b border-primary uppercase">إجراء سريع ←</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-3 bg-white border-t border-border-theme text-center">
                <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">
                  نظام التنبيهات يعمل بذكاء اصطناعي لرصد التأخير
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
