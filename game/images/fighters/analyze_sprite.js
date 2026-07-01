const { Jimp, intToRGBA } = require('jimp');
const path = require('path');

async function analyze() {
    const filePath = path.join(__dirname, 'temp', 'crimsonbot_sheet.png.png');
    const img = await Jimp.read(filePath);
    console.log(`Image size: ${img.bitmap.width}x${img.bitmap.height}`);
    
    // We will scan the first frame (x from 0 to 256)
    // We will look for non-white pixels.
    // Let's assume white is anything > 240, 240, 240
    let minY = img.bitmap.height;
    let maxY = 0;
    
    for (let y = 0; y < img.bitmap.height; y++) {
        let hasColor = false;
        for (let x = 0; x < 256; x++) {
            const hex = img.getPixelColor(x, y);
            const rgba = intToRGBA(hex);
            if (rgba.r < 240 || rgba.g < 240 || rgba.b < 240) {
                // not white
                if (rgba.a > 10) {
                    hasColor = true;
                    break;
                }
            }
        }
        if (hasColor) {
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    }
    
    console.log(`First frame content bounds: Y from ${minY} to ${maxY}`);
    
    // Now let's find the label. The label is probably at the bottom, separated by a gap.
    // Let's find gaps!
    let gaps = [];
    let inGap = false;
    let gapStart = 0;
    
    for (let y = minY; y <= maxY; y++) {
        let hasColor = false;
        for (let x = 0; x < 256; x++) {
            const hex = img.getPixelColor(x, y);
            const rgba = intToRGBA(hex);
            if ((rgba.r < 240 || rgba.g < 240 || rgba.b < 240) && rgba.a > 10) {
                hasColor = true;
                break;
            }
        }
        
        if (!hasColor && !inGap) {
            inGap = true;
            gapStart = y;
        } else if (hasColor && inGap) {
            inGap = false;
            gaps.push({ start: gapStart, end: y - 1, size: y - gapStart });
        }
    }
    
    console.log('Gaps in vertical content:', gaps);
}

analyze().catch(console.error);
