import type { InvariantStatus } from '../core/invariant';

interface InvariantIndicatorProps {
  statuses: InvariantStatus[];
}

export function InvariantIndicator({ statuses }: InvariantIndicatorProps) {
  if (statuses.length === 0) return null;

  const allSatisfied = statuses.every(s => s.satisfied);

  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2">
      {statuses.map((status, idx) => (
        <div
          key={idx}
          className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-all ${
            status.satisfied
              ? 'bg-[#22c55e]/20 border border-[#22c55e]/50'
              : 'bg-[#ef4444]/20 border border-[#ef4444]/50 animate-pulse'
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              status.satisfied ? 'bg-[#22c55e]' : 'bg-[#ef4444]'
            }`}
          />
          <span className={status.satisfied ? 'text-[#22c55e]' : 'text-[#ef4444]'}>
            {status.message}
          </span>
        </div>
      ))}
      
      {allSatisfied && statuses.length > 0 && (
        <div className="mt-2 px-3 py-2 bg-[#22c55e]/30 border border-[#22c55e] rounded-lg text-[#22c55e] font-medium text-center">
          All Invariants Satisfied
        </div>
      )}
    </div>
  );
}

interface BeadCounterProps {
  counts: Map<string, number>;
  total: number;
}

export function BeadCounter({ counts, total }: BeadCounterProps) {
  const entries = Array.from(counts.entries());
  
  if (entries.length === 0 && total === 0) return null;

  return (
    <div className="absolute top-4 left-4 px-3 py-2 bg-[#1a1a2e]/90 rounded-lg border border-[#3a3a5e]">
      <div className="text-xs text-[#94a3b8] mb-1">Active Beads</div>
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-[#e2e8f0]">{total}</span>
        {entries.length > 0 && (
          <div className="flex gap-2">
            {entries.map(([kind, count]) => (
              <span
                key={kind}
                className="px-2 py-0.5 text-xs rounded"
                style={{
                  backgroundColor: getBeadColor(kind) + '30',
                  color: getBeadColor(kind),
                }}
              >
                {kind}: {count}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getBeadColor(kind: string): string {
  const colors: Record<string, string> = {
    red: '#ef4444',
    blue: '#3b82f6',
    green: '#22c55e',
    signal: '#f59e0b',
  };
  return colors[kind] ?? '#94a3b8';
}
