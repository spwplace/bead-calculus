import { useRef, useCallback } from 'react';
import type { NodeType } from '../core/diagram';
import { NODE_NAMES } from '../core/diagram';

interface BuildPaletteProps {
  onDragStart: (type: NodeType, e: React.DragEvent | React.TouchEvent) => void;
  onNodeAdd: (type: NodeType) => void;
}

const PALETTE_ITEMS: Array<{ type: NodeType; category: 'basic' | 'control' | 'compact' | 'transform' }> = [
  { type: 'identity', category: 'basic' },
  { type: 'delay', category: 'basic' },
  { type: 'swap', category: 'basic' },
  { type: 'split', category: 'control' },
  { type: 'merge', category: 'control' },
  { type: 'trace-in', category: 'control' },
  { type: 'trace-out', category: 'control' },
  { type: 'unit', category: 'compact' },
  { type: 'counit', category: 'compact' },
  { type: 'cup', category: 'compact' },
  { type: 'cap', category: 'compact' },
  { type: 'painter', category: 'transform' },
  { type: 'filter', category: 'transform' },
];

const NODE_ICONS: Record<NodeType, React.ReactNode> = {
  'identity': (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  'delay': (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" />
      <polygon points="10,8 14,12 10,16" fill="currentColor" />
    </svg>
  ),
  'swap': (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <line x1="4" y1="8" x2="20" y2="16" stroke="currentColor" strokeWidth="2" />
      <line x1="4" y1="16" x2="20" y2="8" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  'split': (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <line x1="4" y1="12" x2="12" y2="12" stroke="currentColor" strokeWidth="2" />
      <line x1="12" y1="12" x2="20" y2="6" stroke="currentColor" strokeWidth="2" />
      <line x1="12" y1="12" x2="20" y2="18" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  'merge': (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <line x1="4" y1="6" x2="12" y2="12" stroke="currentColor" strokeWidth="2" />
      <line x1="4" y1="18" x2="12" y2="12" stroke="currentColor" strokeWidth="2" />
      <line x1="12" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  'trace-in': (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <circle cx="12" cy="12" r="6" fill="none" stroke="#a855f7" strokeWidth="2" />
      <path d="M12,8 L12,16 M9,13 L12,16 L15,13" stroke="#a855f7" strokeWidth="2" fill="none" />
    </svg>
  ),
  'trace-out': (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <circle cx="12" cy="12" r="6" fill="none" stroke="#a855f7" strokeWidth="2" />
      <path d="M12,16 L12,8 M9,11 L12,8 L15,11" stroke="#a855f7" strokeWidth="2" fill="none" />
    </svg>
  ),
  'unit': (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <circle cx="12" cy="12" r="5" fill="#22c55e" />
      <line x1="17" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  'counit': (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <circle cx="12" cy="12" r="5" fill="#ef4444" />
      <line x1="2" y1="12" x2="7" y2="12" stroke="currentColor" strokeWidth="2" />
      <path d="M9,9 L15,15 M15,9 L9,15" stroke="white" strokeWidth="1.5" />
    </svg>
  ),
  'cup': (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <path d="M6,6 Q6,18 12,18 Q18,18 18,6" fill="none" stroke="#ec4899" strokeWidth="2" />
    </svg>
  ),
  'cap': (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <path d="M6,18 Q6,6 12,6 Q18,6 18,18" fill="none" stroke="#ec4899" strokeWidth="2" />
    </svg>
  ),
  'painter': (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <circle cx="12" cy="12" r="6" fill="#3b82f6" />
      <circle cx="12" cy="12" r="6" fill="none" stroke="white" strokeWidth="1" />
      <polygon points="12,7 14,14 10,14" fill="white" />
    </svg>
  ),
  'filter': (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
      <polygon points="12,4 20,12 12,20 4,12" fill="#22c55e" />
      <polygon points="12,4 20,12 12,20 4,12" fill="none" stroke="white" strokeWidth="1" />
      <text x="12" y="14" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">?</text>
    </svg>
  ),
};

export function BuildPalette({ onDragStart, onNodeAdd }: BuildPaletteProps) {
  const categories = [
    { key: 'basic', label: 'Basic' },
    { key: 'control', label: 'Control Flow' },
    { key: 'compact', label: 'Compact Closed' },
    { key: 'transform', label: 'Transform' },
  ] as const;

  return (
    <div className="absolute left-4 top-4 bg-[#1a1a2e]/95 backdrop-blur-sm border border-[#2a2a4e] rounded-xl p-3 shadow-xl z-10">
      <h3 className="text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-3">Components</h3>
      
      {categories.map(({ key, label }) => (
        <div key={key} className="mb-3 last:mb-0">
          <div className="text-[10px] text-[#64748b] mb-1.5">{label}</div>
          <div className="grid grid-cols-2 gap-1.5">
            {PALETTE_ITEMS.filter(item => item.category === key).map(({ type }) => (
              <PaletteItem
                key={type}
                type={type}
                onDragStart={onDragStart}
                onNodeAdd={onNodeAdd}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface PaletteItemProps {
  type: NodeType;
  onDragStart: (type: NodeType, e: React.DragEvent | React.TouchEvent) => void;
  onNodeAdd: (type: NodeType) => void;
}

function PaletteItem({ type, onDragStart, onNodeAdd }: PaletteItemProps) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('node-type', type);
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart(type, e);
  }, [type, onDragStart]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    onDragStart(type, e);
  }, [type, onDragStart]);

  const handleClick = useCallback(() => {
    onNodeAdd(type);
  }, [type, onNodeAdd]);

  return (
    <button
      draggable
      onDragStart={handleDragStart}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      className="flex items-center gap-1.5 px-2 py-1.5 bg-[#2a2a4e] hover:bg-[#3a3a5e] active:bg-[#4a4a6e] rounded-lg transition-colors cursor-grab active:cursor-grabbing touch-target group"
      title={`Add ${NODE_NAMES[type]} (drag or click)`}
    >
      <span className="text-[#94a3b8] group-hover:text-[#e2e8f0] transition-colors">
        {NODE_ICONS[type]}
      </span>
      <span className="text-xs text-[#94a3b8] group-hover:text-[#e2e8f0] transition-colors truncate">
        {NODE_NAMES[type]}
      </span>
    </button>
  );
}

interface ConnectionModeIndicatorProps {
  isConnecting: boolean;
  sourcePort: { nodeId: string; portId: string } | null;
  onCancel: () => void;
}

export function ConnectionModeIndicator({ isConnecting, sourcePort, onCancel }: ConnectionModeIndicatorProps) {
  if (!isConnecting || !sourcePort) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#6366f1] text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-20 flex items-center gap-2">
      <span>Click a port to connect</span>
      <button
        onClick={onCancel}
        className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

interface DeleteZoneProps {
  isActive: boolean;
  isDragOver: boolean;
  onDrop: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
}

export function DeleteZone({ isActive, isDragOver, onDrop, onDragOver, onDragLeave }: DeleteZoneProps) {
  if (!isActive) return null;

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`absolute bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl border-2 border-dashed transition-all duration-200 ${
        isDragOver 
          ? 'bg-red-500/30 border-red-500 scale-110' 
          : 'bg-red-500/10 border-red-500/50'
      }`}
    >
      <div className="flex items-center gap-2 text-red-400">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span className="text-sm font-medium">Drop to delete</span>
      </div>
    </div>
  );
}
