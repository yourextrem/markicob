# Physics.md - Arcade Physics Setup, Collision Detection, and Movement Systems

This guide covers Phaser 3's Arcade Physics system implementation in the Tower of Power framework, including collision detection, movement systems, and advanced physics interactions.

## Table of Contents

1. [Physics System Overview](#physics-system-overview)
2. [Arcade Physics Setup](#arcade-physics-setup)
3. [Basic Movement Systems](#basic-movement-systems)
4. [Collision Detection](#collision-detection)
5. [Advanced Physics Interactions](#advanced-physics-interactions)
6. [Combat Physics](#combat-physics)
7. [Projectile Systems](#projectile-systems)
8. [Physics Groups](#physics-groups)
9. [Performance Optimization](#performance-optimization)
10. [Debug Tools](#debug-tools)
11. [Best Practices](#best-practices)

## Physics System Overview

Phaser 3's Arcade Physics provides a lightweight, high-performance physics system perfect for 2D games. The Tower of Power framework uses Arcade Physics for:

```
┌─────────────────────────────────────────────────────────────┐
│                    Arcade Physics System                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Player    │  │  Enemies    │  │ Projectiles │        │
│  │  Movement   │  │    AI       │  │   System    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Collision   │  │   Pickup    │  │ Environment │        │
│  │ Detection   │  │   Items     │  │  Obstacles  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

- **High Performance**: Optimized for 2D games with hundreds of objects
- **AABB Collision**: Axis-Aligned Bounding Box collision detection
- **Built-in Velocity**: Automatic position updates based on velocity
- **Gravity Support**: Global and per-object gravity
- **Bounce and Friction**: Realistic physics interactions
- **Group Collisions**: Efficient collision detection between groups

## Arcade Physics Setup

### Scene Physics Configuration

```typescript
// scenes/BaseScene.ts
export default class BaseScene extends Phaser.Scene {
  constructor(key: string) {
    super({
      key,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 }, // No gravity for top-down game
          debug: process.env.NODE_ENV === 'development', // Debug in development
          debugShowBody: true,
          debugShowStaticBody: true,
          debugShowVelocity: true,
          debugVelocityColor: 0xff00ff,
          debugBodyColor: 0x0000ff,
          debugStaticBodyColor: 0xffffff
        }
      }
    });
  }

  create() {
    // Set world bounds
    this.physics.world.setBounds(0, 0, 1920, 1920);
    
    // Configure world settings
    this.physics.world.setBoundsCollision(true, true, true, true);
    
    // Enable physics debugging in development
    if (process.env.NODE_ENV === 'development') {
      this.physics.world.createDebugGraphic();
    }
  }
}
```

### Dynamic Physics Configuration

```typescript
// Dynamic physics settings that can change during gameplay
class PhysicsManager {
  private scene: Phaser.Scene;
  private settings: PhysicsSettings;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.settings = {
      gravity: { x: 0, y: 0 },
      timeScale: 1,
      debug: false
    };
  }

  updateSettings(newSettings: Partial<PhysicsSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    this.applySettings();
  }

  private applySettings() {
    const world = this.scene.physics.world;
    
    // Update gravity
    world.gravity.x = this.settings.gravity.x;
    world.gravity.y = this.settings.gravity.y;
    
    // Update time scale (for slow motion effects)
    world.timeScale = this.settings.timeScale;
    
    // Toggle debug rendering
    world.drawDebug = this.settings.debug;
  }

  // Slow motion effect for dramatic moments
  enableSlowMotion(scale: number = 0.5, duration: number = 1000) {
    this.updateSettings({ timeScale: scale });
    
    this.scene.time.delayedCall(duration, () => {
      this.updateSettings({ timeScale: 1 });
    });
  }

  // Screen shake effect
  shakeCamera(intensity: number = 10, duration: number = 500) {
    this.scene.cameras.main.shake(duration, intensity);
  }
}

interface PhysicsSettings {
  gravity: { x: number; y: number };
  timeScale: number;
  debug: boolean;
}
```

## Basic Movement Systems

### Player Movement Component

```typescript
// components/MovementComponent.ts
export class MovementComponent {
  private body: Phaser.Physics.Arcade.Body;
  private config: MovementConfig;
  private keys: Phaser.Types.Input.Keyboard.CursorKeys;
  private isDashing: boolean = false;
  private lastDirection: Phaser.Math.Vector2;

  constructor(gameObject: Phaser.GameObjects.GameObject, config: MovementConfig) {
    this.body = gameObject.body as Phaser.Physics.Arcade.Body;
    this.config = config;
    this.lastDirection = new Phaser.Math.Vector2(0, 1); // Default facing down
  }

  update(time: number, delta: number) {
    this.handleMovementInput();
    this.updateAnimations();
    this.handleDash(time);
  }

  private handleMovementInput() {
    const { speed, acceleration, friction } = this.config;
    let moveX = 0;
    let moveY = 0;

    // Check input (keyboard, gamepad, or touch)
    if (this.keys.left.isDown) moveX = -1;
    if (this.keys.right.isDown) moveX = 1;
    if (this.keys.up.isDown) moveY = -1;
    if (this.keys.down.isDown) moveY = 1;

    // Normalize diagonal movement
    if (moveX !== 0 && moveY !== 0) {
      moveX *= 0.707; // Math.SQRT1_2
      moveY *= 0.707;
    }

    // Apply movement with acceleration
    if (moveX !== 0 || moveY !== 0) {
      const targetVelX = moveX * speed;
      const targetVelY = moveY * speed;
      
      this.body.setVelocity(
        Phaser.Math.Linear(this.body.velocity.x, targetVelX, acceleration),
        Phaser.Math.Linear(this.body.velocity.y, targetVelY, acceleration)
      );

      // Update facing direction
      this.lastDirection.set(moveX, moveY);
    } else {
      // Apply friction when not moving
      this.body.setVelocity(
        this.body.velocity.x * friction,
        this.body.velocity.y * friction
      );
    }

    // Stop very small velocities to prevent jitter
    if (Math.abs(this.body.velocity.x) < 1) this.body.setVelocityX(0);
    if (Math.abs(this.body.velocity.y) < 1) this.body.setVelocityY(0);
  }

  private handleDash(time: number) {
    if (this.keys.space.isDown && !this.isDashing && this.canDash()) {
      this.performDash();
    }
  }

  private performDash() {
    const dashSpeed = this.config.speed * 3;
    const dashDuration = 200;

    this.isDashing = true;
    
    // Apply dash velocity in last movement direction
    this.body.setVelocity(
      this.lastDirection.x * dashSpeed,
      this.lastDirection.y * dashSpeed
    );

    // End dash after duration
    this.body.gameObject.scene.time.delayedCall(dashDuration, () => {
      this.isDashing = false;
      // Gradually reduce velocity after dash
      this.body.setVelocity(
        this.body.velocity.x * 0.5,
        this.body.velocity.y * 0.5
      );
    });

    // Emit dash event for visual effects
    EventBus.emit('player:dashed', {
      direction: this.lastDirection.clone(),
      position: { x: this.body.x, y: this.body.y }
    });
  }

  private canDash(): boolean {
    // Add cooldown logic, stamina checks, etc.
    return !this.isDashing;
  }
}

interface MovementConfig {
  speed: number;
  acceleration: number;
  friction: number;
  canDash: boolean;
}
```

### Enemy AI Movement

```typescript
// sprites/enemies/Enemy.ts
export class Enemy extends Phaser.GameObjects.Sprite {
  private movementComponent: EnemyMovement;
  private target: Phaser.GameObjects.GameObject | null = null;
  private pathfinding: PathfindingComponent;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    
    // Enable physics
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    
    this.movementComponent = new EnemyMovement(this, {
      speed: 60,
      chaseSpeed: 100,
      patrolRadius: 150,
      detectionRadius: 200
    });
    
    this.pathfinding = new PathfindingComponent(scene);
  }

  update(time: number, delta: number) {
    this.movementComponent.update(time, delta);
    super.update(time, delta);
  }

  setTarget(target: Phaser.GameObjects.GameObject) {
    this.target = target;
    this.movementComponent.setTarget(target);
  }
}

class EnemyMovement {
  private enemy: Enemy;
  private config: EnemyMovementConfig;
  private state: 'idle' | 'patrol' | 'chase' | 'attack' = 'idle';
  private patrolCenter: Phaser.Math.Vector2;
  private patrolTarget: Phaser.Math.Vector2;

  constructor(enemy: Enemy, config: EnemyMovementConfig) {
    this.enemy = enemy;
    this.config = config;
    this.patrolCenter = new Phaser.Math.Vector2(enemy.x, enemy.y);
    this.generatePatrolTarget();
  }

  update(time: number, delta: number) {
    switch (this.state) {
      case 'idle':
        this.handleIdleState();
        break;
      case 'patrol':
        this.handlePatrolState();
        break;
      case 'chase':
        this.handleChaseState();
        break;
      case 'attack':
        this.handleAttackState();
        break;
    }
  }

  private handlePatrolState() {
    const body = this.enemy.body as Phaser.Physics.Arcade.Body;
    const distance = Phaser.Math.Distance.Between(
      this.enemy.x, this.enemy.y,
      this.patrolTarget.x, this.patrolTarget.y
    );

    if (distance < 10) {
      // Reached patrol target, generate new one
      this.generatePatrolTarget();
    } else {
      // Move toward patrol target
      const angle = Phaser.Math.Angle.Between(
        this.enemy.x, this.enemy.y,
        this.patrolTarget.x, this.patrolTarget.y
      );
      
      body.setVelocity(
        Math.cos(angle) * this.config.speed,
        Math.sin(angle) * this.config.speed
      );
    }
  }

  private handleChaseState() {
    if (!this.target) {
      this.state = 'patrol';
      return;
    }

    const body = this.enemy.body as Phaser.Physics.Arcade.Body;
    const targetDistance = Phaser.Math.Distance.Between(
      this.enemy.x, this.enemy.y,
      this.target.x, this.target.y
    );

    if (targetDistance > this.config.detectionRadius * 1.5) {
      // Lost target, return to patrol
      this.state = 'patrol';
      body.setVelocity(0, 0);
      return;
    }

    if (targetDistance < 50) {
      // Close enough to attack
      this.state = 'attack';
      body.setVelocity(0, 0);
      return;
    }

    // Chase the target
    const angle = Phaser.Math.Angle.Between(
      this.enemy.x, this.enemy.y,
      this.target.x, this.target.y
    );
    
    body.setVelocity(
      Math.cos(angle) * this.config.chaseSpeed,
      Math.sin(angle) * this.config.chaseSpeed
    );
  }

  private generatePatrolTarget() {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const radius = Phaser.Math.FloatBetween(50, this.config.patrolRadius);
    
    this.patrolTarget = new Phaser.Math.Vector2(
      this.patrolCenter.x + Math.cos(angle) * radius,
      this.patrolCenter.y + Math.sin(angle) * radius
    );
  }
}

interface EnemyMovementConfig {
  speed: number;
  chaseSpeed: number;
  patrolRadius: number;
  detectionRadius: number;
}
```

## Collision Detection

### Basic Collision Setup

```typescript
// scenes/DungeonScene.ts
export default class DungeonScene extends Phaser.Scene {
  private player: Player;
  private enemies: Phaser.Physics.Arcade.Group;
  private walls: Phaser.Physics.Arcade.StaticGroup;
  private pickups: Phaser.Physics.Arcade.Group;

  create() {
    this.setupPhysicsGroups();
    this.setupCollisions();
  }

  private setupPhysicsGroups() {
    // Create physics groups
    this.enemies = this.physics.add.group({
      classType: Enemy,
      maxSize: 50,
      runChildUpdate: true
    });

    this.walls = this.physics.add.staticGroup();
    
    this.pickups = this.physics.add.group({
      classType: Pickup,
      maxSize: 100
    });
  }

  private setupCollisions() {
    // Player vs Walls
    this.physics.add.collider(this.player, this.walls);
    
    // Enemies vs Walls
    this.physics.add.collider(this.enemies, this.walls);
    
    // Player vs Enemies (with custom collision handling)
    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.handlePlayerEnemyCollision,
      null,
      this
    );
    
    // Player vs Pickups
    this.physics.add.overlap(
      this.player,
      this.pickups,
      this.handlePlayerPickupCollision,
      null,
      this
    );
    
    // Enemies vs each other (with separation)
    this.physics.add.collider(this.enemies, this.enemies, null, null, this);
  }

  private handlePlayerEnemyCollision(
    player: Player,
    enemy: Enemy
  ) {
    // Check if player is invulnerable
    if (player.isInvulnerable()) return;

    // Calculate damage and knockback
    const damage = enemy.getDamage();
    const knockbackForce = 200;
    
    // Apply damage to player
    player.takeDamage(damage);
    
    // Apply knockback
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
    const playerBody = player.body as Phaser.Physics.Arcade.Body;
    
    playerBody.setVelocity(
      Math.cos(angle) * knockbackForce,
      Math.sin(angle) * knockbackForce
    );
    
    // Make player temporarily invulnerable
    player.setInvulnerable(1000); // 1 second
    
    // Emit collision event
    EventBus.emit('combat:player-hit', {
      damage,
      enemy: enemy.enemyType,
      position: { x: player.x, y: player.y }
    });
  }

  private handlePlayerPickupCollision(
    player: Player,
    pickup: Pickup
  ) {
    // Apply pickup effect
    pickup.applyEffect(player);
    
    // Remove pickup from scene
    pickup.destroy();
    
    // Emit pickup event
    EventBus.emit('inventory:item-collected', {
      item: pickup.itemData,
      position: { x: pickup.x, y: pickup.y }
    });
  }
}
```

### Advanced Collision Detection

```typescript
// Advanced collision system with custom collision shapes
class CollisionManager {
  private scene: Phaser.Scene;
  private collisionMasks: Map<string, number> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupCollisionMasks();
  }

  private setupCollisionMasks() {
    // Define collision layers using bit masks
    this.collisionMasks.set('PLAYER', 1);
    this.collisionMasks.set('ENEMY', 2);
    this.collisionMasks.set('PROJECTILE', 4);
    this.collisionMasks.set('WALL', 8);
    this.collisionMasks.set('PICKUP', 16);
    this.collisionMasks.set('TRIGGER', 32);
  }

  // Custom collision detection with circular shapes
  checkCircularCollision(
    obj1: { x: number; y: number; radius: number },
    obj2: { x: number; y: number; radius: number }
  ): boolean {
    const distance = Phaser.Math.Distance.Between(obj1.x, obj1.y, obj2.x, obj2.y);
    return distance < (obj1.radius + obj2.radius);
  }

  // Collision detection with custom polygon shapes
  checkPolygonCollision(
    poly1: Phaser.Geom.Polygon,
    poly2: Phaser.Geom.Polygon
  ): boolean {
    // Use SAT (Separating Axis Theorem) for polygon collision
    return Phaser.Geom.Intersects.PolygonToPolygon(poly1, poly2);
  }

  // Ray casting for line-of-sight checks
  raycast(
    start: { x: number; y: number },
    end: { x: number; y: number },
    obstacles: Phaser.Physics.Arcade.Group
  ): RaycastResult {
    const line = new Phaser.Geom.Line(start.x, start.y, end.x, end.y);
    let closestHit: RaycastHit | null = null;
    let minDistance = Infinity;

    obstacles.children.entries.forEach((obstacle) => {
      const body = obstacle.body as Phaser.Physics.Arcade.Body;
      const rect = new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
      
      const intersection = Phaser.Geom.Intersects.LineToRectangle(line, rect);
      if (intersection) {
        const distance = Phaser.Math.Distance.Between(start.x, start.y, body.x, body.y);
        if (distance < minDistance) {
          minDistance = distance;
          closestHit = {
            object: obstacle,
            point: { x: body.x, y: body.y },
            distance
          };
        }
      }
    });

    return {
      hit: closestHit !== null,
      hitInfo: closestHit
    };
  }
}

interface RaycastHit {
  object: Phaser.GameObjects.GameObject;
  point: { x: number; y: number };
  distance: number;
}

interface RaycastResult {
  hit: boolean;
  hitInfo: RaycastHit | null;
}
```

### Collision Callbacks and Events

```typescript
// Collision event system
class CollisionEventSystem {
  private static instance: CollisionEventSystem;
  private collisionHandlers: Map<string, CollisionHandler[]> = new Map();

  static getInstance(): CollisionEventSystem {
    if (!CollisionEventSystem.instance) {
      CollisionEventSystem.instance = new CollisionEventSystem();
    }
    return CollisionEventSystem.instance;
  }

  registerCollisionHandler(
    collisionType: string,
    handler: CollisionHandler
  ) {
    if (!this.collisionHandlers.has(collisionType)) {
      this.collisionHandlers.set(collisionType, []);
    }
    this.collisionHandlers.get(collisionType)!.push(handler);
  }

  handleCollision(
    collisionType: string,
    obj1: Phaser.GameObjects.GameObject,
    obj2: Phaser.GameObjects.GameObject
  ) {
    const handlers = this.collisionHandlers.get(collisionType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler.onCollision(obj1, obj2);
        } catch (error) {
          console.error(`Error in collision handler for ${collisionType}:`, error);
        }
      });
    }

    // Emit global collision event
    EventBus.emit('physics:collision', {
      type: collisionType,
      objects: [obj1, obj2],
      timestamp: Date.now()
    });
  }
}

interface CollisionHandler {
  onCollision(obj1: Phaser.GameObjects.GameObject, obj2: Phaser.GameObjects.GameObject): void;
}

// Example collision handlers
class DamageCollisionHandler implements CollisionHandler {
  onCollision(attacker: any, target: any): void {
    if (target.takeDamage && attacker.getDamage) {
      const damage = attacker.getDamage();
      target.takeDamage(damage);
      
      // Visual feedback
      this.createDamageEffect(target, damage);
    }
  }

  private createDamageEffect(target: any, damage: number) {
    const scene = target.scene;
    const damageText = scene.add.text(target.x, target.y - 30, `-${damage}`, {
      fontSize: '20px',
      color: '#ff0000',
      fontStyle: 'bold'
    });

    // Animate damage text
    scene.tweens.add({
      targets: damageText,
      y: damageText.y - 50,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => damageText.destroy()
    });
  }
}
```

## Advanced Physics Interactions

### Force and Impulse Systems

```typescript
// Force application system
class ForceSystem {
  // Apply gradual force over time
  static applyForce(
    body: Phaser.Physics.Arcade.Body,
    force: { x: number; y: number },
    duration: number,
    scene: Phaser.Scene
  ) {
    const forcePerFrame = {
      x: force.x / (duration / 16.67), // 60 FPS assumption
      y: force.y / (duration / 16.67)
    };

    const forceTimer = scene.time.addEvent({
      delay: 16.67, // ~60 FPS
      repeat: Math.floor(duration / 16.67),
      callback: () => {
        body.setVelocity(
          body.velocity.x + forcePerFrame.x,
          body.velocity.y + forcePerFrame.y
        );
      }
    });

    return forceTimer;
  }

  // Apply instant impulse
  static applyImpulse(
    body: Phaser.Physics.Arcade.Body,
    impulse: { x: number; y: number }
  ) {
    body.setVelocity(
      body.velocity.x + impulse.x,
      body.velocity.y + impulse.y
    );
  }

  // Magnetic attraction effect
  static createMagneticField(
    center: { x: number; y: number },
    radius: number,
    strength: number,
    targets: Phaser.Physics.Arcade.Group
  ) {
    targets.children.entries.forEach((target) => {
      const body = target.body as Phaser.Physics.Arcade.Body;
      const distance = Phaser.Math.Distance.Between(center.x, center.y, body.x, body.y);
      
      if (distance < radius && distance > 0) {
        const forceMagnitude = strength / (distance * distance); // Inverse square law
        const angle = Phaser.Math.Angle.Between(body.x, body.y, center.x, center.y);
        
        const force = {
          x: Math.cos(angle) * forceMagnitude,
          y: Math.sin(angle) * forceMagnitude
        };
        
        body.setVelocity(
          body.velocity.x + force.x,
          body.velocity.y + force.y
        );
      }
    });
  }
}
```

### Physics-Based Abilities

```typescript
// Physics-based ability system
class PhysicsAbilities {
  // Dash ability with physics
  static dash(
    player: Player,
    direction: { x: number; y: number },
    distance: number,
    duration: number
  ) {
    const body = player.body as Phaser.Physics.Arcade.Body;
    const scene = player.scene;
    
    // Calculate velocity needed for desired distance
    const velocity = {
      x: (direction.x * distance) / (duration / 1000),
      y: (direction.y * distance) / (duration / 1000)
    };
    
    // Store original friction
    const originalDrag = { x: body.drag.x, y: body.drag.y };
    
    // Disable friction during dash
    body.setDrag(0, 0);
    body.setVelocity(velocity.x, velocity.y);
    
    // Make player invulnerable during dash
    player.setInvulnerable(duration);
    
    // Create dash trail effect
    const trail = new DashTrail(scene, player);
    
    // End dash after duration
    scene.time.delayedCall(duration, () => {
      body.setDrag(originalDrag.x, originalDrag.y);
      body.setVelocity(0, 0);
      trail.stop();
    });
  }

  // Knockback ability
  static knockback(
    source: { x: number; y: number },
    target: Phaser.GameObjects.GameObject,
    force: number
  ) {
    const body = target.body as Phaser.Physics.Arcade.Body;
    const angle = Phaser.Math.Angle.Between(source.x, source.y, target.x, target.y);
    
    ForceSystem.applyImpulse(body, {
      x: Math.cos(angle) * force,
      y: Math.sin(angle) * force
    });
  }

  // Area of effect explosion
  static explosion(
    center: { x: number; y: number },
    radius: number,
    force: number,
    targets: Phaser.Physics.Arcade.Group
  ) {
    targets.children.entries.forEach((target) => {
      const distance = Phaser.Math.Distance.Between(center.x, center.y, target.x, target.y);
      
      if (distance < radius) {
        // Force decreases with distance
        const forceMagnitude = force * (1 - distance / radius);
        const angle = Phaser.Math.Angle.Between(center.x, center.y, target.x, target.y);
        
        ForceSystem.applyImpulse(target.body as Phaser.Physics.Arcade.Body, {
          x: Math.cos(angle) * forceMagnitude,
          y: Math.sin(angle) * forceMagnitude
        });
      }
    });
  }
}

// Dash trail visual effect
class DashTrail {
  private scene: Phaser.Scene;
  private target: Phaser.GameObjects.GameObject;
  private trailSprites: Phaser.GameObjects.Sprite[] = [];
  private timer: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject) {
    this.scene = scene;
    this.target = target;
    this.start();
  }

  private start() {
    this.timer = this.scene.time.addEvent({
      delay: 50, // Create trail segment every 50ms
      repeat: -1,
      callback: this.createTrailSegment.bind(this)
    });
  }

  private createTrailSegment() {
    const sprite = this.scene.add.sprite(this.target.x, this.target.y, this.target.texture.key);
    sprite.setAlpha(0.5);
    sprite.setTint(0x00ffff); // Blue tint for trail
    
    this.trailSprites.push(sprite);
    
    // Fade out and remove trail segment
    this.scene.tweens.add({
      targets: sprite,
      alpha: 0,
      scale: 0.5,
      duration: 300,
      onComplete: () => {
        sprite.destroy();
        const index = this.trailSprites.indexOf(sprite);
        if (index > -1) {
          this.trailSprites.splice(index, 1);
        }
      }
    });
  }

  stop() {
    if (this.timer) {
      this.timer.destroy();
    }
  }
}
```

## Combat Physics

### Melee Combat System

```typescript
// Melee combat with physics-based hit detection
class MeleeCombat {
  private player: Player;
  private attackRange: number = 60;
  private attackArc: number = Math.PI / 3; // 60 degrees

