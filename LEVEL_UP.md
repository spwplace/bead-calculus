# LEVEL_UP: Bead-Centric Redesign

## The Core Insight

The current game treats beads as passive witnesses to diagram manipulation. **Beads should be the game.** The puzzle isn't "simplify this abstract structure" — it's "transform these inputs into those outputs." The diagram is just the machine you build to make that happen.

Think: chemistry set meets marble run meets factory automation. You're not doing algebra — you're running a little manufacturing plant where colored marbles are your raw materials and the win condition is filling an order.

---

## Bead Properties

Beads are no longer generic signals. They have **observable, transformable properties**.

### Tier 1: Color (launch feature)
- Red, Blue, Green, Yellow (primary palette)
- Purple, Orange, Cyan (compound colors — created by combining primaries)
- White (wildcard — matches anything)
- Black (void — destroys on contact, or represents "absence")

### Tier 2: Charge (mid-game unlock)
- Positive (+), Negative (-), Neutral (0)
- Opposite charges attract (queue together at merges)
- Same charges repel (bounce, take alternate paths)
- Enables electromagnetic-feeling puzzles

### Tier 3: Phase (late-game unlock)
- Beads have a phase angle (0°, 90°, 180°, 270°)
- Phases must align at certain junctions
- Out-of-phase beads interfere destructively (annihilate)
- In-phase beads combine constructively (amplify)
- Enables wave/interference puzzles

### Tier 4: Mass/Momentum (optional complexity)
- Light beads move fast, heavy beads move slow
- Heavy beads have priority at merges
- Centrifuge gates sort by mass
- Enables timing/racing puzzles

---

## Gates: The Vocabulary of Transformation

### Basic Flow (Tutorial)
| Gate | Inputs | Outputs | Behavior |
|------|--------|---------|----------|
| **Wire** | 1 | 1 | Pass-through, defines a path |
| **Split** | 1 | 2 | Duplicates bead to both outputs |
| **Merge** | 2 | 1 | Combines streams (first-come-first-serve, or waits for pair) |
| **Swap** | 2 | 2 | Crosses two wires (bead on top goes bottom, vice versa) |

### Timing (Early game)
| Gate | Inputs | Outputs | Behavior |
|------|--------|---------|----------|
| **Delay** | 1 | 1 | Holds bead for N ticks before releasing |
| **Clock** | 0 | 1 | Emits a bead every N ticks (configurable color) |
| **Sync** | 2 | 2 | Holds both beads until both arrive, then releases simultaneously |
| **Queue** | 1 | 1 | FIFO buffer, holds up to N beads |

### Transformation (Core game)
| Gate | Inputs | Outputs | Behavior |
|------|--------|---------|----------|
| **Painter** | 1 | 1 | Changes bead to a fixed color (e.g., "paint blue") |
| **Mixer** | 2 | 1 | Combines two beads into compound color (red + blue → purple) |
| **Bleacher** | 1 | 1 | Strips color → white (neutral) |
| **Reactor** | 2 | 1+ | Consumes specific pair, emits different bead(s). Configurable recipes. |

### Filtering (Mid game)
| Gate | Inputs | Outputs | Behavior |
|------|--------|---------|----------|
| **Filter** | 1 | 2 | Color-match: matching beads go left, others go right |
| **Membrane** | 1 | 1 | Only allows specific colors through, others bounce back |
| **Valve** | 2 (main + control) | 1 | Main flow blocked until control bead arrives |
| **Sensor** | 1 | 1 + signal | Passes bead through, emits a signal bead of same color on side output |

### Advanced (Late game)
| Gate | Inputs | Outputs | Behavior |
|------|--------|---------|----------|
| **Centrifuge** | 1 | 2+ | Sorts by mass — heavy beads curve more |
| **Catalyst Chamber** | 2 | 2 | If catalyst bead present, transforms other bead; catalyst not consumed |
| **Splitter** | 1 | 2 | Splits compound color into components (purple → red + blue) |
| **Annihilator** | 2 | 0 | Consumes bead + anti-bead pair (matter/antimatter vibes) |
| **Spawner** | 0 | 2 | Creates entangled pair (one bead + one anti-bead) |

