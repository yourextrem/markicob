import { Scene } from 'phaser';
import { Player } from '../sprites/Player';

export class PlayerTestScene extends Scene {
    private player!: Player;

    constructor() {
        super({ key: 'PlayerTestScene' });
    }

    create() {
        // Set up a simple background so we can see the player
        this.add.grid(
            400, 300,           // position
            800, 600,          // size
            32, 32,            // cell size
            0x000000, 1,       // cell color and alpha
            0x111111, 1        // outline color and alpha
        );

        // Create player in the center of the screen
        this.player = new Player(this, 400, 300);

        // Set up camera to follow player
        this.cameras.main.startFollow(this.player, true);
        this.cameras.main.setZoom(2); // Zoom in to see the pixel art better
    }

    update() {
        // Update player
        this.player.update();
    }
}