  constructor(player: Player) {
    this.player = player;
  }

  performAttack(direction: { x: number; y: number }, enemies: Phaser.Physics.Arcade.Group) {
    // Create attack hitbox
    const attackCenter = {
      x: this.player.x + direction.x * this.attackRange,
      y: this.player.y + direction.y * this.attackRange
    };

    // Check which enemies are in attack range and arc
    const hitEnemies: Enemy[] = [];
    
    enemies.children.entries.forEach((enemy) => {
      if (this.isInAttackRange(enemy as Enemy, attackCenter, direction)) {
        hitEnemies.push(enemy as Enemy);
      }
    });

    // Apply damage and effects to hit enemies
    hitEnemies.forEach(enemy => {
      this.hitEnemy(enemy, direction);
    });

    // Create visual attack effect
    this.createAttackEffect(attackCenter, direction);

    return hitEnemies;
  }

  private isInAttackRange(
    enemy: Enemy,
    attackCenter: { x: number; y: number },
    attackDirection: { x: number; y: number }
  ): boolean {
    // Check distance
    const distance = Phaser.Math.Distance.Between(
      attackCenter.x, attackCenter.y,
      enemy.x, enemy.y
    );
    
    if (distance > this.attackRange) return false;

    // Check if enemy is within attack arc
    const angleToEnemy = Phaser.Math.Angle.Between(
      this.player.x, this.player.y,
      enemy.x, enemy.y
    );
    
    const attackAngle = Math.atan2(attackDirection.y, attackDirection.x);
    const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(angleToEnemy - attackAngle));
    
