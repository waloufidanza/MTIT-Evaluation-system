/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../db.ts';
import { Employee, Evaluation, EvaluationCriteria, EvaluationPeriod, EvaluationModel } from '../types.ts';
import { ClipboardCheck, X, User, Calendar, Save, BrainCircuit, Star, Plus, Trash2, GripVertical, AlertTriangle, Building2, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { analyzeEvaluations } from '../services/geminiService.ts';

interface EvaluationFormProps {
  employee: Employee;
  onClose: () => void;
  onSuccess: () => void;
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

      // Auto-select model based on position/dept tags
      const bestMatch = models.find(m => 
        m.positionTags.some(tag => employee.position.includes(tag)) ||
        m.departmentTags.some(tag => employee.department.includes(tag))
      );

      if (bestMatch) {
        setSelectedModelId(bestMatch.id!);
        setCriteria(bestMatch.criteria.map(c => ({ label: c.label, weight: c.weight, score: 5 })));
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
        setCriteria(base.map(c => ({ ...c, score: 5 })));
      }
    };
    fetchModels();
  }, [employee]);

  const applyModel = (modelId: number) => {
    const model = availableModels.find(m => m.id === modelId);
    if (model) {
      setSelectedModelId(modelId);
      setCriteria(model.criteria.map(c => ({ label: c.label, weight: c.weight, score: 5 })));
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
    }
  };

  const [error, setError] = useState<string | null>(null);

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
      await db.evaluations.add(evaluation);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to save evaluation:", err);
      const errorMsg = err instanceof Error ? err.message : "حدث خطأ غير معروف";
      setError(`فشل حفظ التقييم: ${errorMsg}`);
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden relative my-8"
      >
        <div className="bg-primary p-6 text-white flex justify-between items-center sticky top-0 z-10 border-b-4 border-accent">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="w-6 h-6 text-accent" />
            <div>
              <h2 className="text-lg font-bold">نموذج تقييم أداء الكادر</h2>
              <p className="text-white/80 text-[10px] uppercase font-bold tracking-widest">الموظف: {employee.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 md:p-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="lg:col-span-2 bg-red-50 border border-red-200 p-4 rounded-xl text-red-600 text-xs font-bold"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded border border-border-theme">
              <div className="p-2 bg-white shadow-sm rounded">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">فترة التقييم الحالية</label>
                <select 
                  value={period}
                  onChange={e => setPeriod(e.target.value as EvaluationPeriod)}
                  className="w-full bg-transparent font-bold text-sm outline-none cursor-pointer text-text-dark"
                >
                  <option value="monthly">تقييم شهري</option>
                  <option value="quarterly">تقييم ربع سنوي</option>
                  <option value="semi-annual">تقييم نصف سنوي</option>
                  <option value="annual">تقييم سنوي</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded border border-border-theme">
              <div className="p-2 bg-white shadow-sm rounded">
                <Settings2 className="w-4 h-4 text-secondary" />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">نموذج التقييم المستخدم</label>
                <select 
                  value={selectedModelId || ''}
                  onChange={e => applyModel(Number(e.target.value))}
                  className="w-full bg-transparent font-bold text-sm outline-none cursor-pointer text-text-dark"
                >
                  <option value="">-- اختر نموذجاً --</option>
                  {availableModels.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {employee.secondDepartment && (
              <div className="flex items-center gap-4 bg-secondary/5 p-4 rounded border border-secondary/20">
                <div className="p-2 bg-white shadow-sm rounded">
                  <Building2 className="w-4 h-4 text-secondary" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">التقييم لصالح إدارة...</label>
                  <select 
                    value={evaluatingDepartment}
                    onChange={e => setEvaluatingDepartment(e.target.value)}
                    className="w-full bg-transparent font-bold text-sm outline-none cursor-pointer text-text-dark"
                  >
                    <option value={employee.department}>الإدارة الرئيسية ({employee.department})</option>
                    <option value={employee.secondDepartment}>الإدارة المستعان بها ({employee.secondDepartment})</option>
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex justify-between items-center border-r-4 border-primary pr-3">
                <h3 className="text-sm font-bold text-text-dark uppercase tracking-wide">معايير التقييم التخصصية</h3>
                <button 
                  onClick={addCriterion}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 text-[10px] font-black text-primary hover:bg-primary hover:text-white rounded-lg transition-all border border-primary/10 uppercase tracking-tighter"
                >
                  <Plus className="w-3 h-3" /> إضافة معيار مخصص
                </button>
              </div>

              <div className="bg-slate-50/50 p-4 rounded-2xl border border-dashed border-border-theme space-y-4">
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="criteria-list">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                        {criteria.length === 0 ? (
                           <div className="py-10 text-center text-text-muted italic text-[11px] opacity-40">
                              لا توجد معايير مضافة. يرجى اختيار نموذج أو إضافة معيار مخصص.
                           </div>
                        ) : (
                          criteria.map((c, i) => (
                            <Draggable key={`crit-${i}`} draggableId={`crit-${i}`} index={i}>
                              {(provided) => (
                                <div 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className="p-4 bg-white border border-border-theme rounded-xl shadow-sm space-y-4 relative group hover:border-primary/30 transition-colors"
                                >
                                  <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-2">
                                       <div {...provided.dragHandleProps} className="text-slate-300 hover:text-primary transition-colors pr-1 cursor-grab active:cursor-grabbing">
                                         <GripVertical size={16} />
                                       </div>
                                       <input 
                                         className="flex-1 text-sm font-bold text-text-dark bg-transparent border-b border-transparent focus:border-primary outline-none py-0.5"
                                         value={c.label}
                                         placeholder="مسمى المعيار (مثلاً: جودة الإنتاجية)..."
                                         onChange={(e) => updateCriterion(i, { label: e.target.value })}
                                       />
                                       <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-border-theme">
                                         <span className="text-[9px] font-black text-text-muted uppercase">الوزن</span>
                                         <input 
                                           type="number"
                                           className={`w-10 text-xs font-black bg-transparent text-center outline-none ${
                                             c.weight <= 0 ? 'text-red-500' : 'text-primary'
                                           }`}
                                           value={c.weight}
                                           onChange={(e) => updateCriterion(i, { weight: Number(e.target.value) })}
                                         />
                                         <span className="text-[10px] font-bold text-text-muted">%</span>
                                       </div>
                                       <button 
                                         onClick={() => removeCriterion(i)}
                                         className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                       >
                                         <Trash2 size={14} />
                                       </button>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-5 gap-2">
                                    {[1, 2, 3, 4, 5].map(score => (
                                      <button
                                        key={score}
                                        onClick={() => handleScoreChange(i, score)}
                                        className={`py-2 rounded-lg text-[11px] font-black transition-all border-2 ${
                                          c.score === score 
                                          ? 'bg-secondary text-white border-secondary shadow-lg shadow-secondary/20 -translate-y-0.5' 
                                          : 'bg-white text-text-muted border-slate-100 hover:border-border-theme hover:bg-slate-50'
                                        }`}
                                      >
                                        {score}
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
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[10px] font-bold text-amber-700 flex items-center gap-2">
                  <AlertTriangle size={14} />
                  <span>مجموع الأوزان الحالي: {totalWeight}% (يوصى بـ 100% لدقة التحليل)</span>
                </div>
              )}

              <button 
                onClick={() => setShowSaveModel(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-200"
              >
                <Save className="w-3.5 h-3.5" /> حفظ المعايير الحالية كنموذج جديد
              </button>
            </div>

            {/* Behavioral & Disciplinary Section */}
            <div className="space-y-6 pt-4 border-t border-border-theme">
              <h3 className="text-sm font-bold text-text-dark border-r-4 border-primary pr-3 uppercase tracking-wide">التقييم السلوكي والإداري</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">الانضباط والمواظبة</label>
                  <select 
                    value={attendance}
                    onChange={e => setAttendance(e.target.value as any)}
                    className="w-full bg-white border border-border-theme rounded p-2.5 text-xs font-bold outline-none"
                  >
                    <option value="excellent">ممتاز (بلا غيابات)</option>
                    <option value="good">جيد (غياب نادر)</option>
                    <option value="average">متوسط (تأخير متكرر)</option>
                    <option value="poor">ضعيف (غياب بدون عذر)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">الالتزام بالتعليمات واللوائح</label>
                  <select 
                    value={discipline}
                    onChange={e => setDiscipline(e.target.value as any)}
                    className="w-full bg-white border border-border-theme rounded p-2.5 text-xs font-bold outline-none"
                  >
                    <option value="committed">ملتزم جداً</option>
                    <option value="needs-improvement">يحتاج إلى تحسين</option>
                    <option value="warning">لديه تنبيهات سابقة</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">الاحتياجات التدريبية المقترحة</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {TRAINING_OPTIONS.map(option => (
                    <label key={option} className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-border-theme cursor-pointer hover:bg-white transition-colors">
                      <input 
                        type="checkbox"
                        checked={trainingNeeds.includes(option)}
                        onChange={e => {
                          if (e.target.checked) setTrainingNeeds([...trainingNeeds, option]);
                          else setTrainingNeeds(trainingNeeds.filter(t => t !== option));
                        }}
                        className="w-3.5 h-3.5 accent-primary"
                      />
                      <span className="text-[10px] font-medium text-text-dark">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className={`p-8 rounded shadow-xl text-white relative overflow-hidden transition-colors duration-500 ${
              totalScore >= 90 ? 'bg-emerald-600' : 
              totalScore >= 75 ? 'bg-secondary' : 
              totalScore >= 50 ? 'bg-amber-600' : 'bg-red-700'
            }`}>
              <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-10 -translate-y-10 blur-2xl" />
              <div className="relative z-10 space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-white/70 text-[10px] font-black uppercase tracking-[0.2em]">إجمالي النسبة المئوية للأداء</p>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                      <span className="text-[9px] font-bold text-accent uppercase">Live calculation</span>
                    </div>
                  </div>
                  <p className="text-6xl font-black text-accent drop-shadow-md">%{totalScore.toFixed(0)}</p>
                </div>
                
                <div className="space-y-1.5">
                  <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden border border-white/10">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${totalScore}%` }}
                      className="h-full bg-accent shadow-[0_0_10px_rgba(212,175,55,0.5)]"
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-bold text-white/50 uppercase tracking-tighter">
                    <span>ضعيف</span>
                    <span>متوسط</span>
                    <span>جيد جداً</span>
                    <span>ممتاز</span>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 right-0 p-4 opacity-10">
                <Star className="w-24 h-24 text-white fill-white" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">ملاحظات رئيس الوحدة</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full h-32 px-4 py-3 rounded border border-border-theme focus:ring-1 focus:ring-primary outline-none transition-all resize-none text-sm bg-[#fafafa]"
                placeholder="رؤيتكم حول أداء الموظف..."
              />
            </div>

            <div className="space-y-4">
              <button
                onClick={handleAIAnalysis}
                disabled={isAnalyzing}
                className="w-full flex items-center justify-center gap-3 py-3 rounded ai-gradient text-white font-bold hover:opacity-90 disabled:opacity-50 transition-all shadow-md group border border-white/10"
              >
                {isAnalyzing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <BrainCircuit className="w-5 h-5 text-accent" />
                )}
                <span className="text-[11px] uppercase tracking-widest">
                  {aiAnalysis ? 'تحديث التحليلات الذكية' : 'تحليل الأداء بالذكاء الاصطناعي'}
                </span>
              </button>

              {aiAnalysis && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 bg-secondary/5 border border-secondary/10 rounded max-h-60 overflow-y-auto text-xs leading-relaxed text-secondary/80 prose-sm prose-slate max-w-none text-right"
                >
                  <div dangerouslySetInnerHTML={{ __html: aiAnalysis.replace(/\n/g, '<br/>') }} />
                </motion.div>
              )}

              <button
                onClick={handleSubmit}
                className="w-full flex items-center justify-center gap-3 py-4 rounded bg-primary text-white text-base font-bold hover:bg-secondary transition-all shadow-lg border-b-4 border-accent"
              >
                <Save className="w-5 h-5" />
                إعتماد وإغلاق النموذج
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-border-theme"
            >
              <div className="bg-slate-900 p-6 text-white text-center border-b-4 border-accent">
                 <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                   <ClipboardCheck className="w-8 h-8 text-accent" />
                 </div>
                 <h3 className="text-xl font-black uppercase tracking-wide">تأكيد إعتماد التقييم</h3>
                 <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest mt-1">مراجعة نهائية لبيانات أداء الموظف</p>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-border-theme text-center">
                    <p className="text-[9px] font-black text-text-muted uppercase mb-1">النتيجة النهائية</p>
                    <p className="text-2xl font-black text-primary">%{totalScore.toFixed(0)}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-border-theme text-center">
                    <p className="text-[9px] font-black text-text-muted uppercase mb-1">دورة التقييم</p>
                    <p className="text-sm font-bold text-text-dark">
                      {period === 'monthly' ? 'تقييم شهري' : period === 'quarterly' ? 'ربع سنوي' : period === 'semi-annual' ? 'نصف سنوي' : 'سنوي'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <SummaryItem 
                    label="المواظبة والانضباط" 
                    value={attendance === 'excellent' ? 'ممتاز' : attendance === 'good' ? 'جيد' : attendance === 'average' ? 'متوسط' : 'ضعيف'} 
                  />
                  <SummaryItem 
                    label="الالتزام بالتعليمات" 
                    value={discipline === 'committed' ? 'ملتزم جداً' : discipline === 'needs-improvement' ? 'يحتاج تحسين' : 'لديه تنبيهات'} 
                  />
                  <SummaryItem 
                    label="المعايير المقيّمة" 
                    value={`${criteria.length} معيار أداء`} 
                  />
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100/50 flex gap-3 italic">
                  <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                    بمجرد الاعتماد، سيتم حفظ هذه النتائج في السجل التاريخي للموظف ولا يمكن تعديلها لاحقاً إلا من قبل مدير النظام.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={submitEvaluation}
                    className="w-full py-4 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-secondary transition-all shadow-xl border-b-4 border-accent active:translate-y-1"
                  >
                    تأكيد وحفظ بشكل نهائي
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="w-full py-3 bg-white text-text-muted font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all"
                  >
                    رجوع للتعديل
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[110]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-border-theme text-right"
            >
              <div className="bg-primary p-6 text-white text-center border-b-4 border-accent">
                 <h3 className="text-lg font-black uppercase tracking-wide">حفظ كنموذج تقييم</h3>
                 <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest mt-1">سيتمكن المستخدمون الآخرون من استخدام هذه المعايير</p>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block pr-1">اسم النموذج</label>
                  <input 
                    className="w-full px-4 py-3 bg-slate-50 border border-border-theme rounded-xl text-sm font-bold outline-none focus:ring-1 focus:ring-primary"
                    placeholder="مثلاً: نموذج الفنيين المتخصصين..."
                    value={newModelName}
                    onChange={e => setNewModelName(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleSaveModel}
                    disabled={!newModelName.trim()}
                    className="w-full py-4 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-secondary transition-all shadow-xl shadow-primary/20 border-b-4 border-accent active:translate-y-1 disabled:opacity-50"
                  >
                    اعتماد حفظ النموذج
                  </button>
                  <button
                    onClick={() => setShowSaveModel(false)}
                    className="w-full py-3 bg-white text-text-muted font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all border border-border-theme"
                  >
                    إلغاء
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
    <div className="flex justify-between items-center py-2 border-b border-border-theme last:border-0 uppercase tracking-tighter">
      <span className="text-[10px] font-black text-text-muted">{label}</span>
      <span className="text-[11px] font-bold text-text-dark">{value}</span>
    </div>
  );
}
