const { Jimp } = require('jimp');
const fs = require('fs');
const path = require('path');

const fighters = [
    { name: 'crimsonbot', file: 'temp/crimsonbot_sheet.png.png' },
    { name: 'floatrobo', file: 'temp/floatrobo_sheet.png.png' }
];

// The sequence of frames for a blinking idle animation
// 0: OPEN, 1: HALF, 2: BLINK, 3: SQUINT, 4: ANGRY, 5: DEAD
const idleSequence = [0, 0, 0, 0, 1, 2, 1, 0, 0, 0];

async function processSprites() {
    console.log('Starting sprite slicing...');
    
    for (const fighter of fighters) {
        const sheetPath = path.join(__dirname, fighter.file);
        
        if (!fs.existsSync(sheetPath)) {
            console.log(`[WARN] Could not find ${fighter.file}. Please make sure it is in this folder.`);
            continue;
        }

        console.log(`Processing ${fighter.name}...`);
        
        try {
            const image = await Jimp.read(sheetPath);
            const totalFrames = 6;
            const frameWidth = image.bitmap.width / totalFrames;
            
            // We calculated that the sprite itself sits between Y=322 and Y=607.
            // The text labels are below Y=633.
            // So we'll crop precisely the sprite area: Y=300, Height=310.
            const spriteY = 300;
            const spriteHeight = 310;
            
            console.log(`  Cropping out labels...`);
            
            // Create output directories
            const rightIdleDir = path.join(__dirname, fighter.name, 'right', 'idle');
            const leftIdleDir = path.join(__dirname, fighter.name, 'left', 'idle');
            
            fs.mkdirSync(rightIdleDir, { recursive: true });
            fs.mkdirSync(leftIdleDir, { recursive: true });
            
            // Extract the 6 base frames first to keep in memory
            const baseFrames = [];
            for (let i = 0; i < totalFrames; i++) {
                const frame = image.clone().crop({ x: i * frameWidth, y: spriteY, w: frameWidth, h: spriteHeight });
                baseFrames.push(frame);
            }
            
            // Arrange into idle sequence
            for (let i = 0; i < idleSequence.length; i++) {
                const baseIndex = idleSequence[i];
                const frameImg = baseFrames[baseIndex];
                
                // Save right facing
                await frameImg.write(path.join(rightIdleDir, `${i}.png`));
                
                // Save left facing (flipped horizontally)
                const leftFrame = frameImg.clone().flip({ horizontal: true, vertical: false });
                await leftFrame.write(path.join(leftIdleDir, `${i}.png`));
            }
            
            console.log(`  Successfully generated label-free idle sequence for ${fighter.name}!`);
            
        } catch (error) {
            console.error(`  Error processing ${fighter.name}:`, error.message);
        }
    }
    console.log('Done!');
}

processSprites();