    return angleDiff <= this.attackArc / 2;
  }

  private hitEnemy(enemy: Enemy, attackDirection: { x: number; y: number }) {
    // Apply damage
    const damage = this.player.getAttackDamage();
    enemy.takeDamage(damage);

    // Apply knockback
    const knockbackForce = 150;
    ForceSystem.applyImpulse(enemy.body as Phaser.Physics.Arcade.Body, {
      x: attackDirection.x * knockbackForce,
      y: attackDirection.y * knockbackForce
    });

    // Create hit effect
    this.createHitEffect(enemy);
  }

  private createAttackEffect(center: { x: number; y: number }, direction: { x: number; y: number }) {
    const scene = this.player.scene;
    
    // Create slash effect
    const slash = scene.add.graphics();
    slash.lineStyle(4, 0xffffff, 0.8);
    
    const startAngle = Math.atan2(direction.y, direction.x) - this.attackArc / 2;
    const endAngle = startAngle + this.attackArc;
    
    slash.arc(center.x, center.y, this.attackRange, startAngle, endAngle);
    slash.strokePath();
    
    // Animate slash
    scene.tweens.add({
      targets: slash,
      alpha: 0,
      duration: 200,
      onComplete: () => slash.destroy()
    });
  }

  private createHitEffect(enemy: Enemy) {
    const scene = enemy.scene;
    
    // Screen shake
    scene.cameras.main.shake(100, 5);
    
    // Hit spark effect
    const spark = scene.add.sprite(enemy.x, enemy.y, 'hit-effect');
    spark.play('hit-spark');
    
    spark.on('animationcomplete', () => {
      spark.destroy();
    });
  }
}
```

## Projectile Systems

### Projectile Physics

```typescript
// Advanced projectile system with physics
class ProjectileSystem {
  private scene: Phaser.Scene;
  private projectileGroup: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupProjectileGroup();
  }

  private setupProjectileGroup() {
    this.projectileGroup = this.scene.physics.add.group({
      classType: Projectile,
      maxSize: 100,
      runChildUpdate: true
    });
  }

  // Fire projectile with physics
  fireProjectile(config: ProjectileConfig): Projectile {
    const projectile = this.projectileGroup.get() as Projectile;
    
    if (projectile) {
      projectile.fire(config);
      return projectile;
    }
    
    return this.createProjectile(config);
  }

  private createProjectile(config: ProjectileConfig): Projectile {
    const projectile = new Projectile(this.scene, config.x, config.y, config.texture);
    this.projectileGroup.add(projectile);
    projectile.fire(config);
    return projectile;
  }

  // Homing projectile
  fireHomingProjectile(config: ProjectileConfig & { target: Phaser.GameObjects.GameObject }): Projectile {
    const projectile = this.fireProjectile(config);
    projectile.setHomingTarget(config.target);
    return projectile;
  }

  // Bouncing projectile
  fireBouncingProjectile(config: ProjectileConfig & { bounces: number }): Projectile {
    const projectile = this.fireProjectile(config);
    projectile.setBounces(config.bounces);
    return projectile;
  }
}

