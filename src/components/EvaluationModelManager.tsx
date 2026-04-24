/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../db.ts';
import { EvaluationModel, EvaluationCriteria } from '../types.ts';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Edit3, 
  Copy, 
  Search, 
  ChevronRight, 
  GripVertical, 
  Settings2, 
  Save, 
  X, 
  ShieldCheck, 
  Layout, 
  MoreVertical,
  HelpCircle,
  Hash,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

export default function EvaluationModelManager() {
  const [models, setModels] = useState<EvaluationModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingModel, setEditingModel] = useState<Partial<EvaluationModel>>({
    name: '',
    criteria: [],
    positionTags: [],
    departmentTags: []
  });

  useEffect(() => {
    const fetchModels = async () => {
      const allModels = await db.evaluationModels.toArray();
      setModels(allModels);
      setIsLoading(false);
    };
    fetchModels();
  }, []);

  const handleSaveModel = async () => {
    if (!editingModel.name?.trim()) return;
    
    try {
      if (editingModel.id) {
        await db.evaluationModels.update(editingModel.id, editingModel);
      } else {
        await db.evaluationModels.add(editingModel as EvaluationModel);
      }
      
      const allModels = await db.evaluationModels.toArray();
      setModels(allModels);
      setShowEditor(false);
    } catch (err) {
      console.error(err);
      alert('فشل حفظ القالب السيادي.');
    }
  };

  const handleDeleteModel = async (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذا القالب؟ سيتم منعه من الاستخدام في التقييمات القادمة.')) {
      await db.evaluationModels.delete(id);
      setModels(models.filter(m => m.id !== id));
    }
  };

  const addCriterion = () => {
    const newCriteria = [...(editingModel.criteria || []), { label: 'معيار استراتيجي جديد', weight: 20, description: '' }];
    setEditingModel({ ...editingModel, criteria: newCriteria });
  };

  const updateCriterion = (index: number, updates: Partial<EvaluationCriteria>) => {
    const newCriteria = [...(editingModel.criteria || [])];
    newCriteria[index] = { ...newCriteria[index], ...updates };
    setEditingModel({ ...editingModel, criteria: newCriteria });
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(editingModel.criteria || []);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setEditingModel({ ...editingModel, criteria: items });
  };

  const filteredModels = models.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 text-right pb-20" dir="rtl">
      {/* Sovereignty Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-10 rounded-[3rem] shadow-premium border-b-8 border-accent relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex items-center gap-6">
           <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center text-accent shadow-massive">
              <Layout size={40} />
           </div>
           <div>
              <h2 className="text-4xl font-black text-primary tracking-tighter">إدارة مصفوفات معايير الأداء</h2>
              <p className="text-sm font-bold text-text-muted mt-2 uppercase tracking-widest">Sovereign Performance Metrics & Matrix Control</p>
           </div>
        </div>

        <button 
          onClick={() => {
            setEditingModel({ name: '', criteria: [], positionTags: [], departmentTags: [] });
            setShowEditor(true);
          }}
          className="relative z-10 px-8 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-premium hover:bg-secondary transition-all flex items-center gap-3 border-b-4 border-accent active:translate-y-1"
        >
          <Plus size={18} strokeWidth={3} />
          تأسيس مصفوفة معايير تخصصية
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-white p-8 rounded-[2.5rem] shadow-premium border border-slate-100 space-y-8">
              <div className="space-y-4">
                 <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] block pr-1">محرك بحث القوالب</label>
                 <div className="relative group">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                    <input 
                      type="text"
                      className="w-full pr-12 pl-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-primary focus:bg-white transition-all text-right"
                      placeholder="بحث في مسميات النماذج..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                 </div>
              </div>

              <div className="p-6 bg-secondary/5 rounded-3xl border-2 border-dashed border-secondary/10">
                 <div className="flex gap-4 items-start">
                    <div className="p-2 bg-white rounded-xl shadow-sm text-secondary">
                       <HelpCircle size={20} />
                    </div>
                    <p className="text-[11px] font-bold text-secondary leading-relaxed">
                       يمكن ربط القوالب بمهن محددة عبر "الوسوم الدلالية" ليقوم النظام باقتراحها آلياً للمقيّمين.
                    </p>
                 </div>
              </div>
           </div>
        </div>

        <div className="lg:col-span-3">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <AnimatePresence>
                {filteredModels.map((model, idx) => (
                  <motion.div 
                    key={model.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group bg-white rounded-[2.5rem] p-8 shadow-premium border border-slate-100 hover:border-primary/20 transition-all flex flex-col justify-between"
                  >
                    <div>
                       <div className="flex justify-between items-start mb-6">
                          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                             <FileText size={28} />
                          </div>
                          <div className="flex gap-2">
                             <button className="p-2 bg-slate-50 text-slate-400 hover:text-primary rounded-lg transition-all"><Copy size={16} /></button>
                             <button 
                              onClick={() => { setEditingModel(model); setShowEditor(true); }}
                              className="p-2 bg-slate-50 text-slate-400 hover:text-secondary rounded-lg transition-all"
                             >
                                <Edit3 size={16} />
                             </button>
                             <button 
                              onClick={() => model.id && handleDeleteModel(model.id)}
                              className="p-2 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                             >
                                <Trash2 size={16} />
                             </button>
                          </div>
                       </div>
                       <h4 className="text-xl font-black text-primary mb-2 truncate">{model.name}</h4>
                       <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{model.criteria.length} مؤشر أداء مدرج</p>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center">
                       <div className="flex -space-x-2 space-x-reverse">
                          {model.criteria.slice(0, 3).map((_, i) => (
                            <div key={i} className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center">
                               <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                            </div>
                          ))}
                          {model.criteria.length > 3 && (
                            <div className="w-8 h-8 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center text-[8px] font-black text-text-muted">+{model.criteria.length - 3}</div>
                          )}
                       </div>
                       <button 
                        onClick={() => { setEditingModel(model); setShowEditor(true); }}
                        className="text-[11px] font-black text-primary hover:text-secondary uppercase tracking-widest flex items-center gap-2 group"
                       >
                         Edit Matrix <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                       </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
           </div>
        </div>
      </div>

      {/* Matrix Editor Modal */}
      <AnimatePresence>
        {showEditor && (
          <div className="fixed inset-0 bg-[#0a192f]/90 backdrop-blur-xl flex items-center justify-center p-4 z-[100] overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-white rounded-[3.5rem] shadow-massive w-full max-w-4xl overflow-hidden border border-white/20 text-right my-10"
            >
              <div className="bg-primary p-12 text-white relative overflow-hidden border-b-8 border-accent">
                 <div className="absolute top-0 right-0 w-48 h-48 bg-accent/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                 <div className="relative z-10 flex justify-between items-center">
                    <div>
                       <h3 className="text-3xl font-black tracking-tighter">تحرير القالب الاستراتيجي</h3>
                       <p className="text-[10px] font-black text-accent uppercase tracking-[0.4em] mt-2">Matrix Configuration Suite v4.0</p>
                    </div>
                    <button onClick={() => setShowEditor(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10">
                       <X className="w-6 h-6" />
                    </button>
                 </div>
              </div>

              <div className="p-12 space-y-12">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    <div className="md:col-span-2 space-y-3">
                       <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block pr-2">مسمى مصفوفة التقييم</label>
                       <input 
                         required
                         className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-lg font-black focus:border-primary outline-none transition-all text-right"
                         value={editingModel.name}
                         onChange={e => setEditingModel({...editingModel, name: e.target.value})}
                         placeholder="أدخل اسماً رسمياً للمصفوفة..."
                       />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block pr-2">تاريخ التأسيس / التحديث</label>
                       <div className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black text-slate-400 font-mono text-center">
                         {new Date().toISOString().split('T')[0]}
                       </div>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="flex justify-between items-end border-r-8 border-primary pr-6">
                      <div>
                        <h4 className="text-xl font-black text-primary tracking-tighter">هيكلة مؤشرات الأداء (KPIs)</h4>
                        <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mt-1">Matrix Structural Components</p>
                      </div>
                      <button 
                        onClick={addCriterion}
                        className="px-6 py-3 bg-slate-100 hover:bg-primary hover:text-white text-primary text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                      >
                         <Plus size={14} className="inline-block ml-2" /> إدراج مؤشر
                      </button>
                    </div>

                    <div className="bg-slate-50/50 p-8 rounded-[2.5rem] border-2 border-dashed border-slate-100 space-y-6">
                       <DragDropContext onDragEnd={onDragEnd}>
                          <Droppable droppableId="criteria-edit">
                            {(provided) => (
                              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                                {editingModel.criteria?.map((c, i) => (
                                  <Draggable key={`edit-crit-${i}`} draggableId={`edit-crit-${i}`} index={i}>
                                    {(provided) => (
                                      <div 
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm flex items-center gap-6 group hover:border-primary/20 transition-all"
                                      >
                                         <div {...provided.dragHandleProps} className="text-slate-200 group-hover:text-primary transition-colors cursor-grab active:cursor-grabbing">
                                            <GripVertical size={20} />
                                         </div>
                                         <div className="flex-1">
                                            <input 
                                              className="w-full text-base font-black text-primary bg-transparent outline-none border-b-2 border-transparent focus:border-accent py-1 transition-all text-right"
                                              value={c.label}
                                              onChange={e => updateCriterion(i, { label: e.target.value })}
                                            />
                                         </div>
                                         <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                                            <span className="text-[9px] font-black text-text-muted uppercase">الوزن</span>
                                            <input 
                                              type="number"
                                              className="w-10 text-xs font-black bg-transparent text-center outline-none text-primary"
                                              value={c.weight}
                                              onChange={e => updateCriterion(i, { weight: parseInt(e.target.value) || 0 })}
                                            />
                                            <span className="text-[10px] font-bold text-text-muted">%</span>
                                         </div>
                                         <button 
                                          onClick={() => {
                                            const newC = [...(editingModel.criteria || [])];
                                            newC.splice(i, 1);
                                            setEditingModel({...editingModel, criteria: newC});
                                          }}
                                          className="p-3 text-red-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                         >
                                            <Trash2 size={18} />
                                         </button>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                       </DragDropContext>
                    </div>
                 </div>

                 <button 
                  onClick={handleSaveModel}
                  className="w-full h-24 bg-primary text-white rounded-[2.5rem] text-lg font-black uppercase tracking-[0.3em] shadow-premium hover:bg-secondary transition-all border-b-8 border-accent group active:translate-y-2 flex items-center justify-center gap-6"
                 >
                    <ShieldCheck size={28} className="text-accent group-hover:scale-110 transition-transform" />
                    اعتماد المصفوفة في النظام
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
