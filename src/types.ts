export interface PlantProperty {
    name: string;
    curesSymptoms: string[];
}

export interface Plant {
    id: string;
    name: string;
    rarity: string;
    cost: number;
    properties: string[];
    imageUrl: string;
}

export interface Disease {
    id: string;
    name: string;
    symptoms: string[];
}

export interface Ingredient {
    type: 'plant' | 'potion';
    id: string;
    count: number;
}

export interface Potion {
    id: string;
    name: string;
    ingredients: Ingredient[];
    curesDiseaseIds: string[];
    sellPrice: number;
    imageUrl?: string;
}

export interface GameEvent {
    id: string;
    text: string;
}

export interface Choice {
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
    isTreatmentChoice?: boolean;
    triggeredNewsId?: string;
    triggeredEventId?: string;
}

export interface StoryNode {
    id: string;
    npcText: string;
    diseaseId?: string;
    dynamicSuccessNodeId?: string;
    dynamicFailNodeId?: string;
    choices: Choice[];
    day?: number; // Düğüm seviyesinde tetiklenme gün gereksinimi
    requiredEventId?: string;
}

export interface Storyline {
    id: string;
    characterName: string;
    description?: string; // Karakterin arka plan hikayesi / açıklaması
    avatarUrl: string;
    nodes: StoryNode[];
}

export interface MarketPlant {
    plantId: string;
    stock: number;
    maxStock: number;
    cost: number;
    availableDay?: number; // Gün bazlı market listelemesi için eklendi
}

export interface MarketRecipe {
    potionId: string;
    cost: number;
    stock: number;
    maxStock: number;
    availableDay?: number; // Gün bazlı market listelemesi için eklendi
}

export interface IntroPage {
    id: string;
    title: string;
    text: string;
    imageUrl?: string;
}

export interface Soundtrack {
    id: string;
    title: string;
    path: string;
}

export interface NewsItem {
    id: string;
    day: number;
    text: string;
}

export interface GameEndSettings {
    endText: string;
    adLink: string;
    adImagePath: string;
}

export interface InitialPlayerState {
    gold: number;
    inventory: {
        plants: Record<string, number>;
        potions: Record<string, number>;
    };
    knownPotions: string[];
}

export type Translations = Record<string, Record<string, string>>;

export interface GameData {
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
    conditionalNews: NewsItem[]; // Şarta bağlı haberler
    events: GameEvent[]; // Oyun içi olaylar
    gameEndSettings: GameEndSettings;
    initialPlayerState: InitialPlayerState;
}

export interface PlayerState {
    gold: number;
    rentDebt: number;
    inventory: {
        plants: Record<string, number>;
        potions: Record<string, number>;
    };
    knownPotions: string[];
}

export interface CauldronItem {
    type: 'plant' | 'potion';
    id: string;
}

export interface BrewState {
    status: 'idle' | 'brewing' | 'success' | 'fail';
    message: string;
}

export interface TreatmentBenchItem {
    type: 'plant' | 'potion';
    id: string;
    name: string;
}

export interface TreatmentStatus {
    type: 'success' | 'fail' | '';
    message: string;
}

export interface StoryProgressItem {
    currentNodeId: string;
    availableDay: number;
}

export interface GameState {
    day: number;
    currentCustomer: { storyId: string; nodeId: string } | null;
    rentPaidThisWeek: boolean;
    storyProgress: Record<string, StoryProgressItem>;
    logs: string[];
    waitingCustomers: string[]; // Kapıda bekleyen müşteri storyId listesi
    queuedCustomers: string[];  // Gün içinde gelecek (zamanlanmış) müşteri storyId listesi
    isTreatmentChoiceSelected?: boolean; // Tedavi choice'u seçildi mi?
    triggeredConditionalNews: string[]; // Tetiklenmiş şarta bağlı haber ID'leri
    triggeredEvents: string[]; // Tetiklenmiş olay ID'leri
    isGameOver?: boolean;
}

export interface RentPopup {
    show: boolean;
    message: string;
}

export interface GameHandlers {
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
