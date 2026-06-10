import React from 'react';
import { useAlchemyGame } from './hooks/useAlchemyGame';
import { PortalScreen } from './components/Portal/PortalScreen';
import { IntroScreen } from './components/Intro/IntroScreen';
import { GameClient } from './components/GameClient';
import { AdminPanel } from './components/Admin/AdminPanel';
import { getValidImageUrl } from './utils/helpers';

// Global Stiller
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
  
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;
document.head.appendChild(styleTag);

export default function App(): React.JSX.Element {
    const {
        appMode, setAppMode, activeTab, setActiveTab, gameData, setGameData, isLoading, language, setLanguage,
        playerState, cauldron, brewState, treatmentBench, treatmentStatus, gameState, setGameState,
        rentPopup, setRentPopup, newsPopup, setNewsPopup, introPageIndex, setIntroPageIndex, hasSave, savedMeta,
        currentTrackIndex, isMuted, setIsMuted, changeTrack, t, handlers, handleContinueGame, handleNewGame
    } = useAlchemyGame();

    if (isLoading || !gameData) {
        return (
            <div className="min-h-screen bg-[#1c0f13] flex items-center justify-center">
                <span className="text-amber-500 font-magic text-2xl animate-pulse">⚗️ Kadim Parşömenler Okunuyor...</span>
            </div>
        );
    }

    const getActiveEndPage = () => {
        if (!gameData.gameEndSettings?.pages) return null;
        // Önce tetiklenen olaylarla eşleşen bir sayfa var mı bak
        const triggeredPage = gameData.gameEndSettings.pages.find(p => 
            p.eventId && (gameState.triggeredEvents || []).includes(p.eventId)
        );
        if (triggeredPage) return triggeredPage;
        // Yoksa varsayılan sayfayı döndür
        return gameData.gameEndSettings.pages.find(p => p.isDefault) || gameData.gameEndSettings.pages[0];
    };
    const activeEndPage = getActiveEndPage();

    return (
        <div className="min-h-screen bg-[#1c0f13] text-[#f3e8d2]">
            {appMode === 'portal' && (
                <PortalScreen
                    setAppMode={setAppMode}
                    language={language}
                    hasSave={hasSave}
                    savedMeta={savedMeta}
                    handleContinueGame={handleContinueGame}
                    handleNewGame={handleNewGame}
                />
            )}
            
            {appMode === 'intro' && (
                <IntroScreen 
                    gameData={gameData} 
                    pageIndex={introPageIndex} 
                    setPageIndex={setIntroPageIndex} 
                    setAppMode={setAppMode} 
                    language={language} 
                    t={t} 
                />
            )}

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
                    <AdminPanel
                        gameData={gameData}
                        setGameData={setGameData}
                        setGameState={setGameState}
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

            {gameState.isGameOver && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[60] flex items-center justify-center font-parchment text-[#f3e8d2] p-4">
                    <div className="bg-[#1c0f13] border-8 border-amber-900 rounded-[3rem] p-10 max-w-2xl w-full shadow-[0_0_50px_rgba(120,50,20,0.5)] text-center space-y-8 animate-idle-float border-double">
                        <div className="space-y-2">
                            <h2 className="text-5xl font-magic text-amber-500 tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">GAME END</h2>
                            <div className="h-1 w-48 bg-gradient-to-r from-transparent via-amber-700 to-transparent mx-auto"></div>
                        </div>
                        
                        <p className="text-2xl italic leading-relaxed text-amber-100/90">
                            "{activeEndPage?.endText || 'Tebrikler, hikayen tamamlandı!'}"
                        </p>

                        {activeEndPage?.adImagePath && (
                            <div className="relative group mx-auto max-w-xs">
                                <div className="absolute -inset-2 bg-gradient-to-r from-amber-900 to-yellow-900 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                                <img 
                                    src={getValidImageUrl(activeEndPage.adImagePath)} 
                                    alt="Recommended Game" 
                                    className="relative rounded-xl border-4 border-amber-900 shadow-2xl w-full h-auto object-cover"
                                    onError={(e) => { (e.target as any).style.display = 'none' }}
                                />
                            </div>
                        )}

                        <div className="pt-4 flex flex-col gap-4 items-center">
                            {activeEndPage?.adLink && (
                                <a 
                                    href={activeEndPage.adLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-block bg-amber-900 hover:bg-amber-800 text-amber-100 font-magic font-bold text-xl px-8 py-4 rounded-2xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-y-1"
                                >
                                    Diğer Oyunlarımıza Göz At ➔
                                </a>
                            )}
                            
                            <button 
                                onClick={() => {
                                    setGameState(prev => ({ ...prev, isGameOver: false }));
                                    setAppMode('portal');
                                }}
                                className="text-amber-500/60 hover:text-amber-500 font-magic transition-colors underline underline-offset-8"
                            >
                                Ana Menüye Dön
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
