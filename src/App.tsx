import React, { useState, useEffect, useRef } from 'react';

// ============================================================================
// TYPE DEFINITIONS (TYPESCRIPT ARAYÜZLERİ)
// ============================================================================

interface PlantProperty {
    name: string;
    curesSymptoms: string[];
}

interface Plant {
    id: string;
    name: string;
    rarity: string;
    cost: number;
    properties: string[];
    imageUrl: string;
}

interface Disease {
    id: string;
    name: string;
    symptoms: string[];
}

interface Ingredient {
    type: 'plant' | 'potion';
    id: string;
    count: number;
}

interface Potion {
    id: string;
    name: string;
    ingredients: Ingredient[];
    curesDiseaseIds: string[];
    sellPrice: number;
    imageUrl?: string;
}

interface Choice {
    text: string;
    nextNodeId: string | null;
    delayDays?: number;

    // Gereksinimler (Oyuncudan Alınacaklar)
    reqPotion?: string;
    reqPotionCount?: number;
    reqPlant?: string;
    reqPlantCount?: number;
    reqGold?: number;

    // Ödüller (Oyuncuya Verilecekler)
    rewardGold?: number;
    rewardPlantId?: string;
    rewardPlantCount?: number;
    rewardPotionId?: string;
    rewardPotionCount?: number;

    autoCreateNode?: boolean;
}

interface StoryNode {
    id: string;
    npcText: string;
    diseaseId?: string;
    dynamicSuccessNodeId?: string;
    dynamicFailNodeId?: string;
    choices: Choice[];
    day?: number; // Düğüm seviyesinde tetiklenme gün gereksinimi
}

interface Storyline {
    id: string;
    characterName: string;
    description?: string; // Karakterin arka plan hikayesi / açıklaması
    avatarUrl: string;
    nodes: StoryNode[];
}

interface MarketPlant {
    plantId: string;
    stock: number;
    maxStock: number;
    cost: number;
    availableDay?: number; // Gün bazlı market listelemesi için eklendi
}

interface MarketRecipe {
    potionId: string;
    cost: number;
    stock: number;
    maxStock: number;
    availableDay?: number; // Gün bazlı market listelemesi için eklendi
}

interface IntroPage {
    id: string;
    title: string;
    text: string;
    imageUrl?: string;
}

interface Soundtrack {
    id: string;
    title: string;
    path: string;
}

interface NewsItem {
    id: string;
    day: number;
    text: string;
}

type Translations = Record<string, Record<string, string>>;

interface GameData {
    plantProperties: PlantProperty[];
    diseaseSymptoms: string[];
    plants: Plant[];
    diseases: Disease[];
    potions: Potion[];
    storylines: Storyline[];
    marketPlants: MarketPlant[];
    marketRecipes: MarketRecipe[];
    translations: Translations;
    introPages: IntroPage[]; // JSON içinde hikaye giriş sayfaları verisi
    soundtracks: Soundtrack[]; // Dinamik müzik/soundtrack listesi
    news: NewsItem[]; // Günlük haberler
}

interface PlayerState {
    gold: number;
    rentDebt: number;
    inventory: {
        plants: Record<string, number>;
        potions: Record<string, number>;
    };
    knownPotions: string[];
}

interface CauldronItem {
    type: 'plant' | 'potion';
    id: string;
}

interface BrewState {
    status: 'idle' | 'brewing' | 'success' | 'fail';
    message: string;
}

interface TreatmentBenchItem {
    type: 'plant' | 'potion';
    id: string;
    name: string;
}

interface TreatmentStatus {
    type: 'success' | 'fail' | '';
    message: string;
}

interface StoryProgressItem {
    currentNodeId: string;
    availableDay: number;
}

interface GameState {
    day: number;
    currentCustomer: { storyId: string; nodeId: string } | null;
    rentPaidThisWeek: boolean;
    storyProgress: Record<string, StoryProgressItem>;
    logs: string[];
}

interface RentPopup {
    show: boolean;
    message: string;
}

interface GameHandlers {
    handleEndDay: () => void;
    handleCallCustomer: () => void;
    handleCustomerChoice: (choice: Choice, idx: number, activeNode: StoryNode, storyId: string) => void;
    handleAddToTreatmentBench: (type: 'plant' | 'potion', id: string, name: string) => void;
    handleRemoveFromTreatmentBench: (index: number) => void;
    handleApplyTreatment: (activeNode: StoryNode, activeStory: Storyline) => void;
    handleAddToCauldron: (type: 'plant' | 'potion', id: string) => void;
    handleRemoveFromCauldron: (idx: number, type: 'plant' | 'potion', id: string) => void;
    handleBrew: () => void;
    handleBuyPlant: (pId: string, cost: number, count: number) => void;
    handleBuyRecipe: (pId: string, cost: number) => void;
}

// ============================================================================
// BÖLÜM 1: STİLLER VE BAŞLANGIÇ VERİTABANI (MOCK DB)
// ============================================================================

const styleTag = document.createElement('style') as HTMLStyleElement;
styleTag.innerHTML = `
  @import url('https://fonts.googleapis.com/css2?family=Metamorphous&family=Kalam:wght@400;700&display=swap');
  
  .font-magic { font-family: 'Metamorphous', serif; }
  .font-parchment { font-family: 'Kalam', cursive; }
  
  @keyframes idleFloat {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-8px) rotate(1deg); }
  }
  .animate-idle-float { animation: idleFloat 3s ease-in-out infinite; }
`;
document.head.appendChild(styleTag);

const INITIAL_DATA: GameData = {
    plantProperties: [
        { name: 'Demir Özlü', curesSymptoms: ['Bataklık Çürümesi', 'Kanama'] },
        { name: 'Gümüşlü', curesSymptoms: ['Alkarısı Karabasanı', 'Zehirlenme'] },
        { name: 'Sihirli', curesSymptoms: ['Kirli Büyü Zehirlenmesi', 'Halsizlik'] },
        { name: 'Tuzlu', curesSymptoms: ['Işıldak Çırmığı', 'Ateş'] },
        { name: 'Sakinleştirici', curesSymptoms: ['Baş Dönmesi', 'Titreme'] }
    ],
    diseaseSymptoms: [
        'Alkarısı Karabasanı', 'Kirli Büyü Zehirlenmesi', 'Bataklık Çürümesi',
        'Işıldak Çırmığı', 'Ateş', 'Kanama', 'Halsizlik', 'Baş Dönmesi', 'Titreme', 'Zehirlenme'
    ],
    plants: [
        { id: 'p_demir_ardic', name: 'Demir-Ardıç Yaprağı', rarity: 'Yaygın', cost: 8, properties: ['Demir Özlü', 'Sakinleştirici'], imageUrl: '' },
        { id: 'p_gumus_kok', name: 'Gümüş Kök', rarity: 'Nadir', cost: 20, properties: ['Gümüşlü', 'Sakinleştirici'], imageUrl: '' },
        { id: 'p_isildak_otu', name: 'Işıldak Otu', rarity: 'Normal', cost: 12, properties: ['Sihirli', 'Tuzlu'], imageUrl: '' },
        { id: 'p_sihirli_bugday', name: 'Sihirli Buğday', rarity: 'Efsanevi', cost: 45, properties: ['Sihirli', 'Gümüşlü'], imageUrl: '' },
        { id: 'p_kara_kabuk', name: 'Kara-Kabuk Reçinesi', rarity: 'Yaygın', cost: 6, properties: ['Demir Özlü'], imageUrl: '' }
    ],
    diseases: [
        { id: 'd_alkarisi', name: 'Alkarısı Musallatı', symptoms: ['Alkarısı Karabasanı', 'Titreme', 'Baş Dönmesi'] },
        { id: 'd_kirli_buyu', name: 'Kirli Büyü Çürümesi', symptoms: ['Kirli Büyü Zehirlenmesi', 'Ateş', 'Halsizlik'] },
        { id: 'd_isildak_isirigi', name: 'Işıldak Tırmalaması', symptoms: ['Işıldak Çırmığı', 'Kanama'] },
        { id: 'd_bataklik_vebasi', name: 'Bataklık Çürümesi', symptoms: ['Bataklık Çürümesi', 'Zehirlenme'] }
    ],
    potions: [
        { id: 'pot_alkarisi_savar', name: 'Alkarısı Savar İksir', ingredients: [{ type: 'plant', id: 'p_gumus_kok', count: 2 }, { type: 'plant', id: 'p_demir_ardic', count: 1 }], curesDiseaseIds: ['d_alkarisi'], sellPrice: 65 },
        { id: 'pot_arindirici', name: 'Arındırıcı Eliksir', ingredients: [{ type: 'plant', id: 'p_sihirli_bugday', count: 1 }, { type: 'plant', id: 'p_demir_ardic', count: 2 }], curesDiseaseIds: ['d_kirli_buyu'], sellPrice: 90 },
        { id: 'pot_naiad_nefesi', name: 'Naiad Nefesi İksiri', ingredients: [{ type: 'plant', id: 'p_isildak_otu', count: 2 }, { type: 'plant', id: 'p_gumus_kok', count: 1 }], curesDiseaseIds: ['d_bataklik_vebasi'], sellPrice: 75 }
    ],
    storylines: [
        {
            id: 'story_baran', characterName: 'Genç Druid Baran', description: 'Zihnindeki acı verici fısıltılardan kurtulmak isteyen ve ormanda yolunu kaybetmiş acemi şifacı.', avatarUrl: '',
            nodes: [
                {
                    id: 'node_baran_1', npcText: 'Selam şifacı... Ben Baran. Yolculuk beni perişan etti. Rüyamda yaşlı, kırmızı gözlü korkunç bir kadının kahkahalarını duyuyorum. Ciğerlerim yanıyor. Bana şifa verebilir misin?', diseaseId: 'd_alkarisi', dynamicSuccessNodeId: 'node_baran_poyraz', dynamicFailNodeId: 'node_baran_dead', day: 1,
                    choices: [{ text: 'Sana göre bir ilacım yok Baran, üzgünüm.', nextNodeId: 'node_baran_dead', delayDays: 1 }]
                },
                {
                    id: 'node_baran_poyraz', npcText: 'Aklım yerine geldi, zihnimdeki o uğursuz çığlıklar kesildi! Atım Poyraz bile senin şifanı övdü... Şimdi İlayda ve Derya adındaki küs nehir ruhlarını barıştırma görevim var. Bana bir parça Naiad Nefesi verirsen minnettar olurum.', day: 1,
                    choices: [
                        { text: 'Naiad Nefesi İksirini Al (İksiri Ver)', nextNodeId: 'node_baran_reconciled', reqPotion: 'pot_naiad_nefesi', reqPotionCount: 1, delayDays: 5 },
                        { text: 'Uzak dur benden konuşan beygir ve deliler!', nextNodeId: 'node_baran_dead', delayDays: 1 }
                    ]
                },
                {
                    id: 'node_baran_reconciled', npcText: 'Şifacı! Senin iksirin sayesinde nehre girdim ve İlayda ile Derya yı barıştırdım. Sana teşekkür etmek için nehrin dibinden çıkardığım bu Sihirli Buğdayı hediye ediyoruz!', day: 6,
                    choices: [{ text: 'Kendine çok iyi bak Baran.', nextNodeId: null, rewardPlantId: 'p_sihirli_bugday', rewardPlantCount: 1, rewardGold: 50 }]
                },
                {
                    id: 'node_baran_dead', npcText: 'Baran karanlığa teslim oldu... Alkarısı zihnini tamamen ele geçirdi. Çığlıklar atarak vahşi ormana karışıp kayboldu.', day: 2,
                    choices: [{ text: 'Çok yazık oldu...', nextNodeId: null }]
                }
            ]
        },
        {
            id: 'story_landlord', characterName: 'Tahsildar Kazım', description: 'Köyün beyine çalışan, palankadaki kiraları toplayan ve borç affetmeyen kurallara bağlı devlet görevlisi.', avatarUrl: '',
            nodes: [
                {
                    id: 'node_landlord_demand', npcText: 'Selam şifacı! Köyün beyinin tahsildarıyım ben. Palankanın içindeki dükkan kirasını (100 Altın) tahsil etmeye geldim.', day: 7,
                    choices: [
                        { text: 'Kiramı Öde (100 Altın Öde)', nextNodeId: 'node_landlord_thanks', reqGold: 100 },
                        { text: 'Şu an ödeyemiyorum, borç yaz beyimize.', nextNodeId: 'node_landlord_angry' }
                    ]
                },
                {
                    id: 'node_landlord_thanks', npcText: 'Güzel, akıllı bir şifacı. Palankamızın kapısı sana her zaman açık kalacaktır. İyi çalışmalar.', day: 7,
                    choices: [{ text: 'Teşekkürler, iyi günler Kazım Bey.', nextNodeId: null }]
                },
                {
                    id: 'node_landlord_angry', npcText: 'Yine mi borç?! Bak burası devlet kapısı. Kazandığın her altın doğrudan benim borç defterime kesilecek, palanka kanunudur bu!', day: 7,
                    choices: [{ text: 'Anlıyorum, yapacak bir şey yok...', nextNodeId: null }]
                }
            ]
        }
    ],
    marketPlants: [
        { plantId: 'p_demir_ardic', stock: 10, maxStock: 10, cost: 6, availableDay: 1 },
        { plantId: 'p_gumus_kok', stock: 3, maxStock: 3, cost: 18, availableDay: 1 },
        { plantId: 'p_isildak_otu', stock: 5, maxStock: 5, cost: 10, availableDay: 1 },
        { plantId: 'p_kara_kabuk', stock: 8, maxStock: 8, cost: 5, availableDay: 1 }
    ],
    marketRecipes: [
        { potionId: 'pot_alkarisi_savar', cost: 100, stock: 1, maxStock: 1, availableDay: 1 }
    ],
    introPages: [
        {
            id: "intro_1",
            title: "Mirasın Başlangıcı",
            text: "Dedenden kalan eski, tozlu kulübenin kapısını aralıyorsun. Havada asılı duran kurutulmuş bitki kokuları ve simya kazanından yükselen hafif dumanlar seni çocukluğuna götürüyor. Artık bu vadideki tek umut sensin.",
            imageUrl: "assets/cabin_intro.png"
        },
        {
            id: "intro_2",
            title: "Vahşi Ormanın Fısıltıları",
            text: "Ancak vadi artık eskisi gibi huzurlu değil. Ormandan yükselen kirli büyüler nehir ruhlarını delirtiyor, Alkarıları masum köylülerin rüyalarına musallat oluyor. Şifalı ellerinle doğru bitkileri bir araya getirmeli, her derde deva iksirler kaynatmalısın.",
            imageUrl: "assets/forest_intro.png"
        },
        {
            id: "intro_3",
            title: "Tahsildarın Gölgesi",
            text: "Unutma, bu dünyada hayatta kalmak sadece şifa dağıtmaktan ibaret değil. Her 7 günde bir Tahsildar Kazım kapını çalarak dükkan kirasını (100 Altın) isteyecek. Kasandaki altınları iyi yönet, aksi takdirde dükkanın mühürlenebilir!",
            imageUrl: "assets/kazim_intro.png"
        }
    ],
    soundtracks: [
        { id: 'track_1', title: 'Kadim Kulübe Melodisi', path: 'Assets/tavernTrack.mp3' },
        { id: 'track_2', title: 'Fısıldayan Gölgeler', path: 'Assets/forestTrack.mp3' },
        { id: 'track_3', title: 'Simya Ateşi Sesi', path: 'Assets/alchemyTrack.mp3' }
    ],
    news: [
        { id: 'news_1', day: 1, text: 'Vadide yeni bir şifacı kulübesi açıldı! Köylüler umutla dedenden kalan bu mirasın canlanmasını bekliyor.' },
        { id: 'news_2', day: 2, text: 'Orman sınırında garip sesler duyulduğu söyleniyor. Druidlerin endişeli bakışları sıklaştı.' }
    ],
    translations: {
        tr: {
            "ui.gold": "Altın", "ui.day": "Gün", "ui.rent_debt": "Kira Borcu", "ui.end_day": "Günü Bitir", "ui.call_customer": "Kapıya Bak!",
            "ui.advisor": "AKIL HOCASI", "ui.chest": "Şifacı Sandığı", "ui.plants_title": "Bitkilerin:", "ui.potions_title": "İksirlerin:",
            "ui.journal": "Günlük Parşömen", "ui.cauldron": "Büyük Kazan", "ui.brew": "Kazanı Karıştır", "ui.recipe_book": "Tarif Kitabı",
            "ui.pantry": "Kiler Çantası", "ui.treatment_bench": "Teşhis & Tedavi Masası", "ui.apply_treatment": "Tedaviyi Uygula",
            "ui.buy": "Satın Al", "ui.stock": "Stok", "ui.rent_popup_title": "Haciz & Borç Mektubu", "ui.sign_letter": "Mektubu İmzala (Altınlar Kesilsin)",
            "ui.empty_bench": "Şifa masası boş. Aşağıdan bitki veya iksir diz!", "ui.fill_bench": "Tezgahı Doldur (Envanterinden Seç):",
            "ui.diagnosis": "Teşhis", "ui.market_title": "Şehir Pazarı (Tahsildar Kazım)",
            "char.story_baran": "Genç Druid Baran", "char.story_baran.desc": "Zihnindeki acı verici fısıltılardan kurtulmak isteyen ve ormanda yolunu kaybetmiş acemi şifacı.",
            "char.story_landlord": "Tahsildar Kazım", "char.story_landlord.desc": "Köyün beyine çalışan, palankadaki kiraları toplayan ve borç affetmeyen kurallara bağlı devlet görevlisi.",
            "plant.p_demir_ardic.name": "Demir-Ardıç Yaprağı", "plant.p_gumus_kok.name": "Gümüş Kök",
            "plant.p_isildak_otu.name": "Işıldak Otu", "plant.p_sihirli_bugday.name": "Sihirli Buğday",
            "potion.pot_alkarisi_savar.name": "Alkarısı Savar İksir", "potion.pot_arindirici.name": "Arındırıcı Eliksir",
            "potion.pot_naiad_nefesi.name": "Naiad Nefesi İksiri",
            "symptom.Alkarısı Karabasanı": "Alkarısı Karabasanı", "symptom.Kirli Büyü Zehirlenmesi": "Kirli Büyü Zehirlenmesi",
            "symptom.Bataklık Çürümesi": "Bataklık Çürümesi", "symptom.Işıldak Çırmığı": "Işıldak Çırmığı",
            "symptom.Ateş": "Ateş", "symptom.Kanama": "Kanama", "symptom.Halsizlik": "Halsizlik",
            "symptom.Baş Dönmesi": "Baş Dönmesi", "symptom.Titreme": "Titreme", "symptom.Zehirlenme": "Zehirlenme",
            "disease.d_alkarisi.name": "Alkarısı Musallatı", "disease.d_kirli_buyu.name": "Kirli Büyü Çürümesi",
            "disease.d_isildak_isirigi.name": "Işıldak Tırmalaması", "disease.d_bataklik_vebasi.name": "Bataklık Çürümesi",
            "prop.Demir Özlü": "Demir Özlü", "prop.Gümüşlü": "Gümüşlü", "prop.Sihirli": "Sihirli",
            "prop.Tuzlu": "Tuzlu", "prop.Sakinleştirici": "Sakinleştirici",
            "intro.title.intro_1": "Mirasın Başlangıcı",
            "intro.text.intro_1": "Dedenden kalan eski, tozlu kulübenin kapısını aralıyorsun. Havada asılı duran kurutulmuş bitki kokuları ve simya kazanından yükselen hafif dumanlar seni çocukluğuna götürüyor. Artık bu vadideki tek umut sensin.",
            "intro.title.intro_2": "Vahşi Ormanın Fısıltıları",
            "intro.text.intro_2": "Ancak vadi artık eskisi gibi huzurlu değil. Ormandan yükselen kirli büyüler nehir ruhlarını delirtiyor, Alkarıları masum köylülerin rüyalarına musallat oluyor. Şifalı ellerinle doğru bitkileri bir araya getirmeli, her derde deva iksirler kaynatmalısın.",
            "intro.title.intro_3": "Tahsildarın Gölgesi",
            "intro.text.intro_3": "Unutma, bu dünyada hayatta kalmak sadece şifa dağıtmaktan ibaret değil. Her 7 günde bir Tahsildar Kazım kapını çalarak dükkan kirasını (100 Altın) isteyecek. Kasandaki altınları iyi yönet, aksi takdirde dükkanın mühürlenebilir!",
            "soundtrack.track_1.title": "Kadim Kulübe Melodisi",
            "soundtrack.track_2.title": "Fısıldayan Gölgeler",
            "soundtrack.track_3.title": "Simya Ateşi Sesi",
            "ui.news_title": "Köy Haberleri",
            "ui.news_popup_title": "📜 Günlük Havadisler",
            "ui.news_close": "Haberi Oku ve Kapat",
            "ui.news_empty": "Henüz bir haber yok.",
            "ui.news_tab": "📰 Haber Düzenleyici",
            "ui.news_add": "Haber Ekle",
            "ui.news_id": "Haber ID",
            "ui.news_text": "Haber Metni",
            "ui.news_day": "Gösterilecek Gün"
        },
        en: {
            "ui.gold": "Gold", "ui.day": "Day", "ui.rent_debt": "Rent Debt", "ui.end_day": "End Day", "ui.call_customer": "Check Door!",
            "ui.advisor": "WIZARD ADVISOR", "ui.chest": "Healer Chest", "ui.plants_title": "Your Plants:", "ui.potions_title": "Your Potions:",
            "ui.journal": "Daily Scroll", "ui.cauldron": "Great Cauldron", "ui.brew": "Stir Cauldron", "ui.recipe_book": "Recipe Book",
            "ui.pantry": "Pantry Bag", "ui.treatment_bench": "Diagnosis & Treatment Table", "ui.apply_treatment": "Apply Treatment",
            "ui.buy": "Buy", "ui.stock": "Stock", "ui.rent_popup_title": "Bailiff's Debt Letter", "ui.sign_letter": "Sign the Letter",
            "ui.empty_bench": "The healing table is empty.", "ui.fill_bench": "Fill Desk (Select from Inventory):",
            "ui.diagnosis": "Diagnosis", "ui.market_title": "City Market",
            "char.story_baran": "Young Druid Baran", "char.story_baran.desc": "An apprentice druid trying to escape auditory whispers, lost in the wildwoods.",
            "char.story_landlord": "Tax Collector Kazim", "char.story_landlord.desc": "The local lord's strict bailiff who extracts rent weekly without mercy.",
            "plant.p_demir_ardic.name": "Iron-Juniper Leaf", "plant.p_gumus_kok.name": "Silver Root",
            "potion.pot_alkarisi_savar.name": "Alkarisi Ward Potion",
            "intro.title.intro_1": "Beginning of the Legacy",
            "intro.text.intro_1": "You open the door of the old, dusty cabin left by your grandfather. The scent of dried herbs and the faint steam rising from the cauldron take you back to your childhood. You are the last hope in this valley now.",
            "intro.title.intro_2": "Whispers of the Wildwood",
            "intro.text.intro_2": "But the valley is no longer peaceful. Vile spells rising from the forest drive river spirits mad, and Alkarisi haunt the dreams of innocent villagers. You must combine the right herbs with healing hands and brew potions to cure all ailments.",
            "intro.title.intro_3": "The Shadow of the Tax Collector",
            "intro.text.intro_3": "Remember, surviving in this world is not just about healing. Every 7 days, Kazim the Tax Collector will knock on your door to collect rent (100 Gold). Manage your gold wisely, or your shop might be sealed!",
            "soundtrack.track_1.title": "Ancient Cabin Melody",
            "soundtrack.track_2.title": "Whispering Shadows",
            "soundtrack.track_3.title": "Alchemy Fire Soundtrack",
            "ui.news_title": "Village News",
            "ui.news_popup_title": "📜 Daily News",
            "ui.news_close": "Read and Close",
            "ui.news_empty": "No news yet.",
            "ui.news_tab": "📰 News Editor",
            "ui.news_add": "Add News",
            "ui.news_id": "News ID",
            "ui.news_text": "News Text",
            "ui.news_day": "Display Day"
        }
    }
};

