import sys
from PIL import Image

def process_image(input_path, output_dir):
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    
    bg = img.getpixel((0, 0))
    data = img.getdata()
    new_data = []
    
    for item in data:
        dist = sum(abs(item[i] - bg[i]) for i in range(3))
        if dist < 45:  # Stricter tolerance
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
    
    img.putdata(new_data)
    
    # Crop the overall bounding box to remove empty space before determining grid
    overall_bbox = img.getbbox()
    if overall_bbox:
        img = img.crop(overall_bbox)
        
    width, height = img.size
    
    if width > height * 1.5:
        cols, rows = 4, 1
    else:
        cols, rows = 2, 2
        
    w_seg = width // cols
    h_seg = height // rows
    
    idx = 1
    for r in range(rows):
        for c in range(cols):
            if idx > 4: break
            box = (c * w_seg, r * h_seg, (c + 1) * w_seg, (r + 1) * h_seg)
            cropped = img.crop(box)
            
            bbox = cropped.getbbox()
            if bbox:
                cropped = cropped.crop(bbox)
                
            cropped.thumbnail((300, 300), Image.Resampling.LANCZOS)
            final = Image.new("RGBA", (300, 300), (255, 255, 255, 0))
            x = (300 - cropped.width) // 2
            y = (300 - cropped.height) // 2
            final.paste(cropped, (x, y))
            final.save(f"{output_dir}/ice-{idx}.png")
            print(f"Saved ice-{idx}.png")
            idx += 1

if __name__ == '__main__':
    process_image(sys.argv[1], sys.argv[2])
