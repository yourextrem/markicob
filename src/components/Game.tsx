'use client';

import { useEffect, useRef } from 'react';
import { Game as PhaserGame } from 'phaser';
import { PreloaderScene } from '@/game/scenes/PreloaderScene';
import { MapScene } from '@/game/scenes/MapScene';

export default function Game() {
    const gameRef = useRef<PhaserGame | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && !gameRef.current) {
            const config = {
                type: Phaser.AUTO,
                scale: {
                    mode: Phaser.Scale.RESIZE,
                    width: window.innerWidth,
                    height: window.innerHeight,
                    autoCenter: Phaser.Scale.CENTER_BOTH
                },
                backgroundColor: '#000000',
                parent: 'game-container',
                pixelArt: true,
                physics: {
                    default: 'arcade',
                    arcade: {
                        gravity: { y: 0 },
                        debug: false
                    }
                },
                scene: [PreloaderScene, MapScene],
                render: {
                    antialias: false,
                    pixelArt: true,
                    roundPixels: true
                }
            };

            gameRef.current = new PhaserGame(config);

            // Handle window resize
            const handleResize = () => {
                if (gameRef.current) {
                    gameRef.current.scale.resize(window.innerWidth, window.innerHeight);
                }
            };

            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);
                if (gameRef.current) {
                    gameRef.current.destroy(true);
                    gameRef.current = null;
                }
            };
        }
    }, []);

    return (
        <div 
            id="game-container" 
            className="w-screen h-screen bg-black"
            style={{ 
                margin: 0,
                padding: 0,
                overflow: 'hidden'
            }}
        />
    );
}