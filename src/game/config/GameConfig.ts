import { Types } from 'phaser';
import { PreloaderScene } from '../scenes/PreloaderScene';
import { MapScene } from '../scenes/MapScene';

export const GameConfig: Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false // Disable the global debugger for production
        }
    },
    pixelArt: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: {
        antialias: false,
        pixelArt: true,
        roundPixels: true
    },
    // Only include the scenes we're actually using
    scene: [PreloaderScene, MapScene, PlayerTestScene, MainScene], // All scenes listed
    // Add loader and WebGL settings
    loader: {
        maxParallelDownloads: 4,
        crossOrigin: 'anonymous'
    },
    backgroundColor: '#000000'
};