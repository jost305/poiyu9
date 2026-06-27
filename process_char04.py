import os
import glob
from PIL import Image

def process_char04():
    base_src = "c:/Users/olusegun/Downloads/zip-repl/zip-repl/Robots V1/PNG/Char04"
    death_src = "c:/Users/olusegun/Downloads/zip-repl/zip-repl/Robots V1/PNG/DeathFx"
    base_dest = "c:/Users/olusegun/Downloads/zip-repl/zip-repl/game/images/fighters/char04"

    TARGET_HEIGHT = 160

    print("Finding sources...")
    src_anims = {
        'attack': sorted(glob.glob(os.path.join(base_src, 'Attack', '*.png'))),
        'idle': sorted(glob.glob(os.path.join(base_src, 'Idle', '*.png'))),
        'jump': sorted(glob.glob(os.path.join(base_src, 'Jump', '*.png'))),
        'walk': sorted(glob.glob(os.path.join(base_src, 'Walk', '*.png'))),
        'death': sorted(glob.glob(os.path.join(death_src, '*.png')), key=lambda x: int(os.path.splitext(os.path.basename(x))[0].split('_')[-1])),
    }

    src_anims['walk_backward'] = src_anims['walk'][::-1]
    
    for k, v in src_anims.items():
        print(f"Found {len(v)} frames for {k}")
    
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

    for direction in ['left', 'right']:
        for move, src_key in mapping.items():
            print(f"Processing {direction}/{move} using {src_key}...")
            dest_dir = os.path.join(base_dest, direction, move)
            os.makedirs(dest_dir, exist_ok=True)
            
            for f in glob.glob(os.path.join(dest_dir, '*.png')):
                try:
                    os.remove(f)
                except Exception:
                    pass

            frames = src_anims[src_key]
            for i, frame_path in enumerate(frames):
                img = Image.open(frame_path)
                
                bbox = img.getbbox()
                if bbox:
                    img = img.crop(bbox)

                aspect_ratio = img.width / img.height
                new_width = int(TARGET_HEIGHT * aspect_ratio)
                img = img.resize((new_width, TARGET_HEIGHT), Image.LANCZOS)
                
                if move == 'knock-down':
                    img = img.rotate(-90, expand=True)
                
                if direction == 'left':
                    img = img.transpose(Image.FLIP_LEFT_RIGHT)
                
                dest_path = os.path.join(dest_dir, f"{i}.png")
                img.save(dest_path)

if __name__ == '__main__':
    process_char04()
    print("Done processing char04 sprites.")
