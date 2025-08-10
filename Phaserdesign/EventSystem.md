# EventSystem.md - Event-Driven Communication Between React and Phaser

This guide covers the event-driven architecture that enables seamless communication between React and Phaser game scenes in the Tower of Power framework.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [EventBus Implementation](#eventbus-implementation)
3. [Core Event Patterns](#core-event-patterns)
4. [Game-to-UI Communication](#game-to-ui-communication)
5. [UI-to-Game Communication](#ui-to-game-communication)
6. [Event Categories](#event-categories)
7. [Error Handling](#error-handling)
8. [Performance Optimization](#performance-optimization)
9. [Testing Events](#testing-events)
10. [Best Practices](#best-practices)

## Architecture Overview

The Tower of Power framework uses a centralized event system built on the `mitt` library to enable type-safe, efficient communication between React and Phaser:

```
┌─────────────────┐    EventBus    ┌─────────────────┐
│   React UI      │◄──────────────►│   Phaser Game   │
│   Components    │                │   Scenes        │
└─────────────────┘                └─────────────────┘
        │                                   │
        ▼                                   ▼
┌─────────────────┐                ┌─────────────────┐
│   Zustand       │                │   Game State    │
│   Stores        │                │   Management    │
└─────────────────┘                └─────────────────┘
```

### Key Benefits

- **Decoupled Architecture**: UI and game logic remain independent
- **Type Safety**: TypeScript interfaces ensure correct event usage
- **Performance**: Efficient event system with minimal overhead
- **Debuggability**: Centralized event logging and monitoring
- **Scalability**: Easy to add new events and handlers

## EventBus Implementation

### Core EventBus Setup

```typescript
// lib/EventBus.ts
import mitt, { Emitter } from 'mitt';

// Define all possible events with their payload types
export interface GameEvents {
  // Player events
  'player:initialized': { playerId: string; position: { x: number; y: number } };
  'player:moved': { position: { x: number; y: number }; direction: string };
  'player:health-changed': { current: number; max: number; percentage: number };
  'player:level-up': { newLevel: number; xpGained: number };
  'player:died': { cause: string; position: { x: number; y: number } };
  
  // Combat events
  'combat:started': { enemies: string[]; location: string };
  'combat:ended': { victory: boolean; xpGained: number; lootGained: any[] };
  'combat:damage-dealt': { damage: number; target: string; ability?: string };
  'combat:damage-received': { damage: number; source: string };
  
  // UI events
  'ui:window-opened': { windowType: string; data?: any };
  'ui:window-closed': { windowType: string };
  'ui:notification': { type: 'success' | 'error' | 'warning' | 'info'; message: string };
  'ui:tooltip-show': { text: string; position: { x: number; y: number } };
  'ui:tooltip-hide': {};
  
  // Inventory events
  'inventory:item-added': { item: any; quantity: number };
  'inventory:item-removed': { itemId: string; quantity: number };
  'inventory:item-used': { item: any; effect?: string };
  
  // Scene events
  'scene:changed': { from: string; to: string };
  'scene:loading': { sceneName: string; progress: number };
  'scene:loaded': { sceneName: string };
  
  // Game state events
  'game:paused': {};
  'game:resumed': {};
  'game:settings-changed': { settings: any };
  'game:save-requested': {};
  'game:load-requested': { saveSlot?: number };
}

// Create the event bus instance
export const EventBus: Emitter<GameEvents> = mitt<GameEvents>();

// Enhanced event bus with logging and debugging
class EnhancedEventBus {
  private emitter: Emitter<GameEvents>;
  private debug: boolean = false;
  private eventHistory: Array<{ event: string; data: any; timestamp: number }> = [];
  private maxHistorySize = 100;

  constructor() {
    this.emitter = mitt<GameEvents>();
    this.setupEventLogging();
  }

  private setupEventLogging() {
    // Intercept all events for debugging
    const originalEmit = this.emitter.emit;
    this.emitter.emit = ((event: keyof GameEvents, data?: any) => {
      if (this.debug) {
        console.log(`[EventBus] ${event}:`, data);
      }
      
      // Store in history
      this.eventHistory.push({
        event: event as string,
        data,
        timestamp: Date.now()
      });
      
      // Maintain history size
      if (this.eventHistory.length > this.maxHistorySize) {
        this.eventHistory.shift();
      }
      
      return originalEmit.call(this.emitter, event, data);
    }) as any;
  }

  // Expose emitter methods
  emit<K extends keyof GameEvents>(event: K, data: GameEvents[K]) {
    return this.emitter.emit(event, data);
  }

  on<K extends keyof GameEvents>(event: K, handler: (data: GameEvents[K]) => void) {
    return this.emitter.on(event, handler);
  }

  off<K extends keyof GameEvents>(event: K, handler?: (data: GameEvents[K]) => void) {
    return this.emitter.off(event, handler);
  }

  // Debugging utilities
  enableDebug(enabled: boolean = true) {
    this.debug = enabled;
  }

  getEventHistory() {
    return [...this.eventHistory];
  }

  clearEventHistory() {
    this.eventHistory = [];
  }

  // Event statistics
  getEventStats() {
    const stats: Record<string, number> = {};
    this.eventHistory.forEach(entry => {
      stats[entry.event] = (stats[entry.event] || 0) + 1;
    });
    return stats;
  }
}

export const EventBus = new EnhancedEventBus();
```

## Core Event Patterns

### 1. Event Naming Convention

```typescript
// Pattern: [category]:[action]
// Examples:
'player:health-changed'    // Player category, health changed action
'ui:window-opened'         // UI category, window opened action
'inventory:item-added'     // Inventory category, item added action
'combat:damage-dealt'      // Combat category, damage dealt action
```

### 2. Event Payload Structure

```typescript
// Always include relevant context data
interface BaseEventPayload {
  timestamp?: number;
  source?: string; // Which component/scene triggered the event
}

// Specific event payloads extend the base
interface PlayerHealthChangedPayload extends BaseEventPayload {
  current: number;
  max: number;
  percentage: number;
  previousHealth?: number;
  cause?: 'damage' | 'healing' | 'level-up';
}
```

### 3. Event Handler Patterns

```typescript
// React component event handling
const useGameEvents = () => {
  useEffect(() => {
    const handlePlayerHealthChanged = (data: GameEvents['player:health-changed']) => {
      // Update UI state
      setHealthPercentage(data.percentage);
      
      // Show visual feedback
      if (data.current < data.max * 0.2) {
        setHealthStatus('critical');
      }
    };

    EventBus.on('player:health-changed', handlePlayerHealthChanged);

    return () => {
      EventBus.off('player:health-changed', handlePlayerHealthChanged);
    };
  }, []);
};

// Phaser scene event handling
class DungeonScene extends Phaser.Scene {
  create() {
    // Listen for UI events
    EventBus.on('ui:spell-cast', this.handleSpellCast.bind(this));
  }

  handleSpellCast(data: GameEvents['ui:spell-cast']) {
    // Execute spell in game world
    this.player.castSpell(data.spellId, data.targetPosition);
  }

  destroy() {
    // Clean up event listeners
    EventBus.off('ui:spell-cast', this.handleSpellCast.bind(this));
    super.destroy();
  }
}
```

## Game-to-UI Communication

### Player State Updates

```typescript
// In Phaser Player class
class Player extends Phaser.GameObjects.Sprite {
  takeDamage(amount: number, source: string) {
    this.health -= amount;
    
    // Emit health change event
    EventBus.emit('player:health-changed', {
      current: this.health,
      max: this.maxHealth,
      percentage: this.health / this.maxHealth,
      previousHealth: this.health + amount,
      cause: 'damage',
      source: source,
      timestamp: Date.now()
    });
    
    // Check for death
    if (this.health <= 0) {
      EventBus.emit('player:died', {
        cause: source,
        position: { x: this.x, y: this.y },
        timestamp: Date.now()
      });
    }
  }

  levelUp() {
    this.level += 1;
    
    EventBus.emit('player:level-up', {
      newLevel: this.level,
      xpGained: this.getXpForNextLevel(),
      timestamp: Date.now()
    });
  }
}

// React component listening for updates
const HealthBar: React.FC = () => {
  const [health, setHealth] = useState({ current: 100, max: 100 });
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    const handleHealthChange = (data: GameEvents['player:health-changed']) => {
      setHealth({ current: data.current, max: data.max });
      
      // Flash effect for damage
      if (data.cause === 'damage') {
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 500);
      }
    };

    EventBus.on('player:health-changed', handleHealthChange);
    return () => EventBus.off('player:health-changed', handleHealthChange);
  }, []);

  return (
    <div className={`health-bar ${isFlashing ? 'flashing' : ''}`}>
      <div 
        className="health-fill"
        style={{ width: `${(health.current / health.max) * 100}%` }}
      />
      <span>{health.current}/{health.max}</span>
    </div>
  );
};
```

### Combat System Events

```typescript
// Combat Manager in Phaser
class CombatManager {
  startCombat(enemies: Enemy[]) {
    this.inCombat = true;
    
    EventBus.emit('combat:started', {
      enemies: enemies.map(e => e.id),
      location: this.scene.scene.key,
      timestamp: Date.now()
    });
    
    // Enable combat UI
    EventBus.emit('ui:window-opened', {
      windowType: 'combat',
      data: { enemies }
    });
  }

  dealDamage(attacker: any, target: any, damage: number, ability?: string) {
    target.takeDamage(damage);
    
    EventBus.emit('combat:damage-dealt', {
      damage,
      target: target.id,
      ability,
      attacker: attacker.id,
      timestamp: Date.now()
    });
    
    // Show floating damage number
    EventBus.emit('ui:floating-text', {
      text: `-${damage}`,
      position: { x: target.x, y: target.y },
      color: 'red',
      duration: 1000
    });
  }

  endCombat(victory: boolean, rewards: any) {
    this.inCombat = false;
    
    EventBus.emit('combat:ended', {
      victory,
      xpGained: rewards.xp,
      lootGained: rewards.items,
      timestamp: Date.now()
    });
    
    // Close combat UI
    EventBus.emit('ui:window-closed', { windowType: 'combat' });
    
    if (victory) {
      // Show victory screen
      EventBus.emit('ui:window-opened', {
        windowType: 'victory',
        data: rewards
      });
    }
  }
}
```

## UI-to-Game Communication

### Ability System Integration

```typescript
// React Ability Bar Component
const AbilityBar: React.FC = () => {
  const { abilities } = usePlayerStore();
  const [target, setTarget] = useState<{ x: number; y: number } | null>(null);

  const castAbility = (abilityId: string) => {
    // Request target if needed
    if (abilities[abilityId].requiresTarget) {
      EventBus.emit('ui:target-mode-enabled', {
        abilityId,
        callback: handleTargetSelected
      });
    } else {
      // Cast immediately
      EventBus.emit('game:ability-cast', {
        abilityId,
        casterId: 'player',
        timestamp: Date.now()
      });
    }
  };

  const handleTargetSelected = (position: { x: number; y: number }) => {
    EventBus.emit('game:ability-cast', {
      abilityId,
      casterId: 'player',
      targetPosition: position,
      timestamp: Date.now()
    });
  };

  return (
    <div className="ability-bar">
      {abilities.map(ability => (
        <button
          key={ability.id}
          onClick={() => castAbility(ability.id)}
          disabled={ability.cooldown > 0}
          className="ability-button"
        >
          <img src={ability.icon} alt={ability.name} />
          {ability.cooldown > 0 && (
            <div className="cooldown-overlay">
              {ability.cooldown}
            </div>
          )}
        </button>
      ))}
    </div>
  );
};

// Phaser scene handling ability casts
class DungeonScene extends Phaser.Scene {
  create() {
    EventBus.on('game:ability-cast', this.handleAbilityCast.bind(this));
    EventBus.on('ui:target-mode-enabled', this.enableTargetMode.bind(this));
  }

  handleAbilityCast(data: GameEvents['game:ability-cast']) {
    const caster = this.getEntityById(data.casterId);
    const ability = this.abilitySystem.getAbility(data.abilityId);
    
    if (caster && ability) {
      this.abilitySystem.castAbility(caster, ability, data.targetPosition);
    }
  }

  enableTargetMode(data: any) {
    this.input.once('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      data.callback(worldPoint);
      
      EventBus.emit('ui:target-mode-disabled', {});
    });
  }
}
```

### Settings and Configuration

```typescript
// Settings Modal Component
const SettingsModal: React.FC = () => {
  const [settings, setSettings] = useState(defaultSettings);

  const updateSetting = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    // Immediately apply to game
    EventBus.emit('game:settings-changed', {
      settings: newSettings,
      changedKey: key,
      timestamp: Date.now()
    });
  };

  return (
    <div className="settings-modal">
      <div className="setting-group">
        <label>Master Volume</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={settings.masterVolume}
          onChange={(e) => updateSetting('masterVolume', parseFloat(e.target.value))}
        />
      </div>
      
      <div className="setting-group">
        <label>Show Damage Numbers</label>
        <input
          type="checkbox"
          checked={settings.showDamageNumbers}
          onChange={(e) => updateSetting('showDamageNumbers', e.target.checked)}
        />
      </div>
    </div>
  );
};

// Game settings handler
class BaseScene extends Phaser.Scene {
  create() {
    EventBus.on('game:settings-changed', this.handleSettingsChanged.bind(this));
  }

  handleSettingsChanged(data: GameEvents['game:settings-changed']) {
    const { settings, changedKey } = data;
    
    switch (changedKey) {
      case 'masterVolume':
        this.sound.volume = settings.masterVolume;
        break;
        
      case 'showDamageNumbers':
        this.damageTextEnabled = settings.showDamageNumbers;
        break;
        
      case 'graphics':
        this.updateGraphicsSettings(settings.graphics);
        break;
    }
    
    // Save settings
    localStorage.setItem('gameSettings', JSON.stringify(settings));
  }
}
```

## Event Categories

### Core Game Events

```typescript
// Player lifecycle events
'player:spawned'           // Player character created
'player:respawned'         // Player respawned after death
'player:moved'             // Player position changed
'player:attacked'          // Player performed attack
'player:skill-used'        // Player used a skill

// Game state events
'game:paused'              // Game paused
'game:resumed'             // Game resumed
'game:saved'               // Game state saved
'game:loaded'              // Game state loaded
'game:reset'               // Game reset to initial state
```

### UI Interaction Events

```typescript
// Window management
'ui:window-opened'         // Modal/window opened
'ui:window-closed'         // Modal/window closed
'ui:window-minimized'      // Window minimized
'ui:window-focused'        // Window gained focus

// User interactions
'ui:button-clicked'        // Button interaction
'ui:item-selected'         // Item selection
'ui:drag-started'          // Drag operation started
'ui:drop-completed'        // Drop operation completed
```

### System Events

```typescript
// Performance monitoring
'system:fps-changed'       // FPS update
'system:memory-warning'    // Memory usage warning
'system:error-occurred'    // Error caught

// Network events
'network:connected'        // Network connection established
'network:disconnected'     // Network connection lost
'network:sync-completed'   // Data synchronization completed
```

## Error Handling

### Event Error Boundaries

```typescript
// Error-safe event emission
const safeEmit = <K extends keyof GameEvents>(
  event: K, 
  data: GameEvents[K],
  fallback?: () => void
) => {
  try {
    EventBus.emit(event, data);
  } catch (error) {
    console.error(`Error emitting event ${event}:`, error);
    
    // Emit error event for monitoring
    EventBus.emit('system:error-occurred', {
      error: error.message,
      event,
      data,
      timestamp: Date.now()
    });
    
    // Execute fallback if provided
    fallback?.();
  }
};

// Error-safe event listening
const safeOn = <K extends keyof GameEvents>(
  event: K,
  handler: (data: GameEvents[K]) => void,
  errorHandler?: (error: Error) => void
) => {
  const wrappedHandler = (data: GameEvents[K]) => {
    try {
      handler(data);
    } catch (error) {
      console.error(`Error in event handler for ${event}:`, error);
      errorHandler?.(error as Error);
      
      // Emit system error
      EventBus.emit('system:error-occurred', {
        error: (error as Error).message,
        event,
        data,
        handlerError: true,
        timestamp: Date.now()
      });
    }
  };
  
  EventBus.on(event, wrappedHandler);
  return () => EventBus.off(event, wrappedHandler);
};
```

### Event Validation

```typescript
// Event payload validation
const createEventValidator = <T>(schema: any) => (data: T): boolean => {
  // Simple validation example - in production, use a library like Joi or Zod
  try {
    // Validate required fields
    return Object.keys(schema).every(key => {
      if (schema[key].required && !(key in data)) {
        console.warn(`Missing required field ${key} in event data`);
        return false;
      }
      return true;
    });
  } catch {
    return false;
  }
};

// Usage
const playerHealthSchema = {
  current: { required: true, type: 'number' },
  max: { required: true, type: 'number' },
  percentage: { required: true, type: 'number' }
};

const validatePlayerHealth = createEventValidator(playerHealthSchema);

// Emit with validation
const emitPlayerHealthChanged = (data: GameEvents['player:health-changed']) => {
  if (validatePlayerHealth(data)) {
    EventBus.emit('player:health-changed', data);
  } else {
    console.error('Invalid player health data:', data);
  }
};
```

## Performance Optimization

### Event Throttling and Debouncing

```typescript
// Throttled event emission for high-frequency events
const throttle = <T extends any[]>(
  func: (...args: T) => void,
  delay: number
): ((...args: T) => void) => {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;
  
  return (...args: T) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};

// Throttled player movement events
const emitPlayerMoved = throttle((position: { x: number; y: number }) => {
  EventBus.emit('player:moved', {
    position,
    timestamp: Date.now()
  });
}, 100); // Emit at most every 100ms

// Debounced settings changes
const debounce = <T extends any[]>(
  func: (...args: T) => void,
  delay: number
): ((...args: T) => void) => {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: T) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

const emitSettingsChanged = debounce((settings: any) => {
  EventBus.emit('game:settings-changed', { settings });
}, 500); // Save settings 500ms after last change
```

### Memory Management

```typescript
// Event listener cleanup utilities
class EventManager {
  private listeners: Map<string, (() => void)[]> = new Map();

  addListener<K extends keyof GameEvents>(
    event: K,
    handler: (data: GameEvents[K]) => void,
    cleanup?: () => void
  ) {
    const removeListener = () => {
      EventBus.off(event, handler);
      cleanup?.();
    };

    // Store cleanup function
    const eventListeners = this.listeners.get(event as string) || [];
    eventListeners.push(removeListener);
    this.listeners.set(event as string, eventListeners);

    EventBus.on(event, handler);
    return removeListener;
  }

  removeAllListeners(event?: keyof GameEvents) {
    if (event) {
      const listeners = this.listeners.get(event as string) || [];
      listeners.forEach(cleanup => cleanup());
      this.listeners.delete(event as string);
    } else {
      // Remove all listeners
      this.listeners.forEach(listeners => {
        listeners.forEach(cleanup => cleanup());
      });
      this.listeners.clear();
    }
  }

  destroy() {
    this.removeAllListeners();
  }
}

// Usage in React components
const useEventManager = () => {
  const eventManagerRef = useRef(new EventManager());

  useEffect(() => {
    return () => {
      eventManagerRef.current.destroy();
    };
  }, []);

  return eventManagerRef.current;
};
```

## Testing Events

### Event Testing Utilities

```typescript
// Event testing helper
class EventTester {
  private capturedEvents: Array<{ event: string; data: any; timestamp: number }> = [];
  private originalEmit: any;

  startCapture() {
    this.capturedEvents = [];
    this.originalEmit = EventBus.emit;
    
    EventBus.emit = ((event: keyof GameEvents, data: any) => {
      this.capturedEvents.push({
        event: event as string,
        data,
        timestamp: Date.now()
      });
      return this.originalEmit.call(EventBus, event, data);
    }) as any;
  }

  stopCapture() {
    EventBus.emit = this.originalEmit;
  }

  getEvents() {
    return [...this.capturedEvents];
  }

  getEventsByType(eventType: string) {
    return this.capturedEvents.filter(e => e.event === eventType);
  }

  waitForEvent(eventType: string, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        EventBus.off(eventType as keyof GameEvents, handler);
        reject(new Error(`Event ${eventType} not received within ${timeout}ms`));
      }, timeout);

      const handler = (data: any) => {
        clearTimeout(timer);
        EventBus.off(eventType as keyof GameEvents, handler);
        resolve(data);
      };

      EventBus.on(eventType as keyof GameEvents, handler);
    });
  }

  expectEvent(eventType: string, expectedData?: any) {
    const events = this.getEventsByType(eventType);
    
    if (events.length === 0) {
      throw new Error(`Expected event ${eventType} was not emitted`);
    }

    if (expectedData) {
      const lastEvent = events[events.length - 1];
      expect(lastEvent.data).toMatchObject(expectedData);
    }

    return events[events.length - 1];
  }
}

// Test example
describe('Player Combat Events', () => {
  let eventTester: EventTester;
  let player: Player;

  beforeEach(() => {
    eventTester = new EventTester();
    eventTester.startCapture();
    player = new Player();
  });

  afterEach(() => {
    eventTester.stopCapture();
  });

  test('player takes damage', async () => {
    player.takeDamage(25, 'enemy');

    const healthEvent = eventTester.expectEvent('player:health-changed', {
      damage: 25,
      cause: 'damage'
    });

    expect(healthEvent.data.current).toBe(75);
    expect(healthEvent.data.percentage).toBe(0.75);
  });

  test('player death emits correct event', async () => {
    player.takeDamage(100, 'dragon');

    eventTester.expectEvent('player:died', {
      cause: 'dragon'
    });
  });
});
```

## Best Practices

### 1. Event Naming and Structure

```typescript
// ✅ Good: Clear, descriptive names
'player:health-changed'
'inventory:item-equipped'
'combat:spell-cast'

// ❌ Bad: Vague or inconsistent names
'update'
'change'
'itemThing'

// ✅ Good: Consistent payload structure
interface EventPayload {
  // Core data
  entityId?: string;
  timestamp: number;
  
  // Event-specific data
  [key: string]: any;
}

// ❌ Bad: Inconsistent or missing data
// Some events have timestamp, others don't
// Some include entity info, others don't
```

### 2. Performance Considerations

```typescript
// ✅ Good: Throttle high-frequency events
const throttledEmit = throttle(
  () => EventBus.emit('player:moved', position),
  50 // Max 20 times per second
);

// ✅ Good: Use object pooling for frequent events
class EventPool {
  private pool: any[] = [];
  
  get() {
    return this.pool.pop() || {};
  }
  
  release(obj: any) {
    // Clear object and return to pool
    Object.keys(obj).forEach(key => delete obj[key]);
    this.pool.push(obj);
  }
}

// ❌ Bad: Emitting events in tight loops without throttling
for (let i = 0; i < 1000; i++) {
  EventBus.emit('some:event', data); // Will overwhelm listeners
}
```

### 3. Error Handling

```typescript
// ✅ Good: Wrap critical event handlers in try-catch
EventBus.on('player:died', (data) => {
  try {
    this.handlePlayerDeath(data);
  } catch (error) {
    console.error('Error handling player death:', error);
    // Fallback behavior
    this.showGenericDeathScreen();
  }
});

// ✅ Good: Validate event data
EventBus.on('player:health-changed', (data) => {
  if (!data || typeof data.current !== 'number') {
    console.warn('Invalid health data received:', data);
    return;
  }
  
  this.updateHealthBar(data);
});
```

### 4. Documentation and Type Safety

```typescript
// ✅ Good: Document event purpose and payload
/**
 * Emitted when player's health changes due to damage, healing, or level up
 * @param current - Current health value
 * @param max - Maximum health value  
 * @param cause - What caused the health change
 * @param source - Entity that caused the change (for damage)
 */
'player:health-changed': {
  current: number;
  max: number;
  percentage: number;
  cause: 'damage' | 'healing' | 'level-up';
  source?: string;
};

// ✅ Good: Use TypeScript for compile-time safety
EventBus.emit('player:health-changed', {
  current: 75,
  max: 100,
  percentage: 0.75,
  cause: 'damage'
}); // TypeScript ensures correct payload structure
```

This comprehensive event system enables seamless, type-safe communication between React and Phaser while maintaining performance and debuggability. The centralized EventBus pattern keeps components decoupled while providing a robust foundation for complex game interactions. 