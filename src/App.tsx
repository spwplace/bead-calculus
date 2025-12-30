import { useState, useCallback } from 'react';
import { Canvas } from './components/Canvas';
import { Controls } from './components/Controls';
import { useDiagramStore } from './hooks/useDiagram';
import { useSimulation } from './hooks/useSimulation';
import type { RewriteMatch } from './core/rewrite';
import { applyRewrite, findAllRewriteMatches } from './core/rewrite';

export default function App() {
  const { diagram, setDiagram, selectedNodeIds, selectNode, clearSelection, moveNode } = useDiagramStore();
  const { state: simState, dispatch: simDispatch } = useSimulation(diagram);
  const [viewMode, setViewMode] = useState<'machine' | 'diagram'>('machine');
  const [showQED, setShowQED] = useState(false);

  const availableRewrites = findAllRewriteMatches(diagram);

  const handleApplyRewrite = useCallback((match: RewriteMatch) => {
    const result = applyRewrite(diagram, match);
    if (result.success) {
      setDiagram(result.diagram);
      if (diagram.nodes.length <= 2 && match.rule === 'straighten') {
        setShowQED(true);
        setTimeout(() => setShowQED(false), 3000);
      }
    }
  }, [diagram, setDiagram]);

  const handleInjectBead = useCallback(() => {
    if (diagram.edges.length > 0) {
      simDispatch({ type: 'INJECT_BEAD', edgeId: diagram.edges[0].id, kind: 'signal' });
    }
  }, [diagram.edges, simDispatch]);

  const togglePlayPause = useCallback(() => {
    simDispatch({ type: 'TOGGLE_PAUSE' });
  }, [simDispatch]);

  const handleClearBeads = useCallback(() => {
    simDispatch({ type: 'CLEAR_BEADS' });
  }, [simDispatch]);

  const handleSpeedChange = useCallback((speed: number) => {
    simDispatch({ type: 'SET_SPEED', speed });
  }, [simDispatch]);

  return (
    <div className="h-full w-full flex flex-col bg-[#0f0f1a]">
      <header className="flex items-center justify-between px-4 py-3 bg-[#1a1a2e] border-b border-[#2a2a4e]">
        <h1 className="text-lg font-semibold text-[#e2e8f0]">Bead Calculus</h1>
        <div className="flex gap-2">
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
          diagram={diagram}
          beads={simState.beads}
          viewMode={viewMode}
          selectedNodeIds={selectedNodeIds}
          onNodeSelect={selectNode}
          onNodeMove={moveNode}
          onBackgroundClick={clearSelection}
        />

        {showQED && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 animate-fade-in">
            <div className="text-6xl font-bold text-[#22c55e] animate-bounce">
              QED
            </div>
          </div>
        )}
      </main>

      <Controls
        isPaused={simState.paused}
        speed={simState.speed}
        beadCount={simState.beads.length}
        availableRewrites={availableRewrites}
        onTogglePlayPause={togglePlayPause}
        onInjectBead={handleInjectBead}
        onClearBeads={handleClearBeads}
        onSpeedChange={handleSpeedChange}
        onApplyRewrite={handleApplyRewrite}
      />
    </div>
  );
}
