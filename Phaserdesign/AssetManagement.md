# AssetManagement.md - Loading, Preloading, and Optimizing Game Assets

This guide covers comprehensive asset management in the Tower of Power framework, including efficient loading strategies, optimization techniques, and performance best practices for game assets.

## Table of Contents

1. [Asset Management Overview](#asset-management-overview)
2. [Asset Organization](#asset-organization)
3. [Preloader Implementation](#preloader-implementation)
4. [Dynamic Asset Loading](#dynamic-asset-loading)
5. [Asset Optimization](#asset-optimization)
6. [Memory Management](#memory-management)
7. [Audio Asset Management](#audio-asset-management)
8. [Texture Atlas Management](#texture-atlas-management)
9. [Progressive Loading](#progressive-loading)
10. [Performance Monitoring](#performance-monitoring)
11. [Best Practices](#best-practices)

## Asset Management Overview

Efficient asset management is crucial for game performance and user experience. The Tower of Power framework implements a sophisticated asset management system:

```
┌─────────────────────────────────────────────────────────────┐
│                    Asset Management System                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Preloader  │  │   Memory    │  │ Progressive │        │
│  │   System    │  │ Management  │  │   Loading   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Asset     │  │   Texture   │  │    Audio    │        │
│  │ Optimization│  │   Atlases   │  │ Management  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

- **Smart Preloading**: Progressive loading with priority system
- **Memory Optimization**: Automatic memory cleanup and pooling
- **Format Support**: WebP, PNG, JPEG, MP3, OGG, JSON, XML
- **Dynamic Loading**: Load assets on-demand during gameplay
- **Progress Tracking**: Detailed loading progress and error handling
- **Cache Management**: Intelligent caching with TTL support

## Asset Organization

### File Structure

```
public/assets/
├── sprites/
│   ├── player/
│   │   ├── character.png
│   │   ├── character.json        # Animation data
│   │   └── character-sheet.png   # Sprite sheet
│   ├── enemies/
│   │   ├── skeleton/
│   │   │   ├── idle.png
│   │   │   ├── attack.png
│   │   │   └── animations.json
│   │   └── dragon/
│   │       ├── dragon-atlas.png
│   │       └── dragon-atlas.json
│   └── effects/
│       ├── explosions.png
│       ├── magic-effects.png
│       └── particles.json
├── audio/
│   ├── music/
│   │   ├── dungeon-theme.mp3
│   │   ├── battle-theme.mp3
│   │   └── menu-theme.mp3
│   ├── sfx/
│   │   ├── sword-hit.mp3
│   │   ├── spell-cast.mp3
│   │   └── pickup.mp3
│   └── voice/
│       ├── narrator/
│       └── characters/
├── maps/
│   ├── level1/
│   │   ├── level1.json          # Tiled map data
│   │   ├── tileset.png
│   │   └── collision.json
│   └── level2/
├── ui/
│   ├── hud/
│   │   ├── health-bar.png
│   │   ├── mana-bar.png
│   │   └── minimap.png
│   ├── menus/
│   │   ├── main-menu.png
│   │   ├── settings.png
│   │   └── inventory.png
│   └── fonts/
│       ├── game-font.ttf
│       └── ui-font.woff2
└── data/
    ├── items.json
    ├── abilities.json
    └── localization/
        ├── en.json
        ├── es.json
        └── fr.json
```

### Asset Manifest System

```typescript
// lib/assets/AssetManifest.ts
export interface AssetManifest {
  version: string;
  assets: AssetGroup[];
  priorities: PriorityConfig;
}

export interface AssetGroup {
  name: string;
  type: 'critical' | 'gameplay' | 'optional';
  scene?: string; // Optional scene association
  assets: AssetDefinition[];
}

export interface AssetDefinition {
  key: string;
  type: AssetType;
  url: string;
  size?: number; // File size in bytes
  dependencies?: string[]; // Other assets this depends on
  metadata?: AssetMetadata;
}

export interface AssetMetadata {
  frameConfig?: Phaser.Types.Loader.FileTypes.ImageFrameConfig;
  audioConfig?: {
    instances: number;
    volume: number;
  };
  atlasData?: string; // URL to atlas JSON
}

export type AssetType = 
  | 'image' 
  | 'spritesheet' 
  | 'atlas'
  | 'audio' 
  | 'json' 
  | 'xml'
  | 'bitmapFont'
  | 'tilemapTiledJSON';

// Asset manifest configuration
export const ASSET_MANIFEST: AssetManifest = {
  version: '1.0.0',
  priorities: {
    critical: 0,    // Load immediately
    gameplay: 1,    // Load after critical
    optional: 2     // Load on-demand
  },
  assets: [
    {
      name: 'core-ui',
      type: 'critical',
      assets: [
        {
          key: 'ui-atlas',
          type: 'atlas',
          url: '/assets/ui/ui-atlas.png',
          metadata: { atlasData: '/assets/ui/ui-atlas.json' }
        },
        {
          key: 'game-font',
          type: 'bitmapFont',
          url: '/assets/ui/fonts/game-font.png',
          metadata: { atlasData: '/assets/ui/fonts/game-font.xml' }
        }
      ]
    },
    {
      name: 'player',
      type: 'gameplay',
      scene: 'DungeonScene',
      assets: [
        {
          key: 'player-idle',
          type: 'spritesheet',
          url: '/assets/sprites/player/idle.png',
          metadata: {
            frameConfig: { frameWidth: 32, frameHeight: 48 }
          }
        },
        {
          key: 'player-run',
          type: 'spritesheet',
          url: '/assets/sprites/player/run.png',
          metadata: {
            frameConfig: { frameWidth: 32, frameHeight: 48 }
          }
        }
      ]
    },
    {
      name: 'level1-enemies',
      type: 'gameplay',
      scene: 'Level1Scene',
      assets: [
        {
          key: 'skeleton-atlas',
          type: 'atlas',
          url: '/assets/sprites/enemies/skeleton-atlas.png',
          metadata: { atlasData: '/assets/sprites/enemies/skeleton-atlas.json' }
        }
      ]
    }
  ]
};
```

## Preloader Implementation

### Advanced Preloader Scene

```typescript
// scenes/PreloaderScene.ts
export default class PreloaderScene extends Phaser.Scene {
  private loadingBar: Phaser.GameObjects.Graphics;
  private loadingBox: Phaser.GameObjects.Graphics;
  private loadingText: Phaser.GameObjects.Text;
  private percentText: Phaser.GameObjects.Text;
  private assetText: Phaser.GameObjects.Text;
  private assetManager: AssetManager;

  constructor() {
    super({ key: 'PreloaderScene' });
  }

  preload() {
    this.assetManager = new AssetManager(this);
    this.createLoadingScreen();
    this.setupLoadingCallbacks();
    this.loadAssets();
  }

  create() {
    // Transition to next scene after loading
    this.scene.start('MainMenuScene');
  }

  private createLoadingScreen() {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;

    // Loading box background
    this.loadingBox = this.add.graphics();
    this.loadingBox.fillStyle(0x222222);
    this.loadingBox.fillRoundedRect(centerX - 160, centerY - 30, 320, 60, 10);

    // Loading bar
    this.loadingBar = this.add.graphics();

    // Loading text
    this.loadingText = this.add.text(centerX, centerY - 80, 'Loading...', {
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.percentText = this.add.text(centerX, centerY, '0%', {
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.assetText = this.add.text(centerX, centerY + 40, '', {
      fontSize: '12px',
      color: '#888888'
    }).setOrigin(0.5);
  }

  private setupLoadingCallbacks() {
    // Progress callback
    this.load.on('progress', (value: number) => {
      this.updateLoadingBar(value);
      this.percentText.setText(`${Math.round(value * 100)}%`);
    });

    // File loading callback
    this.load.on('fileprogress', (file: Phaser.Loader.File) => {
      this.assetText.setText(`Loading: ${file.key}`);
    });

    // File complete callback
    this.load.on('filecomplete', (key: string, type: string, data: any) => {
      console.log(`Loaded: ${key} (${type})`);
    });

    // Loading complete callback
    this.load.on('complete', () => {
      console.log('All assets loaded successfully');
      this.assetText.setText('Loading complete!');
      
      // Smooth transition after a brief delay
      this.time.delayedCall(500, () => {
        this.scene.start('MainMenuScene');
      });
    });

    // Error handling
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.error(`Failed to load: ${file.key}`);
      this.assetText.setText(`Error loading: ${file.key}`);
    });
  }

  private updateLoadingBar(progress: number) {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;

    this.loadingBar.clear();
    this.loadingBar.fillStyle(0x88cc88);
    this.loadingBar.fillRoundedRect(
      centerX - 150,
      centerY - 20,
      300 * progress,
      40,
      8
    );
  }

  private loadAssets() {
    // Load critical assets first
    this.assetManager.loadAssetGroup('core-ui');
    
    // Queue additional assets
    this.assetManager.queueAssetGroup('player');
    
    // Start loading
    this.assetManager.startLoading();
  }
}
```

### Asset Manager Class

```typescript
// lib/assets/AssetManager.ts
export class AssetManager {
  private scene: Phaser.Scene;
  private loadQueue: AssetGroup[] = [];
  private loadedAssets: Set<string> = new Set();
  private manifest: AssetManifest;
  private memoryTracker: MemoryTracker;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.manifest = ASSET_MANIFEST;
    this.memoryTracker = new MemoryTracker();
  }

  loadAssetGroup(groupName: string): Promise<void> {
    const group = this.manifest.assets.find(g => g.name === groupName);
    if (!group) {
      console.warn(`Asset group '${groupName}' not found`);
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const groupAssets = group.assets.filter(asset => 
        !this.loadedAssets.has(asset.key)
      );

      if (groupAssets.length === 0) {
        resolve();
        return;
      }

      // Load dependencies first
      this.loadDependencies(groupAssets).then(() => {
        this.loadAssets(groupAssets, resolve, reject);
      });
    });
  }

  queueAssetGroup(groupName: string) {
    const group = this.manifest.assets.find(g => g.name === groupName);
    if (group) {
      this.loadQueue.push(group);
    }
  }

  startLoading() {
    // Process queue in priority order
    this.loadQueue.sort((a, b) => {
      const priorityA = this.manifest.priorities[a.type];
      const priorityB = this.manifest.priorities[b.type];
      return priorityA - priorityB;
    });

    this.processLoadQueue();
  }

  private async processLoadQueue() {
    for (const group of this.loadQueue) {
      await this.loadAssetGroup(group.name);
    }
    this.loadQueue = [];
  }

  private loadDependencies(assets: AssetDefinition[]): Promise<void[]> {
    const dependencyPromises = assets
      .filter(asset => asset.dependencies)
      .map(asset => {
        return Promise.all(
          asset.dependencies!.map(dep => this.loadAssetByKey(dep))
        );
      });

    return Promise.all(dependencyPromises.flat());
  }

  private loadAssetByKey(key: string): Promise<void> {
    if (this.loadedAssets.has(key)) {
      return Promise.resolve();
    }

    // Find asset in manifest
    const asset = this.findAssetByKey(key);
    if (!asset) {
      return Promise.reject(`Asset '${key}' not found in manifest`);
    }

    return this.loadSingleAsset(asset);
  }

  private loadAssets(
    assets: AssetDefinition[],
    resolve: () => void,
    reject: (error: any) => void
  ) {
    let loadedCount = 0;
    const totalAssets = assets.length;

    const onAssetLoaded = () => {
      loadedCount++;
      if (loadedCount === totalAssets) {
        resolve();
      }
    };

    const onAssetError = (error: any) => {
      reject(error);
    };

    assets.forEach(asset => {
      this.loadSingleAsset(asset)
        .then(onAssetLoaded)
        .catch(onAssetError);
    });
  }

  private loadSingleAsset(asset: AssetDefinition): Promise<void> {
    return new Promise((resolve, reject) => {
      const { key, type, url, metadata } = asset;

      // Track memory usage
      this.memoryTracker.trackAssetLoad(key, asset.size || 0);

      switch (type) {
        case 'image':
          this.scene.load.image(key, url);
          break;

        case 'spritesheet':
          this.scene.load.spritesheet(key, url, metadata?.frameConfig!);
          break;

        case 'atlas':
          this.scene.load.atlas(key, url, metadata?.atlasData!);
          break;

        case 'audio':
          this.scene.load.audio(key, url);
          break;

        case 'json':
          this.scene.load.json(key, url);
          break;

        case 'bitmapFont':
          this.scene.load.bitmapFont(key, url, metadata?.atlasData!);
          break;

        case 'tilemapTiledJSON':
          this.scene.load.tilemapTiledJSON(key, url);
          break;

        default:
          reject(`Unsupported asset type: ${type}`);
          return;
      }

      // Set up completion callback
      this.scene.load.once(`filecomplete-${type}-${key}`, () => {
        this.loadedAssets.add(key);
        resolve();
      });

      // Set up error callback
      this.scene.load.once(`loaderror`, (file: Phaser.Loader.File) => {
        if (file.key === key) {
          reject(`Failed to load ${key}`);
        }
      });

      // Start loading if not already started
      if (!this.scene.load.isLoading()) {
        this.scene.load.start();
      }
    });
  }

  private findAssetByKey(key: string): AssetDefinition | null {
    for (const group of this.manifest.assets) {
      const asset = group.assets.find(a => a.key === key);
      if (asset) return asset;
    }
    return null;
  }

  // Get asset loading statistics
  getLoadingStats(): LoadingStats {
    return {
      totalAssets: this.getTotalAssetCount(),
      loadedAssets: this.loadedAssets.size,
      memoryUsage: this.memoryTracker.getTotalMemoryUsage(),
      cacheHitRate: this.memoryTracker.getCacheHitRate()
    };
  }

  private getTotalAssetCount(): number {
    return this.manifest.assets.reduce((total, group) => 
      total + group.assets.length, 0
    );
  }
}

interface LoadingStats {
  totalAssets: number;
  loadedAssets: number;
  memoryUsage: number;
  cacheHitRate: number;
}
```

## Dynamic Asset Loading

### Scene-Based Loading

```typescript
// Dynamic loading system for scene transitions
export class SceneAssetLoader {
  private assetManager: AssetManager;
  private loadingCache: Map<string, Promise<void>> = new Map();

  constructor(assetManager: AssetManager) {
    this.assetManager = assetManager;
  }

  async loadSceneAssets(sceneName: string): Promise<void> {
    // Check if already loading
    if (this.loadingCache.has(sceneName)) {
      return this.loadingCache.get(sceneName)!;
    }

    // Create loading promise
    const loadingPromise = this.performSceneLoad(sceneName);
    this.loadingCache.set(sceneName, loadingPromise);

    try {
      await loadingPromise;
    } finally {
      this.loadingCache.delete(sceneName);
    }
  }

  private async performSceneLoad(sceneName: string): Promise<void> {
    // Find all asset groups for this scene
    const sceneGroups = ASSET_MANIFEST.assets.filter(group => 
      group.scene === sceneName || group.type === 'critical'
    );

    // Load in priority order
    for (const group of sceneGroups) {
      await this.assetManager.loadAssetGroup(group.name);
    }
  }

  // Preload next scene assets in background
  preloadNextScene(sceneName: string) {
    // Load with lower priority
    setTimeout(() => {
      this.loadSceneAssets(sceneName).catch(error => {
        console.warn(`Failed to preload scene ${sceneName}:`, error);
      });
    }, 100);
  }

  // Unload assets that are no longer needed
  unloadSceneAssets(sceneName: string) {
    const sceneGroups = ASSET_MANIFEST.assets.filter(group => 
      group.scene === sceneName && group.type !== 'critical'
    );

    sceneGroups.forEach(group => {
      group.assets.forEach(asset => {
        this.unloadAsset(asset.key);
      });
    });
  }

  private unloadAsset(key: string) {
    // Remove from Phaser cache
    const cache = this.assetManager['scene'].cache;
    
    if (cache.obj.exists(key)) cache.obj.remove(key);
    if (cache.texture.exists(key)) cache.texture.remove(key);
    if (cache.audio.exists(key)) cache.audio.remove(key);
    if (cache.json.exists(key)) cache.json.remove(key);
    if (cache.tilemap.exists(key)) cache.tilemap.remove(key);
    if (cache.bitmapFont.exists(key)) cache.bitmapFont.remove(key);

    console.log(`Unloaded asset: ${key}`);
  }
}

// Enhanced scene with asset management
export class BaseScene extends Phaser.Scene {
  protected sceneAssetLoader: SceneAssetLoader;
  protected requiredAssets: string[] = [];

  constructor(config: Phaser.Types.Scenes.SettingsConfig) {
    super(config);
  }

  async init() {
    this.sceneAssetLoader = new SceneAssetLoader(
      new AssetManager(this)
    );

    // Load scene-specific assets
    await this.loadRequiredAssets();
  }

  protected async loadRequiredAssets() {
    if (this.requiredAssets.length > 0) {
      const sceneName = this.scene.key;
      await this.sceneAssetLoader.loadSceneAssets(sceneName);
    }
  }

  protected preloadNextScene(nextScene: string) {
    this.sceneAssetLoader.preloadNextScene(nextScene);
  }

  destroy() {
    // Clean up assets when scene is destroyed
    this.sceneAssetLoader.unloadSceneAssets(this.scene.key);
    super.destroy();
  }
}

// Example scene with asset requirements
export class DungeonScene extends BaseScene {
  constructor() {
    super({ key: 'DungeonScene' });
    this.requiredAssets = ['player', 'level1-enemies', 'dungeon-tileset'];
  }

  create() {
    // Preload next possible scenes
    this.preloadNextScene('BossScene');
    this.preloadNextScene('ShopScene');
  }
}
```

## Asset Optimization

### Image Optimization

```typescript
// Image optimization utilities
export class ImageOptimizer {
  // Generate WebP versions with fallbacks
  static async generateOptimizedImages(imagePaths: string[]): Promise<OptimizedImageSet[]> {
    const optimizedSets: OptimizedImageSet[] = [];

    for (const imagePath of imagePaths) {
      const set: OptimizedImageSet = {
        original: imagePath,
        webp: imagePath.replace(/\.(png|jpg|jpeg)$/, '.webp'),
        compressed: imagePath.replace(/\./, '-compressed.'),
        sizes: await this.generateResponsiveSizes(imagePath)
      };

      optimizedSets.push(set);
    }

    return optimizedSets;
  }

  private static async generateResponsiveSizes(imagePath: string): Promise<ResponsiveImageSize[]> {
    const sizes: ResponsiveImageSize[] = [
      { suffix: '-2x', scale: 2 },
      { suffix: '-1x', scale: 1 },
      { suffix: '-0.5x', scale: 0.5 }
    ];

    return sizes.map(size => ({
      ...size,
      path: imagePath.replace('.', `${size.suffix}.`)
    }));
  }

  // Runtime image format detection and loading
  static loadOptimizedImage(
    scene: Phaser.Scene,
    key: string,
    imagePath: string
  ) {
    const supportsWebP = this.supportsWebP();
    const devicePixelRatio = window.devicePixelRatio || 1;

    // Choose best format and resolution
    let optimalPath = imagePath;

    if (supportsWebP) {
      optimalPath = imagePath.replace(/\.(png|jpg|jpeg)$/, '.webp');
    }

    // Choose resolution based on device pixel ratio
    if (devicePixelRatio >= 2) {
      optimalPath = optimalPath.replace('.', '-2x.');
    } else if (devicePixelRatio < 1) {
      optimalPath = optimalPath.replace('.', '-0.5x.');
    }

    scene.load.image(key, optimalPath);
  }

  private static supportsWebP(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('webp') > -1;
  }
}

interface OptimizedImageSet {
  original: string;
  webp: string;
  compressed: string;
  sizes: ResponsiveImageSize[];
}

interface ResponsiveImageSize {
  suffix: string;
  scale: number;
  path: string;
}
```

### Texture Atlas Optimization

```typescript
// Texture atlas manager for optimized sprite loading
export class TextureAtlasManager {
  private scene: Phaser.Scene;
  private atlasCache: Map<string, AtlasInfo> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // Load optimized texture atlas
  loadAtlas(key: string, config: AtlasConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const { texturePath, atlasPath, options } = config;

      // Load atlas with optimization options
      this.scene.load.atlas(key, texturePath, atlasPath);

      this.scene.load.once(`filecomplete-atlas-${key}`, () => {
        // Store atlas info for memory tracking
        this.atlasCache.set(key, {
          key,
          textureSize: options?.textureSize || 0,
          frameCount: this.getFrameCount(key),
          compressionRatio: options?.compressionRatio || 1
        });

        resolve();
      });

      this.scene.load.once('loaderror', (file: Phaser.Loader.File) => {
        if (file.key === key) {
          reject(`Failed to load atlas: ${key}`);
        }
      });
    });
  }

  // Generate sprite sheets from individual images
  static async generateAtlas(
    sprites: SpriteInfo[],
    atlasName: string,
    maxSize: number = 2048
  ): Promise<AtlasData> {
    const packer = new TexturePacker(maxSize);
    
    for (const sprite of sprites) {
      packer.addSprite(sprite);
    }

    const packedData = packer.pack();
    
    return {
      name: atlasName,
      image: packedData.canvas,
      data: packedData.frames,
      efficiency: packedData.efficiency
    };
  }

  // Get atlas memory usage
  getAtlasMemoryUsage(key: string): number {
    const atlasInfo = this.atlasCache.get(key);
    if (!atlasInfo) return 0;

    // Estimate memory usage based on texture size and format
    const bytesPerPixel = 4; // RGBA
    const estimatedPixels = atlasInfo.textureSize * atlasInfo.textureSize;
    return estimatedPixels * bytesPerPixel;
  }

  private getFrameCount(key: string): number {
    const texture = this.scene.textures.get(key);
    return texture ? Object.keys(texture.frames).length : 0;
  }
}

// Texture packing algorithm
class TexturePacker {
  private maxSize: number;
  private sprites: SpriteInfo[] = [];
  private bins: PackingBin[] = [];

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  addSprite(sprite: SpriteInfo) {
    this.sprites.push(sprite);
  }

  pack(): PackedAtlasData {
    // Sort sprites by area (largest first) for better packing
    this.sprites.sort((a, b) => (b.width * b.height) - (a.width * a.height));

    const canvas = document.createElement('canvas');
    canvas.width = this.maxSize;
    canvas.height = this.maxSize;
    const ctx = canvas.getContext('2d')!;

    const frames: Record<string, FrameData> = {};
    let usedArea = 0;

    // Simple bin packing algorithm
    let currentY = 0;
    let currentX = 0;
    let rowHeight = 0;

    for (const sprite of this.sprites) {
      // Check if sprite fits in current row
      if (currentX + sprite.width > this.maxSize) {
        // Move to next row
        currentY += rowHeight;
        currentX = 0;
        rowHeight = 0;

        // Check if we exceed height
        if (currentY + sprite.height > this.maxSize) {
          console.warn(`Sprite ${sprite.name} doesn't fit in atlas`);
          continue;
        }
      }

      // Draw sprite to canvas
      ctx.drawImage(sprite.image, currentX, currentY);

      // Store frame data
      frames[sprite.name] = {
        frame: {
          x: currentX,
          y: currentY,
          w: sprite.width,
          h: sprite.height
        },
        sourceSize: {
          w: sprite.width,
          h: sprite.height
        },
        spriteSourceSize: {
          x: 0,
          y: 0,
          w: sprite.width,
          h: sprite.height
        }
      };

      usedArea += sprite.width * sprite.height;
      currentX += sprite.width;
      rowHeight = Math.max(rowHeight, sprite.height);
    }

    const totalArea = this.maxSize * this.maxSize;
    const efficiency = (usedArea / totalArea) * 100;

    return {
      canvas,
      frames,
      efficiency
    };
  }
}

interface AtlasConfig {
  texturePath: string;
  atlasPath: string;
  options?: {
    textureSize?: number;
    compressionRatio?: number;
  };
}

interface AtlasInfo {
  key: string;
  textureSize: number;
  frameCount: number;
  compressionRatio: number;
}

interface SpriteInfo {
  name: string;
  image: HTMLImageElement;
  width: number;
  height: number;
}

interface PackedAtlasData {
  canvas: HTMLCanvasElement;
  frames: Record<string, FrameData>;
  efficiency: number;
}

interface FrameData {
  frame: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
  spriteSourceSize: { x: number; y: number; w: number; h: number };
}
```

## Memory Management

### Memory Tracker

```typescript
// Memory tracking and management system
export class MemoryTracker {
  private assetMemoryUsage: Map<string, number> = new Map();
  private totalMemoryUsage: number = 0;
  private memoryLimit: number;
  private cacheHits: number = 0;
  private cacheRequests: number = 0;

  constructor(memoryLimitMB: number = 100) {
    this.memoryLimit = memoryLimitMB * 1024 * 1024; // Convert to bytes
    this.setupMemoryMonitoring();
  }

  trackAssetLoad(key: string, size: number) {
    if (this.assetMemoryUsage.has(key)) {
      // Asset already loaded (cache hit)
      this.cacheHits++;
    } else {
      // New asset loaded
      this.assetMemoryUsage.set(key, size);
      this.totalMemoryUsage += size;
    }

    this.cacheRequests++;
    this.checkMemoryLimit();
  }

  trackAssetUnload(key: string) {
    const size = this.assetMemoryUsage.get(key);
    if (size) {
      this.assetMemoryUsage.delete(key);
      this.totalMemoryUsage -= size;
    }
  }

  getTotalMemoryUsage(): number {
    return this.totalMemoryUsage;
  }

  getCacheHitRate(): number {
    return this.cacheRequests > 0 ? (this.cacheHits / this.cacheRequests) * 100 : 0;
  }

  getMemoryUsagePercent(): number {
    return (this.totalMemoryUsage / this.memoryLimit) * 100;
  }

  private checkMemoryLimit() {
    if (this.totalMemoryUsage > this.memoryLimit * 0.9) {
      console.warn('Memory usage approaching limit, triggering cleanup');
      this.triggerMemoryCleanup();
    }
  }

  private triggerMemoryCleanup() {
    // Find least recently used assets
    const sortedAssets = Array.from(this.assetMemoryUsage.entries())
      .sort((a, b) => b[1] - a[1]); // Sort by size, largest first

    let freedMemory = 0;
    const targetFreedMemory = this.memoryLimit * 0.2; // Free 20% of limit

    for (const [key, size] of sortedAssets) {
      if (freedMemory >= targetFreedMemory) break;
      
      // Don't unload critical assets
      if (this.isCriticalAsset(key)) continue;

      this.requestAssetUnload(key);
      freedMemory += size;
    }

    console.log(`Memory cleanup freed ${freedMemory} bytes`);
  }

  private isCriticalAsset(key: string): boolean {
    // Check if asset is marked as critical
    const criticalAssets = ASSET_MANIFEST.assets
      .filter(group => group.type === 'critical')
      .flatMap(group => group.assets.map(asset => asset.key));
    
    return criticalAssets.includes(key);
  }

  private requestAssetUnload(key: string) {
    // Emit event for asset managers to handle unloading
    EventBus.emit('memory:asset-unload-requested', { key });
  }

  private setupMemoryMonitoring() {
    // Monitor memory usage periodically
    setInterval(() => {
      this.logMemoryStats();
      
      // Check for memory leaks
      if (performance.memory) {
        const heapUsed = (performance.memory as any).usedJSHeapSize;
        const heapLimit = (performance.memory as any).jsHeapSizeLimit;
        
        if (heapUsed / heapLimit > 0.9) {
          console.warn('JavaScript heap usage is high, consider memory cleanup');
        }
      }
    }, 30000); // Every 30 seconds
  }

  private logMemoryStats() {
    console.log('Memory Stats:', {
      assetMemoryUsage: `${(this.totalMemoryUsage / 1024 / 1024).toFixed(2)} MB`,
      memoryUsagePercent: `${this.getMemoryUsagePercent().toFixed(1)}%`,
      cacheHitRate: `${this.getCacheHitRate().toFixed(1)}%`,
      assetsLoaded: this.assetMemoryUsage.size
    });
  }
}

// Memory-aware asset pool
export class AssetPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (item: T) => void;
  private maxSize: number;
  private memoryTracker: MemoryTracker;

  constructor(
    createFn: () => T,
    resetFn: (item: T) => void,
    maxSize: number = 100,
    memoryTracker: MemoryTracker
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
    this.memoryTracker = memoryTracker;
  }

  get(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }

    // Check memory before creating new object
    if (this.memoryTracker.getMemoryUsagePercent() > 80) {
      console.warn('Memory usage high, avoiding new object creation');
      return this.createFn(); // Create without pooling
    }

    return this.createFn();
  }

  release(item: T) {
    if (this.pool.length < this.maxSize) {
      this.resetFn(item);
      this.pool.push(item);
    }
    // If pool is full, let object be garbage collected
  }

  clear() {
    this.pool = [];
  }

  getPoolSize(): number {
    return this.pool.length;
  }
}
```

## Audio Asset Management

### Audio Manager

```typescript
// Comprehensive audio asset management
export class AudioManager {
  private scene: Phaser.Scene;
  private audioCache: Map<string, CachedAudioData> = new Map();
  private musicVolume: number = 1;
  private sfxVolume: number = 1;
  private currentMusic: Phaser.Sound.BaseSound | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupAudioConfig();
  }

  private setupAudioConfig() {
    // Configure audio context settings
    if (this.scene.sound.context) {
      // Set up audio compression and optimization
      const context = this.scene.sound.context;
      
      // Create master gain node for volume control
      const masterGain = context.createGain();
      masterGain.connect(context.destination);
    }
  }

  // Load audio with format fallbacks
  loadAudio(key: string, urls: string | string[], config?: AudioConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      // Ensure urls is an array for fallback support
      const urlArray = Array.isArray(urls) ? urls : [urls];
      
      // Add optimized format variants
      const optimizedUrls = this.generateAudioVariants(urlArray);

      this.scene.load.audio(key, optimizedUrls);

      this.scene.load.once(`filecomplete-audio-${key}`, () => {
        // Cache audio data
        this.audioCache.set(key, {
          key,
          loaded: true,
          instances: [],
          config: config || {}
        });

        resolve();
      });

      this.scene.load.once('loaderror', (file: Phaser.Loader.File) => {
        if (file.key === key) {
          reject(`Failed to load audio: ${key}`);
        }
      });
    });
  }

  private generateAudioVariants(urls: string[]): string[] {
    const variants: string[] = [];
    
    urls.forEach(url => {
      // Add WebM variant for better compression
      if (url.includes('.mp3')) {
        variants.push(url.replace('.mp3', '.webm'));
      }
      
      // Add OGG variant for compatibility
      if (url.includes('.mp3')) {
        variants.push(url.replace('.mp3', '.ogg'));
      }
      
      // Original URL as fallback
      variants.push(url);
    });

    return variants;
  }

  // Play audio with pooling and optimization
  playAudio(key: string, config?: PlayConfig): Phaser.Sound.BaseSound | null {
    const cachedData = this.audioCache.get(key);
    if (!cachedData || !cachedData.loaded) {
      console.warn(`Audio ${key} not loaded`);
      return null;
    }

    // Check for available pooled instance
    const availableInstance = cachedData.instances.find(instance => !instance.isPlaying);
    
    if (availableInstance) {
      // Reuse existing instance
      this.configureAudioInstance(availableInstance, config);
      availableInstance.play();
      return availableInstance;
    }

    // Create new instance if pool not full
    const maxInstances = cachedData.config.maxInstances || 3;
    if (cachedData.instances.length < maxInstances) {
      const newInstance = this.scene.sound.add(key);
      cachedData.instances.push(newInstance);
      
      this.configureAudioInstance(newInstance, config);
      newInstance.play();
      return newInstance;
    }

    console.warn(`Max instances reached for audio ${key}`);
    return null;
  }

  private configureAudioInstance(
    sound: Phaser.Sound.BaseSound,
    config?: PlayConfig
  ) {
    if (config) {
      if (config.volume !== undefined) {
        sound.setVolume(config.volume * this.sfxVolume);
      }
      if (config.loop !== undefined) {
        sound.setLoop(config.loop);
      }
      if (config.rate !== undefined) {
        sound.setRate(config.rate);
      }
    }
  }

  // Music management with crossfading
  playMusic(key: string, config?: MusicConfig): Promise<void> {
    return new Promise((resolve) => {
      const newMusic = this.scene.sound.add(key, {
        volume: 0, // Start silent for fade in
        loop: true
      });

      // Crossfade from current music
      if (this.currentMusic && this.currentMusic.isPlaying) {
        this.crossfadeMusic(this.currentMusic, newMusic, config?.fadeTime || 1000)
          .then(() => resolve());
      } else {
        // No current music, just fade in
        newMusic.play();
        this.fadeIn(newMusic, config?.fadeTime || 1000, this.musicVolume)
          .then(() => resolve());
      }

      this.currentMusic = newMusic;
    });
  }

  private crossfadeMusic(
    oldMusic: Phaser.Sound.BaseSound,
    newMusic: Phaser.Sound.BaseSound,
    duration: number
  ): Promise<void> {
    return new Promise((resolve) => {
      newMusic.play();

      // Fade out old music
      this.scene.tweens.add({
        targets: oldMusic,
        volume: 0,
        duration: duration / 2,
        onComplete: () => {
          oldMusic.stop();
        }
      });

      // Fade in new music
      this.scene.tweens.add({
        targets: newMusic,
        volume: this.musicVolume,
        duration: duration / 2,
        delay: duration / 4,
        onComplete: () => resolve()
      });
    });
  }

  private fadeIn(
    sound: Phaser.Sound.BaseSound,
    duration: number,
    targetVolume: number
  ): Promise<void> {
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: sound,
        volume: targetVolume,
        duration,
        onComplete: () => resolve()
      });
    });
  }

  // Volume control
  setMusicVolume(volume: number) {
    this.musicVolume = Phaser.Math.Clamp(volume, 0, 1);
    if (this.currentMusic) {
      this.currentMusic.setVolume(this.musicVolume);
    }
  }

  setSFXVolume(volume: number) {
    this.sfxVolume = Phaser.Math.Clamp(volume, 0, 1);
    
    // Update all cached instances
    this.audioCache.forEach(cachedData => {
      cachedData.instances.forEach(instance => {
        if (instance.isPlaying) {
          instance.setVolume(instance.volume * this.sfxVolume);
        }
      });
    });
  }

  // Memory management
  unloadAudio(key: string) {
    const cachedData = this.audioCache.get(key);
    if (cachedData) {
      // Stop and destroy all instances
      cachedData.instances.forEach(instance => {
        instance.stop();
        instance.destroy();
      });

      // Remove from cache
      this.audioCache.delete(key);
      
      // Remove from Phaser cache
      this.scene.cache.audio.remove(key);
    }
  }

  // Get audio memory usage
  getAudioMemoryUsage(): AudioMemoryStats {
    let totalInstances = 0;
    let playingInstances = 0;

    this.audioCache.forEach(cachedData => {
      totalInstances += cachedData.instances.length;
      playingInstances += cachedData.instances.filter(i => i.isPlaying).length;
    });

    return {
      loadedAudioFiles: this.audioCache.size,
      totalInstances,
      playingInstances,
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume
    };
  }
}

