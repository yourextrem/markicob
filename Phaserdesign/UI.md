# UI Overlay System Guide
*Building React UI Components for Phaser Games*

## Table of Contents
1. [Overview](#overview)
2. [UI Architecture](#ui-architecture)
3. [Event Communication](#event-communication)
4. [Component Patterns](#component-patterns)
5. [HUD Systems](#hud-systems)
6. [Window Management](#window-management)
7. [Mobile UI](#mobile-ui)
8. [Performance Optimization](#performance-optimization)

## Overview

This guide covers creating sophisticated React UI overlays that seamlessly integrate with Phaser games. The UI system provides a modern, responsive interface while maintaining smooth communication with the game engine.

### Key Benefits

- **React Ecosystem**: Use modern React patterns, hooks, and libraries
- **Responsive Design**: Adaptive UI that works on all devices
- **State Management**: Integrated with external state stores (Zustand)
- **Performance**: Optimized rendering with minimal impact on game performance
- **Accessibility**: Full accessibility support with proper ARIA attributes

## UI Architecture

### 1. Layer Structure

The UI system uses a layered approach with proper z-index management:

```
┌─────────────────────────────────────────┐
│  Notifications Layer (z-index: 9999)   │
├─────────────────────────────────────────┤
│  Modal Layer (z-index: 1000)           │
├─────────────────────────────────────────┤
│  Window Layer (z-index: 500)           │
├─────────────────────────────────────────┤
│  HUD Layer (z-index: 100)              │
├─────────────────────────────────────────┤
│  Phaser Game Canvas (z-index: 1)       │
└─────────────────────────────────────────┘
```

### 2. Base UI Component

Create `/src/components/game-ui/GameUI.tsx`:

```typescript
'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import EventBus from '@/lib/EventBus'
import { useUIStore, UIWindow } from '@/lib/store/ui'
import type { Game } from 'phaser'

// Import UI components
import GameHUD from './GameHUD'
import NotificationSystem from './NotificationSystem'
import WindowManager from './WindowManager'
import MobileControls from './MobileControls'
import LoadingOverlay from './LoadingOverlay'

interface GameUIProps {
  game: Game | null
  className?: string
  onLoginClick?: () => void
  onAccountClick?: () => void
}

export function GameUI({ 
  game, 
  className = '',
  onLoginClick,
  onAccountClick 
}: GameUIProps) {
  const [mounted, setMounted] = useState(false)
  const { 
    activeScene, 
    setActiveScene, 
    toggleWindow, 
    isGameLoaded,
    setGameLoaded 
  } = useUIStore()

  // Ensure client-side mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  // Game initialization
  useEffect(() => {
    if (game && !isGameLoaded) {
      setGameLoaded(true)
    }
  }, [game, isGameLoaded, setGameLoaded])

  // Event handlers
  useEffect(() => {
    const handleToggleWindow = (window: UIWindow) => {
      toggleWindow(window)
    }

    const handleSceneChange = (scene: string) => {
      setActiveScene(scene)
    }

    const handleLoginRequest = () => {
      onLoginClick?.()
    }

    // Register event listeners
    EventBus.on('toggleUI', handleToggleWindow)
    EventBus.on('sceneChanged', handleSceneChange)
    EventBus.on('openLoginModal', handleLoginRequest)

    return () => {
      EventBus.off('toggleUI', handleToggleWindow)
      EventBus.off('sceneChanged', handleSceneChange)
      EventBus.off('openLoginModal', handleLoginRequest)
    }
  }, [toggleWindow, setActiveScene, onLoginClick])

  if (!mounted) return null

  const uiContent = (
    <div 
      id="game-ui-root" 
      className={`
        absolute inset-0 w-full h-full 
        pointer-events-none
        ${className}
      `}
      style={{ zIndex: 100 }}
    >
      {/* Loading overlay */}
      <LoadingOverlay show={!isGameLoaded} />

      {/* Main HUD */}
      <GameHUD 
        activeScene={activeScene}
        onAccountClick={onAccountClick}
      />

      {/* Window management system */}
      <WindowManager game={game} />

      {/* Mobile controls */}
      <MobileControls />

      {/* Notification system */}
      <NotificationSystem />
    </div>
  )

  // Use portal to render outside React tree for better performance
  return typeof window !== 'undefined' && document.body
    ? createPortal(uiContent, document.body)
    : uiContent
}
```

### 3. UI State Management

Create `/src/lib/store/ui.ts`:

```typescript
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export enum UIWindow {
  Character = 'character',
  Inventory = 'inventory', 
  Crafting = 'crafting',
  Marketplace = 'marketplace',
  Settings = 'settings',
  Achievements = 'achievements',
  CharacterSelect = 'characterSelect',
  GameMenu = 'gameMenu',
  DungeonProgress = 'dungeonProgress',
  PlayerDeath = 'playerDeath',
  Upgrade = 'upgrade',
}

export enum UILayer {
  HUD = 100,
  Windows = 500,
  Modals = 1000,
  Notifications = 9999,
}

interface NotificationData {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface UIState {
  // Window management
  openWindows: UIWindow[]
  activeScene: string
  isGameLoaded: boolean
  
  // Notifications
  notifications: NotificationData[]
  
  // Mobile
  isMobile: boolean
  showMobileControls: boolean
  
  // Actions
  isWindowOpen: (window: UIWindow) => boolean
  toggleWindow: (window: UIWindow) => void
  openWindow: (window: UIWindow) => void
  closeWindow: (window: UIWindow) => void
  closeAllWindows: () => void
  hasAnyWindowOpen: () => boolean
  
  setActiveScene: (scene: string) => void
  setGameLoaded: (loaded: boolean) => void
  
  // Notifications
  addNotification: (notification: Omit<NotificationData, 'id'>) => void
  removeNotification: (id: string) => void
  clearAllNotifications: () => void
  
  // Mobile
  setIsMobile: (mobile: boolean) => void
  setShowMobileControls: (show: boolean) => void
}

export const useUIStore = create<UIState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    openWindows: [],
    activeScene: 'MainMenuScene',
    isGameLoaded: false,
    notifications: [],
    isMobile: false,
    showMobileControls: true,

    // Window management
    isWindowOpen: (window: UIWindow) => 
      get().openWindows.includes(window),
    
    toggleWindow: (window: UIWindow) => {
      const isOpen = get().isWindowOpen(window)
      if (isOpen) {
        get().closeWindow(window)
      } else {
        get().openWindow(window)
      }
    },
    
    openWindow: (window: UIWindow) => {
      set((state) => {
        if (!state.openWindows.includes(window)) {
          return { openWindows: [...state.openWindows, window] }
        }
        return state
      })
    },
    
    closeWindow: (window: UIWindow) => {
      set((state) => ({
        openWindows: state.openWindows.filter((w) => w !== window),
      }))
    },
    
    closeAllWindows: () => {
      set({ openWindows: [] })
    },
    
    hasAnyWindowOpen: () => get().openWindows.length > 0,
    
    // Scene management
    setActiveScene: (scene: string) => {
      set({ activeScene: scene })
    },
    
    setGameLoaded: (loaded: boolean) => {
      set({ isGameLoaded: loaded })
    },
    
    // Notifications
    addNotification: (notification) => {
      const id = `notification-${Date.now()}-${Math.random()}`
      const newNotification = { ...notification, id }
      
      set((state) => ({
        notifications: [...state.notifications, newNotification]
      }))
      
      // Auto-remove after duration
      if (notification.duration !== 0) {
        setTimeout(() => {
          get().removeNotification(id)
        }, notification.duration || 5000)
      }
    },
    
    removeNotification: (id: string) => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id)
      }))
    },
    
    clearAllNotifications: () => {
      set({ notifications: [] })
    },
    
    // Mobile
    setIsMobile: (mobile: boolean) => {
      set({ isMobile: mobile })
    },
    
    setShowMobileControls: (show: boolean) => {
      set({ showMobileControls: show })
    },
  }))
)
```

## Event Communication

### 1. Event System Setup

Create `/src/lib/EventBus.ts`:

```typescript
import mitt from 'mitt'

// Define event types for type safety
export interface GameEvents {
  // UI Events
  'toggleUI': UIWindow
  'openLoginModal': void
  'sceneChanged': string
  
  // Game Events
  'gameStart': void
  'gamePause': void
  'gameResume': void
  'playerDeath': void
  'levelComplete': void
  'upgradeSelected': string
  
  // System Events
  'showNotification': {
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message: string
  }
}

// Create typed event bus
const eventBus = mitt<GameEvents>()

export default eventBus
```

### 2. React-Phaser Communication Hook

Create `/src/hooks/useGameEvents.ts`:

```typescript
'use client'

import { useEffect, useCallback } from 'react'
import EventBus from '@/lib/EventBus'
import { useUIStore } from '@/lib/store/ui'
import type { GameEvents } from '@/lib/EventBus'

interface UseGameEventsOptions {
  onGameStart?: () => void
  onGamePause?: () => void
  onPlayerDeath?: () => void
  onLevelComplete?: () => void
}

export function useGameEvents(options: UseGameEventsOptions = {}) {
  const { addNotification, openWindow, closeWindow } = useUIStore()

  // Event handlers
  const handleGameStart = useCallback(() => {
    console.log('Game started')
    options.onGameStart?.()
  }, [options])

  const handleGamePause = useCallback(() => {
    console.log('Game paused')
    options.onGamePause?.()
  }, [options])

  const handlePlayerDeath = useCallback(() => {
    console.log('Player died')
    openWindow(UIWindow.PlayerDeath)
    options.onPlayerDeath?.()
  }, [openWindow, options])

  const handleLevelComplete = useCallback(() => {
    console.log('Level completed')
    addNotification({
      type: 'success',
      title: 'Level Complete!',
      message: 'Congratulations on completing the level!'
    })
    options.onLevelComplete?.()
  }, [addNotification, options])

  const handleShowNotification = useCallback((data: GameEvents['showNotification']) => {
    addNotification(data)
  }, [addNotification])

  // Register event listeners
  useEffect(() => {
    EventBus.on('gameStart', handleGameStart)
    EventBus.on('gamePause', handleGamePause)
    EventBus.on('playerDeath', handlePlayerDeath)
    EventBus.on('levelComplete', handleLevelComplete)
    EventBus.on('showNotification', handleShowNotification)

    return () => {
      EventBus.off('gameStart', handleGameStart)
      EventBus.off('gamePause', handleGamePause)
      EventBus.off('playerDeath', handlePlayerDeath)
      EventBus.off('levelComplete', handleLevelComplete)
      EventBus.off('showNotification', handleShowNotification)
    }
  }, [
    handleGameStart,
    handleGamePause,
    handlePlayerDeath,
    handleLevelComplete,
    handleShowNotification
  ])

  // Emit events to Phaser
  const emitToGame = useCallback(<K extends keyof GameEvents>(
    event: K,
    data: GameEvents[K]
  ) => {
    EventBus.emit(event, data)
  }, [])

  return { emitToGame }
}
```

## Component Patterns

### 1. Base UI Component

Create `/src/components/game-ui/BaseUIComponent.tsx`:

```typescript
'use client'

import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface BaseUIComponentProps {
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
  pointerEvents?: boolean
  zIndex?: number
  id?: string
}

export const BaseUIComponent = forwardRef<HTMLDivElement, BaseUIComponentProps>(
  ({ 
    className, 
    style, 
    children, 
    pointerEvents = true,
    zIndex,
    id,
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        id={id}
        className={cn(
          'absolute',
          pointerEvents ? 'pointer-events-auto' : 'pointer-events-none',
          className
        )}
        style={{
          zIndex,
          ...style
        }}
        {...props}
      >
        {children}
      </div>
    )
  }
)

BaseUIComponent.displayName = 'BaseUIComponent'
```

### 2. Window Component Template

Create `/src/components/game-ui/BaseWindow.tsx`:

```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Minimize2, Maximize2 } from 'lucide-react'
import { BaseUIComponent } from './BaseUIComponent'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface BaseWindowProps {
  title: string
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  width?: number | string
  height?: number | string
  resizable?: boolean
  draggable?: boolean
  minimizable?: boolean
  initialPosition?: { x: number; y: number }
}

export function BaseWindow({
  title,
  isOpen,
  onClose,
  children,
  className,
  width = 400,
  height = 300,
  resizable = false,
  draggable = true,
  minimizable = true,
  initialPosition = { x: 100, y: 100 }
}: BaseWindowProps) {
  const [position, setPosition] = useState(initialPosition)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!draggable) return
    
    setIsDragging(true)
    const startX = e.clientX - position.x
    const startY = e.clientY - position.y

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - startX,
        y: e.clientY - startY
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // Reset position when window opens
  useEffect(() => {
    if (isOpen) {
      setPosition(initialPosition)
      setIsMinimized(false)
    }
  }, [isOpen, initialPosition])

  const windowVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      y: -50 
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 24
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8,
      y: -50,
      transition: {
        duration: 0.2
      }
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <BaseUIComponent
          zIndex={500}
          style={{
            left: position.x,
            top: position.y,
            width: typeof width === 'number' ? `${width}px` : width,
            height: isMinimized ? 'auto' : (typeof height === 'number' ? `${height}px` : height)
          }}
        >
          <motion.div
            variants={windowVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              'bg-gray-800 border border-gray-600 rounded-lg shadow-2xl',
              'backdrop-blur-sm bg-opacity-95',
              isDragging && 'select-none',
              className
            )}
          >
            {/* Window Header */}
            <div
              className={cn(
                'flex items-center justify-between p-3 border-b border-gray-600',
                'bg-gray-700 rounded-t-lg',
                draggable && 'cursor-move'
              )}
              onMouseDown={handleMouseDown}
            >
              <h3 className="text-white font-semibold text-sm">
                {title}
              </h3>
              
              <div className="flex items-center gap-1">
                {minimizable && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-6 h-6 p-0 text-gray-300 hover:text-white"
                    onClick={() => setIsMinimized(!isMinimized)}
                  >
                    <Minimize2 className="w-3 h-3" />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-6 h-6 p-0 text-gray-300 hover:text-white"
                  onClick={onClose}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Window Content */}
            <AnimatePresence>
              {!isMinimized && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4">
                    {children}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </BaseUIComponent>
      )}
    </AnimatePresence>
  )
}
```

### 3. Notification Component

Create `/src/components/game-ui/NotificationSystem.tsx`:

```typescript
'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'
import { useUIStore } from '@/lib/store/ui'
import { Button } from '@/components/ui/button'
import { BaseUIComponent } from './BaseUIComponent'

const notificationIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertCircle,
  info: Info,
}

const notificationColors = {
  success: 'border-green-500 bg-green-900 text-green-100',
  error: 'border-red-500 bg-red-900 text-red-100',
  warning: 'border-yellow-500 bg-yellow-900 text-yellow-100',
  info: 'border-blue-500 bg-blue-900 text-blue-100',
}

export function NotificationSystem() {
  const { notifications, removeNotification } = useUIStore()

  return (
    <BaseUIComponent
      className="top-4 right-4 w-80 space-y-2"
      zIndex={9999}
      pointerEvents={false}
    >
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => {
          const Icon = notificationIcons[notification.type]
          
          return (
            <motion.div
              key={notification.id}
              layout
              initial={{ opacity: 0, x: 300, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 300, scale: 0.8 }}
              className={`
                relative p-4 rounded-lg border-l-4 shadow-lg backdrop-blur-sm
                pointer-events-auto
                ${notificationColors[notification.type]}
              `}
            >
              <div className="flex items-start gap-3">
                <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm">
                    {notification.title}
                  </h4>
                  <p className="text-sm opacity-90 mt-1">
                    {notification.message}
                  </p>
                  
                  {notification.action && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 h-7 text-xs"
                      onClick={notification.action.onClick}
                    >
                      {notification.action.label}
                    </Button>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-6 h-6 p-0 opacity-70 hover:opacity-100"
                  onClick={() => removeNotification(notification.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </BaseUIComponent>
  )
}
```

## HUD Systems

### 1. Game HUD Component

Create `/src/components/game-ui/GameHUD.tsx`:

```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { usePlayerStore } from '@/lib/store/player'
import { useUIStore } from '@/lib/store/ui'
import { BaseUIComponent } from './BaseUIComponent'
import { PlayerHealthBar } from './PlayerHealthBar'
import { ExperienceBar } from './ExperienceBar'
import { QuickActions } from './QuickActions'
import { MiniMap } from './MiniMap'

interface GameHUDProps {
  activeScene: string
  onAccountClick?: () => void
}

export function GameHUD({ activeScene, onAccountClick }: GameHUDProps) {
  const { player } = usePlayerStore()
  const { isMobile } = useUIStore()
  
  // Don't show HUD on menu scenes
  const showHUD = activeScene === 'DungeonScene' || activeScene === 'ArmoryScene'
  
  if (!showHUD || !player) return null

  return (
    <>
      {/* Top HUD */}
      <BaseUIComponent
        className="top-4 left-4 right-4 flex justify-between items-start"
        zIndex={100}
      >
        {/* Left side - Player stats */}
        <div className="flex flex-col gap-2">
          <PlayerHealthBar 
            health={player.health}
            maxHealth={player.maxHealth}
            shield={player.shield}
          />
          <ExperienceBar 
            level={player.level}
            experience={player.experience}
            nextLevelXP={player.nextLevelXP}
          />
        </div>

        {/* Right side - Mini map and account */}
        <div className="flex flex-col gap-2 items-end">
          {!isMobile && <MiniMap />}
          <button
            onClick={onAccountClick}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
          >
            Account
          </button>
        </div>
      </BaseUIComponent>

      {/* Bottom HUD */}
      <BaseUIComponent
        className="bottom-4 left-4 right-4 flex justify-center"
        zIndex={100}
      >
        <QuickActions />
      </BaseUIComponent>
    </>
  )
}
```

### 2. Health Bar Component

Create `/src/components/game-ui/PlayerHealthBar.tsx`:

```typescript
'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Heart, Shield } from 'lucide-react'

interface PlayerHealthBarProps {
  health: number
  maxHealth: number
  shield: number
}

export function PlayerHealthBar({ health, maxHealth, shield }: PlayerHealthBarProps) {
  const healthPercentage = (health / maxHealth) * 100
  const hasShield = shield > 0

  return (
    <div className="flex items-center gap-2 bg-black bg-opacity-50 rounded-lg px-3 py-2">
      <Heart className="w-4 h-4 text-red-500" />
      
      <div className="relative w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
        {/* Health bar background */}
        <motion.div
          className="absolute inset-0 bg-red-600 rounded-full"
          initial={{ width: '100%' }}
          animate={{ width: `${healthPercentage}%` }}
          transition={{ duration: 0.3 }}
        />
        
        {/* Shield overlay */}
        {hasShield && (
          <motion.div
            className="absolute inset-0 bg-blue-400 rounded-full opacity-70"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (shield / maxHealth) * 100)}%` }}
            transition={{ duration: 0.3 }}
          />
        )}
      </div>

      <span className="text-white text-sm font-mono min-w-[3rem]">
        {health}/{maxHealth}
      </span>

      {hasShield && (
        <>
          <Shield className="w-4 h-4 text-blue-400" />
          <span className="text-blue-400 text-sm font-mono">
            {shield}
          </span>
        </>
      )}
    </div>
  )
}
```

## Window Management

### 1. Window Manager

Create `/src/components/game-ui/WindowManager.tsx`:

```typescript
'use client'

import React from 'react'
import { useUIStore, UIWindow } from '@/lib/store/ui'
import type { Game } from 'phaser'

// Import window components
import { CharacterWindow } from './windows/CharacterWindow'
import { InventoryWindow } from './windows/InventoryWindow'
import { CraftingWindow } from './windows/CraftingWindow'
import { SettingsWindow } from './windows/SettingsWindow'
import { AchievementsWindow } from './windows/AchievementsWindow'

interface WindowManagerProps {
  game: Game | null
}

export function WindowManager({ game }: WindowManagerProps) {
  const { openWindows, closeWindow } = useUIStore()

  return (
    <>
      <CharacterWindow
        isOpen={openWindows.includes(UIWindow.Character)}
        onClose={() => closeWindow(UIWindow.Character)}
        game={game}
      />
      
      <InventoryWindow
        isOpen={openWindows.includes(UIWindow.Inventory)}
        onClose={() => closeWindow(UIWindow.Inventory)}
        game={game}
      />
      
      <CraftingWindow
        isOpen={openWindows.includes(UIWindow.Crafting)}
        onClose={() => closeWindow(UIWindow.Crafting)}
        game={game}
      />
      
      <SettingsWindow
        isOpen={openWindows.includes(UIWindow.Settings)}
        onClose={() => closeWindow(UIWindow.Settings)}
        game={game}
      />
      
      <AchievementsWindow
        isOpen={openWindows.includes(UIWindow.Achievements)}
        onClose={() => closeWindow(UIWindow.Achievements)}
        game={game}
      />
    </>
  )
}
```

### 2. Example Window Component

Create `/src/components/game-ui/windows/InventoryWindow.tsx`:

```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { BaseWindow } from '../BaseWindow'
import { usePlayerStore } from '@/lib/store/player'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Game } from 'phaser'

interface InventoryWindowProps {
  isOpen: boolean
  onClose: () => void
  game: Game | null
}

export function InventoryWindow({ isOpen, onClose, game }: InventoryWindowProps) {
  const { player, updatePlayerInventory } = usePlayerStore()
  const [selectedTab, setSelectedTab] = useState('items')

  // Sync with game state
  useEffect(() => {
    if (game && isOpen) {
      // Get inventory data from game
      const gameScene = game.scene.getScene('DungeonScene')
      if (gameScene) {
        // Update inventory from game state
        // updatePlayerInventory(gameInventory)
      }
    }
  }, [game, isOpen, updatePlayerInventory])

  if (!player) return null

  return (
    <BaseWindow
      title="Inventory"
      isOpen={isOpen}
      onClose={onClose}
      width={500}
      height={400}
      draggable={true}
    >
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="consumables">Consumables</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-4">
          <div className="grid grid-cols-6 gap-2">
            {player.inventory.items.map((item, index) => (
              <div
                key={index}
                className="aspect-square bg-gray-700 border border-gray-600 rounded p-1 flex items-center justify-center cursor-pointer hover:bg-gray-600 transition-colors"
                title={item?.name || 'Empty Slot'}
              >
                {item && (
                  <img
                    src={item.icon}
                    alt={item.name}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="equipment" className="mt-4">
          <div className="space-y-2">
            {Object.entries(player.equipment).map(([slot, item]) => (
              <div
                key={slot}
                className="flex items-center gap-3 p-2 bg-gray-700 rounded"
              >
                <div className="w-8 h-8 bg-gray-600 rounded flex items-center justify-center">
                  {item && (
                    <img
                      src={item.icon}
                      alt={item.name}
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white capitalize">
                    {slot}
                  </div>
                  <div className="text-xs text-gray-400">
                    {item?.name || 'Empty'}
                  </div>
                </div>
                {item && (
                  <Button size="sm" variant="outline">
                    Unequip
                  </Button>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="consumables" className="mt-4">
          <div className="grid grid-cols-4 gap-2">
            {player.inventory.consumables.map((item, index) => (
              <div
                key={index}
                className="aspect-square bg-gray-700 border border-gray-600 rounded p-1 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-600 transition-colors"
              >
                {item && (
                  <>
                    <img
                      src={item.icon}
                      alt={item.name}
                      className="w-8 h-8 object-contain"
                    />
                    <span className="text-xs text-center mt-1">
                      {item.quantity}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </BaseWindow>
  )
}
```

## Mobile UI

### 1. Mobile Controls

Create `/src/components/game-ui/MobileControls.tsx`:

```typescript
'use client'

import React, { useEffect, useState } from 'react'
import { useUIStore } from '@/lib/store/ui'
import { BaseUIComponent } from './BaseUIComponent'
import EventBus from '@/lib/EventBus'

interface TouchControlProps {
  onTouch: (direction: { x: number; y: number }) => void
  className?: string
}

function VirtualJoystick({ onTouch, className }: TouchControlProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    e.preventDefault()
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return

    const touch = e.touches[0]
    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const deltaX = touch.clientX - centerX
    const deltaY = touch.clientY - centerY

    // Limit to circle radius
    const maxRadius = rect.width / 2 - 20
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    
    let x = deltaX
    let y = deltaY

    if (distance > maxRadius) {
      x = (deltaX / distance) * maxRadius
      y = (deltaY / distance) * maxRadius
    }

    setPosition({ x, y })
    
    // Normalize for game input
    const normalizedX = x / maxRadius
    const normalizedY = y / maxRadius
    
    onTouch({ x: normalizedX, y: normalizedY })
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    setPosition({ x: 0, y: 0 })
    onTouch({ x: 0, y: 0 })
  }

  return (
    <div
      className={`relative w-24 h-24 bg-gray-800 bg-opacity-50 rounded-full border-2 border-gray-600 ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="absolute w-8 h-8 bg-gray-400 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-transform"
        style={{
          transform: `translate(${position.x - 16}px, ${position.y - 16}px)`
        }}
      />
    </div>
  )
}

export function MobileControls() {
  const { isMobile, showMobileControls, setIsMobile } = useUIStore()

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768 || 'ontouchstart' in window
      setIsMobile(mobile)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [setIsMobile])

  const handleMovement = ({ x, y }: { x: number; y: number }) => {
    // Emit movement to game
    EventBus.emit('mobileInput', {
      type: 'movement',
      data: { x, y }
    })
  }

  const handleAction = (action: string) => {
    EventBus.emit('mobileInput', {
      type: 'action',
      data: { action }
    })
  }

  if (!isMobile || !showMobileControls) return null

  return (
    <>
      {/* Movement controls */}
      <BaseUIComponent
        className="bottom-4 left-4"
        zIndex={200}
      >
        <VirtualJoystick onTouch={handleMovement} />
      </BaseUIComponent>

      {/* Action buttons */}
      <BaseUIComponent
        className="bottom-4 right-4 flex gap-2"
        zIndex={200}
      >
        <button
          className="w-12 h-12 bg-red-600 bg-opacity-70 rounded-full flex items-center justify-center text-white font-bold border-2 border-red-400"
          onTouchStart={() => handleAction('attack')}
        >
          A
        </button>
        
        <button
          className="w-12 h-12 bg-blue-600 bg-opacity-70 rounded-full flex items-center justify-center text-white font-bold border-2 border-blue-400"
          onTouchStart={() => handleAction('special')}
        >
          S
        </button>
      </BaseUIComponent>

      {/* Menu button */}
      <BaseUIComponent
        className="top-4 right-4"
        zIndex={200}
      >
        <button
          className="w-10 h-10 bg-gray-600 bg-opacity-70 rounded flex items-center justify-center text-white"
          onClick={() => EventBus.emit('toggleUI', UIWindow.GameMenu)}
        >
          ☰
        </button>
      </BaseUIComponent>
    </>
  )
}
```

## Performance Optimization

### 1. Optimized Rendering

```typescript
// Use React.memo for expensive components
export const ExpensiveUIComponent = React.memo(({ data }: { data: any }) => {
  return (
    <div>
      {/* Complex rendering logic */}
    </div>
  )
})

// Use useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return calculateExpensiveValue(gameData)
}, [gameData])

// Use useCallback for event handlers
const handleClick = useCallback(() => {
  // Handle click
}, [dependency])
```

### 2. Event Debouncing

```typescript
import { useMemo } from 'react'
import { debounce } from 'lodash'

export function useDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  return useMemo(
    () => debounce(callback, delay),
    [callback, delay]
  )
}
```

### 3. Virtual Scrolling for Large Lists

```typescript
import { FixedSizeList as List } from 'react-window'

function LargeInventoryList({ items }: { items: any[] }) {
  const Row = ({ index, style }: { index: number; style: any }) => (
    <div style={style}>
      <InventoryItem item={items[index]} />
    </div>
  )

  return (
    <List
      height={300}
      itemCount={items.length}
      itemSize={60}
      width="100%"
    >
      {Row}
    </List>
  )
}
```

## Best Practices

### 1. Component Organization
- Use composition over inheritance
- Keep components small and focused
- Implement proper TypeScript interfaces
- Use consistent naming conventions

### 2. State Management
- Separate UI state from game state
- Use Zustand subscriptions efficiently
- Implement proper error boundaries
- Handle loading and error states

### 3. Performance
- Minimize re-renders with React.memo
- Use virtual scrolling for large lists
- Implement proper event cleanup
- Optimize animation performance

### 4. Accessibility
- Include proper ARIA labels
- Support keyboard navigation
- Provide screen reader support
- Maintain proper focus management

### 5. Mobile Optimization
- Design for touch interactions
- Use appropriate touch targets
- Implement responsive layouts
- Consider performance on mobile devices

## Next Steps

1. **Read SpriteImport.md** - Learn sprite management and animation
2. **Read Scenes.md** - Master scene architecture and transitions  
3. **Read StateManagement.md** - Implement cross-system state management
4. **Read EventSystem.md** - Deep dive into event communication patterns

This UI system provides a powerful foundation for creating modern, responsive game interfaces that seamlessly integrate with Phaser games while maintaining excellent performance and user experience. 