class Projectile extends Phaser.GameObjects.Sprite {
  private speed: number = 300;
  private damage: number = 10;
  private lifetime: number = 3000;
  private homingTarget: Phaser.GameObjects.GameObject | null = null;
  private homingStrength: number = 0.1;
  private bounces: number = 0;
  private maxBounces: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.onWorldBounds = true;
    
    this.setActive(false);
    this.setVisible(false);
  }

  fire(config: ProjectileConfig) {
    this.setPosition(config.x, config.y);
    this.setActive(true);
    this.setVisible(true);
    
    this.speed = config.speed || 300;
    this.damage = config.damage || 10;
    this.lifetime = config.lifetime || 3000;
    
    // Set initial velocity
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(
      Math.cos(config.angle) * this.speed,
      Math.sin(config.angle) * this.speed
    );
    
    // Set rotation to match direction
    this.setRotation(config.angle);
    
    // Destroy after lifetime
    this.scene.time.delayedCall(this.lifetime, () => {
      this.destroy();
    });
  }

  update(time: number, delta: number) {
    if (!this.active) return;
    
    this.updateHoming(delta);
    this.updateTrail();
    
    super.update(time, delta);
  }

  private updateHoming(delta: number) {
    if (!this.homingTarget || !this.homingTarget.active) return;
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    // Calculate angle to target
    const targetAngle = Phaser.Math.Angle.Between(
      this.x, this.y,
      this.homingTarget.x, this.homingTarget.y
    );
    
    // Current velocity angle
    const currentAngle = Math.atan2(body.velocity.y, body.velocity.x);
    
    // Interpolate toward target angle
    const angleDiff = Phaser.Math.Angle.Wrap(targetAngle - currentAngle);
    const newAngle = currentAngle + angleDiff * this.homingStrength * (delta / 16.67);
    
    // Apply new velocity
    body.setVelocity(
      Math.cos(newAngle) * this.speed,
      Math.sin(newAngle) * this.speed
    );
    
    // Update visual rotation
    this.setRotation(newAngle);
  }

  private updateTrail() {
    // Create particle trail effect
    const trail = this.scene.add.circle(this.x, this.y, 3, 0xff4444, 0.5);
    
    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      scale: 0,
      duration: 500,
      onComplete: () => trail.destroy()
    });
  }

  setHomingTarget(target: Phaser.GameObjects.GameObject) {
    this.homingTarget = target;
  }

  setBounces(maxBounces: number) {
    this.maxBounces = maxBounces;
    
    // Set up world bounds collision
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setBounce(1); // Perfect bounce
    
    // Listen for world bounds collision
    this.scene.physics.world.on('worldbounds', (event: any, body: Phaser.Physics.Arcade.Body) => {
      if (body.gameObject === this) {
        this.bounces++;
        if (this.bounces >= this.maxBounces) {
          this.destroy();
        }
      }
    });
  }

  getDamage(): number {
    return this.damage;
  }

  destroy() {
    this.setActive(false);
    this.setVisible(false);
    
    // Reset properties for pooling
    this.homingTarget = null;
    this.bounces = 0;
    this.maxBounces = 0;
    
    super.destroy();
  }
}

