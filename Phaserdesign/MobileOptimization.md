# MobileOptimization.md - Touch Controls, Responsive Design, and Mobile Performance

This guide covers comprehensive mobile optimization for the Tower of Power framework, including touch controls, responsive design, performance optimization, and platform-specific considerations for creating excellent mobile gaming experiences.

## Table of Contents

1. [Mobile Optimization Overview](#mobile-optimization-overview)
2. [Responsive Design System](#responsive-design-system)
3. [Touch Control Implementation](#touch-control-implementation)
4. [Virtual Joystick System](#virtual-joystick-system)
5. [Mobile Performance Optimization](#mobile-performance-optimization)
6. [Battery Life Optimization](#battery-life-optimization)
7. [Platform-Specific Considerations](#platform-specific-considerations)
8. [Network Optimization](#network-optimization)
9. [Mobile UI/UX Patterns](#mobile-uiux-patterns)
10. [Testing and Debugging](#testing-and-debugging)
11. [Best Practices](#best-practices)

## Mobile Optimization Overview

Mobile optimization is crucial for game accessibility and performance across diverse devices. The Tower of Power framework implements comprehensive mobile support:

```
┌─────────────────────────────────────────────────────────────┐
│                Mobile Optimization System                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Responsive │  │    Touch    │  │ Performance │        │
│  │    Design   │  │  Controls   │  │ Optimization│        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Virtual   │  │   Battery   │  │  Platform   │        │
│  │  Joystick   │  │ Optimization│  │   Specific  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

- **Universal Responsive Design**: Adapts to any screen size and orientation
- **Advanced Touch Controls**: Multi-touch, gestures, and virtual controls
- **Performance Scaling**: Automatic quality adjustment based on device capabilities
- **Battery Optimization**: Intelligent power management and resource usage
- **Cross-Platform Support**: iOS, Android, and PWA compatibility
- **Offline Capabilities**: Service worker integration for offline gameplay

## Responsive Design System

### Dynamic Layout Manager

```typescript
// lib/mobile/ResponsiveManager.ts
export class ResponsiveManager {
  private game: Phaser.Game;
  private currentBreakpoint: Breakpoint;
  private orientationLocked: boolean = false;
  private scaleMode: ScaleMode = 'FIT';

  constructor(game: Phaser.Game) {
    this.game = game;
    this.setupResponsiveSystem();
    this.detectInitialBreakpoint();
  }

  private setupResponsiveSystem() {
    // Set up scale manager for responsive behavior
    this.game.scale.scaleMode = Phaser.Scale.RESIZE;
    this.game.scale.autoCenter = Phaser.Scale.CENTER_BOTH;
    
    // Listen for resize events
    this.game.scale.on('resize', this.handleResize.bind(this));
    
    // Listen for orientation changes
    window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));
    window.addEventListener('resize', this.handleWindowResize.bind(this));
    
    // Set up viewport meta tag for mobile
    this.setupViewport();
  }

  private setupViewport() {
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.setAttribute('name', 'viewport');
      document.head.appendChild(viewport);
    }
    
    viewport.setAttribute('content', 
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
    );
  }

  private detectInitialBreakpoint() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.currentBreakpoint = this.getBreakpoint(width, height);
    this.applyBreakpointSettings();
  }

  private getBreakpoint(width: number, height: number): Breakpoint {
    const isLandscape = width > height;
    const minDimension = Math.min(width, height);
    
    if (minDimension <= 480) {
      return isLandscape ? 'mobile-landscape' : 'mobile-portrait';
    } else if (minDimension <= 768) {
      return isLandscape ? 'tablet-landscape' : 'tablet-portrait';
    } else {
      return 'desktop';
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    const newBreakpoint = this.getBreakpoint(gameSize.width, gameSize.height);
    
    if (newBreakpoint !== this.currentBreakpoint) {
      this.currentBreakpoint = newBreakpoint;
      this.applyBreakpointSettings();
      
      // Emit breakpoint change event
      EventBus.emit('responsive:breakpoint-changed', {
        breakpoint: newBreakpoint,
        dimensions: { width: gameSize.width, height: gameSize.height }
      });
    }
  }

  private applyBreakpointSettings() {
    const settings = BREAKPOINT_SETTINGS[this.currentBreakpoint];
    
    // Apply UI scaling
    this.applyUIScaling(settings.uiScale);
    
    // Apply performance settings
    this.applyPerformanceSettings(settings.performance);
    
    // Update control scheme
    this.updateControlScheme(settings.controls);
  }

  private applyUIScaling(uiScale: number) {
    // Scale UI elements based on breakpoint
    EventBus.emit('ui:scale-changed', { scale: uiScale });
  }

  private applyPerformanceSettings(perfSettings: PerformanceSettings) {
    EventBus.emit('performance:settings-changed', perfSettings);
  }

  private updateControlScheme(controlSettings: ControlSettings) {
    EventBus.emit('controls:scheme-changed', controlSettings);
  }

  private handleOrientationChange() {
    // Delay to ensure accurate dimensions after orientation change
    setTimeout(() => {
      this.game.scale.refresh();
    }, 100);
  }

  private handleWindowResize() {
    // Debounced resize handling
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.game.scale.refresh();
    }, 250);
  }

  // Public API
  getCurrentBreakpoint(): Breakpoint {
    return this.currentBreakpoint;
  }

  isMobile(): boolean {
    return this.currentBreakpoint.includes('mobile');
  }

  isTablet(): boolean {
    return this.currentBreakpoint.includes('tablet');
  }

  isLandscape(): boolean {
    return this.currentBreakpoint.includes('landscape');
  }

  forceOrientation(orientation: 'portrait' | 'landscape' | 'auto') {
    if (orientation === 'auto') {
      this.orientationLocked = false;
      // Remove any orientation locks
      if ('orientation' in screen && 'unlock' in screen.orientation) {
        (screen.orientation as any).unlock();
      }
    } else {
      this.orientationLocked = true;
      // Request orientation lock (if supported)
      if ('orientation' in screen && 'lock' in screen.orientation) {
        (screen.orientation as any).lock(orientation).catch(() => {
          console.warn('Orientation lock not supported or denied');
        });
      }
    }
  }

  private resizeTimeout: any;
}

// Breakpoint configuration
const BREAKPOINT_SETTINGS: Record<Breakpoint, BreakpointConfig> = {
  'mobile-portrait': {
    uiScale: 1.2,
    performance: {
      quality: 'low',
      particleCount: 50,
      shadowQuality: 'off',
      antiAliasing: false
    },
    controls: {
      type: 'touch',
      showVirtualJoystick: true,
      buttonSize: 'large'
    }
  },
  'mobile-landscape': {
    uiScale: 1.0,
    performance: {
      quality: 'medium',
      particleCount: 100,
      shadowQuality: 'low',
      antiAliasing: false
    },
    controls: {
      type: 'touch',
      showVirtualJoystick: true,
      buttonSize: 'medium'
    }
  },
  'tablet-portrait': {
    uiScale: 1.0,
    performance: {
      quality: 'medium',
      particleCount: 150,
      shadowQuality: 'medium',
      antiAliasing: true
    },
    controls: {
      type: 'hybrid',
      showVirtualJoystick: false,
      buttonSize: 'medium'
    }
  },
  'tablet-landscape': {
    uiScale: 0.9,
    performance: {
      quality: 'high',
      particleCount: 200,
      shadowQuality: 'high',
      antiAliasing: true
    },
    controls: {
      type: 'hybrid',
      showVirtualJoystick: false,
      buttonSize: 'small'
    }
  },
  'desktop': {
    uiScale: 0.8,
    performance: {
      quality: 'ultra',
      particleCount: 300,
      shadowQuality: 'ultra',
      antiAliasing: true
    },
    controls: {
      type: 'keyboard',
      showVirtualJoystick: false,
      buttonSize: 'small'
    }
  }
};

type Breakpoint = 'mobile-portrait' | 'mobile-landscape' | 'tablet-portrait' | 'tablet-landscape' | 'desktop';
type ScaleMode = 'FIT' | 'FILL' | 'FIXED';

interface BreakpointConfig {
  uiScale: number;
  performance: PerformanceSettings;
  controls: ControlSettings;
}

interface PerformanceSettings {
  quality: 'low' | 'medium' | 'high' | 'ultra';
  particleCount: number;
  shadowQuality: 'off' | 'low' | 'medium' | 'high' | 'ultra';
  antiAliasing: boolean;
}

interface ControlSettings {
  type: 'touch' | 'hybrid' | 'keyboard';
  showVirtualJoystick: boolean;
  buttonSize: 'small' | 'medium' | 'large';
}
```

## Touch Control Implementation

### Advanced Touch Input Manager

```typescript
// lib/mobile/TouchInputManager.ts
export class TouchInputManager {
  private scene: Phaser.Scene;
  private activePointers: Map<number, TouchPointer> = new Map();
  private gestureRecognizer: GestureRecognizer;
  private touchZones: TouchZone[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.gestureRecognizer = new GestureRecognizer();
    this.setupTouchInput();
  }

  private setupTouchInput() {
    // Enable multi-touch
    this.scene.input.addPointer(3); // Support up to 4 touch points
    
    // Set up touch event listeners
    this.scene.input.on('pointerdown', this.handlePointerDown.bind(this));
    this.scene.input.on('pointermove', this.handlePointerMove.bind(this));
    this.scene.input.on('pointerup', this.handlePointerUp.bind(this));
    
    // Prevent default touch behaviors
    this.preventDefaultTouchBehaviors();
  }

  private preventDefaultTouchBehaviors() {
    const canvas = this.scene.game.canvas;
    
    // Prevent scrolling and zooming
    canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    canvas.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });
    
    // Prevent context menu on long press
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Prevent double-tap zoom
    canvas.style.touchAction = 'none';
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    const touchPointer: TouchPointer = {
      id: pointer.id,
      startPosition: { x: pointer.x, y: pointer.y },
      currentPosition: { x: pointer.x, y: pointer.y },
      startTime: pointer.time,
      isActive: true
    };

    this.activePointers.set(pointer.id, touchPointer);
    
    // Check touch zones
    const touchedZone = this.getTouchedZone(pointer.x, pointer.y);
    if (touchedZone) {
      this.handleZoneTouch(touchedZone, touchPointer, 'down');
    }

    // Start gesture recognition
    this.gestureRecognizer.addTouch(touchPointer);

    // Emit touch event
    EventBus.emit('touch:pointer-down', {
      pointerId: pointer.id,
      position: { x: pointer.x, y: pointer.y },
      zone: touchedZone?.name
    });
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    const touchPointer = this.activePointers.get(pointer.id);
    if (!touchPointer) return;

    touchPointer.currentPosition = { x: pointer.x, y: pointer.y };
    
    // Update gesture recognition
    this.gestureRecognizer.updateTouch(touchPointer);

    // Check for drag operations
    const dragDistance = Phaser.Math.Distance.Between(
      touchPointer.startPosition.x,
      touchPointer.startPosition.y,
      pointer.x,
      pointer.y
    );

    if (dragDistance > 10) { // 10px drag threshold
      EventBus.emit('touch:drag', {
        pointerId: pointer.id,
        startPosition: touchPointer.startPosition,
        currentPosition: { x: pointer.x, y: pointer.y },
        dragDistance
      });
    }
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer) {
    const touchPointer = this.activePointers.get(pointer.id);
    if (!touchPointer) return;

    touchPointer.isActive = false;
    touchPointer.endTime = pointer.time;

    // Detect tap vs long press
    const duration = touchPointer.endTime - touchPointer.startTime;
    const distance = Phaser.Math.Distance.Between(
      touchPointer.startPosition.x,
      touchPointer.startPosition.y,
      pointer.x,
      pointer.y
    );

    if (distance < 10 && duration < 500) {
      // Short tap
      EventBus.emit('touch:tap', {
        pointerId: pointer.id,
        position: { x: pointer.x, y: pointer.y },
        duration
      });
    } else if (distance < 10 && duration >= 500) {
      // Long press
      EventBus.emit('touch:long-press', {
        pointerId: pointer.id,
        position: { x: pointer.x, y: pointer.y },
        duration
      });
    }

    // Check touch zones for release
    const touchedZone = this.getTouchedZone(pointer.x, pointer.y);
    if (touchedZone) {
      this.handleZoneTouch(touchedZone, touchPointer, 'up');
    }

    // Finalize gesture recognition
    this.gestureRecognizer.removeTouch(touchPointer);

    // Clean up
    this.activePointers.delete(pointer.id);
  }

  // Touch zone management
  addTouchZone(zone: TouchZone) {
    this.touchZones.push(zone);
  }

  removeTouchZone(zoneName: string) {
    this.touchZones = this.touchZones.filter(zone => zone.name !== zoneName);
  }

  private getTouchedZone(x: number, y: number): TouchZone | null {
    return this.touchZones.find(zone => 
      this.isPointInZone(x, y, zone)
    ) || null;
  }

  private isPointInZone(x: number, y: number, zone: TouchZone): boolean {
    switch (zone.shape) {
      case 'rectangle':
        return x >= zone.bounds.x && 
               x <= zone.bounds.x + zone.bounds.width &&
               y >= zone.bounds.y && 
               y <= zone.bounds.y + zone.bounds.height;
      
      case 'circle':
        const distance = Phaser.Math.Distance.Between(
          x, y, 
          zone.bounds.x + zone.bounds.radius, 
          zone.bounds.y + zone.bounds.radius
        );
        return distance <= zone.bounds.radius;
      
      default:
        return false;
    }
  }

  private handleZoneTouch(zone: TouchZone, pointer: TouchPointer, action: 'down' | 'up') {
    if (zone.callback) {
      zone.callback(action, pointer, zone);
    }

    EventBus.emit('touch:zone-interaction', {
      zoneName: zone.name,
      action,
      pointerId: pointer.id,
      position: pointer.currentPosition
    });
  }

  // Public API
  getActivePointers(): TouchPointer[] {
    return Array.from(this.activePointers.values());
  }

  getPointerCount(): number {
    return this.activePointers.size;
  }
}

// Gesture recognition system
class GestureRecognizer {
  private touches: TouchPointer[] = [];
  private lastGestureTime: number = 0;

  addTouch(touch: TouchPointer) {
    this.touches.push(touch);
    this.recognizeGestures();
  }

  updateTouch(touch: TouchPointer) {
    this.recognizeGestures();
  }

  removeTouch(touch: TouchPointer) {
    this.touches = this.touches.filter(t => t.id !== touch.id);
    this.recognizeGestures();
  }

  private recognizeGestures() {
    const activeTouches = this.touches.filter(t => t.isActive);
    
    if (activeTouches.length === 2) {
      this.recognizeTwoFingerGestures(activeTouches);
    } else if (activeTouches.length === 3) {
      this.recognizeThreeFingerGestures(activeTouches);
    }
  }

  private recognizeTwoFingerGestures(touches: TouchPointer[]) {
    const [touch1, touch2] = touches;
    
    // Calculate current distance
    const currentDistance = Phaser.Math.Distance.Between(
      touch1.currentPosition.x, touch1.currentPosition.y,
      touch2.currentPosition.x, touch2.currentPosition.y
    );
    
    // Calculate initial distance
    const initialDistance = Phaser.Math.Distance.Between(
      touch1.startPosition.x, touch1.startPosition.y,
      touch2.startPosition.x, touch2.startPosition.y
    );
    
    // Detect pinch/zoom gesture
    const scaleChange = currentDistance / initialDistance;
    if (Math.abs(scaleChange - 1) > 0.1) { // 10% change threshold
      EventBus.emit('touch:pinch', {
        scale: scaleChange,
        center: {
          x: (touch1.currentPosition.x + touch2.currentPosition.x) / 2,
          y: (touch1.currentPosition.y + touch2.currentPosition.y) / 2
        }
      });
    }
    
    // Detect rotation gesture
    const currentAngle = Phaser.Math.Angle.Between(
      touch1.currentPosition.x, touch1.currentPosition.y,
      touch2.currentPosition.x, touch2.currentPosition.y
    );
    
    const initialAngle = Phaser.Math.Angle.Between(
      touch1.startPosition.x, touch1.startPosition.y,
      touch2.startPosition.x, touch2.startPosition.y
    );
    
    const rotation = currentAngle - initialAngle;
    if (Math.abs(rotation) > 0.1) { // ~6 degree threshold
      EventBus.emit('touch:rotate', {
        rotation,
        center: {
          x: (touch1.currentPosition.x + touch2.currentPosition.x) / 2,
          y: (touch1.currentPosition.y + touch2.currentPosition.y) / 2
        }
      });
    }
  }

  private recognizeThreeFingerGestures(touches: TouchPointer[]) {
    // Three finger swipe detection
    const avgDeltaX = touches.reduce((sum, touch) => 
      sum + (touch.currentPosition.x - touch.startPosition.x), 0) / touches.length;
    
    const avgDeltaY = touches.reduce((sum, touch) => 
      sum + (touch.currentPosition.y - touch.startPosition.y), 0) / touches.length;
    
    const swipeDistance = Math.sqrt(avgDeltaX * avgDeltaX + avgDeltaY * avgDeltaY);
    
    if (swipeDistance > 50) { // 50px threshold
      const swipeDirection = Math.atan2(avgDeltaY, avgDeltaX);
      
      EventBus.emit('touch:three-finger-swipe', {
        direction: swipeDirection,
        distance: swipeDistance,
        deltaX: avgDeltaX,
        deltaY: avgDeltaY
      });
    }
  }
}

interface TouchPointer {
  id: number;
  startPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
  startTime: number;
  endTime?: number;
  isActive: boolean;
}

interface TouchZone {
  name: string;
  shape: 'rectangle' | 'circle';
  bounds: {
    x: number;
    y: number;
    width?: number;
    height?: number;
    radius?: number;
  };
  callback?: (action: 'down' | 'up', pointer: TouchPointer, zone: TouchZone) => void;
}
```

## Virtual Joystick System

### Virtual Joystick Implementation

```typescript
// components/mobile/VirtualJoystick.tsx
export class VirtualJoystick extends React.Component<VirtualJoystickProps, VirtualJoystickState> {
  private containerRef = React.createRef<HTMLDivElement>();
  private knobRef = React.createRef<HTMLDivElement>();
  private isDragging = false;
  private centerX = 0;
  private centerY = 0;
  private maxDistance = 50;

  constructor(props: VirtualJoystickProps) {
    super(props);
    this.state = {
      knobPosition: { x: 0, y: 0 },
      isActive: false,
      value: { x: 0, y: 0 }
    };
  }

  componentDidMount() {
    this.setupEventListeners();
    this.calculateCenter();
  }

  componentWillUnmount() {
    this.removeEventListeners();
  }

  private setupEventListeners() {
    const container = this.containerRef.current;
    if (!container) return;

    // Touch events
    container.addEventListener('touchstart', this.handleStart, { passive: false });
    container.addEventListener('touchmove', this.handleMove, { passive: false });
    container.addEventListener('touchend', this.handleEnd, { passive: false });
    
    // Mouse events for testing
    container.addEventListener('mousedown', this.handleStart);
    document.addEventListener('mousemove', this.handleMove);
    document.addEventListener('mouseup', this.handleEnd);
    
    // Resize handling
    window.addEventListener('resize', this.calculateCenter);
  }

  private removeEventListeners() {
    const container = this.containerRef.current;
    if (!container) return;

    container.removeEventListener('touchstart', this.handleStart);
    container.removeEventListener('touchmove', this.handleMove);
    container.removeEventListener('touchend', this.handleEnd);
    container.removeEventListener('mousedown', this.handleStart);
    document.removeEventListener('mousemove', this.handleMove);
    document.removeEventListener('mouseup', this.handleEnd);
    window.removeEventListener('resize', this.calculateCenter);
  }

  private calculateCenter = () => {
    const container = this.containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    this.centerX = rect.width / 2;
    this.centerY = rect.height / 2;
    this.maxDistance = Math.min(rect.width, rect.height) / 2 - 20; // 20px padding
  };

  private handleStart = (event: TouchEvent | MouseEvent) => {
    event.preventDefault();
    this.isDragging = true;
    
    this.setState({ isActive: true });
    
    const pointer = this.getPointerPosition(event);
    this.updateKnobPosition(pointer.x, pointer.y);
  };

  private handleMove = (event: TouchEvent | MouseEvent) => {
    if (!this.isDragging) return;
    
    event.preventDefault();
    
    const pointer = this.getPointerPosition(event);
    this.updateKnobPosition(pointer.x, pointer.y);
  };

  private handleEnd = (event: TouchEvent | MouseEvent) => {
    if (!this.isDragging) return;
    
    event.preventDefault();
    this.isDragging = false;
    
    // Return knob to center with animation
    this.setState({
      isActive: false,
      knobPosition: { x: 0, y: 0 },
      value: { x: 0, y: 0 }
    });
    
    // Notify parent of stop
    this.props.onValueChange?.({ x: 0, y: 0 });
  };

  private getPointerPosition(event: TouchEvent | MouseEvent): { x: number; y: number } {
    const container = this.containerRef.current;
    if (!container) return { x: 0, y: 0 };

    const rect = container.getBoundingClientRect();
    
    let clientX: number, clientY: number;
    
    if (event instanceof TouchEvent) {
      const touch = event.touches[0] || event.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    
    return {
      x: clientX - rect.left - this.centerX,
      y: clientY - rect.top - this.centerY
    };
  }

  private updateKnobPosition(x: number, y: number) {
    // Calculate distance from center
    const distance = Math.sqrt(x * x + y * y);
    
    // Clamp to max distance
    if (distance > this.maxDistance) {
      const angle = Math.atan2(y, x);
      x = Math.cos(angle) * this.maxDistance;
      y = Math.sin(angle) * this.maxDistance;
    }
    
    // Update state
    const normalizedValue = {
      x: x / this.maxDistance,
      y: y / this.maxDistance
    };
    
    this.setState({
      knobPosition: { x, y },
      value: normalizedValue
    });
    
    // Notify parent
    this.props.onValueChange?.(normalizedValue);
  }

  render() {
    const { size = 120, theme = 'default' } = this.props;
    const { knobPosition, isActive } = this.state;
    
    const containerStyle: React.CSSProperties = {
      width: size,
      height: size,
      position: 'relative',
      background: `radial-gradient(circle, 
        rgba(255, 255, 255, 0.1) 0%, 
        rgba(255, 255, 255, 0.05) 100%)`,
      border: '2px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '50%',
      touchAction: 'none',
      userSelect: 'none'
    };
    
    const knobStyle: React.CSSProperties = {
      width: size * 0.4,
      height: size * 0.4,
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: `translate(-50%, -50%) translate(${knobPosition.x}px, ${knobPosition.y}px)`,
      background: isActive 
        ? 'radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%)'
        : 'radial-gradient(circle, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.3) 100%)',
      border: '2px solid rgba(255, 255, 255, 0.4)',
      borderRadius: '50%',
      transition: isActive ? 'none' : 'transform 0.2s ease-out',
      pointerEvents: 'none'
    };
    
    return (
      <div 
        ref={this.containerRef}
        className={`virtual-joystick ${theme} ${isActive ? 'active' : ''}`}
        style={containerStyle}
      >
        <div 
          ref={this.knobRef}
          className="virtual-joystick-knob"
          style={knobStyle}
        />
      </div>
    );
  }
}

interface VirtualJoystickProps {
  size?: number;
  theme?: 'default' | 'minimal' | 'game';
  onValueChange?: (value: { x: number; y: number }) => void;
}

interface VirtualJoystickState {
  knobPosition: { x: number; y: number };
  isActive: boolean;
  value: { x: number; y: number };
}
```

### Virtual Button Components

```typescript
// components/mobile/VirtualButton.tsx
export const VirtualButton: React.FC<VirtualButtonProps> = ({
  icon,
  size = 60,
  position,
  onPress,
  onRelease,
  children,
  className = '',
  hapticFeedback = true
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handlePress = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    event.preventDefault();
    setIsPressed(true);
    
    // Haptic feedback
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    onPress?.();
  }, [onPress, hapticFeedback]);

  const handleRelease = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    event.preventDefault();
    setIsPressed(false);
    onRelease?.();
  }, [onRelease]);

  const buttonStyle: React.CSSProperties = {
    width: size,
    height: size,
    position: 'absolute',
    ...position,
    background: isPressed 
      ? 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.2) 100%)'
      : 'radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%)',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    touchAction: 'none',
    userSelect: 'none',
    transition: 'all 0.1s ease',
    transform: isPressed ? 'scale(0.95)' : 'scale(1)',
    fontSize: size * 0.4,
    color: 'rgba(255, 255, 255, 0.8)'
  };

  return (
    <button
      ref={buttonRef}
      className={`virtual-button ${className} ${isPressed ? 'pressed' : ''}`}
      style={buttonStyle}
      onTouchStart={handlePress}
      onTouchEnd={handleRelease}
      onMouseDown={handlePress}
      onMouseUp={handleRelease}
      onMouseLeave={handleRelease}
    >
      {icon && <span className="button-icon">{icon}</span>}
      {children}
    </button>
  );
};

