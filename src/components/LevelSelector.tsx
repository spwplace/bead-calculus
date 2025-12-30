import type { Level } from '../levels/tutorial';

interface LevelSelectorProps {
  levels: Level[];
  currentLevelId: string | null;
  onSelectLevel: (level: Level) => void;
  onClose: () => void;
}

export function LevelSelector({
  levels,
  currentLevelId,
  onSelectLevel,
  onClose,
}: LevelSelectorProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-[#1a1a2e] rounded-xl border border-[#3a3a5e] w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a4e]">
          <h2 className="text-xl font-semibold text-[#e2e8f0]">Select Level</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#2a2a4e] transition-colors"
          >
            <svg className="w-5 h-5 text-[#94a3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid gap-3">
            {levels.map((level) => (
              <button
                key={level.id}
                onClick={() => onSelectLevel(level)}
                className={`text-left p-4 rounded-lg border transition-all ${
                  currentLevelId === level.id
                    ? 'bg-[#6366f1]/20 border-[#6366f1]'
                    : 'bg-[#2a2a4e] border-[#3a3a5e] hover:border-[#6366f1]/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    level.mode === 'rewrite' 
                      ? 'bg-[#22c55e]/20 text-[#22c55e]' 
                      : 'bg-[#f59e0b]/20 text-[#f59e0b]'
                  }`}>
                    {level.mode}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-[#e2e8f0]">{level.name}</h3>
                    <p className="text-sm text-[#94a3b8] mt-1">{level.description}</p>
                    {level.availableMoves.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {level.availableMoves.map((move) => (
                          <span
                            key={move}
                            className="px-2 py-0.5 text-xs bg-[#3a3a5e] text-[#94a3b8] rounded"
                          >
                            {move}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
