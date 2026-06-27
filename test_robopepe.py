from PIL import Image, ImageDraw

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

img = Image.open('Robots V1/Spine/Char04/Images/Body.png')
img = hue_shift(img, 70)

draw = ImageDraw.Draw(img, 'RGBA')

# Cover the entire visor to hide the original pink eyes
# Visor color is roughly (20, 10, 15)
draw.ellipse([60, 90, 190, 170], fill=(20, 10, 15, 255))

def draw_pepe_eye(x, y, w, h):
    # white sclera
    draw.ellipse([x, y, x+w, y+h], fill=(255, 255, 255, 255), outline=(0, 0, 0, 255), width=3)
    # pupil
    draw.ellipse([x+w//2-5, y+h//2-5, x+w//2+5, y+h//2+5], fill=(0, 0, 0, 255))
    # eyelid (green rectangle covering top third)
    green = (87, 218, 48, 255)
    draw.chord([x-2, y-2, x+w+2, y+h+2], 180, 360, fill=green, outline=(0, 0, 0, 255), width=3)

# Left eye (further back)
draw_pepe_eye(115, 85, 55, 55)

# Right eye (closer)
draw_pepe_eye(65, 80, 60, 60)

img.save('test_robopepe.png')
print('Done!')
