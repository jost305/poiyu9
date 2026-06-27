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
        this.sprite.setScale(isMobile ? 1.10 : 0.80);

        const shadowW = Phaser.Math.Clamp(this.sprite.displayWidth * 0.46, isMobile ? 116 : 76, isMobile ? 190 : 150);
        const shadowH = isMobile ? 28 : 22;
        this.groundShadow = scene.add.ellipse(0, -3, shadowW, shadowH, 0x000000, 0.28);
        this.groundShadowCore = scene.add.ellipse(0, -3, shadowW * 0.58, shadowH * 0.45, 0x000000, 0.22);

        // Add to container
        this.add([this.groundShadow, this.groundShadowCore, this.sprite]);
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
        
        // 2. Choose the spell sprite based on damage tier
        //   Light (5–9)  → Fire Arrow  (tight, fast, small)
        //   Medium (10–12) → Fire Ball (rounder, bigger)
        //   Heavy (13+)  → Fire Spell  (wide, blazing)
        let spellKey, spellAnim, spellScale;
        if (damage >= 13) {
            spellKey   = 'fx_firespell_1';
            spellAnim  = 'fx_firespell_anim';
            spellScale = 0.30; // doubled for HD
            if (this.scene.playSfx) this.scene.playSfx('sfx_magic_cast', { volume: 0.72, detune: -160 });
        } else if (damage >= 10) {
            spellKey   = 'fx_fireball_1';
            spellAnim  = 'fx_fireball_anim';
            spellScale = 0.26; // doubled for HD
            if (this.scene.playSfx) this.scene.playSfx('sfx_magic_cast', { volume: 0.58, detune: 0 });
        } else {
            spellKey   = 'fx_firearrow_1';
            spellAnim  = 'fx_firearrow_anim';
            spellScale = 0.32; // Fire Arrow doubled for HD
            if (this.scene.playSfx) this.scene.playSfx('sfx_smoke_puff', { volume: 0.42, detune: 240 });
        }
        
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
                if (onHitCallback) onHitCallback();
                
                this.scene.time.delayedCall(150, () => {
                    this.sprite.play(this.fighterKey + '_stand_anim');
                    this.state = 'idle';
                    this.resumeHover();
                    if (onCompleteCallback) onCompleteCallback();
                });
            }
        });
    }

    takeHit(damage) {
        this.hp = Math.max(0, this.hp - damage);
        this.updateNameplate();
        
        // Recoil 16-32px (HD)
        const recoil = this.isPlayer1 ? -24 : 24;
        
        this.scene.tweens.add({
            targets: this,
            x: this.x + recoil,
            duration: 60,
            yoyo: true,
            ease: 'Quad.easeOut'
        });
        
        // Flash white (tint)
        this.sprite.setTintFill(0xffffff);
        this.scene.time.delayedCall(100, () => {
            this.sprite.clearTint();
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
    flokiwarrior: 'Floki Warrior'
};

Fighter.visibleTopPadding = {
    floatrobo: 108,
    robopepe: 126,
    silverwarrior: 115,
    pepe: 58,
    kano: 1,
    subzero: 2
};
