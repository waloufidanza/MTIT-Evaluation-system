/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../db.ts';
import { Employee, Evaluation, EvaluationCriteria, EvaluationPeriod, EvaluationModel } from '../types.ts';
import { ClipboardCheck, X, User, Calendar, Save, BrainCircuit, Star, Plus, Trash2, GripVertical, AlertTriangle, Building2, Settings2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { analyzeEvaluations } from '../services/geminiService.ts';

interface EvaluationFormProps {
  employee: Employee;
  onClose: () => void;
  onSuccess: (score: number, isDrop: boolean) => void;
}

export default function EvaluationForm({ employee, onClose, onSuccess }: EvaluationFormProps) {
  const [evaluatingDepartment, setEvaluatingDepartment] = useState(employee.department);
  const [period, setPeriod] = useState<EvaluationPeriod>('monthly');
  const [criteria, setCriteria] = useState<EvaluationCriteria[]>([]);
  const [attendance, setAttendance] = useState<Evaluation['attendance']>('excellent');
  const [discipline, setDiscipline] = useState<Evaluation['discipline']>('committed');
  const [trainingNeeds, setTrainingNeeds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | undefined>(undefined);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSaveModel, setShowSaveModel] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [availableModels, setAvailableModels] = useState<EvaluationModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const TRAINING_OPTIONS = [
    'دورة في شبكات الاتصالات (CCNA/CCNP)',
    'دورة في أمن المعلومات والأمن السيبراني',
    'مهارات الحاسب الآلي المتقدمة (ICDL)',
    'إدارة المشاريع الإحترافية (PMP)',
    'مهارات المراسلات الإدارية والأرشفة الإلكترونية',
    'أخرى'
  ];

  useEffect(() => {
    const fetchModels = async () => {
      const models = await db.evaluationModels.toArray();
      setAvailableModels(models);

      // Auto-select model based on multiple attributes (best score wins)
      const rankedModels = models.map(m => {
        let score = 0;
        if (m.positionTags.some(tag => employee.position.includes(tag))) score += 10;
        if (m.departmentTags.some(tag => employee.department.includes(tag))) score += 5;
        if (m.typeTags?.some(tag => employee.type === tag)) score += 3;
        if (m.categoryTags?.some(tag => employee.category === tag)) score += 2;
        return { model: m, score };
      }).filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score);

      const bestMatch = rankedModels.length > 0 ? rankedModels[0].model : null;

      let initialCriteria: EvaluationCriteria[] = [];
      if (bestMatch) {
        setSelectedModelId(bestMatch.id!);
        initialCriteria = bestMatch.criteria.map(c => ({ 
          label: c.label, 
          weight: c.weight, 
          score: 5,
          description: c.description
        }));
      } else {
        // Fallback to legacy behavior if no model matches
        const base = employee.type === 'technical' ? [
          { label: 'جودة العمل الفني والدقة', weight: 25 },
          { label: 'المعرفة التقنية والمهارات البرمجية/الفنية', weight: 25 },
          { label: 'سرعة التنفيذ والإنجاز', weight: 15 },
          { label: 'حل المشكلات والأعطال', weight: 20 },
          { label: 'الالنزام بروح الفريق', weight: 15 },
        ] : [
          { label: 'جودة العمل الإداري', weight: 20 },
          { label: 'المهارات المكتبية والتنظيمية', weight: 20 },
          { label: 'مهارات التواصل والتعامل', weight: 20 },
          { label: 'الانضباط والمواظبة', weight: 20 },
          { label: 'المبادرة والتعاون', weight: 20 },
        ];
        initialCriteria = base.map(c => ({ ...c, score: 5 }));
      }

      // Merge individualized custom criteria from employee object
      if (employee.customCriteria && employee.customCriteria.length > 0) {
        const empCustom = employee.customCriteria.map(c => ({
          label: c.label,
          weight: c.weight,
          score: 5,
          description: c.description
        }));
        initialCriteria = [...initialCriteria, ...empCustom];
      }

      setCriteria(initialCriteria);
    };
    fetchModels();
  }, [employee]);

  const applyModel = (modelId: number) => {
    const model = availableModels.find(m => m.id === modelId);
    if (model) {
      setSelectedModelId(modelId);
      setCriteria(model.criteria.map(c => ({ 
        label: c.label, 
        weight: c.weight, 
        score: 5,
        description: c.description
      })));
    }
  };

  const totalScore = useMemo(() => {
    const sumWeights = criteria.reduce((acc, curr) => acc + curr.weight, 0);
    if (sumWeights === 0) return 0;
    
    // Weighted average scaled to percentage (assuming max score 5 is 100%)
    const weightedSum = criteria.reduce((acc, curr) => {
      return acc + (curr.score * curr.weight);
    }, 0);
    
    return (weightedSum / (sumWeights * 5)) * 100;
  }, [criteria]);

  const totalWeight = useMemo(() => {
    return criteria.reduce((acc, curr) => acc + curr.weight, 0);
  }, [criteria]);

  const handleScoreChange = (index: number, score: number) => {
    const newCriteria = [...criteria];
    newCriteria[index].score = score;
    setCriteria(newCriteria);
  };

  const addCriterion = () => {
    setCriteria([...criteria, { label: 'معيار جديد', weight: 0, score: 5 }]);
  };

  const removeCriterion = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const moveCriterion = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= criteria.length) return;
    
    const newCriteria = [...criteria];
    const temp = newCriteria[index];
    newCriteria[index] = newCriteria[newIndex];
    newCriteria[newIndex] = temp;
    setCriteria(newCriteria);
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(criteria);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setCriteria(items);
  };

  const updateCriterion = (index: number, updates: Partial<EvaluationCriteria>) => {
    const newCriteria = [...criteria];
    
    // Handle weight input specifically to avoid NaN
    if ('weight' in updates) {
      const val = updates.weight;
      if (typeof val === 'number') {
        if (isNaN(val)) updates.weight = 0;
        else if (val < 0) updates.weight = 0;
      }
    }
    
    newCriteria[index] = { ...newCriteria[index], ...updates };
    setCriteria(newCriteria);
  };

  const handleSaveModel = async () => {
    if (!newModelName.trim()) return;
    
    const newModel: EvaluationModel = {
      name: newModelName,
      positionTags: [employee.position],
      departmentTags: [employee.department],
      criteria: criteria.map(c => ({
        label: c.label,
        weight: c.weight,
        description: 'نموذج مخصص مضاف من قبل المستخدم'
      }))
    };

    try {
      await db.evaluationModels.add(newModel);
      const updatedModels = await db.evaluationModels.toArray();
      setAvailableModels(updatedModels);
      setShowSaveModel(false);
      setNewModelName('');
    } catch (err) {
      console.error("Failed to save model:", err);
      let errorMsg = "حدث خطأ غير متوقع أثناء حفظ النموذج";
      if (err instanceof Error) {
        if (err.name === 'ConstraintError') {
          errorMsg = "فشل الحفظ: يوجد نموذج آخر بنفس الاسم";
        } else {
          errorMsg = `فشل حفظ النموذج: ${err.message}`;
        }
      }
      setError(errorMsg);
      setShowSaveModel(false);
    }
  };

  const handleSubmit = () => {
    setError(null);
    // Final Validation
    const invalidWeights = criteria.some(c => c.weight <= 0);
    const emptyLabels = criteria.some(c => !c.label.trim());
    
    if (invalidWeights) {
      setError("يرجى التأكد من أن كافة الأوزان قيم إيجابية أكبر من صفر");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    if (emptyLabels) {
      setError("يرجى ملء كافة مسميات المعايير");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setShowConfirm(true);
  };

  const submitEvaluation = async () => {
    setError(null);
    const evaluation: Evaluation = {
      employeeId: employee.id!,
      period,
      evaluatingDepartment,
      date: new Date().toISOString().split('T')[0],
      year: new Date().getFullYear(),
      month: period === 'monthly' ? new Date().getMonth() + 1 : undefined,
      criteria,
      attendance,
      discipline,
      trainingNeeds,
      notes,
      totalScore,
      aiAnalysis
    };

    try {
      // Check for performance drop relative to last few evals
      const previous = await db.evaluations
        .where('employeeId')
        .equals(employee.id!)
        .toArray();
      
      const avgScore = previous.length >= 2 
        ? previous.reduce((acc, curr) => acc + curr.totalScore, 0) / previous.length 
        : totalScore; 

      const isDrasticDrop = previous.length >= 2 && totalScore < avgScore * 0.85;

      await db.evaluations.add(evaluation);
      onSuccess(totalScore, isDrasticDrop);
      onClose();
    } catch (err) {
      console.error("Failed to save evaluation:", err);
      let errorMsg = "حدث خطأ غير متوقع أثناء حفظ التقييم";
      
      if (err instanceof Error) {
        if (err.name === 'QuotaExceededError') {
          errorMsg = "فشل الحفظ: لا توجد مساحة تخزينية كافية في المتصفح";
        } else if (err.name === 'DataError') {
          errorMsg = "فشل الحفظ: بيانات التقييم غير صالحة";
        } else {
          errorMsg = `فشل حفظ التقييم: ${err.message}`;
        }
      }
      
      setError(errorMsg);
      setShowConfirm(false);
    }
  };

  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      // Get previous evaluations to provide context
      const previous = await db.evaluations
        .where('employeeId')
        .equals(employee.id!)
        .limit(5)
        .toArray();
      
      const currentEval: Evaluation = {
        employeeId: employee.id!,
        period,
        date: new Date().toISOString(),
        year: new Date().getFullYear(),
        criteria,
        attendance,
        discipline,
        trainingNeeds,
        notes,
        totalScore
      };

      const result = await analyzeEvaluations(employee, [...previous, currentEval]);
      setAiAnalysis(result);
    } catch (error) {
      console.error("AI Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[3rem] shadow-premium w-full max-w-5xl overflow-hidden relative my-8 border border-white/20"
      >
        {/* Authoritative Header */}
        <div className="bg-primary p-8 md:p-12 text-white relative overflow-hidden border-b-8 border-accent">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/az-subtle.png')] opacity-10 pointer-events-none" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 text-right">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white rounded-3xl p-3 flex items-center justify-center shadow-premium group">
                 <ClipboardCheck className="w-10 h-10 text-primary transition-transform group-hover:scale-110" />
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-black tracking-tighter">تحرير نموذج تقييم الأداء</h2>
                <div className="flex items-center gap-3 mt-2">
                  <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black text-accent uppercase tracking-widest border border-accent/20">
                    Sovereign Evaluation Matrix v4.0
                  </div>
                  <div className="h-1 w-8 bg-accent/30 rounded-full" />
                  <p className="text-white/60 text-[11px] font-bold uppercase tracking-widest">الموظف: {employee.name}</p>
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

        <div className="p-8 md:p-16 grid grid-cols-1 lg:grid-cols-5 gap-16 text-right">
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="lg:col-span-5 bg-red-50 border-r-8 border-red-500 p-6 rounded-2xl text-red-700 text-xs font-black uppercase tracking-tight flex items-center gap-4"
              >
                <AlertTriangle className="w-6 h-6" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="lg:col-span-3 space-y-12">
            {/* Configuration Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] block pr-1">الدورة الزمنية المستهدفة</label>
                <div className="relative group">
                   <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40 group-focus-within:text-primary transition-colors" />
                   <select 
                    value={period}
                    onChange={e => setPeriod(e.target.value as EvaluationPeriod)}
                    className="w-full pr-12 pl-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-primary focus:bg-white transition-all cursor-pointer appearance-none"
                  >
                    <option value="monthly">تقييم شهري (Monthly)</option>
                    <option value="quarterly">تقييم ربع سنوي (Quarterly)</option>
                    <option value="semi-annual">تقييم نصف سنوي (Semi-Annual)</option>
                    <option value="annual">تقييم سنوي (Annual)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] block pr-1">قالب المعايير المعتمد</label>
                <div className="relative group">
                   <Settings2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary/40 group-focus-within:text-secondary transition-colors" />
                   <select 
                    value={selectedModelId || ''}
                    onChange={e => applyModel(Number(e.target.value))}
                    className="w-full pr-12 pl-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-secondary focus:bg-white transition-all cursor-pointer appearance-none"
                  >
                    <option value="">-- اختيار القالب --</option>
                    {availableModels.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {employee.secondDepartment && (
               <div className="p-8 bg-secondary/5 rounded-[2.5rem] border-2 border-dashed border-secondary/20 relative group overflow-hidden">
                 <div className="absolute top-0 left-0 w-24 h-24 bg-secondary/5 rounded-full blur-2xl -translate-x-10 -translate-y-10" />
                 <div className="relative z-10">
                   <div className="flex items-center gap-4 mb-6">
                      <div className="p-3 bg-white rounded-2xl shadow-sm border border-secondary/10">
                        <Building2 className="w-5 h-5 text-secondary" />
                      </div>
                      <h4 className="text-[11px] font-black text-secondary uppercase tracking-[0.3em]">جهة الإمداد الوظيفي</h4>
                   </div>
                   <select 
                    value={evaluatingDepartment}
                    onChange={e => setEvaluatingDepartment(e.target.value)}
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 text-sm font-black outline-none focus:border-secondary transition-all"
                  >
                    <option value={employee.department}>جهة الأصل: {employee.department}</option>
                    <option value={employee.secondDepartment}>جهة الانتداب: {employee.secondDepartment}</option>
                  </select>
                 </div>
               </div>
            )}

            {/* Specialist Criteria Section */}
            <div className="space-y-8">
              <div className="flex justify-between items-end border-r-8 border-primary pr-6">
                <div className="text-right">
                   <h3 className="text-2xl font-black text-primary tracking-tighter">المعايير التخصصية والفنية</h3>
                   <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mt-1">Specialized Performance Vectors</p>
                </div>
                <button 
                  onClick={addCriterion}
                  className="flex items-center gap-3 px-6 py-3 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-secondary transition-all shadow-premium"
                >
                  <Plus className="w-4 h-4" /> إضافة معيار نوعي
                </button>
              </div>

              <div className="space-y-6">
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="criteria-list">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6">
                        {criteria.length === 0 ? (
                           <div className="py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-100 italic text-[13px] font-bold text-text-muted opacity-40">
                               لا توجد معايير نشطة حالياً. يرجى اختيار قالب أو إضافة معيار يدوي.
                           </div>
                        ) : (
                          criteria.map((c, i) => (
                            <Draggable key={`crit-${i}`} draggableId={`crit-${i}`} index={i}>
                              {(provided) => (
                                <div 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className="p-8 bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-premium space-y-8 relative group hover:border-primary/20 transition-all hover:shadow-2xl text-right"
                                >
                                  <div className="flex flex-col gap-6">
                                    <div className="flex items-start gap-4">
                                       <div {...provided.dragHandleProps} className="mt-2 text-slate-200 hover:text-primary transition-colors cursor-grab active:cursor-grabbing">
                                         <GripVertical size={20} />
                                       </div>
                                       <div className="flex-1 space-y-4">
                                         <input 
                                           className="w-full text-lg font-black text-primary bg-transparent border-b-2 border-transparent focus:border-accent outline-none py-1 transition-all text-right"
                                           value={c.label}
                                           placeholder="مسمى مؤشر الأداء..."
                                           onChange={(e) => updateCriterion(i, { label: e.target.value })}
                                         />
                                         {c.description && (
                                           <div className="flex items-center gap-3">
                                              <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                                              <p className="text-[11px] font-bold text-text-muted italic opacity-60 uppercase tracking-tight">
                                                {c.description}
                                              </p>
                                           </div>
                                         )}
                                       </div>
                                       <div className="flex items-center gap-3 bg-primary/[0.03] px-5 py-3 rounded-2xl border border-primary/5">
                                         <span className="text-[10px] font-black text-primary uppercase tracking-widest">الوزن النسبي</span>
                                         <div className="flex items-center gap-1">
                                            <input 
                                              type="number"
                                              className={`w-12 text-sm font-black bg-transparent text-center outline-none ${
                                                c.weight <= 0 ? 'text-red-500' : 'text-primary'
                                              }`}
                                              value={c.weight}
                                              onChange={(e) => updateCriterion(i, { weight: Number(e.target.value) })}
                                            />
                                            <span className="text-[11px] font-black text-primary/40">%</span>
                                         </div>
                                       </div>
                                       <button 
                                         onClick={() => removeCriterion(i)}
                                         className="p-3 text-red-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                                       >
                                         <Trash2 size={18} />
                                       </button>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-5 gap-4">
                                    {[1, 2, 3, 4, 5].map(score => (
                                      <button
                                        key={score}
                                        onClick={() => handleScoreChange(i, score)}
                                        className={`py-5 rounded-2xl text-[13px] font-black transition-all border-4 ${
                                          c.score === score 
                                          ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20 scale-105 relative z-10' 
                                          : 'bg-white text-text-muted border-slate-50 hover:border-slate-100 hover:bg-slate-50'
                                        }`}
                                      >
                                        <div className="flex flex-col items-center gap-1">
                                          <span className="text-xl leading-none">{score}</span>
                                          <span className="text-[9px] font-bold uppercase tracking-tighter opacity-50">
                                            {score === 1 ? 'تدني' : score === 3 ? 'متوافق' : score === 5 ? 'إتقان' : ''}
                                          </span>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>

              {totalWeight > 0 && totalWeight !== 100 && (
                <div className="p-6 bg-amber-50 border-2 border-dashed border-amber-200 rounded-3xl text-[11px] font-black text-amber-700 flex items-center justify-between uppercase tracking-widest">
                  <div className="flex items-center gap-4">
                    <AlertTriangle size={18} />
                    <span>مجموع الأوزان الموزعة: {totalWeight}%</span>
                  </div>
                  <span className="opacity-60 text-[9px]">ملاحظة: النظام سيعتمد النسب الموزونة بغض النظر عن المجموع</span>
                </div>
              )}

              <button 
                onClick={() => setShowSaveModel(true)}
                className="w-full flex items-center justify-center gap-4 py-5 bg-slate-50 hover:bg-white text-slate-400 hover:text-primary rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.3em] transition-all border-2 border-transparent hover:border-primary/20 hover:shadow-premium"
              >
                <Save className="w-5 h-5" /> حفظ هذه المصفوفة كنموذج استراتيجي جديد
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-12 text-right">
            {/* Real-time Result Section */}
            <div className={`p-10 rounded-[3.5rem] text-white relative overflow-hidden transition-all duration-700 shadow-premium ${
              totalScore >= 90 ? 'bg-emerald-600' : 
              totalScore >= 75 ? 'bg-secondary' : 
              totalScore >= 50 ? 'bg-amber-600' : 'bg-red-700'
            }`}>
              <div className="absolute inset-0 glossy-mesh opacity-30" />
              <div className="absolute top-0 left-0 w-48 h-48 bg-white/10 rounded-full -translate-x-10 -translate-y-10 blur-[80px]" />
              
              <div className="relative z-10 space-y-10">
                <div className="flex justify-between items-start">
                   <div className="space-y-1 text-right">
                      <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">Real-time Performance Index</p>
                      <h4 className="text-xl font-black tracking-tight">مؤشر الجودة الفوري</h4>
                   </div>
                   <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                      <Star className="text-accent fill-accent" size={24} />
                   </div>
                </div>

                <div className="text-center py-6">
                   <p className="text-8xl md:text-9xl font-black text-white drop-shadow-2xl">%{totalScore.toFixed(0)}</p>
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${totalScore}%` }}
                     className="h-3 bg-accent rounded-full mt-10 shadow-[0_0_20px_rgba(212,175,55,0.6)] border border-white/20"
                   />
                   <div className="flex justify-between mt-4 text-[10px] font-black text-white/40 uppercase tracking-widest">
                     <span>Unstable</span>
                     <span>Target Reach</span>
                     <span>Elite Force</span>
                   </div>
                </div>

                <div className="p-6 bg-white/10 backdrop-blur-md rounded-3xl border border-white/10">
                   <p className="text-[11px] font-bold text-white/90 leading-relaxed text-center italic">
                     {totalScore >= 90 ? "الموظف يحقق أقصى معايير الكفاءة المهنية المتوقعة." :
                      totalScore >= 70 ? "الموظف يلتزم بمسار نمو مستقر وإيجابي." : 
                      "الموظف يتطلب خطة تحسين عاجلة وتدخل إشرافي."}
                   </p>
                </div>
              </div>
            </div>

            {/* Additional Evaluations Section */}
            <div className="space-y-10 text-right">
               <div className="space-y-6">
                  <h3 className="text-[12px] font-black text-primary border-r-4 border-accent pr-4 uppercase tracking-[0.3em]">التقييم السلوكي والانضباطي</h3>
                  
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block pr-1">سجل الحضور والمواظبة</label>
                      <select 
                        value={attendance}
                        onChange={e => setAttendance(e.target.value as any)}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-[11px] font-black outline-none focus:border-primary transition-all appearance-none text-right"
                      >
                        <option value="excellent">المستوى الأول: انضباط تام (Excellent)</option>
                        <option value="good">المستوى الثاني: التزام جيد (Good)</option>
                        <option value="average">المستوى الثالث: تذبذب في الحضور (Average)</option>
                        <option value="poor">المستوى الرابع: إهمال متكرر (Poor)</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block pr-1">الامتثال للوائح الداخلية</label>
                      <select 
                        value={discipline}
                        onChange={e => setDiscipline(e.target.value as any)}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-[11px] font-black outline-none focus:border-primary transition-all appearance-none text-right"
                      >
                        <option value="committed">ملتزم بالسياسات الرسمية (Committed)</option>
                        <option value="needs-improvement">تجاوزات طفيفة (Needs Review)</option>
                        <option value="warning">مخالفات موثقة (Official Warning)</option>
                      </select>
                    </div>
                  </div>
               </div>

               <div className="space-y-3">
                 <label className="text-[12px] font-black text-primary border-r-4 border-accent pr-4 uppercase tracking-[0.3em] block mb-6">ملاحظات القيادة العليا</label>
                 <textarea
                   value={notes}
                   onChange={e => setNotes(e.target.value)}
                   className="w-full h-40 px-6 py-5 rounded-[2rem] border-2 border-slate-100 focus:border-primary focus:bg-white outline-none transition-all resize-none text-sm font-bold text-primary placeholder:text-slate-200 bg-slate-50 shadow-inner text-right"
                   placeholder="إدخال التقرير الوصفي لأداء الموظف ونقاط القوة والضعف المرصودة..."
                 />
               </div>

               <div className="space-y-6 pt-4">
                  <button
                    onClick={handleAIAnalysis}
                    disabled={isAnalyzing}
                    className="w-full h-20 rounded-[2.5rem] ai-gradient text-white flex items-center justify-center gap-6 shadow-premium group disabled:opacity-50 transition-all border border-white/20 active:scale-[0.98]"
                  >
                    {isAnalyzing ? (
                      <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <BrainCircuit className="w-8 h-8 text-accent group-hover:rotate-12 transition-transform" />
                    )}
                    <span className="text-[13px] font-black uppercase tracking-[0.4em]">تفعيل الذكاء الاصطناعي</span>
                  </button>

                  <AnimatePresence>
                    {aiAnalysis && (
                      <motion.div 
                        initial={{ opacity: 0, y: 30, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="p-10 bg-slate-900 rounded-[3rem] text-white/80 text-xs leading-relaxed font-medium relative overflow-hidden group shadow-2xl text-right"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-2xl" />
                        <div className="relative z-10 ai-markdown-container prose-invert" dangerouslySetInnerHTML={{ __html: aiAnalysis.replace(/\n/g, '<br/>') }} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={handleSubmit}
                    className="w-full h-24 rounded-[2.5rem] bg-primary text-white text-lg font-black hover:bg-secondary transition-all shadow-premium border-b-8 border-accent group active:translate-y-2"
                  >
                    <div className="flex items-center justify-center gap-4">
                       <ShieldCheck size={32} className="text-accent group-hover:scale-110 transition-transform" />
                       إعتماد وحفظ التقييم رسمياً
                    </div>
                  </button>
               </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 z-[100]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[3rem] shadow-massive w-full max-w-md overflow-hidden border border-white/20 text-right"
            >
              <div className="bg-primary p-10 text-white text-center border-b-8 border-accent relative overflow-hidden">
                 <div className="absolute inset-0 glossy-mesh opacity-20" />
                 <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md border border-white/20">
                   <ShieldCheck className="w-10 h-10 text-accent" />
                 </div>
                 <h3 className="text-2xl font-black uppercase tracking-wide">تأكيد الإعتماد السيادي</h3>
                 <p className="text-[10px] text-accent font-black uppercase tracking-[0.4em] mt-2">Executive Performance Verification</p>
              </div>

              <div className="p-10 space-y-10">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 text-center">
                    <p className="text-[10px] font-black text-text-muted uppercase mb-2 tracking-widest">نتيجة المؤشر</p>
                    <p className="text-4xl font-black text-primary">%{totalScore.toFixed(0)}</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 text-center">
                    <p className="text-[10px] font-black text-text-muted uppercase mb-2 tracking-widest">نوع الدورة</p>
                    <p className="text-sm font-black text-primary">
                      {period === 'monthly' ? 'تقييم شهري' : period === 'quarterly' ? 'ربع سنوي' : period === 'semi-annual' ? 'نصف سنوي' : 'سنوي'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <SummaryItem 
                    label="جودة المواظبة" 
                    value={attendance === 'excellent' ? 'ممتاز' : attendance === 'good' ? 'جيد' : attendance === 'average' ? 'متوسط' : 'ضعيف'} 
                  />
                  <SummaryItem 
                    label="مستوى الامتثال" 
                    value={discipline === 'committed' ? 'ملتزم جداً' : discipline === 'needs-improvement' ? 'نوازع مراجعة' : 'إنذار رسمي'} 
                  />
                  <SummaryItem 
                    label="نطاق المعايير" 
                    value={`${criteria.length} مؤشر أداء`} 
                  />
                </div>

                <div className="p-6 bg-primary/[0.02] rounded-3xl border-2 border-dashed border-primary/10 flex gap-4 italic items-start">
                  <div className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1.5" />
                  <p className="text-[11px] text-primary/70 leading-relaxed font-bold">
                    بمجرد الاعتماد، ستتم أرشفة هذه النتائج في السجلات السيادية للوزارة ولا يمكن تعديلها إلا عبر بروتوكولات تصحيحية معتمدة.
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  <button
                    onClick={submitEvaluation}
                    className="w-full py-5 bg-primary text-white font-black text-xs uppercase tracking-[0.3em] rounded-2xl hover:bg-secondary transition-all shadow-premium border-b-6 border-accent active:translate-y-2"
                  >
                    ختم وإدراج النتائج
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="w-full py-4 bg-white text-text-muted font-black text-xs uppercase tracking-[0.3em] rounded-2xl hover:bg-slate-100 transition-all border-2 border-slate-100"
                  >
                    تراجع للمراجعة
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Save Model Modal */}
      <AnimatePresence>
        {showSaveModel && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4 z-[110]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[3rem] shadow-massive w-full max-w-sm overflow-hidden border border-white/20 text-right"
            >
              <div className="bg-primary p-8 text-white text-center border-b-8 border-accent relative overflow-hidden">
                 <div className="absolute inset-0 glossy-mesh opacity-20" />
                 <h3 className="text-xl font-black uppercase tracking-wide">تأسيس قالب استراتيجي</h3>
                 <p className="text-[10px] text-accent font-black uppercase tracking-[0.3em] mt-2">New Administrative Template</p>
              </div>

              <div className="p-10 space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block pr-2 text-right">عنوان القالب الجديد</label>
                  <input 
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all text-right"
                    placeholder="مثلاً: وحدة الهندسة الرقمية..."
                    value={newModelName}
                    onChange={e => setNewModelName(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <button
                    onClick={handleSaveModel}
                    disabled={!newModelName.trim()}
                    className="w-full py-5 bg-primary text-white font-black text-xs uppercase tracking-[0.3em] rounded-2xl hover:bg-secondary transition-all shadow-premium border-b-6 border-accent active:translate-y-2 disabled:opacity-50"
                  >
                    إعتماد حفظ القالب
                  </button>
                  <button
                    onClick={() => setShowSaveModel(false)}
                    className="w-full py-4 bg-white text-text-muted font-black text-xs uppercase tracking-[0.3em] rounded-2xl hover:bg-slate-100 transition-all border-2 border-slate-100"
                  >
                    إلغاء العملية
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center py-4 border-b-2 border-slate-100 last:border-0 uppercase tracking-tighter">
      <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{label}</span>
      <span className="text-[12px] font-black text-primary">{value}</span>
    </div>
  );
}
