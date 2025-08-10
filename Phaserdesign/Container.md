# Phaser Container Setup Guide
*Building Phaser 3 Games in Next.js Applications*

## Table of Contents
1. [Overview](#overview)
2. [Project Setup](#project-setup)
3. [Container Architecture](#container-architecture)
4. [Integration Patterns](#integration-patterns)
5. [Configuration Options](#configuration-options)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

## Overview

This guide covers how to properly integrate Phaser 3 game engines into Next.js applications using container components. The container pattern provides clean separation between your React UI and Phaser game logic while maintaining seamless communication.

### Why Use Containers?

- **SSR Compatibility**: Phaser runs client-side only, containers handle server-side rendering
- **Clean Architecture**: Separation of concerns between UI and game logic
- **Memory Management**: Proper cleanup and lifecycle management
- **Responsive Design**: Dynamic resizing and mobile support

## Project Setup

### 1. Install Dependencies

```bash
npm install phaser@^3.90.0 next@^15.3.3 react@^19.1.0
npm install -D @types/node typescript
```

### 2. Next.js Configuration

Create or update `next.config.ts`:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Ensure Phaser works with webpack
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      }
    }
    return config
  },
  
  // Enable experimental features for better performance
  experimental: {
    turbo: {
      rules: {
        '*.ts': ['ts-loader'],
      },
    },
  },
}

export default nextConfig
```

### 3. TypeScript Configuration

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## Container Architecture

### 1. Basic Phaser Container Component

Create `/src/components/game/PhaserContainer.tsx`:

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import type { Game } from 'phaser'

interface PhaserContainerProps {
  gameConfig: Phaser.Types.Core.GameConfig
  onGameCreate?: (game: Game) => void
  onGameDestroy?: () => void
  className?: string
  style?: React.CSSProperties
}

export function PhaserContainer({ 
  gameConfig, 
  onGameCreate, 
  onGameDestroy,
  className = '',
  style = {}
}: PhaserContainerProps) {
  const gameRef = useRef<Game | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const initializeGame = async () => {
      try {
        // Ensure we're on the client side
        if (typeof window === 'undefined' || !containerRef.current) {
          return
        }

        // Dynamic import to avoid SSR issues
        const Phaser = await import('phaser')
        
        // Check if component is still mounted
        if (!mounted) return

        // Destroy existing game instance
        if (gameRef.current) {
          gameRef.current.destroy(true)
          gameRef.current = null
        }

        // Create new game instance
        const game = new Phaser.Game({
          ...gameConfig,
          parent: containerRef.current,
          callbacks: {
            postBoot: () => {
              if (mounted) {
                setIsLoading(false)
                onGameCreate?.(game)
              }
            }
          }
        })

        gameRef.current = game

      } catch (err) {
        console.error('Failed to initialize Phaser game:', err)
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error')
          setIsLoading(false)
        }
      }
    }

    initializeGame()

    // Cleanup function
    return () => {
      mounted = false
      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
        onGameDestroy?.()
      }
    }
  }, [gameConfig, onGameCreate, onGameDestroy])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (gameRef.current) {
        gameRef.current.scale.refresh()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (error) {
    return (
      <div className={`phaser-error ${className}`} style={style}>
        <div className="error-content">
          <h3>Game Loading Error</h3>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`phaser-container-wrapper ${className}`} style={style}>
      {isLoading && (
        <div className="phaser-loading">
          <div className="loading-spinner"></div>
          <p>Loading Game...</p>
        </div>
      )}
      <div 
        ref={containerRef} 
        className="phaser-game-container"
        style={{ 
          width: '100%', 
          height: '100%',
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out'
        }}
      />
    </div>
  )
}
```

### 2. Game Configuration Factory

Create `/src/game/config/GameConfig.ts`:

```typescript
import type { Types } from 'phaser'

export interface GameConfigOptions {
  width?: number | string
  height?: number | string
  backgroundColor?: number | string
  physics?: {
    default: string
    arcade?: {
      gravity?: { x: number; y: number }
      debug?: boolean
    }
  }
  scale?: {
    mode?: number
    autoCenter?: number
  }
  debug?: boolean
}

export function createGameConfig(
  scenes: Array<new (...args: any[]) => Phaser.Scene>,
  options: GameConfigOptions = {}
): Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: undefined, // Will be set by container
    width: options.width || '100%',
    height: options.height || '100%',
    backgroundColor: options.backgroundColor || '#2c3e50',
    
    scale: {
      mode: options.scale?.mode || Phaser.Scale.RESIZE,
      autoCenter: options.scale?.autoCenter || Phaser.Scale.CENTER_BOTH,
      width: '100%',
      height: '100%',
    },
    
    physics: {
      default: options.physics?.default || 'arcade',
      arcade: {
        gravity: options.physics?.arcade?.gravity || { x: 0, y: 0 },
        debug: options.physics?.arcade?.debug || false,
      },
    },
    
    scene: scenes,
    
    // Performance optimizations
    render: {
      pixelArt: false,
      antialias: true,
      antialiasGL: true,
      mipmapFilter: 'LINEAR_MIPMAP_LINEAR',
    },
    
    // Audio configuration
    audio: {
      disableWebAudio: false,
    },
    
    // Input configuration
    input: {
      keyboard: true,
      mouse: true,
      touch: true,
      gamepad: false,
    },
    
    // Plugin configuration
    plugins: {
      global: [],
      scene: []
    },

    // Disable context menu on right click
    disableContextMenu: true,
  }
}
```

### 3. Advanced Container with Hooks

Create `/src/hooks/usePhaser.ts`:

```typescript
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { Game, Scene } from 'phaser'

interface UsePhaserOptions {
  gameConfig: Phaser.Types.Core.GameConfig
  autoStart?: boolean
  enableDebug?: boolean
}

interface UsePhaserReturn {
  gameRef: React.MutableRefObject<Game | null>
  containerRef: React.MutableRefObject<HTMLDivElement | null>
  isLoading: boolean
  error: string | null
  startGame: () => Promise<void>
  destroyGame: () => void
  pauseGame: () => void
  resumeGame: () => void
  getScene: (sceneKey: string) => Scene | null
}

export function usePhaser({ 
  gameConfig, 
  autoStart = true,
  enableDebug = false 
}: UsePhaserOptions): UsePhaserReturn {
  const gameRef = useRef<Game | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isLoading, setIsLoading] = useState(autoStart)
  const [error, setError] = useState<string | null>(null)

  const destroyGame = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.destroy(true)
      gameRef.current = null
    }
  }, [])

  const startGame = useCallback(async () => {
    if (!containerRef.current) {
      setError('Container not available')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Destroy existing game
      destroyGame()

      // Dynamic import
      const Phaser = await import('phaser')

      // Create game with debug options
      const config = enableDebug 
        ? {
            ...gameConfig,
            physics: {
              ...gameConfig.physics,
              arcade: {
                ...gameConfig.physics?.arcade,
                debug: true
              }
            }
          }
        : gameConfig

      const game = new Phaser.Game({
        ...config,
        parent: containerRef.current,
        callbacks: {
          postBoot: () => {
            setIsLoading(false)
            if (enableDebug) {
              console.log('Phaser game initialized:', game)
            }
          }
        }
      })

      gameRef.current = game

    } catch (err) {
      console.error('Failed to start Phaser game:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setIsLoading(false)
    }
  }, [gameConfig, enableDebug, destroyGame])

  const pauseGame = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.loop.sleep()
    }
  }, [])

  const resumeGame = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.loop.wake()
    }
  }, [])

  const getScene = useCallback((sceneKey: string) => {
    if (gameRef.current) {
      return gameRef.current.scene.getScene(sceneKey)
    }
    return null
  }, [])

  // Auto-start effect
  useEffect(() => {
    if (autoStart) {
      startGame()
    }

    return destroyGame
  }, [autoStart, startGame, destroyGame])

  return {
    gameRef,
    containerRef,
    isLoading,
    error,
    startGame,
    destroyGame,
    pauseGame,
    resumeGame,
    getScene,
  }
}
```

### 4. Responsive Container Component

Create `/src/components/game/ResponsivePhaserContainer.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { PhaserContainer } from './PhaserContainer'
import type { Game } from 'phaser'

interface ResponsivePhaserContainerProps {
  gameConfig: Phaser.Types.Core.GameConfig
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  aspectRatio?: number
  onGameCreate?: (game: Game) => void
  className?: string
}

export function ResponsivePhaserContainer({
  gameConfig,
  minWidth = 320,
  minHeight = 240,
  maxWidth = 1920,
  maxHeight = 1080,
  aspectRatio = 16 / 9,
  onGameCreate,
  className = ''
}: ResponsivePhaserContainerProps) {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  useEffect(() => {
    const calculateDimensions = () => {
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight
      
      // Calculate based on aspect ratio
      let width = Math.min(windowWidth * 0.9, maxWidth)
      let height = width / aspectRatio
      
      // Ensure minimum dimensions
      if (width < minWidth) {
        width = minWidth
        height = width / aspectRatio
      }
      
      if (height < minHeight) {
        height = minHeight
        width = height * aspectRatio
      }
      
      // Ensure maximum dimensions
      if (height > Math.min(windowHeight * 0.9, maxHeight)) {
        height = Math.min(windowHeight * 0.9, maxHeight)
        width = height * aspectRatio
      }
      
      setDimensions({ width: Math.floor(width), height: Math.floor(height) })
    }

    calculateDimensions()
    
    window.addEventListener('resize', calculateDimensions)
    return () => window.removeEventListener('resize', calculateDimensions)
  }, [minWidth, minHeight, maxWidth, maxHeight, aspectRatio])

  const responsiveConfig = {
    ...gameConfig,
    scale: {
      ...gameConfig.scale,
      width: dimensions.width,
      height: dimensions.height,
    }
  }

  return (
    <div className={`responsive-phaser-container ${className}`}>
      <PhaserContainer
        gameConfig={responsiveConfig}
        onGameCreate={onGameCreate}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          margin: '0 auto',
        }}
      />
    </div>
  )
}
```

## Integration Patterns

### 1. Basic Game Page

Create `/src/app/game/page.tsx`:

```typescript
'use client'

import { PhaserContainer } from '@/components/game/PhaserContainer'
import { createGameConfig } from '@/game/config/GameConfig'
import PreloaderScene from '@/game/scenes/PreloaderScene'
import MainScene from '@/game/scenes/MainScene'

export default function GamePage() {
  const gameConfig = createGameConfig([PreloaderScene, MainScene], {
    backgroundColor: '#2c3e50',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false
      }
    }
  })

  return (
    <div className="game-page">
      <h1>My Phaser Game</h1>
      <PhaserContainer 
        gameConfig={gameConfig}
        className="game-container"
        style={{ width: '800px', height: '600px' }}
      />
    </div>
  )
}
```

### 2. Game with UI Overlay

Create `/src/components/game/GameWithUI.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { PhaserContainer } from './PhaserContainer'
import { GameUI } from './GameUI'
import type { Game } from 'phaser'

interface GameWithUIProps {
  gameConfig: Phaser.Types.Core.GameConfig
}

export function GameWithUI({ gameConfig }: GameWithUIProps) {
  const [game, setGame] = useState<Game | null>(null)
  const [gameLoaded, setGameLoaded] = useState(false)

  const handleGameCreate = (gameInstance: Game) => {
    setGame(gameInstance)
    setGameLoaded(true)
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Phaser Game Container */}
      <PhaserContainer
        gameConfig={gameConfig}
        onGameCreate={handleGameCreate}
        className="absolute inset-0"
      />
      
      {/* UI Overlay */}
      {gameLoaded && game && (
        <GameUI 
          game={game}
          className="absolute inset-0 pointer-events-none"
        />
      )}
    </div>
  )
}
```

### 3. Multi-Scene Game Structure

Create `/src/game/GameManager.ts`:

```typescript
import type { Game, Scene } from 'phaser'

export class GameManager {
  private game: Game | null = null
  private currentScene: string | null = null

  constructor(game: Game) {
    this.game = game
  }

  // Scene management
  startScene(sceneKey: string, data?: any): void {
    if (this.game) {
      this.game.scene.start(sceneKey, data)
      this.currentScene = sceneKey
    }
  }

  switchScene(fromScene: string, toScene: string, data?: any): void {
    if (this.game) {
      this.game.scene.switch(fromScene, toScene)
      this.currentScene = toScene
    }
  }

  pauseScene(sceneKey: string): void {
    if (this.game) {
      this.game.scene.pause(sceneKey)
    }
  }

  resumeScene(sceneKey: string): void {
    if (this.game) {
      this.game.scene.resume(sceneKey)
    }
  }

  // Game state management
  getCurrentScene(): Scene | null {
    if (this.game && this.currentScene) {
      return this.game.scene.getScene(this.currentScene)
    }
    return null
  }

  getGame(): Game | null {
    return this.game
  }

  // Utility methods
  isSceneActive(sceneKey: string): boolean {
    return this.game?.scene.isActive(sceneKey) || false
  }

  getAllScenes(): Scene[] {
    return this.game?.scene.scenes || []
  }
}
```

## Configuration Options

### 1. Performance Configuration

```typescript
// High-performance config for complex games
export const performanceConfig = {
  render: {
    pixelArt: false,
    antialias: true,
    antialiasGL: true,
    mipmapFilter: 'LINEAR_MIPMAP_LINEAR',
    maxLights: 10,
    maxTextures: 1,
    batchSize: 4096,
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
    deltaHistory: 10,
    panicMax: 120,
  },
  loader: {
    enableParallel: true,
    maxParallelDownloads: 4,
  }
}

// Mobile-optimized config
export const mobileConfig = {
  render: {
    pixelArt: true,
    antialias: false,
    antialiasGL: false,
    powerPreference: 'low-power',
    batchSize: 2048,
  },
  fps: {
    target: 30,
    forceSetTimeOut: true,
  },
  audio: {
    disableWebAudio: true,
  }
}
```

### 2. Debug Configuration

```typescript
export const debugConfig = {
  physics: {
    arcade: {
      debug: true,
      debugShowBody: true,
      debugShowStaticBody: true,
      debugShowVelocity: true,
      debugVelocityColor: 0x00ff00,
      debugBodyColor: 0xff0000,
      debugStaticBodyColor: 0x0000ff,
    }
  },
  scale: {
    zoom: 1,
    autoRound: false,
  }
}
```

## Troubleshooting

### Common Issues and Solutions

#### 1. SSR Hydration Mismatch
```typescript
// Use dynamic import with ssr: false
import dynamic from 'next/dynamic'

const GameComponent = dynamic(
  () => import('@/components/game/PhaserContainer'),
  { ssr: false }
)
```

#### 2. Memory Leaks
```typescript
// Always cleanup in useEffect
useEffect(() => {
  return () => {
    if (gameRef.current) {
      gameRef.current.destroy(true)
      gameRef.current = null
    }
  }
}, [])
```

#### 3. Canvas Sizing Issues
```typescript
// Force canvas refresh on resize
const handleResize = useCallback(() => {
  if (gameRef.current) {
    gameRef.current.scale.refresh()
  }
}, [])
```

#### 4. Asset Loading Problems
```typescript
// Check asset paths and preload properly
class PreloaderScene extends Phaser.Scene {
  preload() {
    // Set base URL for assets
    this.load.setBaseURL('/assets/')
    
    // Add loading progress
    this.load.on('progress', (value: number) => {
      console.log('Loading:', value)
    })
  }
}
```

## Best Practices

### 1. Container Lifecycle Management
- Always destroy Phaser instances on component unmount
- Use refs to maintain game instance references
- Implement proper error boundaries

### 2. Performance Optimization
- Use object pooling for frequently created/destroyed objects
- Implement texture atlases for sprite management
- Optimize physics world bounds and collision detection

### 3. Mobile Considerations
- Implement touch controls alongside keyboard/mouse
- Use responsive scaling for different screen sizes
- Consider performance limitations on mobile devices

### 4. State Synchronization
- Use external state management (Zustand/Redux) for cross-component state
- Implement event systems for React-Phaser communication
- Maintain separation between UI state and game state

### 5. Development Workflow
- Use TypeScript for better development experience
- Implement hot reloading for rapid development
- Create reusable container components for different game types

## Next Steps

1. **Read UI.md** - Learn how to create React UI overlays
2. **Read SpriteImport.md** - Understand sprite management and animation
3. **Read Scenes.md** - Master scene architecture and transitions
4. **Read StateManagement.md** - Implement cross-system state management

This container setup provides the foundation for building sophisticated Phaser games within modern React applications. The patterns shown here scale from simple games to complex multiplayer experiences. 