interface VirtualButtonProps {
  icon?: string;
  size?: number;
  position: { top?: number; bottom?: number; left?: number; right?: number };
  onPress?: () => void;
  onRelease?: () => void;
  children?: React.ReactNode;
  className?: string;
  hapticFeedback?: boolean;
}

// Mobile Control Overlay Component
export const MobileControlOverlay: React.FC<MobileControlOverlayProps> = ({
  showJoystick = true,
  showActionButtons = true,
  onMovementChange,
  onActionPress
}) => {
  const { isMobile, currentBreakpoint } = useResponsive();
  
  if (!isMobile) return null;

  const controlsStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 1000
  };

  const joystickContainerStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 20,
    left: 20,
    pointerEvents: 'auto'
  };

  const actionButtonsStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 20,
    right: 20,
    pointerEvents: 'auto',
    display: 'flex',
    gap: '15px'
  };

  return (
    <div className="mobile-control-overlay" style={controlsStyle}>
      {showJoystick && (
        <div style={joystickContainerStyle}>
          <VirtualJoystick
            size={currentBreakpoint === 'mobile-portrait' ? 100 : 120}
            onValueChange={onMovementChange}
          />
        </div>
      )}
      
      {showActionButtons && (
        <div style={actionButtonsStyle}>
          <VirtualButton
            icon="⚔️"
            position={{ bottom: 60, right: 0 }}
            onPress={() => onActionPress?.('attack')}
          />
          <VirtualButton
            icon="🛡️"
            position={{ bottom: 0, right: 60 }}
            onPress={() => onActionPress?.('defend')}
          />
          <VirtualButton
            icon="✨"
            position={{ bottom: 0, right: 0 }}
            onPress={() => onActionPress?.('special')}
          />
        </div>
      )}
    </div>
  );
};

