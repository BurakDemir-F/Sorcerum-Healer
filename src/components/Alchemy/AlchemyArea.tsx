import React from 'react';
import { PlayerState, GameData, CauldronItem, BrewState, GameHandlers } from '../../types';
import { TooltipPlant, TooltipPotion } from '../Shared/Tooltips';

interface AlchemyAreaProps {
    playerState: PlayerState;
    gameData: GameData;
    cauldron: CauldronItem[];
    brewState: BrewState;
    t: (key: string, fallback?: string) => string;
    handlers: GameHandlers;
    language: string;
}

export function AlchemyArea({ playerState, gameData, cauldron, brewState, t, handlers, language }: AlchemyAreaProps): React.JSX.Element {
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