### Meta (Endgame)
| Gate | Inputs | Outputs | Behavior |
|------|--------|---------|----------|
| **Blackbox** | N | M | Player-defined submodule (encapsulation!) |
| **Breakpoint** | 1 | 1 | Pauses simulation when bead arrives (debugging tool) |
| **Counter** | 1 | 1 + display | Passes beads, shows count on screen |
| **Assertion** | 1 | 1 | Passes if bead matches expected color, else ERROR state |

---

## Bead Interactions (Physics Layer)

### Collisions
When two beads occupy the same wire segment simultaneously:
- **Same color**: Queue (one waits behind the other)
- **Complementary colors** (red+cyan, blue+orange, green+purple): Annihilate → both disappear
- **Primary + Primary**: Bounce — both reverse direction
- **Any + White**: White adopts the other's color
- **Any + Black**: Other bead is destroyed, black continues

### Timing Windows
- Gates have **activation time** — a bead entering a Painter takes 2 ticks to exit
- **Simultaneous arrival** at Merge can be required (Sync gate) or first-come-first-serve
- Creates natural rhythm and timing puzzles

### Feedback Behavior
- Beads in loops accumulate (clock + feedback = oscillator)
- Too many beads in a loop = **overflow** (level failure condition, or beads start dropping)
- Stable loops are the goal for "perpetual machine" puzzles

---

## Win Conditions: The Puzzle Language

### Output Matching
> "Produce exactly: 🔴🔴🔵"

Most basic. Given some input (or a clock), your machine must output beads in exact sequence.

### Conservation
> "All input beads must exit. No waste."

Linear resource puzzles. Every bead that enters must leave (possibly transformed). No black holes allowed.

### Filtering/Sorting  
> "Separate the mixed input into pure streams: all 🔴 to output A, all 🔵 to output B"

Given chaotic input, produce organized output.

### Rate/Frequency
> "Output exactly one 🔵 for every two 🔴 that enter"

Ratio puzzles. Requires counting, buffering, or clever splitting.

### Steady State
> "Produce one 🟢 every 4 ticks, forever"

Oscillator design. Must be self-sustaining.

### Universality
> "Given unknown input (🔴 or 🔵), always output 🟢"

Build a machine that handles all cases. Tests robustness.

### Efficiency
> "Solve using ≤ 4 gates"

Optimization challenge. Solution exists, but can you find the elegant one?

### Debugging
> "This machine should output 🔵🔵🔵 but outputs 🔵🔴🔵. Fix it."

Given a broken machine, diagnose and repair.

### Synthesis
> "Design a machine satisfying: [spec]"

Open-ended. Multiple valid solutions. Rated on efficiency/elegance.

### Proof
> "Prove these two machines are equivalent by finding an input that distinguishes them — or confirm they're the same."

Counterexample hunting or verification.

---

## Level Progression: The Learning Journey

### Chapter 1: "First Drops" (Routing)

**1-1: The Straight Path**
- Input: 🔴
- Output: 🔴
- Available: Wire
- Lesson: Connect input to output. That's it. Feel the click.

**1-2: The Fork**
- Input: 🔴
- Output A: 🔴, Output B: 🔴  
- Available: Wire, Split
- Lesson: One bead becomes two.

**1-3: The Merge**
- Input A: 🔴, Input B: 🔵
- Output: 🔴🔵 (any order)
- Available: Wire, Merge
- Lesson: Two streams become one.

**1-4: The Crossing**
- Input A (top): 🔴, Input B (bottom): 🔵
- Output A (top): 🔵, Output B (bottom): 🔴
- Available: Wire, Swap
- Lesson: Wires can cross without merging.

**1-5: The Loop**
- Input: 🔴
- Output: 🔴🔴🔴
- Available: Wire, Split, Loop-back (trace)
- Lesson: Feedback creates multiplication. One bead enters, many exit.

---

### Chapter 2: "Paint Shop" (Transformation)