interface MobileControlOverlayProps {
  showJoystick?: boolean;
  showActionButtons?: boolean;
  onMovementChange?: (value: { x: number; y: number }) => void;
  onActionPress?: (action: string) => void;
}
```

## Mobile Performance Optimization

### Performance Monitor and Optimizer

```typescript
// lib/mobile/PerformanceOptimizer.ts
export class MobilePerformanceOptimizer {
  private game: Phaser.Game;
  private performanceMonitor: PerformanceMonitor;
  private qualitySettings: QualitySettings;
  private batteryMonitor: BatteryMonitor;

  constructor(game: Phaser.Game) {
    this.game = game;
    this.performanceMonitor = new PerformanceMonitor();
    this.batteryMonitor = new BatteryMonitor();
    this.qualitySettings = this.getInitialQualitySettings();
    
    this.setupPerformanceMonitoring();
  }

  private getInitialQualitySettings(): QualitySettings {
    const deviceInfo = this.detectDeviceCapabilities();
    
    if (deviceInfo.tier === 'low') {
      return {
        renderScale: 0.75,
        particleCount: 50,
        shadowQuality: 0,
        antiAliasing: false,
        textureQuality: 'low',
        audioQuality: 'compressed',
        maxSprites: 100,
        cullDistance: 500
      };
    } else if (deviceInfo.tier === 'medium') {
      return {
        renderScale: 1.0,
        particleCount: 100,
        shadowQuality: 1,
        antiAliasing: false,
        textureQuality: 'medium',
        audioQuality: 'standard',
        maxSprites: 200,
        cullDistance: 750
      };
    } else {
      return {
        renderScale: 1.0,
        particleCount: 200,
        shadowQuality: 2,
        antiAliasing: true,
        textureQuality: 'high',
        audioQuality: 'high',
        maxSprites: 300,
        cullDistance: 1000
      };
    }
  }