interface ProjectileConfig {
  x: number;
  y: number;
  angle: number;
  speed?: number;
  damage?: number;
  lifetime?: number;
  texture: string;
}
```

## Physics Groups

### Group Management

```typescript
// Advanced physics group management
class PhysicsGroupManager {
  private scene: Phaser.Scene;
  private groups: Map<string, Phaser.Physics.Arcade.Group> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  createGroup(
    name: string,
    config: Phaser.Types.Physics.Arcade.PhysicsGroupConfig
  ): Phaser.Physics.Arcade.Group {
    const group = this.scene.physics.add.group(config);
    this.groups.set(name, group);
    return group;
  }

  getGroup(name: string): Phaser.Physics.Arcade.Group | undefined {
    return this.groups.get(name);
  }

  // Set up collision matrix between groups
  setupCollisionMatrix(matrix: CollisionMatrix) {
    Object.entries(matrix).forEach(([group1Name, collisions]) => {
      const group1 = this.getGroup(group1Name);
      if (!group1) return;

      Object.entries(collisions).forEach(([group2Name, collisionConfig]) => {
        const group2 = this.getGroup(group2Name);
        if (!group2) return;

        if (collisionConfig.overlap) {
          this.scene.physics.add.overlap(
            group1,
            group2,
            collisionConfig.callback,
            collisionConfig.processCallback,
            this.scene
          );
        } else {
          this.scene.physics.add.collider(
            group1,
            group2,
            collisionConfig.callback,
            collisionConfig.processCallback,
            this.scene
          );
        }
      });
    });
  }

