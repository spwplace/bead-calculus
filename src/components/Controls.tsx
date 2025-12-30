import type { RewriteMatch } from '../core/rewrite';

interface ControlsProps {
  isPaused: boolean;
  speed: number;
  beadCount: number;
  availableRewrites: RewriteMatch[];
  canUndo: boolean;
  canRedo: boolean;
  onTogglePlayPause: () => void;
  onInjectBead: () => void;
  onClearBeads: () => void;
  onSpeedChange: (speed: number) => void;
  onApplyRewrite: (match: RewriteMatch) => void;
  onUndo: () => void;
  onRedo: () => void;
}

export function Controls({
  isPaused,
  speed,
  beadCount,
  availableRewrites,
  canUndo,
  canRedo,
  onTogglePlayPause,
  onInjectBead,
  onClearBeads,
  onSpeedChange,
  onApplyRewrite,
  onUndo,
  onRedo,
}: ControlsProps) {
  return (
    <div className="bg-[#1a1a2e] border-t border-[#2a2a4e] px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlayPause}
            className="w-12 h-12 flex items-center justify-center bg-[#6366f1] hover:bg-[#5355d1] rounded-full transition-colors touch-target"
          >
            {isPaused ? (
              <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
              </svg>
            )}
          </button>

          <button
            onClick={onInjectBead}
            className="px-4 h-10 bg-[#f59e0b] hover:bg-[#d97706] text-black font-medium rounded-lg transition-colors touch-target"
          >
            Drop Bead
          </button>

          <button
            onClick={onClearBeads}
            className="px-3 h-10 bg-[#3a3a5e] hover:bg-[#4a4a6e] rounded-lg transition-colors touch-target text-sm"
          >
            Clear ({beadCount})
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="w-10 h-10 flex items-center justify-center bg-[#3a3a5e] hover:bg-[#4a4a6e] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors touch-target"
            title="Undo (Ctrl+Z)"
          >
            <svg className="w-5 h-5 text-[#e2e8f0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="w-10 h-10 flex items-center justify-center bg-[#3a3a5e] hover:bg-[#4a4a6e] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors touch-target"
            title="Redo (Ctrl+Shift+Z)"
          >
            <svg className="w-5 h-5 text-[#e2e8f0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-[#94a3b8]">Speed:</span>
          <input
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="w-24 h-2 accent-[#6366f1]"
          />
          <span className="text-sm text-[#94a3b8] w-10">{speed.toFixed(1)}x</span>
        </div>

        {availableRewrites.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-[#94a3b8]">Rewrites:</span>
            <div className="flex gap-1">
              {availableRewrites.slice(0, 3).map((match, idx) => (
                <button
                  key={idx}
                  onClick={() => onApplyRewrite(match)}
                  className="px-3 py-1.5 bg-[#22c55e] hover:bg-[#16a34a] text-black text-sm font-medium rounded-md transition-colors touch-target"
                  title={match.description}
                >
                  {match.rule}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