  private detectDeviceCapabilities(): DeviceInfo {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    const deviceInfo: DeviceInfo = {
      tier: 'medium',
      gpu: 'unknown',
      memory: this.getDeviceMemory(),
      cores: navigator.hardwareConcurrency || 4,
      pixelRatio: window.devicePixelRatio || 1,
      maxTextureSize: 2048,
      supportsWebGL2: false
    };

    if (gl) {
      deviceInfo.gpu = this.getGPUInfo(gl);
      deviceInfo.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      deviceInfo.supportsWebGL2 = !!document.createElement('canvas').getContext('webgl2');
    }

    // Determine performance tier
    if (deviceInfo.memory < 2 || deviceInfo.cores < 4) {
      deviceInfo.tier = 'low';
    } else if (deviceInfo.memory >= 4 && deviceInfo.cores >= 6) {
      deviceInfo.tier = 'high';
    }

    return deviceInfo;
  }

  private getDeviceMemory(): number {
    // Navigator.deviceMemory is experimental
    return (navigator as any).deviceMemory || 4; // Default to 4GB
  }

  private getGPUInfo(gl: WebGLRenderingContext): string {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown';
    }
    return 'unknown';
  }

  private setupPerformanceMonitoring() {
    // Monitor FPS and adjust quality dynamically
    setInterval(() => {
      const fps = this.game.loop.actualFps;
      const batteryLevel = this.batteryMonitor.getBatteryLevel();
      
      this.adjustQualityBasedOnPerformance(fps, batteryLevel);
    }, 5000); // Check every 5 seconds

    // Monitor thermal throttling
    this.setupThermalMonitoring();
  }

  private adjustQualityBasedOnPerformance(fps: number, batteryLevel: number) {
    const targetFPS = 60;
    const minFPS = 30;
    
    if (fps < minFPS) {
      // Aggressive quality reduction
      this.reduceQuality(0.8);
    } else if (fps < targetFPS * 0.8) {
      // Moderate quality reduction
      this.reduceQuality(0.9);
    } else if (fps > targetFPS * 0.95 && batteryLevel > 0.5) {
      // Increase quality if performance allows
      this.increaseQuality(1.1);
    }

    // Battery-based adjustments
    if (batteryLevel < 0.2) {
      // Aggressive power saving
      this.enablePowerSaveMode();
    } else if (batteryLevel < 0.5) {
      // Moderate power saving
      this.enableBatteryOptimization();
    }
  }

  private reduceQuality(factor: number) {
    this.qualitySettings.renderScale = Math.max(0.5, this.qualitySettings.renderScale * factor);
    this.qualitySettings.particleCount = Math.max(25, Math.floor(this.qualitySettings.particleCount * factor));
    this.qualitySettings.maxSprites = Math.max(50, Math.floor(this.qualitySettings.maxSprites * factor));
    
    this.applyQualitySettings();
    
    console.log('Reduced quality settings', this.qualitySettings);
  }

  private increaseQuality(factor: number) {
    const maxSettings = this.getMaxQualitySettings();
    
    this.qualitySettings.renderScale = Math.min(maxSettings.renderScale, this.qualitySettings.renderScale * factor);
    this.qualitySettings.particleCount = Math.min(maxSettings.particleCount, Math.floor(this.qualitySettings.particleCount * factor));
    this.qualitySettings.maxSprites = Math.min(maxSettings.maxSprites, Math.floor(this.qualitySettings.maxSprites * factor));
    
    this.applyQualitySettings();
    
    console.log('Increased quality settings', this.qualitySettings);
  }

  private applyQualitySettings() {
    // Apply render scale
    this.game.scale.setZoom(this.qualitySettings.renderScale);
    
    // Emit settings change event for other systems
    EventBus.emit('performance:quality-changed', this.qualitySettings);
  }

  private enablePowerSaveMode() {
    // Reduce frame rate
    this.game.loop.targetFps = 30;
    
    // Minimize effects
    this.qualitySettings.particleCount = 10;
    this.qualitySettings.shadowQuality = 0;
    this.qualitySettings.antiAliasing = false;
    
    this.applyQualitySettings();
    
    EventBus.emit('performance:power-save-enabled', {});
  }

  private enableBatteryOptimization() {
    // Moderate optimizations
    this.qualitySettings.particleCount = Math.min(50, this.qualitySettings.particleCount);
    this.qualitySettings.shadowQuality = Math.min(1, this.qualitySettings.shadowQuality);
    
    this.applyQualitySettings();
    
    EventBus.emit('performance:battery-optimization-enabled', {});
  }

  private setupThermalMonitoring() {
    // Monitor for thermal throttling indicators
    const monitor = () => {
      const fps = this.game.loop.actualFps;
      
      // If FPS drops significantly and stays low, assume thermal throttling
      if (fps < 20) {
        this.performanceMonitor.recordThermalEvent();
        
        if (this.performanceMonitor.getThermalEventCount() > 3) {
          this.enableThermalProtection();
        }
      }
    };

    setInterval(monitor, 10000); // Check every 10 seconds
  }

  private enableThermalProtection() {
    // Aggressive reduction to prevent overheating
    this.qualitySettings.renderScale = 0.6;
    this.qualitySettings.particleCount = 10;
    this.qualitySettings.shadowQuality = 0;
    this.qualitySettings.antiAliasing = false;
    
    // Reduce frame rate
    this.game.loop.targetFps = 30;
    
    this.applyQualitySettings();
    
    console.warn('Thermal protection enabled');
    EventBus.emit('performance:thermal-protection-enabled', {});
  }

  private getMaxQualitySettings(): QualitySettings {
    return {
      renderScale: 1.0,
      particleCount: 200,
      shadowQuality: 2,
      antiAliasing: true,
      textureQuality: 'high',
      audioQuality: 'high',
      maxSprites: 300,
      cullDistance: 1000
    };
  }

  // Public API
  getCurrentQualitySettings(): QualitySettings {
    return { ...this.qualitySettings };
  }

  setQualityPreset(preset: 'low' | 'medium' | 'high' | 'auto') {
    if (preset === 'auto') {
      this.qualitySettings = this.getInitialQualitySettings();
    } else {
      this.qualitySettings = this.getPresetSettings(preset);
    }
    
    this.applyQualitySettings();
  }

  private getPresetSettings(preset: 'low' | 'medium' | 'high'): QualitySettings {
    const presets = {
      low: {
        renderScale: 0.75,
        particleCount: 25,
        shadowQuality: 0,
        antiAliasing: false,
        textureQuality: 'low' as const,
        audioQuality: 'compressed' as const,
        maxSprites: 50,
        cullDistance: 400
      },
      medium: {
        renderScale: 1.0,
        particleCount: 100,
        shadowQuality: 1,
        antiAliasing: false,
        textureQuality: 'medium' as const,
        audioQuality: 'standard' as const,
        maxSprites: 150,
        cullDistance: 600
      },
      high: {
        renderScale: 1.0,
        particleCount: 200,
        shadowQuality: 2,
        antiAliasing: true,
        textureQuality: 'high' as const,
        audioQuality: 'high' as const,
        maxSprites: 300,
        cullDistance: 1000
      }
    };
    
    return presets[preset];
  }
}

