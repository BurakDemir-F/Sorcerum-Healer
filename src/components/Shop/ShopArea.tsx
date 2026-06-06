import React from 'react';
import { GameState, PlayerState, GameData, GameHandlers, TreatmentBenchItem, TreatmentStatus, StoryNode, Storyline } from '../../types';
import { SidePanel } from '../Layout/SidePanel';
import { TooltipPlant, TooltipPotion } from '../Shared/Tooltips';
import { isImageUrl } from '../../utils/helpers';

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

export function ShopArea({ gameState, playerState, gameData, language, t, handlers, treatmentBench, treatmentStatus }: ShopAreaProps): React.JSX.Element {
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
                        <h2 className="text-3xl font-bold font-magic text-slate-900 flex items-center gap-2">🚪 Tezgah</h2>
                        {!activeNode && (
                            <button
                                onClick={handlers.handleEndDay}
                                disabled={gameState.queuedCustomers.length > 0 || gameState.waitingCustomers.length > 0}
                                title={(gameState.queuedCustomers.length > 0 || gameState.waitingCustomers.length > 0) ? t('ui.finish_business') : ''}
                                className={`bg-red-800 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg border-2 border-black font-magic text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all ${(gameState.queuedCustomers.length > 0 || gameState.waitingCustomers.length > 0) ? 'opacity-50 grayscale cursor-not-allowed' : 'active:translate-y-1 active:shadow-none'}`}
                            >
                                🌙 {t('ui.end_day')}
                            </button>
                        )}
                    </div>

                    {!activeNode ? (
                        <div className="text-center py-12 bg-amber-100/50 rounded-xl border-2 border-dashed border-slate-800">
                            <p className="text-slate-700 text-xl mb-6">
                                {gameState.queuedCustomers.length > 0 
                                    ? t('ui.customer_approaching') 
                                    : t('ui.door_quiet')}
                            </p>
                            <div className="relative inline-block">
                                <button
                                    onClick={handlers.handleCallCustomer}
                                    disabled={gameState.waitingCustomers.length === 0}
                                    className={`bg-amber-500 hover:bg-amber-400 text-slate-955 font-magic font-bold py-4 px-10 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-xl transition-all ${gameState.waitingCustomers.length === 0 ? 'opacity-50 grayscale cursor-not-allowed scale-95' : 'active:translate-y-1 active:shadow-none hover:-translate-y-1'}`}
                                >
                                    🚪 {t('ui.call_customer')}
                                </button>
                                {gameState.waitingCustomers.length > 0 && (
                                    <span className="absolute -top-3 -right-3 bg-red-600 text-white text-sm font-bold w-8 h-8 rounded-full border-4 border-black flex items-center justify-center shadow-lg animate-bounce">
                                        {gameState.waitingCustomers.length}
                                    </span>
                                )}
                            </div>
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
