import { useState, useEffect } from 'react';
import type { Level } from '../levels/tutorial';

interface OnboardingProps {
  level: Level | null;
  onDismiss: () => void;
}

interface TutorialStep {
  title: string;
  content: string;
  highlight?: 'canvas' | 'controls' | 'rewrites' | 'beads';
}

const GENERAL_INTRO: TutorialStep[] = [
  {
    title: 'Welcome to Bead Calculus',
    content: 'Learn equational reasoning through kinetic marble circuits. Transform diagrams by applying rewrite rules until you reach the simplest form.',
  },
  {
    title: 'The Goal',
    content: 'Each puzzle shows a machine. Apply rewrite moves to simplify it. When the diagram is fully reduced, you\'ll see QED!',
    highlight: 'canvas',
  },
  {
    title: 'Rewrite Moves',
    content: 'Available rewrites appear as green buttons at the bottom. Click one to apply it to the diagram.',
    highlight: 'rewrites',
  },
  {
    title: 'Beads & Simulation',
    content: 'Drop beads to see how the machine processes signals. Press Play to start the simulation. Beads flow through wires and get transformed by nodes.',
    highlight: 'beads',
  },
];

const LEVEL_HINTS: Record<string, TutorialStep[]> = {
  'tutorial-1': [
    {
      title: 'Slide (Interchange Law)',
      content: 'Two parallel tracks with independent operations can swap positions. The delay on track 1 and identity on track 2 don\'t interact - slide them past each other.',
    },
  ],
  'tutorial-2': [
    {
      title: 'Straighten (Yanking)',
      content: 'An empty trace loop (Tr(id)) can be "yanked" away. This loop has no computation inside - pull it taut until it vanishes!',
    },
  ],
  'tutorial-3': [
    {
      title: 'Thread (Dinaturality)',
      content: 'A morphism can slide through a trace boundary. Thread the delay out of the loop, then use straighten on the empty loop.',
    },
  ],
  'tutorial-4': [
    {
      title: 'Feedback Oscillator',
      content: 'This is a working feedback loop! Drop a bead and watch it oscillate. The delay creates a time step, and the split sends one copy back into the loop.',
    },
  ],
  'tutorial-5': [
    {
      title: 'Combined Laws',
      content: 'Use all your moves: slide to reorder independent factors, thread to extract from loops, straighten to remove empty traces.',
    },
  ],
  'tutorial-6': [
    {
      title: 'Superpose',
      content: 'The superposing law: Tr(f) tensor g = Tr(f tensor g). Absorb the parallel delay into the trace.',
    },
  ],
  'tutorial-7': [
    {
      title: 'Swap Involution',
      content: 'Swapping twice returns to identity: sigma . sigma = id. Cancel the consecutive swaps!',
    },
  ],
  'tutorial-8': [
    {
      title: 'Snake Equation',
      content: 'A cup feeding into a cap (with crossed wires) cancels completely. This is the snake equation from compact closed categories.',
    },
  ],
  'tutorial-9': [
    {
      title: 'Compact Closed',
      content: 'Combine swap involution and snake equation. The tangled cup-swap-cap is secretly just a wire!',
    },
  ],
};

export function Onboarding({ level, onDismiss }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenIntro, setHasSeenIntro] = useState(() => {
    return localStorage.getItem('bead-calculus-intro-seen') === 'true';
  });

  const steps = hasSeenIntro
    ? (level ? LEVEL_HINTS[level.id] || [] : [])
    : [...GENERAL_INTRO, ...(level ? LEVEL_HINTS[level.id] || [] : [])];

  useEffect(() => {
    setCurrentStep(0);
  }, [level?.id]);

  if (steps.length === 0) {
    return null;
  }

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      if (!hasSeenIntro) {
        localStorage.setItem('bead-calculus-intro-seen', 'true');
        setHasSeenIntro(true);
      }
      onDismiss();
    } else {
      setCurrentStep(s => s + 1);
    }
  };

  const handleSkip = () => {
    if (!hasSeenIntro) {
      localStorage.setItem('bead-calculus-intro-seen', 'true');
      setHasSeenIntro(true);
    }
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {step.highlight && <HighlightOverlay area={step.highlight} />}

      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div className="bg-[#1a1a2e] border border-[#3a3a5e] rounded-xl shadow-2xl p-6 max-w-md animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-[#e2e8f0]">{step.title}</h3>
            <span className="text-xs text-[#64748b]">
              {currentStep + 1} / {steps.length}
            </span>
          </div>

          <p className="text-sm text-[#94a3b8] mb-4 leading-relaxed">
            {step.content}
          </p>

          <div className="flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-sm text-[#64748b] hover:text-[#94a3b8] transition-colors"
            >
              Skip tutorial
            </button>

            <div className="flex gap-2">
              {currentStep > 0 && (
                <button
                  onClick={() => setCurrentStep(s => s - 1)}
                  className="px-4 py-2 text-sm bg-[#2a2a4e] text-[#e2e8f0] rounded-lg hover:bg-[#3a3a5e] transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-4 py-2 text-sm bg-[#6366f1] text-white rounded-lg hover:bg-[#5355d1] transition-colors"
              >
                {isLastStep ? 'Start' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HighlightOverlay({ area }: { area: 'canvas' | 'controls' | 'rewrites' | 'beads' }) {
  const getClipPath = () => {
    switch (area) {
      case 'canvas':
        return 'polygon(0% 0%, 100% 0%, 100% 60%, 0% 60%)';
      case 'controls':
        return 'polygon(0% 85%, 100% 85%, 100% 100%, 0% 100%)';
      case 'rewrites':
        return 'polygon(50% 85%, 100% 85%, 100% 100%, 50% 100%)';
      case 'beads':
        return 'polygon(0% 85%, 40% 85%, 40% 100%, 0% 100%)';
      default:
        return 'none';
    }
  };

  return (
    <>
      <div
        className="absolute inset-0 bg-black/60 transition-all duration-300"
        style={{ clipPath: `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)` }}
      />
      <div
        className="absolute inset-0 border-2 border-[#6366f1] rounded-lg animate-pulse pointer-events-none"
        style={{ clipPath: getClipPath() }}
      />
    </>
  );
}

export function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-8 h-8 flex items-center justify-center bg-[#2a2a4e] hover:bg-[#3a3a5e] rounded-full transition-colors"
      title="Show tutorial"
    >
      <svg className="w-4 h-4 text-[#94a3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </button>
  );
}
