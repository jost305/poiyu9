import os
import glob
from PIL import Image

def hue_shift(img, target_hue_offset):
    # Convert to HSV, shift hue, convert back
    img = img.convert('RGBA')
    hsv = img.convert('HSV')
    h, s, v = hsv.split()
    
    # shift hue by target_hue_offset (0-255)
    h = h.point(lambda p: (p + target_hue_offset) % 256)
    
    hsv = Image.merge('HSV', (h, s, v))
    rgb = hsv.convert('RGB')
    
    # restore alpha
    r, g, b = rgb.split()
    _, _, _, a = img.split()
    return Image.merge('RGBA', (r, g, b, a))

def create_clone(fighter_name, hue_offset):
    print(f"=========================================")
    print(f"Building {fighter_name} with hue {hue_offset}...")
    base_src = "c:/Users/olusegun/Downloads/zip-repl/zip-repl/Robots V1/PNG/Char04"
    death_src = "c:/Users/olusegun/Downloads/zip-repl/zip-repl/Robots V1/PNG/DeathFx"
    base_dest = f"c:/Users/olusegun/Downloads/zip-repl/zip-repl/game/images/fighters/{fighter_name}"

    TARGET_HEIGHT = 160

    src_anims = {
        'attack': sorted(glob.glob(os.path.join(base_src, 'Attack', '*.png'))),
        'idle': sorted(glob.glob(os.path.join(base_src, 'Idle', '*.png'))),
        'jump': sorted(glob.glob(os.path.join(base_src, 'Jump', '*.png'))),
        'walk': sorted(glob.glob(os.path.join(base_src, 'Walk', '*.png'))),
        'death': sorted(glob.glob(os.path.join(death_src, '*.png')), key=lambda x: int(os.path.splitext(os.path.basename(x))[0].split('_')[-1])),
    }

    src_anims['walk_backward'] = src_anims['walk'][::-1]
    
    mapping = {
        'attractive-stand-up': 'idle',
        'backward-jump': 'jump',
        'backward-jump-kick': 'attack',
        'backward-jump-punch': 'attack',
        'blocking': 'idle',
        'endure': 'idle',
        'fall': 'death',
        'forward-jump': 'jump',
        'forward-jump-kick': 'attack',
        'forward-jump-punch': 'attack',
        'high-kick': 'attack',
        'high-punch': 'attack',
        'jumping': 'jump',
        'knock-down': 'idle',
        'low-kick': 'attack',
        'low-punch': 'attack',
        'spin-kick': 'attack',
        'squat-endure': 'idle',
        'squat-high-kick': 'attack',
        'squat-low-kick': 'attack',
        'squat-low-punch': 'attack',
        'squating': 'idle',
        'stand': 'idle',
        'stand-up': 'idle',
        'uppercut': 'attack',
        'walking': 'walk',
        'walking-backward': 'walk_backward',
        'win': 'idle'
    }

    # Generate Portrait first
    os.makedirs(base_dest, exist_ok=True)
    portrait_src = os.path.join(base_src, 'Idle', 'Idle_000.png')
    if os.path.exists(portrait_src):
        p_img = Image.open(portrait_src)
        p_img = hue_shift(p_img, hue_offset)
        bbox = p_img.getbbox()
        if bbox: p_img = p_img.crop(bbox)
        p_img.thumbnail((200, 200), Image.Resampling.LANCZOS)
        p_img.save(os.path.join(base_dest, 'portrait.png'))

    for direction in ['left', 'right']:
        for move, src_key in mapping.items():
            dest_dir = os.path.join(base_dest, direction, move)
            os.makedirs(dest_dir, exist_ok=True)
            
            for f in glob.glob(os.path.join(dest_dir, '*.png')):
                try: os.remove(f)
                except: pass

            frames = src_anims[src_key]
            for i, frame_path in enumerate(frames):
                img = Image.open(frame_path)
                
                # Apply hue shift BEFORE processing, EXCEPT for death fx
                if src_key != 'death':
                    img = hue_shift(img, hue_offset)
                
                bbox = img.getbbox()
                if bbox:
                    img = img.crop(bbox)

                aspect_ratio = img.width / img.height
                new_width = int(TARGET_HEIGHT * aspect_ratio)
                img = img.resize((new_width, TARGET_HEIGHT), Image.Resampling.LANCZOS)
                
                if move == 'knock-down':
                    img = img.rotate(-90, expand=True)
                
                if direction == 'left':
                    img = img.transpose(Image.FLIP_LEFT_RIGHT)
                
                dest_path = os.path.join(dest_dir, f"{i}.png")
                img.save(dest_path)

if __name__ == '__main__':
    clones = {
        'crimsonbot': 235, # shifts orange to deep red
        'toxicbot': 60,    # shifts orange to bright green
        'voidbot': 170     # shifts orange to dark purple/blue
    }
    
    for name, offset in clones.items():
        create_clone(name, offset)
    
    print("Done generating all clones!")
