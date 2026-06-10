import React from 'react';
import { GameData, GameState, PlayerState, CauldronItem, BrewState, TreatmentBenchItem, TreatmentStatus, GameHandlers } from '../types';
import { ShopArea } from './Shop/ShopArea';
import { AlchemyArea } from './Alchemy/AlchemyArea';
import { MarketArea } from './Market/MarketArea';

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

export function GameClient({
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
                    { id: 'shopArea', label: ` ${language === 'en' ? 'Counter Front' : 'Tezgah Önü'}`, color: 'bg-amber-500 text-slate-955' },
                    { id: 'alchemyArea', label: ` ${language === 'en' ? 'Alchemist Lab' : 'Simya Atölyesi'}`, color: 'bg-purple-600 text-white' },
                    { id: 'marketArea', label: ` ${language === 'en' ? 'Market' : 'Şehir Pazarı'}`, color: 'bg-emerald-600 text-white' }
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