  // Dynamic group filtering
  filterGroupCollisions(
    groupName: string,
    filterFunction: (obj: Phaser.GameObjects.GameObject) => boolean
  ) {
    const group = this.getGroup(groupName);
    if (!group) return;

    // Temporarily disable collision for filtered objects
    group.children.entries.forEach(child => {
      const body = child.body as Phaser.Physics.Arcade.Body;
      if (filterFunction(child)) {
        body.enable = false;
      } else {
        body.enable = true;
      }
    });
  }
}

interface CollisionMatrix {
  [groupName: string]: {
    [otherGroupName: string]: {
      overlap: boolean;
      callback?: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback;
      processCallback?: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback;
    };
  };
}

// Example usage
const collisionMatrix: CollisionMatrix = {
  'players': {
    'enemies': {
      overlap: true,
      callback: handlePlayerEnemyCollision
    },
    'walls': {
      overlap: false
    },
    'pickups': {
      overlap: true,
      callback: handlePlayerPickupCollision
    }
  },
  'projectiles': {
    'enemies': {
      overlap: true,
      callback: handleProjectileEnemyCollision
    },
    'walls': {
      overlap: false,
      callback: handleProjectileWallCollision
    }
  }
};
```

## Performance Optimization

### Physics Optimization Techniques

```typescript
// Physics performance optimizer
class PhysicsOptimizer {
  private scene: Phaser.Scene;
  private settings: OptimizationSettings;

  constructor(scene: Phaser.Scene, settings: OptimizationSettings) {
    this.scene = scene;
    this.settings = settings;
    this.setupOptimizations();
  }

