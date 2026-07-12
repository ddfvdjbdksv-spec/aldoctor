#!/usr/bin/env python3
"""
Precise white background removal using Pillow + flood-fill from edges + gaussian blur feathering.
Works perfectly for studio photos with clean white backgrounds.
"""
import sys, os
from PIL import Image, ImageFilter, ImageChops

def remove_white_bg(input_path, output_path):
    print(f"[+] Loading: {input_path}")
    src = Image.open(input_path).convert("RGBA")
    w, h = src.size
    print(f"[+] Size: {w}x{h}")

    # Step 1: Make a grayscale version to detect white
    r, g, b, a = src.split()
    rgb = Image.merge("RGB", (r, g, b))

    # Step 2: BFS flood-fill from all 4 edges to find connected white regions
    # This avoids touching white inside the subject (e.g., shirt, teeth)
    pixels = list(src.getdata())
    visited = [False] * (w * h)
    is_bg = [False] * (w * h)

    def idx(x, y):
        return y * w + x

    def is_white(x, y):
        r2, g2, b2, a2 = pixels[idx(x, y)]
        brightness = (r2 + g2 + b2) / 3
        variance = max(abs(r2 - g2), abs(g2 - b2), abs(r2 - b2))
        return brightness >= 230 and variance <= 30

    # Seed from all border pixels
    from collections import deque
    queue = deque()
    for x in range(w):
        for y in [0, h - 1]:
            if not visited[idx(x, y)] and is_white(x, y):
                queue.append((x, y))
                visited[idx(x, y)] = True
    for y in range(h):
        for x in [0, w - 1]:
            if not visited[idx(x, y)] and is_white(x, y):
                queue.append((x, y))
                visited[idx(x, y)] = True

    # BFS
    dirs = [(1,0),(-1,0),(0,1),(0,-1)]
    while queue:
        cx, cy = queue.popleft()
        is_bg[idx(cx, cy)] = True
        for dx, dy in dirs:
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < w and 0 <= ny < h:
                ni = idx(nx, ny)
                if not visited[ni] and is_white(nx, ny):
                    visited[ni] = True
                    queue.append((nx, ny))

    print("[+] Flood-fill complete")

    # Step 3: Build alpha mask - bg pixels = 0, content = 255
    import struct
    mask_data = bytes([0 if is_bg[i] else 255 for i in range(w * h)])
    mask = Image.frombytes("L", (w, h), mask_data)

    # Step 4: Feather the mask edges with a slight blur for smooth anti-aliasing
    # Only blur a small amount (radius=1) to avoid eating into subject
    mask_blurred = mask.filter(ImageFilter.GaussianBlur(radius=1))

    # Step 5: Apply mask to original RGBA
    result = src.copy()
    result.putalpha(mask_blurred)

    print(f"[+] Saving: {output_path}")
    result.save(output_path, "PNG", optimize=False)
    print("[DONE] Background removed successfully!")
    return True


if __name__ == "__main__":
    base = "c:\\Users\\M lapan\\OneDrive\\Desktop\\\u0627\u0644\u062f\u0643\u062a\u0648\u0631 1"
    inp  = os.path.join(base, "\u0627\u064a\u0642\u0648\u0646\u0629 \u0627\u0644\u0648\u0627\u062c\u0647\u0647 \u0627\u0644\u062c\u062f\u064a\u062f\u0647.png")
    out  = os.path.join(base, "\u0627\u0644\u0645\u062f\u0631\u0633_\u0634\u0641\u0627\u0641_\u0646\u0647\u0627\u0626\u064a.png")

    if not os.path.exists(inp):
        print(f"[ERROR] Not found: {inp}")
        sys.exit(1)

    remove_white_bg(inp, out)
    img = Image.open(out)
    print(f"Mode={img.mode}, Size={img.size}")