class PerformanceMonitor {
  private fpsHistory: number[] = [];
  private thermalEvents: number = 0;
  private lastThermalEvent: number = 0;

  recordFPS(fps: number) {
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > 60) { // Keep last 60 readings
      this.fpsHistory.shift();
    }
  }

  getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 60;
    return this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
  }

  recordThermalEvent() {
    const now = Date.now();
    if (now - this.lastThermalEvent > 60000) { // Only count if more than 1 minute apart
      this.thermalEvents++;
      this.lastThermalEvent = now;
    }
  }

  getThermalEventCount(): number {
    return this.thermalEvents;
  }
}

class BatteryMonitor {
  private batteryLevel: number = 1.0;
  private isCharging: boolean = false;

  constructor() {
    this.setupBatteryMonitoring();
  }

  private async setupBatteryMonitoring() {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        this.batteryLevel = battery.level;
        this.isCharging = battery.charging;

        battery.addEventListener('levelchange', () => {
          this.batteryLevel = battery.level;
        });

        battery.addEventListener('chargingchange', () => {
          this.isCharging = battery.charging;
        });
      } catch (error) {
        console.warn('Battery API not available');
      }
    }
  }

  getBatteryLevel(): number {
    return this.batteryLevel;
  }

  isDeviceCharging(): boolean {
    return this.isCharging;
  }
}

