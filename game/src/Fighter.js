class Fighter extends Phaser.GameObjects.Container {
    constructor(scene, x, y, key, isPlayer1) {
        super(scene, x, y);
        this.scene = scene;
        this.isPlayer1 = isPlayer1;
        this.fighterKey = key;
        this.displayName = Fighter.displayNames[key] || Fighter.formatDisplayName(key);
        
        this.homeX = x;
        this.homeY = y;
        this.maxHp = 100;
        this.hp = 100;

        // --- RUNE ECONOMY SYSTEM ---
        this.bcBalance = 0;
        this.runes = ['potion', 'shield', 'thunder'];
        this.potionUsed = false;
        this.shieldActive = false;

        // Sprite uses the 0th frame texture so it doesn't flash a missing texture square
        this.sprite = scene.add.sprite(0, 0, key + '_stand_0');
        this.sprite.setOrigin(0.5, 1);
        
        // floatrobo is drawn facing LEFT natively.
        // The others are drawn facing RIGHT natively.
        if (key === 'floatrobo') {
            this.sprite.setFlipX(isPlayer1);
        } else {
            this.sprite.setFlipX(!isPlayer1);
        }
        
        // Scale based on what mk.js did (scale 0.5 for desktop, 0.65 for mobile)
        const isMobile = window.innerWidth <= 768;
        let baseScale = isMobile ? 1.10 : 0.80;
        if (key === 'furyman') {
            baseScale = isMobile ? 0.25 : 0.20;
        }
        this.sprite.setScale(baseScale);

        const shadowW = Phaser.Math.Clamp(this.sprite.displayWidth * 0.46, isMobile ? 116 : 76, isMobile ? 190 : 150);
        const shadowH = isMobile ? 28 : 22;

        // Restore the ground shadow
        this.groundShadow = scene.add.ellipse(0, -3, shadowW, shadowH, 0x000000, 0.32);
        this.groundShadowCore = scene.add.ellipse(0, -3, shadowW * 0.58, shadowH * 0.45, 0x000000, 0.22);

        // Per-fighter aura color
        let auraColorOuter = 0xff6600; // default: gold-orange outer ring
        let auraColorInner = 0xffee00; // default: bright yellow inner ring
        if (key === 'floatrobo') {
            auraColorOuter = 0x0088ff; // blue outer
            auraColorInner = 0x00e5ff; // cyan inner
        } else if (key === 'char04') {
            auraColorOuter = 0xcc0055; // deep magenta outer
            auraColorInner = 0xff2288; // bright pink inner
        }

        // Animated Burning Aura — three layered ellipses that pulse and shift
        const aW = shadowW * 1.05, aH = shadowH * 1.6;
        this.auraOuter = scene.add.ellipse(0, -4, aW,       aH,       auraColorOuter, 0.0);
        this.auraRing  = scene.add.ellipse(0, -4, aW * 0.8, aH * 0.8, auraColorInner, 0.0);
        this.auraCore  = scene.add.ellipse(0, -4, aW * 0.5, aH * 0.5, 0xffffff,       0.0);

        this.auraOuter.setBlendMode(Phaser.BlendModes.ADD);
        this.auraRing.setBlendMode(Phaser.BlendModes.ADD);
        this.auraCore.setBlendMode(Phaser.BlendModes.ADD);

        // Add all to container — aura BELOW shadow, shadow BELOW sprite
        this.add([this.auraOuter, this.auraRing, this.auraCore, this.groundShadow, this.groundShadowCore, this.sprite]);
        this.createNameplate();
        scene.add.existing(this);
        this.setDepth(4);

        // Wait for BattleScene to create anims, then play
        this.sprite.play(key + '_stand_anim');
        
        this.state = 'idle';
        this.startHover();
    }

    static formatDisplayName(key) {
        return String(key || '')
            .replace(/[-_]+/g, ' ')
            .replace(/\b\w/g, (ch) => ch.toUpperCase());
    }

    createNameplate() {
        const isMobile = window.innerWidth <= 768;
        this.nameplateWidth = isMobile ? 216 : 184;
        this.nameplateHeight = 31;
        this.nameplateGap = isMobile ? 18 : 14;
        this.nameplateScale = isMobile ? 0.56 : 0.48;

        const visibleTopPad = Fighter.visibleTopPadding[this.fighterKey] || 0;
        this.nameplateBaseY = -this.sprite.displayHeight + (visibleTopPad * this.sprite.scaleY) - this.nameplateGap;

        this.nameplate = this.scene.add.container(0, this.nameplateBaseY);
        this.nameplateBg = this.scene.add.graphics();
        this.runeBadge = this.scene.add.image(0, 0, 'bantah_rune_one');
        this.runeBadgeSize = isMobile ? 34 : 30;
        this.runeBadge.setDisplaySize(this.runeBadgeSize, this.runeBadgeSize);
        this.hpImage = this.scene.add.image(0, 0, 'hp_seg_6');
        this.hpImage.setOrigin(0, 0.5);
        this.hpImage.setScale(this.nameplateScale);
        this.nameText = this.scene.add.text(0, -8, this.displayName.toUpperCase(), {
            fontFamily: '"Inter", sans-serif',
            fontSize: isMobile ? '13px' : '11px',
            fontWeight: '900',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        });
        this.nameText.setOrigin(0, 0.5);

        this.hpText = this.scene.add.text(0, -8, `${this.hp}`, {
            fontFamily: '"Inter", sans-serif',
            fontSize: isMobile ? '13px' : '11px',
            fontWeight: '900',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        });
        this.hpText.setOrigin(1, 0.5);

        this.nameplate.add([this.nameplateBg, this.runeBadge, this.nameText, this.hpText, this.hpImage]);
        this.add(this.nameplate);
        this.updateNameplate();
    }

    fitNameText() {
        const maxNameWidth = this.nameplateWidth - 64;
        this.nameText.setScale(1);
        if (this.nameText.width > maxNameWidth) {
            this.nameText.setScale(Math.max(0.72, maxNameWidth / this.nameText.width));
        }
    }

    static hpToSegTexture(pct) {
        if (pct > 83) return 'hp_seg_6';
        if (pct > 66) return 'hp_seg_7';
        if (pct > 50) return 'hp_seg_8';
        if (pct > 33) return 'hp_seg_9';
        return 'hp_seg_10';
    }

    updateNameplate() {
        if (!this.nameplateBg || !this.hpImage) return;

        const isMobile = window.innerWidth <= 768;
        const w = this.nameplateWidth;
        const h = this.nameplateHeight;
        const left = -w / 2;
        const top = -h / 2;
        const iconX = left + (isMobile ? 17 : 15);
        const barX = left + (isMobile ? 36 : 32);
        const barY = 7;
        const barW = 316 * this.nameplateScale;
        const barH = 30 * this.nameplateScale;
        const hpPct = Phaser.Math.Clamp((this.hp / this.maxHp) * 100, 0, 100);

        this.nameplateBg.clear();
        this.nameplateBg.fillStyle(0x000000, 0.54);
        this.nameplateBg.fillRoundedRect(barX - 1, barY - (barH / 2) - 1, barW + 2, barH + 2, 3);
        this.nameplateBg.lineStyle(1, 0x000000, 0.72);
        this.nameplateBg.strokeRoundedRect(barX - 0.5, barY - (barH / 2) - 0.5, barW + 1, barH + 1, 3);

        this.runeBadge.setPosition(iconX, 2);
        this.hpImage.setTexture(Fighter.hpToSegTexture(hpPct));
        this.hpImage.setPosition(barX, barY);
        this.hpImage.setScale(this.nameplateScale);

        this.nameText.setText(this.displayName.toUpperCase());
        this.nameText.setPosition(barX, -8);
        this.fitNameText();

        this.hpText.setText(`${Math.round(this.hp)}`);
        this.hpText.setPosition(left + w - 7, -8);
    }
    
    startHover() {
        // Vertical bob: ±12px, 1.2s cycle (scaled up for HD)
        this.hoverTween = this.scene.tweens.add({
            targets: this.sprite,
            y: -12, 
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        if (this.nameplate) {
            this.nameplateTween = this.scene.tweens.add({
                targets: this.nameplate,
                y: this.nameplateBaseY - 12,
                duration: 600,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
        
        // Horizontal drift: ±4px
        this.driftTween = this.scene.tweens.add({
            targets: this.sprite,
            x: 4,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.startAura();
    }

    startAura() {
        if (!this.auraOuter) return;

        // Outer ring: slow breathe
        this.scene.tweens.add({
            targets: this.auraOuter,
            alpha: { from: 0.55, to: 0.25 },
            scaleX: { from: 1.0, to: 1.08 },
            scaleY: { from: 1.0, to: 1.12 },
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Inner ring: faster pulse, offset phase
        this.scene.tweens.add({
            targets: this.auraRing,
            alpha: { from: 0.7, to: 0.35 },
            scaleX: { from: 1.0, to: 1.12 },
            scaleY: { from: 1.0, to: 1.18 },
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: 150
        });

        // Core: fast bright flicker
        this.scene.tweens.add({
            targets: this.auraCore,
            alpha: { from: 0.65, to: 0.1 },
            scaleX: { from: 1.0, to: 1.2 },
            scaleY: { from: 1.0, to: 1.3 },
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Quad.easeOut',
            delay: 75
        });
    }
    
    stopHover() {
        if (this.hoverTween) this.hoverTween.pause();
        if (this.driftTween) this.driftTween.pause();
        if (this.nameplateTween) this.nameplateTween.pause();
    }
    
    resumeHover() {
        if (this.hoverTween) this.hoverTween.resume();
        if (this.driftTween) this.driftTween.resume();
        if (this.nameplateTween) this.nameplateTween.resume();
    }
    
    attack(opponent, onHitCallback, onCompleteCallback) {
        if (this.state !== 'idle') return;
        this.state = 'attacking';
        this.stopHover();
        if (this.scene.playSfx) {
            this.scene.playSfx('sfx_smoke_puff', { volume: 0.38, detune: this.isPlayer1 ? 40 : -40 });
        }
        
        // Calculate dash distance (20-30% of gap)
        const gap = opponent.homeX - this.homeX;
        const dashDistance = gap * 0.3; // 30% of the gap
        
        // 1. Dash out
        this.scene.tweens.add({
            targets: this,
            x: this.homeX + dashDistance,
            duration: 150,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                // 2. Play attack animation
                if (this.scene.anims.exists(this.fighterKey + '_attack_anim')) {
                    this.sprite.play(this.fighterKey + '_attack_anim');
                }
                
                // Call hit halfway through animation
                this.scene.time.delayedCall(150, () => {
                    if (onHitCallback) onHitCallback();
                    
                    // 3. Recover and Return
                    this.scene.time.delayedCall(150, () => {
                        this.sprite.play(this.fighterKey + '_stand_anim');
                        
                        this.scene.tweens.add({
                            targets: this,
                            x: this.homeX,
                            duration: 150,
                            ease: 'Cubic.easeIn',
                            onComplete: () => {
                                this.state = 'idle';
                                this.resumeHover();
                                if (onCompleteCallback) onCompleteCallback();
                            }
                        });
                    });
                });
            }
        });
    }
    
    shootFireball(opponent, damage, onHitCallback, onCompleteCallback) {
        if (this.state !== 'idle') return;
        this.state = 'attacking';
        this.stopHover();
        
        // 1. Play attack animation in place
        if (this.scene.anims.exists(this.fighterKey + '_attack_anim')) {
            this.sprite.play(this.fighterKey + '_attack_anim');
        }
        
        // 2. Use the new Warlock Fireball — scale based on damage tier
        let spellKey = 'fx_newfireball_1';
        let spellAnim = 'fx_newfireball_anim';
        let spellScale;
        if (damage >= 13) {
            spellScale = 0.50; // Heavy — big blazing ball
            if (this.scene.playSfx) this.scene.playSfx('sfx_magic_cast', { volume: 0.72, detune: -160 });
        } else if (damage >= 10) {
            spellScale = 0.40; // Medium
            if (this.scene.playSfx) this.scene.playSfx('sfx_magic_cast', { volume: 0.58, detune: 0 });
        } else {
            spellScale = 0.32; // Light — smaller ball
            if (this.scene.playSfx) this.scene.playSfx('sfx_smoke_puff', { volume: 0.42, detune: 240 });
        }

        // Light up the Fire rune on the attacker's HUD
        const runeId = this.isPlayer1 ? 'runes-p1' : 'runes-p2';
        if (window.triggerFireRune) window.triggerFireRune(runeId);
        
        console.log('Casting magic:', spellKey, 'Damage:', damage, 'Scale:', spellScale);
        
        // 3. Spawn the projectile slightly in front of the attacker
        const spawnX = this.isPlayer1 ? this.homeX + 80 : this.homeX - 80;
        const spawnY = this.homeY - 70;
        
        const proj = this.scene.add.sprite(spawnX, spawnY, spellKey);
        proj.play(spellAnim);
        proj.setScale(spellScale);
        
        // 4. ORIENTATION FIX:
        //    The magic assets natively face RIGHT (arrow points right).
        //    - P1 is on the left → fires RIGHT → no flip needed.
        //    - P2 is on the right → fires LEFT → flip horizontally.
        proj.setFlipX(!this.isPlayer1);
        
        // 5. Tween towards the opponent — fast, 250ms
        this.scene.tweens.add({
            targets: proj,
            x: opponent.homeX,
            duration: 250,
            ease: 'Linear',
            onComplete: () => {
                proj.destroy();
                if (onHitCallback) onHitCallback('fire');
                
                this.scene.time.delayedCall(150, () => {
                    this.sprite.play(this.fighterKey + '_stand_anim');
                    this.state = 'idle';
                    this.resumeHover();
                    if (onCompleteCallback) onCompleteCallback();
                });
            }
        });
    }

    activateShield() {
        if (this.state !== 'idle' || this.shieldActive) return;
        
        this.shieldActive = true;
        this.scene.playSfx('sfx_magic_cast', { volume: 0.6, detune: 200 });
        
        // Visual Shield Bubble
        const shieldVfx = this.scene.add.sprite(0, -(this.sprite.displayHeight * 0.45), 'fx_explosion6_8');
        const targetSize = Math.max(this.sprite.displayWidth, this.sprite.displayHeight) * 2.2;
        const scale = targetSize / shieldVfx.width;
        shieldVfx.setScale(scale);
        shieldVfx.setAlpha(0.7);
        shieldVfx.setTint(0xffd700); // Gold shield
        shieldVfx.setBlendMode(Phaser.BlendModes.ADD);
        this.add(shieldVfx);

        // Pulse effect
        this.scene.tweens.add({
            targets: shieldVfx,
            scale: scale * 1.05,
            alpha: 0.4,
            duration: 500,
            yoyo: true,
            repeat: -1
        });

        // Timeout to remove shield after 5 seconds if not hit
        this.scene.time.delayedCall(5000, () => {
            if (this.shieldActive) {
                this.shieldActive = false;
                shieldVfx.destroy();
            }
        });

        // Also clean it up if it gets used up (handled in takeHit)
        // Let's hook a check into the update loop or just rely on takeHit destroying it.
        // For simplicity, we can just let it fade or destroy it when takeHit resets shieldActive.
        // Wait, takeHit doesn't destroy the VFX! I need to store the VFX reference on the fighter.
        this.shieldVfx = shieldVfx;

        // Light up the shield rune
        const runeId = this.isPlayer1 ? 'runes-p1' : 'runes-p2';
        if (window.triggerShieldRune) window.triggerShieldRune(runeId);
    }

    attackThunderStraight(opponent, damage, onHitCallback) {
        if (this.state !== 'idle') return;
        this.state = 'attacking';
        this.stopHover();

        this.sprite.play(this.fighterKey + '_attack_anim');
        this.scene.playSfx('sfx_magic_cast', { volume: 0.6 });

        // Light up the thunder rune on the attacker's HUD
        const runeId = this.isPlayer1 ? 'runes-p1' : 'runes-p2';
        if (window.triggerThunderRune) window.triggerThunderRune(runeId);

        const spawnX = this.isPlayer1 ? this.homeX + 50 : this.homeX - 50;
        const spawnY = this.homeY - 70;

        const proj = this.scene.add.sprite(spawnX, spawnY, 'fx_thunder_straight_1');
        proj.play('fx_thunder_straight_anim');
        
        const isMobile = window.innerWidth <= 768;
        proj.setScale(isMobile ? 1.5 : 2.0);
        proj.setFlipX(!this.isPlayer1);
        
        this.scene.tweens.add({
            targets: proj,
            x: opponent.homeX,
            duration: 250,
            ease: 'Power2',
            onComplete: () => {
                proj.destroy();
                if (onHitCallback) onHitCallback('thunder');
                this.scene.cameras.main.shake(300, 0.03); // Massive shake
                
                this.scene.time.delayedCall(150, () => {
                    this.sprite.play(this.fighterKey + '_stand_anim');
                    this.state = 'idle';
                    this.resumeHover();
                });
            }
        });
    }

    attackThunderTop(opponent, damage, onHitCallback) {
        if (this.state !== 'idle') return;
        this.state = 'attacking';
        this.stopHover();

        this.scene.playSfx('sfx_magic_cast', { volume: 0.7 });

        // Light up the thunder rune on the attacker's HUD
        const runeId = this.isPlayer1 ? 'runes-p1' : 'runes-p2';
        if (window.triggerThunderRune) window.triggerThunderRune(runeId);

        // Float up high
        this.scene.tweens.add({
            targets: this,
            y: this.y - 180,
            duration: 300,
            ease: 'Sine.easeOut',
            onComplete: () => {
                this.sprite.play(this.fighterKey + '_attack_anim');

                // Summon thunder on top of opponent
                const proj = this.scene.add.sprite(opponent.homeX, opponent.homeY - 100, 'fx_thunder_top_1');
                proj.play('fx_thunder_top_anim');
                const isMobile = window.innerWidth <= 768;
                proj.setScale(isMobile ? 2.0 : 2.5);

                proj.once('animationcomplete', () => {
                    proj.destroy();
                    if (onHitCallback) onHitCallback();
                    this.scene.cameras.main.shake(400, 0.04); // Extra massive shake

                    // Float back down
                    this.scene.tweens.add({
                        targets: this,
                        y: this.homeY,
                        duration: 300,
                        ease: 'Sine.easeIn',
                        onComplete: () => {
                            this.sprite.play(this.fighterKey + '_stand_anim');
                            this.state = 'idle';
                            this.resumeHover();
                        }
                    });
                });
            }
        });
    }
    showFloatText(text, color) {
        const floatText = this.scene.add.text(this.x, this.y - 100, text, {
            fontFamily: 'Inter',
            fontSize: '24px',
            fontStyle: 'bold',
            color: color,
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5, 0.5);

        this.scene.tweens.add({
            targets: floatText,
            y: floatText.y - 60,
            alpha: 0,
            duration: 1200,
            ease: 'Power2',
            onComplete: () => floatText.destroy()
        });
    }

    takeHit(damage) {
        // --- 🛡️ SHIELD RUNE MECHANIC ---
        if (this.shieldActive) {
            this.showFloatText('BLOCKED', '#ffcc00');
            this.scene.playSfx('sfx_magic_cast', { volume: 0.5, detune: 400 });
            // Deactivate shield after absorbing one hit
            this.shieldActive = false;
            if (this.shieldVfx) {
                this.shieldVfx.destroy();
                this.shieldVfx = null;
            }
            return;
        }

        this.hp = Math.max(0, this.hp - damage);
        this.updateNameplate();
        
        // --- 🧪 BANTAH POTION RUNE MECHANIC ---
        if (this.hp > 0 && this.hp < 35 && this.runes.includes('potion') && !this.potionUsed) {
            this.potionUsed = true;
            this.hp = Math.min(100, this.hp + 30);
            this.updateNameplate();
            
            // Visual feedback
            this.showFloatText('+30 HP', '#44ff66');
            this.sprite.setTintFill(0x44ff66);
            this.scene.time.delayedCall(200, () => this.sprite.clearTint());
            this.scene.playSfx('sfx_magic_cast', { volume: 0.6, detune: 800 });
            
            // Light up Potion rune on HUD
            const runeId = this.isPlayer1 ? 'runes-p1' : 'runes-p2';
            if (window.triggerPotionRune) window.triggerPotionRune(runeId);
        }

        // Recoil 16-32px (HD)
        const recoil = this.isPlayer1 ? -24 : 24;
        
        if (this.state !== 'dead') {
            this.state = 'hit';
            this.stopHover();
            if (this.scene.anims.exists(this.fighterKey + '_hit_anim')) {
                this.sprite.play(this.fighterKey + '_hit_anim');
            }
        }
        
        this.scene.tweens.add({
            targets: this,
            x: this.x + recoil,
            duration: 200, // slower hit recoil so the glitch state is visible
            yoyo: true,
            ease: 'Quad.easeOut',
            onComplete: () => {
                if (this.state !== 'dead') {
                    this.state = 'idle';
                    this.resumeHover();
                    this.sprite.play(this.fighterKey + '_stand_anim');
                }
            }
        });
        
        // Flash white (tint)
        this.sprite.setTintFill(0xffffff);
        this.scene.time.delayedCall(100, () => {
            this.sprite.clearTint();
        });
    }

    blockHit(damage) {
        this.hp = Math.max(0, this.hp - damage);
        this.updateNameplate();

        if (this.state !== 'dead') {
            this.state = 'blocking';
            this.stopHover();
            if (this.scene.anims.exists(this.fighterKey + '_block_anim')) {
                this.sprite.play(this.fighterKey + '_block_anim');
            }
            // Add Explosion 6 Frame 8 as a magical block shield bubble
            const shieldVfx = this.scene.add.sprite(0, -(this.sprite.displayHeight * 0.45), 'fx_explosion6_8');
            
            // Calculate scale so the shield is a big ball covering the fighter
            const targetSize = Math.max(this.sprite.displayWidth, this.sprite.displayHeight) * 2.2;
            const scale = targetSize / shieldVfx.width;
            shieldVfx.setScale(scale);
            
            shieldVfx.setAlpha(0.6);
            shieldVfx.setTint(0x00d4ff); // Tint it cyan/blue so it doesn't look like a standard fire explosion
            shieldVfx.setBlendMode(Phaser.BlendModes.ADD);
            
            this.add(shieldVfx); // Add to the Fighter container so it shakes with the fighter
            
            // Slower pulse effect so it lasts longer
            this.scene.tweens.add({
                targets: shieldVfx,
                scale: scale * 1.05,
                alpha: 0.85,
                duration: 220,
                yoyo: true,
                repeat: 0,
                onComplete: () => {
                    // Slower fade out
                    this.scene.tweens.add({
                        targets: shieldVfx,
                        alpha: 0,
                        duration: 200,
                        onComplete: () => shieldVfx.destroy()
                    });
                }
            });
        }

        const recoil = this.isPlayer1 ? -10 : 10;
        
        this.scene.tweens.add({
            targets: this,
            x: this.x + recoil,
            duration: 180, // match to the longer shield effect
            yoyo: true,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                if (this.state !== 'dead') {
                    this.state = 'idle';
                    this.resumeHover();
                    this.sprite.play(this.fighterKey + '_stand_anim');
                }
            }
        });
    }
    
    die() {
        this.stopHover();
        this.state = 'dead';
        if (this.scene.playSfx) {
            this.scene.playSfx('sfx_hit_heavy', { volume: 0.72, detune: -220 });
            this.scene.time.delayedCall(120, () => {
                this.scene.playSfx('sfx_smoke_puff_big', { volume: 0.66, detune: -120 });
            });
        }
        if (this.nameplate) {
            this.scene.tweens.add({
                targets: this.nameplate,
                alpha: 0,
                duration: 250,
                ease: 'Linear'
            });
        }
        
        // Stop the current animation
        this.sprite.stop();
        
        // Ensure the death sprite isn't flipped (or maybe it should be based on direction?)
        // The death sprite is likely drawn facing one direction, let's reset it to false
        this.sprite.setFlipX(false);
        
        // Play the death animation
        this.sprite.play('fx_death_anim');
        
        // Optional: fade out the body after the death animation finishes
        this.scene.time.delayedCall(2000, () => {
            this.scene.tweens.add({
                targets: this.sprite,
                alpha: 0,
                duration: 1000,
                ease: 'Linear'
            });
        });
    }
}

Fighter.displayNames = {
    char04: 'Robot V1',
    crimsonbot: 'CrimsonBot',
    floatrobo: 'FloatRobo',
    robopepe: 'Robo Pepe',
    silverwarrior: 'Silver Warrior',
    toxicbot: 'ToxicBot',
    voidbot: 'VoidBot',
    pepe: 'Pepe',
    kano: 'Kano',
    subzero: 'Sub-Zero',
    flokiwarrior: 'Floki Warrior',
    furyman: 'Fury Man'
};

Fighter.visibleTopPadding = {
    floatrobo: 108,
    robopepe: 126,
    silverwarrior: 115,
    pepe: 58,
    kano: 1,
    subzero: 2,
    furyman: 15
};
