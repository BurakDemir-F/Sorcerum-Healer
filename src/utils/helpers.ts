import { GameData } from '../types';

export const getHerbCuredSymptoms = (plantId: string, gameData: GameData): string[] => {
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

export const getPotionCuresDetails = (potionId: string, gameData: GameData, t: (key: string, fallback?: string) => string): string[] => {
    const potion = gameData.potions.find(p => p.id === potionId);
    if (!potion) return [];
    return potion.curesDiseaseIds.map(dId => {
        const d = gameData.diseases.find(dis => dis.id === dId);
        return d ? `${t(`disease.${d.id}.name`, d.name)} (${d.symptoms.map(s => t(`symptom.${s}`, s)).join(', ')})` : '';
    }).filter(Boolean);
};

export const isImageUrl = (url: string): boolean => {
    if (!url) return false;
    const normalized = url.toLowerCase().trim();
    return normalized.startsWith('http') ||
        normalized.startsWith('/') ||
        normalized.startsWith('assets/') ||
        normalized.startsWith('./assets') ||
        /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(normalized);
};

export const getValidImageUrl = (url: string): string => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('/')) return url;
    if (url.startsWith('assets/')) return '/' + url;
    if (url.startsWith('./assets/')) return url.substring(1); // . kısmını at
    return url;
};
