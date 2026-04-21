/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { Evaluation, Employee } from "../types.ts";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeEvaluations(employee: Employee, evaluations: Evaluation[]) {
  const prompt = `
    أنت خبير استشاري متقدم في إدارة الموارد البشرية والتحليل المؤسسي بالذكاء الاصطناعي، تعمل لدى وزارة الاتصالات وتقنية المعلومات اليمنية.
    بناءً على البيانات التالية للموظف، قم بإجراء تحليل معمق:

    الموظف: ${employee.name}
    المنصب الحالي: ${employee.position}
    الإدارة: ${employee.department}
    تاريخ الانضمام: ${employee.joinDate}

    سجل التقييمات (مرتب من الأحدث):
    ${evaluations.map(e => `
    - تاريخ: ${e.date}
    - النتيجة: ${e.totalScore}%
    - دورة التقييم: ${e.period}
    - معايير الأداء المحققة: ${e.criteria.map(c => `${c.label}: ${c.score}/5`).join(', ')}
    - الحضور: ${e.attendance}
    - الانضباط: ${e.discipline}
    - ملاحظات المدير: ${e.notes}
    `).join('\n')}

    المطلوب تحليل احترافي يتضمن العناصر التالية (باستخدام markdown):

    1. **تحليل الاتجاه العام (Performance Trend)**: هل أداء الموظف في تطور، استقرار، أم تراجع؟ اذكر أرقاماً تدعم ذلك.
    2. **تحليل نقاط القوة (Strengths)**: استخرج نقاط التميز البارزة بناءً على أعلى المعايير تقييماً.
    3. **تحديد الفجوات الأدائية (Weaknesses/Gaps)**: اذكر المجالات التي وقعت تحت المتوسط أو تراجعت.
    4. **خطة التطوير الفردية المقترحة (Individual Development Plan)**:
       - دورات تدريبية محددة.
       - مهارات ناعمة أو تقنية يجب التركيز عليها.
       - نصائح للمدير المباشر حول كيفية استثمار قدرات هذا الموظف.
    5. **المؤشرات المستقبلية**: توقع أداء الموظف في الدورة القادمة.

    يرجى أن يكون الرد بلغة عربية رسمية، مشجعة، ودقيقة جداً.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return "نعتذر، فشل التحليل الذكي للبيانات حالياً بسبب خطأ في الاتصال. يرجى المحاولة لاحقاً.";
  }
}

export async function aggregateMinistryAnalysis(evaluations: Evaluation[]) {
    const avgScore = evaluations.reduce((acc, curr) => acc + curr.totalScore, 0) / (evaluations.length || 1);
    
    const prompt = `
    أنت المدير التنفيذي للذكاء الاصطناعي والمستشار الاستراتيجي لوزير الاتصالات وتقنية المعلومات.
    قم بتحليل كلي (Macro Analysis) لأداء المؤسسة بناءً على البيانات الإحصائية التالية:

    - إجمالي موظفي العينة: ${evaluations.length} تقييماً متاحاً.
    - متوسط الأداء العام للوزارة: %${avgScore.toFixed(1)}.

    المطلوب تقديم "تقرير رؤية استراتيجية" (Strategic Vision Report) يتضمن:

    1. **التشخيص العام للمؤسسة**: ما هو الانطباع العام عن كفاءة الكادر الوظيفي؟
    2. **تحليل الأقسام (Sectional Insight)**: تحديد القطاعات الأكثر تميزاً والقطاعات التي تحتاج لتدخل سريع.
    3. **تحديد احتياجات التدريب المؤسسية**: ما هي المهارة التي يفتقر إليها أغلب الموظفين؟
    4. **التوصيات الاستراتيجية للإدارة العليا**: اذكر 3 خطوات عملية لتحسين مؤشرات الأداء الكلية بنسبة 10% خلال العام القادم.
    5. **تحليل القوة البشرية**: هل هناك اتجاه هبوطي أو تصاعدي عام؟

    التنسيق: استخدم عناوين واضحة، نقاط (Bullet points)، ولغة قيادية استراتيجية.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Global AI Analysis failed:", error);
    return "نعتذر، فشل التحليل الاستراتيجي الشامل حالياً.";
  }
}
