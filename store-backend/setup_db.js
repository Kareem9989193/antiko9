require('dotenv').config();
const admin = require('firebase-admin');

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

async function setupDatabase() {
    console.log('🚀 Starting Database Setup...');

    try {
        // 1. Setup Products Collection
        console.log('📦 Setting up "products/item1"...');
        await db.collection('products').doc('item1').set({
            price: 1000,
            name: 'iPhone (Example)',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // 2. Setup Site Content Collection
        console.log('📝 Setting up Website Content...');

        // Main Page
        await db.collection('site_content').doc('main').set({
            logo_text: 'ANTIIKO',
            card1_title: 'Antiko Bot', card1_desc: 'أقوى بوت حماية وترفيه في الوطن العربي',
            card2_title: 'أعضاء الفريق', card2_desc: 'تعرف على نخبة مطوري ومؤسسي المنظومة',
            card3_title: 'تعريف الفريق', card3_desc: 'من نحن وما هي أهدافنا في عالم التطور',
            card4_title: 'Antiko Shop', card4_desc: 'متجرنا الخاص لبيع الحسابات والأدوات',
            footer: '© 2026 Antiko Team. All Rights Reserved.',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Bot Page
        await db.collection('site_content').doc('bot_page').set({
            title: 'ANTIIKO BOT',
            hero_text: 'أذكى وأقوى بوت واتساب لإدارة المجموعات والترفيه',
            feat1_title: 'ألعاب ترفيهية متكاملة', feat1_desc: 'يحتوي البوت على مجموعة واسعة من الألعاب مثل (فكك، خمن، سؤال انمي، XO) مع نظام نقاط وتنافس.',
            feat2_title: 'نظام حماية وإدارة', feat2_desc: 'إدارة المجموعات باحترافية، طرد المتطفلين، ترحيب تلقائي، وضبط القوانين بسهولة.',
            feat3_title: 'أدوات ذكية', feat3_desc: 'تحويل الصور لملصقات، تحويل الفيديو لصوت، البحث في يوتيوب، ومعلومات الطقس والعملات.',
            feat4_title: 'نظام البنك والترتيب', feat4_desc: 'اجمع النقاط، حوّل الأموال للاعبين الآخرين، ونافس لتكون الأول في قائمة الصدارة العالمية.',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Team Page
        await db.collection('site_content').doc('team_page').set({
            title: 'عن الفريق',
            hero_text: 'تعرف على رؤية وقصة Antiko Team',
            vision_h: 'رؤيتنا', vision_p: 'نطمح في فريق Antiko أن نكون الرواد في تقديم حلول برمجية مبتكرة تجمع بين الإبداع الفني والتقنية المتطورة.',
            mission_h: 'مهمتنا', mission_p: 'مهمتنا هي بناء مجتمع تقني متكامل، وتطوير منصات وأدوات تلبي احتياجات المستخدمين وتفوق توقعاتهم.',
            story_h: 'قصتنا', story_p: 'بدأ فريق Antiko كمجموعة صغيرة من المبرمجين الطموحين، وتحول اليوم إلى فريق متكامل يضم مواهب في مختلف المجالات.',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Members Page
        await db.collection('site_content').doc('members_page').set({
            title: 'أعضاء الفريق',
            hero_text: 'النخبة المبدعة وراء مشروع Antiko',
            m1_name: 'أحمد', m1_role: 'مؤسس ومطور رئيسي', m1_bio: 'متخصص في تطوير البوتات وأنظمة الذكاء الاصطناعي.',
            m2_name: 'محمد', m2_role: 'مصمم واجهات (UI/UX)', m2_bio: 'خبير في خلق تجارب بصرية فريدة ومميزة.',
            m3_name: 'سارة', m3_role: 'مهندسة خلفية (Backend)', m3_bio: 'تعمل على استقرار الخوادم وقواعد البيانات.',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Styles Page
        await db.collection('site_content').doc('styles').set({
            primary: '#ff0033',
            bg: '#050505',
            font_family: "'Tajawal', sans-serif",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log('✅ Database Setup Completed Successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during setup:', error);
        process.exit(1);
    }
}

setupDatabase();