**2-1: Makeover**
- Input: 🔴
- Output: 🔵
- Available: Wire, Painter (blue)
- Lesson: Gates transform beads.

**2-2: Assembly Line**
- Input: 🔴🔴🔴
- Output: 🔵🔵🔵
- Available: Wire, Painter (blue)
- Lesson: Every bead gets transformed.

**2-3: Selective Service**
- Input: 🔴🔵🔴🔵
- Output A: 🔴🔴, Output B: 🔵🔵
- Available: Wire, Filter (red)
- Lesson: Filters sort by color.

**2-4: Color Mixing**
- Input A: 🔴, Input B: 🔵
- Output: 🟣 (purple)
- Available: Wire, Mixer
- Lesson: Combine primaries to make compounds.

**2-5: The Split**
- Input: 🟣
- Output A: 🔴, Output B: 🔵
- Available: Wire, Splitter
- Lesson: Compounds can be decomposed.

**2-6: Round Trip**
- Input: 🔴
- Output: 🔴
- Constraint: Bead must pass through Painter (blue) AND Painter (red)
- Lesson: Transformations can be chained and reversed.

---

### Chapter 3: "Timing Is Everything" (Synchronization)

**3-1: Wait For It**
- Input: 🔴 (fast), then 🔵 (3 ticks later)
- Output: 🔵🔴 (reversed order)
- Available: Wire, Delay
- Lesson: Delay changes arrival order.

**3-2: Heartbeat**
- Input: (none)
- Output: 🔴 every 4 ticks
- Available: Clock (red, period 4)
- Lesson: Clocks generate beads from nothing.

**3-3: Rendezvous**
- Input A: 🔴 (tick 0), Input B: 🔵 (tick 5)
- Output: 🟣 (single purple, from simultaneous arrival at Mixer)
- Available: Wire, Delay, Mixer
- Lesson: Sync inputs before combining.

**3-4: Traffic Control**
- Input: 🔴🔴🔴🔴🔴 (burst)
- Output: 🔴 ... 🔴 ... 🔴 ... 🔴 ... 🔴 (one every 3 ticks)
- Available: Wire, Queue, Clock (as release trigger)
- Lesson: Buffers smooth out bursts.

**3-5: The Gate Keeper**
- Input (main): 🔴🔴🔴, Input (control): 🔵 (arrives after 2 reds)
- Output: 🔴 (only the third red, after gate opens)
- Available: Wire, Valve
- Lesson: Control flow with signals.

---

### Chapter 4: "Conservation Laws" (Resource Management)

**4-1: No Waste**
- Input: 🔴🔵🔴
- Output A: 🔴🔴, Output B: 🔵
- Constraint: All beads must exit (no destruction)
- Available: Wire, Filter
- Lesson: Conservation — what goes in must come out.

**4-2: Balanced Equation**
- Input: 🔴🔴🔵🔵
- Output: 🟣🟣
- Constraint: No leftover beads
- Available: Wire, Mixer
- Lesson: Reactions consume inputs completely.

**4-3: Catalyst**
- Input: 🔴🔴🔴, Catalyst: 🟡 (already in system)
- Output: 🔵🔵🔵
- Constraint: 🟡 must remain in system (not consumed, not output)
- Available: Wire, Catalyst Chamber, Loop
- Lesson: Catalysts enable transformation without being consumed.

**4-4: Recycling**
- Input: 🟣🟣
- Output: 🔴🔴 and 🔵🔵 (separated)
- Available: Wire, Splitter, Filter
- Lesson: Decompose and sort.

**4-5: Perpetual Motion**
- Input: 🔴 (single bead)
- Output: 🔴 every 5 ticks, forever
- Constraint: No external clock allowed
- Available: Wire, Split, Delay, Loop
- Lesson: Feedback + split = oscillator. One bead becomes infinite.

---

### Chapter 5: "Universal Machines" (Robustness)

**5-1: The Normalizer**
- Input: 🔴 OR 🔵 (unknown)
- Output: 🟢 (always green regardless of input)
- Available: Wire, Painter (green)
- Lesson: Painters ignore input color.