// ============================================================================
// YARDIMCI FONKSİYONLAR (MODÜLLER ARASI)
// ============================================================================

const getHerbCuredSymptoms = (plantId: string, gameData: GameData): string[] => {
    const plant = gameData.plants.find(p => p.id === plantId);
    if (!plant) return [];
    const symptoms: string[] = [];
    plant.properties.forEach(propName => {
        const propDef = gameData.plantProperties.find(p => p.name === propName);
        if (propDef && propDef.curesSymptoms) {
            propDef.curesSymptoms.forEach(symp => {
                if (!symptoms.includes(symp)) symptoms.push(symp);
            });
        }
    });
    return symptoms;
};

const getPotionCuresDetails = (potionId: string, gameData: GameData, t: (key: string, fallback?: string) => string): string[] => {
    const potion = gameData.potions.find(p => p.id === potionId);
    if (!potion) return [];
    return potion.curesDiseaseIds.map(dId => {
        const d = gameData.diseases.find(dis => dis.id === dId);
        return d ? `${t(`disease.${d.id}.name`, d.name)} (${d.symptoms.map(s => t(`symptom.${s}`, s)).join(', ')})` : '';
    }).filter(Boolean);
};

// ============================================================================
// BÖLÜM 2: UI BİLEŞENLERİ (COMPONENTS)
// ============================================================================

interface TooltipPlantProps {
    plantId: string;
    gameData: GameData;
    t: (key: string, fallback?: string) => string;
}

function TooltipPlant({ plantId, gameData, t }: TooltipPlantProps): React.JSX.Element | null {
    const plant = gameData.plants.find(p => p.id === plantId);
    if (!plant) return null;
    const symptoms = getHerbCuredSymptoms(plantId, gameData);
    return (
        <div className="absolute hidden group-hover:block z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-900 border-4 border-slate-955 p-3 rounded-xl text-xs text-amber-100 font-sans shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-left pointer-events-none">
            <p className="font-magic text-sm text-amber-400 font-bold border-b border-amber-500/20 pb-1 mb-1">{t(`plant.${plantId}.name`, plant.name)}</p>
            <p className="text-slate-400 mb-1">🌿 Nitelikler: {plant.properties.map(p => t(`prop.${p}`, p)).join(', ')}</p>
            <p className="font-bold text-emerald-400">⚡ Giderdiği Semptomlar:</p>
            <div className="flex flex-wrap gap-1 mt-1">
                {symptoms.length > 0 ? symptoms.map(s => <span key={s} className="bg-emerald-955/80 border border-emerald-500 text-emerald-300 px-1.5 py-0.5 rounded text-[10px]">{t(`symptom.${s}`, s)}</span>)
                    : <span className="text-slate-500 italic text-[10px]">Herhangi bir semptomu gidermez.</span>}
            </div>
        </div>
    );
}

interface TooltipPotionProps {
    potionId: string;
    gameData: GameData;
    t: (key: string, fallback?: string) => string;
}

function TooltipPotion({ potionId, gameData, t }: TooltipPotionProps): React.JSX.Element | null {
    const potion = gameData.potions.find(p => p.id === potionId);
    if (!potion) return null;
    return (
        <div className="absolute hidden group-hover:block z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-900 border-4 border-slate-955 p-3 rounded-xl text-xs text-amber-100 font-sans shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-left pointer-events-none">
            <p className="font-magic text-sm text-purple-400 font-bold border-b border-purple-500/20 pb-1 mb-1">{t(`potion.${potionId}.name`, potion.name)}</p>
            <p className="text-slate-400 mb-1">💰 Satış Değeri: {potion.sellPrice} Altın</p>
            <p className="font-bold text-emerald-400 mb-1">⚡ Tedavi Ettiği Hastalıklar:</p>
            <div className="space-y-1">
                {getPotionCuresDetails(potionId, gameData, t).map((detail, idx) => <div key={idx} className="bg-purple-955/80 border border-purple-500 text-purple-300 p-1 rounded text-[10px] leading-tight">{detail}</div>)}
            </div>
        </div>
    );
}

