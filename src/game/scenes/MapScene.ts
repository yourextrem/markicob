import { Scene } from 'phaser';
import { Player } from '../sprites/Player';

export class MapScene extends Scene {
    private map!: Phaser.Tilemaps.Tilemap;
    private tileset!: Phaser.Tilemaps.Tileset;
    private backgroundLayer!: Phaser.Tilemaps.TilemapLayer;
    private collisionLayer!: Phaser.Tilemaps.TilemapLayer;
    private player!: Player;
    private waterfall!: Phaser.GameObjects.Sprite;
    private animatedObjects!: Phaser.GameObjects.Group;
    private depthSortedObjects!: Phaser.GameObjects.Group;
    private collisionObjects: (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Polygon)[] = [];
    private debugCollisions: boolean = false; // Set to false to hide all debug visuals
    private debugGraphics: (Phaser.GameObjects.Graphics | Phaser.GameObjects.Polygon | Phaser.GameObjects.Text)[] = [];
    private playerCollisionGraphics!: Phaser.GameObjects.Graphics; // Custom player collision visualization
    private obeliskDebugGraphics: (Phaser.GameObjects.Graphics | Phaser.GameObjects.Text)[] = []; // Debug graphics for obelisk dimensions
    private stoneSectorDebugGraphics: (Phaser.GameObjects.Graphics | Phaser.GameObjects.Text)[] = []; // Debug graphics for stone_sector dimensions

    constructor() {
        super({ key: 'MapScene' });
    }

    preload() {
        // Load map tileset
        this.load.image('obelisk_lobby', '/game/assets/maps/obelisk_lobby.png');
        this.load.tilemapTiledJSON('obelisk_map', '/game/assets/maps/obelisk_lobby.json');

        // Load waterfall frames individually
        for (let i = 1; i <= 8; i++) {
            this.load.image(
                `water_fall${i}`,
                `/game/assets/object_animation/water_fall/water_fall${i}.png`
            );
        }

        // Load armory_blacksmith frames individually
        for (let i = 1; i <= 6; i++) {
            this.load.image(
                `armory_blacksmith${i}`,
                `/game/assets/object_animation/armory_blacksmith/armory_blacksmith${i}.png`
            );
        }

        // Load plant_tree frames individually
        for (let i = 1; i <= 8; i++) {
            this.load.image(
                `plant_tree${i}`,
                `/game/assets/object_animation/plant_tree/plant_tree${i}.png`
            );
        }

        // Load stone_sector images (static, not animated)
        for (let i = 1; i <= 3; i++) {
            this.load.image(
                `stone_sector${i}`,
                `/game/assets/object_animation/stone_sector/stone_sector${i}.png`
            );
        }
    }

    create() {
        try {
            // Create groups to hold animated objects
            this.animatedObjects = this.add.group();
            this.depthSortedObjects = this.add.group();

            // Create map and tileset
            this.createMap();

            // Create animated objects
            this.createAnimatedObjects();

            // Create player
            this.createPlayer();

            // Setup camera
            this.setupCamera();

                    // Add keyboard controls
        this.setupControls();

        // Create obelisk debug visualization (disabled)
        // this.createObeliskDebugVisualization();
        
        // Create stone sector debug visualization (disabled)
        // this.createStoneSectorDebugVisualization();

            // Set background color
            this.cameras.main.setBackgroundColor('#000000');

        } catch (error) {
            console.error('Error in MapScene create:', error);
        }
    }

    private createMap() {
        // Create the tilemap
        this.map = this.make.tilemap({ 
            key: 'obelisk_map',
            tileWidth: 16,
            tileHeight: 16
        });
        
        // Add the tileset image - match the names exactly from Tiled JSON
        this.tileset = this.map.addTilesetImage('obelisk_lobby', 'obelisk_lobby')!;
        if (!this.tileset) {
            console.error('Failed to load tileset');
            return;
        }

        // Create background layer
        this.backgroundLayer = this.map.createLayer('obelisk_lobby', this.tileset)!;
        if (this.backgroundLayer) {
            this.backgroundLayer.setDepth(0);
        } else {
            console.error('Failed to create background layer');
            return;
        }

        // Create collision layer
        this.collisionLayer = this.map.createLayer('collision', this.tileset)!;
        if (this.collisionLayer) {
            // Set collision by tile index. The '2' corresponds to the tile ID in Tiled.
            this.collisionLayer.setCollision(2);
            this.collisionLayer.setVisible(false); // Make the collision layer invisible by default
            this.collisionLayer.setDepth(1);
            
            // Remove debug visualization for tile-based collisions
            // this.collisionLayer.setTint(0xff0000); // Red tint for collision tiles
            // this.collisionLayer.setAlpha(0.5); // Semi-transparent
        } else {
            console.error('Failed to create collision layer');
        }

        // Create collision objects from collision_object layer
        this.createCollisionObjects();
    }

