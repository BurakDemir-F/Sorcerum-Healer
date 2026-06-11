import React, {useState} from 'react';
import {getValidImageUrl} from "../../utils/helpers.ts";
import { CrazyGamesService } from '../../services/crazyGamesServices';

interface PortalScreenProps {
    setAppMode: React.Dispatch<React.SetStateAction<string>>;
    language: string;
    hasSave: boolean;
    savedMeta: { day: number; gold: number } | null;
    handleContinueGame: () => void;
    handleNewGame: () => void;
}

export function PortalScreen({
                                 setAppMode, language,
                                 hasSave, savedMeta, handleContinueGame, handleNewGame
                             }: PortalScreenProps): React.JSX.Element {
    const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);

    const handleNewGameClick = () => {

        CrazyGamesService.startGameplay();

        if (hasSave) {
            // Kayıt varsa önce parchment stilinde onay modalı gösteriyoruz
            setShowConfirmReset(true);
        } else {
            handleNewGame();
        }
    };

    return (
        <div className="min-h-screen bg-[#1c0f13] text-[#f3e8d2] flex items-center justify-center p-4 md:p-8">
            <div
                className="max-xl w-full bg-[#2a131b] border-8 border-slate-900 p-8 rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] text-center relative overflow-hidden font-parchment">
                <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-amber-500 to-red-800"></div>
                <span
                    className="text-8xl block animate-idle-float transform hover:scale-110 flex justify-center items-center w-full h-48 ">
    <img
        src={getValidImageUrl('assets/logo.png')}
        alt="Logo"
        className="max-w-full max-h-full object-contain"
    />
</span>
                {/*<div className="space-y-2">*/}
                {/*    <h1 className="text-4xl md:text-5xl font-bold font-magic text-amber-400">Sorcerum Healer</h1>*/}
                {/*    /!*<p className="font-parchment text-lg text-amber-100/70">{language === 'en' ? 'Alchemist' : 'Alchemist'}</p>*!/*/}
                {/*</div>*/}

                <div className="grid grid-cols-1 gap-4 pt-4 font-parchment max-w-md mx-auto">
                    {/* Kayıt Varsa Devam Et Butonunu Göster */}
                    {hasSave && savedMeta && (
                        <button
                            onClick={handleContinueGame}
                            className="group p-5 rounded-2xl border-4 border-black bg-emerald-500 hover:bg-emerald-400 text-slate-955 font-bold text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 active:translate-y-1 active:shadow-none text-left flex items-center justify-between"
                        >
                            <div className="flex flex-col">
                                <span className="font-magic block text-lg">✨ Continue</span>
                                <span className="text-xs font-sans font-bold text-slate-900 block mt-0.5">
                                    {language === 'en'
                                        ? `Saved: Day ${savedMeta.day} | ${savedMeta.gold} Gold`
                                        : `Kayıtlı: ${savedMeta.day}. Gün | ${savedMeta.gold} Altın`}
                                </span>
                            </div>
                            <span className="text-2xl group-hover:translate-x-1">➡️</span>
                        </button>
                    )}

                    {/* Oyuna Başla / Yeni Oyun Butonu */}
                    <button
                        onClick={handleNewGameClick}
                        className={`group p-5 rounded-2xl border-4 border-black font-bold text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 active:translate-y-1 active:shadow-none text-left flex items-center justify-between ${
                            hasSave ? 'bg-amber-600 hover:bg-amber-500 text-[#f3e8d2]' : 'bg-amber-500 hover:bg-amber-400 text-slate-955'
                        }`}
                    >
                        <div className="flex flex-col">
                            <span className="font-magic block text-lg">
                                {hasSave
                                    ? (language === 'en' ? '🆕 Start New Game' : '🆕 Yeni Hikaye Başlat')
                                    : (language === 'en' ? '🏪 Start Journey' : '🏪 Oyuna Başla')
                                }
                            </span>
                            {hasSave && (
                                <span className="text-[10px] font-sans font-bold opacity-80 block mt-0.5">
                                    {language === 'en' ? 'Wipes existing save progress' : 'Mevcut ilerlemenizi sıfırlar'}
                                </span>
                            )}
                        </div>
                        <span className="text-2xl group-hover:translate-x-1">➡️</span>
                    </button>

                    {/* Geliştirici Stüdyosu Butonu (Sadece Geliştirme Modunda Görünür) */}
                    {import.meta.env.DEV && (
                        <button
                            onClick={() => {
                                setAppMode('studio');
                            }}
                            className="group p-5 rounded-2xl border-4 border-black bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 active:translate-y-1 active:shadow-none text-left flex items-center justify-between"
                        >
                            <div>
                                <span className="font-magic block text-lg">🧙‍♂️ Geliştirici Stüdyosu</span>
                            </div>
                            <span className="text-2xl group-hover:translate-x-1">➡️</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Custom Parchment Onay Modalı (Yeni Oyun Onayı) */}
            {showConfirmReset && savedMeta && (
                <div
                    className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center font-parchment text-slate-900">
                    <div
                        className="bg-[#f3e8d2] text-slate-955 border-8 border-red-800 rounded-3xl p-8 max-w-md shadow-2xl text-center space-y-6 mx-4 relative overflow-hidden">
                        <div
                            className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-800 to-amber-700"></div>
                        <h3 className="text-3xl font-bold font-magic text-red-900">⚠️ {language === 'en' ? 'Wipe Progress?' : 'Kaydı Sıfırla?'}</h3>

                        <div
                            className="bg-amber-50 p-4 rounded-xl border-2 border-slate-900/30 text-base leading-relaxed font-semibold">
                            {language === 'en' ? (
                                <>
                                    Are you sure you want to start a <strong>New Story</strong>?<br/>
                                    Your current
                                    progress <strong>(Day {savedMeta.day} with {savedMeta.gold} Gold)</strong> will be
                                    permanently deleted. This action cannot be undone!
                                </>
                            ) : (
                                <>
                                    Yeni bir <strong>Şifacı Mirası</strong> başlatmak istediğinize emin misiniz?<br/>
                                    Mevcut kaydınızda bulunan tüm ilerlemeler <strong>({savedMeta.day}.
                                    Gün, {savedMeta.gold} Altın)</strong> kalıcı olarak silinecektir!
                                </>
                            )}
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowConfirmReset(false)}
                                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-magic font-bold py-3 rounded-xl border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-sm"
                            >
                                {language === 'en' ? 'Cancel' : 'Vazgeç'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowConfirmReset(false);
                                    handleNewGame();
                                }}
                                className="flex-1 bg-red-800 hover:bg-red-700 text-white font-magic font-bold py-3 rounded-xl border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-sm animate-pulse"
                            >
                                {language === 'en' ? 'Yes, Reset!' : 'Evet, Sıfırla!'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
