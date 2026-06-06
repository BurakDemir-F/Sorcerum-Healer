import React from 'react';
import { GameData } from '../../types';
import { getHerbCuredSymptoms, getPotionCuresDetails } from '../../utils/helpers';

interface TooltipPlantProps {
    plantId: string;
    gameData: GameData;
    t: (key: string, fallback?: string) => string;
}

export function TooltipPlant({ plantId, gameData, t }: TooltipPlantProps): React.JSX.Element | null {
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

export function TooltipPotion({ potionId, gameData, t }: TooltipPotionProps): React.JSX.Element | null {
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
