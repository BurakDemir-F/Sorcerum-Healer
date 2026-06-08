import React from 'react';
import { GameData, IntroPage } from '../../types';
import { isImageUrl, getValidImageUrl } from '../../utils/helpers';

interface IntroScreenProps {
    gameData: GameData;
    pageIndex: number;
    setPageIndex: React.Dispatch<React.SetStateAction<number>>;
    setAppMode: React.Dispatch<React.SetStateAction<string>>;
    language: string;
    t: (key: string, fallback?: string) => string;
}

export function IntroScreen({ gameData, pageIndex, setPageIndex, setAppMode, language, t }: IntroScreenProps): React.JSX.Element | null {
    const pages = gameData.introPages || [];
    if (pages.length === 0) {
        setAppMode('client');
        return null;
    }

    const currentPage = pages[pageIndex];
    const isFirstPage = pageIndex === 0;
    const isLastPage = pageIndex === pages.length - 1;

    const handleNext = () => {
        if (isLastPage) {
            setAppMode('client');
        } else {
            setPageIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (!isFirstPage) {
            setPageIndex(prev => prev - 1);
        }
    };

    return (
        <div className="min-h-screen bg-[#1c0f13] text-[#f3e8d2] flex items-center justify-center p-4 md:p-8">
            <div className="max-w-2xl w-full bg-[#2a131b] border-8 border-slate-900 p-8 rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] space-y-6 relative overflow-hidden font-parchment text-slate-800">
                <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-amber-500 to-red-800"></div>

                <button
                    onClick={() => setAppMode('client')}
                    className="absolute top-4 right-4 bg-red-800 hover:bg-red-700 text-white font-magic font-bold text-xs border-2 border-black px-3 py-1.5 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform active:translate-y-0.5"
                >
                    {language === 'en' ? 'Skip ➔' : 'Atla ➔'}
                </button>

                <div className="bg-[#f3e8d2] rounded-2xl p-6 md:p-8 border-4 border-slate-900 shadow-inner flex flex-col items-center space-y-6">
                    <h2 className="text-3xl font-magic text-red-900 text-center font-bold tracking-wide border-b-2 border-red-900/10 pb-2 w-full">
                        {t(`intro.title.${currentPage.id}`, currentPage.title)}
                    </h2>

                    {currentPage.imageUrl && isImageUrl(currentPage.imageUrl) ? (
                        <div className="w-64 h-48 bg-amber-55 rounded-2xl border-4 border-slate-900 overflow-hidden flex items-center justify-center p-2 shadow-lg animate-idle-float">
                            <img src={getValidImageUrl(currentPage.imageUrl)} alt="Hikaye Görseli" className="max-w-full max-h-full object-contain" />
                        </div>
                    ) : (
                        <div className="w-24 h-24 bg-[#dfd1b3] border-4 border-slate-900 rounded-full flex items-center justify-center text-5xl shadow-md animate-idle-float">
                            📖
                        </div>
                    )}

                    <p className="text-xl text-slate-900 font-semibold text-center italic leading-relaxed font-parchment max-w-lg">
                        {t(`intro.text.${currentPage.id}`, currentPage.text)}
                    </p>

                    <div className="text-xs font-sans font-bold text-slate-500">
                        {pageIndex + 1} / {pages.length}
                    </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                    <button
                        onClick={handlePrev}
                        disabled={isFirstPage}
                        className="bg-slate-800 text-white hover:bg-slate-700 font-magic font-bold px-6 py-2.5 rounded-xl border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] disabled:opacity-40 disabled:pointer-events-none transition-all active:translate-y-0.5"
                    >
                        {language === 'en' ? '◀ Back' : '◀ Geri'}
                    </button>

                    <button
                        onClick={handleNext}
                        className="bg-amber-500 text-slate-955 hover:bg-amber-400 font-magic font-bold px-8 py-2.5 rounded-xl border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-0.5"
                    >
                        {isLastPage
                            ? (language === 'en' ? 'Start Game ➔' : 'Oyuna Başla ➔')
                            : (language === 'en' ? 'Next ▶' : 'İleri ▶')}
                    </button>
                </div>
            </div>
        </div>
    );
}
