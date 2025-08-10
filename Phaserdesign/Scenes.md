# Scene Management Guide
*Complete Guide to Phaser Scene Architecture and Transitions*

## Table of Contents
1. [Overview](#overview)
2. [Scene Architecture](#scene-architecture)
3. [Scene Lifecycle](#scene-lifecycle)
4. [Scene Communication](#scene-communication)
5. [Transitions and Effects](#transitions-and-effects)
6. [Data Management](#data-management)
7. [Performance Optimization](#performance-optimization)
8. [Best Practices](#best-practices)

## Overview

Scenes are the core building blocks of Phaser games, each representing a distinct state or screen. This guide covers how to architect, manage, and transition between scenes effectively while maintaining clean code and optimal performance.

### Key Concepts

- **Scene Lifecycle**: Understanding init, preload, create, and update phases
- **Scene Management**: Starting, stopping, and switching between scenes
- **Data Flow**: Passing data between scenes and maintaining state
- **Transitions**: Creating smooth visual transitions between scenes
- **Performance**: Optimizing scene loading and memory usage

## Scene Architecture

### 1. Base Scene Class

Create `/src/game/scenes/BaseScene.ts`:

```typescript
import * as Phaser from 'phaser'
import EventBus from '@/lib/EventBus'
import { AssetManager } from '@/game/core/AssetManager'
import { AnimationManager } from '@/game/core/AnimationManager'

export interface SceneConfig {
  key: string
  backgroundColor?: number
  physics?: boolean
  preloadAssets?: string[]
  requiredData?: string[]
}

export abstract class BaseScene extends Phaser.Scene {
  protected assetManager: AssetManager
  protected animationManager: AnimationManager
  protected sceneData: any = {}
  protected isInitialized: boolean = false
  protected config: SceneConfig

  constructor(config: SceneConfig) {
    super(config.key)
    this.config = config
  }

  // Abstract methods that must be implemented
  protected abstract initializeScene(): void
  protected abstract createSceneContent(): void
  protected abstract updateScene(time: number, delta: number): void

  // Phaser lifecycle methods
  init(data?: any): void {
    console.log(`Initializing scene: ${this.config.key}`)
    
    // Store passed data
    this.sceneData = data || {}
    
    // Validate required data
    if (this.config.requiredData) {
      this.validateRequiredData()
    }

    // Initialize managers
    this.assetManager = new AssetManager(this)
    this.animationManager = new AnimationManager(this)
    
    // Set background color
    if (this.config.backgroundColor) {
      this.cameras.main.setBackgroundColor(this.config.backgroundColor)
    }

    // Initialize physics if needed
    if (this.config.physics) {
      this.physics.world.setBounds(0, 0, this.cameras.main.width, this.cameras.main.height)
    }

    // Call scene-specific initialization
    this.initializeScene()
    
    this.isInitialized = true
  }

  preload(): void {
    console.log(`Preloading assets for scene: ${this.config.key}`)
    
    // Load scene-specific assets
    if (this.config.preloadAssets) {
      this.loadSceneAssets()
    }

    // Setup loading progress
    this.setupLoadingProgress()
  }

  create(): void {
    console.log(`Creating scene content: ${this.config.key}`)
    
    // Emit scene change event
    EventBus.emit('sceneChanged', this.config.key)
    
    // Create animations
    this.createSceneAnimations()
    
    // Create scene content
    this.createSceneContent()
    
    // Setup input handlers
    this.setupInputHandlers()
    
    // Setup scene events
    this.setupSceneEvents()
  }

  update(time: number, delta: number): void {
    if (!this.isInitialized) return
    
    this.updateScene(time, delta)
  }

  // Utility methods
  private validateRequiredData(): void {
    this.config.requiredData?.forEach(key => {
      if (!(key in this.sceneData)) {
        throw new Error(`Required data '${key}' missing for scene '${this.config.key}'`)
      }
    })
  }

  private loadSceneAssets(): void {
    this.config.preloadAssets?.forEach(assetKey => {
      // Load based on asset type - this would reference your asset config
      console.log(`Loading asset: ${assetKey}`)
    })
  }

  private setupLoadingProgress(): void {
    this.load.on('progress', (value: number) => {
      EventBus.emit('loadingProgress', {
        scene: this.config.key,
        progress: value
      })
    })

    this.load.on('complete', () => {
      EventBus.emit('loadingComplete', this.config.key)
    })
  }

  private createSceneAnimations(): void {
    // Create scene-specific animations
    this.animationManager.createCharacterAnimations('player')
    this.animationManager.createEffectAnimations()
  }

  private setupInputHandlers(): void {
    // ESC key to pause/menu
    this.input.keyboard?.on('keydown-ESC', () => {
      this.pauseScene()
    })
  }

  private setupSceneEvents(): void {
    // Handle scene pause/resume
    this.events.on('pause', this.onScenePause, this)
    this.events.on('resume', this.onSceneResume, this)
    this.events.on('shutdown', this.onSceneShutdown, this)
    this.events.on('destroy', this.onSceneDestroy, this)
  }

  // Scene management methods
  protected pauseScene(): void {
    this.scene.pause()
    EventBus.emit('scenePaused', this.config.key)
  }

  protected resumeScene(): void {
    this.scene.resume()
    EventBus.emit('sceneResumed', this.config.key)
  }

  protected switchToScene(sceneKey: string, data?: any): void {
    this.scene.start(sceneKey, data)
  }

  protected startParallelScene(sceneKey: string, data?: any): void {
    this.scene.launch(sceneKey, data)
  }

  protected stopParallelScene(sceneKey: string): void {
    this.scene.stop(sceneKey)
  }

  // Event handlers
  protected onScenePause(): void {
    console.log(`Scene paused: ${this.config.key}`)
  }

  protected onSceneResume(): void {
    console.log(`Scene resumed: ${this.config.key}`)
  }

  protected onSceneShutdown(): void {
    console.log(`Scene shutdown: ${this.config.key}`)
    this.cleanup()
  }

  protected onSceneDestroy(): void {
    console.log(`Scene destroyed: ${this.config.key}`)
  }

  // Cleanup
  protected cleanup(): void {
    // Override in subclasses for custom cleanup
  }

  // Data management
  protected setSceneData(key: string, value: any): void {
    this.sceneData[key] = value
  }

  protected getSceneData(key: string): any {
    return this.sceneData[key]
  }

  protected hasSceneData(key: string): boolean {
    return key in this.sceneData
  }
}
```

### 2. Scene Types

#### Game Scene

Create `/src/game/scenes/GameScene.ts`:

```typescript
import { BaseScene, SceneConfig } from './BaseScene'
import { Player } from '@/game/sprites/Player'
import { EnemyManager } from '@/game/managers/EnemyManager'
import { UIManager } from '@/game/managers/UIManager'

export class GameScene extends BaseScene {
  private player!: Player
  private enemyManager!: EnemyManager
  private uiManager!: UIManager
  private isPaused: boolean = false

  constructor() {
    super({
      key: 'GameScene',
      backgroundColor: 0x2c3e50,
      physics: true,
      preloadAssets: ['player', 'enemies', 'environment'],
      requiredData: ['selectedCharacter', 'level']
    })
  }

  protected initializeScene(): void {
    // Initialize game-specific systems
    this.enemyManager = new EnemyManager(this)
    this.uiManager = new UIManager(this)
  }

  protected createSceneContent(): void {
    // Create game world
    this.createWorld()
    
    // Create player
    this.createPlayer()
    
    // Setup collision detection
    this.setupCollisions()
    
    // Start enemy spawning
    this.enemyManager.startSpawning()
    
    // Setup UI
    this.uiManager.createGameHUD()
  }

  private createWorld(): void {
    const levelData = this.getSceneData('level')
    
    // Create tilemap
    const map = this.make.tilemap({ key: levelData.mapKey })
    const tileset = map.addTilesetImage('tiles', 'tileset')
    
    // Create layers
    const backgroundLayer = map.createLayer('background', tileset, 0, 0)
    const foregroundLayer = map.createLayer('foreground', tileset, 0, 0)
    
    // Set world bounds
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    
    // Camera follows player
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
  }

  private createPlayer(): void {
    const characterData = this.getSceneData('selectedCharacter')
    
    this.player = new Player(this, 400, 300, characterData.texture, characterData.config)
    
    // Camera follows player
    this.cameras.main.startFollow(this.player)
  }

  private setupCollisions(): void {
    // Player vs enemies
    this.physics.add.overlap(
      this.player,
      this.enemyManager.getEnemyGroup(),
      this.handlePlayerEnemyCollision,
      undefined,
      this
    )
  }

  private handlePlayerEnemyCollision(player: any, enemy: any): void {
    if (this.player.isAlive()) {
      this.player.takeDamage(enemy.getDamage())
      
      if (!this.player.isAlive()) {
        this.handlePlayerDeath()
      }
    }
  }

  private handlePlayerDeath(): void {
    this.isPaused = true
    this.physics.pause()
    
    // Show death screen
    this.startParallelScene('PlayerDeathScene', {
      score: this.player.getScore(),
      level: this.getSceneData('level').number
    })
  }

  protected updateScene(time: number, delta: number): void {
    if (this.isPaused) return
    
    // Update player
    this.player.update(time, delta)
    
    // Update enemy manager
    this.enemyManager.update(time, delta)
    
    // Update UI
    this.uiManager.update(time, delta)
  }

  protected onScenePause(): void {
    super.onScenePause()
    this.isPaused = true
    this.physics.pause()
  }

  protected onSceneResume(): void {
    super.onSceneResume()
    this.isPaused = false
    this.physics.resume()
  }

  protected cleanup(): void {
    this.enemyManager?.cleanup()
    this.uiManager?.cleanup()
  }
}
```

#### Menu Scene

Create `/src/game/scenes/MenuScene.ts`:

```typescript
import { BaseScene } from './BaseScene'
import { Button } from '@/game/ui/Button'

export class MenuScene extends BaseScene {
  private buttons: Button[] = []
  private background!: Phaser.GameObjects.Image
  private title!: Phaser.GameObjects.Text

  constructor() {
    super({
      key: 'MenuScene',
      backgroundColor: 0x1a1a2e,
      preloadAssets: ['menu-bg', 'ui-elements']
    })
  }

  protected initializeScene(): void {
    // Menu-specific initialization
  }

  protected createSceneContent(): void {
    const { width, height } = this.cameras.main
    
    // Background
    this.background = this.add.image(width / 2, height / 2, 'menu-bg')
    this.background.setDisplaySize(width, height)
    
    // Title
    this.title = this.add.text(width / 2, 150, 'GAME TITLE', {
      fontSize: '64px',
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5)
    
    // Create menu buttons
    this.createMenuButtons()
    
    // Add entrance animation
    this.playEntranceAnimation()
  }

  private createMenuButtons(): void {
    const { width, height } = this.cameras.main
    const buttonY = height / 2
    const buttonSpacing = 80
    
    const buttonConfigs = [
      { text: 'Play', action: () => this.startGame() },
      { text: 'Options', action: () => this.openOptions() },
      { text: 'Credits', action: () => this.openCredits() },
      { text: 'Exit', action: () => this.exitGame() }
    ]

    buttonConfigs.forEach((config, index) => {
      const button = new Button(
        this,
        width / 2,
        buttonY + (index * buttonSpacing),
        'button',
        config.text,
        config.action
      )
      
      this.buttons.push(button)
    })
  }

  private playEntranceAnimation(): void {
    // Fade in background
    this.background.setAlpha(0)
    this.tweens.add({
      targets: this.background,
      alpha: 1,
      duration: 1000,
      ease: 'Power2'
    })

    // Title slide down
    this.title.setY(-100)
    this.tweens.add({
      targets: this.title,
      y: 150,
      duration: 1500,
      ease: 'Bounce.easeOut',
      delay: 500
    })

    // Buttons fade in staggered
    this.buttons.forEach((button, index) => {
      button.setAlpha(0)
      this.tweens.add({
        targets: button,
        alpha: 1,
        duration: 500,
        delay: 1000 + (index * 200),
        ease: 'Power2'
      })
    })
  }

  private startGame(): void {
    this.playExitAnimation(() => {
      this.switchToScene('CharacterSelectScene')
    })
  }

  private openOptions(): void {
    this.startParallelScene('OptionsScene')
  }

  private openCredits(): void {
    this.startParallelScene('CreditsScene')
  }

  private exitGame(): void {
    // Handle game exit
    window.close()
  }

  private playExitAnimation(onComplete: () => void): void {
    // Fade out everything
    this.tweens.add({
      targets: [this.background, this.title, ...this.buttons],
      alpha: 0,
      duration: 500,
      onComplete: onComplete
    })
  }

  protected updateScene(time: number, delta: number): void {
    // Menu doesn't need frequent updates
  }

  protected cleanup(): void {
    this.buttons.forEach(button => button.destroy())
    this.buttons = []
  }
}
```

## Scene Lifecycle

### 1. Understanding Scene States

```typescript
export enum SceneState {
  PENDING = 'pending',
  LOADING = 'loading', 
  CREATING = 'creating',
  RUNNING = 'running',
  PAUSED = 'paused',
  SLEEPING = 'sleeping',
  SHUTDOWN = 'shutdown',
  DESTROYED = 'destroyed'
}

export class SceneStateManager {
  private currentState: SceneState = SceneState.PENDING
  private scene: Phaser.Scene
  private stateHistory: SceneState[] = []

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.setupStateTracking()
  }

  private setupStateTracking(): void {
    this.scene.events.on('preload', () => this.setState(SceneState.LOADING))
    this.scene.events.on('create', () => this.setState(SceneState.CREATING))
    this.scene.events.on('ready', () => this.setState(SceneState.RUNNING))
    this.scene.events.on('pause', () => this.setState(SceneState.PAUSED))
    this.scene.events.on('resume', () => this.setState(SceneState.RUNNING))
    this.scene.events.on('sleep', () => this.setState(SceneState.SLEEPING))
    this.scene.events.on('shutdown', () => this.setState(SceneState.SHUTDOWN))
    this.scene.events.on('destroy', () => this.setState(SceneState.DESTROYED))
  }

  private setState(newState: SceneState): void {
    this.stateHistory.push(this.currentState)
    this.currentState = newState
    
    console.log(`Scene ${this.scene.scene.key} state changed to: ${newState}`)
    
    // Emit state change event
    EventBus.emit('sceneStateChanged', {
      sceneKey: this.scene.scene.key,
      state: newState,
      previousState: this.stateHistory[this.stateHistory.length - 1]
    })
  }

  getCurrentState(): SceneState {
    return this.currentState
  }

  isInState(state: SceneState): boolean {
    return this.currentState === state
  }

  canTransitionTo(targetState: SceneState): boolean {
    // Define valid state transitions
    const validTransitions: Record<SceneState, SceneState[]> = {
      [SceneState.PENDING]: [SceneState.LOADING],
      [SceneState.LOADING]: [SceneState.CREATING, SceneState.SHUTDOWN],
      [SceneState.CREATING]: [SceneState.RUNNING, SceneState.SHUTDOWN],
      [SceneState.RUNNING]: [SceneState.PAUSED, SceneState.SLEEPING, SceneState.SHUTDOWN],
      [SceneState.PAUSED]: [SceneState.RUNNING, SceneState.SHUTDOWN],
      [SceneState.SLEEPING]: [SceneState.RUNNING, SceneState.SHUTDOWN],
      [SceneState.SHUTDOWN]: [SceneState.DESTROYED],
      [SceneState.DESTROYED]: []
    }

    return validTransitions[this.currentState]?.includes(targetState) || false
  }
}
```

### 2. Scene Loading Manager

Create `/src/game/core/SceneLoadingManager.ts`:

```typescript
export interface LoadingProgress {
  sceneKey: string
  progress: number
  stage: 'assets' | 'initialization' | 'creation'
  message?: string
}

export class SceneLoadingManager {
  private loadingPromises: Map<string, Promise<void>> = new Map()
  private loadingProgress: Map<string, LoadingProgress> = new Map()

  // Load scene with progress tracking
  async loadScene(sceneKey: string): Promise<void> {
    if (this.loadingPromises.has(sceneKey)) {
      return this.loadingPromises.get(sceneKey)!
    }

    const loadingPromise = this.performSceneLoad(sceneKey)
    this.loadingPromises.set(sceneKey, loadingPromise)

    try {
      await loadingPromise
    } finally {
      this.loadingPromises.delete(sceneKey)
      this.loadingProgress.delete(sceneKey)
    }
  }

  private async performSceneLoad(sceneKey: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Initialize progress tracking
      this.updateProgress(sceneKey, 0, 'assets', 'Loading assets...')

      // Listen for loading events
      EventBus.on('loadingProgress', (data: { scene: string; progress: number }) => {
        if (data.scene === sceneKey) {
          this.updateProgress(sceneKey, data.progress * 0.6, 'assets', 'Loading assets...')
        }
      })

      EventBus.on('loadingComplete', (scene: string) => {
        if (scene === sceneKey) {
          this.updateProgress(sceneKey, 60, 'initialization', 'Initializing scene...')
        }
      })

      EventBus.on('sceneStateChanged', (data: any) => {
        if (data.sceneKey === sceneKey) {
          switch (data.state) {
            case SceneState.CREATING:
              this.updateProgress(sceneKey, 80, 'creation', 'Creating scene content...')
              break
            case SceneState.RUNNING:
              this.updateProgress(sceneKey, 100, 'creation', 'Scene ready!')
              resolve()
              break
            case SceneState.DESTROYED:
              reject(new Error(`Scene ${sceneKey} was destroyed during loading`))
              break
          }
        }
      })

      // Set timeout for loading
      setTimeout(() => {
        reject(new Error(`Scene ${sceneKey} loading timeout`))
      }, 30000) // 30 second timeout
    })
  }

  private updateProgress(
    sceneKey: string,
    progress: number,
    stage: LoadingProgress['stage'],
    message: string
  ): void {
    const progressData: LoadingProgress = {
      sceneKey,
      progress,
      stage,
      message
    }

    this.loadingProgress.set(sceneKey, progressData)

    // Emit progress update
    EventBus.emit('sceneLoadingProgress', progressData)
  }

  // Get current loading progress
  getLoadingProgress(sceneKey: string): LoadingProgress | undefined {
    return this.loadingProgress.get(sceneKey)
  }

  // Check if scene is currently loading
  isSceneLoading(sceneKey: string): boolean {
    return this.loadingPromises.has(sceneKey)
  }

  // Cancel scene loading
  cancelSceneLoading(sceneKey: string): void {
    this.loadingPromises.delete(sceneKey)
    this.loadingProgress.delete(sceneKey)
  }
}
```

## Scene Communication

### 1. Scene Message System

Create `/src/game/core/SceneMessenger.ts`:

```typescript
export interface SceneMessage {
  from: string
  to: string
  type: string
  data?: any
  timestamp: number
}

export class SceneMessenger {
  private static instance: SceneMessenger
  private messageQueue: SceneMessage[] = []
  private messageHandlers: Map<string, Array<(message: SceneMessage) => void>> = new Map()

  static getInstance(): SceneMessenger {
    if (!SceneMessenger.instance) {
      SceneMessenger.instance = new SceneMessenger()
    }
    return SceneMessenger.instance
  }

  // Send message between scenes
  sendMessage(from: string, to: string, type: string, data?: any): void {
    const message: SceneMessage = {
      from,
      to,
      type,
      data,
      timestamp: Date.now()
    }

    // Add to queue
    this.messageQueue.push(message)

    // Process immediately if handler exists
    this.processMessage(message)
  }

  // Register message handler
  registerHandler(sceneKey: string, handler: (message: SceneMessage) => void): void {
    if (!this.messageHandlers.has(sceneKey)) {
      this.messageHandlers.set(sceneKey, [])
    }
    
    this.messageHandlers.get(sceneKey)!.push(handler)
  }

  // Unregister message handler
  unregisterHandler(sceneKey: string, handler: (message: SceneMessage) => void): void {
    const handlers = this.messageHandlers.get(sceneKey)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  // Process message
  private processMessage(message: SceneMessage): void {
    const handlers = this.messageHandlers.get(message.to)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message)
        } catch (error) {
          console.error(`Error processing message in scene ${message.to}:`, error)
        }
      })
    }
  }

  // Get messages for scene
  getMessagesForScene(sceneKey: string): SceneMessage[] {
    return this.messageQueue.filter(msg => msg.to === sceneKey)
  }

  // Clear old messages
  clearOldMessages(maxAge: number = 60000): void {
    const cutoff = Date.now() - maxAge
    this.messageQueue = this.messageQueue.filter(msg => msg.timestamp > cutoff)
  }

  // Broadcast message to all scenes
  broadcast(from: string, type: string, data?: any): void {
    this.messageHandlers.forEach((handlers, sceneKey) => {
      if (sceneKey !== from) {
        this.sendMessage(from, sceneKey, type, data)
      }
    })
  }
}

// Usage example in a scene
export class ExampleScene extends BaseScene {
  private messenger = SceneMessenger.getInstance()

  protected initializeScene(): void {
    // Register message handler
    this.messenger.registerHandler(this.config.key, this.handleMessage.bind(this))
  }

  private handleMessage(message: SceneMessage): void {
    switch (message.type) {
      case 'playerDataUpdate':
        this.updatePlayerData(message.data)
        break
      case 'sceneTransition':
        this.prepareTransition(message.data)
        break
      default:
        console.log(`Unhandled message type: ${message.type}`)
    }
  }

  private sendPlayerData(targetScene: string, playerData: any): void {
    this.messenger.sendMessage(this.config.key, targetScene, 'playerDataUpdate', playerData)
  }

  protected cleanup(): void {
    // Unregister handlers when scene is destroyed
    this.messenger.unregisterHandler(this.config.key, this.handleMessage.bind(this))
  }
}
```

### 2. Global Data Store

Create `/src/game/core/GameDataStore.ts`:

```typescript
export interface GameData {
  player: {
    level: number
    experience: number
    gold: number
    inventory: any[]
    achievements: string[]
  }
  game: {
    currentLevel: number
    score: number
    settings: any
    saveSlot: number
  }
  session: {
    playTime: number
    deaths: number
    enemiesKilled: number
  }
}

export class GameDataStore {
  private static instance: GameDataStore
  private data: GameData
  private subscribers: Map<string, Array<(data: any) => void>> = new Map()

  private constructor() {
    this.data = this.getDefaultData()
    this.loadFromLocalStorage()
  }

  static getInstance(): GameDataStore {
    if (!GameDataStore.instance) {
      GameDataStore.instance = new GameDataStore()
    }
    return GameDataStore.instance
  }

  private getDefaultData(): GameData {
    return {
      player: {
        level: 1,
        experience: 0,
        gold: 0,
        inventory: [],
        achievements: []
      },
      game: {
        currentLevel: 1,
        score: 0,
        settings: {},
        saveSlot: 1
      },
      session: {
        playTime: 0,
        deaths: 0,
        enemiesKilled: 0
      }
    }
  }

  // Get data
  getData<K extends keyof GameData>(category: K): GameData[K] {
    return this.data[category]
  }

  getNestedData<K extends keyof GameData>(category: K, key: keyof GameData[K]): any {
    return this.data[category][key]
  }

  // Set data
  setData<K extends keyof GameData>(category: K, data: Partial<GameData[K]>): void {
    this.data[category] = { ...this.data[category], ...data }
    this.notifySubscribers(category)
    this.saveToLocalStorage()
  }

  setNestedData<K extends keyof GameData>(
    category: K,
    key: keyof GameData[K],
    value: any
  ): void {
    (this.data[category] as any)[key] = value
    this.notifySubscribers(category)
    this.saveToLocalStorage()
  }

  // Subscribe to data changes
  subscribe<K extends keyof GameData>(
    category: K,
    callback: (data: GameData[K]) => void
  ): () => void {
    if (!this.subscribers.has(category)) {
      this.subscribers.set(category, [])
    }

    this.subscribers.get(category)!.push(callback)

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(category)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
      }
    }
  }

  private notifySubscribers<K extends keyof GameData>(category: K): void {
    const callbacks = this.subscribers.get(category)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(this.data[category])
        } catch (error) {
          console.error(`Error in data store subscriber for ${String(category)}:`, error)
        }
      })
    }
  }

  // Persistence
  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('gameData', JSON.stringify(this.data))
    } catch (error) {
      console.error('Failed to save game data to localStorage:', error)
    }
  }

  private loadFromLocalStorage(): void {
    try {
      const saved = localStorage.getItem('gameData')
      if (saved) {
        const parsedData = JSON.parse(saved)
        this.data = { ...this.getDefaultData(), ...parsedData }
      }
    } catch (error) {
      console.error('Failed to load game data from localStorage:', error)
    }
  }

  // Reset data
  resetData(): void {
    this.data = this.getDefaultData()
    this.saveToLocalStorage()
    
    // Notify all subscribers
    Object.keys(this.data).forEach(category => {
      this.notifySubscribers(category as keyof GameData)
    })
  }

  // Export/Import for save system
  exportData(): string {
    return JSON.stringify(this.data)
  }

  importData(dataString: string): boolean {
    try {
      const importedData = JSON.parse(dataString)
      this.data = { ...this.getDefaultData(), ...importedData }
      this.saveToLocalStorage()
      
      // Notify all subscribers
      Object.keys(this.data).forEach(category => {
        this.notifySubscribers(category as keyof GameData)
      })
      
      return true
    } catch (error) {
      console.error('Failed to import game data:', error)
      return false
    }
  }
}
```

## Transitions and Effects

### 1. Scene Transition Manager

Create `/src/game/core/SceneTransitionManager.ts`:

```typescript
export interface TransitionConfig {
  type: 'fade' | 'slide' | 'zoom' | 'wipe' | 'custom'
  duration: number
  easing?: string
  color?: number
  direction?: 'left' | 'right' | 'up' | 'down'
  customEffect?: (scene: Phaser.Scene, onComplete: () => void) => void
}

export class SceneTransitionManager {
  private static instance: SceneTransitionManager
  private isTransitioning: boolean = false
  private currentScene?: Phaser.Scene

  static getInstance(): SceneTransitionManager {
    if (!SceneTransitionManager.instance) {
      SceneTransitionManager.instance = new SceneTransitionManager()
    }
    return SceneTransitionManager.instance
  }

  // Transition to new scene
  async transitionTo(
    fromScene: Phaser.Scene,
    toSceneKey: string,
    config: TransitionConfig,
    data?: any
  ): Promise<void> {
    if (this.isTransitioning) {
      console.warn('Transition already in progress')
      return
    }

    this.isTransitioning = true
    this.currentScene = fromScene

    try {
      // Perform transition effect
      await this.performTransition(fromScene, config, 'out')
      
      // Switch scene
      fromScene.scene.start(toSceneKey, data)
      
      // Perform entrance effect on new scene
      fromScene.scene.get(toSceneKey).events.once('create', async () => {
        const newScene = fromScene.scene.get(toSceneKey)
        await this.performTransition(newScene, config, 'in')
      })
      
    } finally {
      this.isTransitioning = false
    }
  }

  private async performTransition(
    scene: Phaser.Scene,
    config: TransitionConfig,
    direction: 'in' | 'out'
  ): Promise<void> {
    return new Promise(resolve => {
      switch (config.type) {
        case 'fade':
          this.fadeTransition(scene, config, direction, resolve)
          break
        case 'slide':
          this.slideTransition(scene, config, direction, resolve)
          break
        case 'zoom':
          this.zoomTransition(scene, config, direction, resolve)
          break
        case 'wipe':
          this.wipeTransition(scene, config, direction, resolve)
          break
        case 'custom':
          if (config.customEffect) {
            config.customEffect(scene, resolve)
          } else {
            resolve()
          }
          break
        default:
          resolve()
      }
    })
  }

  private fadeTransition(
    scene: Phaser.Scene,
    config: TransitionConfig,
    direction: 'in' | 'out',
    onComplete: () => void
  ): void {
    const { width, height } = scene.cameras.main
    const overlay = scene.add.rectangle(width / 2, height / 2, width, height, config.color || 0x000000)
    overlay.setDepth(10000)

    if (direction === 'out') {
      overlay.setAlpha(0)
      scene.tweens.add({
        targets: overlay,
        alpha: 1,
        duration: config.duration,
        ease: config.easing || 'Power2',
        onComplete: () => {
          onComplete()
        }
      })
    } else {
      overlay.setAlpha(1)
      scene.tweens.add({
        targets: overlay,
        alpha: 0,
        duration: config.duration,
        ease: config.easing || 'Power2',
        onComplete: () => {
          overlay.destroy()
          onComplete()
        }
      })
    }
  }

  private slideTransition(
    scene: Phaser.Scene,
    config: TransitionConfig,
    direction: 'in' | 'out',
    onComplete: () => void
  ): void {
    const camera = scene.cameras.main
    const { width, height } = camera

    let targetX = 0
    let targetY = 0

    switch (config.direction) {
      case 'left':
        targetX = direction === 'out' ? -width : 0
        break
      case 'right':
        targetX = direction === 'out' ? width : 0
        break
      case 'up':
        targetY = direction === 'out' ? -height : 0
        break
      case 'down':
        targetY = direction === 'out' ? height : 0
        break
    }

    if (direction === 'out') {
      scene.tweens.add({
        targets: camera,
        scrollX: targetX,
        scrollY: targetY,
        duration: config.duration,
        ease: config.easing || 'Power2',
        onComplete: onComplete
      })
    } else {
      camera.setScroll(targetX, targetY)
      scene.tweens.add({
        targets: camera,
        scrollX: 0,
        scrollY: 0,
        duration: config.duration,
        ease: config.easing || 'Power2',
        onComplete: onComplete
      })
    }
  }

  private zoomTransition(
    scene: Phaser.Scene,
    config: TransitionConfig,
    direction: 'in' | 'out',
    onComplete: () => void
  ): void {
    const camera = scene.cameras.main
    const targetZoom = direction === 'out' ? 0 : 1
    const startZoom = direction === 'out' ? 1 : 0

    camera.setZoom(startZoom)

    scene.tweens.add({
      targets: camera,
      zoom: targetZoom,
      duration: config.duration,
      ease: config.easing || 'Power2',
      onComplete: onComplete
    })
  }

  private wipeTransition(
    scene: Phaser.Scene,
    config: TransitionConfig,
    direction: 'in' | 'out',
    onComplete: () => void
  ): void {
    const { width, height } = scene.cameras.main
    const wipe = scene.add.rectangle(0, height / 2, 0, height, config.color || 0x000000)
    wipe.setOrigin(0, 0.5)
    wipe.setDepth(10000)

    if (direction === 'out') {
      scene.tweens.add({
        targets: wipe,
        width: width,
        duration: config.duration,
        ease: config.easing || 'Power2',
        onComplete: onComplete
      })
    } else {
      wipe.setSize(width, height)
      scene.tweens.add({
        targets: wipe,
        width: 0,
        duration: config.duration,
        ease: config.easing || 'Power2',
        onComplete: () => {
          wipe.destroy()
          onComplete()
        }
      })
    }
  }

  // Quick transition presets
  static fadeOut(scene: Phaser.Scene, duration: number = 500): Promise<void> {
    return SceneTransitionManager.getInstance().performTransition(
      scene,
      { type: 'fade', duration },
      'out'
    )
  }

  static fadeIn(scene: Phaser.Scene, duration: number = 500): Promise<void> {
    return SceneTransitionManager.getInstance().performTransition(
      scene,
      { type: 'fade', duration },
      'in'
    )
  }

  // Check if transition is in progress
  isInTransition(): boolean {
    return this.isTransitioning
  }
}
```

### 2. Loading Screen Scene

Create `/src/game/scenes/LoadingScene.ts`:

```typescript
export class LoadingScene extends BaseScene {
  private loadingBar!: Phaser.GameObjects.Graphics
  private progressBar!: Phaser.GameObjects.Graphics
  private loadingText!: Phaser.GameObjects.Text
  private percentText!: Phaser.GameObjects.Text
  private targetScene: string
  private targetData?: any

  constructor() {
    super({
      key: 'LoadingScene',
      backgroundColor: 0x000000
    })
  }

  init(data: { targetScene: string; targetData?: any }): void {
    super.init(data)
    this.targetScene = data.targetScene
    this.targetData = data.targetData
  }

  protected initializeScene(): void {
    // No additional initialization needed
  }

  protected createSceneContent(): void {
    this.createLoadingUI()
    this.startLoading()
  }

  private createLoadingUI(): void {
    const { width, height } = this.cameras.main

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000)

    // Loading text
    this.loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'Arial'
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
      color: '#ffffff',
      fontFamily: 'Arial'
    }).setOrigin(0.5)

    // Add loading animation
    this.createLoadingAnimation()
  }

  private createLoadingAnimation(): void {
    // Pulsing effect on loading text
    this.tweens.add({
      targets: this.loadingText,
      alpha: 0.3,
      duration: 1000,
      ease: 'Power2',
      yoyo: true,
      repeat: -1
    })

    // Rotating loading icon
    const loadingIcon = this.add.graphics()
    loadingIcon.lineStyle(4, 0xffffff)
    loadingIcon.arc(this.cameras.main.width / 2, this.cameras.main.height / 2 + 100, 20, 0, Math.PI * 1.5)
    
    this.tweens.add({
      targets: loadingIcon,
      rotation: Math.PI * 2,
      duration: 1000,
      ease: 'Linear',
      repeat: -1
    })
  }

  private async startLoading(): Promise<void> {
    const loadingManager = new SceneLoadingManager()

    // Subscribe to loading progress
    const unsubscribe = EventBus.on('sceneLoadingProgress', (progress: LoadingProgress) => {
      this.updateProgress(progress.progress, progress.message || '')
    })

    try {
      // Load target scene
      await loadingManager.loadScene(this.targetScene)
      
      // Loading complete
      this.updateProgress(100, 'Complete!')
      
      // Small delay before transitioning
      this.time.delayedCall(500, () => {
        this.switchToScene(this.targetScene, this.targetData)
      })
      
    } catch (error) {
      console.error('Loading failed:', error)
      this.loadingText.setText('Loading Failed!')
      this.loadingText.setTint(0xff0000)
    } finally {
      unsubscribe()
    }
  }

  private updateProgress(value: number, message: string): void {
    // Update progress bar
    this.progressBar.clear()
    this.progressBar.fillStyle(0x00ff00)
    this.progressBar.fillRect(
      this.cameras.main.width / 2 - 200,
      this.cameras.main.height / 2,
      400 * (value / 100),
      20
    )

    // Update percentage
    this.percentText.setText(`${Math.round(value)}%`)

    // Update message
    if (message) {
      this.loadingText.setText(message)
    }
  }

  protected updateScene(time: number, delta: number): void {
    // No updates needed for loading scene
  }
}
```

## Data Management

### 1. Scene Data Transfer

```typescript
export interface SceneDataTransfer {
  persistent: any        // Data that persists across scene changes
  temporary: any         // Data that only lasts for the next scene
  shared: any           // Data shared between multiple scenes
}

export class SceneDataManager {
  private static instance: SceneDataManager
  private persistentData: Map<string, any> = new Map()
  private temporaryData: Map<string, any> = new Map()
  private sharedData: Map<string, any> = new Map()

  static getInstance(): SceneDataManager {
    if (!SceneDataManager.instance) {
      SceneDataManager.instance = new SceneDataManager()
    }
    return SceneDataManager.instance
  }

  // Store data for scene transition
  storeDataForScene(sceneKey: string, data: SceneDataTransfer): void {
    if (data.persistent) {
      this.persistentData.set(sceneKey, data.persistent)
    }
    
    if (data.temporary) {
      this.temporaryData.set(sceneKey, data.temporary)
    }
    
    if (data.shared) {
      Object.entries(data.shared).forEach(([key, value]) => {
        this.sharedData.set(key, value)
      })
    }
  }

  // Retrieve data for scene
  getDataForScene(sceneKey: string): any {
    const persistent = this.persistentData.get(sceneKey) || {}
    const temporary = this.temporaryData.get(sceneKey) || {}
    const shared = Object.fromEntries(this.sharedData.entries())

    // Clear temporary data after retrieval
    this.temporaryData.delete(sceneKey)

    return {
      ...persistent,
      ...temporary,
      shared
    }
  }

  // Store shared data
  setSharedData(key: string, value: any): void {
    this.sharedData.set(key, value)
  }

  // Get shared data
  getSharedData(key: string): any {
    return this.sharedData.get(key)
  }

  // Clear data
  clearPersistentData(sceneKey: string): void {
    this.persistentData.delete(sceneKey)
  }

  clearAllTemporaryData(): void {
    this.temporaryData.clear()
  }

  clearSharedData(key?: string): void {
    if (key) {
      this.sharedData.delete(key)
    } else {
      this.sharedData.clear()
    }
  }
}
```

## Performance Optimization

### 1. Scene Pool Manager

```typescript
export class ScenePoolManager {
  private static instance: ScenePoolManager
  private scenePool: Map<string, Phaser.Scene[]> = new Map()
  private maxPoolSize: number = 3

  static getInstance(): ScenePoolManager {
    if (!ScenePoolManager.instance) {
      ScenePoolManager.instance = new ScenePoolManager()
    }
    return ScenePoolManager.instance
  }

  // Get scene from pool or create new one
  getScene(sceneKey: string, sceneClass: new () => Phaser.Scene): Phaser.Scene {
    const pool = this.scenePool.get(sceneKey) || []
    
    let scene = pool.pop()
    if (!scene) {
      scene = new sceneClass()
    }

    return scene
  }

  // Return scene to pool
  returnScene(sceneKey: string, scene: Phaser.Scene): void {
    const pool = this.scenePool.get(sceneKey) || []
    
    if (pool.length < this.maxPoolSize) {
      // Reset scene state
      this.resetScene(scene)
      pool.push(scene)
      this.scenePool.set(sceneKey, pool)
    } else {
      // Pool is full, destroy scene
      scene.scene.remove()
    }
  }

  private resetScene(scene: Phaser.Scene): void {
    // Clear all game objects
    scene.children.removeAll()
    
    // Reset cameras
    scene.cameras.main.resetFX()
    scene.cameras.main.setZoom(1)
    scene.cameras.main.setScroll(0, 0)
    
    // Clear tweens
    scene.tweens.killAll()
    
    // Reset physics
    if (scene.physics.world) {
      scene.physics.world.removeAllListeners()
    }
    
    // Clear input
    scene.input.removeAllListeners()
  }

  // Preload scenes for faster transitions
  preloadScenes(sceneConfigs: Array<{ key: string; class: new () => Phaser.Scene }>): void {
    sceneConfigs.forEach(config => {
      const pool: Phaser.Scene[] = []
      
      for (let i = 0; i < this.maxPoolSize; i++) {
        const scene = new config.class()
        this.resetScene(scene)
        pool.push(scene)
      }
      
      this.scenePool.set(config.key, pool)
    })
  }

  // Clear entire pool
  clearPool(): void {
    this.scenePool.forEach(pool => {
      pool.forEach(scene => scene.scene.remove())
    })
    this.scenePool.clear()
  }
}
```

## Best Practices

### 1. Scene Organization

- **Single Responsibility**: Each scene should have one primary purpose
- **Consistent Structure**: Follow the same initialization pattern across scenes
- **Resource Management**: Properly load and unload assets per scene
- **State Management**: Use external state stores for cross-scene data

### 2. Performance Guidelines

- **Asset Preloading**: Load assets in advance when possible
- **Scene Pooling**: Reuse scenes for better memory management
- **Lazy Loading**: Only load assets when needed
- **Memory Cleanup**: Properly destroy objects and remove listeners

### 3. Development Workflow

- **Scene Templates**: Create base classes for common scene types
- **Debugging Tools**: Implement scene state debugging
- **Testing**: Test scene transitions and data flow
- **Documentation**: Document scene dependencies and data requirements

### 4. Error Handling

- **Graceful Degradation**: Handle loading failures gracefully
- **Recovery Mechanisms**: Implement fallback scenes
- **User Feedback**: Provide clear feedback during loading
- **Logging**: Log scene state changes for debugging

## Next Steps

1. **Read StateManagement.md** - Learn cross-system state management
2. **Read EventSystem.md** - Deep dive into event communication
3. **Read Physics.md** - Understand collision detection and movement
4. **Read AssetManagement.md** - Master asset optimization techniques

This scene management system provides a robust foundation for creating complex, multi-scene games with smooth transitions, efficient resource management, and maintainable code architecture. 