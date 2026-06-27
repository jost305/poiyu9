class BattleScene extends Phaser.Scene {
    constructor() {
        super('BattleScene');
    }

    preload() {
        this.p1Key = window.BATTLE_P1 || 'char04';
        this.p2Key = window.BATTLE_P2 || 'floatrobo';

        this.loadFighterAssets(this.p1Key);
        this.loadFighterAssets(this.p2Key);

        // Load background
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            this.load.image('bg', 'images/arenas/bantah-arena-mobile.png');
        } else {
            this.load.image('bg', 'images/arenas/bantah-arena.png');
        }

        this.load.svg('bantah_rune_one', 'bantah-rune-one.svg', { width: 256, height: 256 });
        this.load.image('hp_seg_6', 'small-healthbar/power-bar/Progress6.png');
        this.load.image('hp_seg_7', 'small-healthbar/power-bar/Progress7.png');
        this.load.image('hp_seg_8', 'small-healthbar/power-bar/Progress8.png');
        this.load.image('hp_seg_9', 'small-healthbar/power-bar/Progress9.png');
        this.load.image('hp_seg_10', 'small-healthbar/power-bar/Progress10.png');
        this.load.audio('sfx_magic_cast', 'Music and fx/magic.wav');
        this.load.audio('sfx_magic_sparkle', 'Music and fx/fairy.wav');
        this.load.audio('sfx_hit_heavy', 'Music and fx/heavy-hit-new.mp3');
        this.load.audio('sfx_smoke_puff', 'Music and fx/smoke-puff.mp3');
        this.load.audio('sfx_smoke_puff_big', 'Music and fx/smoke-puff-new.mp3');

        // Load Death FX (18 frames)
        for (let i = 0; i < 18; i++) {
            this.load.image(`fx_death_${i}`, `images/fx/death/skeleton-animation_${i}.png`);
        }

        // Load Fire Arrow (8 frames) — light hits (dmg 5-9)
        for (let i = 1; i <= 8; i++) {
            const num = i < 10 ? `0${i}` : `${i}`;
            this.load.image(`fx_firearrow_${i}`, `images/fx/firearrow/Fire Arrow_Frame_${num}.png`);
        }

        // Load Fire Ball (8 frames) — medium hits (dmg 10-12)
        for (let i = 1; i <= 8; i++) {
            const num = i < 10 ? `0${i}` : `${i}`;
            this.load.image(`fx_fireball_${i}`, `images/fx/fireball/Fire Ball_Frame_${num}.png`);
        }

        // Load Fire Spell (8 frames) — heavy/crit hits (dmg 13+)
        for (let i = 1; i <= 8; i++) {
            const num = i < 10 ? `0${i}` : `${i}`;
            this.load.image(`fx_firespell_${i}`, `images/fx/firespell/Fire Spell_Frame_${num}.png`);
        }

        // Load Explosion 6 (10 frames, small hit)
        for (let i = 1; i <= 10; i++) {
            this.load.image(`fx_explosion6_${i}`, `images/fx/explosion6/Explosion_${i}.png`);
        }

        // Load Explosion 8 (10 frames, big hit)
        for (let i = 1; i <= 10; i++) {
            this.load.image(`fx_explosion8_${i}`, `images/fx/explosion8/Explosion_${i}.png`);
        }
    }

    loadFighterAssets(key) {
        const meta = CHAR_META[key];
        if (!meta) return;

        // Load stand frames
        for (let i = 0; i < meta.stand; i++) {
            this.load.image(`${key}_stand_${i}`, `images/fighters/${key}/left/stand/${i}.png`);
        }

        // Load attack frames
        for (let i = 0; i < meta.attack; i++) {
            this.load.image(`${key}_attack_${i}`, `images/fighters/${key}/left/high-punch/${i}.png`);
        }
    }

    create() {
        // Add background first so it renders behind everything
        const bg = this.add.image(0, 0, 'bg').setOrigin(0, 0);

        // Scale bg to fill the full HD canvas
        const isMobile = window.innerWidth <= 768;
        const targetWidth = isMobile ? 800 : 1200;
        const targetHeight = isMobile ? 1600 : 800;

        bg.displayWidth = targetWidth;
        bg.displayHeight = targetHeight;

        // Create animations first!
        this.createAnimations(this.p1Key);
        this.createAnimations(this.p2Key);

        // Create universal death animation
        if (!this.anims.exists('fx_death_anim')) {
            const deathFrames = [];
            for (let i = 0; i < 18; i++) {
                deathFrames.push({ key: `fx_death_${i}` });
            }
            this.anims.create({
                key: 'fx_death_anim',
                frames: deathFrames,
                frameRate: 15,
                repeat: 0
            });
        }

        // Create fire arrow animation (light hits)
        if (!this.anims.exists('fx_firearrow_anim')) {
            const frames = [];
            for (let i = 1; i <= 8; i++) frames.push({ key: `fx_firearrow_${i}` });
            this.anims.create({ key: 'fx_firearrow_anim', frames, frameRate: 18, repeat: -1 });
        }

        // Create fire ball animation (medium hits)
        if (!this.anims.exists('fx_fireball_anim')) {
            const frames = [];
            for (let i = 1; i <= 8; i++) frames.push({ key: `fx_fireball_${i}` });
            this.anims.create({ key: 'fx_fireball_anim', frames, frameRate: 18, repeat: -1 });
        }

        // Create fire spell animation (heavy/crit hits)
        if (!this.anims.exists('fx_firespell_anim')) {
            const frames = [];
            for (let i = 1; i <= 8; i++) frames.push({ key: `fx_firespell_${i}` });
            this.anims.create({ key: 'fx_firespell_anim', frames, frameRate: 18, repeat: -1 });
        }

        // Create explosion animations
        if (!this.anims.exists('fx_explosion6_anim')) {
            const explosion6Frames = [];
            for (let i = 1; i <= 10; i++) {
                explosion6Frames.push({ key: `fx_explosion6_${i}` });
            }
            this.anims.create({
                key: 'fx_explosion6_anim',
                frames: explosion6Frames,
                frameRate: 20,
                repeat: 0
            });
        }
        
        if (!this.anims.exists('fx_explosion8_anim')) {
            const explosion8Frames = [];
            for (let i = 1; i <= 10; i++) {
                explosion8Frames.push({ key: `fx_explosion8_${i}` });
            }
            this.anims.create({
                key: 'fx_explosion8_anim',
                frames: explosion8Frames,
                frameRate: 20,
                repeat: 0
            });
        }


        const playerTop = isMobile ? 890 : 585;

        // P1 starts on left — closer to center
        const p1StartX = isMobile ? 220 : 380;
        this.p1 = new Fighter(this, p1StartX, playerTop, this.p1Key, true);

        // P2 starts on right — closer to center
        const p2StartX = isMobile ? 580 : 820;
        this.p2 = new Fighter(this, p2StartX, playerTop, this.p2Key, false);

        // Pre-generate a texture for our hit sparks so we don't need external images yet
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xffffff, 1);
        g.fillCircle(8, 8, 8);
        g.generateTexture('hit_spark', 16, 16);

        // Notify HTML UI that game started
        if (window.onGameStarted) {
            window.onGameStarted();
        }

        // Start AI attack loop
        this.startAILoop();
    }

    playSfx(key, config = {}) {
        if (!this.sound || !this.cache.audio.exists(key)) return;
        try {
            this.sound.play(key, Object.assign({ volume: 0.55 }, config));
        } catch (e) {
            // Browser audio can be locked until the first user gesture.
        }
    }

    createAnimations(key) {
        const meta = CHAR_META[key];
        if (!meta) return;

        const standFrames = [];
        for (let i = 0; i < meta.stand; i++) {
            standFrames.push({ key: `${key}_stand_${i}` });
        }

        if (!this.anims.exists(`${key}_stand_anim`)) {
            this.anims.create({
                key: `${key}_stand_anim`,
                frames: standFrames,
                frameRate: 12,
                repeat: -1
            });
        }

        if (!this.anims.exists(`${key}_attack_anim`)) {
            const attackFrames = [];
            for (let i = 0; i < meta.attack; i++) {
                attackFrames.push({ key: `${key}_attack_${i}` });
            }
            if (attackFrames.length > 0) {
                this.anims.create({
                    key: `${key}_attack_anim`,
                    frames: attackFrames,
                    frameRate: 15,
                    repeat: 0
                });
            } else {
                // Fallback to stand anim if no attack frames
                this.anims.create({
                    key: `${key}_attack_anim`,
                    frames: standFrames,
                    frameRate: 15,
                    repeat: 0
                });
            }
        }
    }

    startAILoop() {
        // Randomly decide which player attacks every 1-3 seconds
        this.aiTimer = this.time.addEvent({
            delay: Phaser.Math.Between(1000, 2000),
            callback: this.triggerRandomAttack,
            callbackScope: this,
            loop: true
        });
    }

    playHitSpark(x, y, damage) {
        this.playSfx(damage >= 12 ? 'sfx_hit_heavy' : 'sfx_smoke_puff_big', {
            volume: damage >= 12 ? 0.74 : 0.5,
            detune: Phaser.Math.Between(-80, 80)
        });

        // Create an explosion of glowing particles
        const particles = this.add.particles(x, y, 'hit_spark', {
            speed: { min: 400, max: 1000 }, // Scaled 2x
            angle: { min: 0, max: 360 },
            scale: { start: 1.0, end: 0 }, // Scaled 2x
            alpha: { start: 1, end: 0 },
            blendMode: 'ADD',
            lifespan: 400,
            gravityY: 1200, // Scaled 2x
            tint: [0xffaa00, 0xff0000, 0xffffff], // Yellow-orange-white spark
            quantity: 20,
            emitting: false
        });

        // Fire the particles once
        particles.explode();

        // Optional: Add a quick white flash sprite for extra impact punch
        const flash = this.add.sprite(x, y, 'hit_spark');
        flash.setTint(0xffffff);
        flash.setBlendMode('ADD');
        flash.setScale(4); // 2x for HD

        this.tweens.add({
            targets: flash,
            scale: 8, // 2x for HD
            alpha: 0,
            duration: 150,
            onComplete: () => flash.destroy()
        });

        // Cleanup the emitter after it finishes
        this.time.delayedCall(500, () => {
            particles.destroy();
        });
        
        // ADD NEW EXPLOSION EFFECT ON TOP
        const isCrit = damage >= 12;
        const explosionKey = isCrit ? 'fx_explosion8_1' : 'fx_explosion6_1';
        const explosionAnim = isCrit ? 'fx_explosion8_anim' : 'fx_explosion6_anim';
        
        const explosion = this.add.sprite(x, y, explosionKey);
        explosion.play(explosionAnim);
        explosion.setScale(isCrit ? 0.56 : 0.40); // 2x to match HD
        explosion.setDepth(10);
        explosion.once('animationcomplete', () => {
            explosion.destroy();
        });
    }

    showFloatingText(x, y, text, color = '#ff1744', isCrit = false) {
        // Larger base font sizes for HD
        const fontSize = isCrit ? '64px' : '44px';
        const floatText = this.add.text(x, y, text, {
            fontFamily: '"Inter", sans-serif',
            fontSize: fontSize,
            fontWeight: '800', 
            color: color,
            stroke: '#000000',
            strokeThickness: 8, // Thicker stroke for HD
            shadow: { offsetX: 0, offsetY: 4, color: 'rgba(0,0,0,0.8)', blur: 8, stroke: false, fill: true }
        });
        floatText.setOrigin(0.5, 0.5);

        // Tween to float up and fade out without scaling UP (which causes blur)
        this.tweens.add({
            targets: floatText,
            y: y - (isCrit ? 160 : 120), // Double distance
            scale: { start: 1.0, to: 0.85 }, 
            alpha: { start: 1, to: 0 },
            duration: 1100,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                floatText.destroy();
            }
        });
    }

    triggerRandomAttack() {
        if (this.p1.hp <= 0 || this.p2.hp <= 0) return;

        const attacker = Math.random() > 0.5 ? this.p1 : this.p2;
        const defender = attacker === this.p1 ? this.p2 : this.p1;

        if (attacker.state === 'idle') {
            // Pre-calculate damage so the spell type can be chosen before launch
            const damage = Phaser.Math.Between(5, 15);

            const onHit = () => {
                defender.takeHit(damage);

                // Play visual hit spark effect on the defender, pass damage to determine explosion size
                this.playHitSpark(defender.x, defender.y - 60, damage);
                
                // Show floating damage text
                const isCrit = damage >= 12;
                this.showFloatingText(defender.x, defender.y - 120, `-${damage}`, isCrit ? '#ff1744' : '#ff6d00', isCrit);
                
                // 30% chance to show floating BC Gained
                if (Math.random() > 0.7) {
                    const bcGained = Phaser.Math.Between(1, 5);
                    this.time.delayedCall(200, () => {
                        this.playSfx('sfx_magic_sparkle', { volume: 0.34, detune: 180 });
                        this.showFloatingText(attacker.x, attacker.y - 160, `+${bcGained} BC`, '#ffd600');
                    });
                }

                // Shake camera
                this.cameras.main.shake(150, 0.015);
                
                // Propagate hit to HTML UI
                if (window.onFighterHit) {
                    window.onFighterHit(attacker.isPlayer1 ? 0 : 1, damage, defender.hp, attacker.fighterKey);
                }

                if (defender.hp <= 0) {
                    defender.die();
                    this.aiTimer.remove();
                    
                    // Wait 1.5 seconds for the death animation to play out before showing the win modal
                    this.time.delayedCall(1500, () => {
                        if (window.onGameEnd) {
                            window.onGameEnd(defender.isPlayer1 ? 0 : 1);
                        }
                    });
                }
            };

            // 50% chance to dash attack, 50% chance to shoot a magic spell
            if (Math.random() > 0.5) {
                attacker.attack(defender, onHit);
            } else {
                attacker.shootFireball(defender, damage, onHit);
            }
        }
        
        // Randomize next attack time
        this.aiTimer.delay = Phaser.Math.Between(1500, 3000);
    }
}