**5-2: The Inverter**
- Input: 🔴 OR 🔵
- Output: 🔵 OR 🔴 (opposite of input)
- Available: Wire, Filter, Painter (red), Painter (blue)
- Lesson: Conditional transformation via filtering.

**5-3: The Doubler**
- Input: any single bead
- Output: two beads of same color
- Available: Wire, Split, Sensor, Painter (configurable)
- Lesson: Split + copy color.

**5-4: The Comparator**
- Input A: any bead, Input B: any bead
- Output (match): 🟢, Output (no match): 🔴
- Available: Wire, Reactor (various), Filter
- Lesson: Build conditional logic.

**5-5: The Sorter**
- Input: random stream of 🔴🔵🟢
- Output A: all 🔴, Output B: all 🔵, Output C: all 🟢
- Available: Wire, Filter (x2)
- Lesson: Cascading filters = multi-way sort.

---

### Chapter 6: "Debugging" (Analysis)

**6-1: The Missing Link**
- Given: Incomplete machine (gap in wiring)
- Goal: Add one wire to make it work
- Lesson: Trace the flow, find the break.

**6-2: The Wrong Turn**
- Given: Machine outputs 🔵🔴 instead of 🔴🔵
- Goal: Fix with minimal changes
- Lesson: Order matters — check your delays.

**6-3: The Overflow**
- Given: Machine that jams (too many beads in a loop)
- Goal: Add a release valve
- Lesson: Feedback needs escape routes.

**6-4: The Silent Failure**
- Given: Machine produces nothing (beads disappear)
- Goal: Find the annihilation point
- Lesson: Check for color conflicts.

**6-5: The Race Condition**
- Given: Machine that sometimes works, sometimes doesn't
- Goal: Make it deterministic
- Lesson: Add sync points to remove timing ambiguity.

---

### Chapter 7: "Optimization" (Elegance)

**7-1: The Minimalist**
- Given: Working machine with 8 gates
- Goal: Achieve same behavior with ≤ 4 gates
- Lesson: Rewrites aren't just theory — they simplify.

**7-2: The Speed Demon**
- Given: Working machine, 20 ticks to first output
- Goal: Achieve same output in ≤ 10 ticks
- Lesson: Parallelize paths.

**7-3: The Conservationist**
- Given: Machine that wastes 50% of beads
- Goal: Achieve same output with 0% waste
- Lesson: Recycle byproducts.

**7-4: Golf**
- Spec: [complex requirement]
- Goal: Smallest gate count wins (leaderboard)
- Lesson: Creative problem solving.

---

### Chapter 8: "The Microscope" (Deep Understanding)

**8-1: Prove Equivalence**
- Given: Two machines that look different
- Task: Run beads until confident they're equivalent, or find distinguishing input
- Lesson: Observational equivalence.

**8-2: Find the Invariant**
- Given: A machine with unknown behavior
- Task: Discover what's conserved (count? color ratios? timing?)
- Lesson: Science — hypothesis and test.

**8-3: The Adversary**
- Given: A machine you built
- Task: Another player sends inputs trying to break it
- Lesson: Defensive design.

**8-4: Specification**
- Given: A working machine (black box)
- Task: Write a description of its behavior
- Lesson: Reverse engineering.

---

## Juice and Feel

### Visual Feedback

**Bead Trails**
- Beads leave fading color trails as they move
- Trail length proportional to speed
- After a run, you can see the "flow history" of the whole system

**Gate Animations**
- Painter: spray/splash effect in the paint color
- Mixer: swirl animation as colors blend
- Filter: satisfying sort, like a coin sorter — clink-clink
- Reactor: little explosion/spark when reaction fires
- Delay: bead visibly "waits" in a holding cell, ticks down

**Success State**
- Output bin fills with beads, each one a satisfying *clink*
- Correct sequence = golden glow + chime
- Perfect run (no waste, optimal time) = sparkle effect + fanfare

**Failure State**
- Wrong bead at output = bead bounces off, sad sound, rolls away
- Overflow = beads spill out of loop, comedic chaos
- Annihilation = dramatic poof, slight screen shake