interface CachedAudioData {
  key: string;
  loaded: boolean;
  instances: Phaser.Sound.BaseSound[];
  config: AudioConfig;
}

interface AudioConfig {
  maxInstances?: number;
  volume?: number;
  preload?: boolean;
}

interface PlayConfig {
  volume?: number;
  loop?: boolean;
  rate?: number;
}

interface MusicConfig {
  fadeTime?: number;
  volume?: number;
}

interface AudioMemoryStats {
  loadedAudioFiles: number;
  totalInstances: number;
  playingInstances: number;
  musicVolume: number;
  sfxVolume: number;
}
```

## Progressive Loading

### Progressive Asset Loader

```typescript
// Progressive loading system for better user experience
export class ProgressiveLoader {
  private scene: Phaser.Scene;
  private loadingQueue: LoadingQueue[] = [];
  private isLoading: boolean = false;
  private backgroundLoading: boolean = true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.setupIdleCallback();
  }

  // Add assets to progressive loading queue
  queueAssets(assets: AssetDefinition[], priority: LoadingPriority = 'low') {
    const queueItem: LoadingQueue = {
      assets,
      priority,
      timestamp: Date.now()
    };

    this.loadingQueue.push(queueItem);
    this.sortQueue();
    
    if (!this.isLoading && this.backgroundLoading) {
      this.processQueue();
    }
  }

  private sortQueue() {
    this.loadingQueue.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  private async processQueue() {
    if (this.isLoading || this.loadingQueue.length === 0) return;

    this.isLoading = true;

    while (this.loadingQueue.length > 0) {
      const queueItem = this.loadingQueue.shift()!;
      
      // Check if user is interacting (pause background loading)
      if (this.isUserActive() && queueItem.priority === 'low') {
        // Put item back in queue
        this.loadingQueue.unshift(queueItem);
        break;
      }

      await this.loadAssetBatch(queueItem.assets);
      
      // Yield control occasionally
      await this.yieldControl();
    }

    this.isLoading = false;
  }

  private async loadAssetBatch(assets: AssetDefinition[]): Promise<void> {
    const batchSize = 3; // Load 3 assets at a time
    
    for (let i = 0; i < assets.length; i += batchSize) {
      const batch = assets.slice(i, i + batchSize);
      
      const loadPromises = batch.map(asset => this.loadSingleAsset(asset));
      await Promise.allSettled(loadPromises);
      
      // Brief pause between batches
      await this.delay(50);
    }
  }

  private loadSingleAsset(asset: AssetDefinition): Promise<void> {
    return new Promise((resolve) => {
      const { key, type, url, metadata } = asset;

      // Check if already loaded
      if (this.isAssetLoaded(key, type)) {
        resolve();
        return;
      }

      try {
        switch (type) {
          case 'image':
            this.scene.load.image(key, url);
            break;
          case 'audio':
            this.scene.load.audio(key, url);
            break;
          case 'json':
            this.scene.load.json(key, url);
            break;
          // Add other types as needed
        }

        this.scene.load.once(`filecomplete-${type}-${key}`, () => {
          console.log(`Progressively loaded: ${key}`);
          resolve();
        });

        this.scene.load.once('loaderror', () => {
          console.warn(`Failed to progressively load: ${key}`);
          resolve(); // Still resolve to continue loading
        });

        // Start loading if loader is idle
        if (!this.scene.load.isLoading()) {
          this.scene.load.start();
        }

      } catch (error) {
        console.error(`Error loading asset ${key}:`, error);
        resolve();
      }
    });
  }

  private isAssetLoaded(key: string, type: AssetType): boolean {
    const cache = this.scene.cache;
    
    switch (type) {
      case 'image':
        return cache.texture.exists(key);
      case 'audio':
        return cache.audio.exists(key);
      case 'json':
        return cache.json.exists(key);
      default:
        return false;
    }
  }

  private yieldControl(): Promise<void> {
    return new Promise(resolve => {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => resolve());
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isUserActive(): boolean {
    // Check various indicators of user activity
    return (
      this.scene.input.activePointer.isDown ||
      this.scene.input.keyboard?.checkDown() ||
      Date.now() - this.scene.input.activePointer.time < 1000
    );
  }

  private setupIdleCallback() {
    // Use requestIdleCallback for background loading
    const idleLoader = () => {
      if (!this.isLoading && this.loadingQueue.length > 0 && !this.isUserActive()) {
        this.processQueue();
      }
      
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(idleLoader, { timeout: 1000 });
      } else {
        setTimeout(idleLoader, 1000);
      }
    };

    idleLoader();
  }

  // Public control methods
  pauseBackgroundLoading() {
    this.backgroundLoading = false;
  }

  resumeBackgroundLoading() {
    this.backgroundLoading = true;
    if (!this.isLoading) {
      this.processQueue();
    }
  }

  // Get loading statistics
  getLoadingStats(): ProgressiveLoadingStats {
    return {
      queueLength: this.loadingQueue.length,
      isLoading: this.isLoading,
      backgroundLoading: this.backgroundLoading,
      queuedAssets: this.loadingQueue.reduce((total, item) => total + item.assets.length, 0)
    };
  }
}

interface LoadingQueue {
  assets: AssetDefinition[];
  priority: LoadingPriority;
  timestamp: number;
}

type LoadingPriority = 'high' | 'medium' | 'low';

interface ProgressiveLoadingStats {
  queueLength: number;
  isLoading: boolean;
  backgroundLoading: boolean;
  queuedAssets: number;
}
```

## Performance Monitoring

### Asset Performance Monitor

```typescript
// Performance monitoring for asset loading and usage
export class AssetPerformanceMonitor {
  private loadTimes: Map<string, number> = new Map();
  private accessCounts: Map<string, number> = new Map();
  private lastAccess: Map<string, number> = new Map();
  private memoryUsage: Map<string, number> = new Map();

  // Track asset loading performance
  startLoadTimer(key: string) {
    this.loadTimes.set(key, performance.now());
  }

  endLoadTimer(key: string): number {
    const startTime = this.loadTimes.get(key);
    if (startTime) {
      const loadTime = performance.now() - startTime;
      this.loadTimes.set(key, loadTime);
      return loadTime;
    }
    return 0;
  }

  // Track asset access patterns
  recordAssetAccess(key: string) {
    const currentCount = this.accessCounts.get(key) || 0;
    this.accessCounts.set(key, currentCount + 1);
    this.lastAccess.set(key, Date.now());
  }

  // Track memory usage
  recordMemoryUsage(key: string, bytes: number) {
    this.memoryUsage.set(key, bytes);
  }

  // Generate performance report
  generateReport(): PerformanceReport {
    const slowLoadingAssets = this.getSlowLoadingAssets();
    const frequentlyAccessedAssets = this.getFrequentlyAccessedAssets();
    const memoryHungryAssets = this.getMemoryHungryAssets();
    const unusedAssets = this.getUnusedAssets();

    return {
      slowLoadingAssets,
      frequentlyAccessedAssets,
      memoryHungryAssets,
      unusedAssets,
      totalLoadTime: this.getTotalLoadTime(),
      totalMemoryUsage: this.getTotalMemoryUsage(),
      averageLoadTime: this.getAverageLoadTime()
    };
  }

  private getSlowLoadingAssets(): AssetPerformanceInfo[] {
    return Array.from(this.loadTimes.entries())
      .filter(([key, time]) => time > 1000) // Over 1 second
      .map(([key, time]) => ({
        key,
        loadTime: time,
        accessCount: this.accessCounts.get(key) || 0,
        memoryUsage: this.memoryUsage.get(key) || 0
      }))
      .sort((a, b) => b.loadTime - a.loadTime);
  }

  private getFrequentlyAccessedAssets(): AssetPerformanceInfo[] {
    return Array.from(this.accessCounts.entries())
      .filter(([key, count]) => count > 10) // Accessed more than 10 times
      .map(([key, count]) => ({
        key,
        loadTime: this.loadTimes.get(key) || 0,
        accessCount: count,
        memoryUsage: this.memoryUsage.get(key) || 0
      }))
      .sort((a, b) => b.accessCount - a.accessCount);
  }

  private getMemoryHungryAssets(): AssetPerformanceInfo[] {
    return Array.from(this.memoryUsage.entries())
      .filter(([key, usage]) => usage > 1024 * 1024) // Over 1MB
      .map(([key, usage]) => ({
        key,
        loadTime: this.loadTimes.get(key) || 0,
        accessCount: this.accessCounts.get(key) || 0,
        memoryUsage: usage
      }))
      .sort((a, b) => b.memoryUsage - a.memoryUsage);
  }

  private getUnusedAssets(): string[] {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    return Array.from(this.lastAccess.entries())
      .filter(([key, lastTime]) => lastTime < oneHourAgo)
      .map(([key]) => key);
  }

  private getTotalLoadTime(): number {
    return Array.from(this.loadTimes.values())
      .reduce((total, time) => total + time, 0);
  }

  private getTotalMemoryUsage(): number {
    return Array.from(this.memoryUsage.values())
      .reduce((total, usage) => total + usage, 0);
  }

  private getAverageLoadTime(): number {
    const times = Array.from(this.loadTimes.values());
    return times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0;
  }

  // Export data for analysis
  exportData(): string {
    return JSON.stringify({
      loadTimes: Object.fromEntries(this.loadTimes),
      accessCounts: Object.fromEntries(this.accessCounts),
      lastAccess: Object.fromEntries(this.lastAccess),
      memoryUsage: Object.fromEntries(this.memoryUsage),
      timestamp: Date.now()
    }, null, 2);
  }
}

interface AssetPerformanceInfo {
  key: string;
  loadTime: number;
  accessCount: number;
  memoryUsage: number;
}

interface PerformanceReport {
  slowLoadingAssets: AssetPerformanceInfo[];
  frequentlyAccessedAssets: AssetPerformanceInfo[];
  memoryHungryAssets: AssetPerformanceInfo[];
  unusedAssets: string[];
  totalLoadTime: number;
  totalMemoryUsage: number;
  averageLoadTime: number;
}
```

## Best Practices

### 1. Asset Organization

```typescript
// ✅ Good: Organized asset structure
const assetStructure = {
  'core': {
    type: 'critical',
    assets: ['ui-elements', 'fonts', 'basic-sounds']
  },
  'gameplay': {
    type: 'gameplay',
    assets: ['player-sprites', 'enemy-sprites', 'abilities']
  },
  'optional': {
    type: 'optional',
    assets: ['background-music', 'ambient-sounds', 'particle-effects']
  }
};

// ❌ Bad: No organization or priority
const badAssetStructure = [
  'player.png',
  'background-music.mp3',
  'enemy1.png',
  'ui-button.png',
  'explosion-sound.mp3'
  // No organization or loading priority
];
```

### 2. Loading Strategy

```typescript
// ✅ Good: Progressive loading with priorities
class GameScene extends Phaser.Scene {
  async create() {
    // Load critical assets first
    await this.loadCriticalAssets();
    
    // Show loading screen and load gameplay assets
    this.showLoadingScreen();
    await this.loadGameplayAssets();
    
    // Load optional assets in background
    this.loadOptionalAssetsInBackground();
    
    this.startGame();
  }
}

// ❌ Bad: Load everything at once
class BadGameScene extends Phaser.Scene {
  preload() {
    // Loading all assets at once causes long wait times
    this.load.image('player', 'player.png');
    this.load.audio('music1', 'music1.mp3');
    this.load.audio('music2', 'music2.mp3');
    this.load.image('background1', 'bg1.png');
    this.load.image('background2', 'bg2.png');
    // ... hundreds more assets
  }
}
```

### 3. Memory Management

```typescript
// ✅ Good: Proactive memory management
class AssetCleanupManager {
  unloadSceneAssets(leavingScene: string) {
    const sceneAssets = this.getSceneAssets(leavingScene);
    
    sceneAssets.forEach(asset => {
      if (!this.isSharedAsset(asset)) {
        this.unloadAsset(asset);
      }
    });
  }

  private isSharedAsset(asset: string): boolean {
    return SHARED_ASSETS.includes(asset);
  }
}

// ❌ Bad: No memory management
class BadAssetManager {
  // Never unloads assets, leading to memory leaks
  loadScene(sceneName: string) {
    this.loadAllAssetsForScene(sceneName);
    // Assets from previous scenes remain in memory
  }
}
```

### 4. Format Optimization

```typescript
// ✅ Good: Multiple format support with fallbacks
const audioConfig = {
  'background-music': [
    'audio/music.webm',  // Best compression
    'audio/music.ogg',   // Good compatibility
    'audio/music.mp3'    // Universal fallback
  ]
};

const imageConfig = {
  'player-sprite': {
    webp: 'sprites/player.webp',     // Best compression
    png: 'sprites/player.png'        // Fallback
  }
};

// ❌ Bad: Single format, no optimization
const badConfig = {
  'background-music': 'audio/music.wav', // Uncompressed
  'player-sprite': 'sprites/player.bmp'  // Uncompressed
};
```

This comprehensive asset management system ensures optimal loading performance, efficient memory usage, and a smooth user experience. The combination of progressive loading, memory management, and performance monitoring creates a robust foundation for handling game assets at scale. 