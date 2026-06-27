const CHAR_META = {
    "char04": {"stand": 18, "attack": 31}, 
    "crimsonbot": {"stand": 18, "attack": 31}, 
    "floatrobo": {"stand": 12, "attack": 3}, 
    "flokiwarrior": {"stand": 9, "attack": 8}, 
    "kano": {"stand": 9, "attack": 8}, 
    "pepe": {"stand": 9, "attack": 8}, 
    "robopepe": {"stand": 12, "attack": 3}, 
    "silverwarrior": {"stand": 12, "attack": 3}, 
    "subzero": {"stand": 10, "attack": 8}, 
    "toxicbot": {"stand": 18, "attack": 31}, 
    "voidbot": {"stand": 18, "attack": 31}
};

const config = {
    type: Phaser.AUTO,
    parent: 'arena',
    width: window.innerWidth <= 768 ? 800 : 1200,
    height: window.innerWidth <= 768 ? 1600 : 800,
    transparent: true,
    scale: {
        mode: Phaser.Scale.NONE
    },
    scene: [BattleScene]
};

let phaserGame = null;

// This will be called from index.html to start the game
window.startPhaserMatch = function(p1Key, p2Key) {
    if (phaserGame) {
        phaserGame.destroy(true);
    }
    window.BATTLE_P1 = p1Key;
    window.BATTLE_P2 = p2Key;
    phaserGame = new Phaser.Game(config);
};
