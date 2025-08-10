# State Management Guide
*Cross-System State Management for Phaser 3 Games*

## Table of Contents
1. [Overview](#overview)
2. [Zustand Integration](#zustand-integration)
3. [Store Architecture](#store-architecture)
4. [React-Phaser Synchronization](#react-phaser-synchronization)
5. [Persistence and Save System](#persistence-and-save-system)
6. [Performance Optimization](#performance-optimization)
7. [Advanced Patterns](#advanced-patterns)
8. [Best Practices](#best-practices)

## Overview

State management in Phaser games requires coordinating between the game engine, React UI components, and external systems. This guide covers implementing a robust state management system using Zustand that seamlessly bridges all components.

### Key Principles

- **Single Source of Truth**: Centralized state management
- **Reactive Updates**: Automatic UI synchronization
- **Performance**: Minimal re-renders and efficient updates
- **Persistence**: Reliable save/load functionality
- **Type Safety**: Full TypeScript support

## Zustand Integration

### 1. Core Store Setup

Create `/src/lib/store/types.ts`:

```typescript
// Base types for all stores
export interface BaseStoreState {
  isLoading: boolean
  error: string | null
  lastUpdated: number
}

export interface StoreSubscription<T> {
  callback: (state: T) => void
  selector?: (state: T) => any
}

export interface StorePersistence<T> {
  key: string
  version: number
  migrate?: (persistedState: any, version: number) => T
  partialize?: (state: T) => Partial<T>
}

// Game-specific types
export interface Position {
  x: number
  y: number
}

export interface GameEntity {
  id: string
  position: Position
  health: number
  maxHealth: number
  isActive: boolean
}

export interface InventoryItem {
  id: string
  name: string
  type: 'weapon' | 'armor' | 'consumable' | 'material'
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  quantity: number
  stats?: Record<string, number>
  icon: string
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlockedAt?: number
  progress: number
  maxProgress: number
  rewards: {
    experience?: number
    gold?: number
    items?: string[]
  }
}
```

### 2. Base Store Creator

Create `/src/lib/store/createBaseStore.ts`:

```typescript
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { persist } from 'zustand/middleware'
import { BaseStoreState, StorePersistence } from './types'

export interface BaseStoreActions {
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  updateTimestamp: () => void
  reset: () => void
}

export function createBaseStore<T extends BaseStoreState>(
  initialState: Omit<T, keyof BaseStoreState>,
  actions: (set: any, get: any) => any,
  persistence?: StorePersistence<T>
) {
  const baseState: BaseStoreState = {
    isLoading: false,
    error: null,
    lastUpdated: Date.now()
  }

  const baseActions: BaseStoreActions = {
    setLoading: (loading: boolean) => 
      set({ isLoading: loading }),
    
    setError: (error: string | null) => 
      set({ error, isLoading: false }),
    
    clearError: () => 
      set({ error: null }),
    
    updateTimestamp: () => 
      set({ lastUpdated: Date.now() }),
    
    reset: () => 
      set({ ...baseState, ...initialState })
  }

  const storeConfig = (set: any, get: any) => ({
    ...baseState,
    ...initialState,
    ...baseActions,
    ...actions(set, get)
  })

  if (persistence) {
    return create<T>()(
      subscribeWithSelector(
        persist(storeConfig, {
          name: persistence.key,
          version: persistence.version,
          migrate: persistence.migrate,
          partialize: persistence.partialize
        })
      )
    )
  }

  return create<T>()(subscribeWithSelector(storeConfig))
}
```

## Store Architecture

### 1. Player Store

Create `/src/lib/store/player.ts`:

```typescript
import { createBaseStore } from './createBaseStore'
import { BaseStoreState, Position, InventoryItem, Achievement } from './types'

export interface PlayerCharacter {
  id: string
  name: string
  class: 'warrior' | 'mage' | 'archer'
  level: number
  experience: number
  experienceToNext: number
  stats: {
    health: number
    maxHealth: number
    mana: number
    maxMana: number
    attack: number
    defense: number
    speed: number
  }
  position: Position
  gold: number
}

export interface PlayerState extends BaseStoreState {
  // Core player data
  player: PlayerCharacter | null
  selectedCharacterClass: string | null
  
  // Inventory system
  inventory: {
    items: InventoryItem[]
    maxSlots: number
    equipment: {
      weapon?: InventoryItem
      armor?: InventoryItem
      accessory?: InventoryItem
    }
  }
  
  // Achievement system
  achievements: Achievement[]
  unlockedAchievements: string[]
  
  // Session data
  session: {
    playTime: number
    lastSaveTime: number
    currentLevel: string
    checkpoints: string[]
  }
}

export interface PlayerActions {
  // Character management
  createCharacter: (characterClass: string, name: string) => void
  selectCharacterClass: (characterClass: string) => void
  updatePlayerStats: (stats: Partial<PlayerCharacter['stats']>) => void
  updatePlayerPosition: (position: Position) => void
  
  // Experience and leveling
  gainExperience: (amount: number) => void
  levelUp: () => void
  
  // Gold management
  addGold: (amount: number) => void
  spendGold: (amount: number) => boolean
  
  // Inventory management
  addItem: (item: InventoryItem) => boolean
  removeItem: (itemId: string, quantity?: number) => boolean
  equipItem: (itemId: string) => boolean
  unequipItem: (slot: keyof PlayerState['inventory']['equipment']) => void
  useItem: (itemId: string) => boolean
  
  // Achievement system
  unlockAchievement: (achievementId: string) => void
  updateAchievementProgress: (achievementId: string, progress: number) => void
  
  // Session management
  updatePlayTime: (deltaTime: number) => void
  saveCheckpoint: (checkpoint: string) => void
  loadCheckpoint: (checkpoint: string) => void
}

const initialPlayerState: Omit<PlayerState, keyof BaseStoreState> = {
  player: null,
  selectedCharacterClass: null,
  inventory: {
    items: [],
    maxSlots: 30,
    equipment: {}
  },
  achievements: [],
  unlockedAchievements: [],
  session: {
    playTime: 0,
    lastSaveTime: Date.now(),
    currentLevel: '',
    checkpoints: []
  }
}

export const usePlayerStore = createBaseStore<PlayerState>(
  initialPlayerState,
  (set, get) => ({
    // Character management
    createCharacter: (characterClass: string, name: string) => {
      const baseStats = getBaseStatsForClass(characterClass)
      const newPlayer: PlayerCharacter = {
        id: generateId(),
        name,
        class: characterClass as any,
        level: 1,
        experience: 0,
        experienceToNext: 100,
        stats: baseStats,
        position: { x: 0, y: 0 },
        gold: 100
      }
      
      set({ 
        player: newPlayer,
        selectedCharacterClass: characterClass
      })
    },

    selectCharacterClass: (characterClass: string) => {
      set({ selectedCharacterClass: characterClass })
    },

    updatePlayerStats: (stats: Partial<PlayerCharacter['stats']>) => {
      const player = get().player
      if (!player) return
      
      set({
        player: {
          ...player,
          stats: { ...player.stats, ...stats }
        }
      })
    },

    updatePlayerPosition: (position: Position) => {
      const player = get().player
      if (!player) return
      
      set({
        player: { ...player, position }
      })
    },

    // Experience and leveling
    gainExperience: (amount: number) => {
      const player = get().player
      if (!player) return
      
      const newExperience = player.experience + amount
      let newLevel = player.level
      let experienceToNext = player.experienceToNext
      
      // Check for level ups
      while (newExperience >= experienceToNext) {
        newLevel++
        experienceToNext = calculateExperienceToNext(newLevel)
      }
      
      const updatedPlayer = {
        ...player,
        experience: newExperience,
        level: newLevel,
        experienceToNext
      }
      
      set({ player: updatedPlayer })
      
      // Level up effects
      if (newLevel > player.level) {
        get().levelUp()
      }
    },

    levelUp: () => {
      const player = get().player
      if (!player) return
      
      // Increase stats on level up
      const statIncrease = getStatIncreaseForClass(player.class)
      
      set({
        player: {
          ...player,
          stats: {
            ...player.stats,
            maxHealth: player.stats.maxHealth + statIncrease.health,
            health: player.stats.maxHealth + statIncrease.health, // Full heal on level up
            maxMana: player.stats.maxMana + statIncrease.mana,
            mana: player.stats.maxMana + statIncrease.mana,
            attack: player.stats.attack + statIncrease.attack,
            defense: player.stats.defense + statIncrease.defense,
            speed: player.stats.speed + statIncrease.speed
          }
        }
      })
      
      // Emit level up event
      EventBus.emit('playerLevelUp', player.level + 1)
    },

    // Gold management
    addGold: (amount: number) => {
      const player = get().player
      if (!player) return
      
      set({
        player: { ...player, gold: player.gold + amount }
      })
    },

    spendGold: (amount: number) => {
      const player = get().player
      if (!player || player.gold < amount) return false
      
      set({
        player: { ...player, gold: player.gold - amount }
      })
      return true
    },

    // Inventory management
    addItem: (item: InventoryItem) => {
      const { inventory } = get()
      
      // Check if inventory is full
      if (inventory.items.length >= inventory.maxSlots) {
        return false
      }
      
      // Check if item already exists (for stackable items)
      const existingItemIndex = inventory.items.findIndex(
        existingItem => existingItem.id === item.id
      )
      
      if (existingItemIndex !== -1 && item.type === 'consumable') {
        // Stack with existing item
        const updatedItems = [...inventory.items]
        updatedItems[existingItemIndex].quantity += item.quantity
        
        set({
          inventory: { ...inventory, items: updatedItems }
        })
      } else {
        // Add as new item
        set({
          inventory: {
            ...inventory,
            items: [...inventory.items, item]
          }
        })
      }
      
      return true
    },

    removeItem: (itemId: string, quantity = 1) => {
      const { inventory } = get()
      const itemIndex = inventory.items.findIndex(item => item.id === itemId)
      
      if (itemIndex === -1) return false
      
      const updatedItems = [...inventory.items]
      const item = updatedItems[itemIndex]
      
      if (item.quantity <= quantity) {
        // Remove item completely
        updatedItems.splice(itemIndex, 1)
      } else {
        // Reduce quantity
        updatedItems[itemIndex] = {
          ...item,
          quantity: item.quantity - quantity
        }
      }
      
      set({
        inventory: { ...inventory, items: updatedItems }
      })
      
      return true
    },

    equipItem: (itemId: string) => {
      const { inventory } = get()
      const item = inventory.items.find(item => item.id === itemId)
      
      if (!item || (item.type !== 'weapon' && item.type !== 'armor')) {
        return false
      }
      
      // Determine equipment slot
      const slot = item.type === 'weapon' ? 'weapon' : 'armor'
      
      // Unequip current item in slot
      const currentEquipped = inventory.equipment[slot]
      let updatedItems = [...inventory.items]
      
      if (currentEquipped) {
        // Add current equipped item back to inventory
        updatedItems.push(currentEquipped)
      }
      
      // Remove new item from inventory
      const itemIndex = updatedItems.findIndex(i => i.id === itemId)
      if (itemIndex !== -1) {
        updatedItems.splice(itemIndex, 1)
      }
      
      set({
        inventory: {
          ...inventory,
          items: updatedItems,
          equipment: {
            ...inventory.equipment,
            [slot]: item
          }
        }
      })
      
      // Apply item stats
      if (item.stats) {
        const player = get().player
        if (player) {
          const updatedStats = { ...player.stats }
          Object.entries(item.stats).forEach(([stat, value]) => {
            if (stat in updatedStats) {
              (updatedStats as any)[stat] += value
            }
          })
          
          set({
            player: { ...player, stats: updatedStats }
          })
        }
      }
      
      return true
    },

    unequipItem: (slot: keyof PlayerState['inventory']['equipment']) => {
      const { inventory, player } = get()
      const equippedItem = inventory.equipment[slot]
      
      if (!equippedItem) return
      
      // Add item back to inventory
      const updatedItems = [...inventory.items, equippedItem]
      
      set({
        inventory: {
          ...inventory,
          items: updatedItems,
          equipment: {
            ...inventory.equipment,
            [slot]: undefined
          }
        }
      })
      
      // Remove item stats
      if (equippedItem.stats && player) {
        const updatedStats = { ...player.stats }
        Object.entries(equippedItem.stats).forEach(([stat, value]) => {
          if (stat in updatedStats) {
            (updatedStats as any)[stat] -= value
          }
        })
        
        set({
          player: { ...player, stats: updatedStats }
        })
      }
    },

    useItem: (itemId: string) => {
      const { inventory, player } = get()
      const item = inventory.items.find(item => item.id === itemId)
      
      if (!item || item.type !== 'consumable' || !player) {
        return false
      }
      
      // Apply item effects (this would be expanded based on item types)
      if (item.name === 'Health Potion') {
        const healAmount = 50
        const newHealth = Math.min(player.stats.maxHealth, player.stats.health + healAmount)
        
        set({
          player: {
            ...player,
            stats: { ...player.stats, health: newHealth }
          }
        })
      }
      
      // Remove one quantity of the item
      get().removeItem(itemId, 1)
      
      return true
    },

    // Achievement system
    unlockAchievement: (achievementId: string) => {
      const { unlockedAchievements, achievements } = get()
      
      if (unlockedAchievements.includes(achievementId)) return
      
      const achievement = achievements.find(a => a.id === achievementId)
      if (!achievement) return
      
      set({
        unlockedAchievements: [...unlockedAchievements, achievementId]
      })
      
      // Apply achievement rewards
      if (achievement.rewards.experience) {
        get().gainExperience(achievement.rewards.experience)
      }
      
      if (achievement.rewards.gold) {
        get().addGold(achievement.rewards.gold)
      }
      
      if (achievement.rewards.items) {
        achievement.rewards.items.forEach(itemId => {
          // Add reward items to inventory
          const rewardItem = getItemById(itemId)
          if (rewardItem) {
            get().addItem(rewardItem)
          }
        })
      }
      
      // Emit achievement unlocked event
      EventBus.emit('achievementUnlocked', achievement)
    },

    updateAchievementProgress: (achievementId: string, progress: number) => {
      const { achievements } = get()
      const achievementIndex = achievements.findIndex(a => a.id === achievementId)
      
      if (achievementIndex === -1) return
      
      const updatedAchievements = [...achievements]
      updatedAchievements[achievementIndex] = {
        ...updatedAchievements[achievementIndex],
        progress: Math.min(progress, updatedAchievements[achievementIndex].maxProgress)
      }
      
      set({ achievements: updatedAchievements })
      
      // Check if achievement is completed
      const achievement = updatedAchievements[achievementIndex]
      if (achievement.progress >= achievement.maxProgress && !achievement.unlockedAt) {
        get().unlockAchievement(achievementId)
      }
    },

    // Session management
    updatePlayTime: (deltaTime: number) => {
      const { session } = get()
      set({
        session: {
          ...session,
          playTime: session.playTime + deltaTime
        }
      })
    },

    saveCheckpoint: (checkpoint: string) => {
      const { session } = get()
      const updatedCheckpoints = [...session.checkpoints]
      
      if (!updatedCheckpoints.includes(checkpoint)) {
        updatedCheckpoints.push(checkpoint)
      }
      
      set({
        session: {
          ...session,
          checkpoints: updatedCheckpoints,
          lastSaveTime: Date.now()
        }
      })
    },

    loadCheckpoint: (checkpoint: string) => {
      const { session } = get()
      
      if (!session.checkpoints.includes(checkpoint)) return
      
      set({
        session: {
          ...session,
          currentLevel: checkpoint
        }
      })
      
      // Emit checkpoint loaded event
      EventBus.emit('checkpointLoaded', checkpoint)
    }
  }),
  {
    key: 'player-store',
    version: 1,
    partialize: (state) => ({
      player: state.player,
      selectedCharacterClass: state.selectedCharacterClass,
      inventory: state.inventory,
      achievements: state.achievements,
      unlockedAchievements: state.unlockedAchievements,
      session: state.session
    })
  }
)

// Utility functions
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function getBaseStatsForClass(characterClass: string) {
  const baseStats = {
    warrior: { health: 120, maxHealth: 120, mana: 30, maxMana: 30, attack: 15, defense: 12, speed: 8 },
    mage: { health: 80, maxHealth: 80, mana: 80, maxMana: 80, attack: 12, defense: 6, speed: 10 },
    archer: { health: 100, maxHealth: 100, mana: 50, maxMana: 50, attack: 14, defense: 8, speed: 12 }
  }
  
  return baseStats[characterClass as keyof typeof baseStats] || baseStats.warrior
}

function getStatIncreaseForClass(characterClass: string) {
  const increases = {
    warrior: { health: 10, mana: 2, attack: 3, defense: 2, speed: 1 },
    mage: { health: 5, mana: 8, attack: 2, defense: 1, speed: 2 },
    archer: { health: 7, mana: 4, attack: 2, defense: 1, speed: 3 }
  }
  
  return increases[characterClass as keyof typeof increases] || increases.warrior
}

function calculateExperienceToNext(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1))
}

function getItemById(itemId: string): InventoryItem | null {
  // This would typically fetch from a game database or config
  const items: Record<string, InventoryItem> = {
    'health-potion': {
      id: 'health-potion',
      name: 'Health Potion',
      type: 'consumable',
      rarity: 'common',
      quantity: 1,
      icon: '/assets/items/health-potion.png'
    }
    // ... more items
  }
  
  return items[itemId] || null
}
```

### 2. Game State Store

Create `/src/lib/store/game.ts`:

```typescript
import { createBaseStore } from './createBaseStore'
import { BaseStoreState } from './types'

export interface GameSettings {
  audio: {
    masterVolume: number
    musicVolume: number
    sfxVolume: number
    muted: boolean
  }
  graphics: {
    quality: 'low' | 'medium' | 'high'
    fullscreen: boolean
    vsync: boolean
    showFPS: boolean
  }
  controls: {
    keyBindings: Record<string, string>
    mouseSensitivity: number
    autoRun: boolean
  }
  gameplay: {
    difficulty: 'easy' | 'normal' | 'hard'
    autoSave: boolean
    tutorialEnabled: boolean
  }
}

export interface GameState extends BaseStoreState {
  // Game status
  isPaused: boolean
  isMenuOpen: boolean
  currentScene: string
  gameMode: 'story' | 'endless' | 'custom'
  
  // Settings
  settings: GameSettings
  
  // Performance
  performance: {
    fps: number
    memory: number
    drawCalls: number
    activeObjects: number
  }
  
  // Debug
  debug: {
    enabled: boolean
    showHitboxes: boolean
    showPerformance: boolean
    godMode: boolean
  }
}

export interface GameActions {
  // Game control
  pauseGame: () => void
  resumeGame: () => void
  togglePause: () => void
  openMenu: () => void
  closeMenu: () => void
  setCurrentScene: (scene: string) => void
  setGameMode: (mode: GameState['gameMode']) => void
  
  // Settings
  updateSettings: (settings: Partial<GameSettings>) => void
  updateAudioSettings: (audio: Partial<GameSettings['audio']>) => void
  updateGraphicsSettings: (graphics: Partial<GameSettings['graphics']>) => void
  updateControlSettings: (controls: Partial<GameSettings['controls']>) => void
  updateGameplaySettings: (gameplay: Partial<GameSettings['gameplay']>) => void
  resetSettings: () => void
  
  // Performance monitoring
  updatePerformance: (performance: Partial<GameState['performance']>) => void
  
  // Debug
  toggleDebug: () => void
  setDebugOption: (option: keyof GameState['debug'], value: boolean) => void
}

const defaultSettings: GameSettings = {
  audio: {
    masterVolume: 1.0,
    musicVolume: 0.7,
    sfxVolume: 0.8,
    muted: false
  },
  graphics: {
    quality: 'medium',
    fullscreen: false,
    vsync: true,
    showFPS: false
  },
  controls: {
    keyBindings: {
      moveUp: 'KeyW',
      moveDown: 'KeyS',
      moveLeft: 'KeyA',
      moveRight: 'KeyD',
      attack: 'Space',
      interact: 'KeyE',
      inventory: 'KeyI',
      menu: 'Escape'
    },
    mouseSensitivity: 1.0,
    autoRun: false
  },
  gameplay: {
    difficulty: 'normal',
    autoSave: true,
    tutorialEnabled: true
  }
}

const initialGameState: Omit<GameState, keyof BaseStoreState> = {
  isPaused: false,
  isMenuOpen: false,
  currentScene: 'MainMenuScene',
  gameMode: 'story',
  settings: defaultSettings,
  performance: {
    fps: 60,
    memory: 0,
    drawCalls: 0,
    activeObjects: 0
  },
  debug: {
    enabled: false,
    showHitboxes: false,
    showPerformance: false,
    godMode: false
  }
}

export const useGameStore = createBaseStore<GameState>(
  initialGameState,
  (set, get) => ({
    // Game control
    pauseGame: () => {
      set({ isPaused: true })
      EventBus.emit('gamePaused')
    },

    resumeGame: () => {
      set({ isPaused: false })
      EventBus.emit('gameResumed')
    },

    togglePause: () => {
      const { isPaused } = get()
      if (isPaused) {
        get().resumeGame()
      } else {
        get().pauseGame()
      }
    },

    openMenu: () => {
      set({ isMenuOpen: true })
      get().pauseGame()
    },

    closeMenu: () => {
      set({ isMenuOpen: false })
      get().resumeGame()
    },

    setCurrentScene: (scene: string) => {
      set({ currentScene: scene })
    },

    setGameMode: (mode: GameState['gameMode']) => {
      set({ gameMode: mode })
    },

    // Settings management
    updateSettings: (newSettings: Partial<GameSettings>) => {
      const { settings } = get()
      set({
        settings: { ...settings, ...newSettings }
      })
    },

    updateAudioSettings: (audio: Partial<GameSettings['audio']>) => {
      const { settings } = get()
      set({
        settings: {
          ...settings,
          audio: { ...settings.audio, ...audio }
        }
      })
      
      // Apply audio settings immediately
      EventBus.emit('audioSettingsChanged', { ...settings.audio, ...audio })
    },

    updateGraphicsSettings: (graphics: Partial<GameSettings['graphics']>) => {
      const { settings } = get()
      set({
        settings: {
          ...settings,
          graphics: { ...settings.graphics, ...graphics }
        }
      })
      
      // Apply graphics settings immediately
      EventBus.emit('graphicsSettingsChanged', { ...settings.graphics, ...graphics })
    },

    updateControlSettings: (controls: Partial<GameSettings['controls']>) => {
      const { settings } = get()
      set({
        settings: {
          ...settings,
          controls: { ...settings.controls, ...controls }
        }
      })
      
      // Apply control settings immediately
      EventBus.emit('controlSettingsChanged', { ...settings.controls, ...controls })
    },

    updateGameplaySettings: (gameplay: Partial<GameSettings['gameplay']>) => {
      const { settings } = get()
      set({
        settings: {
          ...settings,
          gameplay: { ...settings.gameplay, ...gameplay }
        }
      })
    },

    resetSettings: () => {
      set({ settings: defaultSettings })
      EventBus.emit('settingsReset')
    },

    // Performance monitoring
    updatePerformance: (newPerformance: Partial<GameState['performance']>) => {
      const { performance } = get()
      set({
        performance: { ...performance, ...newPerformance }
      })
    },

    // Debug
    toggleDebug: () => {
      const { debug } = get()
      set({
        debug: { ...debug, enabled: !debug.enabled }
      })
    },

    setDebugOption: (option: keyof GameState['debug'], value: boolean) => {
      const { debug } = get()
      set({
        debug: { ...debug, [option]: value }
      })
    }
  }),
  {
    key: 'game-store',
    version: 1,
    partialize: (state) => ({
      settings: state.settings,
      gameMode: state.gameMode,
      debug: state.debug
    })
  }
)
```

## React-Phaser Synchronization

### 1. State Bridge Hook

Create `/src/hooks/useGameState.ts`:

```typescript
'use client'

import { useEffect, useCallback } from 'react'
import { usePlayerStore } from '@/lib/store/player'
import { useGameStore } from '@/lib/store/game'
import EventBus from '@/lib/EventBus'
import type { Game } from 'phaser'

interface UseGameStateOptions {
  game?: Game | null
  autoSync?: boolean
  syncInterval?: number
}

export function useGameState({ 
  game, 
  autoSync = true, 
  syncInterval = 1000 
}: UseGameStateOptions = {}) {
  const playerStore = usePlayerStore()
  const gameStore = useGameStore()

  // Sync player state from Phaser to store
  const syncPlayerFromGame = useCallback(() => {
    if (!game) return

    try {
      const currentScene = game.scene.scenes.find(scene => scene.scene.isActive())
      if (!currentScene) return

      // Get player data from current scene
      const gamePlayer = (currentScene as any).player
      if (gamePlayer) {
        // Update position
        playerStore.updatePlayerPosition({
          x: gamePlayer.x,
          y: gamePlayer.y
        })

        // Update stats if they've changed
        if (gamePlayer.health !== playerStore.player?.stats.health) {
          playerStore.updatePlayerStats({
            health: gamePlayer.health,
            mana: gamePlayer.mana || playerStore.player?.stats.mana || 0
          })
        }
      }
    } catch (error) {
      console.error('Error syncing player from game:', error)
    }
  }, [game, playerStore])

  // Sync game state from Phaser to store
  const syncGameFromPhaser = useCallback(() => {
    if (!game) return

    try {
      // Update performance metrics
      gameStore.updatePerformance({
        fps: Math.round(game.loop.actualFps),
        activeObjects: game.scene.scenes.reduce((total, scene) => {
          return total + scene.children.length
        }, 0)
      })

      // Update current scene
      const activeScene = game.scene.scenes.find(scene => scene.scene.isActive())
      if (activeScene && activeScene.scene.key !== gameStore.currentScene) {
        gameStore.setCurrentScene(activeScene.scene.key)
      }
    } catch (error) {
      console.error('Error syncing game from Phaser:', error)
    }
  }, [game, gameStore])

  // Sync store state to Phaser game
  const syncToGame = useCallback(() => {
    if (!game) return

    try {
      const currentScene = game.scene.scenes.find(scene => scene.scene.isActive())
      if (!currentScene) return

      // Sync player data to game
      if (playerStore.player) {
        const gamePlayer = (currentScene as any).player
        if (gamePlayer) {
          // Only update if values have changed to avoid unnecessary updates
          if (gamePlayer.x !== playerStore.player.position.x || 
              gamePlayer.y !== playerStore.player.position.y) {
            gamePlayer.setPosition(
              playerStore.player.position.x,
              playerStore.player.position.y
            )
          }

          if (gamePlayer.health !== playerStore.player.stats.health) {
            gamePlayer.setHealth(playerStore.player.stats.health)
          }
        }
      }

      // Sync game settings
      if (gameStore.settings.graphics.showFPS) {
        // Enable FPS display in game
        EventBus.emit('toggleFPS', true)
      }

      if (gameStore.debug.showHitboxes) {
        // Enable hitbox display
        EventBus.emit('toggleHitboxes', true)
      }
    } catch (error) {
      console.error('Error syncing to game:', error)
    }
  }, [game, playerStore.player, gameStore.settings, gameStore.debug])

  // Event handlers for game events
  useEffect(() => {
    const handlePlayerDamage = (damage: number) => {
      const currentHealth = playerStore.player?.stats.health || 0
      playerStore.updatePlayerStats({
        health: Math.max(0, currentHealth - damage)
      })
    }

    const handlePlayerHeal = (amount: number) => {
      const player = playerStore.player
      if (!player) return
      
      playerStore.updatePlayerStats({
        health: Math.min(player.stats.maxHealth, player.stats.health + amount)
      })
    }

    const handleExperienceGain = (amount: number) => {
      playerStore.gainExperience(amount)
    }

    const handleGoldGain = (amount: number) => {
      playerStore.addGold(amount)
    }

    const handleItemPickup = (item: any) => {
      playerStore.addItem(item)
    }

    // Register event listeners
    EventBus.on('playerTakeDamage', handlePlayerDamage)
    EventBus.on('playerHeal', handlePlayerHeal)
    EventBus.on('experienceGain', handleExperienceGain)
    EventBus.on('goldGain', handleGoldGain)
    EventBus.on('itemPickup', handleItemPickup)

    return () => {
      EventBus.off('playerTakeDamage', handlePlayerDamage)
      EventBus.off('playerHeal', handlePlayerHeal)
      EventBus.off('experienceGain', handleExperienceGain)
      EventBus.off('goldGain', handleGoldGain)
      EventBus.off('itemPickup', handleItemPickup)
    }
  }, [playerStore])

  // Auto-sync interval
  useEffect(() => {
    if (!autoSync || !game) return

    const interval = setInterval(() => {
      syncPlayerFromGame()
      syncGameFromPhaser()
    }, syncInterval)

    return () => clearInterval(interval)
  }, [autoSync, game, syncInterval, syncPlayerFromGame, syncGameFromPhaser])

  // Sync to game when store state changes
  useEffect(() => {
    syncToGame()
  }, [syncToGame, playerStore.player, gameStore.settings, gameStore.debug])

  return {
    // Manual sync functions
    syncPlayerFromGame,
    syncGameFromPhaser,
    syncToGame,
    
    // Store access
    playerStore,
    gameStore,
    
    // Utilities
    isGameConnected: !!game
  }
}
```

### 2. Store Provider Component

Create `/src/components/StoreProvider.tsx`:

```typescript
'use client'

import React, { createContext, useContext, useEffect } from 'react'
import { usePlayerStore } from '@/lib/store/player'
import { useGameStore } from '@/lib/store/game'
import { useGameState } from '@/hooks/useGameState'
import type { Game } from 'phaser'

interface StoreContextValue {
  playerStore: ReturnType<typeof usePlayerStore>
  gameStore: ReturnType<typeof useGameStore>
  gameState: ReturnType<typeof useGameState>
}

const StoreContext = createContext<StoreContextValue | null>(null)

interface StoreProviderProps {
  children: React.ReactNode
  game?: Game | null
}

export function StoreProvider({ children, game }: StoreProviderProps) {
  const playerStore = usePlayerStore()
  const gameStore = useGameStore()
  const gameState = useGameState({ game })

  // Initialize stores on mount
  useEffect(() => {
    // Load any initial data
    const savedPlayer = localStorage.getItem('player-store')
    if (savedPlayer) {
      // Player store is already persisted via Zustand middleware
    }

    // Initialize achievements
    if (playerStore.achievements.length === 0) {
      // Load achievement definitions
      playerStore.achievements = getAchievementDefinitions()
    }
  }, [playerStore])

  const value: StoreContextValue = {
    playerStore,
    gameStore,
    gameState
  }

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStores() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStores must be used within a StoreProvider')
  }
  return context
}

// Helper function to get achievement definitions
function getAchievementDefinitions() {
  return [
    {
      id: 'first-level',
      name: 'Getting Started',
      description: 'Complete your first level',
      icon: '/assets/achievements/first-level.png',
      progress: 0,
      maxProgress: 1,
      rewards: {
        experience: 100,
        gold: 50
      }
    },
    {
      id: 'collector',
      name: 'Collector',
      description: 'Collect 100 items',
      icon: '/assets/achievements/collector.png',
      progress: 0,
      maxProgress: 100,
      rewards: {
        experience: 500,
        gold: 200
      }
    }
    // ... more achievements
  ]
}
```

## Persistence and Save System

### 1. Save System Manager

Create `/src/lib/store/saveSystem.ts`:

```typescript
interface SaveData {
  version: number
  timestamp: number
  playerData: any
  gameData: any
  metadata: {
    playTime: number
    level: number
    location: string
  }
}

export class SaveSystemManager {
  private static instance: SaveSystemManager
  private readonly SAVE_VERSION = 1
  private readonly MAX_SAVES = 5

  static getInstance(): SaveSystemManager {
    if (!SaveSystemManager.instance) {
      SaveSystemManager.instance = new SaveSystemManager()
    }
    return SaveSystemManager.instance
  }

  // Create save data from current stores
  createSaveData(): SaveData {
    const playerStore = usePlayerStore.getState()
    const gameStore = useGameStore.getState()

    return {
      version: this.SAVE_VERSION,
      timestamp: Date.now(),
      playerData: {
        player: playerStore.player,
        inventory: playerStore.inventory,
        achievements: playerStore.achievements,
        unlockedAchievements: playerStore.unlockedAchievements,
        session: playerStore.session
      },
      gameData: {
        settings: gameStore.settings,
        gameMode: gameStore.gameMode,
        currentScene: gameStore.currentScene
      },
      metadata: {
        playTime: playerStore.session.playTime,
        level: playerStore.player?.level || 1,
        location: gameStore.currentScene
      }
    }
  }

  // Save to local storage
  async saveToSlot(slot: number): Promise<boolean> {
    try {
      const saveData = this.createSaveData()
      const saveKey = `game-save-${slot}`
      
      localStorage.setItem(saveKey, JSON.stringify(saveData))
      
      // Update save metadata
      this.updateSaveMetadata(slot, saveData.metadata)
      
      EventBus.emit('gameSaved', { slot, timestamp: saveData.timestamp })
      return true
    } catch (error) {
      console.error('Failed to save game:', error)
      EventBus.emit('saveError', error)
      return false
    }
  }

  // Load from local storage
  async loadFromSlot(slot: number): Promise<boolean> {
    try {
      const saveKey = `game-save-${slot}`
      const saveDataString = localStorage.getItem(saveKey)
      
      if (!saveDataString) {
        throw new Error('Save slot is empty')
      }

      const saveData: SaveData = JSON.parse(saveDataString)
      
      // Validate save version
      if (saveData.version !== this.SAVE_VERSION) {
        // Handle version migration if needed
        console.warn('Save version mismatch, attempting migration...')
        // You could implement migration logic here
      }

      // Load player data
      const playerStore = usePlayerStore.getState()
      Object.assign(playerStore, saveData.playerData)

      // Load game data
      const gameStore = useGameStore.getState()
      gameStore.updateSettings(saveData.gameData.settings)
      gameStore.setGameMode(saveData.gameData.gameMode)
      gameStore.setCurrentScene(saveData.gameData.currentScene)

      EventBus.emit('gameLoaded', { slot, timestamp: saveData.timestamp })
      return true
    } catch (error) {
      console.error('Failed to load game:', error)
      EventBus.emit('loadError', error)
      return false
    }
  }

  // Get save metadata for UI
  getSaveMetadata(): Array<{ slot: number; metadata: SaveData['metadata']; timestamp: number } | null> {
    const saves: Array<{ slot: number; metadata: SaveData['metadata']; timestamp: number } | null> = []
    
    for (let slot = 1; slot <= this.MAX_SAVES; slot++) {
      const saveKey = `game-save-${slot}`
      const saveDataString = localStorage.getItem(saveKey)
      
      if (saveDataString) {
        try {
          const saveData: SaveData = JSON.parse(saveDataString)
          saves.push({
            slot,
            metadata: saveData.metadata,
            timestamp: saveData.timestamp
          })
        } catch (error) {
          saves.push(null) // Corrupted save
        }
      } else {
        saves.push(null) // Empty slot
      }
    }
    
    return saves
  }

  // Delete save
  deleteSave(slot: number): boolean {
    try {
      const saveKey = `game-save-${slot}`
      localStorage.removeItem(saveKey)
      
      // Update metadata
      const metadataKey = `save-metadata`
      const metadata = JSON.parse(localStorage.getItem(metadataKey) || '{}')
      delete metadata[slot]
      localStorage.setItem(metadataKey, JSON.stringify(metadata))
      
      EventBus.emit('saveDeleted', { slot })
      return true
    } catch (error) {
      console.error('Failed to delete save:', error)
      return false
    }
  }

  // Auto-save functionality
  setupAutoSave(intervalMinutes: number = 5): () => void {
    const interval = setInterval(() => {
      const gameStore = useGameStore.getState()
      
      if (gameStore.settings.gameplay.autoSave && !gameStore.isPaused) {
        this.saveToSlot(0) // Use slot 0 for auto-save
      }
    }, intervalMinutes * 60 * 1000)

    return () => clearInterval(interval)
  }

  // Export save data for external storage
  exportSave(slot: number): string | null {
    const saveKey = `game-save-${slot}`
    const saveData = localStorage.getItem(saveKey)
    
    if (saveData) {
      // Encode for easy sharing/storage
      return btoa(saveData)
    }
    
    return null
  }

  // Import save data from external source
  importSave(encodedSaveData: string, slot: number): boolean {
    try {
      const saveData = atob(encodedSaveData)
      const parsedData: SaveData = JSON.parse(saveData)
      
      // Validate data structure
      if (!parsedData.version || !parsedData.playerData || !parsedData.gameData) {
        throw new Error('Invalid save data format')
      }

      const saveKey = `game-save-${slot}`
      localStorage.setItem(saveKey, saveData)
      
      this.updateSaveMetadata(slot, parsedData.metadata)
      
      EventBus.emit('saveImported', { slot })
      return true
    } catch (error) {
      console.error('Failed to import save:', error)
      EventBus.emit('importError', error)
      return false
    }
  }

  private updateSaveMetadata(slot: number, metadata: SaveData['metadata']): void {
    const metadataKey = 'save-metadata'
    const allMetadata = JSON.parse(localStorage.getItem(metadataKey) || '{}')
    
    allMetadata[slot] = {
      ...metadata,
      lastSaved: Date.now()
    }
    
    localStorage.setItem(metadataKey, JSON.stringify(allMetadata))
  }
}

// Hook for easy access to save system
export function useSaveSystem() {
  const saveManager = SaveSystemManager.getInstance()
  
  const saveGame = useCallback(async (slot: number) => {
    return await saveManager.saveToSlot(slot)
  }, [saveManager])

  const loadGame = useCallback(async (slot: number) => {
    return await saveManager.loadFromSlot(slot)
  }, [saveManager])

  const getSaves = useCallback(() => {
    return saveManager.getSaveMetadata()
  }, [saveManager])

  const deleteSave = useCallback((slot: number) => {
    return saveManager.deleteSave(slot)
  }, [saveManager])

  return {
    saveGame,
    loadGame,
    getSaves,
    deleteSave,
    exportSave: saveManager.exportSave.bind(saveManager),
    importSave: saveManager.importSave.bind(saveManager)
  }
}
```

## Performance Optimization

### 1. Store Selectors

```typescript
// Optimized selectors to prevent unnecessary re-renders
export const usePlayerHealth = () => 
  usePlayerStore(state => state.player?.stats.health)

export const usePlayerLevel = () => 
  usePlayerStore(state => state.player?.level)

export const usePlayerGold = () => 
  usePlayerStore(state => state.player?.gold)

export const useInventoryItems = () => 
  usePlayerStore(state => state.inventory.items)

export const useEquippedItems = () => 
  usePlayerStore(state => state.inventory.equipment)

export const useGameSettings = () => 
  useGameStore(state => state.settings)

export const useAudioSettings = () => 
  useGameStore(state => state.settings.audio)

export const useGraphicsSettings = () => 
  useGameStore(state => state.settings.graphics)

// Computed selectors
export const usePlayerHealthPercentage = () => 
  usePlayerStore(state => {
    if (!state.player) return 0
    return (state.player.stats.health / state.player.stats.maxHealth) * 100
  })

export const useExperienceProgress = () => 
  usePlayerStore(state => {
    if (!state.player) return 0
    const currentLevelExp = calculateExperienceToNext(state.player.level - 1)
    const nextLevelExp = state.player.experienceToNext
    const progress = state.player.experience - currentLevelExp
    const total = nextLevelExp - currentLevelExp
    return (progress / total) * 100
  })
```

### 2. Debounced Updates

```typescript
import { debounce } from 'lodash'

// Debounced store updates for high-frequency changes
export const useDebouncedPlayerPosition = () => {
  const updatePosition = usePlayerStore(state => state.updatePlayerPosition)
  
  return useMemo(
    () => debounce(updatePosition, 100),
    [updatePosition]
  )
}

export const useDebouncedPerformanceUpdate = () => {
  const updatePerformance = useGameStore(state => state.updatePerformance)
  
  return useMemo(
    () => debounce(updatePerformance, 1000),
    [updatePerformance]
  )
}
```

## Advanced Patterns

### 1. Store Composition

```typescript
// Composite store for complex game systems
export function useGameSystem() {
  const player = usePlayerStore()
  const game = useGameStore()
  
  const isPlayerAlive = useMemo(() => 
    player.player ? player.player.stats.health > 0 : false,
    [player.player?.stats.health]
  )
  
  const canPlayerAct = useMemo(() => 
    isPlayerAlive && !game.isPaused && !game.isMenuOpen,
    [isPlayerAlive, game.isPaused, game.isMenuOpen]
  )
  
  const gameState = useMemo(() => ({
    isPlaying: canPlayerAct,
    isGameOver: !isPlayerAlive,
    isPaused: game.isPaused,
    currentLevel: player.player?.level || 1,
    currentScene: game.currentScene
  }), [canPlayerAct, isPlayerAlive, game.isPaused, player.player?.level, game.currentScene])
  
  return {
    player,
    game,
    gameState,
    actions: {
      // Combined actions
      startNewGame: () => {
        game.setGameMode('story')
        game.setCurrentScene('CharacterSelectScene')
        player.reset()
      },
      
      exitToMenu: () => {
        game.setCurrentScene('MainMenuScene')
        game.closeMenu()
      }
    }
  }
}
```

### 2. Store Middleware

```typescript
// Custom middleware for logging and analytics
const loggingMiddleware = (config: any) => (set: any, get: any, api: any) =>
  config(
    (...args: any[]) => {
      console.log('Store update:', args)
      set(...args)
    },
    get,
    api
  )

// Analytics middleware
const analyticsMiddleware = (config: any) => (set: any, get: any, api: any) =>
  config(
    (...args: any[]) => {
      // Track important game events
      const prevState = get()
      set(...args)
      const newState = get()
      
      // Send analytics for significant changes
      if (prevState.player?.level !== newState.player?.level) {
        trackEvent('player_level_up', {
          level: newState.player.level,
          experience: newState.player.experience
        })
      }
    },
    get,
    api
  )
```

## Best Practices

### 1. State Organization
- **Separate Concerns**: Keep different types of state in separate stores
- **Normalize Data**: Avoid nested objects and arrays for better performance
- **Immutable Updates**: Always create new objects instead of mutating existing ones
- **Type Safety**: Use TypeScript interfaces for all state shapes

### 2. Performance Guidelines
- **Selective Subscriptions**: Use selectors to subscribe only to needed data
- **Debounced Updates**: Use debouncing for high-frequency updates
- **Memoization**: Use useMemo and useCallback for expensive computations
- **Batched Updates**: Group related state changes together

### 3. Persistence Strategy
- **Partial Persistence**: Only persist necessary data to reduce storage size
- **Version Management**: Implement save version migration for updates
- **Error Handling**: Gracefully handle corrupted or missing save data
- **Backup Strategy**: Consider cloud save integration for important data

### 4. Testing
- **Store Testing**: Test store actions and state changes in isolation
- **Integration Testing**: Test React-Phaser synchronization
- **Save/Load Testing**: Test persistence reliability
- **Performance Testing**: Monitor store performance under load

## Next Steps

1. **Read EventSystem.md** - Master event-driven communication
2. **Read Physics.md** - Understand collision and movement systems
3. **Read AssetManagement.md** - Optimize asset loading and management
4. **Read MobileOptimization.md** - Implement mobile-specific features

This state management system provides a solid foundation for building complex, data-driven games with seamless synchronization between all system components. 