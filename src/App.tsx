import React, { useState, useEffect } from 'react';

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
}

interface Storyline {
    id: string;
    characterName: string;
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
            id: 'story_baran', characterName: 'Genç Druid Baran', avatarUrl: '',
            nodes: [
                {
                    id: 'node_baran_1', npcText: 'Selam şifacı... Ben Baran. Yolculuk beni perişan etti. Rüyamda yaşlı, kırmızı gözlü korkunç bir kadının kahkahalarını duyuyorum. Ciğerlerim yanıyor. Bana şifa verebilir misin?', diseaseId: 'd_alkarisi', dynamicSuccessNodeId: 'node_baran_poyraz', dynamicFailNodeId: 'node_baran_dead',
                    choices: [{ text: 'Sana göre bir ilacım yok Baran, üzgünüm.', nextNodeId: 'node_baran_dead', delayDays: 1 }]
                },
                {
                    id: 'node_baran_poyraz', npcText: 'Aklım yerine geldi, zihnimdeki o uğursuz çığlıklar kesildi! Atım Poyraz bile senin şifanı övdü... Şimdi İlayda ve Derya adındaki küs nehir ruhlarını barıştırma görevim var. Bana bir parça Naiad Nefesi verirsen minnettar olurum.',
                    choices: [
                        { text: 'Naiad Nefesi İksirini Al (İksiri Ver)', nextNodeId: 'node_baran_reconciled', reqPotion: 'pot_naiad_nefesi', reqPotionCount: 1, delayDays: 5 },
                        { text: 'Uzak dur benden konuşan beygir ve deliler!', nextNodeId: 'node_baran_dead', delayDays: 1 }
                    ]
                },
                {
                    id: 'node_baran_reconciled', npcText: 'Şifacı! Senin iksirin sayesinde nehre girdim ve İlayda ile Derya yı barıştırdım. Sana teşekkür etmek için nehrin dibinden çıkardığım bu Sihirli Buğdayı hediye ediyoruz!',
                    choices: [{ text: 'Kendine çok iyi bak Baran.', nextNodeId: null, rewardPlantId: 'p_sihirli_bugday', rewardPlantCount: 1, rewardGold: 50 }]
                },
                {
                    id: 'node_baran_dead', npcText: 'Baran karanlığa teslim oldu... Alkarısı zihnini tamamen ele geçirdi. Çığlıklar atarak vahşi ormana karışıp kayboldu.',
                    choices: [{ text: 'Çok yazık oldu...', nextNodeId: null }]
                }
            ]
        },
        {
            id: 'story_landlord', characterName: 'Tahsildar Kazım', avatarUrl: '',
            nodes: [
                {
                    id: 'node_landlord_demand', npcText: 'Selam şifacı! Köyün beyinin tahsildarıyım ben. Palankanın içindeki dükkan kirasını (100 Altın) tahsil etmeye geldim.',
                    choices: [
                        { text: 'Kiramı Öde (100 Altın Öde)', nextNodeId: 'node_landlord_thanks', reqGold: 100 },
                        { text: 'Şu an ödeyemiyorum, borç yaz beyimize.', nextNodeId: 'node_landlord_angry' }
                    ]
                },
                {
                    id: 'node_landlord_thanks', npcText: 'Güzel, akıllı bir şifacı. Palankamızın kapısı sana her zaman açık kalacaktır. İyi çalışmalar.',
                    choices: [{ text: 'Teşekkürler, iyi günler Kazım Bey.', nextNodeId: null }]
                },
                {
                    id: 'node_landlord_angry', npcText: 'Yine mi borç?! Bak burası devlet kapısı. Kazandığın her altın doğrudan benim borç defterime kesilecek, palanka kanunudur bu!',
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
    translations: {
        tr: {
            "ui.gold": "Altın", "ui.day": "Gün", "ui.rent_debt": "Kira Borcu", "ui.end_day": "Günü Bitir", "ui.call_customer": "Kapıya Bak!",
            "ui.advisor": "AKIL HOCASI", "ui.chest": "Şifacı Sandığı", "ui.plants_title": "Bitkilerin:", "ui.potions_title": "İksirlerin:",
            "ui.journal": "Günlük Parşömen", "ui.cauldron": "Büyük Kazan", "ui.brew": "Kazanı Karıştır", "ui.recipe_book": "Tarif Kitabı",
            "ui.pantry": "Kiler Çantası", "ui.treatment_bench": "Teşhis & Tedavi Masası", "ui.apply_treatment": "Tedaviyi Uygula",
            "ui.buy": "Satın Al", "ui.stock": "Stok", "ui.rent_popup_title": "Haciz & Borç Mektubu", "ui.sign_letter": "Mektubu İmzala (Altınlar Kesilsin)",
            "ui.empty_bench": "Şifa masası boş. Aşağıdan bitki veya iksir diz!", "ui.fill_bench": "Tezgahı Doldur (Envanterinden Seç):",
            "ui.diagnosis": "Teşhis", "ui.market_title": "Şehir Pazarı (Tahsildar Kazım)",
            "char.story_baran": "Genç Druid Baran", "char.story_landlord": "Tahsildar Kazım",
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
            "prop.Tuzlu": "Tuzlu", "prop.Sakinleştirici": "Sakinleştirici"
        },
        en: {
            "ui.gold": "Gold", "ui.day": "Day", "ui.rent_debt": "Rent Debt", "ui.end_day": "End Day", "ui.call_customer": "Check Door!",
            "ui.advisor": "WIZARD ADVISOR", "ui.chest": "Healer Chest", "ui.plants_title": "Your Plants:", "ui.potions_title": "Your Potions:",
            "ui.journal": "Daily Scroll", "ui.cauldron": "Great Cauldron", "ui.brew": "Stir Cauldron", "ui.recipe_book": "Recipe Book",
            "ui.pantry": "Pantry Bag", "ui.treatment_bench": "Diagnosis & Treatment Table", "ui.apply_treatment": "Apply Treatment",
            "ui.buy": "Buy", "ui.stock": "Stock", "ui.rent_popup_title": "Bailiff's Debt Letter", "ui.sign_letter": "Sign the Letter",
            "ui.empty_bench": "The healing table is empty.", "ui.fill_bench": "Fill Desk (Select from Inventory):",
            "ui.diagnosis": "Diagnosis", "ui.market_title": "City Market",
            "char.story_baran": "Young Druid Baran", "char.story_landlord": "Tax Collector Kazim",
            "plant.p_demir_ardic.name": "Iron-Juniper Leaf", "plant.p_gumus_kok.name": "Silver Root",
            "potion.pot_alkarisi_savar.name": "Alkarisi Ward Potion"
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

const TooltipPlant: React.FC<TooltipPlantProps> = ({ plantId, gameData, t }) => {
    const plant = gameData.plants.find(p => p.id === plantId);
    if (!plant) return null;
    const symptoms = getHerbCuredSymptoms(plantId, gameData);
    return (
        <div className="absolute hidden group-hover:block z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-900 border-4 border-slate-955 p-3 rounded-xl text-xs text-amber-100 font-sans shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-left pointer-events-none">
            <p className="font-magic text-sm text-amber-400 font-bold border-b border-amber-500/20 pb-1 mb-1">{t(`plant.${plantId}.name`, plant.name)}</p>
            <p className="text-slate-400 mb-1">🌿 {t('ui.required', 'Nitelikler')}: {plant.properties.map(p => t(`prop.${p}`, p)).join(', ')}</p>
            <p className="font-bold text-emerald-400">⚡ {t('ui.cures', 'Giderdiği Semptomlar')}:</p>
            <div className="flex flex-wrap gap-1 mt-1">
                {symptoms.length > 0 ? symptoms.map(s => <span key={s} className="bg-emerald-950/80 border border-emerald-500 text-emerald-300 px-1.5 py-0.5 rounded text-[10px]">{t(`symptom.${s}`, s)}</span>)
                    : <span className="text-slate-500 italic text-[10px]">Herhangi bir semptomu gidermez.</span>}
            </div>
        </div>
    );
};

interface TooltipPotionProps {
    potionId: string;
    gameData: GameData;
    t: (key: string, fallback?: string) => string;
}

const TooltipPotion: React.FC<TooltipPotionProps> = ({ potionId, gameData, t }) => {
    const potion = gameData.potions.find(p => p.id === potionId);
    if (!potion) return null;
    return (
        <div className="absolute hidden group-hover:block z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-900 border-4 border-slate-955 p-3 rounded-xl text-xs text-amber-100 font-sans shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-left pointer-events-none">
            <p className="font-magic text-sm text-purple-400 font-bold border-b border-purple-500/20 pb-1 mb-1">{t(`potion.${potionId}.name`, potion.name)}</p>
            <p className="text-slate-400 mb-1">💰 {t('ui.sell_price', 'Satış Değeri')}: {potion.sellPrice} Altın</p>
            <p className="font-bold text-emerald-400 mb-1">⚡ {t('ui.curative_powers', 'Tedavi Ettiği Hastalıklar')}:</p>
            <div className="space-y-1">
                {getPotionCuresDetails(potionId, gameData, t).map((detail, idx) => <div key={idx} className="bg-purple-950/80 border border-purple-500 text-purple-300 p-1 rounded text-[10px] leading-tight">{detail}</div>)}
            </div>
        </div>
    );
};

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

function renderStudioPlantsList(gameData: GameData, t: (key: string, fallback?: string) => string): React.JSX.Element {
    return (
        <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4 col-span-1 lg:col-span-2">
            <h2 className="text-2xl font-bold font-magic text-slate-900 border-b-2 border-slate-900/20 pb-2 flex items-center gap-2">
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

                                <div className="mt-3 space-y-1.5 border-t border-dashed border-slate-900/10 pt-2 text-xs text-slate-700">
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

                            <div className="pt-2 border-t border-slate-900/10 flex justify-between items-center text-xs">
                                <span className="text-slate-500">Maliyet</span>
                                <span className="font-magic font-bold text-red-955 text-sm">💰 {plant.cost} Altın</span>
                            </div>
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

const SidePanel: React.FC<SidePanelProps> = ({ playerState, gameState, gameData, t, language }) => {
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
                <img src="FireBreatherIcon.png" alt="Wizard Advisor"
                     className="w-16 h-16 rounded-full border-2 border-amber-500 bg-slate-950 object-cover"/>
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
        </div>
    );
};

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

const ShopArea: React.FC<ShopAreaProps> = ({ gameState, playerState, gameData, language, t, handlers, treatmentBench, treatmentStatus }) => {
    let activeNode: StoryNode | null = null;
    let activeStory: Storyline | null = null;
    if (gameState.currentCustomer) {
        activeStory = gameData.storylines.find(s => s.id === gameState.currentCustomer!.storyId) || null;
        if (activeStory) activeNode = activeStory.nodes.find(n => n.id === gameState.currentCustomer!.nodeId) || null;
    }
    const customerDisease = activeNode && activeNode.diseaseId ? gameData.diseases.find(d => d.id === activeNode!.diseaseId) : null;
    const charNameTranslated = activeStory ? t(`char.${activeStory.id}`, activeStory.characterName) : '';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-[#f3e8d2] p-8 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-red-800 to-amber-700 border-b-2 border-black"></div>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-bold font-magic text-slate-900 flex items-center gap-2">🚪 {t('tabs.shopArea', 'Tezgah')}</h2>
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
                                {activeStory?.avatarUrl ? (
                                    <div className="w-40 h-40 bg-amber-50 rounded-2xl border-4 border-slate-900 overflow-hidden flex items-center justify-center p-2 shadow-lg animate-idle-float">
                                        <img src={activeStory.avatarUrl} alt={charNameTranslated} className="max-w-full max-h-full object-contain" />
                                    </div>
                                ) : (
                                    <div className="w-40 h-40 bg-[#dfd1b3] border-4 border-dashed border-slate-700 rounded-2xl flex flex-col justify-center items-center text-slate-600 animate-idle-float">
                                        <span className="text-5xl">👤</span><span className="text-xs font-sans mt-2 italic">Görsel Atanmamış</span>
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
                                            <button key={index} onClick={() => handlers.handleRemoveFromTreatmentBench(index)} className="bg-[#f3e8d2] border-2 border-slate-900 text-slate-900 hover:bg-red-800 hover:text-white px-3 py-1 rounded-lg font-bold">
                                                {item.type === 'plant' ? '🌿' : '🧪'} {item.type === 'plant' ? t(`plant.${item.id}.name`) : t(`potion.${item.id}.name`)} ✕
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
                                            className="w-full text-left p-4 rounded-xl border-2 bg-amber-100 border-slate-900 hover:bg-amber-50 flex flex-col justify-between items-start disabled:opacity-50 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
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
};

interface AlchemyAreaProps {
    playerState: PlayerState;
    gameData: GameData;
    cauldron: CauldronItem[];
    brewState: BrewState;
    t: (key: string, fallback?: string) => string;
    handlers: GameHandlers;
    language: string;
}

const AlchemyArea: React.FC<AlchemyAreaProps> = ({ playerState, gameData, cauldron, brewState, t, handlers, language }) => {
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
                                        <span className="font-semibold">{ing.type === 'plant' ? '🌿' : '🧪'} {ing.type === 'plant' ? t(`plant.${ing.id}.name`) : t(`potion.${ing.id}.name`)}</span>
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
                <div className={`flex-1 bg-slate-950 rounded-full border-[6px] border-slate-800 mx-4 mt-2 mb-6 flex flex-wrap justify-center items-center p-6 ${brewState.status === 'brewing' ? 'animate-pulse' : ''}`}>
                    {cauldron.length === 0 && <span className="text-slate-500 font-magic text-sm">{language === 'en' ? 'Toss items in!' : 'Kazan boş çırak.'}</span>}
                    {cauldron.map((item, idx) => {
                        const pl = gameData.plants.find(p => p.id === item.id);
                        return (
                            <button key={idx} onClick={() => handlers.handleRemoveFromCauldron(idx, item.type, item.id)} className="bg-[#f3e8d2] border-2 border-black px-3 py-1.5 rounded-xl text-sm font-bold m-1 flex items-center gap-1">
                                {item.type === 'plant' && pl?.imageUrl ? <img src={pl.imageUrl} alt={pl.name} className="w-4 h-4 object-contain" /> : (item.type === 'plant' ? '🌿' : '🧪')}
                                {item.type === 'plant' ? t(`plant.${item.id}.name`) : t(`potion.${item.id}.name`)} ✕
                            </button>
                        );
                    })}
                </div>
                {brewState.message && <div className="text-center bg-purple-100 border-2 border-black rounded-lg p-2 mb-2 font-bold">{brewState.message}</div>}
                <button onClick={handlers.handleBrew} disabled={cauldron.length === 0 || brewState.status === 'brewing'} className="w-full py-4 rounded-xl font-bold font-magic text-xl border-4 border-black bg-amber-500 hover:bg-amber-400 text-slate-955 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">{t('ui.brew')}</button>
            </div>
        </div>
    );
};

interface MarketAreaProps {
    gameData: GameData;
    t: (key: string, fallback?: string) => string;
    handlers: GameHandlers;
    currentDay: number;
    playerState: PlayerState;
}

const MarketArea: React.FC<MarketAreaProps> = ({ gameData, t, handlers, currentDay, playerState }) => {
    // Girdiğimiz gün bilgisine göre market bitkilerini filtreliyoruz ( availableDay belirtilmemişse 1. gün kabul edilir )
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
                                        {plant.imageUrl ? <img src={plant.imageUrl} alt={plant.name} className="w-12 h-12 object-contain bg-amber-50 rounded-lg border-2 border-slate-900 p-1" /> : <span className="text-3xl">🌿</span>}
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
};

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
}

const GameClient: React.FC<GameClientProps> = ({ gameData, gameState, playerState, cauldron, brewState, treatmentBench, treatmentStatus, language, setLanguage, setAppMode, activeTab, setActiveTab, t, handlers }) => {
    return (
        <div className="space-y-6">
            <div className="bg-[#2a131b] border-4 border-slate-900 p-6 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-600 to-red-800"></div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <img src="FireBreatherIcon.png" alt="Wizard Advisor" className="w-14 h-14 rounded-full border-2 border-amber-500 shadow-md object-cover hidden md:block bg-slate-950"/>
                    <div>
                        <h1 className="text-3xl font-bold text-amber-400 font-magic flex items-center gap-2">⚗️ {t('ui.gold') === 'Gold' ? 'Healer Store' : 'Şifacı Kulübesi'}</h1>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="bg-amber-500 text-slate-955 border-2 border-black px-3 py-0.5 rounded-lg text-sm font-magic font-bold">{t('ui.day')}: {gameState.day}</span>
                            {playerState.rentDebt > 0 && <span className="bg-red-800 border-2 border-black text-white px-3 py-0.5 rounded-lg text-sm font-magic font-bold animate-pulse">⚠️ {t('ui.rent_debt')}: {playerState.rentDebt}💰</span>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
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
                    { id: 'shopArea', label: `🏪 ${t('ui.gold') === 'Gold' ? 'Counter' : 'Tezgah Önü'}`, color: 'bg-amber-500 text-slate-955' },
                    { id: 'alchemyArea', label: `⚗️ ${t('ui.gold') === 'Gold' ? 'Alchemist Lab' : 'Simya Atölyesi'}`, color: 'bg-purple-600 text-white' },
                    { id: 'marketArea', label: `🛒 ${t('ui.gold') === 'Gold' ? 'Market' : 'Şehir Pazarı'}`, color: 'bg-emerald-600 text-white' }
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
};

// -- STÜDYO BİLEŞENLERİ (GELİŞTİRİCİ ARAÇLARI) --

interface DeveloperStudioProps {
    gameData: GameData;
    setGameData: React.Dispatch<React.SetStateAction<GameData | null>>;
    setGameState: React.Dispatch<React.SetStateAction<GameState>>;
    setPlayerState: React.Dispatch<React.SetStateAction<PlayerState>>;
    setAppMode: React.Dispatch<React.SetStateAction<string>>;
    t: (key: string, fallback?: string) => string;
}

const DeveloperStudio: React.FC<DeveloperStudioProps> = ({ gameData, setGameData, setGameState, setPlayerState, setAppMode, t }) => {
    const [activeTab, setActiveTab] = useState<string>('dataEditor');
    const [newPlant, setNewPlant] = useState<Plant>({ id: '', name: '', rarity: 'Yaygın', cost: 10, properties: [], imageUrl: '' });
    const [newDisease, setNewDisease] = useState<Disease>({ id: '', name: '', symptoms: [] });
    const [newPotion, setNewPotion] = useState<Potion>({ id: '', name: '', sellPrice: 50, curesDiseaseIds: [], ingredients: [] });
    const [tempIngredient, setTempIngredient] = useState<Ingredient>({ type: 'plant', id: '', count: 1 });
    const [activeEditorStoryId, setActiveEditorStoryId] = useState<string>('story_baran');
    const [newStoryline, setNewStoryline] = useState<{ id: string; characterName: string; avatarUrl: string }>({ id: '', characterName: '', avatarUrl: '' });
    const [newNode, setNewNode] = useState<{ id: string; npcText: string; diseaseId: string; dynamicSuccessNodeId: string; dynamicFailNodeId: string }>({ id: '', npcText: '', diseaseId: '', dynamicSuccessNodeId: '', dynamicFailNodeId: '' });

    const [newChoice, setNewChoice] = useState<{
        text: string;
        nextNodeId: string;
        delayDays: number;
        autoCreateNode: boolean;
        // Gereksinimler (Requirements)
        reqGold: number;
        reqPlant: string;
        reqPlantCount: number;
        reqPotion: string;
        reqPotionCount: number;
        // Ödüller (Rewards)
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

    // Yeni Market Düzenleyici State Değişkenleri
    const [selectedMarketPlantId, setSelectedMarketPlantId] = useState<string>('');
    const [marketPlantCost, setMarketPlantCost] = useState<number>(10);
    const [marketPlantStock, setMarketPlantStock] = useState<number>(5);
    const [marketPlantDay, setMarketPlantDay] = useState<number>(1);

    const [selectedMarketPotionId, setSelectedMarketPotionId] = useState<string>('');
    const [marketPotionCost, setMarketPotionCost] = useState<number>(100);
    const [marketPotionStock, setMarketPotionStock] = useState<number>(1);
    const [marketPotionDay, setMarketPotionDay] = useState<number>(1);

    // Semptom ve Nitelik Düzenleyici State Değişkenleri
    const [newSymptom, setNewSymptom] = useState<string>('');
    const [newPlantProperty, setNewPlantProperty] = useState<PlantProperty>({ name: '', curesSymptoms: [] });

    // Stüdyo İşlevleri
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
                // Eski veya eksik JSON yüklemelerine karşı güvenli fallback katmanı
                const validatedData: GameData = {
                    ...INITIAL_DATA,
                    ...parsed,
                    marketPlants: parsed.marketPlants || [],
                    marketRecipes: parsed.marketRecipes || []
                };
                setGameData(validatedData);
                setImportStatus('✅ Başarılı! Veritabanı yüklendi.');
                setGameState(prev => ({ ...prev, day: 1, currentCustomer: null, logs: ['🧙‍♂️ Senaryo yüklendi!'] }));
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
        gameData.storylines.forEach(story => {
            keys.add(`char.${story.id}`);
            story.nodes.forEach(node => {
                keys.add(`node.${node.id}.npcText`);
                if (node.choices) node.choices.forEach((_, idx) => keys.add(`choice.${node.id}.${idx}`));
            });
        });
        return Array.from(keys);
    };

    // Veri Ekleme Mantığı (Bitki, Hastalık vb)
    const toggleProp = (propName: string): void => setNewPlant({ ...newPlant, properties: newPlant.properties.includes(propName) ? newPlant.properties.filter(p => p !== propName) : [...newPlant.properties, propName] });
    const handleAddPlant = (): void => {
        if (!newPlant.id) return;
        handleTranslateChange('tr', `plant.${newPlant.id}.name`, newPlant.name);
        setGameData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                plants: [...prev.plants, { ...newPlant, cost: Number(newPlant.cost) }]
            };
        });
        setNewPlant({ id: '', name: '', rarity: 'Yaygın', cost: 10, properties: [], imageUrl: '' });
    };
    const handleAddTempIngredient = (): void => {
        if (!tempIngredient.id) return;
        setNewPotion({ ...newPotion, ingredients: [...newPotion.ingredients, { ...tempIngredient, count: Number(tempIngredient.count) }] });
    };
    const handleAddPotionRecipe = (): void => {
        if (!newPotion.id) return;
        handleTranslateChange('tr', `potion.${newPotion.id}.name`, newPotion.name); // Dil senkronizasyonu
        setGameData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                potions: [...prev.potions, { ...newPotion, sellPrice: Number(newPotion.sellPrice) }]
            };
        });
        setNewPotion({ id: '', name: '', sellPrice: 50, curesDiseaseIds: [], ingredients: [] });
    };

    // Hastalık Ekleme Mantığı
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

    // Semptom ve Nitelik Ekleme Mantığı
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

    // Market Düzenleme İşlemleri
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
        setSelectedMarketPlantId(''); // Form sıfırlama
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
        setSelectedMarketPotionId(''); // Form sıfırlama
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

    // Diyalog Ekleme Mantığı
    const handleAddStoryline = (): void => {
        if(!newStoryline.id) return;
        handleTranslateChange('tr', `char.${newStoryline.id}`, newStoryline.characterName); // Dil senkronizasyonu
        setGameData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                storylines: [...prev.storylines, { ...newStoryline, nodes: [] }]
            };
        });
        setNewStoryline({id: '', characterName: '', avatarUrl: ''});
    };
    const handleAddNodeToStory = (): void => {
        if(!activeEditorStoryId || !newNode.id) return;
        handleTranslateChange('tr', `node.${newNode.id}.npcText`, newNode.npcText); // Dil senkronizasyonu
        setGameData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                storylines: prev.storylines.map(s => s.id === activeEditorStoryId ? { ...s, nodes: [...s.nodes, { ...newNode, choices: [] }] } : s)
            };
        });
        setNewNode({id: '', npcText: '', diseaseId: '', dynamicSuccessNodeId: '', dynamicFailNodeId: ''});
    };

    const handleAddChoiceToNodeAdv = (nodeId: string): void => {
        let targetNextNodeId: string | null = newChoice.nextNodeId || null;
        const extraNodes: StoryNode[] = [];
        if (newChoice.autoCreateNode) {
            const generatedNodeId = `node_${activeEditorStoryId.replace('story_', '')}_gen_${Date.now().toString().slice(-4)}`;
            targetNextNodeId = generatedNodeId;
            extraNodes.push({ id: generatedNodeId, npcText: 'Diyalog devam ediyor...', choices: [] });
        }

        const choiceObj: Choice = {
            text: newChoice.text,
            nextNodeId: targetNextNodeId,
            delayDays: newChoice.delayDays || undefined,

            // Alınacaklar
            reqGold: newChoice.reqGold ? Number(newChoice.reqGold) : undefined,
            reqPlant: newChoice.reqPlant || undefined,
            reqPlantCount: newChoice.reqPlant ? Number(newChoice.reqPlantCount) : undefined,
            reqPotion: newChoice.reqPotion || undefined,
            reqPotionCount: newChoice.reqPotion ? Number(newChoice.reqPotionCount) : undefined,

            // Ödüller
            rewardGold: newChoice.rewardGold ? Number(newChoice.rewardGold) : undefined,
            rewardPlantId: newChoice.rewardPlantId || undefined,
            rewardPlantCount: newChoice.rewardPlantId ? Number(newChoice.rewardPlantCount) : undefined,
            rewardPotionId: newChoice.rewardPotionId || undefined,
            rewardPotionCount: newChoice.rewardPotionId ? Number(newChoice.rewardPotionCount) : undefined
        };

        // Eklenen seçeneğin çevirisini otomatik dil veritabanına ekle
        const story = gameData.storylines.find(s => s.id === activeEditorStoryId);
        const node = story?.nodes.find(n => n.id === nodeId);
        const currentChoiceIndex = node?.choices.length || 0;
        handleTranslateChange('tr', `choice.${nodeId}.${currentChoiceIndex}`, newChoice.text);

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
        }); // Seçim formunu temizle
    };

    const renderVisualNode = (story: Storyline, nodeId: string, visited: Set<string> = new Set()): React.JSX.Element => {
        if (visited.has(nodeId)) return <div className="text-xs text-red-955 font-bold p-2 bg-red-100 rounded border-2">Döngü Tespit Edildi</div>;
        const nextVisited = new Set(visited);
        nextVisited.add(nodeId);
        const node = story.nodes.find(n => n.id === nodeId);
        if (!node) return <div className="text-slate-600 text-xs italic p-2 bg-amber-50 rounded border border-dashed">Diyalog Bitiş</div>;

        return (
            <div className="flex flex-col items-center relative mt-4 font-parchment">
                <div className="bg-[#f3e8d2] border-4 border-slate-900 rounded-2xl p-4 w-72 shadow-md relative z-10">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-mono font-bold text-indigo-900">#{node.id}</span>
                    </div>
                    <p className="text-sm font-bold">"{node.npcText}"</p>
                    <button onClick={() => setSelectedNodeId(node.id)} className="absolute -right-3 -top-3 bg-emerald-500 border-2 border-black text-slate-955 text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">➕</button>
                </div>
                {node.choices && node.choices.length > 0 && (
                    <div className="flex gap-6 relative pt-6">
                        <div className="absolute top-0 left-1/2 w-1 h-6 bg-slate-900 -translate-x-1/2"></div>
                        {node.choices.map((choice, idx) => (
                            <div key={idx} className="flex flex-col items-center relative pt-4 min-w-[200px]">
                                <div className="absolute top-0 left-1/2 w-1 h-4 bg-slate-900 -translate-x-1/2"></div>
                                <div className="bg-[#e9dbbe] border-2 border-slate-955 rounded-xl p-2.5 text-xs w-48 shadow-sm text-center mb-3 space-y-1">
                                    <p className="font-bold">{t(`choice.${node.id}.${idx}`, choice.text)}</p>

                                    {/* Seçenek Preview Detayı */}
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

    function renderCreatePlant(): React.JSX.Element {
        return <div
            className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <h2 className="text-2xl font-bold font-magic text-slate-900">🌿 Yeni Bitki Yarat</h2>
            <input className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold" placeholder="ID (p_mavi)"
                   value={newPlant.id} onChange={e => setNewPlant({...newPlant, id: e.target.value})}/>
            <input className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold" placeholder="İsim"
                   value={newPlant.name} onChange={e => setNewPlant({...newPlant, name: e.target.value})}/>
            <div className="flex flex-wrap gap-2 mb-2 p-4 border-2 border-slate-900/30 rounded-xl bg-amber-100/30">
                {gameData.plantProperties.map(prop => (
                    <button key={prop.name} onClick={() => toggleProp(prop.name)}
                            className={`text-sm px-3 py-1 rounded-xl border-2 ${newPlant.properties.includes(prop.name) ? 'bg-emerald-600 text-white' : 'bg-amber-100 border-slate-700'}`}>{prop.name}</button>
                ))}
            </div>
            <button onClick={handleAddPlant}
                    className="w-full bg-emerald-500 font-bold py-3 rounded-xl border-4 border-black">Kaydet
            </button>
        </div>;
    }

    function renderCreatePotion(): React.JSX.Element {
        return <div
            className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <h2 className="text-2xl font-bold font-magic text-slate-900">⚗️ Yeni İksir Formülü</h2>
            <input className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold"
                   placeholder="ID (pot_hiz)" value={newPotion.id}
                   onChange={e => setNewPotion({...newPotion, id: e.target.value})}/>
            <input className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold"
                   placeholder="İsim" value={newPotion.name}
                   onChange={e => setNewPotion({...newPotion, name: e.target.value})}/>
            <div className="flex gap-2">
                <select className="bg-amber-50 border-2 border-slate-900 p-2 flex-1 rounded text-xs font-bold" value={tempIngredient.id}
                        onChange={e => setTempIngredient({...tempIngredient, id: e.target.value, type: e.target.value.startsWith('pot_') ? 'potion' : 'plant'})}>
                    <option value="">İçerik Seç...</option>
                    {gameData.plants.map(p => <option key={p.id} value={p.id}>{t(`plant.${p.id}.name`, p.name)}</option>)}
                </select>
                <button onClick={handleAddTempIngredient} className="bg-indigo-600 text-white px-4 rounded-lg font-bold border-2 border-black text-xs">Ekle</button>
            </div>
            <div className="space-y-1">{newPotion.ingredients.map((ing, idx) => <div key={idx}
                                                                                     className="bg-amber-50 p-1 border text-xs">{ing.id} x{ing.count}</div>)}</div>

            {/* İksirin İyi Geldiği Hastalıklar */}
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
                    className="w-full bg-purple-500 font-bold py-3 rounded-xl border-4 border-black">Tarifi Kaydet
            </button>
        </div>;
    }

    // Yeni Hastalık Yaratma Arayüzü
    function renderCreateDisease(): React.JSX.Element {
        return (
            <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
                <h2 className="text-2xl font-bold font-magic text-slate-900">🦠 Yeni Hastalık Yarat</h2>
                <div className="space-y-3">
                    <input
                        className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold"
                        placeholder="ID (d_veba)"
                        value={newDisease.id}
                        onChange={e => setNewDisease({...newDisease, id: e.target.value})}
                    />
                    <input
                        className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold"
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
    }

    // Semptom ve Nitelik Yönetim Arayüzü
    function renderManagePropertiesAndSymptoms(): React.JSX.Element {
        return (
            <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6">
                {/* Semptom Havuzu */}
                <div className="space-y-3">
                    <h2 className="text-2xl font-bold font-magic text-slate-900 border-b-2 border-slate-900/20 pb-2">⚠️ Yeni Semptom Tanımla</h2>
                    <div className="flex gap-2">
                        <input
                            className="flex-1 bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold text-sm"
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
                            <span key={symp} className="bg-amber-100 text-slate-850 text-xs px-2.5 py-0.5 rounded-full border border-slate-400 font-bold">
                {t(`symptom.${symp}`, symp)}
              </span>
                        ))}
                    </div>
                </div>

                {/* Yeni Bitki Nitelik ve Şifa Tanımlama */}
                <div className="space-y-3 pt-4 border-t-2 border-slate-900/10">
                    <h2 className="text-2xl font-bold font-magic text-slate-900">🌿 Yeni Bitki Özelliği (Nitelik)</h2>
                    <input
                        className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold text-sm"
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
    }

    // Kayıtlı Hastalıkları ve İksirleri Gösteren Stüdyo Tablosu
    function renderStudioDiseasesAndPotions(gameData: GameData, t: (key: string, fallback?: string) => string): React.JSX.Element {
        return (
            <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6 col-span-1 lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Hastalık Listesi */}
                    <div className="space-y-3">
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
                                        className="bg-red-800 text-white text-[10px] px-2.5 py-1 rounded border-2 border-black font-bold font-magic"
                                    >
                                        Sil
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* İksir Listesi */}
                    <div className="space-y-3">
                        <h3 className="text-xl font-bold font-magic text-slate-900 border-b-2 border-slate-900/20 pb-1 flex items-center gap-2">
                            🧪 Tanımlı İksirler ({gameData.potions.length})
                        </h3>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            {gameData.potions.map(pot => (
                                <div key={pot.id} className="bg-amber-50/70 p-3 rounded-xl border-2 border-slate-900 flex justify-between items-start gap-2">
                                    <div className="space-y-1">
                                        <span className="font-bold text-slate-900 block leading-tight">{t(`potion.${pot.id}.name`, pot.name)}</span>
                                        <span className="text-xs font-mono text-indigo-900 font-semibold block">ID: #{pot.id} | Satış: {pot.sellPrice}💰</span>
                                        <div className="text-[10px] text-slate-600">
                                            <strong>İçerik:</strong> {pot.ingredients.map(ing => `${ing.count}x ${t(`plant.${ing.id}.name`, ing.id)}`).join(', ')}
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {pot.curesDiseaseIds.map(dId => {
                                                const dDef = gameData.diseases.find(d => d.id === dId);
                                                return (
                                                    <span key={dId} className="bg-purple-100 text-purple-900 border border-purple-300 rounded text-[9px] px-1.5 py-0.5 font-bold font-sans">
                            {t(`disease.${dId}.name`, dDef ? dDef.name : dId)}
                          </span>
                                                );
                                            })}
                                        </div>
                                    </div>
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
                                        className="bg-red-800 text-white text-[10px] px-2.5 py-1 rounded border-2 border-black font-bold font-magic"
                                    >
                                        Sil
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        );
    }

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
                    { id: 'dialogueEditor', label: '💬 Diyalog Ağacı' },
                    { id: 'marketEditor', label: '🛒 Market Düzenleyici' },
                    { id: 'translationEditor', label: '🌍 Lokalizasyon' },
                    { id: 'jsonHub', label: '📂 JSON Motoru' }
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 py-3 rounded-xl font-bold font-magic flex-1 border-4 border-black ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 border-slate-955'}`}>{tab.label}</button>
                ))}
            </div>

            {activeTab === 'dataEditor' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {renderCreatePlant()}
                    {renderCreatePotion()}
                    {renderCreateDisease()}
                    {renderManagePropertiesAndSymptoms()}
                    {/* Sistemdeki Tüm Bitkileri Listeler */}
                    {renderStudioPlantsList(gameData, t)}
                    {/* Sistemdeki Tüm Hastalıkları ve İksirleri Listeler */}
                    {renderStudioDiseasesAndPotions(gameData, t)}
                </div>
            )}

            {/* YENİ EKLENEN MARKET DÜZENLEYİCİSİ GÖRÜNÜMÜ */}
            {activeTab === 'marketEditor' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 font-parchment">

                    {/* PAZAR BİTKİLERİ FORMU & LİSTESİ */}
                    <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
                        <h2 className="text-2xl font-bold font-magic text-slate-900 border-b-2 border-slate-900/20 pb-2">🌿 Pazara Bitki Ekle</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold block mb-1">Bitki Seçin</label>
                                <select className="w-full bg-amber-50 border-2 border-slate-900 p-2 rounded-lg font-bold" value={selectedMarketPlantId} onChange={e => setSelectedMarketPlantId(e.target.value)}>
                                    <option value="">Seçiniz...</option>
                                    {gameData.plants.map(p => <option key={p.id} value={p.id}>{t(`plant.${p.id}.name`, p.name)}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="text-xs font-bold block mb-1">Altın Maliyeti</label>
                                    <input type="number" className="w-full bg-amber-50 border-2 border-slate-900 p-2 rounded-lg font-bold" value={marketPlantCost} onChange={e => setMarketPlantCost(Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold block mb-1">Stok Miktarı</label>
                                    <input type="number" className="w-full bg-amber-50 border-2 border-slate-900 p-2 rounded-lg font-bold" value={marketPlantStock} onChange={e => setMarketPlantStock(Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold block mb-1">Açılacağı Gün</label>
                                    <input type="number" className="w-full bg-amber-50 border-2 border-slate-900 p-2 rounded-lg font-bold text-indigo-900" value={marketPlantDay} onChange={e => setMarketPlantDay(Number(e.target.value))} />
                                </div>
                            </div>
                            <button onClick={handleAddMarketPlant} className="w-full bg-emerald-500 font-bold py-3 rounded-xl border-4 border-black text-slate-955 font-magic">Bitkiyi Markete Tanımla</button>
                        </div>

                        <div className="pt-4 border-t-2 border-slate-900/10">
                            <h3 className="font-bold font-magic text-slate-900 mb-2">Pazarda Satışta Olan Bitkiler:</h3>
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                {(gameData.marketPlants || []).map(mp => {
                                    const pl = gameData.plants.find(p => p.id === mp.plantId);
                                    return (
                                        <div key={mp.plantId} className="flex justify-between items-center bg-amber-50/50 border border-slate-400 p-2 rounded-lg text-sm">
                                            <div>
                                                <span className="font-bold text-slate-900">{t(`plant.${mp.plantId}.name`, pl?.name)}</span>
                                                <span className="text-xs block text-slate-600">💰 {mp.cost} Altın | Stok: {mp.stock} | 📅 {mp.availableDay ?? 1}. Gün</span>
                                            </div>
                                            <button onClick={() => handleRemoveMarketPlant(mp.plantId)} className="bg-red-800 text-white text-xs px-2.5 py-1 rounded border-2 border-black font-bold font-magic">Kaldır</button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* PAZAR İKSİR FORMÜLLERİ FORMU & LİSTESİ */}
                    <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
                        <h2 className="text-2xl font-bold font-magic text-slate-900 border-b-2 border-slate-900/20 pb-2">📜 Pazara Formül (Ürün) Ekle</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold block mb-1">İksir Seçin</label>
                                <select className="w-full bg-amber-50 border-2 border-slate-900 p-2 rounded-lg font-bold" value={selectedMarketPotionId} onChange={e => setSelectedMarketPotionId(e.target.value)}>
                                    <option value="">Seçiniz...</option>
                                    {gameData.potions.map(p => <option key={p.id} value={p.id}>{t(`potion.${p.id}.name`, p.name)}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="text-xs font-bold block mb-1">Formül Fiyatı</label>
                                    <input type="number" className="w-full bg-amber-50 border-2 border-slate-900 p-2 rounded-lg font-bold" value={marketPotionCost} onChange={e => setMarketPotionCost(Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold block mb-1">Stok Miktarı</label>
                                    <input type="number" className="w-full bg-amber-50 border-2 border-slate-900 p-2 rounded-lg font-bold" value={marketPotionStock} onChange={e => setMarketPotionStock(Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold block mb-1">Açılacağı Gün</label>
                                    <input type="number" className="w-full bg-amber-50 border-2 border-slate-900 p-2 rounded-lg font-bold text-indigo-900" value={marketPotionDay} onChange={e => setMarketPotionDay(Number(e.target.value))} />
                                </div>
                            </div>
                            <button onClick={handleAddMarketRecipe} className="w-full bg-purple-500 font-bold py-3 rounded-xl border-4 border-black text-white font-magic">Formülü Markete Tanımla</button>
                        </div>

                        <div className="pt-4 border-t-2 border-slate-900/10">
                            <h3 className="font-bold font-magic text-slate-900 mb-2">Pazarda Satışta Olan İksir Formülleri:</h3>
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                {(gameData.marketRecipes || []).map(mr => {
                                    const pot = gameData.potions.find(p => p.id === mr.potionId);
                                    return (
                                        <div key={mr.potionId} className="flex justify-between items-center bg-purple-50/50 border border-slate-400 p-2 rounded-lg text-sm">
                                            <div>
                                                <span className="font-bold text-purple-900">{t(`potion.${mr.potionId}.name`, pot?.name)} Formülü</span>
                                                <span className="text-xs block text-slate-600">💰 {mr.cost} Altın | Stok: {mr.stock} | 📅 {mr.availableDay ?? 1}. Gün</span>
                                            </div>
                                            <button onClick={() => handleRemoveMarketRecipe(mr.potionId)} className="bg-red-800 text-white text-xs px-2.5 py-1 rounded border-2 border-black font-bold font-magic">Kaldır</button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                </div>
            )}

            {activeTab === 'dialogueEditor' && (
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-[750px]">
                    <div className="bg-[#f3e8d2] p-4 rounded-2xl border-4 border-slate-900 overflow-y-auto">
                        <h2 className="text-2xl font-bold font-magic mb-4">👥 Karakterler</h2>
                        <div className="space-y-2 flex-1">
                            {gameData.storylines.map(story => (
                                <button key={story.id} onClick={() => setActiveEditorStoryId(story.id)} className={`w-full text-left p-3 rounded-xl border-2 ${activeEditorStoryId === story.id ? 'bg-[#dfd1b3]' : 'bg-amber-50/50'}`}>
                                    {story.characterName}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="xl:col-span-3 bg-[#e9dbbe] border-4 border-slate-900 rounded-2xl flex flex-col relative">
                        <div className="flex-1 overflow-auto p-8 relative">
                            {currentStory && currentStory.nodes.length > 0 ? renderVisualNode(currentStory, currentStory.nodes[0].id) : "Boş..."}
                        </div>
                        <div className="bg-[#f3e8d2] border-t-4 border-slate-900 p-4">
                            {selectedNodeId ? (
                                <div className="space-y-3 bg-[#e9dbbe] p-4 rounded-xl border-2 border-slate-900 overflow-y-auto max-h-[500px]">
                                    <div className="flex justify-between items-center border-b border-slate-900/10 pb-2">
                                        <h3 className="font-bold font-magic text-sm">#{selectedNodeId} için Seçenek Ekle</h3>
                                        <button onClick={() => setSelectedNodeId(null)} className="font-bold text-red-800">✕</button>
                                    </div>

                                    <div className="space-y-2 text-xs">
                                        <div>
                                            <label className="font-bold block mb-1">Seçenek Metni (Görünen Buton Metni):</label>
                                            <input className="w-full border-2 border-slate-900 rounded p-1.5 font-bold" placeholder="Örn: Alkarısı Savar İksirini Al" value={newChoice.text} onChange={e => setNewChoice({...newChoice, text: e.target.value})} />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="font-bold block mb-1">Hedef Düğüm ID'si:</label>
                                                <input className="w-full border-2 border-slate-900 rounded p-1.5 font-mono" placeholder="node_baran_reconciled" value={newChoice.nextNodeId} onChange={e => setNewChoice({...newChoice, nextNodeId: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="font-bold block mb-1">Gecikme Günü (delayDays):</label>
                                                <input type="number" className="w-full border-2 border-slate-900 rounded p-1.5" value={newChoice.delayDays} onChange={e => setNewChoice({...newChoice, delayDays: Number(e.target.value)})} />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 py-1 bg-amber-50 p-2 rounded border border-slate-400">
                                            <input type="checkbox" id="autoCreateCheckbox" checked={newChoice.autoCreateNode} onChange={e => setNewChoice({...newChoice, autoCreateNode: e.target.checked})} />
                                            <label htmlFor="autoCreateCheckbox" className="font-bold cursor-pointer text-slate-800">Yeni bir sonraki düğüm otomatik oluşturulsun</label>
                                        </div>

                                        {/* GEREKSİNİMLER (REQUIREMENTS) */}
                                        <div className="border-t border-slate-900/15 pt-2 mt-2">
                                            <span className="font-bold text-red-900 font-magic block mb-2">🔴 Gereksinimler (Bizden Tüketilecekler)</span>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                {/* Altın */}
                                                <div className="bg-red-50/50 p-2 rounded border border-red-200">
                                                    <label className="font-bold block mb-1 text-red-955">Gereken Altın:</label>
                                                    <input type="number" className="w-full border border-slate-400 rounded p-1 text-xs" value={newChoice.reqGold} onChange={e => setNewChoice({...newChoice, reqGold: Number(e.target.value)})} />
                                                </div>
                                                {/* Bitki */}
                                                <div className="bg-red-50/50 p-2 rounded border border-red-200">
                                                    <label className="font-bold block mb-1 text-red-955">Gereken Bitki:</label>
                                                    <select className="w-full border border-slate-400 rounded p-1 bg-white text-xs font-bold" value={newChoice.reqPlant} onChange={e => setNewChoice({...newChoice, reqPlant: e.target.value})}>
                                                        <option value="">Yok...</option>
                                                        {gameData.plants.map(p => <option key={p.id} value={p.id}>{t(`plant.${p.id}.name`, p.name)}</option>)}
                                                    </select>
                                                    {newChoice.reqPlant && (
                                                        <div className="mt-1">
                                                            <label className="text-[10px] block">Miktar:</label>
                                                            <input type="number" className="w-full border border-slate-400 rounded p-0.5 text-[10px]" value={newChoice.reqPlantCount} onChange={e => setNewChoice({...newChoice, reqPlantCount: Number(e.target.value)})} />
                                                        </div>
                                                    )}
                                                </div>
                                                {/* İksir */}
                                                <div className="bg-red-50/50 p-2 rounded border border-red-200">
                                                    <label className="font-bold block mb-1 text-red-955">Gereken İksir:</label>
                                                    <select className="w-full border border-slate-400 rounded p-1 bg-white text-xs font-bold" value={newChoice.reqPotion} onChange={e => setNewChoice({...newChoice, reqPotion: e.target.value})}>
                                                        <option value="">Yok...</option>
                                                        {gameData.potions.map(p => <option key={p.id} value={p.id}>{t(`potion.${p.id}.name`, p.name)}</option>)}
                                                    </select>
                                                    {newChoice.reqPotion && (
                                                        <div className="mt-1">
                                                            <label className="text-[10px] block">Miktar:</label>
                                                            <input type="number" className="w-full border border-slate-400 rounded p-0.5 text-[10px]" value={newChoice.reqPotionCount} onChange={e => setNewChoice({...newChoice, reqPotionCount: Number(e.target.value)})} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* ÖDÜLLER (REWARDS) */}
                                        <div className="border-t border-slate-900/15 pt-2 mt-2">
                                            <span className="font-bold text-emerald-900 font-magic block mb-2">🟢 Ödüller (Bize Verilecekler)</span>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                {/* Altın */}
                                                <div className="bg-emerald-50/50 p-2 rounded border border-emerald-200">
                                                    <label className="font-bold block mb-1 text-emerald-955">Ödül Altın:</label>
                                                    <input type="number" className="w-full border border-slate-400 rounded p-1 text-xs" value={newChoice.rewardGold} onChange={e => setNewChoice({...newChoice, rewardGold: Number(e.target.value)})} />
                                                </div>
                                                {/* Bitki */}
                                                <div className="bg-emerald-50/50 p-2 rounded border border-emerald-200">
                                                    <label className="font-bold block mb-1 text-emerald-955">Ödül Bitki:</label>
                                                    <select className="w-full border border-slate-400 rounded p-1 bg-white text-xs font-bold" value={newChoice.rewardPlantId} onChange={e => setNewChoice({...newChoice, rewardPlantId: e.target.value})}>
                                                        <option value="">Yok...</option>
                                                        {gameData.plants.map(p => <option key={p.id} value={p.id}>{t(`plant.${p.id}.name`, p.name)}</option>)}
                                                    </select>
                                                    {newChoice.rewardPlantId && (
                                                        <div className="mt-1">
                                                            <label className="text-[10px] block">Miktar:</label>
                                                            <input type="number" className="w-full border border-slate-400 rounded p-0.5 text-[10px]" value={newChoice.rewardPlantCount} onChange={e => setNewChoice({...newChoice, rewardPlantCount: Number(e.target.value)})} />
                                                        </div>
                                                    )}
                                                </div>
                                                {/* İksir */}
                                                <div className="bg-emerald-50/50 p-2 rounded border border-emerald-200">
                                                    <label className="font-bold block mb-1 text-emerald-955">Ödül İksir:</label>
                                                    <select className="w-full border border-slate-400 rounded p-1 bg-white text-xs font-bold" value={newChoice.rewardPotionId} onChange={e => setNewChoice({...newChoice, rewardPotionId: e.target.value})}>
                                                        <option value="">Yok...</option>
                                                        {gameData.potions.map(p => <option key={p.id} value={p.id}>{t(`potion.${p.id}.name`, p.name)}</option>)}
                                                    </select>
                                                    {newChoice.rewardPotionId && (
                                                        <div className="mt-1">
                                                            <label className="text-[10px] block">Miktar:</label>
                                                            <input type="number" className="w-full border border-slate-400 rounded p-0.5 text-[10px]" value={newChoice.rewardPotionCount} onChange={e => setNewChoice({...newChoice, rewardPotionCount: Number(e.target.value)})} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                    </div>

                                    <button onClick={() => handleAddChoiceToNodeAdv(selectedNodeId!)} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-955 font-bold font-magic py-2 rounded-xl border-4 border-slate-900 mt-2">Seçeneği Düğüme Ekle</button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-4">
                                    <input className="border-2 p-2" placeholder="Node ID" value={newNode.id} onChange={e => setNewNode({...newNode, id: e.target.value})} />
                                    <input className="border-2 p-2" placeholder="NPC Text" value={newNode.npcText} onChange={e => setNewNode({...newNode, npcText: e.target.value})} />
                                    <button onClick={handleAddNodeToStory} className="bg-indigo-600 text-white rounded-xl">Boş Düğüm Ekle</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'translationEditor' && (
                <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    <h2 className="text-2xl font-bold font-magic">🌍 Dil & Lokalizasyon</h2>
                    <div className="border-4 border-slate-900 rounded-2xl bg-amber-50 mt-4 max-h-[400px] overflow-y-auto">
                        <table className="w-full text-left text-sm font-bold">
                            <thead className="bg-[#2a131b] text-amber-100 border-b-4 border-slate-900">
                            <tr><th className="p-3">Key</th><th className="p-3">TR</th><th className="p-3">EN</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-900/10">
                            {getAllLocalesKeys().map(key => (
                                <tr key={key}>
                                    <td className="p-2 font-mono text-xs">{key}</td>
                                    <td className="p-2"><input type="text" className="w-full bg-amber-50 border p-1" value={gameData.translations.tr[key] || ''} onChange={e => handleTranslateChange('tr', key, e.target.value)} /></td>
                                    <td className="p-2"><input type="text" className="w-full bg-amber-50 border p-1" value={gameData.translations.en[key] || ''} onChange={e => handleTranslateChange('en', key, e.target.value)} /></td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'jsonHub' && (
                <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
                    <h2 className="text-2xl font-bold font-magic">📂 JSON Motoru</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <textarea readOnly className="h-80 bg-slate-900 text-green-400 p-3 rounded-xl font-mono text-xs" value={JSON.stringify(gameData, null, 2)}/>
                        <div className="space-y-3">
                            <textarea className="w-full h-56 bg-slate-100 p-3 rounded-xl border-2 font-mono text-xs" placeholder='{"plants": [], ...}' value={importText} onChange={e => setImportText(e.target.value)}/>
                            <button onClick={handleImportJSON} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl border-4 border-black">JSON Yükle</button>
                            {importStatus && <div className="p-2 bg-amber-50 border-2">{importStatus}</div>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface PortalScreenProps {
    setAppMode: React.Dispatch<React.SetStateAction<string>>;
    setActiveTab: React.Dispatch<React.SetStateAction<string>>;
    language: string;
}

const PortalScreen: React.FC<PortalScreenProps> = ({ setAppMode, setActiveTab, language }) => (
    <div className="min-h-screen bg-[#1c0f13] text-[#f3e8d2] flex items-center justify-center p-4 md:p-8">
        <div className="max-w-xl w-full bg-[#2a131b] border-8 border-slate-900 p-8 rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-amber-500 to-red-800"></div>
            <img src="FireBreatherIcon.png" alt="Wizard Advisor" className="w-32 h-32 rounded-full border-4 border-amber-500 shadow-xl object-cover mx-auto bg-slate-950 transform hover:scale-105 animate-idle-float"/>
            <div className="space-y-2">
                <h1 className="text-4xl md:text-5xl font-bold font-magic text-amber-400">Simyacı & Şifacı</h1>
                <p className="font-parchment text-lg text-amber-100/70">{language === 'en' ? 'Büyü Mirası World Portal' : 'Büyü Mirası ve Döngüsü Portal'}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 pt-4 font-parchment">
                <button onClick={() => { setAppMode('client'); setActiveTab('shopArea'); }} className="group p-5 rounded-2xl border-4 border-black bg-amber-500 hover:bg-amber-400 text-slate-955 font-bold text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 active:translate-y-1 active:shadow-none text-left flex items-center justify-between">
                    <div><span className="font-magic block text-lg">🏪 Oyuna Gir</span></div><span className="text-2xl group-hover:translate-x-1">➡️</span>
                </button>
                <button onClick={() => { setAppMode('studio'); }} className="group p-5 rounded-2xl border-4 border-black bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 active:translate-y-1 active:shadow-none text-left flex items-center justify-between">
                    <div><span className="font-magic block text-lg">🧙‍♂️ Geliştirici Stüdyosu</span></div><span className="text-2xl group-hover:translate-x-1">➡️</span>
                </button>
            </div>
        </div>
    </div>
);

// ============================================================================
// BÖLÜM 3: ANA APP BİLEŞENİ (STATE VE HANDLER MERKEZİ)
// ============================================================================

export default function App(): React.JSX.Element {
    const [appMode, setAppMode] = useState<string>('portal');
    const [activeTab, setActiveTab] = useState<string>('shopArea');
    const [gameData, setGameData] = useState<GameData | null>(null); // Başlangıçta boş (null) bırakıyoruz
    const [isLoading, setIsLoading] = useState<boolean>(true); // Yüklenme durumu için yeni state
    const [language, setLanguage] = useState<string>('tr');
    const [playerState, setPlayerState] = useState<PlayerState>({ gold: 200, rentDebt: 0, inventory: { plants: { 'p_demir_ardic': 4, 'p_gumus_kok': 1, 'p_isildak_otu': 2, 'p_kara_kabuk': 3 }, potions: { 'pot_alkarisi_savar': 1 } }, knownPotions: ['pot_alkarisi_savar'] });
    const [cauldron, setCauldron] = useState<CauldronItem[]>([]);
    const [brewState, setBrewState] = useState<BrewState>({ status: 'idle', message: '' });
    const [treatmentBench, setTreatmentBench] = useState<TreatmentBenchItem[]>([]);
    const [treatmentStatus, setTreatmentStatus] = useState<TreatmentStatus>({ type: '', message: '' });
    const [gameState, setGameState] = useState<GameState>({ day: 1, currentCustomer: null, rentPaidThisWeek: false, storyProgress: { 'story_baran': { currentNodeId: 'node_baran_1', availableDay: 1 }, 'story_landlord': { currentNodeId: 'node_landlord_demand', availableDay: 7 } }, logs: ['🧙‍♂️ Kulübeye hoş geldin şifacı!'] });
    const [rentPopup, setRentPopup] = useState<RentPopup>({ show: false, message: '' });

    // Bileşen ilk yüklendiğinde JSON verisini çek
    useEffect(() => {
        fetch('/assets/gameData.json')
            .then(response => {
                if (!response.ok) throw new Error("Ağ hatası veya dosya bulunamadı");

                // Gelen yanıtın Content-Type başlığını kontrol ediyoruz.
                // Dosya bulunamadığında SPA sunucusu index.html döndürürse (HTML içeriği), bunu reddedip catch bloğuna fırlatıyoruz.
                const contentType = response.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    throw new TypeError("Uups, beklenen JSON verisi alınamadı! Dosya eksik olabilir veya sunucu index.html döndürdü.");
                }

                return response.json();
            })
            .then(data => {
                setGameData(data);
                setIsLoading(false);
            })
            .catch(error => {
                console.warn("Yerel assets/gameData.json okunamadı, varsayılan (INITIAL_DATA) yükleniyor.", error);
                setGameData(INITIAL_DATA);
                setIsLoading(false);
            });
    }, []);

    const t = (key: string, fallback: string = ""): string => gameData?.translations[language]?.[key] || gameData?.translations['tr']?.[key] || fallback || key;
    const addLog = (msg: string): void => setGameState(prev => ({ ...prev, logs: [msg, ...prev.logs].slice(0, 5) }));

    // HANDLERS (Oyun Mantığı)
    const handleEndDay = (): void => {
        let rentOverdue = false;
        let nextRentDebt = playerState.rentDebt;
        if (gameState.day % 7 === 0 && !gameState.rentPaidThisWeek) { nextRentDebt += 100; rentOverdue = true; }
        if (rentOverdue) setPlayerState(prev => ({ ...prev, rentDebt: nextRentDebt }));

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
        const availableStories = Object.entries(gameState.storyProgress).filter(([_, prog]) => prog.currentNodeId !== 'END' && prog.availableDay <= gameState.day).map(([sId, prog]) => ({ storyId: sId, nodeId: prog.currentNodeId }));
        if (availableStories.length === 0) {
            addLog(language === 'en' ? 'Nobody is visiting.' : 'Şu an gelecek kimse yok.');
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

        // Gereksinim Stok/Bakiye Kontrolü (Hata Koruma)
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

        // Eksiltmeler
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

        // Ödüller
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
        if (choice.nextNodeId) {
            updProgress[storyId] = { currentNodeId: choice.nextNodeId, availableDay: gameState.day + (choice.delayDays || 0) };
            setGameState(prev => ({ ...prev, storyProgress: updProgress, currentCustomer: (choice.delayDays || 0) > 0 ? null : { storyId, nodeId: choice.nextNodeId as string } }));
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

        const targetNode = success ? activeNode.dynamicSuccessNodeId : activeNode.dynamicFailNodeId;
        setGameState(prev => ({ ...prev, storyProgress: { ...prev.storyProgress, [activeStory.id]: { currentNodeId: targetNode || 'END', availableDay: prev.day } }, currentCustomer: targetNode ? { storyId: activeStory.id, nodeId: targetNode } : null }));
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

    // Eğer veriler henüz yüklenmediyse kullanıcıya bir yüklenme ekranı gösteriyoruz
    if (isLoading || !gameData) {
        return (
            <div className="min-h-screen bg-[#1c0f13] flex items-center justify-center">
                <span className="text-amber-500 font-magic text-2xl animate-pulse">⚗️ Kadim Parşömenler Okunuyor... (Veri Yükleniyor)</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#1c0f13] text-[#f3e8d2]">
            {appMode === 'portal' && <PortalScreen setAppMode={setAppMode} setActiveTab={setActiveTab} language={language} />}
            {appMode === 'client' && <div className="p-4 md:p-8 max-w-6xl mx-auto"><GameClient gameData={gameData} gameState={gameState} playerState={playerState} cauldron={cauldron} brewState={brewState} treatmentBench={treatmentBench} treatmentStatus={treatmentStatus} language={language} setLanguage={setLanguage} setAppMode={setAppMode} activeTab={activeTab} setActiveTab={setActiveTab} t={t} handlers={handlers} /></div>}
            {appMode === 'studio' && <div className="p-4 md:p-8 max-w-6xl mx-auto"><DeveloperStudio gameData={gameData} setGameData={setGameData} setGameState={setGameState} setPlayerState={setPlayerState} setAppMode={setAppMode} t={t} /></div>}

            {rentPopup.show && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center font-parchment">
                    <div className="bg-[#f3e8d2] text-slate-955 border-4 border-red-800 rounded-3xl p-8 max-w-md shadow-2xl text-center space-y-4 mx-4">
                        <h3 className="text-2xl font-bold font-magic text-red-900">{t('ui.rent_popup_title')}</h3>
                        <p className="text-lg text-slate-900">{rentPopup.message}</p>
                        <button onClick={() => setRentPopup({ show: false, message: '' })} className="bg-red-800 text-white font-magic p-3 rounded-xl">İmzala</button>
                    </div>
                </div>
            )}
        </div>
    );
}