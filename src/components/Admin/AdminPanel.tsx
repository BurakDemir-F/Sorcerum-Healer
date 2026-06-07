import React, { useState, useEffect } from 'react';
import { 
    GameData, GameState, Plant, Disease, Potion, Ingredient, 
    Storyline, StoryNode, Choice, IntroPage, Soundtrack, 
    NewsItem, PlantProperty, StoryProgressItem 
} from '../../types';
import { getHerbCuredSymptoms } from '../../utils/helpers';
import gameDataJSON from '../../assets/gameData.json';

interface AdminPanelProps {
    gameData: GameData;
    setGameData: React.Dispatch<React.SetStateAction<GameData | null>>;
    setGameState: React.Dispatch<React.SetStateAction<GameState>>;
    setAppMode: React.Dispatch<React.SetStateAction<string>>;
    t: (key: string, fallback?: string) => string;
    language: string;
    currentTrackIndex: number;
    changeTrack: (idx: number) => void;
    isMuted: boolean;
    setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
}

export function AdminPanel({
                             gameData, setGameData, setGameState, setAppMode, t, language,
                             currentTrackIndex, changeTrack, isMuted, setIsMuted
                         }: AdminPanelProps): React.JSX.Element {
    const [activeTab, setActiveTab] = useState<string>('dataEditor');
    const [newPlant, setNewPlant] = useState<Plant>({ id: '', name: '', rarity: 'Yaygın', cost: 10, properties: [], imageUrl: '' });
    const [newDisease, setNewDisease] = useState<Disease>({ id: '', name: '', symptoms: [] });
    const [newPotion, setNewPotion] = useState<Potion>({ id: '', name: '', sellPrice: 50, curesDiseaseIds: [], ingredients: [] });
    const [tempIngredient, setTempIngredient] = useState<Ingredient>({ type: 'plant', id: '', count: 1 });

    const [activeEditorStoryId, setActiveEditorStoryId] = useState<string>('story_baran');
    const [newStoryline, setNewStoryline] = useState<{ id: string; characterName: string; description: string; avatarUrl: string }>({ id: '', characterName: '', description: '', avatarUrl: '' });
    const [editStoryData, setEditStoryData] = useState<{ characterName: string; description: string; avatarUrl: string }>({ characterName: '', description: '', avatarUrl: '' });
    const [newNode, setNewNode] = useState<{ id: string; npcText: string; diseaseId: string; dynamicSuccessNodeId: string; dynamicFailNodeId: string; day: number }>({ id: '', npcText: '', diseaseId: '', dynamicSuccessNodeId: '', dynamicFailNodeId: '', day: 1 });

    useEffect(() => {
        const story = gameData.storylines.find(s => s.id === activeEditorStoryId);
        if (story) {
            setEditStoryData({
                characterName: story.characterName,
                description: story.description || '',
                avatarUrl: story.avatarUrl || '👤'
            });
        }
    }, [activeEditorStoryId, gameData.storylines]);

    const [newChoice, setNewChoice] = useState<{
        text: string; nextNodeId: string; delayDays: number; autoCreateNode: boolean; reqGold: number; reqPlant: string; reqPlantCount: number; reqPotion: string; reqPotionCount: number; rewardGold: number; rewardPlantId: string; rewardPlantCount: number; rewardPotionId: string; rewardPotionCount: number; isTreatmentChoice: boolean;
    }>({
        text: '', nextNodeId: '', delayDays: 0, autoCreateNode: false, reqGold: 0, reqPlant: '', reqPlantCount: 1, reqPotion: '', reqPotionCount: 1, rewardGold: 0, rewardPlantId: '', rewardPlantCount: 1, rewardPotionId: '', rewardPotionCount: 1, isTreatmentChoice: false
    });

    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [linkChoiceInfo, setLinkChoiceInfo] = useState<{ nodeId: string, choiceIdx: number } | null>(null);
    const [editingChoiceInfo, setEditingChoiceInfo] = useState<{ nodeId: string, choiceIdx: number } | null>(null);
    const [importText, setImportText] = useState<string>('');
    const [importStatus, setImportStatus] = useState<string>('');

    const [selectedMarketPlantId, setSelectedMarketPlantId] = useState<string>('');
    const [marketPlantCost, setMarketPlantCost] = useState<number>(10);
    const [marketPlantStock, setMarketPlantStock] = useState<number>(5);
    const [marketPlantDay, setMarketPlantDay] = useState<number>(1);

    const [selectedMarketPotionId, setSelectedMarketPotionId] = useState<string>('');
    const [marketPotionCost, setMarketPotionCost] = useState<number>(100);
    const [marketPotionStock, setMarketPotionStock] = useState<number>(1);
    const [marketPotionDay, setMarketPotionDay] = useState<number>(1);

    const [newSymptom, setNewSymptom] = useState<string>('');
    const [newPlantProperty, setNewPlantProperty] = useState<PlantProperty>({ name: '', curesSymptoms: [] });

    const [newIntroPage, setNewIntroPage] = useState<IntroPage>({ id: '', title: '', text: '', imageUrl: '' });
    const [editingIntroPageId, setEditingIntroPageId] = useState<string | null>(null);

    const [editingPlantId, setEditingPlantId] = useState<string | null>(null);
    const [editingPotionId, setEditingPotionId] = useState<string | null>(null);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [editNodeData, setEditNodeData] = useState<{ npcText: string; diseaseId: string; dynamicSuccessNodeId: string; dynamicFailNodeId: string; day: number }>({ npcText: '', diseaseId: '', dynamicSuccessNodeId: '', dynamicFailNodeId: '', day: 1 });

    const [newTrack, setNewTrack] = useState<Soundtrack>({ id: '', title: '', path: '' });
    const [editingPropertyName, setEditingPropertyName] = useState<string | null>(null);
    const [newNews, setNewNews] = useState<NewsItem>({ id: '', day: 1, text: '' });

    const [initPlantId, setInitPlantId] = useState<string>('');
    const [initPlantCount, setInitPlantCount] = useState<number>(1);
    const [initPotionId, setInitPotionId] = useState<string>('');
    const [initPotionCount, setInitPotionCount] = useState<number>(1);

    // Handlers (Original logic restored)
    const handleUpdateInitialGold = (gold: number) => {
        setGameData(prev => prev ? { ...prev, initialPlayerState: { ...prev.initialPlayerState, gold } } : prev);
    };

    const handleAddInitialPlant = () => {
        if (!initPlantId) return;
        setGameData(prev => {
            if (!prev) return prev;
            const currentPlants = { ...prev.initialPlayerState.inventory.plants };
            currentPlants[initPlantId] = (currentPlants[initPlantId] || 0) + initPlantCount;
            return { ...prev, initialPlayerState: { ...prev.initialPlayerState, inventory: { ...prev.initialPlayerState.inventory, plants: currentPlants } } };
        });
    };

    const handleRemoveInitialPlant = (id: string) => {
        setGameData(prev => {
            if (!prev) return prev;
            const currentPlants = { ...prev.initialPlayerState.inventory.plants };
            delete currentPlants[id];
            return { ...prev, initialPlayerState: { ...prev.initialPlayerState, inventory: { ...prev.initialPlayerState.inventory, plants: currentPlants } } };
        });
    };

    const handleAddInitialPotion = () => {
        if (!initPotionId) return;
        setGameData(prev => {
            if (!prev) return prev;
            const currentPotions = { ...prev.initialPlayerState.inventory.potions };
            currentPotions[initPotionId] = (currentPotions[initPotionId] || 0) + initPotionCount;
            return { ...prev, initialPlayerState: { ...prev.initialPlayerState, inventory: { ...prev.initialPlayerState.inventory, potions: currentPotions } } };
        });
    };

    const handleRemoveInitialPotion = (id: string) => {
        setGameData(prev => {
            if (!prev) return prev;
            const currentPotions = { ...prev.initialPlayerState.inventory.potions };
            delete currentPotions[id];
            return { ...prev, initialPlayerState: { ...prev.initialPlayerState, inventory: { ...prev.initialPlayerState.inventory, potions: currentPotions } } };
        });
    };

    const handleToggleKnownPotion = (id: string) => {
        setGameData(prev => {
            if (!prev) return prev;
            const currentKnown = [...prev.initialPlayerState.knownPotions];
            const index = currentKnown.indexOf(id);
            if (index > -1) currentKnown.splice(index, 1); else currentKnown.push(id);
            return { ...prev, initialPlayerState: { ...prev.initialPlayerState, knownPotions: currentKnown } };
        });
    };

    const handleAddNews = (): void => {
        if (!newNews.id || !newNews.text) return;
        setGameData(prev => {
            if (!prev || (prev.news || []).some(n => n.id === newNews.id)) return prev;
            return { ...prev, news: [...(prev.news || []), { ...newNews, day: Number(newNews.day) }] };
        });
        setNewNews({ id: '', day: 1, text: '' });
    };

    const handleRemoveNews = (id: string): void => {
        setGameData(prev => prev ? { ...prev, news: (prev.news || []).filter(n => n.id !== id) } : prev);
    };

    const handleRemovePlant = (id: string): void => {
        setGameData(prev => prev ? { ...prev, plants: prev.plants.filter(p => p.id !== id), marketPlants: (prev.marketPlants || []).filter(mp => mp.plantId !== id) } : prev);
    };

    const handleRemovePlantProperty = (propName: string): void => {
        setGameData(prev => prev ? { ...prev, plantProperties: prev.plantProperties.filter(p => p.name !== propName), plants: prev.plants.map(plant => ({ ...plant, properties: plant.properties.filter(p => p !== propName) })) } : prev);
    };

    const handleExportJSON = (): void => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gameData, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "gameData.json");
        document.body.appendChild(downloadAnchor); downloadAnchor.click(); downloadAnchor.remove();
    };

    const handleImportJSON = (): void => {
        try {
            const parsed = JSON.parse(importText);
            if (parsed.plants && parsed.potions) {
                const validatedData: GameData = { 
                    ...gameDataJSON, 
                    ...parsed, 
                    marketPlants: parsed.marketPlants || gameDataJSON.marketPlants || [], 
                    marketRecipes: parsed.marketRecipes || gameDataJSON.marketRecipes || [], 
                    introPages: parsed.introPages || gameDataJSON.introPages || [], 
                    soundtracks: parsed.soundtracks || gameDataJSON.soundtracks || [], 
                    news: parsed.news || gameDataJSON.news || [], 
                    initialPlayerState: parsed.initialPlayerState || gameDataJSON.initialPlayerState 
                } as any;
                setGameData(validatedData);
                setImportStatus('✅ Başarılı!');
                const initialProgress: Record<string, StoryProgressItem> = {};
                validatedData.storylines.forEach(story => {
                    const firstNode = story.nodes && story.nodes.length > 0 ? story.nodes[0] : null;
                    initialProgress[story.id] = { currentNodeId: firstNode ? firstNode.id : `node_${story.id.replace('story_', '')}_1`, availableDay: story.id === 'story_landlord' ? 7 : (firstNode?.day ?? 1) };
                });
                setGameState(prev => ({ ...prev, day: 1, currentCustomer: null, storyProgress: initialProgress, logs: ['🧙‍♂️ Veritabanı yüklendi!'] }));
            }
        } catch(err) { setImportStatus('❌ Hata!'); }
    };

    const handleTranslateChange = (lang: string, key: string, val: string): void => {
        setGameData(prev => prev ? { ...prev, translations: { ...prev.translations, [lang]: { ...prev.translations[lang], [key]: val } } } : prev);
    };

    const getAllLocalesKeys = (): string[] => {
        const keys = new Set<string>();
        Object.keys(gameData.translations.tr || {}).forEach(k => keys.add(k));
        Object.keys(gameData.translations.en || {}).forEach(k => keys.add(k));
        gameData.plants.forEach(p => keys.add(`plant.${p.id}.name`));
        gameData.potions.forEach(pot => keys.add(`potion.${pot.id}.name`));
        (gameData.soundtracks || []).forEach(track => keys.add(`soundtrack.${track.id}.title`));
        (gameData.introPages || []).forEach(page => { keys.add(`intro.title.${page.id}`); keys.add(`intro.text.${page.id}`); });
        gameData.storylines.forEach(story => { keys.add(`char.${story.id}`); keys.add(`char.${story.id}.desc`); story.nodes.forEach(node => { keys.add(`node.${node.id}.npcText`); if (node.choices) node.choices.forEach((_, idx) => keys.add(`choice.${node.id}.${idx}`)); }); });
        return Array.from(keys);
    };

    const toggleProp = (propName: string): void => setNewPlant({ ...newPlant, properties: newPlant.properties.includes(propName) ? newPlant.properties.filter(p => p !== propName) : [...newPlant.properties, propName] });

    const handleAddPlant = (): void => {
        if (editingPlantId) {
            handleTranslateChange('tr', `plant.${editingPlantId}.name`, newPlant.name);
            setGameData(prev => prev ? { ...prev, plants: prev.plants.map(p => p.id === editingPlantId ? { ...newPlant, id: editingPlantId, cost: Number(newPlant.cost) } : p) } : prev);
            setEditingPlantId(null);
        } else {
            if (!newPlant.id) return;
            handleTranslateChange('tr', `plant.${newPlant.id}.name`, newPlant.name);
            setGameData(prev => prev ? (prev.plants.some(p => p.id === newPlant.id) ? prev : { ...prev, plants: [...prev.plants, { ...newPlant, cost: Number(newPlant.cost) }] }) : prev);
        }
        setNewPlant({ id: '', name: '', rarity: 'Yaygın', cost: 10, properties: [], imageUrl: '' });
    };

    const handleAddTempIngredient = (): void => { if (tempIngredient.id) setNewPotion({ ...newPotion, ingredients: [...newPotion.ingredients, { ...tempIngredient, count: Number(tempIngredient.count) }] }); };

    const handleAddPotionRecipe = (): void => {
        if (editingPotionId) {
            handleTranslateChange('tr', `potion.${editingPotionId}.name`, newPotion.name);
            setGameData(prev => prev ? { ...prev, potions: prev.potions.map(p => p.id === editingPotionId ? { ...newPotion, id: editingPotionId, sellPrice: Number(newPotion.sellPrice) } : p) } : prev);
            setEditingPotionId(null);
        } else {
            if (!newPotion.id) return;
            handleTranslateChange('tr', `potion.${newPotion.id}.name`, newPotion.name);
            setGameData(prev => prev ? (prev.potions.some(p => p.id === newPotion.id) ? prev : { ...prev, potions: [...prev.potions, { ...newPotion, sellPrice: Number(newPotion.sellPrice) }] }) : prev);
        }
        setNewPotion({ id: '', name: '', sellPrice: 50, curesDiseaseIds: [], ingredients: [] });
    };

    const handleSaveNodeEdits = (): void => {
        if (!activeEditorStoryId || !editingNodeId) return;
        handleTranslateChange('tr', `node.${editingNodeId}.npcText`, editNodeData.npcText);
        setGameData(prev => prev ? { ...prev, storylines: prev.storylines.map(s => s.id === activeEditorStoryId ? { ...s, nodes: s.nodes.map(n => n.id === editingNodeId ? { ...n, npcText: editNodeData.npcText, diseaseId: editNodeData.diseaseId || undefined, dynamicSuccessNodeId: editNodeData.dynamicSuccessNodeId || undefined, dynamicFailNodeId: editNodeData.dynamicFailNodeId || undefined, day: Number(editNodeData.day) || undefined } : n) } : s) } : prev);
        setEditingNodeId(null);
    };

    const handleSaveChoiceEdits = (): void => {
        if (!activeEditorStoryId || !editingChoiceInfo) return;
        const { nodeId, choiceIdx } = editingChoiceInfo;
        
        const choiceObj: Choice = { 
            text: newChoice.text, 
            nextNodeId: newChoice.nextNodeId || null, 
            delayDays: newChoice.delayDays || undefined, 
            reqGold: newChoice.reqGold ? Number(newChoice.reqGold) : undefined, 
            reqPlant: newChoice.reqPlant || undefined, 
            reqPlantCount: newChoice.reqPlant ? Number(newChoice.reqPlantCount) : undefined, 
            reqPotion: newChoice.reqPotion || undefined, 
            reqPotionCount: newChoice.reqPotion ? Number(newChoice.reqPotionCount) : undefined, 
            rewardGold: newChoice.rewardGold ? Number(newChoice.rewardGold) : undefined, 
            rewardPlantId: newChoice.rewardPlantId || undefined, 
            rewardPlantCount: newChoice.rewardPlantId ? Number(newChoice.rewardPlantCount) : undefined, 
            rewardPotionId: newChoice.rewardPotionId || undefined, 
            rewardPotionCount: newChoice.rewardPotionId ? Number(newChoice.rewardPotionCount) : undefined,
            isTreatmentChoice: newChoice.isTreatmentChoice
        };

        handleTranslateChange('tr', `choice.${nodeId}.${choiceIdx}`, newChoice.text);
        
        setGameData(prev => prev ? {
            ...prev,
            storylines: prev.storylines.map(s => s.id === activeEditorStoryId ? {
                ...s,
                nodes: s.nodes.map(n => n.id === nodeId ? {
                    ...n,
                    choices: n.choices.map((c, idx) => idx === choiceIdx ? choiceObj : c)
                } : n)
            } : s)
        } : prev);

        setEditingChoiceInfo(null);
        setNewChoice({ text: '', nextNodeId: '', delayDays: 0, autoCreateNode: false, isTreatmentChoice: false, reqGold: 0, reqPlant: '', reqPlantCount: 1, reqPotion: '', reqPotionCount: 1, rewardGold: 0, rewardPlantId: '', rewardPlantCount: 1, rewardPotionId: '', rewardPotionCount: 1 });
    };

    const handleAddDisease = (): void => {
        if (!newDisease.id || !newDisease.name) return;
        handleTranslateChange('tr', `disease.${newDisease.id}.name`, newDisease.name);
        setGameData(prev => prev ? (prev.diseases.some(d => d.id === newDisease.id) ? prev : { ...prev, diseases: [...prev.diseases, newDisease] }) : prev);
        setNewDisease({ id: '', name: '', symptoms: [] });
    };

    const handleAddSymptom = (): void => {
        const trimmed = newSymptom.trim();
        if (!trimmed || gameData.diseaseSymptoms.includes(trimmed)) return;
        handleTranslateChange('tr', `symptom.${trimmed}`, trimmed); handleTranslateChange('en', `symptom.${trimmed}`, trimmed);
        setGameData(prev => prev ? { ...prev, diseaseSymptoms: [...prev.diseaseSymptoms, trimmed] } : prev);
        setNewSymptom('');
    };

    const handleAddPlantProperty = (): void => {
        const name = newPlantProperty.name.trim();
        if (!name) return;
        if (editingPropertyName) {
            if (name !== editingPropertyName) { handleTranslateChange('tr', `prop.${name}`, name); handleTranslateChange('en', `prop.${name}`, name); }
            setGameData(prev => prev ? { ...prev, plantProperties: prev.plantProperties.map(p => p.name === editingPropertyName ? { ...newPlantProperty, name } : p), plants: name !== editingPropertyName ? prev.plants.map(plant => ({ ...plant, properties: plant.properties.map(p => p === editingPropertyName ? name : p) })) : prev.plants } : prev);
            setEditingPropertyName(null);
        } else {
            if (gameData.plantProperties.some(p => p.name === name)) return;
            handleTranslateChange('tr', `prop.${name}`, name); handleTranslateChange('en', `prop.${name}`, name);
            setGameData(prev => prev ? { ...prev, plantProperties: [...prev.plantProperties, { ...newPlantProperty, name }] } : prev);
        }
        setNewPlantProperty({ name: '', curesSymptoms: [] });
    };

    const handleAddMarketPlant = (): void => { if (selectedMarketPlantId) setGameData(prev => prev ? ((prev.marketPlants || []).some(mp => mp.plantId === selectedMarketPlantId) ? prev : { ...prev, marketPlants: [...(prev.marketPlants || []), { plantId: selectedMarketPlantId, cost: Number(marketPlantCost), stock: Number(marketPlantStock), maxStock: Number(marketPlantStock), availableDay: Number(marketPlantDay) }] }) : prev); setSelectedMarketPlantId(''); };

    const handleAddMarketRecipe = (): void => { if (selectedMarketPotionId) setGameData(prev => prev ? ((prev.marketRecipes || []).some(mr => mr.potionId === selectedMarketPotionId) ? prev : { ...prev, marketRecipes: [...(prev.marketRecipes || []), { potionId: selectedMarketPotionId, cost: Number(marketPotionCost), stock: Number(marketPotionStock), maxStock: Number(marketPotionStock), availableDay: Number(marketPotionDay) }] }) : prev); setSelectedMarketPotionId(''); };

    const handleRemoveMarketPlant = (plantId: string): void => { setGameData(prev => prev ? { ...prev, marketPlants: (prev.marketPlants || []).filter(mp => mp.plantId !== plantId) } : prev); };
    const handleRemoveMarketRecipe = (potionId: string): void => { setGameData(prev => prev ? { ...prev, marketRecipes: (prev.marketRecipes || []).filter(mr => mr.potionId !== potionId) } : prev); };

    const handleAddStoryline = (): void => {
        if(!newStoryline.id || !newStoryline.characterName) return;
        const safeStoryId = newStoryline.id.startsWith('story_') ? newStoryline.id : `story_${newStoryline.id}`;
        const autoFirstNodeId = `node_${safeStoryId.replace('story_', '')}_1`;
        
        handleTranslateChange('tr', `char.${safeStoryId}`, newStoryline.characterName); 
        if (newStoryline.description) handleTranslateChange('tr', `char.${safeStoryId}.desc`, newStoryline.description);
        
        const initNode: StoryNode = { 
            id: autoFirstNodeId, 
            npcText: `Merhaba, ben ${newStoryline.characterName}.`, 
            day: 1, 
            choices: [] 
        };
        handleTranslateChange('tr', `node.${autoFirstNodeId}.npcText`, initNode.npcText);

        setGameData(prev => {
            if (!prev) return prev;
            if (prev.storylines.some(s => s.id === safeStoryId)) return prev;
            
            const newStory: Storyline = { 
                id: safeStoryId, 
                characterName: newStoryline.characterName, 
                description: newStoryline.description, 
                avatarUrl: newStoryline.avatarUrl || '👤', 
                nodes: [initNode] 
            };
            
            return { ...prev, storylines: [...prev.storylines, newStory] };
        });

        setGameState(prev => ({ 
            ...prev, 
            storyProgress: { 
                ...prev.storyProgress, 
                [safeStoryId]: { currentNodeId: autoFirstNodeId, availableDay: 1 } 
            }, 
            logs: [`🧙‍♂️ Karakter: ${newStoryline.characterName}`, ...prev.logs].slice(0, 5) 
        }));

        setActiveEditorStoryId(safeStoryId); 
        setNewStoryline({ id: '', characterName: '', description: '', avatarUrl: '' });
    };

    const handleUpdateStoryline = (): void => {
        if (!activeEditorStoryId) return;
        const name = editStoryData.characterName.trim();
        const description = editStoryData.description.trim();
        if (!name) return;

        handleTranslateChange('tr', `char.${activeEditorStoryId}`, name);
        handleTranslateChange('tr', `char.${activeEditorStoryId}.desc`, description);

        setGameData(prev => prev ? {
            ...prev,
            storylines: prev.storylines.map(s => s.id === activeEditorStoryId ? { 
                ...s, 
                characterName: name, 
                description: description,
                avatarUrl: editStoryData.avatarUrl 
            } : s)
        } : prev);
        alert("Karakter bilgileri güncellendi!");
    };

    const handleRemoveStoryline = (id: string): void => {
        if (!window.confirm("Bu karakteri ve tüm diyaloglarını silmek istediğinize emin misiniz?")) return;

        setGameData(prev => {
            if (!prev) return prev;
            const storyline = prev.storylines.find(s => s.id === id);
            const nodeIds = storyline?.nodes.map(n => n.id) || [];
            const updatedTranslations = { ...prev.translations };
            
            Object.keys(updatedTranslations).forEach(lang => {
                const langData = { ...updatedTranslations[lang] };
                delete langData[`char.${id}`];
                delete langData[`char.${id}.desc`];
                nodeIds.forEach(nodeId => {
                    delete langData[`node.${nodeId}.npcText`];
                    Object.keys(langData).forEach(key => {
                        if (key.startsWith(`choice.${nodeId}.`)) delete langData[key];
                    });
                });
                updatedTranslations[lang] = langData;
            });

            return { ...prev, storylines: prev.storylines.filter(s => s.id !== id), translations: updatedTranslations };
        });

        if (activeEditorStoryId === id) setActiveEditorStoryId('');

        setGameState(prev => {
            const updatedProgress = { ...prev.storyProgress };
            delete updatedProgress[id];
            return {
                ...prev,
                storyProgress: updatedProgress,
                waitingCustomers: prev.waitingCustomers.filter(cid => cid !== id),
                queuedCustomers: prev.queuedCustomers.filter(cid => cid !== id),
                currentCustomer: prev.currentCustomer?.storyId === id ? null : prev.currentCustomer
            };
        });
    };

    const handleAddNodeToStory = (): void => {
        if(!activeEditorStoryId || !newNode.id) return;
        handleTranslateChange('tr', `node.${newNode.id}.npcText`, newNode.npcText);
        setGameData(prev => prev ? { ...prev, storylines: prev.storylines.map(s => s.id === activeEditorStoryId ? { ...s, nodes: [...s.nodes, { ...newNode, day: Number(newNode.day) || undefined, choices: [] }] } : s) } : prev);
        setNewNode({id: '', npcText: '', diseaseId: '', dynamicSuccessNodeId: '', dynamicFailNodeId: '', day: 1});
    };

    const handleAddChoiceToNodeAdv = (nodeId: string): void => {
        let targetNextNodeId: string | null = newChoice.nextNodeId || null; const extraNodes: StoryNode[] = [];
        if (newChoice.autoCreateNode) { const generatedNodeId = `node_${activeEditorStoryId.replace('story_', '')}_gen_${Date.now().toString().slice(-4)}`; targetNextNodeId = generatedNodeId; extraNodes.push({ id: generatedNodeId, npcText: '...', day: 1, choices: [] }); }
        const choiceObj: Choice = { text: newChoice.text, nextNodeId: targetNextNodeId, delayDays: newChoice.delayDays || undefined, reqGold: newChoice.reqGold ? Number(newChoice.reqGold) : undefined, reqPlant: newChoice.reqPlant || undefined, reqPlantCount: newChoice.reqPlant ? Number(newChoice.reqPlantCount) : undefined, reqPotion: newChoice.reqPotion || undefined, reqPotionCount: newChoice.reqPotion ? Number(newChoice.reqPotionCount) : undefined, rewardGold: newChoice.rewardGold ? Number(newChoice.rewardGold) : undefined, rewardPlantId: newChoice.rewardPlantId || undefined, rewardPlantCount: newChoice.rewardPlantId ? Number(newChoice.rewardPlantCount) : undefined, rewardPotionId: newChoice.rewardPotionId || undefined, rewardPotionCount: newChoice.rewardPotionId ? Number(newChoice.rewardPotionCount) : undefined, isTreatmentChoice: newChoice.isTreatmentChoice };
        if (gameData) { const story = gameData.storylines.find(s => s.id === activeEditorStoryId); const node = story?.nodes.find(n => n.id === nodeId); handleTranslateChange('tr', `choice.${nodeId}.${node?.choices.length || 0}`, newChoice.text); }
        setGameData(prev => prev ? { ...prev, storylines: prev.storylines.map(s => { if (s.id === activeEditorStoryId) { let updatedNodes = s.nodes.map(n => n.id === nodeId ? { ...n, choices: [...(n.choices || []), choiceObj] } : n); if (extraNodes.length > 0) updatedNodes = [...updatedNodes, ...extraNodes]; return { ...s, nodes: updatedNodes }; } return s; }) } : prev);
        setSelectedNodeId(null); setNewChoice({ text: '', nextNodeId: '', delayDays: 0, autoCreateNode: false, isTreatmentChoice: false, reqGold: 0, reqPlant: '', reqPlantCount: 1, reqPotion: '', reqPotionCount: 1, rewardGold: 0, rewardPlantId: '', rewardPlantCount: 1, rewardPotionId: '', rewardPotionCount: 1 });
    };

    const handleAddNodeToChoice = (): void => {
        if (!activeEditorStoryId || !linkChoiceInfo || !newNode.id) return;
        const generatedNodeId = newNode.id;
        handleTranslateChange('tr', `node.${generatedNodeId}.npcText`, newNode.npcText);
        
        setGameData(prev => prev ? {
            ...prev,
            storylines: prev.storylines.map(s => s.id === activeEditorStoryId ? {
                ...s,
                nodes: [...s.nodes.map(n => n.id === linkChoiceInfo.nodeId ? {
                    ...n,
                    choices: n.choices.map((c, idx) => idx === linkChoiceInfo.choiceIdx ? { ...c, nextNodeId: generatedNodeId } : c)
                } : n), { ...newNode, day: Number(newNode.day) || undefined, choices: [] }]
            } : s)
        } : prev);

        setLinkChoiceInfo(null);
        setNewNode({ id: '', npcText: '', diseaseId: '', dynamicSuccessNodeId: '', dynamicFailNodeId: '', day: 1 });
    };

    const handleAddIntroPage = (): void => {
        if (!newIntroPage.id || !newIntroPage.title || !newIntroPage.text) return;
        handleTranslateChange('tr', `intro.title.${newIntroPage.id}`, newIntroPage.title); handleTranslateChange('tr', `intro.text.${newIntroPage.id}`, newIntroPage.text);
        setGameData(prev => { if (!prev) return prev; const currentPages = prev.introPages || []; if (editingIntroPageId) return { ...prev, introPages: currentPages.map(page => page.id === editingIntroPageId ? newIntroPage : page) }; else return currentPages.some(page => page.id === newIntroPage.id) ? prev : { ...prev, introPages: [...currentPages, newIntroPage] }; });
        setNewIntroPage({ id: '', title: '', text: '', imageUrl: '' }); setEditingIntroPageId(null);
    };

    const handleRemoveIntroPage = (id: string): void => { setGameData(prev => prev ? { ...prev, introPages: (prev.introPages || []).filter(page => page.id !== id) } : prev); };

    const moveIntroPage = (index: number, direction: 'up' | 'down'): void => {
        if (!gameData) return; const pages = [...(gameData.introPages || [])]; if ((direction === 'up' && index === 0) || (direction === 'down' && index === pages.length - 1)) return;
        const targetIndex = direction === 'up' ? index - 1 : index + 1; const temp = pages[index]; pages[index] = pages[targetIndex]; pages[targetIndex] = temp;
        setGameData({ ...gameData, introPages: pages });
    };

    const handleAddTrack = (): void => {
        if (!newTrack.id || !newTrack.title || !newTrack.path) return;
        handleTranslateChange('tr', `soundtrack.${newTrack.id}.title`, newTrack.title);
        setGameData(prev => prev ? { ...prev, soundtracks: (prev.soundtracks || []).some(t => t.id === newTrack.id) ? (prev.soundtracks || []).map(t => t.id === newTrack.id ? newTrack : t) : [...(prev.soundtracks || []), newTrack] } : prev);
        setNewTrack({ id: '', title: '', path: '' });
    };

    const handleRemoveTrack = (id: string): void => { setGameData(prev => prev ? { ...prev, soundtracks: (prev.soundtracks || []).filter(t => t.id !== id) } : prev); };

    // Render methods...
    const renderVisualNode = (story: Storyline, nodeId: string, visited: Set<string> = new Set()): React.JSX.Element => {
        if (visited.has(nodeId)) return <div className="text-xs text-red-955 font-bold p-2 bg-red-100 rounded border-2">Döngü!</div>;
        const nextVisited = new Set(visited); nextVisited.add(nodeId); const node = story.nodes.find(n => n.id === nodeId);
        if (!node) return <div className="text-slate-600 text-xs italic p-2 bg-amber-55 rounded border border-dashed">Son.</div>;
        return (
            <div className="flex flex-col items-center relative mt-4 font-parchment">
                <div className="bg-[#f3e8d2] border-4 border-slate-900 rounded-2xl p-4 w-72 shadow-md relative z-10">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-mono font-bold text-indigo-900">#{node.id}</span>
                        <span className="text-xs bg-amber-500 text-slate-955 px-2 py-0.5 rounded-full font-bold border border-black">📅 {node.day ?? 1}</span>
                    </div>
                    <p className="text-sm font-bold">"{node.npcText}"</p>
                    <div className="absolute -right-3 -top-3 flex gap-1">
                        <button onClick={() => { setEditingNodeId(node.id); setEditNodeData({ npcText: node.npcText, diseaseId: node.diseaseId || '', dynamicSuccessNodeId: node.dynamicSuccessNodeId || '', dynamicFailNodeId: node.dynamicFailNodeId || '', day: node.day ?? 1 }); }} className="bg-yellow-500 hover:bg-yellow-400 border-2 border-black text-xs w-6 h-6 rounded-full flex items-center justify-center shadow" title="Düğümü Düzenle">✏️</button>
                        <button onClick={() => setSelectedNodeId(node.id)} className="bg-emerald-500 hover:bg-emerald-400 border-2 border-black text-xs w-6 h-6 rounded-full flex items-center justify-center shadow" title="Seçenek Ekle">➕</button>
                    </div>
                </div>
                {node.choices && node.choices.length > 0 && (
                    <div className="flex gap-6 relative pt-6">
                        <div className="absolute top-0 left-1/2 w-1 h-6 bg-slate-900 -translate-x-1/2"></div>
                        {node.choices.map((choice, idx) => (
                            <div key={idx} className="flex flex-col items-center relative pt-4 min-w-[200px]">
                                <div className="absolute top-0 left-1/2 w-1 h-4 bg-slate-900 -translate-x-1/2"></div>
                                <div className="bg-[#e9dbbe] border-2 border-slate-955 rounded-xl p-2.5 text-xs w-48 shadow-sm text-center mb-3 relative group">
                                    <p className="font-bold font-parchment text-sm">{t(`choice.${node.id}.${idx}`, choice.text)}</p>
                                    <div className="absolute -right-2 -top-2 flex gap-1 z-20">
                                        <button 
                                            onClick={() => {
                                                setEditingChoiceInfo({ nodeId: node.id, choiceIdx: idx });
                                                setNewChoice({
                                                    text: choice.text,
                                                    nextNodeId: choice.nextNodeId || '',
                                                    delayDays: choice.delayDays || 0,
                                                    autoCreateNode: false,
                                                    reqGold: choice.reqGold || 0,
                                                    reqPlant: choice.reqPlant || '',
                                                    reqPlantCount: choice.reqPlantCount || 1,
                                                    reqPotion: choice.reqPotion || '',
                                                    reqPotionCount: choice.reqPotionCount || 1,
                                                    rewardGold: choice.rewardGold || 0,
                                                    rewardPlantId: choice.rewardPlantId || '',
                                                    rewardPlantCount: choice.rewardPlantCount || 1,
                                                    rewardPotionId: choice.rewardPotionId || '',
                                                    rewardPotionCount: choice.rewardPotionCount || 1
                                                });
                                            }}
                                            className="bg-yellow-500 border-2 border-black rounded-full w-6 h-6 flex items-center justify-center shadow hover:bg-yellow-400 transition-all"
                                            title="Seçeneği Düzenle"
                                        >✏️</button>
                                        {!choice.nextNodeId && (
                                            <button 
                                                onClick={() => {
                                                    setLinkChoiceInfo({ nodeId: node.id, choiceIdx: idx });
                                                    setNewNode(prev => ({ ...prev, id: `node_${activeEditorStoryId.replace('story_', '')}_${Date.now().toString().slice(-4)}` }));
                                                }}
                                                className="bg-emerald-500 border-2 border-black rounded-full w-6 h-6 flex items-center justify-center shadow hover:bg-emerald-400 transition-all"
                                                title="Düğüm Ekle"
                                            >➕</button>
                                        )}
                                    </div>
                                </div>
                                {renderVisualNode(story, choice.nextNodeId || '', nextVisited)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const currentStory = gameData.storylines.find(s => s.id === activeEditorStoryId);

    return (
        <div className="space-y-6 text-slate-800 font-parchment text-lg">
            <div className="bg-[#2a131b] border-4 border-slate-900 p-6 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between items-center gap-4 relative">
                <div>
                    <h1 className="text-3xl font-bold text-amber-400 font-magic">🧙‍♂️ Kozmos Yaratıcı Atölyesi</h1>
                    <p className="text-amber-100/60 text-sm font-sans">Senaryo ve Veritabanı Editörü</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleExportJSON} className="bg-emerald-600 hover:bg-emerald-500 text-white font-magic font-bold px-5 py-2.5 rounded-xl border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">💾 Senaryoyu Kaydet</button>
                    <button onClick={() => setAppMode('portal')} className="bg-red-800 hover:bg-red-700 text-white font-magic font-bold px-5 py-2.5 rounded-xl border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">🚪 Çıkış</button>
                </div>
            </div>

            <div className="flex flex-wrap gap-2.5 bg-[#2a131b] p-3 rounded-2xl border-4 border-slate-900">
                {[
                    { id: 'dataEditor', label: '🌿 Element & Reçete' },
                    { id: 'dialogueEditor', label: '💬 Diyalog & Karakter' },
                    { id: 'introEditor', label: '📖 Hikaye Girişi' },
                    { id: 'initialStateEditor', label: t('ui.initial_state_tab') },
                    { id: 'musicEditor', label: '🎵 Müzik' },
                    { id: 'newsEditor', label: t('ui.news_tab') },
                    { id: 'marketEditor', label: '🛒 Market' },
                    { id: 'translationEditor', label: '🌍 Dil' },
                    { id: 'jsonHub', label: '📂 JSON' }
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 py-3 rounded-xl font-bold font-magic flex-1 border-4 border-black ${activeTab === tab.id ? 'bg-indigo-600 text-white border-black' : 'bg-slate-800 text-slate-400 border-slate-955'}`}>{tab.label}</button>
                ))}
            </div>

            {activeTab === 'dataEditor' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 font-parchment">
                    <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 space-y-4">
                        <h2 className="text-2xl font-bold font-magic">🌿 {editingPlantId ? 'Bitkiyi Düzenle' : 'Yeni Bitki'}</h2>
                        <div className="space-y-2">
                            <input className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold" placeholder="ID (p_...)" value={editingPlantId || newPlant.id} onChange={e => setNewPlant({...newPlant, id: e.target.value})} disabled={!!editingPlantId}/>
                            <input className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold" placeholder="İsim" value={newPlant.name} onChange={e => setNewPlant({...newPlant, name: e.target.value})}/>
                            <div className="flex gap-2">
                                <select className="flex-1 bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold" value={newPlant.rarity} onChange={e => setNewPlant({...newPlant, rarity: e.target.value})}>
                                    <option value="Yaygın">Yaygın</option>
                                    <option value="Normal">Normal</option>
                                    <option value="Nadir">Nadir</option>
                                    <option value="Efsanevi">Efsanevi</option>
                                </select>
                                <input type="number" className="w-24 bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold" placeholder="Maliyet" value={newPlant.cost} onChange={e => setNewPlant({...newPlant, cost: Number(e.target.value)})}/>
                            </div>
                            <div className="p-2 border-2 border-slate-400 rounded-lg bg-white/50">
                                <p className="text-xs font-bold mb-1">Özellikler:</p>
                                <div className="flex flex-wrap gap-1">
                                    {gameData.plantProperties.map(prop => (
                                        <button key={prop.name} onClick={() => toggleProp(prop.name)} className={`text-xs px-2 py-1 rounded border transition-colors ${newPlant.properties.includes(prop.name) ? 'bg-indigo-600 text-white border-indigo-900' : 'bg-white border-slate-300'}`}>{prop.name}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <button onClick={handleAddPlant} className="w-full bg-emerald-500 font-bold py-3 rounded-xl border-4 border-black font-magic shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-emerald-400">Kaydet</button>
                    </div>

                    <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 space-y-4">
                        <h2 className="text-2xl font-bold font-magic">☣️ Yeni Hastalık</h2>
                        <input className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold" placeholder="ID (d_...)" value={newDisease.id} onChange={e => setNewDisease({...newDisease, id: e.target.value})}/>
                        <input className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold" placeholder="Hastalık İsmi" value={newDisease.name} onChange={e => setNewDisease({...newDisease, name: e.target.value})}/>
                        <div className="p-2 border-2 border-slate-400 rounded-lg bg-white/50 h-28 overflow-y-auto">
                            <p className="text-xs font-bold mb-1">Semptomlar:</p>
                            <div className="flex flex-wrap gap-1">
                                {gameData.diseaseSymptoms.map(symp => (
                                    <button key={symp} onClick={() => setNewDisease({...newDisease, symptoms: newDisease.symptoms.includes(symp) ? newDisease.symptoms.filter(s => s !== symp) : [...newDisease.symptoms, symp]})} className={`text-xs px-2 py-1 rounded border transition-colors ${newDisease.symptoms.includes(symp) ? 'bg-red-600 text-white' : 'bg-white'}`}>{symp}</button>
                                ))}
                            </div>
                        </div>
                        <button onClick={handleAddDisease} className="w-full bg-emerald-500 font-bold py-3 rounded-xl border-4 border-black font-magic shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">Hastalık Ekle</button>
                    </div>

                    <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 space-y-4 lg:col-span-2">
                        <h2 className="text-2xl font-bold font-magic">🧪 {editingPotionId ? 'İksiri Düzenle' : 'Yeni İksir Reçetesi'}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <input className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold" placeholder="İksir ID" value={editingPotionId || newPotion.id} onChange={e => setNewPotion({...newPotion, id: e.target.value})} disabled={!!editingPotionId}/>
                                <input className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold" placeholder="İksir İsmi" value={newPotion.name} onChange={e => setNewPotion({...newPotion, name: e.target.value})}/>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold">Fiyat:</span>
                                    <input type="number" className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold" value={newPotion.sellPrice} onChange={e => setNewPotion({...newPotion, sellPrice: Number(e.target.value)})}/>
                                </div>
                            </div>
                            <div className="p-2 border-2 border-slate-400 rounded-lg bg-white/50 h-32 overflow-y-auto">
                                <p className="text-xs font-bold mb-1">Tedavi Ettiği Hastalıklar:</p>
                                <div className="flex flex-wrap gap-1">
                                    {gameData.diseases.map(d => (
                                        <button key={d.id} onClick={() => setNewPotion({...newPotion, curesDiseaseIds: newPotion.curesDiseaseIds.includes(d.id) ? newPotion.curesDiseaseIds.filter(id => id !== d.id) : [...newPotion.curesDiseaseIds, d.id]})} className={`text-xs px-2 py-1 rounded border ${newPotion.curesDiseaseIds.includes(d.id) ? 'bg-emerald-600 text-white' : 'bg-white'}`}>{d.name}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex gap-1">
                                    <select className="flex-1 text-[10px] p-1 border font-bold" value={tempIngredient.id} onChange={e => setTempIngredient({...tempIngredient, id: e.target.value})}>
                                        <option value="">Malzeme Seç</option>
                                        {gameData.plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <input type="number" className="w-10 text-[10px] p-1 border" value={tempIngredient.count} onChange={e => setTempIngredient({...tempIngredient, count: Number(e.target.value)})}/>
                                    <button onClick={handleAddTempIngredient} className="bg-slate-800 text-white px-2 rounded font-bold">+</button>
                                </div>
                                <div className="text-[10px] space-y-1 max-h-20 overflow-y-auto font-sans">
                                    {newPotion.ingredients.map((ing, idx) => (
                                        <div key={idx} className="flex justify-between bg-white p-1 rounded border">
                                            <span>{gameData.plants.find(p => p.id === ing.id)?.name} x{ing.count}</span>
                                            <button onClick={() => setNewPotion({...newPotion, ingredients: newPotion.ingredients.filter((_, i) => i !== idx)})} className="text-red-600 font-bold">x</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <button onClick={handleAddPotionRecipe} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl border-4 border-black font-magic shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-indigo-500">İksiri Kaydet</button>
                    </div>

                    <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 space-y-4">
                        <h3 className="text-xl font-bold font-magic">Tanımlı Bitkiler</h3>
                        <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                            {gameData.plants.map(p => (
                                <div key={p.id} className="flex justify-between items-center bg-amber-50 p-2.5 rounded-xl border-2 border-slate-400">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm">{t(`plant.${p.id}.name`, p.name)}</span>
                                        <span className="text-[10px] font-mono text-slate-500">{p.id} | {p.rarity} | {p.cost}💰</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => {setEditingPlantId(p.id); setNewPlant(p);}} className="bg-yellow-500 text-black text-[10px] px-2 py-1 rounded font-bold border border-black">Düzenle</button>
                                        <button onClick={() => handleRemovePlant(p.id)} className="bg-red-800 text-white text-[10px] px-2 py-1 rounded font-bold border border-black">Sil</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 space-y-4">
                        <h3 className="text-xl font-bold font-magic">Tanımlı İksirler</h3>
                        <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                            {gameData.potions.map(pot => (
                                <div key={pot.id} className="flex justify-between items-center bg-amber-50 p-2.5 rounded-xl border-2 border-slate-400">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm">{t(`potion.${pot.id}.name`, pot.name)}</span>
                                        <span className="text-[10px] font-mono text-slate-500">{pot.id} | {pot.sellPrice}💰</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => {setEditingPotionId(pot.id); setNewPotion(pot);}} className="bg-yellow-500 text-black text-[10px] px-2 py-1 rounded font-bold border border-black">Düzenle</button>
                                        <button onClick={() => setGameData(prev => prev ? {...prev, potions: prev.potions.filter(p => p.id !== pot.id), marketRecipes: (prev.marketRecipes || []).filter(mr => mr.potionId !== pot.id)} : prev)} className="bg-red-800 text-white text-[10px] px-2 py-1 rounded font-bold border border-black">Sil</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 space-y-4">
                        <h3 className="text-xl font-bold font-magic">✨ Semptomlar</h3>
                        <div className="flex gap-2">
                            <input className="flex-1 bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold" placeholder="Yeni Semptom" value={newSymptom} onChange={e => setNewSymptom(e.target.value)}/>
                            <button onClick={handleAddSymptom} className="bg-slate-800 text-white px-4 rounded-xl border-2 border-black">+</button>
                        </div>
                        <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-2 bg-white/30 rounded-lg border border-slate-300">
                            {gameData.diseaseSymptoms.map(s => (
                                <div key={s} className="bg-amber-100 px-2 py-1 rounded-lg border border-amber-300 text-[10px] flex items-center gap-2">
                                    {s}
                                    <button onClick={() => setGameData(prev => prev ? {...prev, diseaseSymptoms: prev.diseaseSymptoms.filter(sym => sym !== s)} : prev)} className="text-red-700 font-bold">x</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 space-y-4">
                        <h3 className="text-xl font-bold font-magic">💎 Bitki Özellikleri</h3>
                        <div className="space-y-2">
                            <input className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold" placeholder="Özellik İsmi" value={newPlantProperty.name} onChange={e => setNewPlantProperty({...newPlantProperty, name: e.target.value})}/>
                            <div className="p-2 border-2 border-slate-400 rounded-lg bg-white/50 h-24 overflow-y-auto">
                                <p className="text-[10px] font-bold mb-1">Cure Ettiği Semptomlar:</p>
                                <div className="flex flex-wrap gap-1">
                                    {gameData.diseaseSymptoms.map(symp => (
                                        <button key={symp} onClick={() => setNewPlantProperty({...newPlantProperty, curesSymptoms: newPlantProperty.curesSymptoms.includes(symp) ? newPlantProperty.curesSymptoms.filter(s => s !== symp) : [...newPlantProperty.curesSymptoms, symp]})} className={`text-[10px] px-2 py-0.5 rounded border ${newPlantProperty.curesSymptoms.includes(symp) ? 'bg-indigo-600 text-white' : 'bg-white'}`}>{symp}</button>
                                    ))}
                                </div>
                            </div>
                            <button onClick={handleAddPlantProperty} className="w-full bg-slate-800 text-white font-bold py-2 rounded-xl border-4 border-black font-magic shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-700">{editingPropertyName ? 'Güncelle' : 'Özellik Ekle'}</button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'dialogueEditor' && (
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 min-h-[750px]">
                    <div className="bg-[#f3e8d2] p-4 rounded-2xl border-4 border-slate-900 overflow-y-auto flex flex-col">
                        <h2 className="text-2xl font-bold font-magic mb-3">👥 Karakterler</h2>
                        <div className="space-y-2 mb-4 p-2 bg-white/30 rounded-xl border border-slate-300">
                            <input className="w-full text-[10px] p-1 border rounded" placeholder="ID (story_...)" value={newStoryline.id} onChange={e => setNewStoryline({...newStoryline, id: e.target.value})}/>
                            <input className="w-full text-[10px] p-1 border rounded" placeholder="İsim" value={newStoryline.characterName} onChange={e => setNewStoryline({...newStoryline, characterName: e.target.value})}/>
                            <button onClick={handleAddStoryline} className="w-full bg-emerald-600 text-white text-[10px] py-1 rounded font-magic">Yeni Karakter Ekle</button>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-1">
                            {gameData.storylines.map(story => (
                                <div key={story.id} className="relative group">
                                    <button onClick={() => setActiveEditorStoryId(story.id)} className={`w-full text-left p-3 rounded-xl border-2 mb-2 transition-all ${activeEditorStoryId === story.id ? 'bg-[#dfd1b3] border-slate-900 shadow-inner' : 'bg-amber-50/50 border-transparent hover:border-amber-300'}`}>
                                        <span className="font-bold text-sm block font-magic">{story.characterName}</span>
                                        <span className="text-[10px] text-slate-500 font-mono">ID: {story.id}</span>
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleRemoveStoryline(story.id); }}
                                        className="absolute top-2 right-2 bg-red-100 text-red-600 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 border border-red-200 z-10"
                                        title="Karakteri Sil"
                                    >✕</button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="xl:col-span-3 bg-[#e9dbbe] border-4 border-slate-900 rounded-2xl flex flex-col relative overflow-hidden">
                        {currentStory && (
                            <div className="bg-slate-800 text-white p-4 border-b-4 border-slate-900 flex flex-col md:flex-row gap-4 items-end z-10">
                                <div className="flex-1 w-full space-y-2">
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Karakter İsmi</label>
                                            <input className="w-full bg-slate-700 border border-slate-600 rounded p-1.5 text-sm font-magic" value={editStoryData.characterName} onChange={e => setEditStoryData({...editStoryData, characterName: e.target.value})}/>
                                        </div>
                                        <div className="w-24">
                                            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Avatar</label>
                                            <input className="w-full bg-slate-700 border border-slate-600 rounded p-1.5 text-sm text-center" value={editStoryData.avatarUrl} onChange={e => setEditStoryData({...editStoryData, avatarUrl: e.target.value})}/>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Karakter Açıklaması</label>
                                        <textarea className="w-full bg-slate-700 border border-slate-600 rounded p-1.5 text-xs h-10 resize-none" value={editStoryData.description} onChange={e => setEditStoryData({...editStoryData, description: e.target.value})}/>
                                    </div>
                                </div>
                                <button onClick={handleUpdateStoryline} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold font-magic border-2 border-white/20 shadow-lg transition-colors whitespace-nowrap">Bilgileri Güncelle</button>
                            </div>
                        )}
                        {(selectedNodeId || editingNodeId || linkChoiceInfo || editingChoiceInfo) && (
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
                                <div className="bg-white/95 backdrop-blur-sm p-6 rounded-3xl border-4 border-slate-900 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4 font-parchment">
                                    <div className="flex justify-between items-center border-b-4 border-slate-100 pb-2">
                                        <h3 className="text-2xl font-bold font-magic text-slate-800">
                                            {selectedNodeId ? '✨ Yeni Seçenek Ekle' : editingNodeId ? '✏️ Düğümü Düzenle' : linkChoiceInfo ? '🎭 Yeni Düğüm Ekle' : '✏️ Seçeneği Düzenle'}
                                        </h3>
                                        <button 
                                            onClick={() => { setSelectedNodeId(null); setEditingNodeId(null); setLinkChoiceInfo(null); setEditingChoiceInfo(null); }}
                                            className="bg-red-100 text-red-600 w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 border-red-200 hover:bg-red-200"
                                        >✕</button>
                                    </div>

                                    {(selectedNodeId || editingChoiceInfo) && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <p className="text-xs font-bold text-indigo-700 bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                                                    {selectedNodeId ? `Düğüm: #${selectedNodeId}` : `Düzenlenen Seçenek: #${editingChoiceInfo?.nodeId} (Idx: ${editingChoiceInfo?.choiceIdx})`}
                                                </p>
                                                <div>
                                                    <label className="text-xs font-bold block mb-1">Seçenek Metni</label>
                                                    <input className="w-full text-sm p-2.5 border-2 border-slate-300 rounded-xl focus:border-indigo-500 outline-none" placeholder="Örn: 'Tabii, yardım edebilirim.'" value={newChoice.text} onChange={e => setNewChoice({...newChoice, text: e.target.value})}/>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold block mb-1">Hedef Düğüm ID (Opsiyonel)</label>
                                                    <input className="w-full text-sm p-2.5 border-2 border-slate-300 rounded-xl" placeholder="node_..." value={newChoice.nextNodeId} onChange={e => setNewChoice({...newChoice, nextNodeId: e.target.value})}/>
                                                </div>
                                                {selectedNodeId && (
                                                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                                                        <input type="checkbox" id="autoNode" className="w-4 h-4" checked={newChoice.autoCreateNode} onChange={e => setNewChoice({...newChoice, autoCreateNode: e.target.checked})}/>
                                                        <label htmlFor="autoNode" className="text-xs font-bold cursor-pointer">Otomatik Düğüm Oluştur</label>
                                                    </div>
                                                )}
                                                <button 
                                                    onClick={editingChoiceInfo ? handleSaveChoiceEdits : () => handleAddChoiceToNodeAdv(selectedNodeId!)} 
                                                    className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-bold font-magic border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 active:translate-y-1 transition-all"
                                                >
                                                    {editingChoiceInfo ? 'Değişiklikleri Kaydet' : 'Sisteme Kaydet'}
                                                </button>
                                            </div>

                                            <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200 space-y-4">
                                                <h4 className="text-sm font-bold border-b border-slate-200 pb-1">💎 Alışveriş & Takas</h4>
                                                
                                                <div className="space-y-3">
                                                    <div className="p-2 bg-red-50 rounded-xl border border-red-100">
                                                        <p className="text-[10px] font-bold text-red-800 mb-1">Oyuncudan Alınacaklar:</p>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="flex flex-col gap-1">
                                                                <input type="number" placeholder="Altın" className="text-xs p-1.5 border rounded" value={newChoice.reqGold || ''} onChange={e => setNewChoice({...newChoice, reqGold: Number(e.target.value)})}/>
                                                            </div>
                                                            <div className="flex flex-col gap-1">
                                                                <select className="text-[10px] p-1.5 border rounded" value={newChoice.reqPlant} onChange={e => setNewChoice({...newChoice, reqPlant: e.target.value})}>
                                                                    <option value="">Bitki Seç</option>
                                                                    {gameData.plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                                </select>
                                                                <input type="number" placeholder="Miktar" className="text-[10px] p-1 border rounded" value={newChoice.reqPlantCount || ''} onChange={e => setNewChoice({...newChoice, reqPlantCount: Number(e.target.value)})}/>
                                                            </div>
                                                            <div className="flex flex-col gap-1 col-span-2 mt-1 pt-1 border-t border-red-200">
                                                                <select className="text-[10px] p-1.5 border rounded" value={newChoice.reqPotion} onChange={e => setNewChoice({...newChoice, reqPotion: e.target.value})}>
                                                                    <option value="">İksir Seç</option>
                                                                    {gameData.potions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                                </select>
                                                                <input type="number" placeholder="İksir Miktarı" className="text-[10px] p-1 border rounded" value={newChoice.reqPotionCount || ''} onChange={e => setNewChoice({...newChoice, reqPotionCount: Number(e.target.value)})}/>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                                                        <p className="text-[10px] font-bold text-emerald-800 mb-1">Oyuncuya Verilecekler:</p>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="flex flex-col gap-1">
                                                                <input type="number" placeholder="Altın" className="text-xs p-1.5 border rounded" value={newChoice.rewardGold || ''} onChange={e => setNewChoice({...newChoice, rewardGold: Number(e.target.value)})}/>
                                                            </div>
                                                            <div className="flex flex-col gap-1">
                                                                <select className="text-[10px] p-1.5 border rounded" value={newChoice.rewardPlantId} onChange={e => setNewChoice({...newChoice, rewardPlantId: e.target.value})}>
                                                                    <option value="">Bitki Seç</option>
                                                                    {gameData.plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                                </select>
                                                                <input type="number" placeholder="Miktar" className="text-[10px] p-1 border rounded" value={newChoice.rewardPlantCount || ''} onChange={e => setNewChoice({...newChoice, rewardPlantCount: Number(e.target.value)})}/>
                                                            </div>
                                                            <div className="flex flex-col gap-1 col-span-2 mt-1 pt-1 border-t border-emerald-200">
                                                                <select className="text-[10px] p-1.5 border rounded" value={newChoice.rewardPotionId} onChange={e => setNewChoice({...newChoice, rewardPotionId: e.target.value})}>
                                                                    <option value="">İksir Seç</option>
                                                                    {gameData.potions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                                </select>
                                                                <input type="number" placeholder="İksir Miktarı" className="text-[10px] p-1 border rounded" value={newChoice.rewardPotionCount || ''} onChange={e => setNewChoice({...newChoice, rewardPotionCount: Number(e.target.value)})}/>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {editingNodeId && (
                                        <div className="space-y-4">
                                            <p className="text-xs font-bold text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-100">Düzenlenen: #{editingNodeId}</p>
                                            <div>
                                                <label className="text-xs font-bold block mb-1">NPC Konuşması</label>
                                                <textarea className="w-full text-sm p-3 border-2 border-slate-300 rounded-xl h-32 focus:border-amber-500 outline-none" value={editNodeData.npcText} onChange={e => setEditNodeData({...editNodeData, npcText: e.target.value})}/>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold block mb-1">İlişkili Hastalık</label>
                                                    <select className="w-full text-sm p-2.5 border-2 border-slate-300 rounded-xl" value={editNodeData.diseaseId} onChange={e => setEditNodeData({...editNodeData, diseaseId: e.target.value})}>
                                                        <option value="">Hastalık Yok</option>
                                                        {gameData.diseases.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold block mb-1">Görünme Günü</label>
                                                    <input type="number" className="w-full text-sm p-2.5 border-2 border-slate-300 rounded-xl" value={editNodeData.day} onChange={e => setEditNodeData({...editNodeData, day: Number(e.target.value)})}/>
                                                </div>
                                            </div>
                                            <button onClick={handleSaveNodeEdits} className="w-full bg-amber-600 text-white py-3 rounded-2xl font-bold font-magic border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 active:translate-y-1 transition-all">Değişiklikleri Kaydet</button>
                                        </div>
                                    )}

                                    {linkChoiceInfo && (
                                        <div className="space-y-4">
                                            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                                                <p className="text-xs font-bold text-indigo-800">Seçeneğe Bağlanıyor: #{linkChoiceInfo.nodeId} {'->'} Seçenek #{linkChoiceInfo.choiceIdx}</p>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold block mb-1">Yeni Düğüm ID</label>
                                                    <input className="w-full text-sm p-2.5 border-2 border-slate-300 rounded-xl" placeholder="node_..." value={newNode.id} onChange={e => setNewNode({...newNode, id: e.target.value})}/>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold block mb-1">İlişkili Hastalık</label>
                                                    <select className="w-full text-sm p-2.5 border-2 border-slate-300 rounded-xl" value={newNode.diseaseId} onChange={e => setNewNode({...newNode, diseaseId: e.target.value})}>
                                                        <option value="">Hastalık Yok</option>
                                                        {gameData.diseases.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold block mb-1">Görünme Günü</label>
                                                    <input type="number" className="w-full text-sm p-2.5 border-2 border-slate-300 rounded-xl" value={newNode.day} onChange={e => setNewNode({...newNode, day: Number(e.target.value)})}/>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold block mb-1">NPC Konuşması</label>
                                                <textarea className="w-full text-sm p-3 border-2 border-slate-300 rounded-xl h-32 focus:border-indigo-500 outline-none" placeholder="Karakter ne söyleyecek?..." value={newNode.npcText} onChange={e => setNewNode({...newNode, npcText: e.target.value})}/>
                                            </div>
                                            <button onClick={handleAddNodeToChoice} className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-bold font-magic border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 active:translate-y-1 transition-all">Düğümü Oluştur ve Bağla</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-auto p-8 pt-10">
                            {currentStory && currentStory.nodes.length > 0 ? renderVisualNode(currentStory, currentStory.nodes[0].id) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500 italic font-parchment">
                                    <span className="text-5xl mb-4 animate-bounce">🎭</span>
                                    <p className="text-xl font-bold text-slate-700">Bu karakterin hikayesi henüz yazılmamış.</p>
                                    <button onClick={() => setNewNode({...newNode, id: `node_${activeEditorStoryId.replace('story_', '')}_1`, npcText: 'Merhaba!'})} className="mt-4 bg-slate-800 text-white px-6 py-3 rounded-2xl text-lg not-italic font-magic border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:scale-105 transition-transform">Kaderini Çizmeye Başla</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'introEditor' && (
                <div className="bg-[#f3e8d2] p-6 rounded-2xl border-4 border-slate-900 space-y-6 font-parchment">
                    <h2 className="text-2xl font-bold font-magic border-b-2 border-slate-900 pb-2">📖 Hikaye Giriş Sayfaları</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-white/40 p-5 rounded-2xl border-2 border-slate-400 space-y-4">
                            <h3 className="text-xl font-bold font-magic text-indigo-900">{editingIntroPageId ? 'Sayfayı Düzenle' : 'Yeni Sayfa Oluştur'}</h3>
                            <input className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold" placeholder="Sayfa ID (intro_...)" value={newIntroPage.id} onChange={e => setNewIntroPage({...newIntroPage, id: e.target.value})} disabled={!!editingIntroPageId}/>
                            <input className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold" placeholder="Başlık" value={newIntroPage.title} onChange={e => setNewIntroPage({...newIntroPage, title: e.target.value})}/>
                            <textarea className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold h-40" placeholder="Anlatıcı metni buraya..." value={newIntroPage.text} onChange={e => setNewIntroPage({...newIntroPage, text: e.target.value})}/>
                            <input className="w-full bg-amber-50 border-2 border-slate-900 rounded-lg p-2 font-bold" placeholder="Görsel Yolu (assets/...)" value={newIntroPage.imageUrl} onChange={e => setNewIntroPage({...newIntroPage, imageUrl: e.target.value})}/>
                            <div className="flex gap-2">
                                <button onClick={handleAddIntroPage} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl border-4 border-black font-magic shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-emerald-500 transition-colors">{editingIntroPageId ? 'Değişiklikleri Kaydet' : 'Sayfayı Ekle'}</button>
                                {editingIntroPageId && <button onClick={() => {setEditingIntroPageId(null); setNewIntroPage({id: '', title: '', text: '', imageUrl: ''});}} className="bg-slate-500 text-white px-6 rounded-xl border-4 border-black font-magic">İptal</button>}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold font-magic">Akış Sıralaması</h3>
                            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-2">
                                {(gameData.introPages || []).map((page, idx) => (
                                    <div key={page.id} className="bg-[#dfd1b3] border-4 border-slate-900 p-4 rounded-2xl flex items-center gap-4 shadow-md group">
                                        <div className="flex flex-col gap-1">
                                            <button onClick={() => moveIntroPage(idx, 'up')} className="bg-white border-2 border-black rounded text-[10px] p-1 disabled:opacity-30 hover:bg-amber-100" disabled={idx === 0}>▲</button>
                                            <button onClick={() => moveIntroPage(idx, 'down')} className="bg-white border-2 border-black rounded text-[10px] p-1 disabled:opacity-30 hover:bg-amber-100" disabled={idx === (gameData.introPages || []).length - 1}>▼</button>
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold font-magic text-slate-800">#{idx+1}: {page.title}</p>
                                            <p className="text-xs text-slate-600 line-clamp-2 italic">"{page.text}"</p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <button onClick={() => {setEditingIntroPageId(page.id); setNewIntroPage(page);}} className="bg-yellow-500 p-2 rounded-xl border-2 border-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-105 transition-transform">✏️</button>
                                            <button onClick={() => handleRemoveIntroPage(page.id)} className="bg-red-800 text-white p-2 rounded-xl border-2 border-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-105 transition-transform">🗑️</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'initialStateEditor' && (
                <div className="bg-[#f3e8d2] p-8 rounded-2xl border-4 border-slate-900 space-y-8 font-parchment">
                    <h2 className="text-3xl font-bold font-magic border-b-4 border-indigo-900/10 pb-2 text-indigo-955">⚙️ Başlangıç Ayarları</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <div className="bg-white/50 p-6 rounded-2xl border-4 border-slate-900 shadow-md">
                                <h3 className="text-xl font-bold font-magic mb-4 flex items-center gap-2">💰 Cüzdan Bakiyesi</h3>
                                <div className="flex gap-3">
                                    <input type="number" className="flex-1 text-2xl p-3 border-4 border-black rounded-xl font-bold bg-amber-50" value={gameData.initialPlayerState.gold} onChange={e => handleUpdateInitialGold(Number(e.target.value))}/>
                                    <div className="bg-amber-400 px-4 flex items-center justify-center rounded-xl border-4 border-black font-bold text-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">ALTIN</div>
                                </div>
                            </div>
                            
                            <div className="bg-white/50 p-6 rounded-2xl border-4 border-slate-900 shadow-md">
                                <h3 className="text-xl font-bold font-magic mb-4 flex items-center gap-2">🌿 Başlangıç Bitkileri</h3>
                                <div className="flex gap-2 mb-4">
                                    <select className="flex-1 p-2 border-2 border-slate-900 rounded-lg font-bold" value={initPlantId} onChange={e => setInitPlantId(e.target.value)}>
                                        <option value="">Bitki Seç...</option>
                                        {gameData.plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <input type="number" className="w-20 p-2 border-2 border-slate-900 rounded-lg font-bold" value={initPlantCount} onChange={e => setInitPlantCount(Number(e.target.value))}/>
                                    <button onClick={handleAddInitialPlant} className="bg-emerald-600 text-white px-4 rounded-xl border-4 border-black font-bold text-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-emerald-500 transition-colors">+</button>
                                </div>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                    {Object.entries(gameData.initialPlayerState.inventory.plants).map(([id, count]) => (
                                        <div key={id} className="flex justify-between items-center bg-amber-50 p-3 rounded-xl border-2 border-slate-300">
                                            <span className="font-bold">{gameData.plants.find(p => p.id === id)?.name || id}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="bg-slate-800 text-white px-3 py-1 rounded-full text-sm font-bold">x{count}</span>
                                                <button onClick={() => handleRemoveInitialPlant(id)} className="text-red-700 font-bold hover:scale-125 transition-transform">✕</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white/50 p-6 rounded-2xl border-4 border-slate-900 shadow-md">
                                <h3 className="text-xl font-bold font-magic mb-4 flex items-center gap-2">🧪 Başlangıç İksirleri</h3>
                                <div className="flex gap-2 mb-4">
                                    <select className="flex-1 p-2 border-2 border-slate-900 rounded-lg font-bold" value={initPotionId} onChange={e => setInitPotionId(e.target.value)}>
                                        <option value="">İksir Seç...</option>
                                        {gameData.potions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <input type="number" className="w-20 p-2 border-2 border-slate-900 rounded-lg font-bold" value={initPotionCount} onChange={e => setInitPotionCount(Number(e.target.value))}/>
                                    <button onClick={handleAddInitialPotion} className="bg-indigo-600 text-white px-4 rounded-xl border-4 border-black font-bold text-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-indigo-500 transition-colors">+</button>
                                </div>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                    {Object.entries(gameData.initialPlayerState.inventory.potions).map(([id, count]) => (
                                        <div key={id} className="flex justify-between items-center bg-indigo-50 p-3 rounded-xl border-2 border-indigo-200">
                                            <span className="font-bold">{gameData.potions.find(p => p.id === id)?.name || id}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="bg-indigo-900 text-white px-3 py-1 rounded-full text-sm font-bold">x{count}</span>
                                                <button onClick={() => handleRemoveInitialPotion(id)} className="text-red-700 font-bold hover:scale-125 transition-transform">✕</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white/50 p-6 rounded-2xl border-4 border-slate-900 shadow-md">
                                <h3 className="text-xl font-bold font-magic mb-4 flex items-center gap-2">📜 Bilinen Tarifler</h3>
                                <div className="flex flex-wrap gap-2">
                                    {gameData.potions.map(pot => (
                                        <button key={pot.id} onClick={() => handleToggleKnownPotion(pot.id)} className={`px-3 py-2 rounded-xl border-2 font-bold transition-all shadow-sm ${gameData.initialPlayerState.knownPotions.includes(pot.id) ? 'bg-amber-400 border-black text-slate-900' : 'bg-slate-100 border-slate-300 text-slate-400 opacity-60'}`}>
                                            {pot.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'musicEditor' && (
                <div className="bg-[#f3e8d2] p-8 rounded-2xl border-4 border-slate-900 space-y-8 font-parchment">
                    <h2 className="text-3xl font-magic font-bold text-purple-900 border-b-4 border-purple-100 pb-2">🎵 Müzik & Atmosfer</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="bg-white/40 p-6 rounded-2xl border-4 border-slate-900 space-y-4">
                            <h3 className="text-xl font-bold font-magic">Melodi Kaydet</h3>
                            <div className="space-y-3">
                                <input className="w-full p-3 border-2 border-slate-900 rounded-xl bg-amber-50 font-bold" placeholder="ID (track_...)" value={newTrack.id} onChange={e => setNewTrack({...newTrack, id: e.target.value})}/>
                                <input className="w-full p-3 border-2 border-slate-900 rounded-xl bg-amber-50 font-bold" placeholder="Görünecek Başlık" value={newTrack.title} onChange={e => setNewTrack({...newTrack, title: e.target.value})}/>
                                <input className="w-full p-3 border-2 border-slate-900 rounded-xl bg-amber-50 font-bold" placeholder="assets/audio/melodi.mp3" value={newTrack.path} onChange={e => setNewTrack({...newTrack, path: e.target.value})}/>
                                <button onClick={handleAddTrack} className="w-full bg-purple-700 text-white font-bold py-4 rounded-2xl border-4 border-black font-magic shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-purple-600 transition-all">Track Kaydet</button>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold font-magic">Müzik Kitaplığı</h3>
                            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
                                {(gameData.soundtracks || []).map((track, idx) => (
                                    <div key={track.id} className={`flex justify-between items-center p-4 rounded-2xl border-4 transition-all ${currentTrackIndex === idx ? 'bg-purple-100 border-purple-900 shadow-inner' : 'bg-white border-slate-900'}`}>
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => changeTrack(idx)} className={`w-12 h-12 rounded-full border-4 border-black flex items-center justify-center text-xl transition-all ${currentTrackIndex === idx ? 'bg-white scale-110 shadow-lg' : 'bg-purple-50 hover:bg-purple-100'}`}>
                                                {currentTrackIndex === idx ? '🎵' : '▶️'}
                                            </button>
                                            <div>
                                                <p className="font-bold text-lg font-magic leading-tight">#{track.id}</p>
                                                <p className="text-sm italic text-slate-600">"{track.title}"</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleRemoveTrack(track.id)} className="bg-red-800 text-white w-10 h-10 rounded-xl border-4 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-110 transition-transform">🗑️</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'newsEditor' && (
                <div className="bg-[#f3e8d2] p-8 rounded-2xl border-4 border-slate-900 space-y-8 font-parchment">
                    <h2 className="text-3xl font-magic font-bold text-indigo-900 border-b-4 border-indigo-100 pb-2">📰 Köy Bülteni Düzenleyici</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="bg-white/40 p-6 rounded-2xl border-4 border-slate-900 space-y-4">
                            <h3 className="text-xl font-bold font-magic">Yeni Haber Yaz</h3>
                            <div className="grid grid-cols-3 gap-2">
                                <input className="col-span-2 p-3 border-2 border-slate-900 rounded-xl font-bold" placeholder="ID" value={newNews.id} onChange={e => setNewNews({...newNews, id: e.target.value})}/>
                                <input type="number" className="p-3 border-2 border-slate-900 rounded-xl font-bold text-center" placeholder="GÜN" value={newNews.day} onChange={e => setNewNews({...newNews, day: Number(e.target.value)})}/>
                            </div>
                            <textarea className="w-full p-4 border-2 border-slate-900 rounded-xl h-44 font-bold italic bg-amber-50" placeholder="Köyün duvarına asılacak haber..." value={newNews.text} onChange={e => setNewNews({...newNews, text: e.target.value})}/>
                            <button onClick={handleAddNews} className="w-full bg-indigo-800 text-white font-bold py-4 rounded-2xl border-4 border-black font-magic shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-indigo-700">Haberi Yayına Ver</button>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold font-magic text-slate-800">Geçmiş & Gelecek Havadisler</h3>
                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-3">
                                {(gameData.news || []).sort((a,b) => a.day - b.day).map(news => (
                                    <div key={news.id} className="bg-white border-4 border-slate-900 p-5 rounded-2xl relative shadow-md overflow-hidden">
                                        <div className="absolute top-0 right-0 bg-indigo-900 text-white px-4 py-1 rounded-bl-xl font-bold text-sm">GÜN {news.day}</div>
                                        <p className="text-lg font-bold italic mb-4 mt-2">"{news.text}"</p>
                                        <div className="flex justify-between items-center border-t-2 border-slate-100 pt-3">
                                            <span className="text-xs font-mono text-slate-500 font-bold uppercase">{news.id}</span>
                                            <button onClick={() => handleRemoveNews(news.id)} className="text-red-700 font-bold flex items-center gap-1 hover:underline">🗑️ Kaldır</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'marketEditor' && (
                <div className="bg-[#f3e8d2] p-8 rounded-2xl border-4 border-slate-900 space-y-8 font-parchment">
                    <h2 className="text-3xl font-magic font-bold text-emerald-900 border-b-4 border-emerald-100 pb-2">🛒 Market Tedarik Yönetimi</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <div className="bg-white/40 p-6 rounded-2xl border-4 border-slate-900 space-y-4">
                                <h3 className="text-xl font-bold font-magic flex items-center gap-2">🌿 Bitki Arzı</h3>
                                <select className="w-full p-3 border-2 border-slate-900 rounded-xl font-bold" value={selectedMarketPlantId} onChange={e => setSelectedMarketPlantId(e.target.value)}>
                                    <option value="">Ürün Seçiniz...</option>
                                    {gameData.plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-600">Fiyat (💰)</label>
                                        <input type="number" className="w-full p-2 border-2 border-slate-900 rounded-xl font-bold" value={marketPlantCost} onChange={e => setMarketPlantCost(Number(e.target.value))}/>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-600">Stok (📦)</label>
                                        <input type="number" className="w-full p-2 border-2 border-slate-900 rounded-xl font-bold" value={marketPlantStock} onChange={e => setMarketPlantStock(Number(e.target.value))}/>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-600">Gün (📅)</label>
                                        <input type="number" className="w-full p-2 border-2 border-slate-900 rounded-xl font-bold" value={marketPlantDay} onChange={e => setMarketPlantDay(Number(e.target.value))}/>
                                    </div>
                                </div>
                                <button onClick={handleAddMarketPlant} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-2xl border-4 border-black font-magic shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-emerald-500">Tezgahı Doldur</button>
                            </div>

                            <div className="bg-white/40 p-6 rounded-2xl border-4 border-slate-900 space-y-4">
                                <h3 className="text-xl font-bold font-magic flex items-center gap-2">📜 Reçete Arzı</h3>
                                <select className="w-full p-3 border-2 border-slate-900 rounded-xl font-bold" value={selectedMarketPotionId} onChange={e => setSelectedMarketPotionId(e.target.value)}>
                                    <option value="">Reçete Seçiniz...</option>
                                    {gameData.potions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-600">Fiyat (💰)</label>
                                        <input type="number" className="w-full p-2 border-2 border-slate-900 rounded-xl font-bold" value={marketPotionCost} onChange={e => setMarketPotionCost(Number(e.target.value))}/>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-600">Stok (📦)</label>
                                        <input type="number" className="w-full p-2 border-2 border-slate-900 rounded-xl font-bold" value={marketPotionStock} onChange={e => setMarketPotionStock(Number(e.target.value))}/>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-600">Gün (📅)</label>
                                        <input type="number" className="w-full p-2 border-2 border-slate-900 rounded-xl font-bold" value={marketPotionDay} onChange={e => setMarketPotionDay(Number(e.target.value))}/>
                                    </div>
                                </div>
                                <button onClick={handleAddMarketRecipe} className="w-full bg-indigo-700 text-white font-bold py-3 rounded-2xl border-4 border-black font-magic shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-indigo-600">Tarifi Satışa Çıkar</button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xl font-bold font-magic">Pazar Tezgahı (Özet)</h3>
                            <div className="grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto pr-3">
                                {(gameData.marketPlants || []).map(mp => (
                                    <div key={mp.plantId} className="bg-white border-4 border-slate-900 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                                        <div className="flex gap-4 items-center">
                                            <span className="text-3xl">🌿</span>
                                            <div>
                                                <p className="font-bold text-lg leading-tight">{gameData.plants.find(p => p.id === mp.plantId)?.name || mp.plantId}</p>
                                                <div className="flex gap-2 mt-1">
                                                    <span className="bg-amber-100 text-[10px] px-2 py-0.5 rounded-full border border-amber-300 font-bold">{mp.cost} 💰</span>
                                                    <span className="bg-emerald-100 text-[10px] px-2 py-0.5 rounded-full border border-emerald-300 font-bold">Stok: {mp.stock}</span>
                                                    <span className="bg-indigo-100 text-[10px] px-2 py-0.5 rounded-full border border-indigo-300 font-bold">G: {mp.availableDay}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => handleRemoveMarketPlant(mp.plantId)} className="bg-red-100 text-red-700 w-10 h-10 rounded-xl border-2 border-red-200 flex items-center justify-center hover:bg-red-800 hover:text-white transition-colors">🗑️</button>
                                    </div>
                                ))}
                                {(gameData.marketRecipes || []).map(mr => (
                                    <div key={mr.potionId} className="bg-white border-4 border-slate-900 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                                        <div className="flex gap-4 items-center">
                                            <span className="text-3xl">📜</span>
                                            <div>
                                                <p className="font-bold text-lg leading-tight">{gameData.potions.find(p => p.id === mr.potionId)?.name || mr.potionId}</p>
                                                <div className="flex gap-2 mt-1">
                                                    <span className="bg-amber-100 text-[10px] px-2 py-0.5 rounded-full border border-amber-300 font-bold">{mr.cost} 💰</span>
                                                    <span className="bg-indigo-100 text-[10px] px-2 py-0.5 rounded-full border border-indigo-300 font-bold">G: {mr.availableDay}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => handleRemoveMarketRecipe(mr.potionId)} className="bg-red-100 text-red-700 w-10 h-10 rounded-xl border-2 border-red-200 flex items-center justify-center hover:bg-red-800 hover:text-white transition-colors">🗑️</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'translationEditor' && (
                <div className="bg-[#f3e8d2] p-8 rounded-2xl border-4 border-slate-900 space-y-8 font-parchment">
                    <h2 className="text-3xl font-magic font-bold text-slate-900 border-b-4 border-slate-100 pb-2">🌍 Yerelleştirme & Çeviri Atölyesi</h2>
                    <div className="bg-white/60 p-4 rounded-2xl border-4 border-black/10 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <span className="text-4xl">📚</span>
                            <div>
                                <p className="font-bold text-lg">Dil Anahtarları Sözlüğü</p>
                                <p className="text-xs text-slate-500 font-sans font-bold">Toplam {getAllLocalesKeys().length} aktif kelime/cümle tanımlı.</p>
                            </div>
                        </div>
                        <div className="bg-indigo-900 text-white px-4 py-2 rounded-xl font-bold font-magic shadow-lg">JSON'U KAYDETMEYİ UNUTMA!</div>
                    </div>
                    <div className="max-h-[700px] overflow-y-auto pr-4 space-y-4 font-parchment">
                        {getAllLocalesKeys().map(key => (
                            <div key={key} className="bg-white border-4 border-slate-900 p-6 rounded-3xl grid grid-cols-1 lg:grid-cols-2 gap-6 shadow-md hover:shadow-lg transition-shadow">
                                <div className="lg:col-span-2 border-b-2 border-slate-100 pb-2 flex justify-between items-center bg-slate-50 -mx-6 -mt-6 px-6 py-2 rounded-t-2xl">
                                    <span className="font-mono font-bold text-indigo-900 text-sm tracking-widest">{key}</span>
                                    <div className="flex gap-1">
                                        {key.startsWith('char.') && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold">KARAKTER</span>}
                                        {key.startsWith('node.') && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">DİYALOG</span>}
                                        {key.startsWith('plant.') && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold">BİTKİ</span>}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-red-900 flex items-center gap-2 font-magic">🇹🇷 TÜRKÇE</label>
                                    <textarea className="w-full text-base p-4 border-2 border-slate-200 rounded-2xl bg-amber-50/30 focus:border-red-500 outline-none transition-colors min-h-[80px] font-bold" value={gameData.translations['tr']?.[key] || ''} onChange={e => handleTranslateChange('tr', key, e.target.value)}/>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-indigo-900 flex items-center gap-2 font-magic">🇺🇸 ENGLISH</label>
                                    <textarea className="w-full text-base p-4 border-2 border-slate-200 rounded-2xl bg-indigo-50/30 focus:border-indigo-500 outline-none transition-colors min-h-[80px] font-bold" value={gameData.translations['en']?.[key] || ''} onChange={e => handleTranslateChange('en', key, e.target.value)}/>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'jsonHub' && (
                <div className="bg-[#f3e8d2] p-8 rounded-2xl border-4 border-slate-900 space-y-6 font-parchment">
                    <h2 className="text-3xl font-bold font-magic flex items-center gap-3">📂 JSON Kristali (Veri Merkezi)</h2>
                    <p className="text-lg font-bold text-slate-600">Oyunun tüm ruhu ve hafızası bu kodların içinde saklı. Dikkatli ol şifacı.</p>
                    
                    <div className="space-y-2">
                        <label className="text-sm font-bold font-magic text-emerald-900 flex items-center gap-2">💎 GÜNCEL VERİ YAPISI (READ-ONLY)</label>
                        <div className="relative group">
                            <textarea readOnly className="w-full h-[400px] bg-slate-900 text-emerald-400 p-6 rounded-3xl font-mono text-xs border-4 border-black shadow-inner leading-relaxed" value={JSON.stringify(gameData, null, 2)}/>
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="bg-emerald-500 text-black px-3 py-1 rounded-full text-[10px] font-bold border-2 border-black">SADECE İZLE</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 bg-indigo-50 p-6 rounded-3xl border-4 border-indigo-900">
                        <label className="text-sm font-bold font-magic text-indigo-900 flex items-center gap-2">🌀 HARİCİ VERİ YÜKLE (IMPORT)</label>
                        <textarea className="w-full h-40 bg-white p-4 rounded-2xl border-2 border-indigo-200 font-mono text-xs outline-none focus:border-indigo-500 transition-colors" placeholder="Kopyaladığın JSON verisini buraya fısılda..." value={importText} onChange={e => setImportText(e.target.value)}/>
                        <div className="flex items-center justify-between">
                             <span className={`font-bold font-magic ${importStatus.includes('✅') ? 'text-emerald-600' : 'text-red-600'}`}>{importStatus}</span>
                             <button onClick={handleImportJSON} className="bg-indigo-900 text-white font-magic font-bold px-8 py-4 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:scale-105 active:translate-y-1 transition-all">KRİSTALİ UYANDIR (YÜKLE)</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