function renderPlants(t: (key: string, fallback?: string) => string, plantsAlreadyHave: Record<string, number>, gameData: GameData): React.JSX.Element {
    return (
        <div>
            <span className="text-sm font-bold text-slate-700">{t('ui.plants_title')}</span>
            <div className="grid grid-cols-2 gap-2 mt-2">
                {Object.entries(plantsAlreadyHave).map(([id, count]) => {
                    const plant = gameData.plants.find(p => p.id === id);
                    if (!plant || count <= 0) return null;
                    return (
                        <div key={id} className="relative group">
                            <div
                                className="bg-[#e9dbbe] p-2 rounded-lg border-2 border-slate-900 text-sm flex justify-between items-center cursor-help">
                  <span className="flex items-center gap-1">{plant.imageUrl ? <img src={plant.imageUrl} alt={plant.name}
                                                                                   className="w-5 h-5 object-contain"/> : '🌿'} {t(`plant.${id}.name`, plant.name)}</span>
                                <span className="font-bold">x{count}</span>
                            </div>
                            <TooltipPlant plantId={id} gameData={gameData} t={t}/>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function renderPotions(t: (key: string, fallback?: string) => string, playerState: PlayerState, gameData: GameData): React.JSX.Element {
    return (
        <div>
            <span className="text-sm font-bold text-slate-700">{t('ui.potions_title')}</span>
            <div className="space-y-1.5 mt-2">
                {Object.entries(playerState.inventory.potions).map(([id, count]) => {
                    const pot = gameData.potions.find(p => p.id === id);
                    if (!pot || count <= 0) return null;
                    return (
                        <div key={id} className="relative group">
                            <div
                                className="bg-[#e9dbbe] p-2 rounded-lg border-2 border-slate-900 text-sm flex justify-between items-center cursor-help">
                                <span>🧪 {t(`potion.${id}.name`, pot.name)}</span><span className="font-bold">x{count}</span>
                            </div>
                            <TooltipPotion potionId={id} gameData={gameData} t={t}/>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

interface SidePanelProps {
    playerState: PlayerState;
    gameState: GameState;
    gameData: GameData;
    t: (key: string, fallback?: string) => string;
    language: string;
}

function SidePanel({ playerState, gameState, gameData, t, language }: SidePanelProps): React.JSX.Element {
    const getWizardAdvice = (): string => {
        if (language === 'en') {
            if (playerState.rentDebt > 0) return "Palanka guards are demanding the Bey's protection fee. Watch out!";
            if (gameState.day % 7 === 6) return "Tomorrow Tahsildar Kazim will come knocking for taxes.";
            return "Ensure your ingredients are iron-warded to isolate magic rot!";
        } else {
            if (playerState.rentDebt > 0) return "Tahsildar Kazım dükkanı mühürlemekle tehdit ediyor, borcu kapatmalıyız!";
            if (gameState.day % 7 === 6) return "Kokular burnuma geliyor... Yarın Kazım dükkan kirasını toplamaya damlar.";
            return "Demir-Ardıç yapraklarını mühürler için sakla çırak, kirli büyü her yana sızabilir!";
        }
    };

    return (
        <div className="space-y-6">
            <div
                className="bg-[#2a131b] border-4 border-slate-900 p-5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex gap-4 items-center text-[#f3e8d2]">
                <span className="text-4xl animate-pulse">🧙‍♂️</span>
                <div>
                    <span className="text-xs font-magic text-amber-500 font-bold block">🧙‍♂️ {t('ui.advisor')}</span>
                    <div
                        className="bg-amber-100 text-slate-900 p-2 rounded-xl text-sm relative mt-1 font-semibold leading-tight shadow-md">"{getWizardAdvice()}"
                    </div>
                </div>
            </div>

            <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <h2 className="text-2xl font-magic text-slate-900 mb-4 pb-2 border-b-2 border-slate-900/20">🎒 {t('ui.chest')}</h2>
                <div className="space-y-3">
                    {renderPlants(t, playerState.inventory.plants, gameData)}
                    {renderPotions(t, playerState, gameData)}
                </div>
            </div>

            <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <h2 className="text-2xl font-magic text-slate-900 mb-3">📜 {t('ui.journal')}</h2>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                    {gameState.logs.map((log, index) => <div key={index}
                                                             className="text-sm bg-amber-50/50 p-2 rounded border border-slate-400 text-slate-955 font-semibold">{log}</div>)}
                </div>
            </div>

            <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <h2 className="text-2xl font-magic text-slate-900 mb-3">📰 {t('ui.news_title')}</h2>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                    {(gameData.news || []).filter(n => n.day <= gameState.day).sort((a, b) => b.day - a.day).map((news) => (
                        <div key={news.id} className="text-sm bg-indigo-50/50 p-2 rounded border border-indigo-400 text-slate-955 font-semibold">
                            <span className="text-[10px] text-indigo-800 block mb-1">📅 {t('ui.day')} {news.day}</span>
                            {news.text}
                        </div>
                    ))}
                    {(gameData.news || []).filter(n => n.day <= gameState.day).length === 0 && (
                        <div className="text-sm italic text-slate-500">{t('ui.news_empty')}</div>
                    )}
                </div>
            </div>
        </div>
    );
}

// -- SEKMELER (VIEWS) --

interface ShopAreaProps {
    gameState: GameState;
    playerState: PlayerState;
    gameData: GameData;
    language: string;
    t: (key: string, fallback?: string) => string;
    handlers: GameHandlers;
    treatmentBench: TreatmentBenchItem[];
    treatmentStatus: TreatmentStatus;
}

function ShopArea({ gameState, playerState, gameData, language, t, handlers, treatmentBench, treatmentStatus }: ShopAreaProps): React.JSX.Element {
    let activeNode: StoryNode | null = null;
    let activeStory: Storyline | null = null;
    if (gameState.currentCustomer) {
        activeStory = gameData.storylines.find(s => s.id === gameState.currentCustomer!.storyId) || null;
        if (activeStory) activeNode = activeStory.nodes.find(n => n.id === gameState.currentCustomer!.nodeId) || null;
    }
    const customerDisease = activeNode && activeNode.diseaseId ? gameData.diseases.find(d => d.id === activeNode!.diseaseId) : null;
    const charNameTranslated = activeStory ? t(`char.${activeStory.id}`, activeStory.characterName) : '';

    const isImageUrl = (url: string): boolean => {
        if (!url) return false;
        const normalized = url.toLowerCase().trim();
        return normalized.startsWith('http') ||
            normalized.startsWith('/') ||
            normalized.startsWith('assets/') ||
            normalized.startsWith('./assets') ||
            /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(normalized);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-[#f3e8d2] p-8 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-red-800 to-amber-700 border-b-2 border-black"></div>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-bold font-magic text-slate-900 flex items-center gap-2">🚪 Tezgah</h2>
                        {!activeNode && <button onClick={handlers.handleEndDay} className="bg-red-800 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg border-2 border-black font-magic text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">🌙 {t('ui.end_day')}</button>}
                    </div>

                    {!activeNode ? (
                        <div className="text-center py-12 bg-amber-100/50 rounded-xl border-2 border-dashed border-slate-800">
                            <p className="text-slate-700 text-xl mb-6">{language === 'en' ? 'The shop is quiet...' : 'Şu an dükkan sessiz çırak.'}</p>
                            <button onClick={handlers.handleCallCustomer} className="bg-amber-500 hover:bg-amber-400 text-slate-955 font-magic font-bold py-4 px-10 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-xl">🚪 {t('ui.call_customer')}</button>
                        </div>
                    ) : (
                        <div>
                            <div className="mb-2 text-sm font-bold font-magic text-red-800 uppercase tracking-widest">{charNameTranslated}</div>
                            <div className="flex justify-center mb-6">
                                {activeStory?.avatarUrl && isImageUrl(activeStory.avatarUrl) ? (
                                    <div className="w-40 h-40 bg-amber-50 rounded-2xl border-4 border-slate-900 overflow-hidden flex items-center justify-center p-2 shadow-lg animate-idle-float">
                                        <img src={activeStory.avatarUrl} alt={charNameTranslated} className="max-w-full max-h-full object-contain" />
                                    </div>
                                ) : (
                                    <div className="w-40 h-40 bg-[#dfd1b3] border-4 border-slate-900 rounded-2xl flex flex-col justify-center items-center text-slate-800 animate-idle-float shadow-md">
                                        <span className="text-6xl">{activeStory?.avatarUrl || '👤'}</span>
                                        {activeStory?.description && (
                                            <span className="text-[10px] font-sans px-2 text-center mt-2 italic text-slate-600 line-clamp-2 leading-tight">
                                                {t(`char.${activeStory.id}.desc`, activeStory.description)}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="bg-amber-50/70 p-6 rounded-2xl rounded-tl-none border-2 border-slate-900 shadow-inner mb-6">
                                <p className="text-2xl text-slate-900 italic font-semibold">"{t(`node.${activeNode.id}.npcText`, activeNode.npcText)}"</p>
                            </div>

                            {customerDisease && (
                                <div className="bg-[#e9dbbe] border-2 border-slate-900 p-6 rounded-2xl mb-6 space-y-4">
                                    <span className="text-sm bg-red-900 text-amber-100 px-3 py-1 rounded-full font-bold font-magic">{t('ui.diagnosis')}: {t(`disease.${customerDisease.id}.name`, customerDisease.name)}</span>
                                    <div className="flex flex-wrap gap-2">
                                        {customerDisease.symptoms.map(s => <span key={s} className="bg-red-200 border-2 border-red-900 text-red-900 text-sm px-3 py-1 rounded-md font-bold">⚠️ {t(`symptom.${s}`, s)}</span>)}
                                    </div>
                                    <div className="bg-[#dfd1b3] p-4 rounded-xl border-2 border-slate-900 min-h-[65px] flex flex-wrap gap-2 items-center">
                                        {treatmentBench.length === 0 && <span className="text-sm text-slate-600 italic">{t('ui.empty_bench')}</span>}
                                        {treatmentBench.map((item, index) => (
                                            <button key={index} onClick={() => handlers.handleRemoveFromTreatmentBench(index)} className="bg-[#f3e8d2] border-2 border-slate-900 text-slate-955 hover:bg-red-800 hover:text-white px-3 py-1 rounded-lg font-bold">
                                                {item.type === 'plant' ? '🌿' : '🧪'} {item.type === 'plant' ? t(`plant.${item.id}.name`, item.name) : t(`potion.${item.id}.name`, item.name)} ✕
                                            </button>
                                        ))}
                                    </div>
                                    {treatmentStatus.message && <div className="p-3 rounded-lg text-sm text-center font-bold border-2 bg-red-100 border-red-900 text-red-900">{treatmentStatus.message}</div>}
                                    <button onClick={() => handlers.handleApplyTreatment(activeNode!, activeStory!)} disabled={treatmentBench.length === 0} className="w-full py-3 rounded-xl font-magic font-bold text-lg border-4 border-black bg-emerald-500 hover:bg-emerald-400 text-slate-955 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">{t('ui.apply_treatment')}</button>
                                    <div className="pt-4 border-t-2 border-slate-900/10">
                                        <span className="text-sm font-bold font-magic text-slate-700 block mb-2">{t('ui.fill_bench')}</span>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(playerState.inventory.plants).map(([id, count]) => {
                                                const plantDef = gameData.plants.find(p => p.id === id);
                                                if (!plantDef || count <= 0) return null;
                                                return (
                                                    <div key={id} className="relative group">
                                                        <button onClick={() => handlers.handleAddToTreatmentBench('plant', id, plantDef.name)} className="bg-amber-100 hover:bg-amber-200 border-2 border-slate-900 text-sm px-3 py-1.5 rounded-lg text-slate-800 font-semibold flex items-center gap-1.5">
                                                            {plantDef.imageUrl ? <img src={plantDef.imageUrl} alt={plantDef.name} className="w-5 h-5 object-contain" /> : '🌿'} {t(`plant.${id}.name`, plantDef.name)} ({count})
                                                        </button>
                                                        <TooltipPlant plantId={id} gameData={gameData} t={t} />
                                                    </div>
                                                );
                                            })}
                                            {Object.entries(playerState.inventory.potions).map(([id, count]) => {
                                                const potionDef = gameData.potions.find(p => p.id === id);
                                                if (!potionDef || count <= 0) return null;
                                                return (
                                                    <div key={id} className="relative group">
                                                        <button onClick={() => handlers.handleAddToTreatmentBench('potion', id, potionDef.name)} className="bg-amber-100 hover:bg-amber-200 border-2 border-slate-900 text-sm px-3 py-1.5 rounded-lg text-slate-800 font-semibold flex items-center gap-1.5">
                                                            {potionDef.imageUrl ? <img src={potionDef.imageUrl} alt={potionDef.name} className="w-5 h-5 object-contain" /> : '🧪'} {t(`potion.${id}.name`, potionDef.name)} ({count})
                                                        </button>
                                                        <TooltipPotion potionId={id} gameData={gameData} t={t} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                {activeNode.choices.map((choice, idx) => {
                                    const reqGoldCount = choice.reqGold || 0;
                                    const hasGold = playerState.gold >= reqGoldCount;

                                    const reqPotionCount = choice.reqPotionCount || 1;
                                    const hasPotion = choice.reqPotion
                                        ? (playerState.inventory.potions[choice.reqPotion] || 0) >= reqPotionCount
                                        : true;

                                    const reqPlantCount = choice.reqPlantCount || 1;
                                    const hasPlant = choice.reqPlant
                                        ? (playerState.inventory.plants[choice.reqPlant] || 0) >= reqPlantCount
                                        : true;

                                    const canChoose = hasGold && hasPotion && hasPlant;

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handlers.handleCustomerChoice(choice, idx, activeNode!, activeStory!.id)}
                                            disabled={!canChoose}
                                            className="w-full text-left p-4 rounded-xl border-2 bg-amber-100 border-slate-900 hover:bg-amber-55 flex flex-col justify-between items-start disabled:opacity-50 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                        >
                                            <span className="text-slate-900 font-bold">&gt; {t(`choice.${activeNode!.id}.${idx}`, choice.text)}</span>

                                            {/* Alınacaklar ve Verilecekler Gösterimi */}
                                            <div className="flex gap-2 text-[11px] mt-2 flex-wrap">
                                                {choice.reqGold ? (
                                                    <span className="text-red-900 bg-red-100 border border-red-300 px-1.5 py-0.5 rounded font-bold font-sans">
                                  Gereken: 💰 {choice.reqGold} Altın
                                </span>
                                                ) : null}
                                                {choice.reqPlant ? (
                                                    <span className="text-red-900 bg-red-100 border border-red-300 px-1.5 py-0.5 rounded font-bold font-sans">
                                  Gereken: 🌿 {t(`plant.${choice.reqPlant}.name`, choice.reqPlant)} (x{choice.reqPlantCount || 1})
                                </span>
                                                ) : null}
                                                {choice.reqPotion ? (
                                                    <span className="text-red-900 bg-red-100 border border-red-300 px-1.5 py-0.5 rounded font-bold font-sans">
                                  Gereken: 🧪 {t(`potion.${choice.reqPotion}.name`, choice.reqPotion)} (x{choice.reqPotionCount || 1})
                                </span>
                                                ) : null}

                                                {choice.rewardGold ? (
                                                    <span className="text-emerald-900 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded font-bold font-sans">
                                  Ödül: 💰 {choice.rewardGold} Altın
                                </span>
                                                ) : null}
                                                {choice.rewardPlantId ? (
                                                    <span className="text-emerald-900 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded font-bold font-sans">
                                  Ödül: 🌿 {t(`plant.${choice.rewardPlantId}.name`, choice.rewardPlantId)} (x{choice.rewardPlantCount || 1})
                                </span>
                                                ) : null}
                                                {choice.rewardPotionId ? (
                                                    <span className="text-emerald-900 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded font-bold font-sans">
                                  Ödül: 🧪 {t(`potion.${choice.rewardPotionId}.name`, choice.rewardPotionId)} (x{choice.rewardPotionCount || 1})
                                </span>
                                                ) : null}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <SidePanel playerState={playerState} gameState={gameState} gameData={gameData} t={t} language={language} />
        </div>
    );
}

interface AlchemyAreaProps {
    playerState: PlayerState;
    gameData: GameData;
    cauldron: CauldronItem[];
    brewState: BrewState;
    t: (key: string, fallback?: string) => string;
    handlers: GameHandlers;
    language: string;
}

function AlchemyArea({ playerState, gameData, cauldron, brewState, t, handlers, language }: AlchemyAreaProps): React.JSX.Element {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col h-[530px]">
                <h2 className="text-2xl font-magic text-slate-900 mb-4 flex items-center gap-2 border-b-2 border-slate-900/20 pb-2">📖 {t('ui.recipe_book')}</h2>
                <div className="overflow-y-auto space-y-3 flex-1">
                    {gameData.potions.filter(p => playerState.knownPotions.includes(p.id)).map(potion => (
                        <div key={potion.id} className="relative group bg-amber-100/50 p-4 rounded-xl border-2 border-slate-900 cursor-help">
                            <span className="font-bold text-purple-955 text-xl block mb-2">{t(`potion.${potion.id}.name`, potion.name)}</span>
                            <div className="text-sm space-y-1">
                                {potion.ingredients.map((ing, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-amber-50 p-1.5 rounded-lg border border-slate-300">
                                        <span className="font-semibold">{ing.type === 'plant' ? '🌿' : '🧪'} {ing.type === 'plant' ? t(`plant.${ing.id}.name`, ing.id) : t(`potion.${ing.id}.name`, ing.id)}</span>
                                        <span className="font-bold text-red-900">x{ing.count}</span>
                                    </div>
                                ))}
                            </div>
                            <TooltipPotion potionId={potion.id} gameData={gameData} t={t} />
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col h-[530px]">
                <h2 className="text-2xl font-magic text-slate-900 mb-2 flex items-center gap-2 border-b-2 border-slate-900/20 pb-2">🌿 {t('ui.pantry')}</h2>
                <div className="grid grid-cols-2 gap-3 overflow-y-auto flex-1 mt-2">
                    {Object.entries(playerState.inventory.plants).map(([id, count]) => {
                        if (count <= 0) return null;
                        const plant = gameData.plants.find(p => p.id === id);
                        return (
                            <div key={id} className="relative group">
                                <button onClick={() => handlers.handleAddToCauldron('plant', id)} className="w-full bg-[#e9dbbe] border-2 border-slate-900 p-3 rounded-xl flex flex-col items-center">
                                    {plant?.imageUrl ? <img src={plant.imageUrl} alt={plant.name} className="w-12 h-12 object-contain" /> : <span className="text-3xl">🌿</span>}
                                    <span className="text-sm font-bold text-slate-900 mt-1">{t(`plant.${id}.name`, plant?.name)}</span>
                                    <span className="text-xs font-bold bg-amber-100 px-2 rounded-full mt-1">x{count}</span>
                                </button>
                                <TooltipPlant plantId={id} gameData={gameData} t={t} />
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col h-[530px] relative">
                <h2 className="text-2xl font-magic text-slate-900 mb-4 border-b-2 border-slate-900/20 pb-2">⚗️ {t('ui.cauldron')}</h2>
                <div className={`flex-1 bg-slate-955 rounded-full border-[6px] border-slate-800 mx-4 mt-2 mb-6 flex flex-wrap justify-center items-center p-6 ${brewState.status === 'brewing' ? 'animate-pulse' : ''}`}>
                    {cauldron.length === 0 && <span className="text-slate-500 font-magic text-sm">{language === 'en' ? 'Toss items in!' : 'Kazan boş çırak.'}</span>}
                    {cauldron.map((item, idx) => {
                        const pl = gameData.plants.find(p => p.id === item.id);
                        return (
                            <button key={idx} onClick={() => handlers.handleRemoveFromCauldron(idx, item.type, item.id)} className="bg-[#f3e8d2] border-2 border-black px-3 py-1.5 rounded-xl text-sm font-bold m-1 flex items-center gap-1">
                                {item.type === 'plant' && pl?.imageUrl ? <img src={pl.imageUrl} alt={pl.name} className="w-4 h-4 object-contain" /> : (item.type === 'plant' ? '🌿' : '🧪')}
                                {item.type === 'plant' ? t(`plant.${item.id}.name`, item.id) : t(`potion.${item.id}.name`, item.id)} ✕
                            </button>
                        );
                    })}
                </div>
                {brewState.message && <div className="text-center bg-purple-100 border-2 border-black rounded-lg p-2 mb-2 font-bold text-slate-900">{brewState.message}</div>}
                <button onClick={handlers.handleBrew} disabled={cauldron.length === 0 || brewState.status === 'brewing'} className="w-full py-4 rounded-xl font-bold font-magic text-xl border-4 border-black bg-amber-500 hover:bg-amber-400 text-slate-955 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">{t('ui.brew')}</button>
            </div>
        </div>
    );
}

interface MarketAreaProps {
    gameData: GameData;
    t: (key: string, fallback?: string) => string;
    handlers: GameHandlers;
    currentDay: number;
    playerState: PlayerState;
}

function MarketArea({ gameData, t, handlers, currentDay, playerState }: MarketAreaProps): React.JSX.Element {
    // Girdiğimiz gün bilgisine göre market bitkilerini filtreliyoruz
    const availablePlants = (gameData.marketPlants || []).filter(mp => {
        const dayReq = mp.availableDay ?? 1;
        return currentDay >= dayReq;
    });

    // Girdiğimiz gün bilgisine göre market iksir formüllerini filtreliyoruz
    const availableRecipes = (gameData.marketRecipes || []).filter(mr => {
        const dayReq = mr.availableDay ?? 1;
        return currentDay >= dayReq;
    });

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Şifalı Bitkiler Bölümü */}
            <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6">
                <h2 className="text-3xl font-magic text-slate-900 border-b-2 border-slate-900/20 pb-2">🌾 {t('ui.market_title')} (Bitkiler)</h2>
                {availablePlants.length === 0 ? (
                    <p className="italic text-slate-600 font-bold">Bugün pazar tezgahlarında satılık bitki yok...</p>
                ) : (
                    <div className="space-y-4">
                        {availablePlants.map(mp => {
                            const plant = gameData.plants.find(p => p.id === mp.plantId);
                            if (!plant) return null;
                            return (
                                <div key={mp.plantId} className="relative group bg-amber-100/50 p-4 rounded-xl border-2 border-slate-900 flex justify-between items-center cursor-help">
                                    <div className="flex items-center gap-3">
                                        {plant.imageUrl ? <img src={plant.imageUrl} alt={plant.name} className="w-12 h-12 object-contain bg-amber-55 rounded-lg border-2 border-slate-900 p-1" /> : <span className="text-3xl">🌿</span>}
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-955">{t(`plant.${plant.id}.name`, plant.name)} ({t('ui.stock')}: {mp.stock})</h3>
                                            <p className="text-sm font-bold text-red-900 font-magic">{mp.cost} {t('ui.gold')}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handlers.handleBuyPlant(mp.plantId, mp.cost, 1)} disabled={mp.stock <= 0} className="bg-amber-500 text-slate-955 font-bold border-2 border-black px-4 py-1.5 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50">1x {t('ui.buy')}</button>
                                        <button onClick={() => handlers.handleBuyPlant(mp.plantId, mp.cost, 5)} disabled={mp.stock < 5} className="bg-amber-500 text-slate-955 font-bold border-2 border-black px-4 py-1.5 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50">5x {t('ui.buy')}</button>
                                    </div>
                                    <TooltipPlant plantId={mp.plantId} gameData={gameData} t={t} />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Formül & Reçete Satış Bölümü */}
            <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6">
                <h2 className="text-3xl font-magic text-slate-900 border-b-2 border-slate-900/20 pb-2">📜 Parşömen Satıcısı (İksir Formülleri)</h2>
                {availableRecipes.length === 0 ? (
                    <p className="italic text-slate-600 font-bold">Bugün pazar tezgahlarında satılık parşömen yok...</p>
                ) : (
                    <div className="space-y-4">
                        {availableRecipes.map(mr => {
                            const potion = gameData.potions.find(p => p.id === mr.potionId);
                            if (!potion) return null;
                            const alreadyKnown = playerState.knownPotions.includes(mr.potionId);
                            return (
                                <div key={mr.potionId} className="relative group bg-purple-100/50 p-4 rounded-xl border-2 border-slate-900 flex justify-between items-center cursor-help">
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl">📜</span>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-955">{t(`potion.${potion.id}.name`, potion.name)} Formülü</h3>
                                            <p className="text-sm font-bold text-red-900 font-magic">{mr.cost} {t('ui.gold')}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handlers.handleBuyRecipe(mr.potionId, mr.cost)}
                                        disabled={mr.stock <= 0 || alreadyKnown}
                                        className="bg-purple-500 text-white font-bold border-2 border-black px-4 py-1.5 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                                    >
                                        {alreadyKnown ? "Biliyorsun" : `${t('ui.buy')}`}
                                    </button>
                                    <TooltipPotion potionId={mr.potionId} gameData={gameData} t={t} />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// HİKAYE GİRİŞ EKRANI (INTRO SCREEN)
// ============================================================================

interface IntroScreenProps {
    gameData: GameData;
    pageIndex: number;
    setPageIndex: React.Dispatch<React.SetStateAction<number>>;
    setAppMode: React.Dispatch<React.SetStateAction<string>>;
    language: string;
    t: (key: string, fallback?: string) => string;
}

function IntroScreen({ gameData, pageIndex, setPageIndex, setAppMode, language, t }: IntroScreenProps): React.JSX.Element | null {
    const pages = gameData.introPages || [];
    if (pages.length === 0) {
        setAppMode('client');
        return null;
    }

    const currentPage = pages[pageIndex];
    const isFirstPage = pageIndex === 0;
    const isLastPage = pageIndex === pages.length - 1;

    const handleNext = () => {
        if (isLastPage) {
            setAppMode('client');
        } else {
            setPageIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (!isFirstPage) {
            setPageIndex(prev => prev - 1);
        }
    };

    const isImageUrl = (url: string): boolean => {
        if (!url) return false;
        const normalized = url.toLowerCase().trim();
        return normalized.startsWith('http') ||
            normalized.startsWith('/') ||
            normalized.startsWith('assets/') ||
            normalized.startsWith('./assets') ||
            /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(normalized);
    };

    return (
        <div className="min-h-screen bg-[#1c0f13] text-[#f3e8d2] flex items-center justify-center p-4 md:p-8">
            <div className="max-w-2xl w-full bg-[#2a131b] border-8 border-slate-900 p-8 rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] space-y-6 relative overflow-hidden font-parchment text-slate-800">
                <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-amber-500 to-red-800"></div>

                <button
                    onClick={() => setAppMode('client')}
                    className="absolute top-4 right-4 bg-red-800 hover:bg-red-700 text-white font-magic font-bold text-xs border-2 border-black px-3 py-1.5 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform active:translate-y-0.5"
                >
                    {language === 'en' ? 'Skip ➔' : 'Atla ➔'}
                </button>

                <div className="bg-[#f3e8d2] rounded-2xl p-6 md:p-8 border-4 border-slate-900 shadow-inner flex flex-col items-center space-y-6">
                    <h2 className="text-3xl font-magic text-red-900 text-center font-bold tracking-wide border-b-2 border-red-900/10 pb-2 w-full">
                        {t(`intro.title.${currentPage.id}`, currentPage.title)}
                    </h2>

                    {currentPage.imageUrl && isImageUrl(currentPage.imageUrl) ? (
                        <div className="w-64 h-48 bg-amber-55 rounded-2xl border-4 border-slate-900 overflow-hidden flex items-center justify-center p-2 shadow-lg animate-idle-float">
                            <img src={currentPage.imageUrl} alt="Hikaye Görseli" className="max-w-full max-h-full object-contain" />
                        </div>
                    ) : (
                        <div className="w-24 h-24 bg-[#dfd1b3] border-4 border-slate-900 rounded-full flex items-center justify-center text-5xl shadow-md animate-idle-float">
                            📖
                        </div>
                    )}

                    <p className="text-xl text-slate-900 font-semibold text-center italic leading-relaxed font-parchment max-w-lg">
                        {t(`intro.text.${currentPage.id}`, currentPage.text)}
                    </p>

                    <div className="text-xs font-sans font-bold text-slate-500">
                        {pageIndex + 1} / {pages.length}
                    </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                    <button
                        onClick={handlePrev}
                        disabled={isFirstPage}
                        className="bg-slate-800 text-white hover:bg-slate-700 font-magic font-bold px-6 py-2.5 rounded-xl border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] disabled:opacity-40 disabled:pointer-events-none transition-all active:translate-y-0.5"
                    >
                        {language === 'en' ? '◀ Back' : '◀ Geri'}
                    </button>

                    <button
                        onClick={handleNext}
                        className="bg-amber-500 text-slate-955 hover:bg-amber-400 font-magic font-bold px-8 py-2.5 rounded-xl border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-0.5"
                    >
                        {isLastPage
                            ? (language === 'en' ? 'Start Game ➔' : 'Oyuna Başla ➔')
                            : (language === 'en' ? 'Next ▶' : 'İleri ▶')}
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- ANA EKRAN BİLEŞENLERİ (SCREENS) ---

interface GameClientProps {
    gameData: GameData;
    gameState: GameState;
    playerState: PlayerState;
    cauldron: CauldronItem[];
    brewState: BrewState;
    treatmentBench: TreatmentBenchItem[];
    treatmentStatus: TreatmentStatus;
    language: string;
    setLanguage: React.Dispatch<React.SetStateAction<string>>;
    setAppMode: React.Dispatch<React.SetStateAction<string>>;
    activeTab: string;
    setActiveTab: React.Dispatch<React.SetStateAction<string>>;
    t: (key: string, fallback?: string) => string;
    handlers: GameHandlers;
    isMuted: boolean;
    setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
    currentTrackIndex: number;
    changeTrack: (idx: number) => void;
}

function GameClient({
                        gameData, gameState, playerState, cauldron, brewState, treatmentBench, treatmentStatus,
                        language, setLanguage, setAppMode, activeTab, setActiveTab, t, handlers,
                        isMuted, setIsMuted, currentTrackIndex, changeTrack
                    }: GameClientProps): React.JSX.Element {
    const activeTrack = gameData.soundtracks?.[currentTrackIndex];

    return (
        <div className="space-y-6">
            <div className="bg-[#2a131b] border-4 border-slate-900 p-6 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-600 to-red-800"></div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <span className="text-4xl hidden md:block animate-idle-float">⚗️</span>
                    <div>
                        <h1 className="text-3xl font-bold text-amber-400 font-magic flex items-center gap-2">⚗️ {language === 'en' ? 'Healer Cabin' : 'Şifacı Kulübesi'}</h1>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="bg-amber-500 text-slate-955 border-2 border-black px-3 py-0.5 rounded-lg text-sm font-magic font-bold">{t('ui.day')}: {gameState.day}</span>
                            {playerState.rentDebt > 0 && <span className="bg-red-800 border-2 border-black text-white px-3 py-0.5 rounded-lg text-sm font-magic font-bold animate-pulse">⚠️ {t('ui.rent_debt')}: {playerState.rentDebt}💰</span>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Müzik Kontrol Butonu */}
                    <div className="bg-[#1c0f13] border-4 border-black p-1 rounded-xl flex gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] items-center px-2">
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className={`px-2 py-1 rounded-lg font-magic font-bold text-xs transition-colors ${isMuted ? 'text-red-400' : 'bg-amber-500 text-slate-955'}`}
                            title={isMuted ? 'Müziği Aç' : 'Müziği Kapat'}
                        >
                            {isMuted ? '🔇' : '🔊'}
                        </button>
                        {!isMuted && activeTrack && (
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] text-amber-200 truncate max-w-[80px]" title={t(`soundtrack.${activeTrack.id}.title`, activeTrack.title)}>
                                    {t(`soundtrack.${activeTrack.id}.title`, activeTrack.title)}
                                </span>
                                <button
                                    onClick={() => {
                                        const nextIdx = (currentTrackIndex + 1) % (gameData.soundtracks?.length || 1);
                                        changeTrack(nextIdx);
                                    }}
                                    className="text-[10px] text-amber-400 hover:text-amber-200 ml-1 font-bold font-magic"
                                    title="Sonraki Şarkı"
                                >
                                    ⏭️
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="bg-[#1c0f13] border-4 border-black p-1 rounded-xl flex gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <button onClick={() => setLanguage('tr')} className={`px-2 py-1 rounded-lg font-magic font-bold text-xs ${language === 'tr' ? 'bg-amber-500 text-slate-955' : 'text-slate-400'}`}>TR</button>
                        <button onClick={() => setLanguage('en')} className={`px-2 py-1 rounded-lg font-magic font-bold text-xs ${language === 'en' ? 'bg-amber-500 text-slate-955' : 'text-slate-400'}`}>EN</button>
                    </div>
                    <div className="bg-amber-500 text-slate-955 px-5 py-2.5 rounded-2xl border-4 border-black flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-magic font-bold">💰 {playerState.gold} {t('ui.gold')}</div>
                    <button onClick={() => setAppMode('portal')} className="bg-red-800 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl border-4 border-black font-magic font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">🚪 {language === 'en' ? 'Exit Store' : 'Kulübeden Çık'}</button>
                </div>
            </div>

            <div className="flex flex-wrap gap-2.5 bg-[#2a131b] p-3 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-magic">
                {[
                    { id: 'shopArea', label: `🏪 ${language === 'en' ? 'Counter Front' : 'Tezgah Önü'}`, color: 'bg-amber-500 text-slate-955' },
                    { id: 'alchemyArea', label: `⚗️ ${language === 'en' ? 'Alchemist Lab' : 'Simya Atölyesi'}`, color: 'bg-purple-600 text-white' },
                    { id: 'marketArea', label: `🛒 ${language === 'en' ? 'Market' : 'Şehir Pazarı'}`, color: 'bg-emerald-600 text-white' }
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 py-3 rounded-xl font-bold text-base transition-all flex-1 md:flex-none text-center border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none ${activeTab === tab.id ? `${tab.color} scale-105` : 'bg-slate-800 text-slate-400 border-slate-955'}`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="font-parchment text-lg text-slate-800">
                {activeTab === 'shopArea' && <ShopArea gameState={gameState} playerState={playerState} gameData={gameData} language={language} t={t} handlers={handlers} treatmentBench={treatmentBench} treatmentStatus={treatmentStatus} />}
                {activeTab === 'alchemyArea' && <AlchemyArea playerState={playerState} gameData={gameData} cauldron={cauldron} brewState={brewState} language={language} t={t} handlers={handlers} />}
                {activeTab === 'marketArea' && <MarketArea gameData={gameData} t={t} handlers={handlers} currentDay={gameState.day} playerState={playerState} />}
            </div>
        </div>
    );
}

// -- STÜDYO BİLEŞENLERİ (GELİŞTİRİCİ ARAÇLARI) --

interface DeveloperStudioProps {
    gameData: GameData;
    setGameData: React.Dispatch<React.SetStateAction<GameData | null>>;
    setGameState: React.Dispatch<React.SetStateAction<GameState>>;
    setPlayerState: React.Dispatch<React.SetStateAction<PlayerState>>;
    setAppMode: React.Dispatch<React.SetStateAction<string>>;
    t: (key: string, fallback?: string) => string;
    language: string;
    currentTrackIndex: number;
    changeTrack: (idx: number) => void;
    isMuted: boolean;
    setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
}

function DeveloperStudio({
                             gameData, setGameData, setGameState, setPlayerState, setAppMode, t, language,
                             currentTrackIndex, changeTrack, isMuted, setIsMuted
                         }: DeveloperStudioProps): React.JSX.Element {
    const [activeTab, setActiveTab] = useState<string>('dataEditor');
    const [newPlant, setNewPlant] = useState<Plant>({ id: '', name: '', rarity: 'Yaygın', cost: 10, properties: [], imageUrl: '' });
    const [newDisease, setNewDisease] = useState<Disease>({ id: '', name: '', symptoms: [] });
    const [newPotion, setNewPotion] = useState<Potion>({ id: '', name: '', sellPrice: 50, curesDiseaseIds: [], ingredients: [] });
    const [tempIngredient, setTempIngredient] = useState<Ingredient>({ type: 'plant', id: '', count: 1 });

    const [activeEditorStoryId, setActiveEditorStoryId] = useState<string>('story_baran');
    const [newStoryline, setNewStoryline] = useState<{ id: string; characterName: string; description: string; avatarUrl: string }>({ id: '', characterName: '', description: '', avatarUrl: '' });
    const [newNode, setNewNode] = useState<{ id: string; npcText: string; diseaseId: string; dynamicSuccessNodeId: string; dynamicFailNodeId: string; day: number }>({ id: '', npcText: '', diseaseId: '', dynamicSuccessNodeId: '', dynamicFailNodeId: '', day: 1 });

    const [newChoice, setNewChoice] = useState<{
        text: string;
        nextNodeId: string;
        delayDays: number;
        autoCreateNode: boolean;
        reqGold: number;
        reqPlant: string;
        reqPlantCount: number;
        reqPotion: string;
        reqPotionCount: number;
        rewardGold: number;
        rewardPlantId: string;
        rewardPlantCount: number;
        rewardPotionId: string;
        rewardPotionCount: number;
    }>({
        text: '',
        nextNodeId: '',
        delayDays: 0,
        autoCreateNode: false,
        reqGold: 0,
        reqPlant: '',
        reqPlantCount: 1,
        reqPotion: '',
        reqPotionCount: 1,
        rewardGold: 0,
        rewardPlantId: '',
        rewardPlantCount: 1,
        rewardPotionId: '',
        rewardPotionCount: 1
    });

    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [importText, setImportText] = useState<string>('');
    const [importStatus, setImportStatus] = useState<string>('');

    const [selectedMarketPlantId, setSelectedMarketPlantId] = useState<string>('');
    const [marketPlantCost, setMarketPlantCost] = useState<number>(10);
    const [marketPlantStock, setMarketMarketPlantStock] = useState<number>(5);
    const [marketPlantDay, setMarketPlantDay] = useState<number>(1);

    const [selectedMarketPotionId, setSelectedMarketPotionId] = useState<string>('');
    const [marketPotionCost, setMarketPotionCost] = useState<number>(100);
    const [marketPotionStock, setMarketPotionStock] = useState<number>(1);
    const [marketPotionDay, setMarketPotionDay] = useState<number>(1);

    const [newSymptom, setNewSymptom] = useState<string>('');
    const [newPlantProperty, setNewPlantProperty] = useState<PlantProperty>({ name: '', curesSymptoms: [] });

    const [newIntroPage, setNewIntroPage] = useState<IntroPage>({ id: '', title: '', text: '', imageUrl: '' });
    const [editingIntroPageId, setEditingIntroPageId] = useState<string | null>(null);

    const [editingPlantId, setEditingPlantId] = useState<string | null>(null);
    const [editingPotionId, setEditingPotionId] = useState<string | null>(null);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [editNodeData, setEditNodeData] = useState<{ npcText: string; diseaseId: string; dynamicSuccessNodeId: string; dynamicFailNodeId: string; day: number }>({ npcText: '', diseaseId: '', dynamicSuccessNodeId: '', dynamicFailNodeId: '', day: 1 });

    // Soundtrack Atölye State'leri
    const [newTrack, setNewTrack] = useState<Soundtrack>({ id: '', title: '', path: '' });

    const [newNews, setNewNews] = useState<NewsItem>({ id: '', day: 1, text: '' });

    const handleAddNews = (): void => {
        if (!newNews.id || !newNews.text) return;
        setGameData(prev => {
            if (!prev) return prev;
            const alreadyExists = (prev.news || []).some(n => n.id === newNews.id);
            if (alreadyExists) return prev;
            return {
                ...prev,
                news: [...(prev.news || []), { ...newNews, day: Number(newNews.day) }]
            };
        });
        setNewNews({ id: '', day: 1, text: '' });
    };

    const handleRemoveNews = (id: string): void => {
        setGameData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                news: (prev.news || []).filter(n => n.id !== id)
            };
        });
    };

    const handleExportJSON = (): void => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gameData, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "buyu_mirasi_data.json");
        document.body.appendChild(downloadAnchor); downloadAnchor.click(); downloadAnchor.remove();
    };

    const handleImportJSON = (): void => {
        try {
            const parsed = JSON.parse(importText);
            if (parsed.plants && parsed.potions) {
                const validatedData: GameData = {
                    ...INITIAL_DATA,
                    ...parsed,
                    marketPlants: parsed.marketPlants || [],
                    marketRecipes: parsed.marketRecipes || [],
                    introPages: parsed.introPages || INITIAL_DATA.introPages || [],
                    soundtracks: parsed.soundtracks || INITIAL_DATA.soundtracks || [],
                    news: parsed.news || INITIAL_DATA.news || []
                };
                setGameData(validatedData);
                setImportStatus('✅ Başarılı! Veritabanı yüklendi.');

                const initialProgress: Record<string, StoryProgressItem> = {};
                validatedData.storylines.forEach(story => {
                    const firstNode = story.nodes && story.nodes.length > 0 ? story.nodes[0] : null;
                    const firstNodeId = firstNode ? firstNode.id : `node_${story.id.replace('story_', '')}_1`;
                    const firstNodeDay = firstNode ? (firstNode.day ?? 1) : 1;
                    const dayReq = story.id === 'story_landlord' ? 7 : firstNodeDay;
                    initialProgress[story.id] = {
                        currentNodeId: firstNodeId,
                        availableDay: dayReq
                    };
                });

                setGameState(prev => ({
                    ...prev,
                    day: 1,
                    currentCustomer: null,
                    storyProgress: initialProgress,
                    logs: ['🧙‍♂️ Senaryo ve Karakterler başarıyla yüklendi!']
                }));
            } else {
                setImportStatus('❌ Hata: Gerekli şablon eksik.');
            }
        } catch(err) { setImportStatus('❌ Geçersiz JSON!'); }
    };

    const handleTranslateChange = (lang: string, key: string, val: string): void => {
        setGameData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                translations: {
                    ...prev.translations,
                    [lang]: {
                        ...prev.translations[lang],
                        [key]: val
                    }
                }
            };
        });
    };

    const getAllLocalesKeys = (): string[] => {
        const keys = new Set<string>();
        Object.keys(gameData.translations.tr || {}).forEach(k => keys.add(k));
        Object.keys(gameData.translations.en || {}).forEach(k => keys.add(k));
        gameData.plants.forEach(p => keys.add(`plant.${p.id}.name`));
        gameData.potions.forEach(pot => keys.add(`potion.${pot.id}.name`));
        (gameData.soundtracks || []).forEach(track => keys.add(`soundtrack.${track.id}.title`));
        (gameData.introPages || []).forEach(page => {
            keys.add(`intro.title.${page.id}`);
            keys.add(`intro.text.${page.id}`);
        });
        gameData.storylines.forEach(story => {
            keys.add(`char.${story.id}`);
            keys.add(`char.${story.id}.desc`);
            story.nodes.forEach(node => {
                keys.add(`node.${node.id}.npcText`);
                if (node.choices) node.choices.forEach((_, idx) => keys.add(`choice.${node.id}.${idx}`));
            });
        });
        return Array.from(keys);
    };

    const toggleProp = (propName: string): void => setNewPlant({ ...newPlant, properties: newPlant.properties.includes(propName) ? newPlant.properties.filter(p => p !== propName) : [...newPlant.properties, propName] });

    const handleAddPlant = (): void => {
        if (editingPlantId) {
            handleTranslateChange('tr', `plant.${editingPlantId}.name`, newPlant.name);
            setGameData(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    plants: prev.plants.map(p => p.id === editingPlantId ? { ...newPlant, id: editingPlantId, cost: Number(newPlant.cost) } : p)
                };
            });
            setEditingPlantId(null);
        } else {
            if (!newPlant.id) return;
            handleTranslateChange('tr', `plant.${newPlant.id}.name`, newPlant.name);
            setGameData(prev => {
                if (!prev) return prev;
                const alreadyExists = prev.plants.some(p => p.id === newPlant.id);
                if (alreadyExists) return prev;
                return {
                    ...prev,
                    plants: [...prev.plants, { ...newPlant, cost: Number(newPlant.cost) }]
                };
            });
        }
        setNewPlant({ id: '', name: '', rarity: 'Yaygın', cost: 10, properties: [], imageUrl: '' });
    };

    const handleAddTempIngredient = (): void => {
        if (!tempIngredient.id) return;
        setNewPotion({ ...newPotion, ingredients: [...newPotion.ingredients, { ...tempIngredient, count: Number(tempIngredient.count) }] });
    };

    const handleAddPotionRecipe = (): void => {
        if (editingPotionId) {
            handleTranslateChange('tr', `potion.${editingPotionId}.name`, newPotion.name);
            setGameData(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    potions: prev.potions.map(p => p.id === editingPotionId ? { ...newPotion, id: editingPotionId, sellPrice: Number(newPotion.sellPrice) } : p)
                };
            });
            setEditingPotionId(null);
        } else {
            if (!newPotion.id) return;
            handleTranslateChange('tr', `potion.${newPotion.id}.name`, newPotion.name);
            setGameData(prev => {
                if (!prev) return prev;
                const alreadyExists = prev.potions.some(p => p.id === newPotion.id);
                if (alreadyExists) return prev;
                return {
                    ...prev,
                    potions: [...prev.potions, { ...newPotion, sellPrice: Number(newPotion.sellPrice) }]
                };
            });
        }
        setNewPotion({ id: '', name: '', sellPrice: 50, curesDiseaseIds: [], ingredients: [] });
    };

    const handleSaveNodeEdits = (): void => {
        if (!activeEditorStoryId || !editingNodeId) return;
        handleTranslateChange('tr', `node.${editingNodeId}.npcText`, editNodeData.npcText);
        setGameData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                storylines: prev.storylines.map(s => {
                    if (s.id === activeEditorStoryId) {
                        return {
                            ...s,
                            nodes: s.nodes.map(n => n.id === editingNodeId ? {
                                ...n,
                                npcText: editNodeData.npcText,
                                diseaseId: editNodeData.diseaseId || undefined,
                                dynamicSuccessNodeId: editNodeData.dynamicSuccessNodeId || undefined,
                                dynamicFailNodeId: editNodeData.dynamicFailNodeId || undefined,
                                day: Number(editNodeData.day) || undefined
                            } : n)
                        };
                    }
                    return s;
                })
            };
        });
        setEditingNodeId(null);
    };

    const handleAddDisease = (): void => {
        if (!newDisease.id || !newDisease.name) return;
        handleTranslateChange('tr', `disease.${newDisease.id}.name`, newDisease.name);
        setGameData(prev => {
            if (!prev) return prev;
            const alreadyExists = prev.diseases.some(d => d.id === newDisease.id);
            if (alreadyExists) return prev;
            return {
                ...prev,
                diseases: [...prev.diseases, newDisease]
            };
        });
        setNewDisease({ id: '', name: '', symptoms: [] });
    };

    const handleAddSymptom = (): void => {
        if (!newSymptom.trim()) return;
        const trimmed = newSymptom.trim();
        if (gameData.diseaseSymptoms.includes(trimmed)) return;
        handleTranslateChange('tr', `symptom.${trimmed}`, trimmed);
        handleTranslateChange('en', `symptom.${trimmed}`, trimmed);
        setGameData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                diseaseSymptoms: [...prev.diseaseSymptoms, trimmed]
            };
        });
        setNewSymptom('');
    };

    const handleAddPlantProperty = (): void => {
        if (!newPlantProperty.name.trim()) return;
        const name = newPlantProperty.name.trim();
        const alreadyExists = gameData.plantProperties.some(p => p.name === name);
        if (alreadyExists) return;
        handleTranslateChange('tr', `prop.${name}`, name);
        handleTranslateChange('en', `prop.${name}`, name);
        setGameData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                plantProperties: [...prev.plantProperties, { ...newPlantProperty, name }]
            };
        });
        setNewPlantProperty({ name: '', curesSymptoms: [] });
    };

    const handleAddMarketPlant = (): void => {
        if (!selectedMarketPlantId) return;
        setGameData(prev => {
            if (!prev) return prev;
            const alreadyExists = (prev.marketPlants || []).some(mp => mp.plantId === selectedMarketPlantId);
            if (alreadyExists) return prev;
            return {
                ...prev,
                marketPlants: [
                    ...(prev.marketPlants || []),
                    {
                        plantId: selectedMarketPlantId,
                        cost: Number(marketPlantCost),
                        stock: Number(marketPlantStock),
                        maxStock: Number(marketPlantStock),
                        availableDay: Number(marketPlantDay)
                    }
                ]
            };
        });
        setSelectedMarketPlantId('');
    };

    const handleAddMarketRecipe = (): void => {
        if (!selectedMarketPotionId) return;
        setGameData(prev => {
            if (!prev) return prev;
            const alreadyExists = (prev.marketRecipes || []).some(mr => mr.potionId === selectedMarketPotionId);
            if (alreadyExists) return prev;
            return {
                ...prev,
                marketRecipes: [
                    ...(prev.marketRecipes || []),
                    {
                        potionId: selectedMarketPotionId,
                        cost: Number(marketPotionCost),
                        stock: Number(marketPotionStock),
                        maxStock: Number(marketPotionStock),
                        availableDay: Number(marketPotionDay)
                    }
                ]
            };
        });
        setSelectedMarketPotionId('');
    };

    const handleRemoveMarketPlant = (plantId: string): void => {
        setGameData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                marketPlants: (prev.marketPlants || []).filter(mp => mp.plantId !== plantId)
            };
        });
    };

    const handleRemoveMarketRecipe = (potionId: string): void => {
        setGameData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                marketRecipes: (prev.marketRecipes || []).filter(mr => mr.potionId !== potionId)
            };
        });
    };

    const handleAddStoryline = (): void => {
        if(!newStoryline.id || !newStoryline.characterName) return;
        const safeStoryId = newStoryline.id.startsWith('story_') ? newStoryline.id : `story_${newStoryline.id}`;

        handleTranslateChange('tr', `char.${safeStoryId}`, newStoryline.characterName);
        if (newStoryline.description) {
            handleTranslateChange('tr', `char.${safeStoryId}.desc`, newStoryline.description);
        }

        setGameData(prev => {
            if (!prev) return prev;
            const alreadyExists = prev.storylines.some(s => s.id === safeStoryId);
            if (alreadyExists) return prev;
            return {
                ...prev,
                storylines: [...prev.storylines, {
                    id: safeStoryId,
                    characterName: newStoryline.characterName,
                    description: newStoryline.description,
                    avatarUrl: newStoryline.avatarUrl || '👤',
                    nodes: []
                }]
            };
        });

        const autoFirstNodeId = `node_${safeStoryId.replace('story_', '')}_1`;

        setGameState(prev => {
            return {
                ...prev,
                storyProgress: {
                    ...prev.storyProgress,
                    [safeStoryId]: {
                        currentNodeId: autoFirstNodeId,
                        availableDay: 1
                    }
                },
                logs: [`🧙‍♂️ Yeni karakter eklendi: ${newStoryline.characterName}`, ...prev.logs].slice(0, 5)
            };
        });

        setGameData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                storylines: prev.storylines.map(s => {
                    if (s.id === safeStoryId && s.nodes.length === 0) {
                        const initNode: StoryNode = {
                            id: autoFirstNodeId,
                            npcText: `${newStoryline.characterName} şifacı kulübesinin kapısını araladı. Ona nasıl yardım edeceksin?`,
                            day: 1,
                            choices: []
                        };
                        handleTranslateChange('tr', `node.${autoFirstNodeId}.npcText`, initNode.npcText);
                        return { ...s, nodes: [initNode] };
                    }
                    return s;
                })
            };
        });

        setActiveEditorStoryId(safeStoryId);
        setNewStoryline({ id: '', characterName: '', description: '', avatarUrl: '' });
    };

    const handleAddNodeToStory = (): void => {
        if(!activeEditorStoryId || !newNode.id) return;
        handleTranslateChange('tr', `node.${newNode.id}.npcText`, newNode.npcText);
        setGameData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                storylines: prev.storylines.map(s => s.id === activeEditorStoryId ? { ...s, nodes: [...s.nodes, { ...newNode, day: Number(newNode.day) || undefined, choices: [] }] } : s)
            };
        });
        setNewNode({id: '', npcText: '', diseaseId: '', dynamicSuccessNodeId: '', dynamicFailNodeId: '', day: 1});
    };

    const handleAddChoiceToNodeAdv = (nodeId: string): void => {
        let targetNextNodeId: string | null = newChoice.nextNodeId || null;
        const extraNodes: StoryNode[] = [];
        if (newChoice.autoCreateNode) {
            const generatedNodeId = `node_${activeEditorStoryId.replace('story_', '')}_gen_${Date.now().toString().slice(-4)}`;
            targetNextNodeId = generatedNodeId;
            extraNodes.push({ id: generatedNodeId, npcText: 'Diyalog devam ediyor...', day: 1, choices: [] });
        }

        const choiceObj: Choice = {
            text: newChoice.text,
            nextNodeId: targetNextNodeId,
            delayDays: newChoice.delayDays || undefined,
            reqGold: newChoice.reqGold ? Number(newChoice.reqGold) : undefined,
            reqPlant: newChoice.reqPlant || undefined,
            reqPlantCount: newChoice.reqPlant ? Number(newChoice.reqPlantCount) : undefined,
            reqPotion: newChoice.reqPotion || undefined,
            reqPotionCount: newChoice.reqPotion ? Number(newChoice.reqPotionCount) : undefined,
            rewardGold: newChoice.rewardGold ? Number(newChoice.rewardGold) : undefined,
            rewardPlantId: newChoice.rewardPlantId || undefined,
            rewardPlantCount: newChoice.rewardPlantId ? Number(newChoice.rewardPlantCount) : undefined,
            rewardPotionId: newChoice.rewardPotionId || undefined,
            rewardPotionCount: newChoice.rewardPotionId ? Number(newChoice.rewardPotionCount) : undefined
        };

        if (gameData) {
            const story = gameData.storylines.find(s => s.id === activeEditorStoryId);
            const node = story?.nodes.find(n => n.id === nodeId);
            const currentChoiceIndex = node?.choices.length || 0;
            handleTranslateChange('tr', `choice.${nodeId}.${currentChoiceIndex}`, newChoice.text);
        }

        setGameData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                storylines: prev.storylines.map(s => {
                    if (s.id === activeEditorStoryId) {
                        let updatedNodes = s.nodes.map(n => n.id === nodeId ? { ...n, choices: [...(n.choices || []), choiceObj] } : n);
                        if (extraNodes.length > 0) updatedNodes = [...updatedNodes, ...extraNodes];
                        return { ...s, nodes: updatedNodes };
                    }
                    return s;
                })
            };
        });
        setSelectedNodeId(null);
        setNewChoice({
            text: '',
            nextNodeId: '',
            delayDays: 0,
            autoCreateNode: false,
            reqGold: 0,
            reqPlant: '',
            reqPlantCount: 1,
            reqPotion: '',
            reqPotionCount: 1,
            rewardGold: 0,
            rewardPlantId: '',
            rewardPlantCount: 1,
            rewardPotionId: '',
            rewardPotionCount: 1
        });
    };

    const handleAddIntroPage = (): void => {
        if (!newIntroPage.id || !newIntroPage.title || !newIntroPage.text) return;

        handleTranslateChange('tr', `intro.title.${newIntroPage.id}`, newIntroPage.title);
        handleTranslateChange('tr', `intro.text.${newIntroPage.id}`, newIntroPage.text);

        setGameData(prev => {
            if (!prev) return prev;
            const currentPages = prev.introPages || [];

            if (editingIntroPageId) {
                return {
                    ...prev,
                    introPages: currentPages.map(page => page.id === editingIntroPageId ? newIntroPage : page)
                };
            } else {
                const alreadyExists = currentPages.some(page => page.id === newIntroPage.id);
                if (alreadyExists) return prev;
                return {
                    ...prev,
                    introPages: [...currentPages, newIntroPage]
                };
            }
        });

        setNewIntroPage({ id: '', title: '', text: '', imageUrl: '' });
        setEditingIntroPageId(null);
    };

    const handleRemoveIntroPage = (id: string): void => {
        setGameData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                introPages: (prev.introPages || []).filter(page => page.id !== id)
            };
        });
    };

    const moveIntroPage = (index: number, direction: 'up' | 'down'): void => {
        if (!gameData) return;
        const pages = [...(gameData.introPages || [])];
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === pages.length - 1) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const temp = pages[index];
        pages[index] = pages[targetIndex];
        pages[targetIndex] = temp;

        setGameData({
            ...gameData,
            introPages: pages
        });
    };

    // Soundtrack Yönetim Metotları
    const handleAddTrack = (): void => {
        if (!newTrack.id || !newTrack.title || !newTrack.path) return;
        handleTranslateChange('tr', `soundtrack.${newTrack.id}.title`, newTrack.title);
        setGameData(prev => {
            if (!prev) return prev;
            const currentTracks = prev.soundtracks || [];
            const alreadyExists = currentTracks.some(t => t.id === newTrack.id);
            if (alreadyExists) {
                return {
                    ...prev,
                    soundtracks: currentTracks.map(t => t.id === newTrack.id ? newTrack : t)
                };
            } else {
                return {
                    ...prev,
                    soundtracks: [...currentTracks, newTrack]
                };
            }
        });
        setNewTrack({ id: '', title: '', path: '' });
    };

    const handleRemoveTrack = (id: string): void => {
        setGameData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                soundtracks: (prev.soundtracks || []).filter(t => t.id !== id)
            };
        });
    };

    const handleTestTrack = (idx: number): void => {
        setIsMuted(false);
        changeTrack(idx);
    };

    const renderCreatePlant = (): React.JSX.Element => {
        const isEditing = editingPlantId !== null;
        return (
            <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
                <div className="flex justify-between items-center border-b border-slate-900/10 pb-1">
                    <h2 className="text-2xl font-bold font-magic text-slate-900">{isEditing ? `🌿 Bitkiyi Düzenle (#${editingPlantId})` : '🌿 Yeni Bitki Yarat'}</h2>
                    {isEditing && (
                        <button
                            onClick={() => {
                                setEditingPlantId(null);
                                setNewPlant({ id: '', name: '', rarity: 'Yaygın', cost: 10, properties: [], imageUrl: '' });
                            }}
                            className="bg-red-800 text-white font-sans text-xs font-bold px-2 py-0.5 rounded border border-black shadow"
                        >
                            Vazgeç
                        </button>
                    )}
                </div>
                <input
                    disabled={isEditing}
                    className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold disabled:opacity-50 text-slate-900"
                    placeholder="ID (p_mavi)"
                    value={isEditing ? editingPlantId : newPlant.id}
                    onChange={e => setNewPlant({...newPlant, id: e.target.value})}
                />
                <input className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold text-slate-900" placeholder="İsim"
                       value={newPlant.name} onChange={e => setNewPlant({...newPlant, name: e.target.value})}/>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-xs font-bold block mb-1">Nadirlik Derecesi</label>
                        <select className="w-full bg-amber-50 border-2 border-slate-900 p-2 rounded-lg font-bold font-parchment text-sm text-slate-900" value={newPlant.rarity} onChange={e => setNewPlant({...newPlant, rarity: e.target.value})}>
                            <option value="Yaygın">Yaygın</option>
                            <option value="Normal">Normal</option>
                            <option value="Nadir">Nadir</option>
                            <option value="Efsanevi">Efsanevi</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold block mb-1">Değeri (Maliyet)</label>
                        <input type="number" className="w-full bg-amber-50 border-2 border-slate-900 p-2 rounded-lg font-bold text-slate-900" value={newPlant.cost} onChange={e => setNewPlant({...newPlant, cost: Number(e.target.value)})} />
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-2 p-4 border-2 border-slate-900/30 rounded-xl bg-amber-100/30">
                    {gameData.plantProperties.map(prop => (
                        <button key={prop.name} onClick={() => toggleProp(prop.name)}
                                className={`text-sm px-3 py-1 rounded-xl border-2 ${newPlant.properties.includes(prop.name) ? 'bg-emerald-600 text-white' : 'bg-amber-100 border-slate-700 text-slate-750'}`}>{prop.name}</button>
                    ))}
                </div>
                <button onClick={handleAddPlant}
                        className="w-full bg-emerald-500 text-slate-955 font-bold py-3 rounded-xl border-4 border-black font-magic shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    {isEditing ? "Bitki Değişikliklerini Kaydet" : "Kaydet"}
                </button>
            </div>
        );
    };

    const renderCreatePotion = (): React.JSX.Element => {
        const isEditing = editingPotionId !== null;
        return (
            <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
                <div className="flex justify-between items-center border-b border-slate-900/10 pb-1">
                    <h2 className="text-2xl font-bold font-magic text-slate-900">{isEditing ? `⚗️ İksiri Düzenle (#${editingPotionId})` : '⚗️ Yeni İksir Formülü'}</h2>
                    {isEditing && (
                        <button
                            onClick={() => {
                                setEditingPotionId(null);
                                setNewPotion({ id: '', name: '', sellPrice: 50, curesDiseaseIds: [], ingredients: [] });
                            }}
                            className="bg-red-800 text-white font-sans text-xs font-bold px-2 py-0.5 rounded border border-black shadow"
                        >
                            Vazgeç
                        </button>
                    )}
                </div>
                <input
                    disabled={isEditing}
                    className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold disabled:opacity-50 text-slate-900"
                    placeholder="ID (pot_hiz)"
                    value={isEditing ? editingPotionId : newPotion.id}
                    onChange={e => setNewPotion({...newPotion, id: e.target.value})}
                />
                <input className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold text-slate-900"
                       placeholder="İsim" value={newPotion.name}
                       onChange={e => setNewPotion({...newPotion, name: e.target.value})}/>
                <div className="flex gap-2">
                    <select className="bg-amber-50 border-2 border-slate-900 p-2 flex-1 rounded text-xs font-bold font-parchment text-slate-900" value={tempIngredient.id}
                            onChange={e => setTempIngredient({...tempIngredient, id: e.target.value, type: e.target.value.startsWith('pot_') ? 'potion' : 'plant'})}>
                        <option value="">İçerik Seç...</option>
                        {gameData.plants.map(p => <option key={p.id} value={p.id}>{t(`plant.${p.id}.name`, p.name)}</option>)}
                    </select>
                    <button onClick={handleAddTempIngredient} className="bg-indigo-600 text-white px-4 rounded-lg font-bold border-2 border-black text-xs">Ekle</button>
                </div>
                <div className="space-y-1">{newPotion.ingredients.map((ing, idx) => <div key={idx}
                                                                                         className="bg-amber-50 p-1 border text-xs text-slate-900">{ing.id} x{ing.count}</div>)}</div>

                <div className="pt-2">
                    <label className="text-xs font-bold text-slate-700 block mb-1">Tedavi Ettiği Hastalıklar:</label>
                    <div className="grid grid-cols-2 gap-1 max-h-24 overflow-y-auto p-2 border-2 border-slate-900/30 rounded-lg bg-amber-100/10">
                        {gameData.diseases.map(dis => {
                            const isChecked = newPotion.curesDiseaseIds.includes(dis.id);
                            return (
                                <button
                                    key={dis.id}
                                    type="button"
                                    onClick={() => {
                                        setNewPotion(prev => ({
                                            ...prev,
                                            curesDiseaseIds: isChecked
                                                ? prev.curesDiseaseIds.filter(id => id !== dis.id)
                                                : [...prev.curesDiseaseIds, dis.id]
                                        }));
                                    }}
                                    className={`text-left text-[10px] p-1.5 rounded border-2 flex items-center gap-1 transition-all ${
                                        isChecked
                                            ? 'bg-purple-800 border-black text-white font-bold'
                                            : 'bg-amber-50 border-slate-300 text-slate-600'
                                    }`}
                                >
                                    <span>{isChecked ? '✓' : 'o'}</span>
                                    <span className="truncate">{t(`disease.${dis.id}.name`, dis.name)}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <button onClick={handleAddPotionRecipe}
                        className="w-full bg-purple-500 text-white font-bold py-3 rounded-xl border-4 border-black font-magic shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    {isEditing ? "Reçete Değişikliklerini Kaydet" : "Tarifi Kaydet"}
                </button>
            </div>
        );
    };

    const renderCreateDisease = (): React.JSX.Element => {
        return (
            <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
                <h2 className="text-2xl font-bold font-magic text-slate-900">🦠 Yeni Hastalık Yarat</h2>
                <div className="space-y-3">
                    <input
                        className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold text-slate-900"
                        placeholder="ID (d_veba)"
                        value={newDisease.id}
                        onChange={e => setNewDisease({...newDisease, id: e.target.value})}
                    />
                    <input
                        className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold text-slate-900"
                        placeholder="Hastalık İsmi (Örn: Kara Veba)"
                        value={newDisease.name}
                        onChange={e => setNewDisease({...newDisease, name: e.target.value})}
                    />

                    <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Hastalık Semptomları:</label>
                        <div className="grid grid-cols-2 gap-1 max-h-36 overflow-y-auto p-2 border-2 border-slate-900/30 rounded-lg bg-amber-100/10">
                            {gameData.diseaseSymptoms.map(symptom => {
                                const isChecked = newDisease.symptoms.includes(symptom);
                                return (
                                    <button
                                        key={symptom}
                                        type="button"
                                        onClick={() => {
                                            setNewDisease(prev => ({
                                                ...prev,
                                                symptoms: isChecked
                                                    ? prev.symptoms.filter(s => s !== symptom)
                                                    : [...prev.symptoms, symptom]
                                            }));
                                        }}
                                        className={`text-left text-xs p-1.5 rounded border-2 flex items-center gap-1.5 transition-all ${
                                            isChecked
                                                ? 'bg-red-800 border-black text-amber-100 font-bold'
                                                : 'bg-amber-50 border-slate-300 text-slate-700'
                                        }`}
                                    >
                                        <span>{isChecked ? '✅' : '⬜'}</span>
                                        <span className="truncate">{t(`symptom.${symptom}`, symptom)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <button
                        onClick={handleAddDisease}
                        className="w-full bg-red-800 text-white font-bold py-3 rounded-xl border-4 border-black font-magic shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-red-700"
                    >
                        Hastalığı Kaydet
                    </button>
                </div>
            </div>
        );
    };

    const renderManagePropertiesAndSymptoms = (): React.JSX.Element => {
        return (
            <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6">
                <div className="space-y-3">
                    <h2 className="text-2xl font-bold font-magic text-slate-900 border-b-2 border-slate-900/20 pb-2">⚠️ Yeni Semptom Tanımla</h2>
                    <div className="flex gap-2">
                        <input
                            className="flex-1 bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold text-sm text-slate-900"
                            placeholder="Semptom İsmi (Örn: Aşırı Ateş)"
                            value={newSymptom}
                            onChange={e => setNewSymptom(e.target.value)}
                        />
                        <button
                            onClick={handleAddSymptom}
                            className="bg-indigo-600 hover:bg-indigo-500 border-2 border-black text-white font-bold px-4 rounded-xl text-sm"
                        >
                            Ekle
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-2 border-2 border-slate-900/30 rounded-lg bg-amber-100/10">
                        {gameData.diseaseSymptoms.map(symp => (
                            <span key={symp} className="bg-amber-100 text-slate-855 text-xs px-2.5 py-0.5 rounded-full border border-slate-400 font-bold font-sans">
                {t(`symptom.${symp}`, symp)}
              </span>
                        ))}
                    </div>
                </div>

                <div className="space-y-3 pt-4 border-t-2 border-slate-900/10">
                    <h2 className="text-2xl font-bold font-magic text-slate-900">🌿 Yeni Bitki Özelliği (Nitelik)</h2>
                    <input
                        className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold text-sm text-slate-900"
                        placeholder="Özellik İsmi (Örn: Zehir Sökücü)"
                        value={newPlantProperty.name}
                        onChange={e => setNewPlantProperty({...newPlantProperty, name: e.target.value})}
                    />

                    <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">Gidereceği Semptomlar:</label>
                        <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto p-2 border-2 border-slate-900/30 rounded-lg bg-amber-100/10">
                            {gameData.diseaseSymptoms.map(symptom => {
                                const isChecked = newPlantProperty.curesSymptoms.includes(symptom);
                                return (
                                    <button
                                        key={symptom}
                                        type="button"
                                        onClick={() => {
                                            setNewPlantProperty(prev => ({
                                                ...prev,
                                                curesSymptoms: isChecked
                                                    ? prev.curesSymptoms.filter(s => s !== symptom)
                                                    : [...prev.curesSymptoms, symptom]
                                            }));
                                        }}
                                        className={`text-left text-[10px] p-1.5 rounded border-2 flex items-center gap-1.5 transition-all ${
                                            isChecked
                                                ? 'bg-emerald-800 border-black text-white font-bold'
                                                : 'bg-amber-50 border-slate-300 text-slate-600'
                                        }`}
                                    >
                                        <span>{isChecked ? '✓' : 'o'}</span>
                                        <span className="truncate">{t(`symptom.${symptom}`, symptom)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <button
                        onClick={handleAddPlantProperty}
                        className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl border-4 border-black text-sm"
                    >
                        Özelliği Kaydet
                    </button>
                </div>
            </div>
        );
    };

    const renderStudioPlantsListLocal = (): React.JSX.Element => {
        return (
            <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4 col-span-1 lg:col-span-2 font-parchment">
                <h2 className="text-2xl font-bold font-magic text-slate-950 border-b-2 border-slate-900/20 pb-2 flex items-center gap-2">
                    📦 Sistem Veritabanındaki Kayıtlı Tüm Bitkiler ({gameData.plants.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[360px] overflow-y-auto pr-2">
                    {gameData.plants.map(plant => {
                        const symptoms = getHerbCuredSymptoms(plant.id, gameData);

                        const rarityColors: Record<string, string> = {
                            'Yaygın': 'bg-slate-200 text-slate-800 border-slate-400',
                            'Normal': 'bg-blue-100 text-blue-800 border-blue-400',
                            'Nadir': 'bg-purple-100 text-purple-800 border-purple-400',
                            'Efsanevi': 'bg-amber-100 text-amber-955 border-amber-500 animate-pulse'
                        };
                        const rarityColor = rarityColors[plant.rarity] || 'bg-slate-100 text-slate-700 border-slate-300';

                        return (
                            <div key={plant.id} className="bg-amber-50/70 p-4 rounded-xl border-2 border-slate-900 flex flex-col justify-between space-y-3 shadow-sm hover:shadow-md transition-shadow relative">
                                <div>
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-900 leading-tight">{t(`plant.${plant.id}.name`, plant.name)}</h3>
                                            <span className="text-xs font-mono text-indigo-900 block font-semibold mt-0.5">ID: #{plant.id}</span>
                                        </div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border-2 font-bold whitespace-nowrap ${rarityColor}`}>
                      {plant.rarity}
                    </span>
                                    </div>

                                    <div className="mt-3 space-y-1.5 border-t border-dashed border-slate-900/10 pt-2 text-xs text-slate-700 font-sans">
                                        <p className="leading-snug">
                                            <strong className="text-slate-900 font-magic">🌿 Nitelikler:</strong> {plant.properties.map(p => t(`prop.${p}`, p)).join(', ') || 'Belirtilmemiş'}
                                        </p>
                                        <div className="leading-snug">
                                            <strong className="text-slate-900 font-magic">⚡ Giderdiği Semptomlar:</strong>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {symptoms.length > 0 ? (
                                                    symptoms.map(s => (
                                                        <span key={s} className="bg-emerald-100 border border-emerald-400 text-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {t(`symptom.${s}`, s)}
                            </span>
                                                    ))
                                                ) : (
                                                    <span className="text-slate-500 italic text-[10px]">Herhangi bir semptom gidermiyor.</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2 border-t-2 border-slate-900/10 flex justify-between items-center text-xs">
                                    <span className="text-slate-550">Maliyet: <strong className="font-magic font-bold text-red-955 text-[13px]">💰 {plant.cost}</strong></span>
                                    <button
                                        onClick={() => {
                                            setNewPlant({ ...plant });
                                            setEditingPlantId(plant.id);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] px-2.5 py-0.5 rounded border-2 border-black font-bold font-magic"
                                    >
                                        ✏️ Düzenle
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderStudioDiseasesAndPotionsLocal = (): React.JSX.Element => {
        return (
            <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6 col-span-1 lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    <div className="space-y-3 font-parchment">
                        <h3 className="text-xl font-bold font-magic text-slate-900 border-b-2 border-slate-900/20 pb-1 flex items-center gap-2">
                            🦠 Tanımlı Hastalıklar ({gameData.diseases.length})
                        </h3>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            {gameData.diseases.map(dis => (
                                <div key={dis.id} className="bg-amber-50/70 p-3 rounded-xl border-2 border-slate-900 flex justify-between items-start gap-2">
                                    <div>
                                        <span className="font-bold text-slate-900 block">{t(`disease.${dis.id}.name`, dis.name)}</span>
                                        <span className="text-xs font-mono text-indigo-900 font-semibold">ID: #{dis.id}</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {dis.symptoms.map(s => (
                                                <span key={s} className="bg-red-100 text-red-900 border border-red-300 rounded text-[9px] px-1.5 py-0.5 font-bold font-sans">
                          {t(`symptom.${s}`, s)}
                        </span>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setGameData(prev => {
                                                if (!prev) return prev;
                                                return {
                                                    ...prev,
                                                    diseases: prev.diseases.filter(d => d.id !== dis.id)
                                                };
                                            });
                                        }}
                                        className="bg-red-800 text-white text-[10px] px-2.5 py-1 rounded border-2 border-black font-bold font-magic self-center animate-pulse"
                                    >
                                        Sil
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3 font-parchment">
                        <h3 className="text-xl font-bold font-magic text-slate-900 border-b-2 border-slate-900/20 pb-1 flex items-center gap-2">
                            🧪 Tanımlı İksirler ({gameData.potions.length})
                        </h3>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            {gameData.potions.map(pot => (
                                <div key={pot.id} className="bg-amber-50/70 p-3 rounded-xl border-2 border-slate-900 flex justify-between items-start gap-2">
                                    <div className="space-y-1">
                                        <span className="font-bold text-slate-900 block leading-tight">{t(`potion.${pot.id}.name`, pot.name)}</span>
                                        <span className="text-xs font-mono text-indigo-900 font-semibold block">ID: #{pot.id} | Satış: {pot.sellPrice}💰</span>
                                        <div className="text-[10px] text-slate-600 leading-tight font-sans">
                                            <strong>İçerik:</strong> {pot.ingredients.map(ing => `${ing.count}x ${t(`plant.${ing.id}.name`, ing.id)}`).join(', ')}
                                        </div>
                                        <div className="flex flex-wrap gap-1 mt-1 font-sans">
                                            {pot.curesDiseaseIds.map(dId => {
                                                const dDef = gameData.diseases.find(d => d.id === dId);
                                                return (
                                                    <span key={dId} className="bg-purple-100 text-purple-900 border border-purple-300 rounded text-[9px] px-1.5 py-0.5 font-bold">
                            {t(`disease.${dId}.name`, dDef ? dDef.name : dId)}
                          </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1 self-center">
                                        <button
                                            onClick={() => {
                                                setNewPotion({ ...pot });
                                                setEditingPotionId(pot.id);
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] px-2.5 py-1 rounded border-2 border-black font-bold font-magic shadow"
                                        >
                                            Düzelt
                                        </button>
                                        <button
                                            onClick={() => {
                                                setGameData(prev => {
                                                    if (!prev) return prev;
                                                    return {
                                                        ...prev,
                                                        potions: prev.potions.filter(p => p.id !== pot.id)
                                                    };
                                                });
                                            }}
                                            className="bg-red-800 text-white text-[10px] px-2.5 py-1 rounded border-2 border-black font-bold font-magic shadow animate-pulse"
                                        >
                                            Sil
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        );
    };

    const renderVisualNode = (story: Storyline, nodeId: string, visited: Set<string> = new Set()): React.JSX.Element => {
        if (visited.has(nodeId)) return <div className="text-xs text-red-955 font-bold p-2 bg-red-100 rounded border-2">Döngü Tespit Edildi</div>;
        const nextVisited = new Set(visited);
        nextVisited.add(nodeId);
        const node = story.nodes.find(n => n.id === nodeId);
        if (!node) return <div className="text-slate-600 text-xs italic p-2 bg-amber-55 rounded border border-dashed">Diyalog Bitiş</div>;

        return (
            <div className="flex flex-col items-center relative mt-4 font-parchment">
                <div className="bg-[#f3e8d2] border-4 border-slate-900 rounded-2xl p-4 w-72 shadow-md relative z-10">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-mono font-bold text-indigo-900">#{node.id}</span>
                        <span className="text-xs bg-amber-500 text-slate-955 px-2 py-0.5 rounded-full font-bold border border-black flex items-center gap-1">📅 Gün: {node.day ?? 1}</span>
                    </div>
                    <p className="text-sm font-bold">"{node.npcText}"</p>

                    <div className="absolute -right-3 -top-3 flex gap-1">
                        <button
                            onClick={() => {
                                setEditingNodeId(node.id);
                                setEditNodeData({
                                    npcText: node.npcText,
                                    diseaseId: node.diseaseId || '',
                                    dynamicSuccessNodeId: node.dynamicSuccessNodeId || '',
                                    dynamicFailNodeId: node.dynamicFailNodeId || '',
                                    day: node.day ?? 1
                                });
                            }}
                            className="bg-yellow-500 hover:bg-yellow-400 border-2 border-black text-slate-955 text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold shadow"
                            title="Düğümü Düzenle"
                        >
                            ✏️
                        </button>
                        <button
                            onClick={() => setSelectedNodeId(node.id)}
                            className="bg-emerald-500 hover:bg-emerald-400 border-2 border-black text-slate-955 text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold shadow"
                            title="Seçenek Ekle"
                        >
                            ➕
                        </button>
                    </div>
                </div>
                {node.choices && node.choices.length > 0 && (
                    <div className="flex gap-6 relative pt-6">
                        <div className="absolute top-0 left-1/2 w-1 h-6 bg-slate-900 -translate-x-1/2"></div>
                        {node.choices.map((choice, idx) => (
                            <div key={idx} className="flex flex-col items-center relative pt-4 min-w-[200px]">
                                <div className="absolute top-0 left-1/2 w-1 h-4 bg-slate-900 -translate-x-1/2"></div>
                                <div className="bg-[#e9dbbe] border-2 border-slate-955 rounded-xl p-2.5 text-xs w-48 shadow-sm text-center mb-3 space-y-1 font-sans">
                                    <p className="font-bold font-parchment text-sm">{t(`choice.${node.id}.${idx}`, choice.text)}</p>

                                    <div className="text-[9px] text-slate-600 flex flex-col items-center leading-tight">
                                        {choice.reqGold ? <span>💸 -💰{choice.reqGold} Altın</span> : null}
                                        {choice.reqPlant ? <span>💸 -🌿{choice.reqPlant} (x{choice.reqPlantCount || 1})</span> : null}
                                        {choice.reqPotion ? <span>💸 -🧪{choice.reqPotion} (x{choice.reqPotionCount || 1})</span> : null}
                                        {choice.rewardGold ? <span>🎁 +💰{choice.rewardGold} Altın</span> : null}
                                        {choice.rewardPlantId ? <span>🎁 +🌿{choice.rewardPlantId} (x{choice.rewardPlantCount || 1})</span> : null}
                                        {choice.rewardPotionId ? <span>🎁 +🧪{choice.rewardPotionId} (x{choice.rewardPotionCount || 1})</span> : null}
                                    </div>
                                </div>
                                {renderVisualNode(story, choice.nextNodeId || '', nextVisited)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderIntroEditor = (): React.JSX.Element => {
        const pages = gameData.introPages || [];
        const isEditing = editingIntroPageId !== null;

        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-parchment min-h-[600px]">

                <div className="lg:col-span-2 bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold font-magic text-slate-900 border-b-2 border-slate-900/20 pb-2">📖 Giriş Hikayesi Sayfaları ({pages.length})</h2>
                        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2">
                            {pages.length === 0 ? (
                                <p className="italic text-slate-600 font-bold p-4 text-center bg-amber-50 rounded-xl border border-dashed border-slate-400">Hiç giriş sayfası tanımlanmamış. Sağdaki formdan ilk sayfanızı ekleyin!</p>
                            ) : (
                                pages.map((page, index) => (
                                    <div key={page.id} className="bg-amber-50/70 p-4 rounded-xl border-2 border-slate-900 flex justify-between items-center gap-4 hover:shadow-md transition-shadow relative">
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-amber-500 text-slate-955 text-xs px-2 py-0.5 rounded-full font-sans font-bold">Sayfa {index + 1}</span>
                                                <h3 className="font-bold text-lg text-slate-900 leading-none">{t(`intro.title.${page.id}`, page.title)}</h3>
                                            </div>
                                            <p className="text-xs font-mono font-semibold text-indigo-900">ID: #{page.id}</p>
                                            <p className="text-sm text-slate-600 line-clamp-2 leading-tight">{t(`intro.text.${page.id}`, page.text)}</p>
                                            {page.imageUrl && (
                                                <span className="text-[10px] bg-slate-200 border text-slate-700 font-mono font-bold px-1.5 py-0.5 rounded block max-w-max">🖼️ {page.imageUrl}</span>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-1.5 items-end">
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => moveIntroPage(index, 'up')}
                                                    disabled={index === 0}
                                                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-sans text-xs font-bold px-2 py-1 rounded border border-black shadow"
                                                    title="Yukarı Taşı"
                                                >
                                                    ▲
                                                </button>
                                                <button
                                                    onClick={() => moveIntroPage(index, 'down')}
                                                    disabled={index === pages.length - 1}
                                                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-sans text-xs font-bold px-2 py-1 rounded border border-black shadow"
                                                    title="Aşağı Taşı"
                                                >
                                                    ▼
                                                </button>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => {
                                                        setNewIntroPage({ ...page });
                                                        setEditingIntroPageId(page.id);
                                                    }}
                                                    className="bg-yellow-500 hover:bg-yellow-400 text-slate-955 text-xs font-bold px-2 py-1 rounded border border-black shadow font-sans"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveIntroPage(page.id)}
                                                    className="bg-red-800 text-white text-xs font-bold px-2 py-1 rounded border border-black shadow font-sans animate-pulse"
                                                >
                                                    Sil
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-900/10 pb-1.5">
                        <h2 className="text-2xl font-bold font-magic text-slate-900">
                            {isEditing ? '✏️ Sayfayı Düzenle' : '📖 Yeni Sayfa Ekle'}
                        </h2>
                        {isEditing && (
                            <button
                                onClick={() => {
                                    setEditingIntroPageId(null);
                                    setNewIntroPage({ id: '', title: '', text: '', imageUrl: '' });
                                }}
                                className="bg-red-800 text-white font-sans text-xs font-bold px-2 py-0.5 rounded border border-black shadow"
                            >
                                İptal
                            </button>
                        )}
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold block mb-1 text-slate-700">Benzersiz ID:</label>
                            <input
                                disabled={isEditing}
                                className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-mono font-bold disabled:opacity-50 text-slate-900"
                                placeholder="intro_sayfa_1"
                                value={isEditing ? editingIntroPageId : newIntroPage.id}
                                onChange={e => setNewIntroPage({ ...newIntroPage, id: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold block mb-1 text-slate-700">Sayfa Başlığı:</label>
                            <input
                                className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold text-slate-900"
                                placeholder="Giriş Bölümü Başlığı"
                                value={newIntroPage.title}
                                onChange={e => setNewIntroPage({ ...newIntroPage, title: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold block mb-1 text-slate-700">Görsel / Resim Yolu veya Emoji:</label>
                            <input
                                className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold text-slate-900"
                                placeholder="assets/intro_pic.png veya 👤"
                                value={newIntroPage.imageUrl}
                                onChange={e => setNewIntroPage({ ...newIntroPage, imageUrl: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold block mb-1 text-slate-700">Hikaye Metni:</label>
                            <textarea
                                className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-sans font-semibold text-slate-900 h-32 resize-none leading-relaxed"
                                placeholder="Bu sayfada anlatılacak kadim hikayeyi yazın..."
                                value={newIntroPage.text}
                                onChange={e => setNewIntroPage({ ...newIntroPage, text: e.target.value })}
                            />
                        </div>

                        <button
                            onClick={handleAddIntroPage}
                            className="w-full bg-emerald-500 text-slate-955 font-bold py-3 rounded-xl border-4 border-black font-magic shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-emerald-400 active:translate-y-0.5"
                        >
                            {isEditing ? 'Sayfa Değişikliklerini Kaydet' : 'Sayfayı Hikayeye Ekle'}
                        </button>
                    </div>
                </div>

            </div>
        );
    };

    // Soundtrack Panel Görünümü
    const renderMusicEditor = (): React.JSX.Element => {
        const soundtracks = gameData.soundtracks || [];
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-parchment min-h-[600px]">
                <div className="lg:col-span-2 bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold font-magic text-slate-900 border-b-2 border-slate-900/20 pb-2">🎵 Han Müzikleri & Soundtrackler ({soundtracks.length})</h2>
                        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2">
                            {soundtracks.length === 0 ? (
                                <p className="italic text-slate-600 font-bold p-4 text-center bg-amber-50 rounded-xl border border-dashed border-slate-400">Hiç parça eklenmemiş. Sağdaki panelden ilk soundtrackinizi tanımlayın!</p>
                            ) : (
                                soundtracks.map((track, index) => {
                                    const isCurrentPlaying = currentTrackIndex === index && !isMuted;
                                    return (
                                        <div key={track.id} className={`bg-amber-50/70 p-4 rounded-xl border-2 border-slate-900 flex justify-between items-center gap-4 hover:shadow-md transition-shadow relative ${isCurrentPlaying ? 'border-amber-500 ring-4 ring-amber-500/20' : ''}`}>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-amber-500 text-slate-955 text-xs px-2 py-0.5 rounded-full font-sans font-bold">Parça {index + 1}</span>
                                                    <h3 className="font-bold text-lg text-slate-900 leading-none">{t(`soundtrack.${track.id}.title`, track.title)}</h3>
                                                </div>
                                                <p className="text-xs font-mono font-semibold text-indigo-900">ID: #{track.id}</p>
                                                <p className="text-sm text-slate-600 font-mono text-xs">Path: {track.path}</p>
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleTestTrack(index)}
                                                    className={`font-sans text-xs font-bold px-3 py-1.5 rounded border border-black shadow ${isCurrentPlaying ? 'bg-amber-500 text-slate-955' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}
                                                >
                                                    {isCurrentPlaying ? '⏸️ Çalıyor' : '▶️ Test Et'}
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveTrack(track.id)}
                                                    className="bg-red-800 text-white font-sans text-xs font-bold px-3 py-1.5 rounded border border-black shadow animate-pulse"
                                                >
                                                    Sil
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
                    <h2 className="text-2xl font-bold font-magic text-slate-900 border-b border-slate-900/10 pb-1.5">🎵 Soundtrack Ekle</h2>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold block mb-1 text-slate-700">Benzersiz ID:</label>
                            <input
                                className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-mono font-bold text-slate-900"
                                placeholder="track_autumn"
                                value={newTrack.id}
                                onChange={e => setNewTrack({ ...newTrack, id: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold block mb-1 text-slate-700">Parça Başlığı:</label>
                            <input
                                className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold text-slate-900"
                                placeholder="Sonbahar Esintisi"
                                value={newTrack.title}
                                onChange={e => setNewTrack({ ...newTrack, title: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold block mb-1 text-slate-700">Dosya Yolu (Assets Path):</label>
                            <input
                                className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-mono text-sm text-slate-900"
                                placeholder="Assets/ambient.mp3"
                                value={newTrack.path}
                                onChange={e => setNewTrack({ ...newTrack, path: e.target.value })}
                            />
                        </div>

                        <button
                            onClick={handleAddTrack}
                            className="w-full bg-emerald-500 text-slate-955 font-bold py-3 rounded-xl border-4 border-black font-magic shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-emerald-400 active:translate-y-0.5"
                        >
                            Soundtrack Ekle
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderNewsEditor = (): React.JSX.Element => {
        const news = gameData.news || [];
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-parchment min-h-[600px]">
                <div className="lg:col-span-2 bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold font-magic text-slate-900 border-b-2 border-slate-900/20 pb-2">📰 {t('ui.news_title')} ({news.length})</h2>
                        <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2">
                            {news.length === 0 ? (
                                <p className="italic text-slate-600 font-bold p-4 text-center bg-amber-50 rounded-xl border border-dashed border-slate-400">{t('ui.news_empty')}</p>
                            ) : (
                                [...news].sort((a,b) => a.day - b.day).map((n) => (
                                    <div key={n.id} className="bg-amber-50/70 p-4 rounded-xl border-2 border-slate-900 flex justify-between items-center gap-4 hover:shadow-md transition-shadow relative">
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full font-sans font-bold">{t('ui.day')} {n.day}</span>
                                                <h3 className="font-bold text-lg text-slate-900 leading-none">#{n.id}</h3>
                                            </div>
                                            <p className="text-sm text-slate-600 leading-tight">{n.text}</p>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveNews(n.id)}
                                            className="bg-red-800 text-white font-sans text-xs font-bold px-3 py-1.5 rounded border border-black shadow animate-pulse"
                                        >
                                            Sil
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
                    <h2 className="text-2xl font-bold font-magic text-slate-900 border-b border-slate-900/10 pb-1.5">📰 {t('ui.news_add')}</h2>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold block mb-1 text-slate-700">{t('ui.news_id')}:</label>
                            <input
                                className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-mono font-bold text-slate-900"
                                placeholder="news_unique_id"
                                value={newNews.id}
                                onChange={e => setNewNews({ ...newNews, id: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold block mb-1 text-slate-700">{t('ui.news_day')}:</label>
                            <input
                                type="number"
                                className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold text-slate-900"
                                value={newNews.day}
                                onChange={e => setNewNews({ ...newNews, day: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold block mb-1 text-slate-700">{t('ui.news_text')}:</label>
                            <textarea
                                className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-sans font-semibold text-slate-900 h-32 resize-none leading-relaxed"
                                placeholder="Köyde neler oldu?"
                                value={newNews.text}
                                onChange={e => setNewNews({ ...newNews, text: e.target.value })}
                            />
                        </div>

                        <button
                            onClick={handleAddNews}
                            className="w-full bg-emerald-500 text-slate-955 font-bold py-3 rounded-xl border-4 border-black font-magic shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-emerald-400 active:translate-y-0.5"
                        >
                            {t('ui.news_add')}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const currentStory = gameData.storylines.find(s => s.id === activeEditorStoryId);

    return (
        <div className="space-y-6 text-slate-800 font-parchment text-lg">
            <div className="bg-[#2a131b] border-4 border-slate-900 p-6 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between items-center gap-4 relative">
                <div>
                    <h1 className="text-3xl font-bold text-amber-400 font-magic">🧙‍♂️ Kozmos Yaratıcı Atölyesi</h1>
                    <p className="text-amber-100/60 text-sm font-sans">Bu alandaki tüm kurgun saf JSON çıktısı üretir ve dışa aktarılabilir.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleExportJSON} className="bg-emerald-600 hover:bg-emerald-500 text-white font-magic font-bold px-5 py-2.5 rounded-xl border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">💾 Senaryoyu Kaydet</button>
                    <button onClick={() => setAppMode('portal')} className="bg-red-800 hover:bg-red-700 text-white font-magic font-bold px-5 py-2.5 rounded-xl border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">🚪 Çıkış</button>
                </div>
            </div>

            <div className="flex flex-wrap gap-2.5 bg-[#2a131b] p-3 rounded-2xl border-4 border-slate-900">
                {[
                    { id: 'dataEditor', label: '🌿 Element & Reçete' },
                    { id: 'dialogueEditor', label: '💬 Diyalog Ağacı & Karakter' },
                    { id: 'introEditor', label: '📖 Hikaye Girişi' },
                    { id: 'musicEditor', label: '🎵 Müzik & Sesler' },
                    { id: 'newsEditor', label: t('ui.news_tab') },
                    { id: 'marketEditor', label: '🛒 Market Düzenleyici' },
                    { id: 'translationEditor', label: '🌍 Lokalizasyon' },
                    { id: 'jsonHub', label: '📂 JSON Motoru' }
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 py-3 rounded-xl font-bold font-magic flex-1 border-4 border-black ${activeTab === tab.id ? 'bg-indigo-600 text-white border-black' : 'bg-slate-800 text-slate-400 border-slate-955'}`}>{tab.label}</button>
                ))}
            </div>

            {activeTab === 'dataEditor' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 font-parchment">
                    {renderCreatePlant()}
                    {renderCreatePotion()}
                    {renderCreateDisease()}
                    {renderManagePropertiesAndSymptoms()}
                    {renderStudioPlantsListLocal()}
                    {renderStudioDiseasesAndPotionsLocal()}
                </div>
            )}

            {activeTab === 'introEditor' && renderIntroEditor()}

            {activeTab === 'musicEditor' && renderMusicEditor()}

            {activeTab === 'newsEditor' && renderNewsEditor()}

            {activeTab === 'marketEditor' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 font-parchment">

                    <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
                        <h2 className="text-2xl font-bold font-magic text-slate-900 border-b-2 border-slate-900/20 pb-2">🌿 Pazara Bitki Ekle</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold block mb-1 text-slate-700">Bitki Seçin</label>
                                <select className="w-full bg-amber-50 border-2 border-slate-900 p-2 rounded-lg font-bold font-parchment text-sm text-slate-900" value={selectedMarketPlantId} onChange={e => setSelectedMarketPlantId(e.target.value)}>
                                    <option value="">Seçiniz...</option>
                                    {gameData.plants.map(p => <option key={p.id} value={p.id}>{t(`plant.${p.id}.name`, p.name)}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="text-xs font-bold block mb-1 text-slate-700">Altın Maliyeti</label>
                                    <input type="number" className="w-full bg-amber-50 border-2 border-slate-900 p-2 rounded-lg font-bold text-slate-900" value={marketPlantCost} onChange={e => setMarketPlantCost(Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold block mb-1 text-slate-700">Stok Miktarı</label>
                                    <input type="number" className="w-full bg-amber-50 border-2 border-slate-900 p-2 rounded-lg font-bold text-slate-900" value={marketPlantStock} onChange={e => setMarketMarketPlantStock(Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold block mb-1 text-slate-700">Açılacağı Gün</label>
                                    <input type="number" className="w-full bg-amber-50 border-2 border-slate-900 p-2 rounded-lg font-bold text-indigo-900 text-sm" value={marketPlantDay} onChange={e => setMarketPlantDay(Number(e.target.value))} />
                                </div>
                            </div>
                            <button onClick={handleAddMarketPlant} className="w-full bg-emerald-500 font-bold py-3 rounded-xl border-4 border-black text-slate-955 font-magic shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Bitkiyi Markete Tanımla</button>
                        </div>

                        <div className="pt-4 border-t-2 border-slate-900/10">
                            <h3 className="font-bold font-magic text-slate-900 mb-2">Pazarda Satışta Olan Bitkiler:</h3>
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                {(gameData.marketPlants || []).map(mp => {
                                    const pl = gameData.plants.find(p => p.id === mp.plantId);
                                    return (
                                        <div key={mp.plantId} className="flex justify-between items-center bg-amber-50/50 border border-slate-400 p-2 rounded-lg text-sm font-parchment">
                                            <div>
                                                <span className="font-bold text-slate-900">{t(`plant.${mp.plantId}.name`, pl?.name)}</span>
                                                <span className="text-xs block text-slate-600 font-sans mt-0.5">💰 {mp.cost} Altın | Stok: {mp.stock} | 📅 {mp.availableDay ?? 1}. Gün</span>
                                            </div>
                                            <button onClick={() => handleRemoveMarketPlant(mp.plantId)} className="bg-red-800 text-white text-xs px-2.5 py-1 rounded border-2 border-black font-bold font-magic">Kaldır</button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
                        <h2 className="text-2xl font-bold font-magic text-slate-900 border-b-2 border-slate-900/20 pb-2">📜 Pazara Formül (Ürün) Ekle</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold block mb-1 text-slate-700">İksir Seçin</label>
                                <select className="w-full bg-[#dfd1b3] border-2 border-slate-900 p-2 rounded-lg font-bold font-parchment text-sm text-slate-900" value={selectedMarketPotionId} onChange={e => setSelectedMarketPotionId(e.target.value)}>
                                    <option value="">Seçiniz...</option>
                                    {gameData.potions.map(p => <option key={p.id} value={p.id}>{t(`potion.${p.id}.name`, p.name)}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="text-xs font-bold block mb-1 text-slate-700">Formül Fiyatı</label>
                                    <input type="number" className="w-full bg-[#dfd1b3] border-2 border-slate-900 p-2 rounded-lg font-bold text-slate-900" value={marketPotionCost} onChange={e => setMarketPotionCost(Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold block mb-1 text-slate-700">Stok Miktarı</label>
                                    <input type="number" className="w-full bg-[#dfd1b3] border-2 border-slate-900 p-2 rounded-lg font-bold text-slate-900" value={marketPotionStock} onChange={e => setMarketPotionStock(Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold block mb-1 text-slate-700">Açılacağı Gün</label>
                                    <input type="number" className="w-full bg-[#dfd1b3] border-2 border-slate-900 p-2 rounded-lg font-bold text-indigo-955 text-sm text-slate-900" value={marketPotionDay} onChange={e => setMarketPotionDay(Number(e.target.value))} />
                                </div>
                            </div>
                            <button onClick={handleAddMarketRecipe} className="w-full bg-purple-500 font-bold py-3 rounded-xl border-4 border-black text-white font-magic shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Formülü Markete Tanımla</button>
                        </div>

                        <div className="pt-4 border-t-2 border-slate-900/10">
                            <h3 className="font-bold font-magic text-slate-900 mb-2">Pazarda Satışta Olan İksir Formülleri:</h3>
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                {(gameData.marketRecipes || []).map(mr => {
                                    const pot = gameData.potions.find(p => p.id === mr.potionId);
                                    return (
                                        <div key={mr.potionId} className="flex justify-between items-center bg-purple-50/50 border border-slate-400 p-2 rounded-lg text-sm font-parchment">
                                            <div>
                                                <span className="font-bold text-purple-900">{t(`potion.${mr.potionId}.name`, pot?.name)} Formülü</span>
                                                <span className="text-xs block text-slate-600 font-sans mt-0.5">💰 {mr.cost} Altın | Stok: {mr.stock} | 📅 {mr.availableDay ?? 1}. Gün</span>
                                            </div>
                                            <button onClick={() => handleRemoveMarketRecipe(mr.potionId)} className="bg-red-800 text-white text-xs px-2.5 py-1 rounded border-2 border-black font-bold font-magic shadow">Kaldır</button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                </div>
            )}

            {activeTab === 'dialogueEditor' && (
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 min-h-[750px] font-parchment">

                    <div className="bg-[#f3e8d2] p-4 rounded-2xl border-4 border-slate-900 overflow-y-auto flex flex-col max-h-[750px]">

                        <div className="mb-6 bg-amber-100/60 p-4 rounded-xl border-2 border-slate-900/40 space-y-3 text-sm flex-none">
                            <h3 className="font-magic font-bold text-slate-800 text-sm border-b border-slate-900/10 pb-1.5 flex items-center gap-1">👥 Yeni Karakter Yarat</h3>
                            <div className="space-y-2">
                                <div>
                                    <label className="text-xs font-bold block text-slate-700 mb-0.5">Benzersiz ID (story_ilayda):</label>
                                    <input
                                        type="text"
                                        className="w-full bg-amber-50 border-2 border-slate-900 rounded p-1 text-sm font-semibold text-slate-900"
                                        placeholder="story_ilayda"
                                        value={newStoryline.id}
                                        onChange={e => setNewStoryline({...newStoryline, id: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold block text-slate-700 mb-0.5">Karakter Adı:</label>
                                    <input
                                        type="text"
                                        className="w-full bg-amber-50 border-2 border-slate-900 rounded p-1 text-sm font-semibold text-slate-900"
                                        placeholder="Su Ruhu İlayda"
                                        value={newStoryline.characterName}
                                        onChange={e => setNewStoryline({...newStoryline, characterName: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold block text-slate-700 mb-0.5">Hikayesi / Açıklama:</label>
                                    <textarea
                                        className="w-full bg-amber-50 border-2 border-slate-900 rounded p-1 text-sm font-semibold h-16 resize-none leading-tight font-sans text-slate-900"
                                        placeholder="Baran'ın barıştırmaya çalıştığı küs nehir ruhu..."
                                        value={newStoryline.description}
                                        onChange={e => setNewStoryline({...newStoryline, description: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold block text-slate-700 mb-0.5">Avatar / Görsel URL (Örn: /assets/image.png) veya Emoji:</label>
                                    <input
                                        type="text"
                                        className="w-full bg-amber-50 border-2 border-slate-900 rounded p-1 text-sm font-semibold text-slate-900"
                                        placeholder="assets/Baran.png veya 👤"
                                        value={newStoryline.avatarUrl}
                                        onChange={e => setNewStoryline({...newStoryline, avatarUrl: e.target.value})}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleAddStoryline}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2 font-magic font-bold text-sm shadow border-2 border-black"
                            >
                                Karakteri Kaydet
                            </button>
                        </div>

                        <h2 className="text-2xl font-bold font-magic mb-3 flex-none">👥 Karakterler ({gameData.storylines.length})</h2>
                        <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                            {gameData.storylines.map(story => (
                                <button
                                    key={story.id}
                                    onClick={() => { setActiveEditorStoryId(story.id); setEditingNodeId(null); setSelectedNodeId(null); }}
                                    className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${activeEditorStoryId === story.id ? 'bg-[#dfd1b3] border-slate-900' : 'bg-amber-50/50 border-slate-900/30'}`}
                                >
                                    <span className="font-bold text-slate-900 font-magic text-sm block">{story.characterName}</span>
                                    <span className="text-[10px] font-mono text-indigo-900 block font-bold">ID: {story.id}</span>
                                    {(story.description || gameData.translations[language]?.[`char.${story.id}.desc`]) && (
                                        <p className="text-xs text-slate-600 mt-1 italic leading-tight font-sans">
                                            {t(`char.${story.id}.desc`, story.description)}
                                        </p>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="xl:col-span-3 bg-[#e9dbbe] border-4 border-slate-900 rounded-2xl flex flex-col relative max-h-[750px]">
                        <div className="flex-1 overflow-auto p-8 relative">
                            {currentStory && currentStory.nodes.length > 0 ? renderVisualNode(currentStory, currentStory.nodes[0].id) : (
                                <div className="text-center py-16 text-slate-600 italic">
                                    Ağaç boş. Karakteriniz için yeni bir diyalog ekleyerek başlayın.
                                </div>
                            )}
                        </div>
                        <div className="bg-[#f3e8d2] border-t-4 border-slate-900 p-4">
                            {editingNodeId ? (
                                <div className="space-y-3 bg-[#dfd1b3] p-4 rounded-xl border-2 border-slate-900">
                                    <div className="flex justify-between items-center border-b border-slate-900/10 pb-1">
                                        <h3 className="font-bold font-magic text-sm">💬 Konuşma Düğümünü Düzenle (#{editingNodeId})</h3>
                                        <button onClick={() => setEditingNodeId(null)} className="text-red-800 font-sans font-bold text-xs border border-red-800 px-2 py-0.5 rounded">Vazgeç</button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-sans">
                                        <div>
                                            <label className="font-bold block mb-1 text-slate-800 font-parchment text-sm">NPC Konuşma Metni:</label>
                                            <input className="w-full border-2 border-slate-900 rounded p-1.5 font-bold text-slate-855 font-parchment text-sm bg-white text-slate-900" value={editNodeData.npcText} onChange={e => setEditNodeData({...editNodeData, npcText: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="font-bold block mb-1 text-slate-800 font-parchment text-sm font-magic text-red-900">Tetikleneceği Gün (Day):</label>
                                            <input type="number" min="1" className="w-full border-2 border-slate-900 rounded p-1.5 font-bold font-parchment text-sm bg-white text-slate-900" value={editNodeData.day} onChange={e => setEditNodeData({...editNodeData, day: Number(e.target.value) || 1})} />
                                        </div>
                                        <div>
                                            <label className="font-bold block mb-1 text-slate-800 font-parchment text-sm">Teşis Edilecek Hastalık:</label>
                                            <select className="w-full border-2 border-slate-900 rounded p-1.5 font-bold bg-white text-slate-800 font-parchment text-sm" value={editNodeData.diseaseId} onChange={e => setEditNodeData({...editNodeData, diseaseId: e.target.value})}>
                                                <option value="">Yok (Düz Konuşma)</option>
                                                {gameData.diseases.map(d => <option key={d.id} value={d.id}>{t(`disease.${d.id}.name`, d.name)}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="font-bold block mb-1 text-slate-800 font-parchment text-sm">Başarılı Tedavi Düğüm ID:</label>
                                            <input className="w-full border-2 border-slate-900 rounded p-1.5 font-mono text-slate-855 bg-white font-parchment text-sm text-slate-900" value={editNodeData.dynamicSuccessNodeId} onChange={e => setEditNodeData({...editNodeData, dynamicSuccessNodeId: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="font-bold block mb-1 text-slate-800 font-parchment text-sm">Başarısız Tedavi Düğüm ID:</label>
                                            <input className="w-full border-2 border-slate-900 rounded p-1.5 font-mono text-slate-855 bg-white font-parchment text-sm text-slate-900" value={editNodeData.dynamicFailNodeId} onChange={e => setEditNodeData({...editNodeData, dynamicFailNodeId: e.target.value})} />
                                        </div>
                                    </div>
                                    <button onClick={handleSaveNodeEdits} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-magic py-2 rounded-xl border-4 border-slate-900 mt-2 text-sm">Düğüm Değişikliklerini Kaydet</button>
                                </div>
                            ) : selectedNodeId ? (
                                <div className="space-y-3 bg-[#e9dbbe] p-4 rounded-xl border-2 border-slate-900 overflow-y-auto max-h-[300px]">
                                    <div className="flex justify-between items-center border-b border-slate-900/10 pb-2">
                                        <h3 className="font-bold font-magic text-sm">#{selectedNodeId} için Seçenek Ekle</h3>
                                        <button onClick={() => setSelectedNodeId(null)} className="font-bold text-red-800 font-sans text-xs">✕</button>
                                    </div>

                                    <div className="space-y-2 text-xs">
                                        <div>
                                            <label className="font-bold block mb-1">Seçenek Metni (Görünen Buton Metni):</label>
                                            <input className="w-full border-2 border-slate-900 rounded p-1.5 font-bold text-slate-900 bg-white" placeholder="Örn: Alkarısı Savar İksirini Al" value={newChoice.text} onChange={e => setNewChoice({...newChoice, text: e.target.value})} />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="font-bold block mb-1">Hedef Düğüm ID'si:</label>
                                                <input className="w-full border-2 border-slate-900 rounded p-1.5 font-mono text-slate-900 bg-white" placeholder="node_baran_reconciled" value={newChoice.nextNodeId} onChange={e => setNewChoice({...newChoice, nextNodeId: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="font-bold block mb-1">Gecikme Günü (delayDays):</label>
                                                <input type="number" className="w-full border-2 border-slate-900 rounded p-1.5 text-slate-900 bg-white" value={newChoice.delayDays} onChange={e => setNewChoice({...newChoice, delayDays: Number(e.target.value)})} />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 py-1 bg-amber-50 p-2 rounded border border-slate-400">
                                            <input type="checkbox" id="autoCreateCheckbox" checked={newChoice.autoCreateNode} onChange={e => setNewChoice({...newChoice, autoCreateNode: e.target.checked})} />
                                            <label htmlFor="autoCreateCheckbox" className="font-bold cursor-pointer text-slate-800 font-parchment">Yeni bir sonraki düğüm otomatik oluşturulsun</label>
                                        </div>

                                        <div className="border-t border-slate-900/15 pt-2 mt-2">
                                            <span className="font-bold text-red-900 font-magic block mb-2">🔴 Gereksinimler (Bizden Tüketilecekler)</span>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                <div className="bg-red-50/50 p-2 rounded border border-red-200">
                                                    <label className="font-bold block mb-1 text-red-955">Gereken Altın:</label>
                                                    <input type="number" className="w-full border border-slate-400 rounded p-1 text-xs font-bold text-slate-900 bg-white" value={newChoice.reqGold} onChange={e => setNewChoice({...newChoice, reqGold: Number(e.target.value)})} />
                                                </div>
                                                <div className="bg-red-50/50 p-2 rounded border border-red-200">
                                                    <label className="font-bold block mb-1 text-red-955">Gereken Bitki:</label>
                                                    <select className="w-full border border-slate-400 rounded p-1 bg-white text-xs font-bold font-parchment text-slate-900" value={newChoice.reqPlant ?? ''} onChange={e => setNewChoice({...newChoice, reqPlant: e.target.value})}>
                                                        <option value="">Yok...</option>
                                                        {gameData.plants.map(p => <option key={p.id} value={p.id}>{t(`plant.${p.id}.name`, p.name)}</option>)}
                                                    </select>
                                                    {newChoice.reqPlant && (
                                                        <div className="mt-1">
                                                            <label className="text-[10px] block font-sans">Miktar:</label>
                                                            <input type="number" className="w-full border border-slate-400 rounded p-0.5 text-[10px] font-bold text-slate-900" value={newChoice.reqPlantCount} onChange={e => setNewChoice({...newChoice, reqPlantCount: Number(e.target.value)})} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="bg-red-50/50 p-2 rounded border border-red-200">
                                                    <label className="font-bold block mb-1 text-red-955">Gereken İksir:</label>
                                                    <select className="w-full border border-slate-400 rounded p-1 bg-white text-xs font-bold font-parchment text-slate-900" value={newChoice.reqPotion ?? ''} onChange={e => setNewChoice({...newChoice, reqPotion: e.target.value})}>
                                                        <option value="">Yok...</option>
                                                        {gameData.potions.map(p => <option key={p.id} value={p.id}>{t(`potion.${p.id}.name`, p.name)}</option>)}
                                                    </select>
                                                    {newChoice.reqPotion && (
                                                        <div className="mt-1">
                                                            <label className="text-[10px] block font-sans">Miktar:</label>
                                                            <input type="number" className="w-full border border-slate-400 rounded p-0.5 text-[10px] font-bold text-slate-900" value={newChoice.reqPotionCount} onChange={e => setNewChoice({...newChoice, reqPotionCount: Number(e.target.value)})} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t border-slate-900/15 pt-2 mt-2">
                                            <span className="font-bold text-emerald-900 font-magic block mb-2">🟢 Ödüller (Bize Verilecekler)</span>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                <div className="bg-emerald-50/50 p-2 rounded border border-emerald-200">
                                                    <label className="font-bold block mb-1 text-emerald-955">Ödül Altın:</label>
                                                    <input type="number" className="w-full border border-slate-400 rounded p-1 text-xs font-bold text-slate-900 bg-white" value={newChoice.rewardGold} onChange={e => setNewChoice({...newChoice, rewardGold: Number(e.target.value)})} />
                                                </div>
                                                <div className="bg-emerald-50/50 p-2 rounded border border-emerald-200">
                                                    <label className="font-bold block mb-1 text-emerald-955">Ödül Bitki:</label>
                                                    <select className="w-full border border-slate-400 rounded p-1 bg-white text-xs font-bold font-parchment text-slate-900" value={newChoice.rewardPlantId ?? ''} onChange={e => setNewChoice({...newChoice, rewardPlantId: e.target.value})}>
                                                        <option value="">Yok...</option>
                                                        {gameData.plants.map(p => <option key={p.id} value={p.id}>{t(`plant.${p.id}.name`, p.name)}</option>)}
                                                    </select>
                                                    {newChoice.rewardPlantId && (
                                                        <div className="mt-1">
                                                            <label className="text-[10px] block font-sans">Miktar:</label>
                                                            <input type="number" className="w-full border border-slate-400 rounded p-0.5 text-[10px] font-bold text-slate-900" value={newChoice.rewardPlantCount} onChange={e => setNewChoice({...newChoice, rewardPlantCount: Number(e.target.value)})} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="bg-emerald-50/50 p-2 rounded border border-emerald-200">
                                                    <label className="font-bold block mb-1 text-emerald-955">Ödül İksir:</label>
                                                    <select className="w-full border border-slate-400 rounded p-1 bg-white text-xs font-bold font-parchment text-slate-900" value={newChoice.rewardPotionId ?? ''} onChange={e => setNewChoice({...newChoice, rewardPotionId: e.target.value})}>
                                                        <option value="">Yok...</option>
                                                        {gameData.potions.map(p => <option key={p.id} value={p.id}>{t(`potion.${p.id}.name`, p.name)}</option>)}
                                                    </select>
                                                    {newChoice.rewardPotionId && (
                                                        <div className="mt-1">
                                                            <label className="text-[10px] block font-sans">Miktar:</label>
                                                            <input type="number" className="w-full border border-slate-400 rounded p-0.5 text-[10px] font-bold text-slate-900" value={newChoice.rewardPotionCount} onChange={e => setNewChoice({...newChoice, rewardPotionCount: Number(e.target.value)})} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                    </div>

                                    <button onClick={() => handleAddChoiceToNodeAdv(selectedNodeId!)} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-955 font-bold font-magic py-2 rounded-xl border-4 border-slate-900 mt-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Seçeneği Düğüme Ekle</button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-4 gap-4">
                                    <input className="border-2 p-2 rounded text-slate-900 bg-white font-semibold" placeholder="Düğüm ID" value={newNode.id} onChange={e => setNewNode({...newNode, id: e.target.value})} />
                                    <input className="border-2 p-2 rounded text-slate-900 bg-white font-semibold" placeholder="Konuşma Metni" value={newNode.npcText} onChange={e => setNewNode({...newNode, npcText: e.target.value})} />
                                    <div className="flex items-center gap-1.5 bg-amber-50 p-2 border-2 border-slate-900 rounded text-slate-900 font-semibold font-parchment">
                                        <span className="text-xs whitespace-nowrap">📅 Gün:</span>
                                        <input type="number" min="1" className="w-16 bg-white border border-slate-400 rounded px-1 text-center" value={newNode.day} onChange={e => setNewNode({...newNode, day: Number(e.target.value) || 1})} />
                                    </div>
                                    <button onClick={handleAddNodeToStory} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-magic font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm">Diyalog Düğümü Ekle</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'translationEditor' && (
                <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-parchment">
                    <h2 className="text-2xl font-bold font-magic text-slate-900 border-b-2 border-slate-900/20 pb-2">🌍 Dil & Lokalizasyon</h2>
                    <div className="border-4 border-slate-900 rounded-2xl bg-amber-50 mt-4 max-h-[400px] overflow-y-auto font-sans">
                        <table className="w-full text-left text-sm font-bold">
                            <thead className="bg-[#2a131b] text-amber-100 border-b-4 border-slate-900 font-magic">
                            <tr><th className="p-3">Sözlük Anahtarı</th><th className="p-3">TR (Türkçe)</th><th className="p-3">EN (İngilizce)</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-900/10 text-slate-900">
                            {getAllLocalesKeys().map(key => (
                                <tr key={key}>
                                    <td className="p-2 font-mono text-xs text-indigo-955">{key}</td>
                                    <td className="p-2"><input type="text" className="w-full bg-amber-50 border p-1 rounded font-semibold text-slate-900" value={gameData.translations.tr[key] || ''} onChange={e => handleTranslateChange('tr', key, e.target.value)} /></td>
                                    <td className="p-2"><input type="text" className="w-full bg-amber-50 border p-1 rounded font-semibold text-slate-900" value={gameData.translations.en[key] || ''} onChange={e => handleTranslateChange('en', key, e.target.value)} /></td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'jsonHub' && (
                <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
                    <h2 className="text-2xl font-bold font-magic text-slate-900 border-b-2 border-slate-900/20 pb-2">📂 JSON Motoru</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <textarea readOnly className="h-80 bg-slate-900 text-green-400 p-3 rounded-xl font-mono text-xs font-sans border-2 border-slate-955" value={JSON.stringify(gameData, null, 2)}/>
                        <div className="space-y-3">
                            <textarea className="w-full h-56 bg-slate-100 p-3 rounded-xl border-2 font-mono text-xs font-sans text-slate-900" placeholder='{"plants": [], ...}' value={importText} onChange={e => setImportText(e.target.value)}/>
                            <button onClick={handleImportJSON} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl border-4 border-black font-magic shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">JSON Yükle</button>
                            {importStatus && <div className="p-2 bg-amber-50 border-2 border-slate-900 font-parchment font-bold text-sm text-center rounded text-slate-900">{importStatus}</div>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

interface PortalScreenProps {
    setAppMode: React.Dispatch<React.SetStateAction<string>>;
    setActiveTab: React.Dispatch<React.SetStateAction<string>>;
    setIntroPageIndex: React.Dispatch<React.SetStateAction<number>>;
    gameData: GameData | null;
    language: string;
    hasSave: boolean;
    savedMeta: { day: number; gold: number } | null;
    handleContinueGame: () => void;
    handleNewGame: () => void;
}

function PortalScreen({
                          setAppMode, setActiveTab, setIntroPageIndex, gameData, language,
                          hasSave, savedMeta, handleContinueGame, handleNewGame
                      }: PortalScreenProps): React.JSX.Element {
    const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);

    const handleNewGameClick = () => {
        if (hasSave) {
            // Kayıt varsa önce parchment stilinde onay modalı gösteriyoruz
            setShowConfirmReset(true);
        } else {
            handleNewGame();
        }
    };

    return (
        <div className="min-h-screen bg-[#1c0f13] text-[#f3e8d2] flex items-center justify-center p-4 md:p-8">
            <div className="max-xl w-full bg-[#2a131b] border-8 border-slate-900 p-8 rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] text-center space-y-6 relative overflow-hidden font-parchment">
                <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-amber-500 to-red-800"></div>
                <span className="text-8xl block animate-idle-float transform hover:scale-110">⚗️</span>
                <div className="space-y-2">
                    <h1 className="text-4xl md:text-5xl font-bold font-magic text-amber-400">Simyacı & Şifacı</h1>
                    <p className="font-parchment text-lg text-amber-100/70">{language === 'en' ? 'Büyü Mirası World Portal' : 'Büyü Mirası ve Döngüsü Portal'}</p>
                </div>

                <div className="grid grid-cols-1 gap-4 pt-4 font-parchment max-w-md mx-auto">
                    {/* Kayıt Varsa Devam Et Butonunu Göster */}
                    {hasSave && savedMeta && (
                        <button
                            onClick={handleContinueGame}
                            className="group p-5 rounded-2xl border-4 border-black bg-emerald-500 hover:bg-emerald-400 text-slate-955 font-bold text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 active:translate-y-1 active:shadow-none text-left flex items-center justify-between"
                        >
                            <div className="flex flex-col">
                                <span className="font-magic block text-lg">✨ Devam Et</span>
                                <span className="text-xs font-sans font-bold text-slate-900 block mt-0.5">
                                    {language === 'en'
                                        ? `Saved: Day ${savedMeta.day} | ${savedMeta.gold} Gold`
                                        : `Kayıtlı: ${savedMeta.day}. Gün | ${savedMeta.gold} Altın`}
                                </span>
                            </div>
                            <span className="text-2xl group-hover:translate-x-1">➡️</span>
                        </button>
                    )}

                    {/* Oyuna Başla / Yeni Oyun Butonu */}
                    <button
                        onClick={handleNewGameClick}
                        className={`group p-5 rounded-2xl border-4 border-black font-bold text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 active:translate-y-1 active:shadow-none text-left flex items-center justify-between ${
                            hasSave ? 'bg-amber-600 hover:bg-amber-500 text-[#f3e8d2]' : 'bg-amber-500 hover:bg-amber-400 text-slate-955'
                        }`}
                    >
                        <div className="flex flex-col">
                            <span className="font-magic block text-lg">
                                {hasSave
                                    ? (language === 'en' ? '🆕 Start New Game' : '🆕 Yeni Hikaye Başlat')
                                    : (language === 'en' ? '🏪 Start Journey' : '🏪 Oyuna Başla')
                                }
                            </span>
                            {hasSave && (
                                <span className="text-[10px] font-sans font-bold opacity-80 block mt-0.5">
                                    {language === 'en' ? 'Wipes existing save progress' : 'Mevcut ilerlemenizi sıfırlar'}
                                </span>
                            )}
                        </div>
                        <span className="text-2xl group-hover:translate-x-1">➡️</span>
                    </button>

                    {/* Geliştirici Stüdyosu Butonu (Sadece Geliştirme Modunda Görünür) */}
                    {import.meta.env.DEV && (
                        <button
                            onClick={() => { setAppMode('studio'); }}
                            className="group p-5 rounded-2xl border-4 border-black bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 active:translate-y-1 active:shadow-none text-left flex items-center justify-between"
                        >
                            <div>
                                <span className="font-magic block text-lg">🧙‍♂️ Geliştirici Stüdyosu</span>
                            </div>
                            <span className="text-2xl group-hover:translate-x-1">➡️</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Custom Parchment Onay Modalı (Yeni Oyun Onayı) */}
            {showConfirmReset && savedMeta && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center font-parchment text-slate-900">
                    <div className="bg-[#f3e8d2] text-slate-955 border-8 border-red-800 rounded-3xl p-8 max-w-md shadow-2xl text-center space-y-6 mx-4 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-800 to-amber-700"></div>
                        <h3 className="text-3xl font-bold font-magic text-red-900">⚠️ {language === 'en' ? 'Wipe Progress?' : 'Kaydı Sıfırla?'}</h3>

                        <div className="bg-amber-50 p-4 rounded-xl border-2 border-slate-900/30 text-base leading-relaxed font-semibold">
                            {language === 'en' ? (
                                <>
                                    Are you sure you want to start a <strong>New Story</strong>?<br />
                                    Your current progress <strong>(Day {savedMeta.day} with {savedMeta.gold} Gold)</strong> will be permanently deleted. This action cannot be undone!
                                </>
                            ) : (
                                <>
                                    Yeni bir <strong>Şifacı Mirası</strong> başlatmak istediğinize emin misiniz?<br />
                                    Mevcut kaydınızda bulunan tüm ilerlemeler <strong>({savedMeta.day}. Gün, {savedMeta.gold} Altın)</strong> kalıcı olarak silinecektir!
                                </>
                            )}
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowConfirmReset(false)}
                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-magic font-bold py-3 rounded-xl border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-sm"
                            >
                                {language === 'en' ? 'Cancel' : 'Vazgeç'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowConfirmReset(false);
                                    handleNewGame();
                                }}
                                className="flex-1 bg-red-800 hover:bg-red-700 text-white font-magic font-bold py-3 rounded-xl border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-sm animate-pulse"
                            >
                                {language === 'en' ? 'Yes, Reset!' : 'Evet, Sıfırla!'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// BÖLÜM 3: ANA APP BİLEŞENİ (STATE VE HANDLER MERKEZİ)
// ============================================================================

export default function App(): React.JSX.Element {
    const [appMode, setAppMode] = useState<string>('portal');
    const [activeTab, setActiveTab] = useState<string>('shopArea');
    const [gameData, setGameData] = useState<GameData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [language, setLanguage] = useState<string>('tr');

    // Temel Oyun State'leri
    const [playerState, setPlayerState] = useState<PlayerState>({ gold: 200, rentDebt: 0, inventory: { plants: { 'p_demir_ardic': 4, 'p_gumus_kok': 1, 'p_isildak_otu': 2, 'p_kara_kabuk': 3 }, potions: { 'pot_alkarisi_savar': 1 } }, knownPotions: ['pot_alkarisi_savar'] });
    const [cauldron, setCauldron] = useState<CauldronItem[]>([]);
    const [brewState, setBrewState] = useState<BrewState>({ status: 'idle', message: '' });
    const [treatmentBench, setTreatmentBench] = useState<TreatmentBenchItem[]>([]);
    const [treatmentStatus, setTreatmentStatus] = useState<TreatmentStatus>({ type: '', message: '' });
    const [gameState, setGameState] = useState<GameState>({ day: 1, currentCustomer: null, rentPaidThisWeek: false, storyProgress: { 'story_baran': { currentNodeId: 'node_baran_1', availableDay: 1 }, 'story_landlord': { currentNodeId: 'node_landlord_demand', availableDay: 7 } }, logs: ['🧙‍♂️ Kulübeye hoş geldin şifacı!'] });
    const [rentPopup, setRentPopup] = useState<RentPopup>({ show: false, message: '' });
    const [newsPopup, setNewsPopup] = useState<{ show: boolean; items: NewsItem[] }>({ show: false, items: [] });

    const [introPageIndex, setIntroPageIndex] = useState<number>(0);

    // Yerel Kayıt Durumu State'leri
    const [hasSave, setHasSave] = useState<boolean>(false);
    const [savedMeta, setSavedMeta] = useState<{ day: number; gold: number } | null>(null);

    // Müzik ve Soundtrack State/Ref Tanımlamaları
    const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
    const [isMuted, setIsMuted] = useState<boolean>(true); // Tarayıcı engellemelerini aşmak için varsayılan olarak mute başlar
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const fadeIntervalRef = useRef<any>(null);

    // 1. AŞAMA: Tarayıcıda Kayıtlı Bir Oyun Olup Olmadığını Kontrol Etme (On Mount)
    useEffect(() => {
        const rawSave = localStorage.getItem('buyu_mirasi_save');
        if (rawSave) {
            try {
                const parsed = JSON.parse(rawSave);
                if (parsed.playerState && parsed.gameState) {
                    setHasSave(true);
                    setSavedMeta({
                        day: parsed.gameState.day,
                        gold: parsed.playerState.gold
                    });
                    if (parsed.language) {
                        setLanguage(parsed.language);
                    }
                    if (parsed.isMuted !== undefined) {
                        setIsMuted(parsed.isMuted);
                    }
                }
            } catch (e) {
                console.warn("Kayıtlı veri okunamadı veya bozuk.", e);
            }
        }
    }, []);

    // 2. AŞAMA: Veritabanını (JSON) Yükleme
    useEffect(() => {
        fetch('assets/gameData.json')
            .then(response => {
                if (!response.ok) throw new Error("Ağ hatası veya dosya bulunamadı");

                const contentType = response.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    throw new TypeError("Beklenen JSON verisi alınamadı! Dosya eksik olabilir.");
                }

                return response.json();
            })
            .then(data => {
                setGameData({
                    ...INITIAL_DATA,
                    ...data,
                    introPages: data.introPages || INITIAL_DATA.introPages || [],
                    soundtracks: data.soundtracks || INITIAL_DATA.soundtracks || [],
                    news: data.news || INITIAL_DATA.news || []
                });
                setIsLoading(false);
            })
            .catch(error => {
                console.warn("Yerel assets/gameData.json okunamadı, varsayılan (INITIAL_DATA) yükleniyor.", error);
                setGameData(INITIAL_DATA);
                setIsLoading(false);
            });
    }, []);

    // 3. AŞAMA: Gerçek Zamanlı Otomatik Kayıt (Autosave Effect)
    useEffect(() => {
        // Oyun yükleme aşamasında değilse ve ana portalda veya giriş sayfalarında değilsek kaydı güncelle
        if (!isLoading && gameData && appMode !== 'portal' && appMode !== 'intro') {
            const saveData = {
                playerState,
                gameState,
                gameData, // Geliştirici Stüdyosu'nda yapılan değişiklikleri korumak için
                language,
                isMuted,
                savedAt: Date.now()
            };
            localStorage.setItem('buyu_mirasi_save', JSON.stringify(saveData));

            // Portaldaki kayıt bilgilerini anlık güncelle
            setHasSave(true);
            setSavedMeta({
                day: gameState.day,
                gold: playerState.gold
            });
        }
    }, [playerState, gameState, gameData, language, isMuted, appMode, isLoading]);

    // KAYIT SİSTEMİ ÇALIŞTIRICILARI (SAVE HANDLERS)
    const handleContinueGame = () => {
        const rawSave = localStorage.getItem('buyu_mirasi_save');
        if (rawSave) {
            try {
                const parsed = JSON.parse(rawSave);
                setPlayerState(parsed.playerState);
                setGameState(parsed.gameState);
                if (parsed.gameData) {
                    setGameData(parsed.gameData);
                }
                if (parsed.language) {
                    setLanguage(parsed.language);
                }
                if (parsed.isMuted !== undefined) {
                    setIsMuted(parsed.isMuted);
                }
                setAppMode('client');
                setActiveTab('shopArea');
                addLog(language === 'en' ? '🎮 Game Loaded! Welcome back.' : '🎮 Oyun Yüklendi! Kaldığın yerden devam ediyorsun.');
            } catch (e) {
                console.error("Kayıt yüklenirken bir hata oluştu:", e);
            }
        }
    };

    const handleNewGame = () => {
        // 1. Oyuncu verilerini sıfırla
        setPlayerState({
            gold: 200,
            rentDebt: 0,
            inventory: {
                plants: { 'p_demir_ardic': 4, 'p_gumus_kok': 1, 'p_isildak_otu': 2, 'p_kara_kabuk': 3 },
                potions: { 'pot_alkarisi_savar': 1 }
            },
            knownPotions: ['pot_alkarisi_savar']
        });

        // 2. Günlük ve müşteri ilerlemelerini sıfırla
        setGameState({
            day: 1,
            currentCustomer: null,
            rentPaidThisWeek: false,
            storyProgress: {
                'story_baran': { currentNodeId: 'node_baran_1', availableDay: 1 },
                'story_landlord': { currentNodeId: 'node_landlord_demand', availableDay: 7 }
            },
            logs: ['🧙‍♂️ Yeni bir miras başladı. Kulübeye hoş geldin şifacı!']
        });

        // 3. Tarayıcıdaki eski kaydı temizle
        localStorage.removeItem('buyu_mirasi_save');
        setHasSave(false);
        setSavedMeta(null);

        // 4. Veritabanını tazelemek için fetch işlemini tekrar tetikle (Fresh gameData)
        setIsLoading(true);
        fetch('assets/gameData.json')
            .then(res => {
                if (!res.ok) throw new Error();
                return res.json();
            })
            .then(data => {
                setGameData({
                    ...INITIAL_DATA,
                    ...data,
                    introPages: data.introPages || INITIAL_DATA.introPages || [],
                    soundtracks: data.soundtracks || INITIAL_DATA.soundtracks || [],
                    news: data.news || INITIAL_DATA.news || []
                });
                setIsLoading(false);
                setIntroPageIndex(0);
                setAppMode('intro'); // Giriş hikayesi sayfalarını aç
            })
            .catch(() => {
                setGameData(INITIAL_DATA);
                setIsLoading(false);
                setIntroPageIndex(0);
                setAppMode('intro');
            });
    };

    // Soundtrack Çalma Ve Yavaşça Geçiş Yapma (Fade In / Fade Out) Mekanizması
    const changeTrack = (targetIndex: number) => {
        const audio = audioRef.current;
        if (!audio) return;

        const soundtracks = gameData?.soundtracks || [];
        if (soundtracks.length === 0) return;

        const nextTrack = soundtracks[targetIndex];
        if (!nextTrack) return;

        // Mevcut devam eden fade işlemlerini sıfırla
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

        const MAX_VOLUME = 0.45;
        let vol = audio.volume;
        let step = 0;
        const steps = 20;
        const intervalTime = 40; // Toplamda 800ms fadeout süresi

        // FADE OUT (Mevcut müziği yavaşça kıs)
        fadeIntervalRef.current = setInterval(() => {
            step++;
            audio.volume = Math.max(0, vol * (1 - step / steps));
            if (step >= steps) {
                clearInterval(fadeIntervalRef.current);
                audio.volume = 0;
                audio.pause();

                // Yeni müziği yükle ve başlat
                audio.src = nextTrack.path;
                audio.load();
                setCurrentTrackIndex(targetIndex);

                if (!isMuted) {
                    audio.play().then(() => {
                        let stepIn = 0;
                        // FADE IN (Yeni müziği yavaşça aç)
                        fadeIntervalRef.current = setInterval(() => {
                            stepIn++;
                            audio.volume = Math.min(MAX_VOLUME, (stepIn / steps) * MAX_VOLUME);
                            if (stepIn >= steps) {
                                clearInterval(fadeIntervalRef.current);
                                audio.volume = MAX_VOLUME;
                            }
                        }, intervalTime);
                    }).catch(err => {
                        console.warn("Müzik çalma tarayıcı tarafından engellendi:", err);
                    });
                }
            }
        }, intervalTime);
    };

    // Müzik Nesnesinin İlk Kurulumu ve Şarkı Sonu Event Dinleyicisi
    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
        }
        const audio = audioRef.current;

        const handleTrackEnded = () => {
            const soundtracks = gameData?.soundtracks || [];
            if (soundtracks.length === 0) return;
            // Sıradaki şarkıya geç, bittiyse başa dön
            const nextIdx = (currentTrackIndex + 1) % soundtracks.length;
            changeTrack(nextIdx);
        };

        audio.addEventListener('ended', handleTrackEnded);
        return () => {
            audio.removeEventListener('ended', handleTrackEnded);
        };
    }, [currentTrackIndex, gameData?.soundtracks, isMuted]);

    // Mute/Unmute Değişikliklerinde Sesi Yumuşak Bir Şekilde Ayarlama (Fade In / Fade Out)
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const soundtracks = gameData?.soundtracks || [];
        if (soundtracks.length === 0) return;

        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

        const MAX_VOLUME = 0.45;
        const steps = 20;
        const intervalTime = 40;

        if (isMuted) {
            // Sessize alırken sesi yavaşça kıs (Fade Out)
            let vol = audio.volume;
            let step = 0;
            fadeIntervalRef.current = setInterval(() => {
                step++;
                audio.volume = Math.max(0, vol * (1 - step / steps));
                if (step >= steps) {
                    clearInterval(fadeIntervalRef.current);
                    audio.volume = 0;
                    audio.pause();
                }
            }, intervalTime);
        } else {
            // Sesi açarken müziği başlat ve sesi yavaşça aç (Fade In)
            const activeTrack = soundtracks[currentTrackIndex];
            if (!activeTrack) return;

            // Eğer audio kaynağı atanmamış veya farklı ise setle
            if (!audio.src || (!audio.src.endsWith(activeTrack.path) && !audio.src.includes(activeTrack.path))) {
                audio.src = activeTrack.path;
                audio.load();
            }

            audio.play().then(() => {
                let stepIn = 0;
                fadeIntervalRef.current = setInterval(() => {
                    stepIn++;
                    audio.volume = Math.min(MAX_VOLUME, (stepIn / steps) * MAX_VOLUME);
                    if (stepIn >= steps) {
                        clearInterval(fadeIntervalRef.current);
                        audio.volume = MAX_VOLUME;
                    }
                }, intervalTime);
            }).catch(err => {
                console.warn("Müzik oynatma başlatılamadı:", err);
            });
        }

        return () => {
            if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        };
    }, [isMuted]);

    const t = (key: string, fallback: string = ""): string => gameData?.translations[language]?.[key] || gameData?.translations['tr']?.[key] || fallback || key;
    const addLog = (msg: string): void => setGameState(prev => ({ ...prev, logs: [msg, ...prev.logs].slice(0, 5) }));

    const handleEndDay = (): void => {
        let rentOverdue = false;
        let nextRentDebt = playerState.rentDebt;
        if (gameState.day % 7 === 0 && !gameState.rentPaidThisWeek) { nextRentDebt += 100; rentOverdue = true; }
        if (rentOverdue) setPlayerState(prev => ({ ...prev, rentDebt: nextRentDebt }));

        const nextDay = gameState.day + 1;
        const dailyNews = (gameData?.news || []).filter(n => n.day === nextDay);
        if (dailyNews.length > 0) {
            setNewsPopup({ show: true, items: dailyNews });
        }

        setGameData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                marketPlants: (prev.marketPlants || []).map(mp => ({ ...mp, stock: mp.maxStock })),
                marketRecipes: (prev.marketRecipes || []).map(mr => ({ ...mr, stock: mr.maxStock }))
            };
        });
        setGameState(prev => {
            const nextLogs = [language === 'en' ? `🌙 Day ${prev.day + 1} started.` : `🌙 ${prev.day + 1}. güne uyandın.`];
            if (rentOverdue) nextLogs.push(language === 'en' ? `⚠️ Rent Overdue! +100 Gold fee.` : `⚠️ Kira Ödenmedi! 100 Altın ceza.`);
            return { ...prev, day: prev.day + 1, currentCustomer: null, rentPaidThisWeek: false, logs: [...nextLogs, ...prev.logs].slice(0, 5) };
        });
        setTreatmentBench([]); setTreatmentStatus({ type: '', message: '' });
    };

    const handleCallCustomer = (): void => {
        if (!gameData) return;

        const availableStories = Object.entries(gameState.storyProgress)
            .filter(([sId, prog]) => {
                if (prog.currentNodeId === 'END') return false;
                if (prog.availableDay > gameState.day) return false;

                const storyDef = gameData.storylines.find(s => s.id === sId);
                const nodeDef = storyDef?.nodes.find(n => n.id === prog.currentNodeId);
                const nodeDayReq = nodeDef?.day ?? 1;

                return gameState.day >= nodeDayReq;
            })
            .map(([sId, prog]) => ({ storyId: sId, nodeId: prog.currentNodeId }));

        if (availableStories.length === 0) {
            addLog(language === 'en' ? 'Nobody is visiting today.' : 'Şu an gelecek kimse yok. (Yarın yeni hikayeler açılabilir!)');
            return;
        }
        const selected = availableStories[Math.floor(Math.random() * availableStories.length)];
        setGameState(prev => ({ ...prev, currentCustomer: selected }));
        setTreatmentBench([]); setTreatmentStatus({ type: '', message: '' });
    };

    const handleCustomerChoice = (choice: Choice, idx: number, activeNode: StoryNode, storyId: string): void => {
        const cur = { ...playerState };

        const reqGoldCount = choice.reqGold || 0;
        const reqPotionCount = choice.reqPotionCount || 1;
        const reqPlantCount = choice.reqPlantCount || 1;

        if (cur.gold < reqGoldCount) {
            addLog(`❌ Yetersiz altın!`);
            return;
        }
        if (choice.reqPotion && (cur.inventory.potions[choice.reqPotion] || 0) < reqPotionCount) {
            addLog(`❌ ${t(`potion.${choice.reqPotion}.name`)} yetersiz!`);
            return;
        }
        if (choice.reqPlant && (cur.inventory.plants[choice.reqPlant] || 0) < reqPlantCount) {
            addLog(`❌ ${t(`plant.${choice.reqPlant}.name`)} yetersiz!`);
            return;
        }

        if (choice.reqGold) {
            cur.gold -= choice.reqGold;
        }
        if (choice.reqPotion) {
            cur.inventory.potions = {
                ...cur.inventory.potions,
                [choice.reqPotion]: cur.inventory.potions[choice.reqPotion] - reqPotionCount
            };
        }
        if (choice.reqPlant) {
            cur.inventory.plants = {
                ...cur.inventory.plants,
                [choice.reqPlant]: cur.inventory.plants[choice.reqPlant] - reqPlantCount
            };
        }

        if (choice.rewardGold) {
            cur.gold += choice.rewardGold;
        }
        if (choice.rewardPlantId) {
            const rewardCount = choice.rewardPlantCount || 1;
            cur.inventory.plants = {
                ...cur.inventory.plants,
                [choice.rewardPlantId]: (cur.inventory.plants[choice.rewardPlantId] || 0) + rewardCount
            };
        }
        if (choice.rewardPotionId) {
            const rewardCount = choice.rewardPotionCount || 1;
            cur.inventory.potions = {
                ...cur.inventory.potions,
                [choice.rewardPotionId]: (cur.inventory.potions[choice.rewardPotionId] || 0) + rewardCount
            };
        }

        setPlayerState(cur);

        const updProgress = { ...gameState.storyProgress };
        if (choice.nextNodeId && gameData) {
            const story = gameData.storylines.find(s => s.id === storyId);
            const nextNode = story?.nodes.find(n => n.id === choice.nextNodeId);
            const nextNodeDay = nextNode?.day ?? 1;

            const isDelayedByChoice = (choice.delayDays || 0) > 0;
            const isDelayedByNodeDay = nextNodeDay > gameState.day;

            const calculatedAvailableDay = Math.max(
                gameState.day + (choice.delayDays || 0),
                nextNodeDay
            );

            updProgress[storyId] = {
                currentNodeId: choice.nextNodeId,
                availableDay: calculatedAvailableDay
            };

            const shouldDismissCustomer = isDelayedByChoice || isDelayedByNodeDay;

            setGameState(prev => ({
                ...prev,
                storyProgress: updProgress,
                currentCustomer: shouldDismissCustomer ? null : { storyId, nodeId: choice.nextNodeId as string }
            }));

            if (shouldDismissCustomer) {
                addLog(language === 'en' ? `👥 Customer will return on Day ${calculatedAvailableDay}.` : `👥 Karakter dükkandan ayrıldı, ${calculatedAvailableDay}. gün tekrar gelecek.`);
            }
        } else {
            updProgress[storyId] = { currentNodeId: 'END', availableDay: 999 };
            setGameState(prev => ({ ...prev, storyProgress: updProgress, currentCustomer: null }));
        }
    };

    const handleAddToTreatmentBench = (type: 'plant' | 'potion', id: string, name: string): void => setTreatmentBench(prev => [...prev, { type, id, name }]);
    const handleRemoveFromTreatmentBench = (index: number): void => setTreatmentBench(prev => prev.filter((_, i) => i !== index));

    const handleApplyTreatment = (activeNode: StoryNode, activeStory: Storyline): void => {
        if (!gameData) return;
        const disease = gameData.diseases.find(d => d.id === activeNode.diseaseId);
        if (!disease) return;
        let success = false;
        let explanation = '';

        if (treatmentBench.length === 1 && treatmentBench[0].type === 'potion') {
            const pot = gameData.potions.find(p => p.id === treatmentBench[0].id);
            if (pot?.curesDiseaseIds.includes(disease.id)) { success = true; explanation = `🧪 ${pot.name} şifa verdi!`; }
        } else if (treatmentBench.filter(i => i.type === 'plant').length > 0) {
            const props: string[] = [];
            const resolved: string[] = [];
            treatmentBench.filter(i => i.type === 'plant').forEach(i => gameData.plants.find(p => p.id === i.id)?.properties.forEach(pr => props.push(pr)));
            props.forEach(pr => gameData.plantProperties.find(p => p.name === pr)?.curesSymptoms.forEach(s => resolved.push(s)));
            if (disease.symptoms.every(s => resolved.includes(s))) { success = true; explanation = `🌿 Karışım başarılı!`; }
        }

        setPlayerState(prev => {
            const inv = { ...prev.inventory };
            treatmentBench.forEach(i => {
                if (i.type === 'plant') {
                    inv.plants = { ...inv.plants, [i.id]: inv.plants[i.id] - 1 };
                } else {
                    inv.potions = { ...inv.potions, [i.id]: inv.potions[i.id] - 1 };
                }
            });
            return { ...prev, gold: prev.gold + (success ? 60 : 0), inventory: inv };
        });

        const targetNodeId = success ? activeNode.dynamicSuccessNodeId : activeNode.dynamicFailNodeId;
        if (targetNodeId) {
            const nextNode = activeStory.nodes.find(n => n.id === targetNodeId);
            const nextNodeDay = nextNode?.day ?? 1;
            const isDelayedByNodeDay = nextNodeDay > gameState.day;

            const calculatedAvailableDay = Math.max(gameState.day, nextNodeDay);

            const updProgress = {
                ...gameState.storyProgress,
                [activeStory.id]: { currentNodeId: targetNodeId, availableDay: calculatedAvailableDay }
            };

            setGameState(prev => ({
                ...prev,
                storyProgress: updProgress,
                currentCustomer: isDelayedByNodeDay ? null : { storyId: activeStory.id, nodeId: targetNodeId }
            }));

            if (isDelayedByNodeDay) {
                addLog(language === 'en' ? `👥 Customer will return on Day ${calculatedAvailableDay} for followup.` : `👥 Karakter dükkandan ayrıldı, devamı için ${calculatedAvailableDay}. gün tekrar gelecek.`);
            }
        } else {
            const updProgress = {
                ...gameState.storyProgress,
                [activeStory.id]: { currentNodeId: 'END', availableDay: 999 }
            };
            setGameState(prev => ({
                ...prev,
                storyProgress: updProgress,
                currentCustomer: null
            }));
        }

        setTreatmentStatus({ type: success ? 'success' : 'fail', message: explanation + (success ? ' (+60💰)' : '') });
        setTreatmentBench([]);
    };

    const handleAddToCauldron = (type: 'plant' | 'potion', id: string): void => {
        setPlayerState(prev => {
            const targetInv = type === 'plant' ? 'plants' : 'potions';
            return {
                ...prev,
                inventory: {
                    ...prev.inventory,
                    [targetInv]: {
                        ...prev.inventory[targetInv],
                        [id]: (prev.inventory[targetInv][id] || 0) - 1
                    }
                }
            };
        });
        setCauldron(prev => [...prev, { type, id }]);
    };

    const handleRemoveFromCauldron = (idx: number, type: 'plant' | 'potion', id: string): void => {
        setCauldron(prev => prev.filter((_, i) => i !== idx));
        setPlayerState(prev => {
            const targetInv = type === 'plant' ? 'plants' : 'potions';
            return {
                ...prev,
                inventory: {
                    ...prev.inventory,
                    [targetInv]: {
                        ...prev.inventory[targetInv],
                        [id]: (prev.inventory[targetInv][id] || 0) + 1
                    }
                }
            };
        });
    };

    const handleBrew = (): void => {
        if (!gameData) return;
        setBrewState({ status: 'brewing', message: t('ui.boiling') });
        setTimeout(() => {
            const counts: Record<string, number> = {};
            cauldron.forEach(i => counts[`${i.type}_${i.id}`] = (counts[`${i.type}_${i.id}`] || 0) + 1);
            const pot = gameData.potions.find(p => p.ingredients.length === Object.keys(counts).length && p.ingredients.every(ing => counts[`${ing.type}_${ing.id}`] === ing.count));
            if (pot) {
                setPlayerState(p => ({ ...p, inventory: { ...p.inventory, potions: { ...p.inventory.potions, [pot.id]: (p.inventory.potions[pot.id] || 0) + 1 } } }));
                setBrewState({ status: 'success', message: `Mükemmel! ${pot.name} hazır.` });
            } else {
                setBrewState({ status: 'fail', message: 'Hata! Karışım ziyan oldu.' });
            }
            setCauldron([]);
        }, 1500);
    };

    const handleBuyPlant = (pId: string, cost: number, count: number): void => {
        const total = cost * count;
        if (playerState.gold < total) {
            addLog('❌ Yetersiz altın!');
            return;
        }
        setPlayerState(p => ({ ...p, gold: p.gold - total, inventory: { ...p.inventory, plants: { ...p.inventory.plants, [pId]: (p.inventory.plants[pId] || 0) + count } } }));
        setGameData(d => {
            if (!d) return d;
            return {
                ...d,
                marketPlants: d.marketPlants.map(mp => mp.plantId === pId ? { ...mp, stock: mp.stock - count } : mp)
            };
        });
    };

    const handleBuyRecipe = (potionId: string, cost: number): void => {
        if (playerState.gold < cost) {
            addLog('❌ Yetersiz altın!');
            return;
        }
        if (playerState.knownPotions.includes(potionId)) {
            addLog('❌ Bu formülü zaten biliyorsun!');
            return;
        }
        setPlayerState(p => ({
            ...p,
            gold: p.gold - cost,
            knownPotions: [...p.knownPotions, potionId]
        }));
        setGameData(d => {
            if (!d) return d;
            return {
                ...d,
                marketRecipes: (d.marketRecipes || []).map(mr => mr.potionId === potionId ? { ...mr, stock: mr.stock - 1 } : mr)
            };
        });
        const potName = t(`potion.${potionId}.name`);
        addLog(language === 'en' ? `🛒 Bought ${potName} recipe.` : `🛒 Pazardan ${potName} formülünü satın alıp öğrendin!`);
    };

    const handlers: GameHandlers = { handleEndDay, handleCallCustomer, handleCustomerChoice, handleAddToTreatmentBench, handleRemoveFromTreatmentBench, handleApplyTreatment, handleAddToCauldron, handleRemoveFromCauldron, handleBrew, handleBuyPlant, handleBuyRecipe };

    if (isLoading || !gameData) {
        return (
            <div className="min-h-screen bg-[#1c0f13] flex items-center justify-center">
                <span className="text-amber-500 font-magic text-2xl animate-pulse">⚗️ Kadim Parşömenler Okunuyor... (Veri Yükleniyor)</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#1c0f13] text-[#f3e8d2]">
            {appMode === 'portal' && (
                <PortalScreen
                    setAppMode={setAppMode}
                    setActiveTab={setActiveTab}
                    setIntroPageIndex={setIntroPageIndex}
                    gameData={gameData}
                    language={language}
                    hasSave={hasSave}
                    savedMeta={savedMeta}
                    handleContinueGame={handleContinueGame}
                    handleNewGame={handleNewGame}
                />
            )}
            {appMode === 'intro' && <IntroScreen gameData={gameData} pageIndex={introPageIndex} setPageIndex={setIntroPageIndex} setAppMode={setAppMode} language={language} t={t} />}
            {appMode === 'client' && (
                <div className="p-4 md:p-8 max-w-6xl mx-auto">
                    <GameClient
                        gameData={gameData}
                        gameState={gameState}
                        playerState={playerState}
                        cauldron={cauldron}
                        brewState={brewState}
                        treatmentBench={treatmentBench}
                        treatmentStatus={treatmentStatus}
                        language={language}
                        setLanguage={setLanguage}
                        setAppMode={setAppMode}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        t={t}
                        handlers={handlers}
                        isMuted={isMuted}
                        setIsMuted={setIsMuted}
                        currentTrackIndex={currentTrackIndex}
                        changeTrack={changeTrack}
                    />
                </div>
            )}
            {appMode === 'studio' && import.meta.env.DEV && (
                <div className="p-4 md:p-8 max-w-6xl mx-auto">
                    <DeveloperStudio
                        gameData={gameData}
                        setGameData={setGameData}
                        setGameState={setGameState}
                        setPlayerState={setPlayerState}
                        setAppMode={setAppMode}
                        t={t}
                        language={language}
                        currentTrackIndex={currentTrackIndex}
                        changeTrack={changeTrack}
                        isMuted={isMuted}
                        setIsMuted={setIsMuted}
                    />
                </div>
            )}

            {rentPopup.show && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center font-parchment text-slate-900">
                    <div className="bg-[#f3e8d2] text-slate-955 border-4 border-red-800 rounded-3xl p-8 max-w-md shadow-2xl text-center space-y-4 mx-4">
                        <h3 className="text-2xl font-bold font-magic text-red-900">{t('ui.rent_popup_title')}</h3>
                        <p className="text-lg text-slate-900">{rentPopup.message}</p>
                        <button onClick={() => setRentPopup({ show: false, message: '' })} className="bg-red-800 text-white font-magic p-3 rounded-xl">İmzala</button>
                    </div>
                </div>
            )}

            {newsPopup.show && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center font-parchment text-slate-900">
                    <div className="bg-[#f3e8d2] text-slate-955 border-8 border-indigo-900 rounded-3xl p-8 max-w-lg shadow-2xl text-center space-y-6 mx-4 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-indigo-800 to-purple-800"></div>
                        <h3 className="text-3xl font-bold font-magic text-indigo-900">{t('ui.news_popup_title')}</h3>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            {newsPopup.items.map(news => (
                                <div key={news.id} className="bg-white/50 p-4 rounded-xl border-2 border-indigo-200 text-lg font-semibold italic leading-relaxed">
                                    "{news.text}"
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => setNewsPopup({ show: false, items: [] })}
                            className="w-full bg-indigo-800 hover:bg-indigo-700 text-white font-magic font-bold py-3 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform active:translate-y-1"
                        >
                            {t('ui.news_close')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}