    private createCollisionObjects() {
        // Get the collision layer
        const collisionObjectLayer = this.map.getObjectLayer('collision');
        
        if (!collisionObjectLayer) {
            console.log('No collision_object layer found');
            return;
        }

        // Extract polygon objects with collides: true
        const polygons = collisionObjectLayer.objects.filter(obj => {
            return obj.polygon && obj.properties?.some((p: { name: string; value: boolean }) => p.name === 'collides' && p.value === true);
        });

        console.log(`Found ${polygons.length} collision polygons`);

        // Convert each polygon into a physics body
        polygons.forEach((obj, index) => {
            if (!obj.x || !obj.y || !obj.polygon) {
                console.log(`Skipping polygon ${index}: missing position or polygon data`);
                return;
            }

            const points = obj.polygon.map(p => ({
                x: obj.x! + p.x,
                y: obj.y! + p.y
            }));

            console.log(`Polygon ${index}: position (${obj.x}, ${obj.y}), points:`, points);

            // Create multiple small rectangles to better approximate the polygon shape
            const rectSize = 16; // Size of each collision rectangle
            const collisionRects: Phaser.GameObjects.Rectangle[] = [];

            // Calculate bounding box
            const minX = Math.min(...points.map(p => p.x));
            const maxX = Math.max(...points.map(p => p.x));
            const minY = Math.min(...points.map(p => p.y));
            const maxY = Math.max(...points.map(p => p.y));

            // Create a grid of small rectangles within the polygon bounds
            for (let x = minX; x < maxX; x += rectSize) {
                for (let y = minY; y < maxY; y += rectSize) {
                    const rectCenterX = x + rectSize / 2;
                    const rectCenterY = y + rectSize / 2;
                    
                    // Check if this rectangle center is inside the polygon
                    if (this.isPointInPolygon(rectCenterX, rectCenterY, points)) {
                        const collisionRect = this.add.rectangle(rectCenterX, rectCenterY, rectSize, rectSize, 0x00ff00, 0.3);
                        collisionRect.setVisible(false); // Hide collision rectangles by default
                        this.physics.add.existing(collisionRect, true);
                        collisionRects.push(collisionRect);
                        this.collisionObjects.push(collisionRect);
                    }
                }
            }

            // Create visible polygon for debug visualization
            const debugPolygon = this.add.polygon(obj.x, obj.y, points, 0x0000ff, 0.3);
            debugPolygon.setVisible(false); // Hide debug polygons by default
            this.debugGraphics.push(debugPolygon);

            // Add debug graphics to visualize collision areas
            const debugGraphics = this.add.graphics()
                .lineStyle(8, 0xff0000, 1) // Much thicker red line, fully opaque
                .strokePoints(points.concat([points[0]]), true);
            debugGraphics.setVisible(false); // Hide debug graphics by default
            this.debugGraphics.push(debugGraphics);

            // Also add a filled polygon for better visibility
            const filledDebug = this.add.graphics()
                .fillStyle(0xff0000, 0.5) // More opaque red fill
                .fillPoints(points, true, true);
            filledDebug.setVisible(false); // Hide filled debug graphics by default
            this.debugGraphics.push(filledDebug);

            // Add a bright center point for the collision object
            const centerDebug = this.add.graphics()
                .fillStyle(0x00ff00, 1) // Bright green center point
                .fillCircle(obj.x, obj.y, 5);
            centerDebug.setVisible(false); // Hide center point by default
            this.debugGraphics.push(centerDebug);

            // Add text label for the collision object
            const textLabel = this.add.text(obj.x, obj.y - 20, 'COLLISION', {
                fontSize: '16px',
                color: '#ffffff',
                backgroundColor: '#ff0000',
                padding: { x: 5, y: 2 }
            });
            textLabel.setOrigin(0.5);
            textLabel.setVisible(false); // Hide text label by default
            this.debugGraphics.push(textLabel);

            console.log(`Created ${collisionRects.length} collision rectangles for polygon at (${obj.x}, ${obj.y})`);
        });
    }

