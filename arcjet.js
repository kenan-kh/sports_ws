import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/node";


const arcjetKey = process.env.ARCJET_KEY;

const arcjetMode = process.env.ARCJET_MODE === 'DRY_RUN' ? 'DRY_RUN' : 'LIVE';

// التحقق من وجود المفتاح السري لمنع تشغيل التطبيق بدون حماية
if (!arcjetKey) {
    throw new Error('ARCJET_KEY environment variable is missing.');
}

// بناء وتصدير كائن الحماية بالإعدادات المطلوبة
export const httpArcjet = arcjetKey ? arcjet({
    key: arcjetKey,
    rules: [
        // 1. الحماية من الاختراقات والثغرات الشائعة
        shield({ mode: arcjetMode }),
        
        // 2. إدارة البوتات (حظر البوتات الضارة والسماح بمحركات البحث ومعاينة الروابط)
        detectBot({ 
            mode: arcjetMode, 
            allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW'] 
        }),
        
        // 3. تحديد معدل الطلبات (الحد الأقصى 50 طلباً كل 10 ثوانٍ)
        slidingWindow({ 
            mode: arcjetMode, 
            interval: '15s', 
            max: 50 
        })
    ]
}) : null;

export const wsarcjet = arcjetKey ? arcjet({
    key: arcjetKey,
    rules: [
        // قواعد مماثلة لطلبات الويب العادية، مع التركيز على حماية WebSocket
        shield({ mode: arcjetMode }),
        // detectBot({ 
        //     mode: arcjetMode,allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW'] 
        // }),
        slidingWindow({mode: arcjetMode, interval: '2s', max: 5 })
    ]
}) : null;


export function securityMiddleware() {
    return async (req, res, next) => {
        // إذا لم تكن أداة Arcjet مفعّلة، يتم تمرير الطلب فوراً لتجنب تعطل الموقع
        if (!httpArcjet) return next();

        try {
            // فحص الطلب الحالي عبر Arcjet واتخاذ القرار
            const decision = await httpArcjet.protect(req);

            // إذا كان القرار هو الرفض والحظر
            if (decision.isDenied()) {
                
                // الحالة الأولى: إذا كان السبب هو تخطي حد الطلبات المسموح (Rate Limit)
                if (decision.reason.isRateLimit()) {
                    return res.status(429).json({ error: 'Too many requests.' });
                }
                
                // الحالة الثانية: أي سبب أمني آخر (مثل بوت ضار أو محاولة اختراق)
                return res.status(403).json({ error: 'Forbidden.' });
            }

            // إذا كان الطلب سليماً وليس محظوراً، يمر بسلام إلى الخطوة التالية
            return next();

        } catch (e) {
            // التعامل مع الأخطاء غير المتوقعة في السيرفر حفاظاً على استقراره
            console.error('Arcjet middleware error', e);
            return res.status(503).json({ error: 'Service Unavailable' });
        }
        next();
    };
}