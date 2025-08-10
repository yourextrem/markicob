import { Scene } from 'phaser';

export class PreloaderScene extends Scene {
    constructor() {
        super({ key: 'PreloaderScene' });
    }

    init() {
        console.log('PreloaderScene init');
    }

    preload() {
        console.log('PreloaderScene preload start');
        
        // Create loading bar
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

        // Loading text
        const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
            fontSize: '20px',
            color: '#ffffff'
        });
        loadingText.setOrigin(0.5, 0.5);

        // Percentage text
        const percentText = this.add.text(width / 2, height / 2, '0%', {
            fontSize: '18px',
            color: '#ffffff'
        });
        percentText.setOrigin(0.5, 0.5);

        // Loading progress
        this.load.on('progress', (value: number) => {
            percentText.setText(parseInt((value * 100).toString()) + '%');
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });

        // Loading error handling
        this.load.on('loaderror', (fileObj: { key: string; src: string }) => {
            console.error('Error loading asset:', fileObj.key, fileObj.src);
        });

        // Load Jiwatron character assets
        this.load.atlas(
            'jiwatron', 
            '/game/assets/sprites/characters/Jiwatron.png',
            '/game/assets/sprites/characters/Jiwatron.json'
        );

        // Load waterfall frames individually
        for (let i = 1; i <= 8; i++) {
            this.load.image(
                `water_fall${i}`,
                `/game/assets/object_animation/water_fall/water_fall${i}.png`
            );
        }

        // Load bridge building frames individually
        for (let i = 1; i <= 8; i++) {
            this.load.image(
                `bridge_building${i}`,
                `/game/assets/object_animation/bridge_building/bridge_building${i}.png`
            );
        }

        // Load obelisk tower frames individually
        for (let i = 1; i <= 8; i++) {
            this.load.image(
                `obelisk_tower${i}`,
                `/game/assets/object_animation/obelisk_tower/obelisk_tower${i}.png`
            );
        }

        // Load arcade building frames individually
        for (let i = 1; i <= 16; i++) {
            this.load.image(
                `arcade_building${i}`,
                `/game/assets/object_animation/arcade_building/arcade_building${i}.png`
            );
        }

        console.log('PreloaderScene preload end');
    }

    create() {
        console.log('PreloaderScene create start');
        
        // Create animations
        this.createJiwatronAnimations();

        // Verify all required assets are loaded
        if (!this.textures.exists('jiwatron')) {
            console.error('Jiwatron texture not loaded!');
            return;
        }

        console.log('Starting MapScene...');
        this.scene.start('MapScene');
    }

    private createJiwatronAnimations() {
        // Idle Animation
        this.anims.create({
            key: 'jiwatron-idle',
            frames: this.anims.generateFrameNames('jiwatron', {
                prefix: 'Jiwatron #Idle ',
                start: 0,
                end: 5,
                suffix: '.aseprite'
            }),
            frameRate: 10,
            repeat: -1
        });

        // Walk Animation
        this.anims.create({
            key: 'jiwatron-walk',
            frames: this.anims.generateFrameNames('jiwatron', {
                prefix: 'Jiwatron #Walk ',
                start: 0,
                end: 7,
                suffix: '.aseprite'
            }),
            frameRate: 10,
            repeat: -1
        });

        // Attack1 Animation
        this.anims.create({
            key: 'jiwatron-attack1',
            frames: this.anims.generateFrameNames('jiwatron', {
                prefix: 'Jiwatron #Attack01 ',
                start: 0,
                end: 6,
                suffix: '.aseprite'
            }),
            frameRate: 12,
            repeat: 0
        });

        // Attack2 Animation
        this.anims.create({
            key: 'jiwatron-attack2',
            frames: this.anims.generateFrameNames('jiwatron', {
                prefix: 'Jiwatron #Attack02 ',
                start: 0,
                end: 10,
                suffix: '.aseprite'
            }),
            frameRate: 12,
            repeat: 0
        });

        // Attack3 Animation
        this.anims.create({
            key: 'jiwatron-attack3',
            frames: this.anims.generateFrameNames('jiwatron', {
                prefix: 'Jiwatron #Attack03 ',
                start: 0,
                end: 8,
                suffix: '.aseprite'
            }),
            frameRate: 12,
            repeat: 0
        });

        // Hurt Animation
        this.anims.create({
            key: 'jiwatron-hurt',
            frames: this.anims.generateFrameNames('jiwatron', {
                prefix: 'Jiwatron #Hurt ',
                start: 0,
                end: 3,
                suffix: '.aseprite'
            }),
            frameRate: 10,
            repeat: 0
        });

        // Death Animation
        this.anims.create({
            key: 'jiwatron-death',
            frames: this.anims.generateFrameNames('jiwatron', {
                prefix: 'Jiwatron #Death ',
                start: 0,
                end: 3,
                suffix: '.aseprite'
            }),
            frameRate: 10,
            repeat: 0
        });

        console.log('Animations created');
    }
}