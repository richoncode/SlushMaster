#!/usr/bin/env python3
"""Compare original and segmented frames to verify differences"""
import cv2
import numpy as np

# Load images
original = cv2.imread('/tmp/original.jpg')
segmented = cv2.imread('/tmp/segmented.jpg')

if original is None:
    print("❌ Failed to load original frame")
    exit(1)
if segmented is None:
    print("❌ Failed to load segmented frame")
    exit(1)

print(f"Original shape: {original.shape}")
print(f"Segmented shape: {segmented.shape}")

# Compute absolute difference
diff = cv2.absdiff(original, segmented)

# Check if any differences exist
total_diff = np.sum(diff)
max_diff = np.max(diff)

print(f"\n📊 Difference Statistics:")
print(f"  Total difference: {total_diff:,}")
print(f"  Max pixel difference: {max_diff}")
print(f"  Mean difference: {np.mean(diff):.2f}")

# Count pixels with significant difference (>10 in any channel)
significant_diff = np.any(diff > 10, axis=2)
num_changed_pixels = np.sum(significant_diff)
total_pixels = diff.shape[0] * diff.shape[1]
percent_changed = (num_changed_pixels / total_pixels) * 100

print(f"  Changed pixels: {num_changed_pixels:,} / {total_pixels:,} ({percent_changed:.2f}%)")

# Check for orange color in segmented (BGR: [0, 165, 255])
# Orange pixels should have B≈0, G≈165, R≈255
orange_mask = (
    (segmented[:,:,0] < 50) &      # Low blue
    (segmented[:,:,1] > 100) &     # Medium-high green
    (segmented[:,:,2] > 200)       # High red
)
num_orange_pixels = np.sum(orange_mask)
percent_orange = (num_orange_pixels / total_pixels) * 100

print(f"\n🟠 Orange Pixel Detection:")
print(f"  Orange pixels found: {num_orange_pixels:,} ({percent_orange:.2f}%)")

# Generate enhanced diff image for visualization
diff_enhanced = diff.copy()
diff_enhanced[significant_diff] = [0, 0, 255]  # Mark changed pixels as red

# Save diff image
cv2.imwrite('/tmp/frame_diff.jpg', diff_enhanced)
print(f"\n✅ Diff image saved to: /tmp/frame_diff.jpg")

# Verdict
if num_orange_pixels > 1000:
    print("\n✅ VERDICT: Segmentation IS working - orange masks detected!")
else:
    print("\n❌ VERDICT: Segmentation NOT working - no orange masks found!")
