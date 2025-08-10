import { Scene } from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
    public keys: { [key: string]: Phaser.Input.Keyboard.Key };
    private speed: number = 150;
    private isMoving: boolean = false;
    private isAttacking: boolean = false;
    private isHurt: boolean = false;
    private isDead: boolean = false;
    private attackCooldown: number = 0; // Added for attack cooldown

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, 'jiwatron'); // Use lowercase 'jiwatron' to match PreloaderScene

        this.keys = this.scene.input.keyboard!.addKeys('W,A,S,D,J,K,L,H,P,R') as { [key: string]: Phaser.Input.Keyboard.Key };

        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Set up physics properties
        this.setCollideWorldBounds(true);
        this.setBounce(0);
        this.setDrag(300);

        // Set a collision box that matches the character sprite better
        this.setSize(16, 16); // Smaller, more precise collision box
        this.setOffset(40, 38); // Move right and down to perfectly center on character

        this.setScale(1);

        this.playIdle();

        this.on(Phaser.Animations.Events.ANIMATION_COMPLETE, this.handleAnimationComplete, this);
    }

    private handleAnimationComplete(animation: Phaser.Animations.Animation) {
        if (animation.key.startsWith('jiwatron-attack')) {
            this.isAttacking = false;
            // Return to idle if not moving
            if (!this.isMoving) {
                this.playIdle();
            }
        } else if (animation.key === 'jiwatron-hurt') {
            this.isHurt = false;
            this.playIdle();
        } else if (animation.key === 'jiwatron-death') {
            this.isDead = true;
            this.setVelocity(0);
            // Optional: Disable physics when dead
            if (this.body) {
                this.body.enable = false;
            }
        }
    }

    // MOVEMENT AND ACTIONS
    public moveLeft() {
        this.setVelocityX(-this.speed);
        this.setFlipX(true);
        this.isMoving = true;
    }

    public moveRight() {
        this.setVelocityX(this.speed);
        this.setFlipX(false);
        this.isMoving = true;
    }

    public moveUp() {
        this.setVelocityY(-this.speed);
        this.isMoving = true;
    }

    public moveDown() {
        this.setVelocityY(this.speed);
        this.isMoving = true;
    }

    public stopHorizontal() {
        this.setVelocityX(0);
    }

    public stopVertical() {
        this.setVelocityY(0);
    }

    // ANIMATION HELPERS
    public playIdle() {
        if (this.isAttacking || this.isHurt || this.isDead) return;
        if (this.body && this.body.velocity.x === 0 && this.body.velocity.y === 0) {
            this.play('jiwatron-idle', true);
        }
    }

    public playWalk() {
        if (this.isAttacking || this.isHurt || this.isDead) return;
        if (this.body && (this.body.velocity.x !== 0 || this.body.velocity.y !== 0)) {
            this.play('jiwatron-walk', true);
        }
    }

    public attack(animationKey: string) {
        if (this.isAttacking || this.isHurt || this.isDead || this.attackCooldown > 0) return;

        this.isAttacking = true;
        this.setVelocity(0);
        this.play(animationKey, true);
    }



    public playHurt() {
        if (this.isHurt || this.isDead) return;
        this.isHurt = true;
        this.setVelocity(0);
        this.play('jiwatron-hurt', true);
    }

    public playDeath() {
        if (this.isDead) return;
        this.isDead = true;
        this.setVelocity(0);
        this.play('jiwatron-death', true);
    }

    public resetCharacter() {
        this.isDead = false;
        this.isHurt = false;
        this.isAttacking = false;
        this.attackCooldown = 0; // Reset cooldown
        if (this.body) {
            this.body.enable = true;
        }
        this.setPosition(this.scene.cameras.main.centerX, this.scene.cameras.main.centerY);
        this.playIdle();
    }

    update() {
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }

        if (this.isDead) {
            if (Phaser.Input.Keyboard.JustDown(this.keys.R)) {
                this.resetCharacter();
            }
            return;
        }

        // Check for hurt and death keys
        if (Phaser.Input.Keyboard.JustDown(this.keys.H)) {
            this.playHurt();
            return;
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.P)) {
            this.playDeath();
            return;
        }

        // Handle attacks
        if (!this.isAttacking && !this.isHurt) {
            if (Phaser.Input.Keyboard.JustDown(this.keys.J)) {
                this.attack('jiwatron-attack1');
            } else if (Phaser.Input.Keyboard.JustDown(this.keys.K)) {
                this.attack('jiwatron-attack2');
            } else if (Phaser.Input.Keyboard.JustDown(this.keys.L)) {
                this.attack('jiwatron-attack3');
            }
        }

        // Handle movement if not attacking
        if (!this.isAttacking && !this.isHurt) {
            let isMoving = false;
            if (this.keys.A.isDown) {
                this.moveLeft();
                isMoving = true;
            } else if (this.keys.D.isDown) {
                this.moveRight();
                isMoving = true;
            } else {
                this.stopHorizontal();
            }

            if (this.keys.W.isDown) {
                this.moveUp();
                isMoving = true;
            } else if (this.keys.S.isDown) {
                this.moveDown();
                isMoving = true;
            } else {
                this.stopVertical();
            }

            if (isMoving) {
                this.playWalk();
            } else {
                this.playIdle();
            }
        }
    }
}