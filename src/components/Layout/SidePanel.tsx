import React from 'react';
import { PlayerState, GameState, GameData } from '../../types';
import { TooltipPlant, TooltipPotion } from '../Shared/Tooltips';

interface SidePanelProps {
    playerState: PlayerState;
    gameState: GameState;
    gameData: GameData;
    t: (key: string, fallback?: string) => string;
    language: string;
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

export function SidePanel({ playerState, gameState, gameData, t, language }: SidePanelProps): React.JSX.Element {
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
