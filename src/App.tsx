import { useState, useCallback, useEffect } from 'react';
import { Canvas } from './components/Canvas';
import { Controls } from './components/Controls';
import { LevelSelector } from './components/LevelSelector';
import { BeadCounter } from './components/InvariantIndicator';
import { useGameStore } from './hooks/useGameStore';
import type { RewriteMatch } from './core/rewrite';
import { applyRewrite, findAllRewriteMatches } from './core/rewrite';
import { countBeadsByKind, countActiveBeads } from './core/invariant';
import { TUTORIAL_LEVELS, type Level } from './levels/tutorial';

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
  } = useGameStore();

  const [viewMode, setViewMode] = useState<'machine' | 'diagram'>('machine');
  const [showQED, setShowQED] = useState(false);
  const [beadCount, setBeadCount] = useState(0);
  const [beadCounts, setBeadCounts] = useState<Map<string, number>>(new Map());
  const [showLevelSelector, setShowLevelSelector] = useState(false);
  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const beads = getBeads();
      setBeadCount(countActiveBeads(beads));
      setBeadCounts(countBeadsByKind(beads));
    }, 100);
    return () => clearInterval(interval);
  }, [getBeads]);

  const availableRewrites = findAllRewriteMatches(diagram);

  const handleApplyRewrite = useCallback((match: RewriteMatch) => {
    const result = applyRewrite(diagram, match);
    if (result.success) {
      setDiagram(result.diagram);
      if (result.diagram.nodes.length <= 2 && 
          (match.rule === 'straighten' || match.rule === 'snake' || match.rule === 'swap-involution')) {
        setShowQED(true);
        setTimeout(() => setShowQED(false), 3000);
      }
    }
  }, [diagram, setDiagram]);

  const handleInjectBead = useCallback(() => {
    if (diagram.edges.length > 0) {
      injectBead(diagram.edges[0].id, 'signal');
    }
  }, [diagram.edges, injectBead]);

  const handleSelectLevel = useCallback((level: Level) => {
    loadLevel(level.initial);
    setCurrentLevel(level);
    setShowLevelSelector(false);
  }, [loadLevel]);

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
        />

        <BeadCounter counts={beadCounts} total={beadCount} />

        {showQED && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 animate-fade-in">
            <div className="text-6xl font-bold text-[#22c55e] animate-bounce">
              QED
            </div>
          </div>
        )}
      </main>

      <Controls
        isPaused={paused}
        speed={speed}
        beadCount={beadCount}
        availableRewrites={availableRewrites}
        onTogglePlayPause={togglePause}
        onInjectBead={handleInjectBead}
        onClearBeads={clearBeads}
        onSpeedChange={setSpeed}
        onApplyRewrite={handleApplyRewrite}
      />

      {showLevelSelector && (
        <LevelSelector
          levels={TUTORIAL_LEVELS}
          currentLevelId={currentLevel?.id ?? null}
          onSelectLevel={handleSelectLevel}
          onClose={() => setShowLevelSelector(false)}
        />
      )}
    </div>
  );
}
