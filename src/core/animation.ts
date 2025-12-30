export type EasingFunction = (t: number) => number;

export const easings = {
  linear: (t: number) => t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeOutCubic: (t: number) => (--t) * t * t + 1,
  easeOutElastic: (t: number) => {
    const p = 0.3;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
  },
  easeOutBack: (t: number) => {
    const s = 1.70158;
    return (t = t - 1) * t * ((s + 1) * t + s) + 1;
  },
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  spring: (t: number) => {
    return 1 - Math.cos(t * Math.PI * 2.5) * Math.exp(-t * 6);
  },
};

export interface Animation {
  id: string;
  type: 'node-move' | 'node-scale' | 'node-fade' | 'edge-fade' | 'particle' | 'shake';
  startTime: number;
  duration: number;
  easing: EasingFunction;
  data: Record<string, unknown>;
}

export interface NodeMoveAnimation extends Animation {
  type: 'node-move';
  data: {
    nodeId: string;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
  };
}

export interface NodeScaleAnimation extends Animation {
  type: 'node-scale';
  data: {
    nodeId: string;
    fromScale: number;
    toScale: number;
  };
}

export interface ParticleAnimation extends Animation {
  type: 'particle';
  data: {
    x: number;
    y: number;
    color: string;
    count: number;
    velocities: Array<{ vx: number; vy: number }>;
  };
}

export interface ShakeAnimation extends Animation {
  type: 'shake';
  data: {
    nodeId: string;
    intensity: number;
  };
}

export class AnimationController {
  private animations: Animation[] = [];
  private currentTime = 0;

  add(animation: Animation): void {
    this.animations.push(animation);
  }

  update(deltaTime: number): void {
    this.currentTime += deltaTime;
    this.animations = this.animations.filter(
      a => this.currentTime < a.startTime + a.duration
    );
  }

  getActiveAnimations(): Animation[] {
    return this.animations.filter(
      a => this.currentTime >= a.startTime
    );
  }

  getProgress(animation: Animation): number {
    const elapsed = this.currentTime - animation.startTime;
    const raw = Math.max(0, Math.min(1, elapsed / animation.duration));
    return animation.easing(raw);
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  clear(): void {
    this.animations = [];
  }

  createSlideAnimation(
    nodeAId: string,
    nodeBId: string,
    nodeAFrom: { x: number; y: number },
    nodeATo: { x: number; y: number },
    nodeBFrom: { x: number; y: number },
    nodeBTo: { x: number; y: number }
  ): Animation[] {
    const now = this.currentTime;
    return [
      {
        id: `slide-a-${now}`,
        type: 'node-move',
        startTime: now,
        duration: 400,
        easing: easings.easeOutBack,
        data: {
          nodeId: nodeAId,
          fromX: nodeAFrom.x,
          fromY: nodeAFrom.y,
          toX: nodeATo.x,
          toY: nodeATo.y,
        },
      },
      {
        id: `slide-b-${now}`,
        type: 'node-move',
        startTime: now,
        duration: 400,
        easing: easings.easeOutBack,
        data: {
          nodeId: nodeBId,
          fromX: nodeBFrom.x,
          fromY: nodeBFrom.y,
          toX: nodeBTo.x,
          toY: nodeBTo.y,
        },
      },
    ];
  }

  createStraightenAnimation(
    nodeIds: string[],
    positions: Array<{ x: number; y: number }>
  ): Animation[] {
    const now = this.currentTime;
    const anims: Animation[] = [];

    for (let i = 0; i < nodeIds.length; i++) {
      anims.push({
        id: `straighten-scale-${nodeIds[i]}-${now}`,
        type: 'node-scale',
        startTime: now,
        duration: 300,
        easing: easings.spring,
        data: {
          nodeId: nodeIds[i],
          fromScale: 1,
          toScale: 0,
        },
      });

      anims.push({
        id: `straighten-particle-${i}-${now}`,
        type: 'particle',
        startTime: now + 150,
        duration: 500,
        easing: easings.easeOutQuad,
        data: {
          x: positions[i].x,
          y: positions[i].y,
          color: '#22c55e',
          count: 8,
          velocities: Array.from({ length: 8 }, (_, j) => ({
            vx: Math.cos((j / 8) * Math.PI * 2) * 50,
            vy: Math.sin((j / 8) * Math.PI * 2) * 50,
          })),
        },
      });
    }

    return anims;
  }

  createThreadAnimation(
    nodeId: string,
    fromPos: { x: number; y: number },
    toPos: { x: number; y: number }
  ): Animation[] {
    const now = this.currentTime;
    return [
      {
        id: `thread-move-${now}`,
        type: 'node-move',
        startTime: now,
        duration: 500,
        easing: easings.easeOutElastic,
        data: {
          nodeId,
          fromX: fromPos.x,
          fromY: fromPos.y,
          toX: toPos.x,
          toY: toPos.y,
        },
      },
    ];
  }

  createSnakeAnimation(
    positions: Array<{ x: number; y: number }>
  ): Animation[] {
    const now = this.currentTime;
    const centerX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
    const centerY = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;

    return [{
      id: `snake-particle-${now}`,
      type: 'particle',
      startTime: now,
      duration: 600,
      easing: easings.easeOutCubic,
      data: {
        x: centerX,
        y: centerY,
        color: '#a855f7',
        count: 12,
        velocities: Array.from({ length: 12 }, (_, j) => ({
          vx: Math.cos((j / 12) * Math.PI * 2) * 80,
          vy: Math.sin((j / 12) * Math.PI * 2) * 80,
        })),
      },
    }];
  }
}

export const globalAnimationController = new AnimationController();