interface QualitySettings {
  renderScale: number;
  particleCount: number;
  shadowQuality: number;
  antiAliasing: boolean;
  textureQuality: 'low' | 'medium' | 'high';
  audioQuality: 'compressed' | 'standard' | 'high';
  maxSprites: number;
  cullDistance: number;
}

interface DeviceInfo {
  tier: 'low' | 'medium' | 'high';
  gpu: string;
  memory: number;
  cores: number;
  pixelRatio: number;
  maxTextureSize: number;
  supportsWebGL2: boolean;
}
```

## Battery Life Optimization

### Battery Management System

```typescript
// lib/mobile/BatteryManager.ts
export class BatteryManager {
  private batteryLevel: number = 1.0;
  private isCharging: boolean = false;
  private powerSaveMode: boolean = false;
  private optimizationLevel: OptimizationLevel = 'none';

  constructor() {
    this.initializeBatteryAPI();
    this.setupPowerManagement();
  }

  private async initializeBatteryAPI() {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        this.updateBatteryStatus(battery);
        this.setupBatteryEventListeners(battery);
      } catch (error) {
        console.warn('Battery API not supported');
        this.simulateBatteryStatus();
      }
    } else {
      this.simulateBatteryStatus();
    }
  }

  private updateBatteryStatus(battery: any) {
    this.batteryLevel = battery.level;
    this.isCharging = battery.charging;
    this.evaluatePowerSaveMode();
  }

  private setupBatteryEventListeners(battery: any) {
    battery.addEventListener('levelchange', () => {
      this.batteryLevel = battery.level;
      this.evaluatePowerSaveMode();
      this.emitBatteryUpdate();
    });

    battery.addEventListener('chargingchange', () => {
      this.isCharging = battery.charging;
      this.evaluatePowerSaveMode();
      this.emitBatteryUpdate();
    });
  }

  private simulateBatteryStatus() {
    // Fallback for browsers without Battery API
    this.batteryLevel = 0.8; // Assume 80% battery
    this.isCharging = false;
  }

  private setupPowerManagement() {
    // Check visibility API for background optimization
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.enableBackgroundOptimization();
      } else {
        this.disableBackgroundOptimization();
      }
    });

    // Monitor page focus
    window.addEventListener('focus', () => {
      this.resumeFullPerformance();
    });

    window.addEventListener('blur', () => {
      this.enableFocusOptimization();
    });
  }

  private evaluatePowerSaveMode() {
    if (this.isCharging) {
      this.optimizationLevel = 'none';
      this.powerSaveMode = false;
    } else if (this.batteryLevel < 0.1) {
      this.optimizationLevel = 'extreme';
      this.powerSaveMode = true;
    } else if (this.batteryLevel < 0.2) {
      this.optimizationLevel = 'aggressive';
      this.powerSaveMode = true;
    } else if (this.batteryLevel < 0.5) {
      this.optimizationLevel = 'moderate';
      this.powerSaveMode = false;
    } else {
      this.optimizationLevel = 'none';
      this.powerSaveMode = false;
    }

    this.applyPowerOptimization();
  }

  private applyPowerOptimization() {
    const optimizations = this.getOptimizationSettings();
    
    EventBus.emit('battery:optimization-changed', {
      level: this.optimizationLevel,
      settings: optimizations,
      batteryLevel: this.batteryLevel,
      isCharging: this.isCharging
    });
  }

  private getOptimizationSettings(): PowerOptimizationSettings {
    switch (this.optimizationLevel) {
      case 'extreme':
        return {
          targetFPS: 15,
          renderScale: 0.5,
          disableParticles: true,
          disableShadows: true,
          disableAudio: true,
          reducedAnimations: true,
          limitNetworkRequests: true,
          pauseNonEssentialUpdates: true
        };
      
      case 'aggressive':
        return {
          targetFPS: 30,
          renderScale: 0.6,
          disableParticles: true,
          disableShadows: true,
          disableAudio: false,
          reducedAnimations: true,
          limitNetworkRequests: true,
          pauseNonEssentialUpdates: true
        };
      
      case 'moderate':
        return {
          targetFPS: 45,
          renderScale: 0.8,
          disableParticles: false,
          disableShadows: true,
          disableAudio: false,
          reducedAnimations: false,
          limitNetworkRequests: false,
          pauseNonEssentialUpdates: false
        };
      
      default:
        return {
          targetFPS: 60,
          renderScale: 1.0,
          disableParticles: false,
          disableShadows: false,
          disableAudio: false,
          reducedAnimations: false,
          limitNetworkRequests: false,
          pauseNonEssentialUpdates: false
        };
    }
  }

  private enableBackgroundOptimization() {
    // Reduce frame rate when in background
    EventBus.emit('battery:background-mode', {
      targetFPS: 5,
      pauseAudio: true,
      pauseAnimations: true
    });
  }

  private disableBackgroundOptimization() {
    EventBus.emit('battery:foreground-mode', {});
  }

  private enableFocusOptimization() {
    // Slight optimization when window loses focus
    EventBus.emit('battery:focus-lost', {
      targetFPS: 30,
      reduceQuality: true
    });
  }

  private resumeFullPerformance() {
    EventBus.emit('battery:focus-gained', {});
  }

  private emitBatteryUpdate() {
    EventBus.emit('battery:status-changed', {
      level: this.batteryLevel,
      isCharging: this.isCharging,
      powerSaveMode: this.powerSaveMode,
      optimizationLevel: this.optimizationLevel
    });
  }

  // Public API
  getBatteryLevel(): number {
    return this.batteryLevel;
  }

  isDeviceCharging(): boolean {
    return this.isCharging;
  }

  isPowerSaveModeEnabled(): boolean {
    return this.powerSaveMode;
  }

  getOptimizationLevel(): OptimizationLevel {
    return this.optimizationLevel;
  }

  // Manual override for testing
  setManualOptimizationLevel(level: OptimizationLevel) {
    this.optimizationLevel = level;
    this.applyPowerOptimization();
  }

  // Get estimated play time remaining
  getEstimatedPlayTime(): number {
    if (this.isCharging) return Infinity;
    
    // Rough estimation based on battery level and optimization
    const baseHours = this.batteryLevel * 4; // 4 hours on full battery
    
    const optimizationMultiplier = {
      'none': 1.0,
      'moderate': 1.3,
      'aggressive': 1.8,
      'extreme': 2.5
    };
    
    return baseHours * optimizationMultiplier[this.optimizationLevel];
  }
}

