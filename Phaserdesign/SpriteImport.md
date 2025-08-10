# Sprite Import and Management Guide
*Complete Guide to Sprites, Animations, and Asset Management in Phaser 3*

## Table of Contents
1. [Overview](#overview)
2. [Asset Organization](#asset-organization)
3. [Sprite Loading](#sprite-loading)
4. [Animation System](#animation-system)
5. [Sprite Classes](#sprite-classes)
6. [Performance Optimization](#performance-optimization)
7. [Advanced Techniques](#advanced-techniques)
8. [Best Practices](#best-practices)

## Overview

This guide covers everything you need to know about importing, managing, and animating sprites in Phaser 3 games. From basic sprite loading to complex animation systems and performance optimization techniques.

### Key Concepts

- **Sprites**: Visual game objects with textures
- **Texture Atlases**: Optimized sprite sheets for better performance
- **Animations**: Frame-based sprite animations
- **Asset Loading**: Efficient preloading and management
- **Memory Management**: Optimizing sprite usage and cleanup

## Asset Organization

### 1. Directory Structure

Organize your assets in a clear, scalable structure:

```
public/assets/
├── sprites/
│   ├── characters/
│   │   ├── player/
│   │   │   ├── idle.png
│   │   │   ├── walk.png
│   │   │   ├── attack.png
│   │   │   └── player.json (atlas data)
│   │   ├── enemies/
│   │   │   ├── goblin/
│   │   │   └── skeleton/
│   │   └── npcs/
│   ├── environment/
│   │   ├── tiles/
│   │   ├── decorations/
│   │   └── backgrounds/
│   ├── ui/
│   │   ├── buttons/
│   │   ├── icons/
│   │   └── frames/
│   └── effects/
│       ├── particles/
│       ├── explosions/
│       └── magic/
├── audio/
│   ├── sfx/
│   └── music/
└── data/
    ├── levels/
    └── configs/
```

### 2. Asset Naming Conventions

Use consistent naming patterns for better organization:

```typescript
// Character sprites
player_idle_001.png
player_walk_001.png
player_attack_001.png

// Enemy sprites  
goblin_idle_001.png
goblin_attack_001.png

// UI elements
button_normal.png
button_hover.png
button_pressed.png

// Effects
explosion_001.png
magic_bolt_001.png
```

### 3. Asset Configuration

Create `/src/game/config/AssetConfig.ts`:

```typescript
export interface SpriteConfig {
  key: string
  path: string
  frameWidth?: number
  frameHeight?: number
  frames?: number
  atlas?: string
}

export interface AnimationConfig {
  key: string
  frames: string | number[]
  frameRate: number
  repeat: number
  yoyo?: boolean
}

export const SPRITE_CONFIGS: Record<string, SpriteConfig> = {
  // Characters
  player: {
    key: 'player',
    path: '/assets/sprites/characters/player/player.png',
    frameWidth: 64,
    frameHeight: 64,
    frames: 16
  },
  
  goblin: {
    key: 'goblin', 
    path: '/assets/sprites/characters/enemies/goblin.png',
    frameWidth: 48,
    frameHeight: 48,
    frames: 12
  },

  // Environment
  tiles: {
    key: 'tiles',
    path: '/assets/sprites/environment/tileset.png',
    frameWidth: 32,
    frameHeight: 32
  },

  // UI
  buttons: {
    key: 'ui-buttons',
    path: '/assets/sprites/ui/buttons.png',
    atlas: '/assets/sprites/ui/buttons.json'
  },

  // Effects
  explosion: {
    key: 'explosion',
    path: '/assets/sprites/effects/explosion.png',
    frameWidth: 64,
    frameHeight: 64,
    frames: 8
  }
}

export const ANIMATION_CONFIGS: Record<string, AnimationConfig> = {
  // Player animations
  'player-idle': {
    key: 'player-idle',
    frames: 'player_idle',
    frameRate: 8,
    repeat: -1
  },
  
  'player-walk': {
    key: 'player-walk', 
    frames: 'player_walk',
    frameRate: 12,
    repeat: -1
  },

  'player-attack': {
    key: 'player-attack',
    frames: 'player_attack', 
    frameRate: 15,
    repeat: 0
  },

  // Enemy animations
  'goblin-idle': {
    key: 'goblin-idle',
    frames: 'goblin_idle',
    frameRate: 6,
    repeat: -1
  },

  // Effects
  'explosion-effect': {
    key: 'explosion-effect',
    frames: 'explosion',
    frameRate: 20,
    repeat: 0
  }
}
```

## Sprite Loading

### 1. Preloader Scene

Create `/src/game/scenes/PreloaderScene.ts`:

```typescript
import * as Phaser from 'phaser'
import { SPRITE_CONFIGS, ANIMATION_CONFIGS } from '@/game/config/AssetConfig'

export default class PreloaderScene extends Phaser.Scene {
  private loadingBar!: Phaser.GameObjects.Graphics
  private progressBar!: Phaser.GameObjects.Graphics
  private loadingText!: Phaser.GameObjects.Text
  private percentText!: Phaser.GameObjects.Text

  constructor() {
    super('PreloaderScene')
  }

  preload() {
    this.createLoadingScreen()
    this.loadSprites()
    this.setupLoadingEvents()
  }

  private createLoadingScreen(): void {
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000)

    // Loading text
    this.loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontSize: '32px',
      color: '#ffffff'
    }).setOrigin(0.5)

    // Progress bar background
    this.loadingBar = this.add.graphics()
    this.loadingBar.fillStyle(0x222222)
    this.loadingBar.fillRect(width / 2 - 200, height / 2, 400, 20)

    // Progress bar
    this.progressBar = this.add.graphics()

    // Percentage text
    this.percentText = this.add.text(width / 2, height / 2 + 50, '0%', {
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5)
  }

  private loadSprites(): void {
    // Set base URL for assets
    this.load.setBaseURL('')

    // Load sprites from config
    Object.values(SPRITE_CONFIGS).forEach(config => {
      if (config.atlas) {
        // Load texture atlas
        this.load.atlas(config.key, config.path, config.atlas)
      } else if (config.frameWidth && config.frameHeight) {
        // Load sprite sheet
        this.load.spritesheet(config.key, config.path, {
          frameWidth: config.frameWidth,
          frameHeight: config.frameHeight,
          endFrame: config.frames
        })
      } else {
        // Load single image
        this.load.image(config.key, config.path)
      }
    })

    // Load additional assets
    this.loadAudioAssets()
    this.loadDataAssets()
  }

  private loadAudioAssets(): void {
    // Sound effects
    this.load.audio('click', '/assets/audio/sfx/click.mp3')
    this.load.audio('explosion', '/assets/audio/sfx/explosion.mp3')
    this.load.audio('footstep', '/assets/audio/sfx/footstep.mp3')

    // Background music
    this.load.audio('menu-music', '/assets/audio/music/menu.mp3')
    this.load.audio('game-music', '/assets/audio/music/game.mp3')
  }

  private loadDataAssets(): void {
    // Level data
    this.load.json('level1', '/assets/data/levels/level1.json')
    this.load.json('level2', '/assets/data/levels/level2.json')

    // Configuration files
    this.load.json('game-config', '/assets/data/configs/game-config.json')
  }

  private setupLoadingEvents(): void {
    // Update progress bar
    this.load.on('progress', (value: number) => {
      this.progressBar.clear()
      this.progressBar.fillStyle(0x00ff00)
      this.progressBar.fillRect(this.cameras.main.width / 2 - 200, this.cameras.main.height / 2, 400 * value, 20)
      
      this.percentText.setText(`${Math.round(value * 100)}%`)
    })

    // Loading complete
    this.load.on('complete', () => {
      this.loadingText.setText('Complete!')
      
      // Small delay before transitioning
      this.time.delayedCall(500, () => {
        this.createAnimations()
        this.scene.start('MainMenuScene')
      })
    })

    // Handle loading errors
    this.load.on('loaderror', (file: any) => {
      console.error('Failed to load asset:', file.key, file.src)
      this.loadingText.setText('Loading Error!')
      this.loadingText.setTint(0xff0000)
    })
  }

  private createAnimations(): void {
    // Create animations from config
    Object.values(ANIMATION_CONFIGS).forEach(animConfig => {
      if (!this.anims.exists(animConfig.key)) {
        // Generate frame names based on animation key
        const frames = this.generateFrameNames(animConfig.frames)
        
        this.anims.create({
          key: animConfig.key,
          frames: frames,
          frameRate: animConfig.frameRate,
          repeat: animConfig.repeat,
          yoyo: animConfig.yoyo || false
        })
      }
    })
  }

  private generateFrameNames(framePattern: string | number[]): Phaser.Types.Animations.AnimationFrame[] {
    if (Array.isArray(framePattern)) {
      // Use specific frame numbers
      return framePattern.map(frame => ({ key: 'player', frame }))
    }

    // Generate frames based on pattern
    switch (framePattern) {
      case 'player_idle':
        return this.anims.generateFrameNumbers('player', { start: 0, end: 3 })
      case 'player_walk':
        return this.anims.generateFrameNumbers('player', { start: 4, end: 7 })
      case 'player_attack':
        return this.anims.generateFrameNumbers('player', { start: 8, end: 11 })
      case 'goblin_idle':
        return this.anims.generateFrameNumbers('goblin', { start: 0, end: 3 })
      case 'explosion':
        return this.anims.generateFrameNumbers('explosion', { start: 0, end: 7 })
      default:
        console.warn(`Unknown frame pattern: ${framePattern}`)
        return []
    }
  }
}
```

### 2. Asset Manager

Create `/src/game/core/AssetManager.ts`:

```typescript
import type { Scene } from 'phaser'

export class AssetManager {
  private scene: Scene
  private loadedAssets: Set<string> = new Set()

  constructor(scene: Scene) {
    this.scene = scene
  }

  // Check if asset is loaded
  isAssetLoaded(key: string): boolean {
    return this.loadedAssets.has(key)
  }

  // Load single asset at runtime
  async loadAsset(key: string, path: string, type: 'image' | 'spritesheet' | 'atlas'): Promise<void> {
    if (this.isAssetLoaded(key)) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      this.scene.load.once('complete', () => {
        this.loadedAssets.add(key)
        resolve()
      })

      this.scene.load.once('loaderror', reject)

      switch (type) {
        case 'image':
          this.scene.load.image(key, path)
          break
        case 'spritesheet':
          // You'd need to pass additional parameters for spritesheet
          break
        case 'atlas':
          // You'd need the atlas JSON path
          break
      }

      this.scene.load.start()
    })
  }

  // Unload asset to free memory
  unloadAsset(key: string): void {
    if (this.scene.textures.exists(key)) {
      this.scene.textures.remove(key)
      this.loadedAssets.delete(key)
    }
  }

  // Get asset info
  getAssetInfo(key: string): any {
    if (this.scene.textures.exists(key)) {
      return this.scene.textures.get(key)
    }
    return null
  }

  // Preload assets for a specific level
  async preloadLevelAssets(levelAssets: string[]): Promise<void> {
    const loadPromises = levelAssets.map(asset => {
      // Load based on asset configuration
      // This would reference your SPRITE_CONFIGS
      return this.loadAsset(asset, `/assets/sprites/${asset}.png`, 'image')
    })

    await Promise.all(loadPromises)
  }
}
```

## Animation System

### 1. Animation Manager

Create `/src/game/core/AnimationManager.ts`:

```typescript
import type { Scene } from 'phaser'
import { ANIMATION_CONFIGS } from '@/game/config/AssetConfig'

export class AnimationManager {
  private scene: Scene
  private animationCache: Map<string, Phaser.Animations.Animation> = new Map()

  constructor(scene: Scene) {
    this.scene = scene
  }

  // Create character-specific animations
  createCharacterAnimations(characterKey: string): void {
    const directions = ['idle', 'walk', 'attack', 'death']
    const facings = ['', '_left', '_right', '_up', '_down']

    directions.forEach(direction => {
      facings.forEach(facing => {
        const animKey = `${characterKey}_${direction}${facing}`
        
        if (!this.scene.anims.exists(animKey)) {
          const frames = this.generateCharacterFrames(characterKey, direction, facing)
          
          if (frames.length > 0) {
            const animation = this.scene.anims.create({
              key: animKey,
              frames: frames,
              frameRate: this.getFrameRate(direction),
              repeat: this.getRepeatValue(direction),
              yoyo: direction === 'idle'
            })

            this.animationCache.set(animKey, animation)
          }
        }
      })
    })
  }

  // Generate frames for character animations
  private generateCharacterFrames(
    characterKey: string, 
    direction: string, 
    facing: string
  ): Phaser.Types.Animations.AnimationFrame[] {
    // Frame mappings for different animation types
    const frameRanges: Record<string, { start: number; end: number }> = {
      idle: { start: 0, end: 3 },
      walk: { start: 4, end: 7 },
      attack: { start: 8, end: 11 },
      death: { start: 12, end: 15 }
    }

    const range = frameRanges[direction]
    if (!range) return []

    // Adjust frame range based on facing direction
    const facingOffset = this.getFacingOffset(facing)
    
    return this.scene.anims.generateFrameNumbers(characterKey, {
      start: range.start + facingOffset,
      end: range.end + facingOffset
    })
  }

  private getFacingOffset(facing: string): number {
    const offsets: Record<string, number> = {
      '': 0,           // Default/down
      '_left': 16,     // Left facing
      '_right': 32,    // Right facing  
      '_up': 48,       // Up facing
      '_down': 0       // Down facing (same as default)
    }
    return offsets[facing] || 0
  }

  private getFrameRate(direction: string): number {
    const frameRates: Record<string, number> = {
      idle: 4,
      walk: 8,
      attack: 12,
      death: 6
    }
    return frameRates[direction] || 8
  }

  private getRepeatValue(direction: string): number {
    const repeats: Record<string, number> = {
      idle: -1,    // Loop forever
      walk: -1,    // Loop forever
      attack: 0,   // Play once
      death: 0     // Play once
    }
    return repeats[direction] || -1
  }

  // Create effect animations
  createEffectAnimations(): void {
    const effects = ['explosion', 'magic-bolt', 'heal', 'shield']
    
    effects.forEach(effect => {
      if (!this.scene.anims.exists(effect)) {
        const frames = this.scene.anims.generateFrameNumbers(effect, {
          start: 0,
          end: 7 // Assume 8 frames for effects
        })

        this.scene.anims.create({
          key: effect,
          frames: frames,
          frameRate: 15,
          repeat: 0,
          hideOnComplete: true // Remove sprite when animation completes
        })
      }
    })
  }

  // Play animation with callback
  playAnimation(
    sprite: Phaser.GameObjects.Sprite,
    animationKey: string,
    onComplete?: () => void
  ): void {
    if (onComplete) {
      sprite.once('animationcomplete', onComplete)
    }
    
    sprite.play(animationKey)
  }

  // Chain animations
  chainAnimations(
    sprite: Phaser.GameObjects.Sprite,
    animations: Array<{ key: string; onComplete?: () => void }>
  ): void {
    let currentIndex = 0

    const playNext = () => {
      if (currentIndex < animations.length) {
        const anim = animations[currentIndex]
        currentIndex++

        sprite.once('animationcomplete', () => {
          anim.onComplete?.()
          playNext()
        })

        sprite.play(anim.key)
      }
    }

    playNext()
  }

  // Get animation duration
  getAnimationDuration(animationKey: string): number {
    const animation = this.scene.anims.get(animationKey)
    if (animation) {
      return (animation.frames.length / animation.frameRate) * 1000
    }
    return 0
  }

  // Check if animation exists
  hasAnimation(animationKey: string): boolean {
    return this.scene.anims.exists(animationKey)
  }

  // Create tween-based animations (for non-frame animations)
  createTweenAnimation(
    target: any,
    properties: any,
    duration: number,
    ease: string = 'Power2'
  ): Phaser.Tweens.Tween {
    return this.scene.tweens.add({
      targets: target,
      ...properties,
      duration: duration,
      ease: ease
    })
  }
}

// Utility function to create animations globally
export function createCharacterAnimations(
  anims: Phaser.Animations.AnimationManager,
  characterKey: string
): void {
  const animManager = new AnimationManager({ anims } as Scene)
  animManager.createCharacterAnimations(characterKey)
}
```

### 2. Animation Controller

Create `/src/game/components/AnimationController.ts`:

```typescript
export class AnimationController {
  private sprite: Phaser.GameObjects.Sprite
  private currentAnimation: string | null = null
  private animationQueue: string[] = []
  private isPlaying: boolean = false

  constructor(sprite: Phaser.GameObjects.Sprite) {
    this.sprite = sprite
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.sprite.on('animationstart', (animation: any) => {
      this.isPlaying = true
      this.currentAnimation = animation.key
    })

    this.sprite.on('animationcomplete', () => {
      this.isPlaying = false
      this.currentAnimation = null
      this.playNextInQueue()
    })
  }

  // Play animation immediately
  play(animationKey: string, force: boolean = false): void {
    if (force || !this.isPlaying) {
      this.sprite.play(animationKey)
    } else {
      this.queueAnimation(animationKey)
    }
  }

  // Queue animation to play after current one
  queueAnimation(animationKey: string): void {
    this.animationQueue.push(animationKey)
  }

  // Play next animation in queue
  private playNextInQueue(): void {
    if (this.animationQueue.length > 0) {
      const nextAnimation = this.animationQueue.shift()!
      this.sprite.play(nextAnimation)
    }
  }

  // Stop current animation
  stop(): void {
    this.sprite.stop()
    this.isPlaying = false
    this.currentAnimation = null
    this.animationQueue = []
  }

  // Pause current animation
  pause(): void {
    this.sprite.pause()
  }

  // Resume paused animation
  resume(): void {
    this.sprite.resume()
  }

  // Check if specific animation is playing
  isPlayingAnimation(animationKey: string): boolean {
    return this.currentAnimation === animationKey && this.isPlaying
  }

  // Get current animation progress (0-1)
  getProgress(): number {
    if (this.sprite.anims.currentAnim) {
      return this.sprite.anims.getProgress()
    }
    return 0
  }

  // Set animation speed multiplier
  setSpeed(speed: number): void {
    if (this.sprite.anims.currentAnim) {
      this.sprite.anims.setTimeScale(speed)
    }
  }

  // Clear animation queue
  clearQueue(): void {
    this.animationQueue = []
  }
}
```

## Sprite Classes

### 1. Base Sprite Class

Create `/src/game/sprites/BaseSprite.ts`:

```typescript
import * as Phaser from 'phaser'
import { AnimationController } from '@/game/components/AnimationController'

export abstract class BaseSprite extends Phaser.GameObjects.Sprite {
  protected animationController: AnimationController
  protected spriteKey: string
  protected isDestroyed: boolean = false

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | number
  ) {
    super(scene, x, y, texture, frame)
    
    this.spriteKey = texture
    this.animationController = new AnimationController(this)
    
    // Add to scene
    scene.add.existing(this)
    
    // Initialize sprite
    this.initialize()
  }

  protected abstract initialize(): void

  // Animation methods
  protected playAnimation(key: string, force: boolean = false): void {
    this.animationController.play(key, force)
  }

  protected queueAnimation(key: string): void {
    this.animationController.queueAnimation(key)
  }

  protected stopAnimation(): void {
    this.animationController.stop()
  }

  // Update method called each frame
  public update(time: number, delta: number): void {
    if (this.isDestroyed) return
    
    this.updateSprite(time, delta)
  }

  protected abstract updateSprite(time: number, delta: number): void

  // Cleanup
  public destroy(fromScene?: boolean): void {
    this.isDestroyed = true
    this.animationController.stop()
    super.destroy(fromScene)
  }

  // Utility methods
  protected fadeIn(duration: number = 500): Promise<void> {
    return new Promise(resolve => {
      this.setAlpha(0)
      this.scene.tweens.add({
        targets: this,
        alpha: 1,
        duration: duration,
        onComplete: () => resolve()
      })
    })
  }

  protected fadeOut(duration: number = 500): Promise<void> {
    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        duration: duration,
        onComplete: () => resolve()
      })
    })
  }

  protected flash(color: number = 0xffffff, duration: number = 200): void {
    this.setTint(color)
    this.scene.time.delayedCall(duration, () => {
      this.clearTint()
    })
  }

  protected shake(intensity: number = 5, duration: number = 200): void {
    const originalX = this.x
    const originalY = this.y

    this.scene.tweens.add({
      targets: this,
      x: originalX + Phaser.Math.Between(-intensity, intensity),
      y: originalY + Phaser.Math.Between(-intensity, intensity),
      duration: 50,
      yoyo: true,
      repeat: Math.floor(duration / 100),
      onComplete: () => {
        this.setPosition(originalX, originalY)
      }
    })
  }
}
```

### 2. Character Sprite Class

Create `/src/game/sprites/CharacterSprite.ts`:

```typescript
import { BaseSprite } from './BaseSprite'

export interface CharacterConfig {
  health: number
  speed: number
  attackDamage: number
  scale?: number
}

export abstract class CharacterSprite extends BaseSprite {
  protected config: CharacterConfig
  protected health: number
  protected maxHealth: number
  protected isMoving: boolean = false
  protected direction: 'idle' | 'left' | 'right' | 'up' | 'down' = 'idle'

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    config: CharacterConfig
  ) {
    super(scene, x, y, texture)
    
    this.config = config
    this.health = config.health
    this.maxHealth = config.health
    
    if (config.scale) {
      this.setScale(config.scale)
    }
  }

  protected initialize(): void {
    // Setup physics if needed
    this.scene.physics.add.existing(this)
    
    // Set initial animation
    this.playAnimation(`${this.spriteKey}_idle`)
  }

  // Movement
  public move(velocityX: number, velocityY: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body
    body.setVelocity(velocityX * this.config.speed, velocityY * this.config.speed)
    
    this.updateMovementAnimation(velocityX, velocityY)
  }

  private updateMovementAnimation(velocityX: number, velocityY: number): void {
    const wasMoving = this.isMoving
    this.isMoving = velocityX !== 0 || velocityY !== 0
    
    let newDirection = this.direction

    if (this.isMoving) {
      // Determine direction based on velocity
      if (Math.abs(velocityX) > Math.abs(velocityY)) {
        newDirection = velocityX > 0 ? 'right' : 'left'
      } else {
        newDirection = velocityY > 0 ? 'down' : 'up'
      }
    } else {
      newDirection = 'idle'
    }

    // Play animation if direction changed
    if (newDirection !== this.direction || (this.isMoving !== wasMoving)) {
      this.direction = newDirection
      const animKey = `${this.spriteKey}_${newDirection}`
      this.playAnimation(animKey)
    }
  }

  // Combat
  public takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount)
    
    // Visual feedback
    this.flash(0xff0000, 150)
    this.shake(3, 200)
    
    if (this.health <= 0) {
      this.die()
    }
  }

  public heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount)
    
    // Visual feedback
    this.flash(0x00ff00, 150)
  }

  protected die(): void {
    this.playAnimation(`${this.spriteKey}_death`)
    
    // Disable physics
    const body = this.body as Phaser.Physics.Arcade.Body
    body.setVelocity(0, 0)
    
    // Remove after death animation
    this.once('animationcomplete', () => {
      this.fadeOut(500).then(() => {
        this.destroy()
      })
    })
  }

  // Abstract methods for subclasses
  public abstract attack(): void

  protected updateSprite(time: number, delta: number): void {
    // Override in subclasses for specific behavior
  }

  // Getters
  public getHealth(): number { return this.health }
  public getMaxHealth(): number { return this.maxHealth }
  public isAlive(): boolean { return this.health > 0 }
  public getDirection(): string { return this.direction }
}
```

### 3. Effect Sprite Class

Create `/src/game/sprites/EffectSprite.ts`:

```typescript
import { BaseSprite } from './BaseSprite'

export interface EffectConfig {
  duration?: number
  autoDestroy?: boolean
  scale?: number
  followTarget?: Phaser.GameObjects.GameObject
}

export class EffectSprite extends BaseSprite {
  private config: EffectConfig
  private startTime: number
  private followTarget?: Phaser.GameObjects.GameObject

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    config: EffectConfig = {}
  ) {
    super(scene, x, y, texture)
    
    this.config = {
      duration: 1000,
      autoDestroy: true,
      scale: 1,
      ...config
    }
    
    this.followTarget = config.followTarget
    this.startTime = scene.time.now
  }

  protected initialize(): void {
    if (this.config.scale) {
      this.setScale(this.config.scale)
    }

    // Play effect animation
    this.playAnimation(this.spriteKey)
    
    // Auto-destroy after animation or duration
    if (this.config.autoDestroy) {
      if (this.config.duration) {
        this.scene.time.delayedCall(this.config.duration, () => {
          this.destroy()
        })
      } else {
        this.once('animationcomplete', () => {
          this.destroy()
        })
      }
    }
  }

  protected updateSprite(time: number, delta: number): void {
    // Follow target if specified
    if (this.followTarget && !this.followTarget.active) {
      this.destroy()
      return
    }

    if (this.followTarget) {
      this.setPosition(
        this.followTarget.x,
        this.followTarget.y
      )
    }
  }

  // Create static effect at position
  static createAt(
    scene: Phaser.Scene,
    x: number,
    y: number,
    effectKey: string,
    config?: EffectConfig
  ): EffectSprite {
    return new EffectSprite(scene, x, y, effectKey, config)
  }

  // Create effect that follows a target
  static createFollowing(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.GameObject,
    effectKey: string,
    config?: EffectConfig
  ): EffectSprite {
    return new EffectSprite(scene, target.x, target.y, effectKey, {
      ...config,
      followTarget: target
    })
  }
}
```

## Performance Optimization

### 1. Sprite Pooling

Create `/src/game/core/SpritePool.ts`:

```typescript
export class SpritePool<T extends Phaser.GameObjects.Sprite> {
  private pool: T[] = []
  private createFunction: () => T
  private resetFunction?: (sprite: T) => void
  private maxSize: number

  constructor(
    createFunction: () => T,
    resetFunction?: (sprite: T) => void,
    maxSize: number = 100
  ) {
    this.createFunction = createFunction
    this.resetFunction = resetFunction
    this.maxSize = maxSize
  }

  // Get sprite from pool or create new one
  get(): T {
    let sprite = this.pool.pop()
    
    if (!sprite) {
      sprite = this.createFunction()
    }
    
    sprite.setActive(true)
    sprite.setVisible(true)
    
    return sprite
  }

  // Return sprite to pool
  release(sprite: T): void {
    if (this.pool.length < this.maxSize) {
      sprite.setActive(false)
      sprite.setVisible(false)
      
      // Reset sprite state
      if (this.resetFunction) {
        this.resetFunction(sprite)
      }
      
      this.pool.push(sprite)
    } else {
      // Pool is full, destroy sprite
      sprite.destroy()
    }
  }

  // Preload pool with sprites
  preload(count: number): void {
    for (let i = 0; i < count; i++) {
      const sprite = this.createFunction()
      sprite.setActive(false)
      sprite.setVisible(false)
      this.pool.push(sprite)
    }
  }

  // Clear entire pool
  clear(): void {
    this.pool.forEach(sprite => sprite.destroy())
    this.pool = []
  }

  // Get pool statistics
  getStats(): { poolSize: number; maxSize: number } {
    return {
      poolSize: this.pool.length,
      maxSize: this.maxSize
    }
  }
}
```

### 2. Texture Atlas Management

Create `/src/game/core/TextureManager.ts`:

```typescript
export class TextureManager {
  private scene: Phaser.Scene
  private atlasCache: Map<string, boolean> = new Map()

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  // Create texture atlas from individual images
  createAtlas(
    atlasKey: string,
    images: Array<{ key: string; path: string }>,
    frameWidth: number,
    frameHeight: number
  ): void {
    if (this.atlasCache.has(atlasKey)) return

    // Create canvas for atlas
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    
    // Calculate atlas dimensions
    const cols = Math.ceil(Math.sqrt(images.length))
    const rows = Math.ceil(images.length / cols)
    
    canvas.width = cols * frameWidth
    canvas.height = rows * frameHeight

    // Load and draw images to atlas
    let loadedCount = 0
    const frames: any = {}

    images.forEach((img, index) => {
      const image = new Image()
      image.onload = () => {
        const col = index % cols
        const row = Math.floor(index / cols)
        
        ctx.drawImage(
          image,
          col * frameWidth,
          row * frameHeight,
          frameWidth,
          frameHeight
        )

        frames[img.key] = {
          frame: {
            x: col * frameWidth,
            y: row * frameHeight,
            w: frameWidth,
            h: frameHeight
          }
        }

        loadedCount++
        if (loadedCount === images.length) {
          // Create texture from canvas
          this.scene.textures.addCanvas(atlasKey, canvas)
          
          // Add frame data
          Object.entries(frames).forEach(([key, frameData]) => {
            this.scene.textures.addFrame(atlasKey, key, frameData.frame.x, frameData.frame.y, frameData.frame.w, frameData.frame.h)
          })
          
          this.atlasCache.set(atlasKey, true)
        }
      }
      image.src = img.path
    })
  }

  // Optimize texture for performance
  optimizeTexture(textureKey: string): void {
    const texture = this.scene.textures.get(textureKey)
    if (texture) {
      // Enable texture filtering for smooth scaling
      texture.setFilter(Phaser.Textures.FilterMode.LINEAR)
    }
  }

  // Compress texture (reduce quality for better performance)
  compressTexture(textureKey: string, quality: number = 0.8): void {
    const texture = this.scene.textures.get(textureKey)
    if (texture && texture.source[0].image instanceof HTMLCanvasElement) {
      const canvas = texture.source[0].image
      const ctx = canvas.getContext('2d')!
      
      // Create compressed version
      const compressedCanvas = document.createElement('canvas')
      const compressedCtx = compressedCanvas.getContext('2d')!
      
      compressedCanvas.width = canvas.width
      compressedCanvas.height = canvas.height
      
      // Draw with reduced quality
      compressedCtx.imageSmoothingQuality = 'low'
      compressedCtx.drawImage(canvas, 0, 0)
      
      // Replace original texture
      this.scene.textures.addCanvas(`${textureKey}_compressed`, compressedCanvas)
    }
  }

  // Unload unused textures
  unloadTextures(textureKeys: string[]): void {
    textureKeys.forEach(key => {
      if (this.scene.textures.exists(key)) {
        this.scene.textures.remove(key)
        this.atlasCache.delete(key)
      }
    })
  }
}
```

## Advanced Techniques

### 1. Dynamic Sprite Generation

```typescript
export class SpriteGenerator {
  private scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  // Generate procedural character variations
  generateCharacterVariation(
    baseTexture: string,
    variations: {
      skinColor?: number
      hairColor?: number
      equipmentTint?: number
    }
  ): string {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    
    const baseImage = this.scene.textures.get(baseTexture).source[0].image
    canvas.width = baseImage.width
    canvas.height = baseImage.height
    
    // Draw base character
    ctx.drawImage(baseImage, 0, 0)
    
    // Apply variations
    if (variations.skinColor) {
      this.tintCanvasArea(ctx, variations.skinColor, 'skin')
    }
    
    if (variations.hairColor) {
      this.tintCanvasArea(ctx, variations.hairColor, 'hair')
    }
    
    // Create unique texture
    const variationKey = `${baseTexture}_variation_${Date.now()}`
    this.scene.textures.addCanvas(variationKey, canvas)
    
    return variationKey
  }

  private tintCanvasArea(ctx: CanvasRenderingContext2D, color: number, area: string): void {
    // Implementation would depend on how you identify different areas
    // This is a simplified example
    ctx.globalCompositeOperation = 'multiply'
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`
    
    // Define areas based on your sprite layout
    const areas: Record<string, { x: number; y: number; w: number; h: number }> = {
      skin: { x: 0, y: 0, w: 32, h: 32 },
      hair: { x: 0, y: 0, w: 32, h: 16 }
    }
    
    const areaRect = areas[area]
    if (areaRect) {
      ctx.fillRect(areaRect.x, areaRect.y, areaRect.w, areaRect.h)
    }
    
    ctx.globalCompositeOperation = 'source-over'
  }
}
```

### 2. Sprite Batching

```typescript
export class SpriteBatch {
  private scene: Phaser.Scene
  private batches: Map<string, Phaser.GameObjects.Group> = new Map()

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  // Create batch for similar sprites
  createBatch(batchKey: string, textureKey: string): Phaser.GameObjects.Group {
    const batch = this.scene.add.group({
      classType: Phaser.GameObjects.Sprite,
      defaultKey: textureKey,
      maxSize: 100
    })

    this.batches.set(batchKey, batch)
    return batch
  }

  // Add sprite to batch
  addToBatch(batchKey: string, x: number, y: number, frame?: string | number): Phaser.GameObjects.Sprite {
    const batch = this.batches.get(batchKey)
    if (!batch) {
      throw new Error(`Batch ${batchKey} not found`)
    }

    const sprite = batch.get(x, y, undefined, frame) as Phaser.GameObjects.Sprite
    sprite.setActive(true)
    sprite.setVisible(true)
    
    return sprite
  }

  // Remove sprite from batch
  removeFromBatch(batchKey: string, sprite: Phaser.GameObjects.Sprite): void {
    const batch = this.batches.get(batchKey)
    if (batch) {
      batch.killAndHide(sprite)
    }
  }

  // Update all sprites in batch
  updateBatch(batchKey: string, updateFunction: (sprite: Phaser.GameObjects.Sprite) => void): void {
    const batch = this.batches.get(batchKey)
    if (batch) {
      batch.children.entries.forEach(child => {
        if (child.active) {
          updateFunction(child as Phaser.GameObjects.Sprite)
        }
      })
    }
  }
}
```

## Best Practices

### 1. Performance Guidelines

- **Use Texture Atlases**: Combine multiple small textures into larger atlases
- **Implement Object Pooling**: Reuse sprites instead of creating/destroying frequently
- **Optimize Animation Frame Rates**: Use appropriate frame rates for different animation types
- **Batch Similar Sprites**: Group sprites with the same texture for better rendering performance
- **Unload Unused Assets**: Remove textures when switching levels or scenes

### 2. Organization Guidelines

- **Consistent Naming**: Use clear, consistent naming conventions
- **Modular Structure**: Separate concerns into different classes and managers
- **Configuration-Driven**: Use configuration files for sprites and animations
- **Type Safety**: Use TypeScript interfaces for better development experience
- **Error Handling**: Implement proper error handling for asset loading

### 3. Memory Management

- **Asset Lifecycle**: Track and manage asset loading/unloading
- **Sprite Cleanup**: Properly destroy sprites and remove event listeners
- **Animation Management**: Stop animations before destroying sprites
- **Texture Limits**: Monitor texture memory usage and implement limits

### 4. Development Workflow

- **Asset Pipeline**: Establish clear workflow for creating and optimizing assets
- **Testing**: Test on various devices and screen sizes
- **Performance Monitoring**: Track FPS and memory usage during development
- **Version Control**: Use proper version control for asset files

## Next Steps

1. **Read Scenes.md** - Learn scene management and transitions
2. **Read Physics.md** - Understand collision detection and movement
3. **Read StateManagement.md** - Implement cross-system state management
4. **Read AssetManagement.md** - Deep dive into asset optimization

This sprite system provides a comprehensive foundation for managing all visual elements in your Phaser games, from simple static sprites to complex animated characters with sophisticated behavior patterns. 