### Audio Design

**Bead Sounds**
- Each color has a pitch: red=low, blue=mid, green=high
- Beads moving = soft rolling sound
- Beads colliding = click/clack  
- Beads combining = harmonic chord of both colors
- Beads annihilating = dissonant buzz + silence

**Machine Rhythm**
- Idle machine = ambient hum
- Active machine = rhythmic pulse based on bead flow
- Complex machine with good timing = emergent music
- Chaotic machine = cacophony (audio feedback that something's wrong)

**Success/Failure**
- Correct output = ascending arpeggio
- Wrong output = descending wah-wah
- Level complete = triumphant chord
- Perfect score = full fanfare

### Information Display

**While Running**
- Bead counter per output (live updating)
- Timeline scrubber — pause and scrub through the run
- "X-ray mode" toggle to see beads inside gates

**After Running**
- Stats: beads in, beads out, waste, time to complete
- Efficiency rating: "You used 12 beads to produce 4. Waste: 67%"
- Optimal comparison: "Par: 4 gates. You used: 7."

**In Editor**
- Ghost beads showing "predicted path" before you run
- Port compatibility highlighting (can this output connect to that input?)
- Cycle detection warning for infinite loops without exits

---

## The Rewrite System (Still There, But Recontextualized)

Rewrites don't disappear — they become **power tools** for optimization chapter:

- After solving a level the "brute force" way, unlock **Refactor Mode**
- Refactor Mode shows available rewrites as glowing regions on the diagram
- Applying a rewrite simplifies the machine while preserving behavior
- Goal: reach the minimal form for bonus stars

This means:
- Casual players solve with intuition, never touch rewrites
- Advanced players use rewrites to optimize and understand *why* their solution works
- The categorical algebra is there for those who want it, invisible to those who don't

---

## Technical Implementation Notes

### Bead Data Structure
```typescript
interface Bead {
  id: string;
  color: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'cyan' | 'white' | 'black';
  charge?: 'positive' | 'negative' | 'neutral';
  phase?: 0 | 90 | 180 | 270;
  mass?: number;
  position: BeadPosition;
  velocity: number;
}
```

### Gate Data Structure
```typescript
interface Gate {
  id: string;
  type: GateType;
  config: GateConfig; // e.g., { targetColor: 'blue' } for Painter
  inputs: Port[];
  outputs: Port[];
  processingTime: number; // ticks to transform
  currentBeads: Bead[]; // beads currently inside
}
```

### Win Condition Data Structure
```typescript
interface WinCondition {
  type: 'exact-sequence' | 'multiset' | 'rate' | 'conservation' | 'custom';
  outputs: {
    portId: string;
    expected: BeadPattern; // could be sequence, set, rate spec, etc.
  }[];
  constraints?: {
    maxGates?: number;
    maxTime?: number;
    noWaste?: boolean;
  };
}
```

---

## Open Questions

1. **How literal is "bead physics"?** Real collision detection, or discrete time-step with conflict resolution?

2. **Color algebra**: Is purple strictly red+blue, or can we have multiple "recipes"? (Affects puzzle design space)

3. **Failure modes**: Hard fail (restart) vs. soft fail (keep running, show what went wrong)?

4. **Sandbox unlocks**: Everything available from start, or gate unlocks track progression?

5. **User-generated levels**: JSON level format for sharing? Built-in editor?

6. **Mobile**: Touch-friendly? Drag wires with finger?

---

## Next Steps

1. **Prototype one "Paint Shop" level** — implement Painter gate, color transformation, exact-sequence win condition

2. **Add bead color to rendering** — beads should visually BE their color, not just labeled

3. **Implement Filter gate** — enables sorting puzzles, huge design space unlock

4. **Build the "collection bin" output visualization** — satisfying feedback for correct outputs

5. **Create 5-level vertical slice**: straight path → split → paint → filter → combine

This vertical slice should feel fun without any categorical stuff. If it doesn't, we've failed. If it does, we've found the game.