type OptimizationLevel = 'none' | 'moderate' | 'aggressive' | 'extreme';

interface PowerOptimizationSettings {
  targetFPS: number;
  renderScale: number;
  disableParticles: boolean;
  disableShadows: boolean;
  disableAudio: boolean;
  reducedAnimations: boolean;
  limitNetworkRequests: boolean;
  pauseNonEssentialUpdates: boolean;
}
```

## Platform-Specific Considerations

### iOS and Android Adaptations

```typescript
// lib/mobile/PlatformAdapter.ts
export class PlatformAdapter {
  private platform: Platform;
  private osVersion: string;
  private browserEngine: BrowserEngine;

  constructor() {
    this.platform = this.detectPlatform();
    this.osVersion = this.detectOSVersion();
    this.browserEngine = this.detectBrowserEngine();
    this.applyPlatformOptimizations();
  }

  private detectPlatform(): Platform {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/iphone|ipad|ipod/.test(userAgent)) {
      return 'ios';
    } else if (/android/.test(userAgent)) {
      return 'android';
    } else if (/windows phone/.test(userAgent)) {
      return 'windows-phone';
    } else {
      return 'desktop';
    }
  }

  private detectOSVersion(): string {
    const userAgent = navigator.userAgent;
    
    if (this.platform === 'ios') {
      const match = userAgent.match(/OS (\d+_\d+)/);
      return match ? match[1].replace('_', '.') : 'unknown';
    } else if (this.platform === 'android') {
      const match = userAgent.match(/Android (\d+\.?\d*)/);
      return match ? match[1] : 'unknown';
    }
    
    return 'unknown';
  }

  private detectBrowserEngine(): BrowserEngine {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/chrome/.test(userAgent) && !/edge/.test(userAgent)) {
      return 'blink';
    } else if (/firefox/.test(userAgent)) {
      return 'gecko';
    } else if (/safari/.test(userAgent) && !/chrome/.test(userAgent)) {
      return 'webkit';
    } else if (/edge/.test(userAgent)) {
      return 'edgehtml';
    }
    
    return 'unknown';
  }

  private applyPlatformOptimizations() {
    switch (this.platform) {
      case 'ios':
        this.applyIOSOptimizations();
        break;
      case 'android':
        this.applyAndroidOptimizations();
        break;
    }
    
    this.applyBrowserEngineOptimizations();
  }

  private applyIOSOptimizations() {
    // iOS-specific optimizations
    
    // Disable elastic scrolling
    document.body.style.overscrollBehavior = 'none';
    
    // Handle notch and safe areas
    this.setupSafeAreaHandling();
    
    // iOS has strict memory limits
    EventBus.emit('platform:ios-optimizations', {
      strictMemoryManagement: true,
      disableComplexShaders: parseFloat(this.osVersion) < 12,
      limitTextureSizes: true,
      preferWebGL1: parseFloat(this.osVersion) < 11
    });
    
    // Handle iOS audio limitations
    this.setupIOSAudioHandling();
    
    // Optimize for different iOS devices
    this.optimizeForIOSDevice();
  }

  private applyAndroidOptimizations() {
    // Android-specific optimizations
    
    // Handle fragmentation
    const androidVersion = parseFloat(this.osVersion);
    
    EventBus.emit('platform:android-optimizations', {
      enableWebGL2: androidVersion >= 7,
      useTextureCompression: true,
      limitConcurrentAudio: androidVersion < 8,
      enableProximityWakelock: true
    });
    
    // Handle Android keyboard
    this.setupAndroidKeyboardHandling();
    
    // Optimize for low-end Android devices
    if (this.isLowEndAndroid()) {
      this.applyLowEndAndroidOptimizations();
    }
  }

  private setupSafeAreaHandling() {
    // Handle iPhone X+ notch and safe areas
    const safeAreaInsets = {
      top: this.getCSSEnvValue('safe-area-inset-top'),
      bottom: this.getCSSEnvValue('safe-area-inset-bottom'),
      left: this.getCSSEnvValue('safe-area-inset-left'),
      right: this.getCSSEnvValue('safe-area-inset-right')
    };
    
    if (safeAreaInsets.top > 0 || safeAreaInsets.bottom > 0) {
      EventBus.emit('ui:safe-area-detected', safeAreaInsets);
    }
  }

  private getCSSEnvValue(variable: string): number {
    const testElement = document.createElement('div');
    testElement.style.position = 'fixed';
    testElement.style.top = `env(${variable})`;
    document.body.appendChild(testElement);
    
    const value = parseInt(getComputedStyle(testElement).top) || 0;
    document.body.removeChild(testElement);
    
    return value;
  }

  private setupIOSAudioHandling() {
    // iOS requires user gesture to enable audio
    let audioUnlocked = false;
    
    const unlockAudio = () => {
      if (audioUnlocked) return;
      
      // Create and play a silent audio file
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const buffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
      
      audioUnlocked = true;
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('touchend', unlockAudio);
      
      EventBus.emit('platform:audio-unlocked', {});
    };
    
    document.addEventListener('touchstart', unlockAudio);
    document.addEventListener('touchend', unlockAudio);
  }

  private optimizeForIOSDevice() {
    const deviceInfo = this.getIOSDeviceInfo();
    
    EventBus.emit('platform:ios-device-detected', {
      device: deviceInfo.device,
      performance: deviceInfo.performance,
      recommendedSettings: deviceInfo.settings
    });
  }

  private getIOSDeviceInfo(): IOSDeviceInfo {
    const screen = window.screen;
    const pixelRatio = window.devicePixelRatio;
    
    // Detect device based on screen dimensions and pixel ratio
    if (screen.width === 375 && screen.height === 812 && pixelRatio === 3) {
      return {
        device: 'iPhone X/XS',
        performance: 'high',
        settings: { renderScale: 1.0, targetFPS: 60 }
      };
    } else if (screen.width === 414 && screen.height === 896) {
      return {
        device: 'iPhone XR/11',
        performance: 'high',
        settings: { renderScale: 0.9, targetFPS: 60 }
      };
    } else if (screen.width === 320) {
      return {
        device: 'iPhone SE/5s',
        performance: 'low',
        settings: { renderScale: 0.75, targetFPS: 30 }
      };
    }
    
    return {
      device: 'Unknown iOS',
      performance: 'medium',
      settings: { renderScale: 0.8, targetFPS: 45 }
    };
  }

  private setupAndroidKeyboardHandling() {
    // Handle Android soft keyboard
    let initialViewportHeight = window.innerHeight;
    
    window.addEventListener('resize', () => {
      const currentHeight = window.innerHeight;
      const heightDifference = initialViewportHeight - currentHeight;
      
      if (heightDifference > 150) {
        // Keyboard is likely open
        EventBus.emit('platform:keyboard-opened', { heightDifference });
      } else {
        // Keyboard is likely closed
        EventBus.emit('platform:keyboard-closed', {});
      }
    });
  }

  private isLowEndAndroid(): boolean {
    // Detect low-end Android devices
    const memory = (navigator as any).deviceMemory;
    const cores = navigator.hardwareConcurrency;
    const androidVersion = parseFloat(this.osVersion);
    
    return (
      (memory && memory < 3) ||
      (cores && cores < 4) ||
      androidVersion < 6
    );
  }

  private applyLowEndAndroidOptimizations() {
    EventBus.emit('platform:low-end-android', {
      renderScale: 0.6,
      targetFPS: 30,
      disableComplexEffects: true,
      limitAudioChannels: 4,
      aggressiveCulling: true
    });
  }

  private applyBrowserEngineOptimizations() {
    switch (this.browserEngine) {
      case 'webkit':
        // Safari optimizations
        EventBus.emit('platform:webkit-optimizations', {
          limitWebGLContexts: true,
          preferArrayBuffers: true,
          disableBlendModes: false
        });
        break;
        
      case 'gecko':
        // Firefox optimizations
        EventBus.emit('platform:gecko-optimizations', {
          enableMozOptimizations: true,
          limitConcurrentAnimations: true
        });
        break;
        
      case 'blink':
        // Chrome optimizations
        EventBus.emit('platform:blink-optimizations', {
          enableExperimentalFeatures: true,
          useOffscreenCanvas: 'OffscreenCanvas' in window
        });
        break;
    }
  }

  // Public API
  getPlatform(): Platform {
    return this.platform;
  }

  getOSVersion(): string {
    return this.osVersion;
  }

  getBrowserEngine(): BrowserEngine {
    return this.browserEngine;
  }

  isMobile(): boolean {
    return this.platform === 'ios' || this.platform === 'android';
  }

  supportsFeature(feature: MobileFeature): boolean {
    switch (feature) {
      case 'webgl2':
        return this.platform !== 'ios' || parseFloat(this.osVersion) >= 11;
      case 'webassembly':
        return this.platform !== 'android' || parseFloat(this.osVersion) >= 5;
      case 'serviceWorker':
        return 'serviceWorker' in navigator;
      case 'webRTC':
        return 'RTCPeerConnection' in window;
      case 'gamepads':
        return 'getGamepads' in navigator;
      case 'deviceOrientation':
        return 'DeviceOrientationEvent' in window;
      case 'vibration':
        return 'vibrate' in navigator;
      default:
        return false;
    }
  }
}

