import { useState, useEffect, useRef } from 'react';
import { GameData, PlayerState, GameState, CauldronItem, BrewState, TreatmentBenchItem, TreatmentStatus, RentPopup, NewsItem, GameHandlers, Choice, StoryNode, Storyline, StoryProgressItem } from '../types';
import { INITIAL_DATA } from '../constants/initialData';
import gameDataJSON from '../assets/gameData.json';

export function useAlchemyGame() {
    const [appMode, setAppMode] = useState<string>('portal');
    const [activeTab, setActiveTab] = useState<string>('shopArea');
    const [gameData, setGameData] = useState<GameData>(gameDataJSON as any);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [language, setLanguage] = useState<string>('en');

    // Temel Oyun State'leri
    const [playerState, setPlayerState] = useState<PlayerState>(() => {
        const init = gameDataJSON.initialPlayerState;
        return {
            gold: init.gold,
            rentDebt: 0,
            inventory: {
                plants: { ...init.inventory.plants },
                potions: { ...init.inventory.potions }
            },
            knownPotions: [...init.knownPotions]
        };
    });
    const [cauldron, setCauldron] = useState<CauldronItem[]>([]);
    const [brewState, setBrewState] = useState<BrewState>({ status: 'idle', message: '' });
    const [treatmentBench, setTreatmentBench] = useState<TreatmentBenchItem[]>([]);
    const [treatmentStatus, setTreatmentStatus] = useState<TreatmentStatus>({ type: '', message: '' });
    const [gameState, setGameState] = useState<GameState>(() => {
        const initialProgress: Record<string, StoryProgressItem> = {};
        gameDataJSON.storylines.forEach(s => {
            const firstNodeId = s.nodes && s.nodes.length > 0 ? s.nodes[0].id : `node_${s.id.replace('story_', '')}_1`;
            initialProgress[s.id] = { 
                currentNodeId: firstNodeId, 
                availableDay: s.id === 'story_landlord' ? 7 : (s.nodes?.[0]?.day ?? 1) 
            };
        });
        return {
            day: 1,
            currentCustomer: null,
            rentPaidThisWeek: false,
            storyProgress: initialProgress,
            logs: ['🧙‍♂️ Kulübeye hoş geldin şifacı!'],
            waitingCustomers: [],
            queuedCustomers: [],
            isTreatmentChoiceSelected: false,
            triggeredConditionalNews: [],
            triggeredEvents: []
        };
    });
    const [rentPopup, setRentPopup] = useState<RentPopup>({ show: false, message: '' });
    const [newsPopup, setNewsPopup] = useState<{ show: boolean; items: NewsItem[] }>({ show: false, items: [] });

    const [introPageIndex, setIntroPageIndex] = useState<number>(0);

    // Yerel Kayıt Durumu State'leri
    const [hasSave, setHasSave] = useState<boolean>(false);
    const [savedMeta, setSavedMeta] = useState<{ day: number; gold: number } | null>(null);

    // Müzik ve Soundtrack State/Ref Tanımlamaları
    const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
    const [isMuted, setIsMuted] = useState<boolean>(true); 
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const fadeIntervalRef = useRef<any>(null);

    const t = (key: string, fallback: string = ""): string => gameData?.translations[language]?.[key] || gameData?.translations['tr']?.[key] || fallback || key;
    const addLog = (msg: string): void => setGameState(prev => ({ ...prev, logs: [msg, ...prev.logs].slice(0, 5) }));

    // 1. AŞAMA: Tarayıcıda Kayıtlı Bir Oyun Olup Olmadığını Kontrol Etme (On Mount)
    useEffect(() => {
        const rawSave = localStorage.getItem('buyu_mirasi_save');
        if (rawSave) {
            try {
                const parsed = JSON.parse(rawSave);
                if (parsed.playerState && parsed.gameState) {
                    setHasSave(true);
                    setSavedMeta({
                        day: parsed.gameState.day,
                        gold: parsed.playerState.gold
                    });
                    if (parsed.language) {
                        setLanguage(parsed.language);
                    }
                    if (parsed.isMuted !== undefined) {
                        setIsMuted(parsed.isMuted);
                    }
                }
            } catch (e) {
                console.warn("Kayıtlı veri okunamadı veya bozuk.", e);
            }
        }
    }, []);

    // 2. AŞAMA: Veritabanını (JSON) Yükleme
    useEffect(() => {
        fetch('assets/gameData.json')
            .then(response => {
                if (!response.ok) throw new Error("Ağ hatası veya dosya bulunamadı");
                return response.json();
            })
            .then(data => {
                const mergedData: GameData = {
                    ...gameDataJSON,
                    ...data,
                    plants: data.plants && data.plants.length > 0 ? data.plants : gameDataJSON.plants,
                    potions: data.potions && data.potions.length > 0 ? data.potions : gameDataJSON.potions,
                    marketPlants: data.marketPlants || gameDataJSON.marketPlants || [],
                    marketRecipes: data.marketRecipes || gameDataJSON.marketRecipes || [],
                    introPages: data.introPages || gameDataJSON.introPages || [],
                    soundtracks: data.soundtracks || gameDataJSON.soundtracks || [],
                    news: data.news || gameDataJSON.news || []
                } as any;
                setGameData(mergedData);
                
                // Kayıt yoksa storyProgress'i veritabanına göre başlat
                const rawSave = localStorage.getItem('buyu_mirasi_save');
                if (!rawSave) {
                    const initialProgress: Record<string, StoryProgressItem> = {};
                    mergedData.storylines.forEach(s => {
                        const firstNodeId = s.nodes && s.nodes.length > 0 ? s.nodes[0].id : `node_${s.id.replace('story_', '')}_1`;
                        initialProgress[s.id] = { 
                            currentNodeId: firstNodeId, 
                            availableDay: s.id === 'story_landlord' ? 7 : (s.nodes?.[0]?.day ?? 1) 
                        };
                    });
                    setGameState(prev => ({ ...prev, storyProgress: initialProgress }));
                }

                setIsLoading(false);
            })
            .catch(error => {
                console.warn("Yerel assets/gameData.json okunamadı, varsayılan (gameDataJSON) yükleniyor.", error);
                setGameData(gameDataJSON as any);
                setIsLoading(false);
            });
    }, []);

    // 3. AŞAMA: Gerçek Zamanlı Otomatik Kayıt (Autosave Effect)
    useEffect(() => {
        if (!isLoading && gameData && appMode !== 'portal' && appMode !== 'intro') {
            const saveData = {
                playerState,
                gameState,
                gameData, 
                language,
                isMuted,
                savedAt: Date.now()
            };
            localStorage.setItem('buyu_mirasi_save', JSON.stringify(saveData));

            setHasSave(true);
            setSavedMeta({
                day: gameState.day,
                gold: playerState.gold
            });
        }
    }, [playerState, gameState, gameData, language, isMuted, appMode, isLoading]);

    // 4. AŞAMA: MÜŞTERİ KUYRUK SİSTEMİ
    useEffect(() => {
        if (!gameData || isLoading || appMode === 'portal' || appMode === 'intro') return;

        if (gameState.queuedCustomers.length === 0 && gameState.waitingCustomers.length === 0 && !gameState.currentCustomer) {
            const availableToday = Object.entries(gameState.storyProgress)
                .filter(([sId, prog]) => {
                    if (prog.currentNodeId === 'END') return false;
                    if (prog.availableDay > gameState.day) return false;

                    const storyDef = gameData.storylines.find(s => s.id === sId);
                    const nodeDef = storyDef?.nodes.find(n => n.id === prog.currentNodeId);

                    // Olay Gereksinimi Kontrolü
                    if (nodeDef?.requiredEventId && !(gameState.triggeredEvents || []).includes(nodeDef.requiredEventId)) {
                        return false;
                    }

                    const nodeDayReq = nodeDef?.day ?? 1;

                    return gameState.day >= nodeDayReq;
                })
                .map(([sId]) => sId);

            if (availableToday.length > 0) {
                const shuffled = [...availableToday].sort(() => Math.random() - 0.5);
                setGameState(prev => ({ ...prev, queuedCustomers: shuffled }));
            }
        }
    }, [gameState.day, gameData, isLoading, appMode, gameState.currentCustomer]);

    useEffect(() => {
        if (gameState.queuedCustomers.length === 0) return;

        const timer = setTimeout(() => {
            setGameState(prev => {
                if (prev.queuedCustomers.length === 0) return prev;
                const [nextCustomer, ...remainingQueue] = prev.queuedCustomers;
                return {
                    ...prev,
                    queuedCustomers: remainingQueue,
                    waitingCustomers: [...prev.waitingCustomers, nextCustomer]
                };
            });
        }, 5000);

        return () => clearTimeout(timer);
    }, [gameState.queuedCustomers]);

    // 5. AŞAMA: OYUN BİTTİ KONTROLÜ
    useEffect(() => {
        if (!gameData || isLoading || appMode === 'portal' || appMode === 'studio' || appMode === 'intro' || gameState.isGameOver) return;

        // Gelecekte veya bugün gelebilecek herhangi bir müşteri kaldı mı?
        const hasPotentialCustomers = gameState.day <= 7 && Object.entries(gameState.storyProgress).some(([sId, prog]) => {
            // story_landlord hariç tutulabilir mi? Kullanıcı "gelecek hiçbir müşteri" dedi. 
            // Landlord her 7 günde bir geliyor. Ama landlord sonsuz mu?
            // gameData incelediğimizde story_landlord 7. gün geliyor. 
            // Eğer diğer tüm story'ler END ise ve gün 7'yi geçtiyse oyun bitmiş olabilir.
            
            if (prog.currentNodeId === 'END') return false;
            
            // Eğer landlord ise ve kira borcu bitmeyecekse (oyun sonsuz döngüye girer)
            // Ama kullanıcı "gelecek hiçbir müşteri kalmadığında" diyor.
            // Landlord'un nodes dizisine bakalım.
            const storyDef = gameData.storylines.find(s => s.id === sId);
            if (!storyDef) return false;

            // Eğer story_landlord ise, onun nodes'ları belirli bir günde (7) bitiyor mu?
            // gameData'da node_landlord_angry ve node_landlord_thanks nextNodeId null. Yani bitiyor.
            
            return true;
        });

        if (!hasPotentialCustomers && 
            gameState.waitingCustomers.length === 0 && 
            gameState.queuedCustomers.length === 0 && 
            !gameState.currentCustomer) {
            
            setGameState(prev => ({ ...prev, isGameOver: true }));
        }
    }, [gameState.storyProgress, gameState.waitingCustomers, gameState.queuedCustomers, gameState.currentCustomer, gameData, isLoading, appMode]);

    // Soundtrack Çalma Ve Yavaşça Geçiş Yapma (Fade In / Fade Out) Mekanizması
    const changeTrack = (targetIndex: number) => {
        const audio = audioRef.current;
        if (!audio) return;

        const soundtracks = gameData?.soundtracks || [];
        if (soundtracks.length === 0) return;

        const nextTrack = soundtracks[targetIndex];
        if (!nextTrack) return;

        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

        const MAX_VOLUME = 0.45;
        let vol = audio.volume;
        let step = 0;
        const steps = 20;
        const intervalTime = 40; 

        fadeIntervalRef.current = setInterval(() => {
            step++;
            audio.volume = Math.max(0, vol * (1 - step / steps));
            if (step >= steps) {
                clearInterval(fadeIntervalRef.current);
                audio.volume = 0;
                audio.pause();

                audio.src = nextTrack.path;
                audio.load();
                setCurrentTrackIndex(targetIndex);

                if (!isMuted) {
                    audio.play().then(() => {
                        let stepIn = 0;
                        fadeIntervalRef.current = setInterval(() => {
                            stepIn++;
                            audio.volume = Math.min(MAX_VOLUME, (stepIn / steps) * MAX_VOLUME);
                            if (stepIn >= steps) {
                                clearInterval(fadeIntervalRef.current);
                                audio.volume = MAX_VOLUME;
                            }
                        }, intervalTime);
                    }).catch(err => {
                        console.warn("Müzik çalma tarayıcı tarafından engellendi:", err);
                    });
                }
            }
        }, intervalTime);
    };

    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
        }
        const audio = audioRef.current;

        const handleTrackEnded = () => {
            const soundtracks = gameData?.soundtracks || [];
            if (soundtracks.length === 0) return;
            const nextIdx = (currentTrackIndex + 1) % soundtracks.length;
            changeTrack(nextIdx);
        };

        audio.addEventListener('ended', handleTrackEnded);
        return () => {
            audio.removeEventListener('ended', handleTrackEnded);
        };
    }, [currentTrackIndex, gameData?.soundtracks, isMuted]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const soundtracks = gameData?.soundtracks || [];
        if (soundtracks.length === 0) return;

        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

        const MAX_VOLUME = 0.45;
        const steps = 20;
        const intervalTime = 40;

        if (isMuted) {
            let vol = audio.volume;
            let step = 0;
            fadeIntervalRef.current = setInterval(() => {
                step++;
                audio.volume = Math.max(0, vol * (1 - step / steps));
                if (step >= steps) {
                    clearInterval(fadeIntervalRef.current);
                    audio.volume = 0;
                    audio.pause();
                }
            }, intervalTime);
        } else {
            const activeTrack = soundtracks[currentTrackIndex];
            if (!activeTrack) return;

            if (!audio.src || (!audio.src.endsWith(activeTrack.path) && !audio.src.includes(activeTrack.path))) {
                audio.src = activeTrack.path;
                audio.load();
            }

            audio.play().then(() => {
                let stepIn = 0;
                fadeIntervalRef.current = setInterval(() => {
                    stepIn++;
                    audio.volume = Math.min(MAX_VOLUME, (stepIn / steps) * MAX_VOLUME);
                    if (stepIn >= steps) {
                        clearInterval(fadeIntervalRef.current);
                        audio.volume = MAX_VOLUME;
                    }
                }, intervalTime);
            }).catch(err => {
                console.warn("Müzik oynatma başlatılamadı:", err);
            });
        }

        return () => {
            if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        };
    }, [isMuted]);

    // HANDLERS
    const handleContinueGame = () => {
        const rawSave = localStorage.getItem('buyu_mirasi_save');
        if (rawSave) {
            try {
                const parsed = JSON.parse(rawSave);
                setPlayerState(parsed.playerState);
                const loadedGameState = {
                    ...parsed.gameState,
                    waitingCustomers: parsed.gameState.waitingCustomers || [],
                    queuedCustomers: parsed.gameState.queuedCustomers || [],
                    triggeredEvents: parsed.gameState.triggeredEvents || [],
                    isGameOver: parsed.gameState.isGameOver || false
                };
                setGameState(loadedGameState);
                if (parsed.gameData) setGameData(parsed.gameData);
                if (parsed.language) setLanguage(parsed.language);
                if (parsed.isMuted !== undefined) setIsMuted(parsed.isMuted);
                
                setAppMode('client');
                setActiveTab('shopArea');
                addLog(language === 'en' ? '🎮 Game Loaded!' : '🎮 Oyun Yüklendi!');
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleNewGame = () => {
        setIsLoading(true);
        fetch('assets/gameData.json')
            .then(res => res.json())
            .then(data => {
                const mergedData: GameData = {
                    ...gameDataJSON, 
                    ...data,
                    plants: data.plants && data.plants.length > 0 ? data.plants : gameDataJSON.plants,
                    potions: data.potions && data.potions.length > 0 ? data.potions : gameDataJSON.potions,
                    marketPlants: data.marketPlants || gameDataJSON.marketPlants || [],
                    marketRecipes: data.marketRecipes || gameDataJSON.marketRecipes || [],
                    introPages: data.introPages || gameDataJSON.introPages,
                    soundtracks: data.soundtracks || gameDataJSON.soundtracks,
                    news: data.news || gameDataJSON.news
                } as any;
                setGameData(mergedData);
                
                const initNew = mergedData.initialPlayerState || gameDataJSON.initialPlayerState;
                const storylinesNew = mergedData.storylines || gameDataJSON.storylines;
                
                const updatedProgress: Record<string, any> = {};
                storylinesNew.forEach((s: any) => {
                    const firstNodeId = s.nodes && s.nodes.length > 0 ? s.nodes[0].id : `node_${s.id.replace('story_', '')}_1`;
                    updatedProgress[s.id] = { 
                        currentNodeId: firstNodeId, 
                        availableDay: s.id === 'story_landlord' ? 7 : (s.nodes?.[0]?.day ?? 1) 
                    };
                });
                
                setPlayerState({
                    gold: initNew.gold,
                    rentDebt: 0,
                    inventory: { plants: { ...initNew.inventory.plants }, potions: { ...initNew.inventory.potions } },
                    knownPotions: [...initNew.knownPotions]
                });

                setGameState({
                    day: 1, 
                    currentCustomer: null, 
                    rentPaidThisWeek: false,
                    storyProgress: updatedProgress,
                    logs: ['🧙‍♂️ Yeni bir miras başladı.'], 
                    waitingCustomers: [], 
                    queuedCustomers: [],
                    triggeredConditionalNews: [],
                    triggeredEvents: [],
                    isGameOver: false
                });

                localStorage.removeItem('buyu_mirasi_save');
                setHasSave(false);
                setSavedMeta(null);
                
                setIsLoading(false);
                setIntroPageIndex(0);
                setAppMode('intro');
            })
            .catch(() => {
                setGameData(gameDataJSON as any);
                
                const initNew = gameDataJSON.initialPlayerState;
                const storylinesNew = gameDataJSON.storylines;
                
                const updatedProgress: Record<string, any> = {};
                storylinesNew.forEach((s: any) => {
                    const firstNodeId = s.nodes && s.nodes.length > 0 ? s.nodes[0].id : `node_${s.id.replace('story_', '')}_1`;
                    updatedProgress[s.id] = { 
                        currentNodeId: firstNodeId, 
                        availableDay: s.id === 'story_landlord' ? 7 : (s.nodes?.[0]?.day ?? 1) 
                    };
                });
                
                setPlayerState({
                    gold: initNew.gold,
                    rentDebt: 0,
                    inventory: { plants: { ...initNew.inventory.plants }, potions: { ...initNew.inventory.potions } },
                    knownPotions: [...initNew.knownPotions]
                });

                setGameState({
                    day: 1, 
                    currentCustomer: null, 
                    rentPaidThisWeek: false,
                    storyProgress: updatedProgress,
                    logs: ['🧙‍♂️ Yeni bir miras başladı.'], 
                    waitingCustomers: [], 
                    queuedCustomers: [],
                    triggeredConditionalNews: [],
                    triggeredEvents: [],
                    isGameOver: false
                });

                localStorage.removeItem('buyu_mirasi_save');
                setHasSave(false);
                setSavedMeta(null);
                
                setIsLoading(false);
                setIntroPageIndex(0);
                setAppMode('intro');
            });
    };

    const handleEndDay = (): void => {
        let rentOverdue = false;
        let nextRentDebt = playerState.rentDebt;
        if (gameState.day % 7 === 0 && !gameState.rentPaidThisWeek) { nextRentDebt += 100; rentOverdue = true; }
        if (rentOverdue) setPlayerState(prev => ({ ...prev, rentDebt: nextRentDebt }));

        const nextDay = gameState.day + 1;
        const dailyNews = (gameData?.news || []).filter(n => n.day === nextDay);
        const triggeredConditional = (gameData?.conditionalNews || []).filter(n => n.day === nextDay && gameState.triggeredConditionalNews.includes(n.id));
        const allNewsToShow = [...dailyNews, ...triggeredConditional];
        if (allNewsToShow.length > 0) setNewsPopup({ show: true, items: allNewsToShow });

        setGameData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                marketPlants: (prev.marketPlants || []).map(mp => ({ ...mp, stock: mp.maxStock })),
                marketRecipes: (prev.marketRecipes || []).map(mr => ({ ...mr, stock: mr.maxStock }))
            };
        });
        setGameState(prev => {
            const nextLogs = [language === 'en' ? `🌙 Day ${prev.day + 1} started.` : `🌙 ${prev.day + 1}. güne uyandın.`];
            if (rentOverdue) nextLogs.push(language === 'en' ? `⚠️ Rent Overdue!` : `⚠️ Kira Ödenmedi!`);
            return { ...prev, day: prev.day + 1, currentCustomer: null, rentPaidThisWeek: false, logs: [...nextLogs, ...prev.logs].slice(0, 5), waitingCustomers: [], queuedCustomers: [] };
        });
        setTreatmentBench([]); setTreatmentStatus({ type: '', message: '' });
    };

    const handleCallCustomer = (): void => {
        if (!gameData || gameState.waitingCustomers.length === 0) return;
        const nextStoryId = gameState.waitingCustomers[0];
        const remainingWaiting = gameState.waitingCustomers.slice(1);
        const prog = gameState.storyProgress[nextStoryId];
        if (!prog) return;

        setGameState(prev => ({ ...prev, waitingCustomers: remainingWaiting, currentCustomer: { storyId: nextStoryId, nodeId: prog.currentNodeId }, isTreatmentChoiceSelected: false }));
        setTreatmentBench([]); setTreatmentStatus({ type: '', message: '' });
    };

    const handleCustomerChoice = (choice: Choice, _idx: number, _activeNode: StoryNode, storyId: string): void => {
        const cur = { ...playerState };
        const reqGoldCount = choice.reqGold || 0;
        const reqPotionCount = choice.reqPotionCount || 1;
        const reqPlantCount = choice.reqPlantCount || 1;

        if (cur.gold < reqGoldCount || (choice.reqPotion && (cur.inventory.potions[choice.reqPotion] || 0) < reqPotionCount) || (choice.reqPlant && (cur.inventory.plants[choice.reqPlant] || 0) < reqPlantCount)) {
            addLog(`❌ Yetersiz kaynak!`);
            return;
        }

        if (choice.reqGold) cur.gold -= choice.reqGold;
        if (choice.reqPotion) cur.inventory.potions = { ...cur.inventory.potions, [choice.reqPotion]: cur.inventory.potions[choice.reqPotion] - reqPotionCount };
        if (choice.reqPlant) cur.inventory.plants = { ...cur.inventory.plants, [choice.reqPlant]: cur.inventory.plants[choice.reqPlant] - reqPlantCount };
        if (choice.rewardGold) cur.gold += choice.rewardGold;
        if (choice.rewardPlantId) cur.inventory.plants = { ...cur.inventory.plants, [choice.rewardPlantId]: (cur.inventory.plants[choice.rewardPlantId] || 0) + (choice.rewardPlantCount || 1) };
        if (choice.rewardPotionId) cur.inventory.potions = { ...cur.inventory.potions, [choice.rewardPotionId]: (cur.inventory.potions[choice.rewardPotionId] || 0) + (choice.rewardPotionCount || 1) };

        setPlayerState(cur);

        const updProgress = { ...gameState.storyProgress };
        if (choice.nextNodeId && gameData) {
            const story = gameData.storylines.find(s => s.id === storyId);
            const nextNode = story?.nodes.find(n => n.id === choice.nextNodeId);
            const nextNodeDay = nextNode?.day ?? 1;
            const calculatedAvailableDay = Math.max(gameState.day + (choice.delayDays || 0), nextNodeDay);
            updProgress[storyId] = { currentNodeId: choice.nextNodeId, availableDay: calculatedAvailableDay };

            let shouldDismissCustomer = (choice.delayDays || 0) > 0 || nextNodeDay > gameState.day;


            //todo::check here...
            if(nextNode){
                const reqEvent = nextNode.requiredEventId;

                if(reqEvent){
                    var foundEvent = gameState.triggeredEvents.find(event => event == reqEvent);

                    if(!foundEvent){
                        shouldDismissCustomer = true;
                    }
                }
            }

            setGameState(prev => ({
                ...prev, 
                storyProgress: updProgress, 
                currentCustomer: shouldDismissCustomer ? null : { storyId, nodeId: choice.nextNodeId as string }, 
                isTreatmentChoiceSelected: choice.isTreatmentChoice || false,
                triggeredConditionalNews: choice.triggeredNewsId && !prev.triggeredConditionalNews.includes(choice.triggeredNewsId)
                    ? [...prev.triggeredConditionalNews, choice.triggeredNewsId]
                    : prev.triggeredConditionalNews,
                triggeredEvents: choice.triggeredEventId && !(prev.triggeredEvents || []).includes(choice.triggeredEventId)
                    ? [...(prev.triggeredEvents || []), choice.triggeredEventId]
                    : (prev.triggeredEvents || [])
            }));
            if (shouldDismissCustomer) addLog(language === 'en' ? `👥 Customer will return on Day ${calculatedAvailableDay}.` : `👥 Karakter ${calculatedAvailableDay}. gün tekrar gelecek.`);
        } else {
            updProgress[storyId] = { currentNodeId: 'END', availableDay: 999 };
            setGameState(prev => ({ 
                ...prev, 
                storyProgress: updProgress, 
                currentCustomer: null, 
                isTreatmentChoiceSelected: false,
                triggeredConditionalNews: choice.triggeredNewsId && !prev.triggeredConditionalNews.includes(choice.triggeredNewsId)
                    ? [...prev.triggeredConditionalNews, choice.triggeredNewsId]
                    : prev.triggeredConditionalNews,
                triggeredEvents: choice.triggeredEventId && !(prev.triggeredEvents || []).includes(choice.triggeredEventId)
                    ? [...(prev.triggeredEvents || []), choice.triggeredEventId]
                    : (prev.triggeredEvents || [])
            }));
        }
    };

    const handleAddToTreatmentBench = (type: 'plant' | 'potion', id: string, name: string): void => setTreatmentBench(prev => [...prev, { type, id, name }]);
    const handleRemoveFromTreatmentBench = (index: number): void => setTreatmentBench(prev => prev.filter((_, i) => i !== index));

    const handleApplyTreatment = (activeNode: StoryNode, activeStory: Storyline): void => {
        if (!gameData) return;
        const disease = gameData.diseases.find(d => d.id === activeNode.diseaseId);
        if (!disease) return;
        let success = false;
        let explanation = '';

        if (treatmentBench.length === 1 && treatmentBench[0].type === 'potion') {
            const pot = gameData.potions.find(p => p.id === treatmentBench[0].id);
            if (pot?.curesDiseaseIds.includes(disease.id)) { success = true; explanation = `🧪 ${pot.name} şifa verdi!`; }
        } else if (treatmentBench.filter(i => i.type === 'plant').length > 0) {
            const props: string[] = [];
            const resolved: string[] = [];
            treatmentBench.filter(i => i.type === 'plant').forEach(i => gameData.plants.find(p => p.id === i.id)?.properties.forEach(pr => props.push(pr)));
            props.forEach(pr => gameData.plantProperties.find(p => p.name === pr)?.curesSymptoms.forEach(s => resolved.push(s)));
            if (disease.symptoms.every(s => resolved.includes(s))) { success = true; explanation = `🌿 Karışım başarılı!`; }
        }

        setPlayerState(prev => {
            const inv = { ...prev.inventory };
            treatmentBench.forEach(i => {
                if (i.type === 'plant') inv.plants = { ...inv.plants, [i.id]: inv.plants[i.id] - 1 };
                else inv.potions = { ...inv.potions, [i.id]: inv.potions[i.id] - 1 };
            });
            return { ...prev, gold: prev.gold + (success ? 60 : 0), inventory: inv };
        });

        const targetNodeId = success ? activeNode.dynamicSuccessNodeId : activeNode.dynamicFailNodeId;
        if (targetNodeId) {
            const nextNode = activeStory.nodes.find(n => n.id === targetNodeId);
            const nextNodeDay = nextNode?.day ?? 1;
            const isDelayed = nextNodeDay > gameState.day;
            const updProgress = { ...gameState.storyProgress, [activeStory.id]: { currentNodeId: targetNodeId, availableDay: Math.max(gameState.day, nextNodeDay) } };
            setGameState(prev => ({ ...prev, storyProgress: updProgress, currentCustomer: isDelayed ? null : { storyId: activeStory.id, nodeId: targetNodeId } }));
        } else {
            const updProgress = { ...gameState.storyProgress, [activeStory.id]: { currentNodeId: 'END', availableDay: 999 } };
            setGameState(prev => ({ ...prev, storyProgress: updProgress, currentCustomer: null }));
        }
        setTreatmentStatus({ type: success ? 'success' : 'fail', message: explanation + (success ? ' (+60💰)' : '') });
        setTreatmentBench([]);
    };

    const handleAddToCauldron = (type: 'plant' | 'potion', id: string): void => {
        setPlayerState(prev => {
            const targetInv = type === 'plant' ? 'plants' : 'potions';
            return { ...prev, inventory: { ...prev.inventory, [targetInv]: { ...prev.inventory[targetInv], [id]: (prev.inventory[targetInv][id] || 0) - 1 } } };
        });
        setCauldron(prev => [...prev, { type, id }]);
    };

    const handleRemoveFromCauldron = (idx: number, type: 'plant' | 'potion', id: string): void => {
        setCauldron(prev => prev.filter((_, i) => i !== idx));
        setPlayerState(prev => {
            const targetInv = type === 'plant' ? 'plants' : 'potions';
            return { ...prev, inventory: { ...prev.inventory, [targetInv]: { ...prev.inventory[targetInv], [id]: (prev.inventory[targetInv][id] || 0) + 1 } } };
        });
    };

    const handleBrew = (): void => {
        if (!gameData) return;
        setBrewState({ status: 'brewing', message: t('ui.boiling') });
        setTimeout(() => {
            const counts: Record<string, number> = {};
            cauldron.forEach(i => counts[`${i.type}_${i.id}`] = (counts[`${i.type}_${i.id}`] || 0) + 1);
            const pot = gameData.potions.find(p => p.ingredients.length === Object.keys(counts).length && p.ingredients.every(ing => counts[`${ing.type}_${ing.id}`] === ing.count));
            if (pot) {
                setPlayerState(p => ({ ...p, inventory: { ...p.inventory, potions: { ...p.inventory.potions, [pot.id]: (p.inventory.potions[pot.id] || 0) + 1 } } }));
                setBrewState({ status: 'success', message: `Perfect! ${pot.name} is ready.` });
            } else {
                setBrewState({ status: 'fail', message: 'Unknown potion, ingredients were wasted.' });
            }
            setCauldron([]);
        }, 1500);
    };

    const handleBuyPlant = (pId: string, cost: number, count: number): void => {
        if (playerState.gold < cost * count) { addLog('❌ Yetersiz altın!'); return; }
        setPlayerState(p => ({ ...p, gold: p.gold - cost * count, inventory: { ...p.inventory, plants: { ...p.inventory.plants, [pId]: (p.inventory.plants[pId] || 0) + count } } }));
        setGameData(d => d ? { ...d, marketPlants: d.marketPlants.map(mp => mp.plantId === pId ? { ...mp, stock: mp.stock - count } : mp) } : d);
    };

    const handleBuyRecipe = (potionId: string, cost: number): void => {
        if (playerState.gold < cost) { addLog('❌ Yetersiz altın!'); return; }
        if (playerState.knownPotions.includes(potionId)) return;
        setPlayerState(p => ({ ...p, gold: p.gold - cost, knownPotions: [...p.knownPotions, potionId] }));
        setGameData(d => d ? { ...d, marketRecipes: (d.marketRecipes || []).map(mr => mr.potionId === potionId ? { ...mr, stock: mr.stock - 1 } : mr) } : d);
        addLog(`🛒 ${t(`potion.${potionId}.name`)} recipe purchased.`);
    };

    const handlers: GameHandlers = { handleEndDay, handleCallCustomer, handleCustomerChoice, handleAddToTreatmentBench, handleRemoveFromTreatmentBench, handleApplyTreatment, handleAddToCauldron, handleRemoveFromCauldron, handleBrew, handleBuyPlant, handleBuyRecipe };

    return {
        appMode, setAppMode, activeTab, setActiveTab, gameData, setGameData, isLoading, language, setLanguage,
        playerState, setPlayerState, cauldron, brewState, treatmentBench, treatmentStatus, gameState, setGameState,
        rentPopup, setRentPopup, newsPopup, setNewsPopup, introPageIndex, setIntroPageIndex, hasSave, savedMeta,
        currentTrackIndex, isMuted, setIsMuted, changeTrack, t, handlers, handleContinueGame, handleNewGame
    };
}
