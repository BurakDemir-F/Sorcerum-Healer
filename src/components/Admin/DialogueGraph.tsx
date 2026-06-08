import React, { useState, useRef, useMemo, useEffect } from 'react';
import { GameData, Storyline, StoryNode, Choice } from '../../types';

interface DialogueGraphProps {
    gameData: GameData;
}

interface NodePosition {
    x: number;
    y: number;
    node: StoryNode;
    storyId: string;
    characterName: string;
}

const DAY_WIDTH = 500;
const CHARACTER_HEIGHT = 200;
const NODE_WIDTH = 220;
const NODE_HEIGHT = 120;

export function DialogueGraph({ gameData }: DialogueGraphProps): React.JSX.Element {
    const [zoom, setZoom] = useState(0.8);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [offset, setOffset] = useState({ x: 50, y: 50 });
    const [isDragging, setIsDragging] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen]);

    // Calculate effective day for each node
    const nodeData = useMemo(() => {
        const positions: Record<string, NodePosition> = {};
        const storylines = gameData.storylines;

        storylines.forEach((story, sIdx) => {
            const nodeMap: Record<string, StoryNode> = {};
            story.nodes.forEach(n => nodeMap[n.id] = n);

            const effectiveDays: Record<string, number> = {};

            // Pass 1: Set explicit days
            story.nodes.forEach(node => {
                if (node.day !== undefined) {
                    effectiveDays[node.id] = node.day;
                }
            });

            // Pass 2: Propagate days through choices
            let changed = true;
            let iterations = 0;
            while (changed && iterations < 100) {
                changed = false;
                iterations++;
                story.nodes.forEach(node => {
                    const currentDay = effectiveDays[node.id];
                    if (currentDay !== undefined) {
                        // Regular choices
                        node.choices.forEach(choice => {
                            if (choice.nextNodeId && nodeMap[choice.nextNodeId]) {
                                const nextDay = currentDay + (choice.delayDays || 0);
                                if (effectiveDays[choice.nextNodeId] === undefined || effectiveDays[choice.nextNodeId] < nextDay) {
                                    effectiveDays[choice.nextNodeId] = nextDay;
                                    changed = true;
                                }
                            }
                        });
                        // Treatment nodes
                        if (node.dynamicSuccessNodeId && nodeMap[node.dynamicSuccessNodeId]) {
                            if (effectiveDays[node.dynamicSuccessNodeId] === undefined || effectiveDays[node.dynamicSuccessNodeId] < currentDay) {
                                effectiveDays[node.dynamicSuccessNodeId] = currentDay;
                                changed = true;
                            }
                        }
                        if (node.dynamicFailNodeId && nodeMap[node.dynamicFailNodeId]) {
                            if (effectiveDays[node.dynamicFailNodeId] === undefined || effectiveDays[node.dynamicFailNodeId] < currentDay) {
                                effectiveDays[node.dynamicFailNodeId] = currentDay;
                                changed = true;
                            }
                        }
                    }
                });
            }

            // Assign positions
            // To handle multiple nodes on the same day for same character, we add a sub-offset
            const dayUsage: Record<number, number> = {};

            story.nodes.forEach(node => {
                const day = effectiveDays[node.id] || 1;
                const subIndex = dayUsage[day] || 0;
                dayUsage[day] = subIndex + 1;

                positions[node.id] = {
                    x: day * DAY_WIDTH + (subIndex * (NODE_WIDTH + 20)),
                    y: sIdx * CHARACTER_HEIGHT + 100,
                    node,
                    storyId: story.id,
                    characterName: story.characterName
                };
            });
        });

        return positions;
    }, [gameData.storylines]);

    const maxDay = useMemo(() => {
        let max = 1;
        Object.values(nodeData).forEach(pos => {
            const day = Math.floor(pos.x / DAY_WIDTH);
            if (day > max) max = day;
        });
        return max;
    }, [nodeData]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0) { // Left click for pan
            setIsDragging(true);
            setLastMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            const dx = e.clientX - lastMousePos.x;
            const dy = e.clientY - lastMousePos.y;
            setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            setLastMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleWheel = (e: React.WheelEvent) => {
        const delta = e.deltaY;
        const scaleAmount = 0.1;
        const newZoom = delta > 0 ? zoom - scaleAmount : zoom + scaleAmount;
        setZoom(Math.max(0.1, Math.min(2, newZoom)));
    };

    const connections = useMemo(() => {
        const lines: React.JSX.Element[] = [];
        Object.values(nodeData).forEach(startPos => {
            const node = startPos.node;
            
            const addLine = (targetId: string, label: string, color: string) => {
                const endPos = nodeData[targetId];
                if (endPos) {
                    const x1 = startPos.x + NODE_WIDTH;
                    const y1 = startPos.y + NODE_HEIGHT / 2;
                    const x2 = endPos.x;
                    const y2 = endPos.y + NODE_HEIGHT / 2;
                    
                    const midX = (x1 + x2) / 2;
                    
                    lines.push(
                        <g key={`${node.id}-${targetId}-${label}`}>
                            <path 
                                d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                                fill="none"
                                stroke={color}
                                strokeWidth="3"
                                strokeOpacity="0.6"
                                markerEnd="url(#arrowhead)"
                            />
                            {label && (
                                <g>
                                    <rect 
                                        x={midX - (label.length * 3.5)} 
                                        y={(y1 + y2) / 2 - 18} 
                                        width={label.length * 7} 
                                        height={18} 
                                        rx="4" 
                                        fill="#1e293b" 
                                        fillOpacity="0.8"
                                    />
                                    <text x={midX} y={(y1 + y2) / 2 - 5} fontSize="12" fill={color} textAnchor="middle" className="font-bold font-sans">
                                        {label}
                                    </text>
                                </g>
                            )}
                        </g>
                    );
                }
            };

            node.choices.forEach((choice, idx) => {
                if (choice.nextNodeId) {
                    addLine(choice.nextNodeId, choice.text.substring(0, 15) + (choice.text.length > 15 ? '...' : ''), '#94a3b8');
                }
            });

            if (node.dynamicSuccessNodeId) {
                addLine(node.dynamicSuccessNodeId, 'Başarı', '#10b981');
            }
            if (node.dynamicFailNodeId) {
                addLine(node.dynamicFailNodeId, 'Hata', '#ef4444');
            }
        });
        return lines;
    }, [nodeData]);

    return (
        <div 
            ref={containerRef}
            className={`${isFullscreen ? 'fixed inset-0 z-[99999] w-screen h-screen rounded-none' : 'w-full h-[700px] rounded-3xl relative'} bg-[#1a0f14] border-8 border-slate-900 overflow-hidden cursor-grab active:cursor-grabbing`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
        >
            {/* Background Grid */}
            <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: `radial-gradient(circle, #334155 1px, transparent 1px)`,
                    backgroundSize: `${40 * zoom}px ${40 * zoom}px`,
                    backgroundPosition: `${offset.x}px ${offset.y}px`
                }}
            />

            <div 
                style={{ 
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    transformOrigin: '0 0',
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
                className="relative"
            >
                {/* Day Labels */}
                <div className="flex absolute top-0 left-0 pointer-events-none" style={{ height: gameData.storylines.length * CHARACTER_HEIGHT + 200 }}>
                    {Array.from({ length: maxDay + 2 }).map((_, i) => (
                        <div key={i} className="border-l border-slate-700/30 flex flex-col" style={{ width: DAY_WIDTH }}>
                            <div className="bg-slate-900/80 text-amber-500 px-4 py-2 font-magic text-xl border-b-4 border-slate-955 sticky top-0 z-20">
                                GÜN {i}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Character Labels */}
                <div className="absolute top-0 left-0 pointer-events-none z-10">
                    {gameData.storylines.map((story, idx) => (
                        <div 
                            key={story.id} 
                            className="bg-slate-900/90 text-amber-200 px-6 py-4 font-magic text-2xl border-4 border-slate-955 rounded-r-3xl shadow-xl flex items-center gap-4"
                            style={{ 
                                position: 'absolute', 
                                top: idx * CHARACTER_HEIGHT + 80, 
                                left: 0,
                                width: 250
                            }}
                        >
                            <span className="text-3xl">{story.avatarUrl || '👤'}</span>
                            <span className="truncate">{story.characterName}</span>
                        </div>
                    ))}
                </div>

                {/* Connections SVG */}
                <svg className="absolute top-0 left-0 pointer-events-none" style={{ width: (maxDay + 2) * DAY_WIDTH * 2, height: gameData.storylines.length * CHARACTER_HEIGHT + 500 }}>
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                        </marker>
                    </defs>
                    {connections}
                </svg>

                {/* Nodes */}
                {Object.values(nodeData).map(pos => (
                    <div 
                        key={pos.node.id}
                        className="absolute bg-[#f3e8d2] border-4 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 overflow-hidden flex flex-col group hover:scale-105 transition-transform"
                        style={{
                            left: pos.x,
                            top: pos.y,
                            width: NODE_WIDTH,
                            height: NODE_HEIGHT,
                        }}
                    >
                        <div className="text-[10px] font-sans font-bold text-slate-500 flex justify-between">
                            <span>{pos.node.id}</span>
                            {pos.node.day && <span className="text-red-800">GÜN {pos.node.day}</span>}
                        </div>
                        <div className="text-xs font-parchment font-bold text-slate-800 line-clamp-3 mt-1 leading-tight flex-1">
                            {pos.node.npcText}
                        </div>
                        
                        <div className="mt-auto pt-1 border-t border-slate-300 flex gap-1 overflow-x-auto no-scrollbar">
                            {pos.node.choices.map((c, i) => (
                                <div key={i} title={c.text} className="text-[8px] bg-indigo-100 text-indigo-800 px-1 rounded border border-indigo-200 whitespace-nowrap">
                                    C{i+1}
                                </div>
                            ))}
                            {pos.node.diseaseId && (
                                <div className="text-[8px] bg-red-100 text-red-800 px-1 rounded border border-red-200">
                                    🩺 {pos.node.diseaseId}
                                </div>
                            )}
                        </div>

                        {/* Hover Overlay for details */}
                        <div className="absolute inset-0 bg-slate-900/95 text-white p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex flex-col text-[10px] font-sans">
                            <div className="font-bold text-amber-400 mb-1 border-b border-amber-400/30 pb-1">{pos.node.id}</div>
                            <div className="italic mb-2 line-clamp-4">"{pos.node.npcText}"</div>
                            <div className="space-y-1 overflow-y-auto">
                                {pos.node.choices.map((c, i) => (
                                    <div key={i} className="flex gap-1 items-start">
                                        <span className="text-indigo-400 font-bold shrink-0">C{i+1}:</span>
                                        <span>{c.text} ➔ {c.nextNodeId || 'BİTİŞ'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Controls Overlay */}
            <div className="absolute bottom-6 right-6 flex flex-col gap-2 items-end">
                <div className="bg-slate-900/80 backdrop-blur-md p-3 rounded-2xl border-4 border-black shadow-lg flex items-center gap-4">
                   <button 
                        onClick={() => setIsFullscreen(!isFullscreen)} 
                        className="w-10 h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg border-2 border-black font-bold text-xl"
                        title={isFullscreen ? "Küçült" : "Tam Ekran"}
                   >
                        {isFullscreen ? '⤦' : '⤢'}
                   </button>
                   <div className="w-px h-8 bg-slate-700 mx-1" />
                   <button onClick={() => setZoom(prev => Math.min(2, prev + 0.1))} className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded-lg border-2 border-black font-bold text-xl">+</button>
                   <span className="text-white font-magic w-12 text-center">{Math.round(zoom * 100)}%</span>
                   <button onClick={() => setZoom(prev => Math.max(0.1, prev - 0.1))} className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded-lg border-2 border-black font-bold text-xl">-</button>
                   <button onClick={() => { setZoom(0.8); setOffset({ x: 50, y: 50 }); }} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg border-2 border-black font-magic text-sm">Sıfırla</button>
                </div>
                <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl text-amber-200 text-xs font-sans text-center border-2 border-black">
                    Tut ve Sürükle (Pan) • Mouse Tekerleği (Zoom)
                </div>
            </div>
        </div>
    );
}
