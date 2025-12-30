import { useState, useCallback, useEffect } from 'react';
import { Canvas } from './components/Canvas';
import { Controls } from './components/Controls';
import { LevelSelector } from './components/LevelSelector';
import { BeadCounter } from './components/InvariantIndicator';
import { Onboarding, HelpButton } from './components/Onboarding';
import { BuildPalette } from './components/BuildPalette';
import { useGameStore } from './hooks/useGameStore';
import type { RewriteMatch } from './core/rewrite';
import { applyRewrite, findAllRewriteMatches } from './core/rewrite';
import { countBeadsByKind, countActiveBeads } from './core/invariant';
import { TUTORIAL_LEVELS, type Level } from './levels/tutorial';
import type { NodeType } from './core/diagram';
import { createDiagram, BEAD_COLORS } from './core/diagram';
import { soundEngine, initSoundOnInteraction, triggerHaptic } from './core/sound';

export default function App() {
  const {
    diagram,
    setDiagram,
    selectNode,
    clearSelection,
    moveNode,
    paused,
    speed,
    togglePause,
    setSpeed,
    injectBead,
    clearBeads,
    getBeads,
    loadLevel,
    undo,
    redo,
    canUndo,
    canRedo,
    mode,
    setMode,
    addNodeAtPosition,
    hasWon,
    getCollectedBeads,
  } = useGameStore();

  const [viewMode, setViewMode] = useState<'machine' | 'diagram'>('machine');
  const [showQED, setShowQED] = useState(false);
  const [beadCount, setBeadCount] = useState(0);
  const [beadCounts, setBeadCounts] = useState<Map<string, number>>(new Map());
  const [showLevelSelector, setShowLevelSelector] = useState(false);
  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [_draggingNodeType, setDraggingNodeType] = useState<NodeType | null>(null);
  const [showWin, setShowWin] = useState(false);
  const [collectedBeadsCounts, setCollectedBeadsCounts] = useState<Map<string, number>>(new Map());
  const [hoveredRewriteNodeIds, setHoveredRewriteNodeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    initSoundOnInteraction();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const beads = getBeads();
      setBeadCount(countActiveBeads(beads));
      setBeadCounts(countBeadsByKind(beads));
      
      const collected = getCollectedBeads();
      const counts = new Map<string, number>();
      for (const [_portId, kinds] of collected) {
        for (const kind of kinds) {
          counts.set(kind, (counts.get(kind) ?? 0) + 1);
        }
      }
      setCollectedBeadsCounts(counts);
    }, 100);
    return () => clearInterval(interval);
  }, [getBeads, getCollectedBeads]);

  useEffect(() => {
    if (hasWon && !showWin) {
      setShowWin(true);
      soundEngine.playQED();
      triggerHaptic('success');
      setTimeout(() => setShowWin(false), 3000);
    }
  }, [hasWon, showWin]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const availableRewrites = findAllRewriteMatches(diagram);

  const handleApplyRewrite = useCallback((match: RewriteMatch) => {
    const result = applyRewrite(diagram, match);
    if (result.success) {
      setDiagram(result.diagram);
      soundEngine.playRewrite(match.rule);
      triggerHaptic('medium');
      if (result.diagram.nodes.length <= 2 && 
          (match.rule === 'straighten' || match.rule === 'snake' || match.rule === 'swap-involution')) {
        setShowQED(true);
        soundEngine.playQED();
        triggerHaptic('success');
        setTimeout(() => setShowQED(false), 3000);
      }
    }
  }, [diagram, setDiagram]);

  const handleInjectBead = useCallback(() => {
    if (currentLevel?.inputBeads && currentLevel.inputBeads.length > 0) {
      for (const inputBead of currentLevel.inputBeads) {
        const edgeId = diagram.edges[inputBead.edgeIndex]?.id;
        if (edgeId) {
          if (inputBead.delay && inputBead.delay > 0) {
            setTimeout(() => {
              injectBead(edgeId, inputBead.color);
              soundEngine.playBeadDrop();
            }, inputBead.delay);
          } else {
            injectBead(edgeId, inputBead.color);
            soundEngine.playBeadDrop();
          }
        }
      }
      triggerHaptic('light');
    } else if (diagram.edges.length > 0) {
      injectBead(diagram.edges[0].id, 'signal');
      soundEngine.playBeadDrop();
      triggerHaptic('light');
    }
  }, [diagram.edges, injectBead, currentLevel]);

  const handleSelectLevel = useCallback((level: Level) => {
    loadLevel(level.initial, level.target, level.mode, level.winCondition);
    setCurrentLevel(level);
    setShowLevelSelector(false);
    setShowOnboarding(true);
    setShowWin(false);
  }, [loadLevel]);

  const handleEnterSandbox = useCallback(() => {
    loadLevel(createDiagram(), null, 'sandbox', null);
    setCurrentLevel(null);
    setShowLevelSelector(false);
    setMode('sandbox');
  }, [loadLevel, setMode]);

  const handleDragStart = useCallback((type: NodeType) => {
    setDraggingNodeType(type);
  }, []);

  const handleRewriteHover = useCallback((match: RewriteMatch | null) => {
    if (match) {
      setHoveredRewriteNodeIds(new Set(match.nodeIds));
    } else {
      setHoveredRewriteNodeIds(new Set());
    }
  }, []);

  const handleNodeAdd = useCallback((type: NodeType) => {
    addNodeAtPosition(type, 200 + Math.random() * 200, 150 + Math.random() * 100);
    soundEngine.playNodePlace();
  }, [addNodeAtPosition]);

  return (
    <div className="h-full w-full flex flex-col bg-[#0f0f1a]">
      <header className="flex items-center justify-between px-4 py-3 bg-[#1a1a2e] border-b border-[#2a2a4e]">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-[#e2e8f0]">Bead Calculus</h1>
          {currentLevel && (
            <span className="px-2 py-0.5 text-xs bg-[#2a2a4e] text-[#94a3b8] rounded">
              {currentLevel.name}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <HelpButton onClick={() => setShowOnboarding(true)} />
          <button
            onClick={handleEnterSandbox}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors touch-target ${
              mode === 'sandbox' 
                ? 'bg-[#f59e0b] text-black' 
                : 'bg-[#2a2a4e] hover:bg-[#3a3a5e]'
            }`}
          >
            Sandbox
          </button>
          <button
            onClick={() => setShowLevelSelector(true)}
            className="px-3 py-1.5 text-sm bg-[#6366f1] text-white rounded-md hover:bg-[#5355d1] transition-colors touch-target"
          >
            Levels
          </button>
          <button
            onClick={() => setViewMode(v => v === 'machine' ? 'diagram' : 'machine')}
            className="px-3 py-1.5 text-sm bg-[#2a2a4e] rounded-md hover:bg-[#3a3a5e] transition-colors touch-target"
          >
            {viewMode === 'machine' ? 'Diagram' : 'Machine'}
          </button>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
        <Canvas
          viewMode={viewMode}
          onNodeSelect={selectNode}
          onNodeMove={moveNode}
          onBackgroundClick={clearSelection}
          hoveredNodeIds={hoveredRewriteNodeIds}
        />

        {mode === 'sandbox' && (
          <BuildPalette
            onDragStart={handleDragStart}
            onNodeAdd={handleNodeAdd}
          />
        )}

        <BeadCounter counts={beadCounts} total={beadCount} />

        {collectedBeadsCounts.size > 0 && (
          <div className="absolute top-4 right-4 bg-[#1a1a2e]/90 px-3 py-2 rounded-lg border border-[#2a2a4e]">
            <div className="text-xs text-[#94a3b8] mb-1">Collected</div>
            <div className="flex gap-2">
              {Array.from(collectedBeadsCounts.entries()).map(([kind, count]) => (
                <div key={kind} className="flex items-center gap-1">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: BEAD_COLORS[kind as keyof typeof BEAD_COLORS] }}
                  />
                  <span className="text-sm text-[#e2e8f0]">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(showQED || showWin) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 animate-fade-in">
            <div className="text-6xl font-bold text-[#22c55e] animate-bounce">
              {showWin ? 'WIN!' : 'QED'}
            </div>
          </div>
        )}
      </main>

      <Controls
        isPaused={paused}
        speed={speed}
        beadCount={beadCount}
        availableRewrites={availableRewrites}
        canUndo={canUndo()}
        canRedo={canRedo()}
        onTogglePlayPause={togglePause}
        onInjectBead={handleInjectBead}
        onClearBeads={clearBeads}
        onSpeedChange={setSpeed}
        onApplyRewrite={handleApplyRewrite}
        onUndo={undo}
        onRedo={redo}
        onRewriteHover={handleRewriteHover}
      />

      {showLevelSelector && (
        <LevelSelector
          levels={TUTORIAL_LEVELS}
          currentLevelId={currentLevel?.id ?? null}
          onSelectLevel={handleSelectLevel}
          onClose={() => setShowLevelSelector(false)}
        />
      )}

      {showOnboarding && (
        <Onboarding
          level={currentLevel}
          onDismiss={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
}
