import React from 'react';
import { GameData, PlayerState, GameHandlers } from '../../types';
import { TooltipPlant, TooltipPotion } from '../Shared/Tooltips';

interface MarketAreaProps {
    gameData: GameData;
    t: (key: string, fallback?: string) => string;
    handlers: GameHandlers;
    currentDay: number;
    playerState: PlayerState;
}

export function MarketArea({ gameData, t, handlers, currentDay, playerState }: MarketAreaProps): React.JSX.Element {
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
                            const potionName = potion ? t(`potion.${potion.id}.name`, potion.name) : `Bilinmeyen Tarif (${mr.potionId})`;
                            const alreadyKnown = playerState.knownPotions.includes(mr.potionId);
                            
                            return (
                                <div key={mr.potionId} className="relative group bg-purple-100/50 p-4 rounded-xl border-2 border-slate-900 flex justify-between items-center cursor-help">
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl">📜</span>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-955">{potionName} Formülü</h3>
                                            <p className="text-sm font-bold text-red-900 font-magic">{mr.cost} {t('ui.gold')}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handlers.handleBuyRecipe(mr.potionId, mr.cost)}
                                        disabled={mr.stock <= 0 || alreadyKnown || !potion}
                                        className="bg-purple-500 text-white font-bold border-2 border-black px-4 py-1.5 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                                    >
                                        {!potion ? "Hata" : (alreadyKnown ? "Biliyorsun" : `${t('ui.buy')}`)}
                                    </button>
                                    {potion && <TooltipPotion potionId={mr.potionId} gameData={gameData} t={t} />}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
