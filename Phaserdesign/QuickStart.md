# Quick Start Tutorial
*Build Your First Phaser 3 + Next.js Game in 30 Minutes*

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Project Setup](#project-setup)
3. [Basic Game Structure](#basic-game-structure)
4. [Your First Scene](#your-first-scene)
5. [Adding a Player Character](#adding-a-player-character)
6. [React UI Integration](#react-ui-integration)
7. [State Management](#state-management)
8. [Next Steps](#next-steps)

## Prerequisites

Before starting, make sure you have:

- **Node.js** (v18 or higher)
- **pnpm** or **npm** package manager
- **Basic knowledge** of React, TypeScript, and JavaScript
- **Code editor** (VS Code recommended)

## Project Setup

### 1. Create Next.js Project

```bash
# Create new Next.js project with TypeScript
npx create-next-app@latest my-phaser-game --typescript --tailwind --app

# Navigate to project directory
cd my-phaser-game

# Install Phaser and required dependencies
pnpm add phaser@^3.90.0 zustand mitt
pnpm add -D @types/node

# Start development server
pnpm dev
```

### 2. Project Structure Setup

Create the following directory structure:

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── game/
│   │   └── PhaserGame.tsx
│   └── ui/
├── game/
│   ├── config/
│   │   └── GameConfig.ts
│   ├── scenes/
│   │   ├── PreloaderScene.ts
│   │   └── MainScene.ts
│   └── sprites/
│       └── Player.ts
├── lib/
│   ├── store/
│   │   └── gameStore.ts
│   └── EventBus.ts
└── public/
    └── assets/
        ├── sprites/
        └── audio/
```

### 3. Configure Next.js for Phaser

Update `next.config.ts`:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      }
    }
    return config
  }
}

export default nextConfig
```

## Basic Game Structure

### 1. Event Bus Setup

Create `/src/lib/EventBus.ts`:

```typescript
import mitt from 'mitt'

export interface GameEvents {
  'sceneChanged': string
  'playerMoved': { x: number; y: number }
  'scoreChanged': number
  'gameOver': void
}

const EventBus = mitt<GameEvents>()

export default EventBus
```

### 2. Game Configuration

Create `/src/game/config/GameConfig.ts`:

```typescript
import type { Types } from 'phaser'
import PreloaderScene from '../scenes/PreloaderScene'
import MainScene from '../scenes/MainScene'

const GameConfig: Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'phaser-container',
  backgroundColor: '#2c3e50',
  
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  
  scene: [PreloaderScene, MainScene]
}

export default GameConfig
```

### 3. Phaser Container Component

Create `/src/components/game/PhaserGame.tsx`:

```typescript
'use client'

import { useEffect, useRef } from 'react'
import GameConfig from '@/game/config/GameConfig'

export function PhaserGame() {
  const gameRef = useRef<Phaser.Game | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && containerRef.current) {
      import('phaser').then((Phaser) => {
        if (!gameRef.current) {
          gameRef.current = new Phaser.Game({
            ...GameConfig,
            parent: containerRef.current ?? undefined,
          })
        }
      })
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
      }
    }
  }, [])

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-900">
      <div 
        id="phaser-container" 
        ref={containerRef}
        className="border-2 border-gray-600 rounded-lg"
      />
    </div>
  )
}
```

## Your First Scene

### 1. Preloader Scene

Create `/src/game/scenes/PreloaderScene.ts`:

```typescript
import * as Phaser from 'phaser'

export default class PreloaderScene extends Phaser.Scene {
  constructor() {
    super('PreloaderScene')
  }

  preload() {
    // Create loading bar
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    const progressBar = this.add.graphics()
    const progressBox = this.add.graphics()
    progressBox.fillStyle(0x222222)
    progressBox.fillRect(width / 2 - 160, height / 2 - 30, 320, 50)

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5)

    const percentText = this.add.text(width / 2, height / 2, '0%', {
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5)

    // Update progress bar
    this.load.on('progress', (value: number) => {
      progressBar.clear()
      progressBar.fillStyle(0x00ff00)
      progressBar.fillRect(width / 2 - 150, height / 2 - 20, 300 * value, 30)
      
      percentText.setText(`${Math.round(value * 100)}%`)
    })

    this.load.on('complete', () => {
      progressBar.destroy()
      progressBox.destroy()
      loadingText.destroy()
      percentText.destroy()
      
      this.scene.start('MainScene')
    })

    // Load assets (create simple colored rectangles for now)
    this.createAssets()
  }

  private createAssets() {
    // Create player sprite
    this.add.graphics()
      .fillStyle(0x00ff00)
      .fillRect(0, 0, 32, 32)
      .generateTexture('player', 32, 32)

    // Create enemy sprite
    this.add.graphics()
      .fillStyle(0xff0000)
      .fillRect(0, 0, 24, 24)
      .generateTexture('enemy', 24, 24)

    // Create collectible sprite
    this.add.graphics()
      .fillStyle(0xffff00)
      .fillCircle(16, 16, 12)
      .generateTexture('collectible', 32, 32)
  }
}
```

### 2. Main Game Scene

Create `/src/game/scenes/MainScene.ts`:

```typescript
import * as Phaser from 'phaser'
import EventBus from '@/lib/EventBus'
import Player from '../sprites/Player'

export default class MainScene extends Phaser.Scene {
  private player!: Player
  private enemies!: Phaser.Physics.Arcade.Group
  private collectibles!: Phaser.Physics.Arcade.Group
  private score: number = 0
  private scoreText!: Phaser.GameObjects.Text
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys

  constructor() {
    super('MainScene')
  }

  create() {
    // Set world bounds
    this.physics.world.setBounds(0, 0, 800, 600)

    // Create player
    this.player = new Player(this, 400, 300)
    
    // Create groups
    this.enemies = this.physics.add.group()
    this.collectibles = this.physics.add.group()

    // Create some enemies
    this.createEnemies()
    
    // Create some collectibles
    this.createCollectibles()

    // Set up input
    this.cursors = this.input.keyboard!.createCursorKeys()

    // Create UI
    this.scoreText = this.add.text(16, 16, 'Score: 0', {
      fontSize: '24px',
      color: '#ffffff'
    })

    // Set up collisions
    this.setupCollisions()

    // Emit scene change event
    EventBus.emit('sceneChanged', 'MainScene')
  }

  private createEnemies() {
    for (let i = 0; i < 5; i++) {
      const x = Phaser.Math.Between(50, 750)
      const y = Phaser.Math.Between(50, 550)
      
      const enemy = this.physics.add.sprite(x, y, 'enemy')
      enemy.setCollideWorldBounds(true)
      enemy.setBounce(1)
      enemy.setVelocity(
        Phaser.Math.Between(-100, 100),
        Phaser.Math.Between(-100, 100)
      )
      
      this.enemies.add(enemy)
    }
  }

  private createCollectibles() {
    for (let i = 0; i < 10; i++) {
      const x = Phaser.Math.Between(50, 750)
      const y = Phaser.Math.Between(50, 550)
      
      const collectible = this.physics.add.sprite(x, y, 'collectible')
      this.collectibles.add(collectible)
    }
  }

  private setupCollisions() {
    // Player collects items
    this.physics.add.overlap(
      this.player,
      this.collectibles,
      this.collectItem,
      undefined,
      this
    )

    // Player hits enemies (game over)
    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.hitEnemy,
      undefined,
      this
    )
  }

  private collectItem(player: any, collectible: any) {
    collectible.destroy()
    this.score += 10
    this.updateScore()
    
    // Create new collectible
    const x = Phaser.Math.Between(50, 750)
    const y = Phaser.Math.Between(50, 550)
    const newCollectible = this.physics.add.sprite(x, y, 'collectible')
    this.collectibles.add(newCollectible)
  }

  private hitEnemy(player: any, enemy: any) {
    this.physics.pause()
    player.setTint(0xff0000)
    
    // Game over
    this.add.text(400, 300, 'GAME OVER', {
      fontSize: '48px',
      color: '#ff0000'
    }).setOrigin(0.5)

    this.add.text(400, 350, 'Click to restart', {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5)

    this.input.once('pointerdown', () => {
      this.scene.restart()
    })

    EventBus.emit('gameOver')
  }

  private updateScore() {
    this.scoreText.setText(`Score: ${this.score}`)
    EventBus.emit('scoreChanged', this.score)
  }

  update() {
    // Update player
    this.player.update()
    
    // Handle input
    if (this.cursors.left.isDown) {
      this.player.moveLeft()
    } else if (this.cursors.right.isDown) {
      this.player.moveRight()
    }

    if (this.cursors.up.isDown) {
      this.player.moveUp()
    } else if (this.cursors.down.isDown) {
      this.player.moveDown()
    }

    // Stop player if no input
    if (!this.cursors.left.isDown && !this.cursors.right.isDown) {
      this.player.stopHorizontal()
    }
    
    if (!this.cursors.up.isDown && !this.cursors.down.isDown) {
      this.player.stopVertical()
    }

    // Emit player position
    EventBus.emit('playerMoved', { x: this.player.x, y: this.player.y })
  }
}
```

## Adding a Player Character

Create `/src/game/sprites/Player.ts`:

```typescript
import * as Phaser from 'phaser'

export default class Player extends Phaser.Physics.Arcade.Sprite {
  private speed: number = 200

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player')
    
    // Add to scene and physics
    scene.add.existing(this)
    scene.physics.add.existing(this)
    
    // Set up physics properties
    this.setCollideWorldBounds(true)
    this.setBounce(0.2)
    this.setDrag(300)
    
    // Scale the player
    this.setScale(1)
  }

  moveLeft() {
    this.setVelocityX(-this.speed)
  }

  moveRight() {
    this.setVelocityX(this.speed)
  }

  moveUp() {
    this.setVelocityY(-this.speed)
  }

  moveDown() {
    this.setVelocityY(this.speed)
  }

  stopHorizontal() {
    this.setVelocityX(0)
  }

  stopVertical() {
    this.setVelocityY(0)
  }

  update() {
    // Add any per-frame logic here
  }
}
```

## React UI Integration

### 1. Game Store

Create `/src/lib/store/gameStore.ts`:

```typescript
import { create } from 'zustand'

interface GameState {
  score: number
  playerPosition: { x: number; y: number }
  gameState: 'menu' | 'playing' | 'gameOver'
  isLoading: boolean
  
  // Actions
  setScore: (score: number) => void
  setPlayerPosition: (position: { x: number; y: number }) => void
  setGameState: (state: 'menu' | 'playing' | 'gameOver') => void
  setLoading: (loading: boolean) => void
  resetGame: () => void
}

export const useGameStore = create<GameState>((set) => ({
  score: 0,
  playerPosition: { x: 0, y: 0 },
  gameState: 'menu',
  isLoading: false,
  
  setScore: (score) => set({ score }),
  setPlayerPosition: (position) => set({ playerPosition: position }),
  setGameState: (gameState) => set({ gameState }),
  setLoading: (loading) => set({ isLoading: loading }),
  resetGame: () => set({ score: 0, gameState: 'menu' })
}))
```

### 2. Game UI Component

Create `/src/components/ui/GameUI.tsx`:

```typescript
'use client'

import React, { useEffect } from 'react'
import { useGameStore } from '@/lib/store/gameStore'
import EventBus from '@/lib/EventBus'

export function GameUI() {
  const { score, playerPosition, gameState, setScore, setPlayerPosition, setGameState } = useGameStore()

  useEffect(() => {
    // Listen to game events
    const handleScoreChange = (newScore: number) => {
      setScore(newScore)
    }

    const handlePlayerMove = (position: { x: number; y: number }) => {
      setPlayerPosition(position)
    }

    const handleGameOver = () => {
      setGameState('gameOver')
    }

    const handleSceneChange = (scene: string) => {
      if (scene === 'MainScene') {
        setGameState('playing')
      }
    }

    EventBus.on('scoreChanged', handleScoreChange)
    EventBus.on('playerMoved', handlePlayerMove)
    EventBus.on('gameOver', handleGameOver)
    EventBus.on('sceneChanged', handleSceneChange)

    return () => {
      EventBus.off('scoreChanged', handleScoreChange)
      EventBus.off('playerMoved', handlePlayerMove)
      EventBus.off('gameOver', handleGameOver)
      EventBus.off('sceneChanged', handleSceneChange)
    }
  }, [setScore, setPlayerPosition, setGameState])

  return (
    <div className="absolute top-4 left-4 text-white bg-black bg-opacity-50 p-4 rounded">
      <div className="space-y-2">
        <div>Score: {score}</div>
        <div>Position: ({Math.round(playerPosition.x)}, {Math.round(playerPosition.y)})</div>
        <div>State: {gameState}</div>
      </div>
      
      {gameState === 'gameOver' && (
        <div className="mt-4">
          <button 
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
            onClick={() => window.location.reload()}
          >
            Restart Game
          </button>
        </div>
      )}
    </div>
  )
}
```

### 3. Update Main Page

Update `/src/app/page.tsx`:

```typescript
'use client'

import { PhaserGame } from '@/components/game/PhaserGame'
import { GameUI } from '@/components/ui/GameUI'

export default function Home() {
  return (
    <div className="relative">
      <PhaserGame />
      <GameUI />
    </div>
  )
}
```

## State Management

### 1. Enhanced Game Store

Update `/src/lib/store/gameStore.ts`:

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface GameSettings {
  soundEnabled: boolean
  musicVolume: number
  sfxVolume: number
}

interface GameState {
  // Game data
  score: number
  highScore: number
  playerPosition: { x: number; y: number }
  gameState: 'menu' | 'playing' | 'gameOver'
  isLoading: boolean
  
  // Settings
  settings: GameSettings
  
  // Actions
  setScore: (score: number) => void
  setPlayerPosition: (position: { x: number; y: number }) => void
  setGameState: (state: 'menu' | 'playing' | 'gameOver') => void
  setLoading: (loading: boolean) => void
  updateSettings: (settings: Partial<GameSettings>) => void
  resetGame: () => void
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      score: 0,
      highScore: 0,
      playerPosition: { x: 0, y: 0 },
      gameState: 'menu',
      isLoading: false,
      settings: {
        soundEnabled: true,
        musicVolume: 0.7,
        sfxVolume: 0.8
      },
      
      setScore: (score) => {
        const { highScore } = get()
        set({ 
          score,
          highScore: Math.max(score, highScore)
        })
      },
      
      setPlayerPosition: (position) => set({ playerPosition: position }),
      setGameState: (gameState) => set({ gameState }),
      setLoading: (loading) => set({ isLoading: loading }),
      
      updateSettings: (newSettings) => {
        const { settings } = get()
        set({ settings: { ...settings, ...newSettings } })
      },
      
      resetGame: () => set({ score: 0, gameState: 'menu' })
    }),
    {
      name: 'game-storage',
      partialize: (state) => ({
        highScore: state.highScore,
        settings: state.settings
      })
    }
  )
)
```

### 2. Settings Component

Create `/src/components/ui/SettingsPanel.tsx`:

```typescript
'use client'

import React from 'react'
import { useGameStore } from '@/lib/store/gameStore'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { settings, updateSettings } = useGameStore()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-96">
        <h2 className="text-xl font-bold text-white mb-4">Settings</h2>
        
        <div className="space-y-4">
          <div>
            <label className="flex items-center text-white">
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
                className="mr-2"
              />
              Sound Enabled
            </label>
          </div>
          
          <div>
            <label className="block text-white mb-2">
              Music Volume: {Math.round(settings.musicVolume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.musicVolume}
              onChange={(e) => updateSettings({ musicVolume: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-white mb-2">
              SFX Volume: {Math.round(settings.sfxVolume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.sfxVolume}
              onChange={(e) => updateSettings({ sfxVolume: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
```

### 3. Enhanced Game UI

Update `/src/components/ui/GameUI.tsx`:

```typescript
'use client'

import React, { useEffect, useState } from 'react'
import { useGameStore } from '@/lib/store/gameStore'
import { SettingsPanel } from './SettingsPanel'
import EventBus from '@/lib/EventBus'

export function GameUI() {
  const { 
    score, 
    highScore, 
    playerPosition, 
    gameState, 
    setScore, 
    setPlayerPosition, 
    setGameState 
  } = useGameStore()
  
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    const handleScoreChange = (newScore: number) => {
      setScore(newScore)
    }

    const handlePlayerMove = (position: { x: number; y: number }) => {
      setPlayerPosition(position)
    }

    const handleGameOver = () => {
      setGameState('gameOver')
    }

    const handleSceneChange = (scene: string) => {
      if (scene === 'MainScene') {
        setGameState('playing')
      }
    }

    EventBus.on('scoreChanged', handleScoreChange)
    EventBus.on('playerMoved', handlePlayerMove)
    EventBus.on('gameOver', handleGameOver)
    EventBus.on('sceneChanged', handleSceneChange)

    return () => {
      EventBus.off('scoreChanged', handleScoreChange)
      EventBus.off('playerMoved', handlePlayerMove)
      EventBus.off('gameOver', handleGameOver)
      EventBus.off('sceneChanged', handleSceneChange)
    }
  }, [setScore, setPlayerPosition, setGameState])

  return (
    <>
      {/* Game HUD */}
      <div className="absolute top-4 left-4 text-white bg-black bg-opacity-50 p-4 rounded">
        <div className="space-y-2">
          <div>Score: {score}</div>
          <div>High Score: {highScore}</div>
          <div>Position: ({Math.round(playerPosition.x)}, {Math.round(playerPosition.y)})</div>
          <div>State: {gameState}</div>
        </div>
        
        {gameState === 'gameOver' && (
          <div className="mt-4 space-y-2">
            <button 
              className="block w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
              onClick={() => window.location.reload()}
            >
              Restart Game
            </button>
          </div>
        )}
      </div>

      {/* Settings Button */}
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setShowSettings(true)}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
        >
          Settings
        </button>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 text-white bg-black bg-opacity-50 p-4 rounded">
        <div className="text-sm">
          <div>Use arrow keys to move</div>
          <div>Collect yellow circles</div>
          <div>Avoid red enemies</div>
        </div>
      </div>

      {/* Settings Panel */}
      <SettingsPanel 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  )
}
```

## Next Steps

Congratulations! You've built your first Phaser 3 + Next.js game. Here's what you can do next:

### 1. Immediate Improvements

```typescript
// Add sound effects
// In PreloaderScene.ts
this.load.audio('collect', '/assets/audio/collect.mp3')
this.load.audio('gameOver', '/assets/audio/gameOver.mp3')

// In MainScene.ts
private collectItem(player: any, collectible: any) {
  this.sound.play('collect')
  // ... rest of function
}
```

### 2. Add More Features

- **Animations**: Create sprite animations for the player
- **Particles**: Add particle effects for collections and explosions
- **Levels**: Create multiple levels with increasing difficulty
- **Power-ups**: Add temporary abilities and bonuses
- **Leaderboard**: Implement a high score system

### 3. Advanced Topics

- **Read Container.md** for advanced Phaser-React integration
- **Read SpriteImport.md** for professional sprite management
- **Read Scenes.md** for complex scene architecture
- **Read StateManagement.md** for advanced state patterns

### 4. Common Issues & Solutions

#### Game Not Loading
```typescript
// Make sure dynamic import is working
useEffect(() => {
  if (typeof window !== 'undefined') {
    import('phaser').then((Phaser) => {
      // Initialize game
    })
  }
}, [])
```

#### TypeScript Errors
```typescript
// Add proper types
const player = this.player as Player
const cursors = this.input.keyboard?.createCursorKeys()
```

#### Performance Issues
```typescript
// Limit frame rate if needed
const gameConfig = {
  // ... other config
  fps: {
    target: 60,
    forceSetTimeOut: true
  }
}
```

### 5. Resources for Learning More

- **Phaser 3 Documentation**: https://photonstorm.github.io/phaser3-docs/
- **Phaser 3 Examples**: https://phaser.io/examples
- **Next.js Documentation**: https://nextjs.org/docs
- **Zustand Documentation**: https://zustand-demo.pmnd.rs/

### 6. Project Ideas to Try

1. **Platformer Game**: Add gravity and jumping mechanics
2. **Space Shooter**: Create enemies that shoot back
3. **Puzzle Game**: Build a match-3 or Tetris-style game
4. **RPG Elements**: Add character stats, equipment, and inventory
5. **Multiplayer**: Integrate with Socket.io for real-time gameplay

You now have a solid foundation for building sophisticated Phaser 3 games with modern React development practices. The framework you've learned here scales from simple games to complex, production-ready applications!

## Quick Reference

### Essential Commands
```bash
# Create new project
npx create-next-app@latest my-game --typescript --tailwind

# Install Phaser
pnpm add phaser zustand mitt

# Start development
pnpm dev

# Build for production
pnpm build
```

### Key File Locations
- Game config: `/src/game/config/GameConfig.ts`
- Scenes: `/src/game/scenes/`
- Sprites: `/src/game/sprites/`
- Store: `/src/lib/store/`
- Components: `/src/components/`

### Common Patterns
```typescript
// Scene creation
export default class MyScene extends Phaser.Scene {
  constructor() { super('MyScene') }
  create() { /* setup */ }
  update() { /* game loop */ }
}

// Sprite creation
export default class MySprite extends Phaser.GameObjects.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'texture')
  }
}

// Store creation
export const useMyStore = create((set) => ({
  value: 0,
  setValue: (value) => set({ value })
}))
```

Happy game development! 🎮 