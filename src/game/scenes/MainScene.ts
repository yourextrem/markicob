import { Scene } from 'phaser';

export class MainScene extends Scene {
    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        // Assets will be loaded from the public directory
        // Example usage:
        // this.load.spritesheet('character', '/game/assets/sprites/character.png', { frameWidth: 32, frameHeight: 32 });
        // this.load.tilemapTiledJSON('map', '/game/assets/maps/map.json');
    }

    create() {
        // We'll create game objects here
        this.add.text(400, 300, 'Game is loading...', {
            fontSize: '32px',
            color: '#fff'
        }).setOrigin(0.5);
    }

    update() {
        // We'll handle game logic here
    }
}