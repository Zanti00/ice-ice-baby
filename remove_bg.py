from PIL import Image

def remove_bg(img_path):
    try:
        img = Image.open(img_path).convert("RGBA")
        data = img.getdata()
        bg_color = data[0] # assume top left is bg
        
        new_data = []
        for item in data:
            if abs(item[0] - bg_color[0]) < 30 and abs(item[1] - bg_color[1]) < 30 and abs(item[2] - bg_color[2]) < 30:
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(item)
                
        img.putdata(new_data)
        img.save(img_path)
        print(f"Processed {img_path}")
    except Exception as e:
        print(f"Error processing {img_path}: {e}")

for i in range(1, 5):
    remove_bg(f"public/ice-{i}.png")