type Platform = 'ios' | 'android' | 'windows-phone' | 'desktop';
type BrowserEngine = 'webkit' | 'blink' | 'gecko' | 'edgehtml' | 'unknown';
type MobileFeature = 'webgl2' | 'webassembly' | 'serviceWorker' | 'webRTC' | 'gamepads' | 'deviceOrientation' | 'vibration';

interface IOSDeviceInfo {
  device: string;
  performance: 'low' | 'medium' | 'high';
  settings: {
    renderScale: number;
    targetFPS: number;
  };
}
```

## Best Practices

### 1. Responsive Design

```typescript
// ✅ Good: Responsive design system
class ResponsiveGameScene extends Phaser.Scene {
  create() {
    // Scale UI elements based on screen size
    const scale = this.getUIScale();
    this.setupScaledUI(scale);
    
    // Adjust game mechanics for different screens
    this.adjustGameplayForScreen();
  }

  private getUIScale(): number {
    const minDimension = Math.min(this.cameras.main.width, this.cameras.main.height);
    return Phaser.Math.Clamp(minDimension / 600, 0.6, 1.4);
  }
}

// ❌ Bad: Fixed sizing
class BadGameScene extends Phaser.Scene {
  create() {
    // Fixed button size doesn't work on all devices
    this.add.rectangle(100, 100, 50, 50, 0xff0000);
  }
}
```

### 2. Touch Input Handling

```typescript
// ✅ Good: Comprehensive touch handling
class TouchHandler {
  setupTouchZones() {
    // Large touch targets (min 44px)
    this.addTouchZone({
      name: 'attack-button',
      bounds: { x: 100, y: 100, width: 60, height: 60 },
      callback: this.handleAttack
    });
    
    // Prevent accidental touches
    this.addDeadZones();
  }

  private addDeadZones() {
    // Areas where touches should be ignored
    const screenEdges = 20; // 20px from edges
    // Implementation...
  }
}

// ❌ Bad: Small touch targets, no gesture recognition
class BadTouchHandler {
  setupTouch() {
    // Touch target too small for mobile
    this.addButton(10, 10, 20, 20);
    
    // No multi-touch support
    this.input.on('pointerdown', this.singleTouchOnly);
  }
}
```

### 3. Performance Optimization

```typescript
// ✅ Good: Dynamic quality adjustment
class QualityManager {
  adjustQuality() {
    const fps = this.game.loop.actualFps;
    const deviceTier = this.getDeviceTier();
    
    if (fps < 30) {
      this.reduceQuality();
    } else if (fps > 55 && deviceTier === 'high') {
      this.increaseQuality();
    }
  }

  private reduceQuality() {
    // Gradual quality reduction
    this.particleCount *= 0.8;
    this.renderScale *= 0.95;
  }
}

// ❌ Bad: No performance monitoring
class BadPerformance {
  constructor() {
    // Always use maximum quality
    this.particleCount = 1000;
    this.enableAllEffects();
    // No adjustment based on device capabilities
  }
}
```

### 4. Battery Optimization

```typescript
// ✅ Good: Battery-aware optimization
class BatteryOptimizer {
  checkBatteryStatus() {
    if (this.batteryLevel < 0.2) {
      this.enablePowerSaveMode();
    }
    
    if (document.hidden) {
      this.reduceFPSForBackground();
    }
  }

  private enablePowerSaveMode() {
    this.targetFPS = 30;
    this.disableNonEssentialEffects();
    this.reduceAudioQuality();
  }
}

// ❌ Bad: No battery consideration
class BadBatteryUsage {
  constructor() {
    // Always run at maximum performance
    this.targetFPS = 60;
    this.enableAllEffects();
    // No optimization for battery life
  }
}
```

This comprehensive mobile optimization system ensures excellent performance and user experience across all mobile devices while maintaining battery life and providing intuitive touch controls. The adaptive systems automatically adjust to device capabilities and user preferences for optimal gameplay. 