  private setupOptimizations() {
    // Enable spatial partitioning
    this.scene.physics.world.enable = true;
    
    // Optimize collision detection frequency
    if (this.settings.reducedCollisionChecks) {
      this.scene.physics.world.fixedStep = false;
      this.scene.physics.world.fps = 30; // Reduce from 60 to 30 FPS
    }
    
    // Set up culling for off-screen objects
    this.setupCulling();
    
    // Optimize physics body updates
    this.optimizeBodyUpdates();
  }

  private setupCulling() {
    const camera = this.scene.cameras.main;
    const cullPadding = this.settings.cullPadding || 100;

    this.scene.physics.world.on('worldstep', () => {
      this.scene.physics.world.bodies.forEach((body: Phaser.Physics.Arcade.Body) => {
        const gameObject = body.gameObject;
        
        // Check if object is outside camera view with padding
        const inView = Phaser.Geom.Rectangle.Overlaps(
          camera.worldView,
          new Phaser.Geom.Rectangle(
            body.x - cullPadding,
            body.y - cullPadding,
            body.width + cullPadding * 2,
            body.height + cullPadding * 2
          )
        );
        
        // Disable physics for off-screen objects
        body.enable = inView;
        
        // Optionally disable rendering for far off-screen objects
        if (!inView && this.settings.disableRenderingOffScreen) {
          gameObject.setVisible(false);
        } else {
          gameObject.setVisible(true);
        }
      });
    });
  }

  private optimizeBodyUpdates() {
    // Group similar objects for batch processing
    const batchGroups = new Map<string, Phaser.Physics.Arcade.Body[]>();
    
    this.scene.physics.world.bodies.forEach((body: Phaser.Physics.Arcade.Body) => {
      const type = body.gameObject.constructor.name;
      if (!batchGroups.has(type)) {
        batchGroups.set(type, []);
      }
      batchGroups.get(type)!.push(body);
    });
    
    // Process each batch with optimized algorithms
    batchGroups.forEach((bodies, type) => {
      this.processBatch(bodies, type);
    });
  }

  private processBatch(bodies: Phaser.Physics.Arcade.Body[], type: string) {
    // Example: Batch update velocities for projectiles
    if (type === 'Projectile') {
      bodies.forEach(body => {
        // Apply air resistance in batch
        body.velocity.x *= 0.999;
        body.velocity.y *= 0.999;
      });
    }
  }

  // Dynamic quality adjustment based on performance
  adjustQuality(targetFPS: number = 60) {
    const currentFPS = this.scene.game.loop.actualFps;
    
    if (currentFPS < targetFPS * 0.8) {
      // Reduce quality
      this.settings.reducedCollisionChecks = true;
      this.settings.disableRenderingOffScreen = true;
      this.scene.physics.world.fps = 30;
    } else if (currentFPS > targetFPS * 0.95) {
      // Increase quality
      this.settings.reducedCollisionChecks = false;
      this.scene.physics.world.fps = 60;
    }
  }
}

interface OptimizationSettings {
  reducedCollisionChecks: boolean;
  cullPadding: number;
  disableRenderingOffScreen: boolean;
  batchProcessing: boolean;
}
```

## Debug Tools

### Physics Debug System

```typescript
// Comprehensive physics debug system
class PhysicsDebugger {
  private scene: Phaser.Scene;
  private debugGraphics: Phaser.GameObjects.Graphics;
  private debugText: Phaser.GameObjects.Text;
  private isEnabled: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupDebugTools();
  }

  private setupDebugTools() {
    // Create debug graphics
    this.debugGraphics = this.scene.add.graphics();
    this.debugGraphics.setDepth(1000); // Always on top
    
    // Create debug text
    this.debugText = this.scene.add.text(10, 10, '', {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 5, y: 5 }
    });
    this.debugText.setDepth(1001);
    this.debugText.setScrollFactor(0); // UI element
    
    // Set up keyboard controls
    this.setupKeyboardControls();
  }

  private setupKeyboardControls() {
    const cursors = this.scene.input.keyboard?.createCursorKeys();
    
    this.scene.input.keyboard?.on('keydown-F1', () => {
      this.toggle();
    });
    
    this.scene.input.keyboard?.on('keydown-F2', () => {
      this.togglePhysicsDebug();
    });
    
    this.scene.input.keyboard?.on('keydown-F3', () => {
      this.logPhysicsInfo();
    });
  }

  toggle() {
    this.isEnabled = !this.isEnabled;
    this.debugGraphics.setVisible(this.isEnabled);
    this.debugText.setVisible(this.isEnabled);
  }

  togglePhysicsDebug() {
    const world = this.scene.physics.world;
    world.drawDebug = !world.drawDebug;
    
    if (world.drawDebug && !world.debugGraphic) {
      world.createDebugGraphic();
    }
  }

  update() {
    if (!this.isEnabled) return;
    
    this.updateDebugGraphics();
    this.updateDebugText();
  }

  private updateDebugGraphics() {
    this.debugGraphics.clear();
    
    // Draw collision boxes for all physics bodies
    this.scene.physics.world.bodies.forEach((body: Phaser.Physics.Arcade.Body) => {
      this.drawBodyDebug(body);
    });
    
    // Draw group boundaries
    this.drawGroupBoundaries();
  }

  private drawBodyDebug(body: Phaser.Physics.Arcade.Body) {
    const color = body.touching.none ? 0x00ff00 : 0xff0000;
    
    // Draw body rectangle
    this.debugGraphics.lineStyle(1, color, 0.8);
    this.debugGraphics.strokeRect(body.x, body.y, body.width, body.height);
    
    // Draw velocity vector
    if (body.velocity.x !== 0 || body.velocity.y !== 0) {
      this.debugGraphics.lineStyle(2, 0xffff00, 1);
      const centerX = body.center.x;
      const centerY = body.center.y;
      const velScale = 0.1;
      
      this.debugGraphics.lineBetween(
        centerX,
        centerY,
        centerX + body.velocity.x * velScale,
        centerY + body.velocity.y * velScale
      );
    }
  }

  private drawGroupBoundaries() {
    // Draw camera bounds
    const camera = this.scene.cameras.main;
    this.debugGraphics.lineStyle(2, 0x00ffff, 0.5);
    this.debugGraphics.strokeRect(
      camera.worldView.x,
      camera.worldView.y,
      camera.worldView.width,
      camera.worldView.height
    );
  }

  private updateDebugText() {
    const world = this.scene.physics.world;
    const player = this.scene.children.getByName('player'); // Assuming player has name
    
    let debugInfo = `Physics Debug (F1: Toggle, F2: Physics Debug, F3: Log Info)\n`;
    debugInfo += `Active Bodies: ${world.bodies.size}\n`;
    debugInfo += `Static Bodies: ${world.staticBodies.size}\n`;
    debugInfo += `FPS: ${Math.round(this.scene.game.loop.actualFps)}\n`;
    debugInfo += `World Bounds: ${world.bounds.width}x${world.bounds.height}\n`;
    
    if (player && player.body) {
      const body = player.body as Phaser.Physics.Arcade.Body;
      debugInfo += `\nPlayer:\n`;
      debugInfo += `Position: (${Math.round(player.x)}, ${Math.round(player.y)})\n`;
      debugInfo += `Velocity: (${Math.round(body.velocity.x)}, ${Math.round(body.velocity.y)})\n`;
      debugInfo += `Speed: ${Math.round(Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2))}\n`;
    }
    
    this.debugText.setText(debugInfo);
  }

  logPhysicsInfo() {
    const world = this.scene.physics.world;
    
    console.group('Physics Debug Info');
    console.log('World:', {
      bounds: world.bounds,
      gravity: world.gravity,
      fps: world.fps,
      activeBodies: world.bodies.size,
      staticBodies: world.staticBodies.size
    });
    
    // Log all physics bodies
    console.log('Physics Bodies:');
    world.bodies.forEach((body: Phaser.Physics.Arcade.Body, index) => {
      console.log(`Body ${index}:`, {
        gameObject: body.gameObject.constructor.name,
        position: { x: body.x, y: body.y },
        velocity: { x: body.velocity.x, y: body.velocity.y },
        size: { width: body.width, height: body.height },
        touching: body.touching
      });
    });
    console.groupEnd();
  }
}
```

## Best Practices

### 1. Physics Body Setup

```typescript
// ✅ Good: Proper physics body configuration
class Player extends Phaser.GameObjects.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    
    // Enable physics
    scene.physics.add.existing(this);
    
    // Configure body properly
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(24, 32); // Set smaller collision box than sprite
    body.setOffset(4, 0); // Center the collision box
    body.setDrag(300); // Add friction
    body.setMaxVelocity(200); // Prevent excessive speeds
  }
}

