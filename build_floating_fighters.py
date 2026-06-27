import os
import math
import glob
from PIL import Image, ImageEnhance, ImageDraw

def hue_shift(img, target_hue_offset):
    img = img.convert('RGBA')
    hsv = img.convert('HSV')
    h, s, v = hsv.split()
    h = h.point(lambda p: (p + target_hue_offset) % 256)
    hsv = Image.merge('HSV', (h, s, v))
    rgb = hsv.convert('RGB')
    r, g, b = rgb.split()
    _, _, _, a = img.split()
    return Image.merge('RGBA', (r, g, b, a))

def draw_fireball(img, x, y, radius, color):
    draw = ImageDraw.Draw(img, "RGBA")
    r, g, b = color
    for i in range(radius, 0, -2):
        alpha = int(255 * (1 - (i/radius)))
        draw.ellipse([x-i, y-i, x+i, y+i], fill=(r, g, b, alpha))
    draw.ellipse([x-radius//3, y-radius//3, x+radius//3, y+radius//3], fill=(255, 255, 255, 200))
    return img

def draw_smokebomb(img, x, y, radius):
    draw = ImageDraw.Draw(img, "RGBA")
    for dx, dy, r in [(0,0, radius), (-radius//2, -radius//3, int(radius*0.8)), (radius//2, -radius//4, int(radius*0.7)), (0, radius//2, int(radius*0.6))]:
        draw.ellipse([x+dx-r, y+dy-r, x+dx+r, y+dy+r], fill=(80, 80, 80, 180))
    return img

def create_frames(base_img, fighter_name, is_cyan=False, is_silver=False):
    if is_cyan:
        base_img = hue_shift(base_img, 120)
    
    # Scale slightly down to fit canvas, but keep it very high quality
    target_width = 200
    base_img = base_img.resize((target_width, int(target_width * base_img.height / base_img.width)), Image.Resampling.LANCZOS)
    
    moves = {
        'stand': 12, # Slower hover, 12 frames
        'walking': 12,
        'walking-backward': 12,
        'high-punch': 3,
        'low-punch': 3,
        'high-kick': 3,
        'low-kick': 3,
        'block': 1,
        'endure': 3,
        'squat': 1,
        'squating': 1,
        'squat-endure': 3,
        'squat-high-kick': 3,
        'squat-low-kick': 3,
        'squat-low-punch': 3,
        'knock-down': 10,
        'fall': 1,
        'stand-up': 3,
        'attractive-stand-up': 3,
        'uppercut': 4,
        'spin-kick': 4,
        'win': 12,
        'forward-jump': 1,
        'backward-jump': 1,
        'forward-jump-kick': 1,
        'backward-jump-kick': 1,
        'forward-jump-punch': 1,
        'backward-jump-punch': 1,
        'jumping': 1
    }

    base_dir = f'game/images/fighters/{fighter_name}'
    os.makedirs(base_dir, exist_ok=True)
    base_img.save(f'{base_dir}/portrait.png')

    death_src = 'Robots V1/PNG/DeathFx'
    death_frames = sorted(glob.glob(os.path.join(death_src, '*.png')), key=lambda x: int(os.path.splitext(os.path.basename(x))[0].split('_')[-1]))
    death_imgs = [Image.open(f).convert('RGBA') for f in death_frames]
    
    # Update fall frame count to match explosion
    moves['fall'] = len(death_imgs)

    # Body.png natively faces LEFT.
    # MK engine: 'left' dir is player 1 on left side, facing RIGHT.
    # MK engine: 'right' dir is player 2 on right side, facing LEFT.
    
    for orientation in ['left', 'right']:
        # If 'left' dir, we must flip the native left-facing image to face right!
        flip = (orientation == 'left')
        
        for move, count in moves.items():
            move_dir = f'{base_dir}/{orientation}/{move}'
            os.makedirs(move_dir, exist_ok=True)
            
            for i in range(count):
                # Much larger canvas for high quality
                canvas = Image.new('RGBA', (400, 400), (0,0,0,0))
                cx, cy = 200, 200
                img = base_img.copy()
                
                if flip:
                    img = img.transpose(Image.FLIP_LEFT_RIGHT)
                
                dx, dy = 0, 0
                angle = 0
                scale = 1.0
                fireball = None
                smoke = None
                
                # Slowed down sine wave (pi/6 instead of pi/3)
                if move in ['stand', 'walking', 'walking-backward', 'win']:
                    dy = math.sin(i * math.pi / 6) * 15
                    if move == 'win': dy *= 2
                    if move == 'walking': angle = 5 if not flip else -5
                    if move == 'walking-backward': angle = -5 if not flip else 5
                
                elif move in ['high-punch', 'low-punch', 'uppercut']:
                    if i == 0: dx = 0
                    if i == 1: dx = -40 if not flip else 40
                    if i == 2: dx = -10 if not flip else 10
                    
                    if move == 'low-punch': dy = 30
                    if move == 'uppercut': 
                        dy = -40 if i == 1 else 0
                        angle = -30 if not flip else 30
                        
                    if i == 1:
                        fx = cx + dx - 60 if not flip else cx + dx + 60
                        fy = cy + dy
                        color = (0, 200, 255) if is_cyan else (255, 100, 0)
                        fireball = (fx, fy, 40, color)
                        
                elif move in ['high-kick', 'low-kick', 'spin-kick', 'squat-high-kick', 'squat-low-kick']:
                    if i == 1: 
                        dx = -30 if not flip else 30
                        angle = -20 if not flip else 20
                    if move in ['low-kick', 'squat-low-kick']: dy = 30
                    if 'squat' in move: dy += 40
                    
                    if move == 'spin-kick':
                        angle = i * 90 if not flip else -i * 90
                        
                    if i == 1:
                        sx = cx + dx - 60 if not flip else cx + dx + 60
                        sy = cy + dy + 20
                        smoke = (sx, sy, 35)
                        
                elif move == 'block':
                    angle = 15 if not flip else -15
                    img = ImageEnhance.Brightness(img).enhance(0.5)
                    
                elif move in ['endure', 'squat-endure']:
                    dy = 15
                    if 'squat' in move: dy += 40
                    img = ImageEnhance.Color(img).enhance(0)
                    
                elif 'squat' in move:
                    dy = 40
                    
                elif move == 'knock-down':
                    angle = i * 36
                    dy = min(i * 15, 80)
                    
                elif move == 'fall':
                    angle = -90 if not flip else 90
                    dy = 80
                    # After a few frames, hide the body and show explosion
                    if i > 2:
                        img = Image.new('RGBA', img.size, (0,0,0,0)) # Hide body
                    
                elif move in ['stand-up', 'attractive-stand-up']:
                    angle = (3-i) * -30 if not flip else (3-i) * 30
                    dy = (3-i) * 20
                    
                elif 'jump' in move:
                    dy = -60
                    if 'forward' in move: dx = -30 if not flip else 30
                    if 'backward' in move: dx = 30 if not flip else -30
                
                if scale != 1.0 or angle != 0:
                    img = img.rotate(angle, resample=Image.BICUBIC, expand=True)
                
                paste_x = int(cx - img.width/2 + dx)
                paste_y = int(cy - img.height/2 + dy)
                canvas.paste(img, (paste_x, paste_y), img)
                
                if move == 'fall':
                    # Paste explosion on top
                    exp_img = death_imgs[i]
                    # resize explosion to fit canvas
                    exp_img = exp_img.resize((300, int(300 * exp_img.height / exp_img.width)), Image.Resampling.LANCZOS)
                    # Flip explosion too so it looks correct for orientation
                    if flip:
                        exp_img = exp_img.transpose(Image.FLIP_LEFT_RIGHT)
                    exp_x = int(cx - exp_img.width/2 + dx)
                    exp_y = int(cy - exp_img.height/2 + dy)
                    canvas.paste(exp_img, (exp_x, exp_y), exp_img)
                
                if fireball:
                    canvas = draw_fireball(canvas, *fireball)
                if smoke:
                    canvas = draw_smokebomb(canvas, *smoke)
                    
                canvas.save(f'{move_dir}/{i}.png')

print("Building FloatROBO...")
char04_body = Image.open('Robots V1/Spine/Char04/Images/Body.png')
create_frames(char04_body, 'floatrobo', is_cyan=True)

print("Building RoboPepe...")
robopepe_body = Image.open('game/images/fighters/robopepe/portrait.png')
create_frames(robopepe_body, 'robopepe')

print("Building SilverWarrior...")
char02_body = Image.open('Robots V1/Spine/Char02/Images/Body.png')
create_frames(char02_body, 'silverwarrior', is_cyan=False, is_silver=True)

print("Done!")