    // Helper method to check if a point is inside a polygon
    private isPointInPolygon(x: number, y: number, polygon: {x: number, y: number}[]): boolean {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            if (((polygon[i].y > y) !== (polygon[j].y > y)) &&
                (x < (polygon[j].x - polygon[i].x) * (y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
                inside = !inside;
            }
        }
        return inside;
    }

    private createPolygonCollision(_obj: Phaser.Types.Tilemaps.TiledObject) {
        // This method is no longer needed as we handle everything in createCollisionObjects
    }

    private createRectangleCollision(_obj: Phaser.Types.Tilemaps.TiledObject) {
        // This method is no longer needed as we handle everything in createCollisionObjects
    }

    private createAnimatedObjects() {
        // Create waterfall animation
        this.anims.create({
            key: 'water_fall_anim',
            frames: Array.from({ length: 8 }, (_, i) => ({ key: `water_fall${i + 1}` })),
            frameRate: 10,
            repeat: -1
        });

        // Create bridge building animation
        this.anims.create({
            key: 'bridge_building_anim',
            frames: Array.from({ length: 8 }, (_, i) => ({ key: `bridge_building${i + 1}` })),
            frameRate: 10,
            repeat: -1
        });

        // Create obelisk tower animation
        this.anims.create({
            key: 'obelisk_tower_anim',
            frames: Array.from({ length: 8 }, (_, i) => ({ key: `obelisk_tower${i + 1}` })),
            frameRate: 10,
            repeat: -1
        });

        // Create arcade building animation
        this.anims.create({
            key: 'arcade_building_anim',
            frames: Array.from({ length: 16 }, (_, i) => ({ key: `arcade_building${i + 1}` })),
            frameRate: 10,
            repeat: -1
        });

        // Create armory_blacksmith animation
        this.anims.create({
            key: 'armory_blacksmith_anim',
            frames: Array.from({ length: 6 }, (_, i) => ({ key: `armory_blacksmith${i + 1}` })),
            frameRate: 10,
            repeat: -1
        });

        // Create plant_tree animation
        this.anims.create({
            key: 'plant_tree_anim',
            frames: Array.from({ length: 8 }, (_, i) => ({ key: `plant_tree${i + 1}` })),
            frameRate: 10,
            repeat: -1
        });

        // Stone sector images are static (no animation needed)

        // Get object layers
        const objectLayer1 = this.map.getObjectLayer('animation_object');
        const objectLayer2 = this.map.getObjectLayer('animation_object2');

        // Process layer with fixed depth (always behind player)
        if (objectLayer1) {
            objectLayer1.objects.forEach(obj => {
                const sprite = this.createAnimatedSprite(obj);
                if (sprite) {
                    this.animatedObjects.add(sprite);
                    sprite.setDepth(5); // Set a fixed depth
                }
            });
        }

        // Process layer with dynamic depth sorting
        if (objectLayer2) {
            objectLayer2.objects.forEach(obj => {
                const sprite = this.createAnimatedSprite(obj);
                if (sprite) {
                    this.depthSortedObjects.add(sprite);
                }
            });
        }
    }

    private createAnimatedSprite(obj: Phaser.Types.Tilemaps.TiledObject): Phaser.GameObjects.Sprite | null {
        let animKey = '';
        let initialFrame = '';
        
        // GID 11169 is the waterfall in Tiled
        if (obj.gid === 11169) {
            animKey = 'water_fall_anim';
            initialFrame = 'water_fall1';
        }
        // GID 11177 is the bridge in Tiled
        else if (obj.gid === 11177) {
            animKey = 'bridge_building_anim';
            initialFrame = 'bridge_building1';
        }
        // GID 11185 is the obelisk tower in Tiled
        else if (obj.gid === 11185) {
            animKey = 'obelisk_tower_anim';
            initialFrame = 'obelisk_tower1';
        }
        // GID 11193 is the arcade building in Tiled
        else if (obj.gid === 11193) {
            animKey = 'arcade_building_anim';
            initialFrame = 'arcade_building1';
        }
        // GID 11209 is the armory_blacksmith in Tiled
        else if (obj.gid === 11209) {
            animKey = 'armory_blacksmith_anim';
            initialFrame = 'armory_blacksmith1';
        }
        // GID 11215-11221 are the plant_tree variations in Tiled
        else if (obj.gid && obj.gid >= 11215 && obj.gid <= 11221) {
            animKey = 'plant_tree_anim';
            initialFrame = 'plant_tree1';
        }
        // GID 11223-11225 are the stone_sector variations in Tiled (static images)
        else if (obj.gid && obj.gid >= 11223 && obj.gid <= 11225) {
            // Map GID to specific stone_sector image based on JSON data
            // GID 11223 (ID 62) → stone_sector2.png
            // GID 11224 (ID 63) → stone_sector3.png  
            // GID 11225 (ID 64) → stone_sector1.png
            if (obj.gid === 11223) {
                initialFrame = 'stone_sector2';
            } else if (obj.gid === 11224) {
                initialFrame = 'stone_sector3';
            } else if (obj.gid === 11225) {
                initialFrame = 'stone_sector1';
            }
            // No animation key needed for static images
        }

        if (animKey && initialFrame) {
            // Animated sprite
            const sprite = this.add.sprite(obj.x || 0, obj.y || 0, initialFrame);
            sprite.setOrigin(0, 1);
            sprite.setDisplaySize(obj.width || 0, obj.height || 0);
            sprite.play(animKey);
            return sprite;
        } else if (initialFrame) {
            // Static sprite (like stone_sector)
            const sprite = this.add.sprite(obj.x || 0, obj.y || 0, initialFrame);
            sprite.setOrigin(0, 1);
            sprite.setDisplaySize(obj.width || 0, obj.height || 0);
            return sprite;
        }

        return null;
    }

    private createPlayer() {
        // Create player in center of map
        const centerX = this.map.widthInPixels / 2;
        const centerY = this.map.heightInPixels / 2;

        this.player = new Player(this, centerX, centerY);
        this.player.setDepth(10);

        // Always show player physics body for debugging with enhanced visibility
        if (this.player.body) {
            this.player.body.debugShowBody = false; // Hide player physics body by default
            this.player.body.debugBodyColor = 0x00ffff; // Bright cyan color
        }

        // Create custom player collision visualization
        this.playerCollisionGraphics = this.add.graphics();
        this.playerCollisionGraphics.setDepth(15); // Above everything else
        this.playerCollisionGraphics.setVisible(false); // Hide player collision visualization

        // Set up collision with tile-based collision layer
        if (this.collisionLayer) {
            this.physics.add.collider(this.player, this.collisionLayer);
        }

        // Set up collision with polygon/rectangle collision objects
        this.collisionObjects.forEach(collisionObj => {
            this.physics.add.collider(this.player, collisionObj);
            
            // Add collision event listener for debugging
            this.physics.add.overlap(this.player, collisionObj, () => {
                console.log('Player overlapping with collision object!');
            });
        });
    }

    private setupCamera() {
        const mainCamera = this.cameras.main;

        // Follow player
        mainCamera.startFollow(this.player, true, 1, 1);
        
        // Set bounds
        mainCamera.setBounds(0, 0, 
            this.map.widthInPixels, 
            this.map.heightInPixels
        );

        // Set world bounds
        this.physics.world.setBounds(0, 0, 
            this.map.widthInPixels, 
            this.map.heightInPixels
        );

        // Set zoom
        mainCamera.setZoom(2.5);

        // Remove deadzone
        mainCamera.setDeadzone(0, 0);
        
        // Remove offset
        mainCamera.setFollowOffset(0, 0);

        // Enable pixel-perfect rendering
        mainCamera.roundPixels = true;
    }

    private setupControls() {
        // Fullscreen toggle
        this.input.keyboard?.addKey('F').on('down', () => {
            if (this.scale.isFullscreen) {
                this.scale.stopFullscreen();
            } else {
                this.scale.startFullscreen();
            }
        });

        // Zoom controls
        this.input.keyboard?.addKey('PLUS').on('down', () => {
            const newZoom = this.cameras.main.zoom + 0.1;
            this.cameras.main.setZoom(Math.min(newZoom, 4));
        });

        this.input.keyboard?.addKey('MINUS').on('down', () => {
            const newZoom = this.cameras.main.zoom - 0.1;
            this.cameras.main.setZoom(Math.max(newZoom, 1));
        });

        // Collision debug toggle (C key)
        this.input.keyboard?.addKey('C').on('down', () => {
            this.debugCollisions = !this.debugCollisions;
            this.collisionObjects.forEach(obj => {
                obj.setVisible(this.debugCollisions);
            });
            console.log(`Collision debug: ${this.debugCollisions ? 'ON' : 'OFF'}`);
            console.log(`Number of collision objects: ${this.collisionObjects.length}`);
        });

        // Force enable debug mode (D key) for testing - DISABLED
        // this.input.keyboard?.addKey('D').on('down', () => {
        //     this.debugCollisions = true;
        //     this.forceShowAllDebug();
        //     console.log('Debug mode FORCED ON');
        //     console.log(`Number of collision objects: ${this.collisionObjects.length}`);
        // });

        // Comprehensive physics debug (P key)
        this.input.keyboard?.addKey('P').on('down', () => {
            this.togglePhysicsDebug();
        });

        // Show collision info (I key)
        this.input.keyboard?.addKey('I').on('down', () => {
            this.showCollisionInfo();
        });

        // Force show all debug (V key) - DISABLED
        // this.input.keyboard?.addKey('V').on('down', () => {
        //     this.forceShowAllDebug();
        // });

        // Show player collision box (B key)
        this.input.keyboard?.addKey('B').on('down', () => {
            this.showPlayerCollisionBox();
        });

        // Toggle collision rectangles (R key)
        this.input.keyboard?.addKey('R').on('down', () => {
            this.toggleCollisionRectangles();
        });

        // Toggle obelisk debug visualization (O key) - DISABLED
        // this.input.keyboard?.addKey('O').on('down', () => {
        //     this.toggleObeliskDebugVisualization();
        // });

        // Toggle stone sector debug visualization (S key) - DISABLED
        // this.input.keyboard?.addKey('S').on('down', () => {
        //     this.toggleStoneSectorDebugVisualization();
        // });

        // Handle resize
        this.scale.on('resize', (gameSize: { width: number; height: number }) => {
            this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
        });
    }

    private showPlayerCollisionBox() {
        if (this.player && this.player.body) {
            const body = this.player.body;
            console.log('=== PLAYER COLLISION BOX ===');
            console.log(`Position: (${this.player.x}, ${this.player.y})`);
            console.log(`Body position: (${body.x}, ${body.y})`);
            console.log(`Body size: ${body.width} x ${body.height}`);
            console.log(`Body offset: (${body.offset.x}, ${body.offset.y})`);
            console.log(`Body bounds:`, body.getBounds(new Phaser.Geom.Rectangle()));
            console.log(`Velocity: (${body.velocity.x}, ${body.velocity.y})`);
            console.log(`Enabled: ${body.enable}`);
            console.log(`Debug visible: ${body.debugShowBody}`);
            console.log('============================');
        }
    }

    private toggleCollisionRectangles() {
        this.debugCollisions = !this.debugCollisions;
        
        // Toggle collision rectangles visibility
        this.collisionObjects.forEach(obj => {
            obj.setVisible(this.debugCollisions);
        });
        
        // Toggle debug graphics visibility
        this.debugGraphics.forEach(graphics => {
            graphics.setVisible(this.debugCollisions);
        });
        
        console.log(`Collision rectangles: ${this.debugCollisions ? 'VISIBLE' : 'HIDDEN'}`);
        console.log(`- Collision objects: ${this.collisionObjects.length}`);
        console.log(`- Debug graphics: ${this.debugGraphics.length}`);
    }

    private togglePhysicsDebug() {
        this.debugCollisions = !this.debugCollisions;
        
        // Toggle collision objects visibility
        this.collisionObjects.forEach(obj => {
            obj.setVisible(this.debugCollisions);
        });

        // Toggle debug graphics visibility
        this.debugGraphics.forEach(graphics => {
            graphics.setVisible(this.debugCollisions);
        });

        // Toggle tile-based collision layer visibility
        if (this.collisionLayer) {
            this.collisionLayer.setVisible(this.debugCollisions);
        }

        // Toggle player physics body debug
        if (this.player && this.player.body) {
            this.player.body.debugBodyColor = 0xff00ff; // Always visible
            this.player.body.debugShowBody = true;
        }

        console.log(`Physics debug: ${this.debugCollisions ? 'ON' : 'OFF'}`);
        console.log(`- Collision objects: ${this.collisionObjects.length}`);
        console.log(`- Debug graphics: ${this.debugGraphics.length}`);
        console.log(`- Player physics: ${this.player ? 'enabled' : 'disabled'}`);
    }

    private forceShowAllDebug() {
        // Force show all collision objects
        this.collisionObjects.forEach(obj => {
            obj.setVisible(true);
            obj.setAlpha(0.8);
        });

        // Force show all debug graphics
        this.debugGraphics.forEach(graphics => {
            graphics.setVisible(true);
            graphics.setAlpha(1);
        });

        // Force show collision layer
        if (this.collisionLayer) {
            this.collisionLayer.setVisible(true);
        }

        // Force show player physics
        if (this.player && this.player.body) {
            this.player.body.debugShowBody = true;
            this.player.body.debugBodyColor = 0xff00ff;
        }

        console.log('ALL DEBUG VISUALIZATIONS FORCED ON');
        console.log(`- Collision objects: ${this.collisionObjects.length} (all visible)`);
        console.log(`- Debug graphics: ${this.debugGraphics.length} (all visible)`);
    }

    private showCollisionInfo() {
        console.log('=== COLLISION INFORMATION ===');
        console.log(`Player position: (${this.player?.x}, ${this.player?.y})`);
        console.log(`Player physics body: ${this.player?.body ? 'enabled' : 'disabled'}`);
        
        if (this.collisionLayer) {
            console.log('Tile-based collision layer: enabled');
            console.log(`- Layer visible: ${this.collisionLayer.visible}`);
            console.log(`- Layer alpha: ${this.collisionLayer.alpha}`);
        }
        
        console.log(`Polygon collision objects: ${this.collisionObjects.length}`);
        this.collisionObjects.forEach((obj, index) => {
            console.log(`- Object ${index}: position (${obj.x}, ${obj.y}), visible: ${obj.visible}`);
        });
        
        console.log(`Debug graphics: ${this.debugGraphics.length}`);
        console.log(`Debug mode: ${this.debugCollisions ? 'ON' : 'OFF'}`);
        console.log('=============================');
    }

    update() {
        // Update player
        if (this.player) {
            this.player.update();
            // Set player depth to ensure they can go in front of obelisk
            this.player.setDepth(200); // Higher than obelisk's "behind" depth (50)
        }

               // Update depth sorting for animated objects with special handling for obelisk tower
              this.depthSortedObjects.getChildren().forEach((sprite: Phaser.GameObjects.GameObject) => {
            // Special handling for obelisk tower (70/30 split with transparency)
            if (sprite instanceof Phaser.GameObjects.Sprite && sprite.texture && sprite.texture.key && sprite.texture.key.startsWith('obelisk_tower')) {
                // const obeliskVisualY = 749.667; // Visual position from JSON - unused variable
                const obeliskPhysicsY = 500; // Physics position (moved down)
                const obeliskHeight = 256;
                const playerY = this.player ? this.player.y : 0;
                
                // Calculate the split point for 65/35 distribution using physics position
                // Top 65% of obelisk height = player goes behind obelisk
                // Bottom 35% of obelisk height = player goes in front of obelisk
                const splitPoint = obeliskPhysicsY + (obeliskHeight * 0.65); // 65% from top of physics box
                
                if (playerY < splitPoint) {
                    // Player is in the top 65% zone - obelisk in front of player
                    sprite.depth = 1000; // High depth - obelisk in front
                    sprite.setAlpha(0.6); // Make obelisk transparent when in front of player
                } else {
                    // Player is in the bottom 35% zone - obelisk behind player
                    sprite.depth = 50; // Low depth - obelisk behind
                    sprite.setAlpha(1.0); // Full opacity when behind player
                }
                
                // console.log(`Obelisk depth: ${sprite.depth}, Player Y: ${playerY}, Split point: ${splitPoint} (physics Y: ${obeliskPhysicsY})`);
            }
            // Special handling for stone_sector objects (always in front, transparent when player inside bounding box)
            else if (sprite instanceof Phaser.GameObjects.Sprite && sprite.texture && sprite.texture.key && sprite.texture.key.startsWith('stone_sector')) {
                const stoneSectorX = sprite.x;
                const stoneSectorY = sprite.y;
                const stoneSectorWidth = 259; // Actual width from JSON data
                const stoneSectorHeight = 500; // Actual height from JSON data
                const playerX = this.player ? this.player.x : 0;
                const playerY = this.player ? this.player.y : 0;
                
                // Stone_sector always appears in front of player
                sprite.depth = 1000; // High depth - always in front
                
                // Calculate bounding box coordinates (same as red rectangle in debug)
                const boxLeft = stoneSectorX;
                const boxRight = stoneSectorX + stoneSectorWidth;
                const boxTop = stoneSectorY - stoneSectorHeight;
                const boxBottom = stoneSectorY;
                
                // Check if player is inside the stone_sector bounding box
                const playerInBox = playerX >= boxLeft && playerX <= boxRight && 
                                   playerY >= boxTop && playerY <= boxBottom;
                
                if (playerInBox) {
                    // Player is inside the stone_sector bounding box - make it transparent
                    sprite.setAlpha(0.7); // Slightly transparent when player inside box
                } else {
                    // Player is outside the stone_sector bounding box - full opacity
                    sprite.setAlpha(1.0); // Full opacity when player outside box
                }
            } else if (sprite instanceof Phaser.GameObjects.Sprite) {
                // Regular depth sorting for other sprite objects
                const depthLine = Math.floor(sprite.y / 32);
                sprite.depth = depthLine;
            }
       });

        // Player collision visualization is now hidden by default
    }

    private createObeliskDebugVisualization() {
        // Clear any existing obelisk debug graphics
        this.obeliskDebugGraphics.forEach(graphics => graphics.destroy());
        this.obeliskDebugGraphics = [];

        // Get obelisk tower object from the map
        const animationLayer = this.map.getObjectLayer('animation_object2');
        if (!animationLayer) {
            console.error('Animation object2 layer not found');
            return;
        }

        const obeliskObject = animationLayer.objects.find(obj => obj.gid === 11185); // obelisk_tower GID
        if (!obeliskObject) {
            console.error('Obelisk tower object not found');
            return;
        }

        const obeliskX = obeliskObject.x || 0;
        const obeliskY = obeliskObject.y || 0;
        const obeliskWidth = obeliskObject.width || 192;
        const obeliskHeight = obeliskObject.height || 256;

        // Physics/collision box position (moved to y=500)
        const physicsX = obeliskX; // Keep same X position
        const physicsY = 500; // Move physics box to Y=500

        console.log(`Obelisk visual position: (${obeliskX}, ${obeliskY})`);
        console.log(`Obelisk physics position: (${physicsX}, ${physicsY})`);
        console.log(`Obelisk dimensions: ${obeliskWidth}x${obeliskHeight}`);

        // Create debug graphics for obelisk dimensions
        const graphics = this.add.graphics();
        
        // Draw the physics/collision bounding box (red) at y=500
        graphics.lineStyle(3, 0xff0000, 1);
        graphics.strokeRect(physicsX, physicsY, obeliskWidth, obeliskHeight);
        
        // Draw center point of physics box (yellow)
        graphics.lineStyle(2, 0xffff00, 1);
        graphics.fillStyle(0xffff00, 1);
        graphics.fillCircle(physicsX + obeliskWidth / 2, physicsY + obeliskHeight / 2, 4);
        
        // Draw the 65/35 split line (cyan) for physics box
        const splitPoint = physicsY + (obeliskHeight * 0.65);
        graphics.lineStyle(4, 0x00ffff, 1);
        graphics.lineBetween(physicsX, splitPoint, physicsX + obeliskWidth, splitPoint);
        
        // Add text labels for physics box
        const fullBoxText = this.add.text(physicsX, physicsY - 20, 'PHYSICS BOX (y=500)', {
            fontSize: '12px',
            color: '#ff0000',
            backgroundColor: '#000000',
            padding: { x: 4, y: 2 }
        });
        fullBoxText.setDepth(2000);
        
        const splitText = this.add.text(physicsX, splitPoint - 15, '65/35 SPLIT LINE', {
            fontSize: '12px',
            color: '#00ffff',
            backgroundColor: '#000000',
            padding: { x: 4, y: 2 }
        });
        splitText.setDepth(2000);
        
        const centerText = this.add.text(physicsX + obeliskWidth / 2 - 30, physicsY + obeliskHeight / 2 - 10, 'CENTER', {
            fontSize: '10px',
            color: '#ffff00',
            backgroundColor: '#000000',
            padding: { x: 2, y: 1 }
        });
        centerText.setDepth(2000);

        // Store references for toggling
        this.obeliskDebugGraphics.push(graphics, fullBoxText, splitText, centerText);
        
        // Initially hide the debug visualization
        this.obeliskDebugGraphics.forEach(g => g.setVisible(false));
        
        console.log('Obelisk debug visualization created (press O to toggle)');
    }

    private toggleObeliskDebugVisualization() {
        const isVisible = this.obeliskDebugGraphics.length > 0 && this.obeliskDebugGraphics[0].visible;
        
        this.obeliskDebugGraphics.forEach(graphics => {
            graphics.setVisible(!isVisible);
        });
        
        console.log(`Obelisk debug visualization: ${!isVisible ? 'ON' : 'OFF'}`);
    }

    private createStoneSectorDebugVisualization() {
        // Clear existing debug graphics
        this.stoneSectorDebugGraphics.forEach(graphics => graphics.destroy());
        this.stoneSectorDebugGraphics = [];

        // Find stone_sector objects in the animation_object2 layer
        const animationLayer2 = this.map.getObjectLayer('animation_object2');
        if (!animationLayer2) {
            console.error('Animation object2 layer not found');
            return;
        }

        const stoneSectorObjects = animationLayer2.objects.filter(obj => 
            obj.gid && obj.gid >= 11223 && obj.gid <= 11225
        );

        if (stoneSectorObjects.length === 0) {
            console.log('No stone_sector objects found');
            return;
        }

        stoneSectorObjects.forEach((obj, index) => {
            const stoneSectorX = obj.x || 0;
            const stoneSectorY = obj.y || 0;
            const stoneSectorWidth = 259; // Actual width from JSON
            const stoneSectorHeight = 500; // Actual height from JSON

            // Create debug graphics
            const graphics = this.add.graphics();

            // Draw the full stone_sector bounding box (red)
            graphics.lineStyle(3, 0xff0000, 1);
            graphics.strokeRect(stoneSectorX, stoneSectorY - stoneSectorHeight, stoneSectorWidth, stoneSectorHeight);

            // Draw the center point (yellow)
            graphics.fillStyle(0xffff00, 1);
            graphics.fillCircle(stoneSectorX + stoneSectorWidth / 2, stoneSectorY - stoneSectorHeight / 2, 5);

            // Draw the 70/30 split line (cyan)
            const splitPoint = stoneSectorY - stoneSectorHeight + (stoneSectorHeight * 0.7);
            graphics.lineStyle(2, 0x00ffff, 1);
            graphics.lineBetween(stoneSectorX, splitPoint, stoneSectorX + stoneSectorWidth, splitPoint);

            // Add text labels
            const sizeText = this.add.text(stoneSectorX, stoneSectorY - stoneSectorHeight - 20, 
                `Stone Sector ${index + 1}: ${stoneSectorWidth}x${stoneSectorHeight}`, 
                { fontSize: '12px', color: '#ffffff' });
            
            const splitText = this.add.text(stoneSectorX, splitPoint - 15, 
                '70/30 Split Line', 
                { fontSize: '10px', color: '#00ffff' });

            // Add to debug graphics array
            this.stoneSectorDebugGraphics.push(graphics, sizeText, splitText);
        });

        // Initially hide all debug graphics
        this.stoneSectorDebugGraphics.forEach(graphics => graphics.setVisible(false));
    }

    private toggleStoneSectorDebugVisualization() {
        const isVisible = this.stoneSectorDebugGraphics.length > 0 && this.stoneSectorDebugGraphics[0].visible;
        
        this.stoneSectorDebugGraphics.forEach(graphics => {
            graphics.setVisible(!isVisible);
        });
        
        console.log(`Stone Sector debug visualization: ${!isVisible ? 'ON' : 'OFF'}`);
    }
}