// ❌ Bad: No physics configuration
class BadPlayer extends Phaser.GameObjects.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    scene.physics.add.existing(this); // No further configuration
  }
}
```

### 2. Collision Optimization

```typescript
// ✅ Good: Efficient collision detection
class CollisionManager {
  setupCollisions() {
    // Use overlap for triggers, collider for solid objects
    this.physics.add.overlap(player, pickups, handlePickup);
    this.physics.add.collider(player, walls);
    
    // Group similar objects for batch collision
    this.physics.add.collider(enemies, walls);
    this.physics.add.overlap(projectiles, enemies, handleProjectileHit);
  }
}

// ❌ Bad: Individual collision checks
class BadCollisionManager {
  update() {
    // Don't check collisions manually every frame
    enemies.forEach(enemy => {
      if (Phaser.Geom.Intersects.RectangleToRectangle(player.getBounds(), enemy.getBounds())) {
        // Handle collision
      }
    });
  }
}
```

### 3. Movement Implementation

```typescript
// ✅ Good: Physics-based movement with proper acceleration
class PhysicsMovement {
  updateMovement(input: InputState) {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const acceleration = 300;
    const maxSpeed = 160;
    
    // Apply acceleration, let physics handle the rest
    if (input.left) body.setAccelerationX(-acceleration);
    else if (input.right) body.setAccelerationX(acceleration);
    else body.setAccelerationX(0);
    
    if (input.up) body.setAccelerationY(-acceleration);
    else if (input.down) body.setAccelerationY(acceleration);
    else body.setAccelerationY(0);
    
    // Limit maximum speed
    body.setMaxVelocity(maxSpeed);
  }
}

// ❌ Bad: Direct position manipulation
class BadMovement {
  updateMovement(input: InputState) {
    const speed = 5;
    
    // Don't manipulate position directly when using physics
    if (input.left) this.x -= speed;
    if (input.right) this.x += speed;
    if (input.up) this.y -= speed;
    if (input.down) this.y += speed;
  }
}
```

### 4. Memory Management

```typescript
// ✅ Good: Proper cleanup and object pooling
class ProjectilePool {
  private pool: Projectile[] = [];
  private maxSize: number = 50;
  
  getProjectile(): Projectile {
    let projectile = this.pool.pop();
    if (!projectile) {
      projectile = new Projectile(this.scene, 0, 0, 'projectile');
    }
    return projectile;
  }
  
  releaseProjectile(projectile: Projectile) {
    projectile.reset();
    if (this.pool.length < this.maxSize) {
      this.pool.push(projectile);
    } else {
      projectile.destroy();
    }
  }
}

// ❌ Bad: Creating new objects constantly
class BadProjectileSystem {
  fireProjectile() {
    // Creates new object every time, causing garbage collection
    const projectile = new Projectile(this.scene, this.x, this.y, 'projectile');
    return projectile;
  }
}
```

This comprehensive physics system provides the foundation for creating engaging, responsive gameplay with realistic interactions. The Arcade Physics system's performance and simplicity make it perfect for 2D games while still providing sophisticated collision detection and movement systems. 