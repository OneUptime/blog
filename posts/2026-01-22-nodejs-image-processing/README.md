# How to Create Image Processing in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Node.js, Image Processing, Sharp, Jimp, Graphics

Description: Learn how to process images in Node.js using Sharp and Jimp libraries for resizing, cropping, format conversion, and applying effects.

---

Image processing is a common requirement for web applications. Whether you need to resize user uploads, generate thumbnails, or apply filters, Node.js has powerful libraries to help. Let's explore how to process images effectively.

## Setting Up Image Processing Libraries

The two most popular libraries are Sharp (fast, native bindings) and Jimp (pure JavaScript):

```bash
# Sharp - fast native library
npm install sharp

# Jimp - pure JavaScript, no native dependencies
npm install jimp
```

## Basic Image Operations with Sharp

Sharp is the fastest image processing library for Node.js:

```javascript
const sharp = require('sharp');
const path = require('path');

// Basic resize operation
async function resizeImage(inputPath, outputPath, width, height) {
  try {
    await sharp(inputPath)
      .resize(width, height, {
        fit: 'cover',      // cover, contain, fill, inside, outside
        position: 'center' // center, top, right, bottom, left
      })
      .toFile(outputPath);
    
    console.log(`Resized image saved to ${outputPath}`);
  } catch (error) {
    console.error('Error resizing image:', error);
  }
}

// Resize maintaining aspect ratio
async function resizeWithAspectRatio(inputPath, outputPath, maxWidth) {
  await sharp(inputPath)
    .resize(maxWidth, null, {
      withoutEnlargement: true // Don't upscale small images
    })
    .toFile(outputPath);
}

// Get image metadata
async function getImageInfo(imagePath) {
  const metadata = await sharp(imagePath).metadata();
  
  console.log('Image Info:', {
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
    channels: metadata.channels,
    hasAlpha: metadata.hasAlpha,
    size: metadata.size
  });
  
  return metadata;
}
```

## Format Conversion

```javascript
const sharp = require('sharp');

// Convert between formats
async function convertFormat(inputPath, outputPath, format) {
  const formatOptions = {
    jpeg: { quality: 85, mozjpeg: true },
    png: { compressionLevel: 9 },
    webp: { quality: 80 },
    avif: { quality: 65 }
  };
  
  let pipeline = sharp(inputPath);
  
  switch (format) {
    case 'jpeg':
    case 'jpg':
      pipeline = pipeline.jpeg(formatOptions.jpeg);
      break;
    case 'png':
      pipeline = pipeline.png(formatOptions.png);
      break;
    case 'webp':
      pipeline = pipeline.webp(formatOptions.webp);
      break;
    case 'avif':
      pipeline = pipeline.avif(formatOptions.avif);
      break;
  }
  
  await pipeline.toFile(outputPath);
  console.log(`Converted to ${format}`);
}

// Generate multiple formats for modern browsers
async function generateWebFormats(inputPath, outputDir, name) {
  const formats = ['jpeg', 'webp', 'avif'];
  
  const results = await Promise.all(
    formats.map(async (format) => {
      const outputPath = path.join(outputDir, `${name}.${format}`);
      await convertFormat(inputPath, outputPath, format);
      return { format, path: outputPath };
    })
  );
  
  return results;
}
```

## Creating Thumbnails

```javascript
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// Generate multiple thumbnail sizes
async function generateThumbnails(inputPath, outputDir, sizes) {
  const image = sharp(inputPath);
  const metadata = await image.metadata();
  const baseName = path.basename(inputPath, path.extname(inputPath));
  
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });
  
  const results = await Promise.all(
    sizes.map(async (size) => {
      const outputPath = path.join(outputDir, `${baseName}_${size.name}.jpg`);
      
      await sharp(inputPath)
        .resize(size.width, size.height, {
          fit: 'cover',
          position: 'attention' // Focus on interesting part of image
        })
        .jpeg({ quality: 85 })
        .toFile(outputPath);
      
      return {
        name: size.name,
        path: outputPath,
        width: size.width,
        height: size.height
      };
    })
  );
  
  return results;
}

// Usage
const thumbnailSizes = [
  { name: 'thumb', width: 150, height: 150 },
  { name: 'small', width: 300, height: 300 },
  { name: 'medium', width: 600, height: 600 },
  { name: 'large', width: 1200, height: 1200 }
];

generateThumbnails('./uploads/photo.jpg', './thumbnails', thumbnailSizes)
  .then(results => console.log('Thumbnails created:', results));
```

## Image Effects and Filters

```javascript
const sharp = require('sharp');

// Apply various effects
async function applyEffects(inputPath, outputPath, effects) {
  let pipeline = sharp(inputPath);
  
  // Brightness, saturation, contrast
  if (effects.modulate) {
    pipeline = pipeline.modulate({
      brightness: effects.modulate.brightness || 1,
      saturation: effects.modulate.saturation || 1,
      hue: effects.modulate.hue || 0
    });
  }
  
  // Grayscale
  if (effects.grayscale) {
    pipeline = pipeline.grayscale();
  }
  
  // Blur
  if (effects.blur) {
    pipeline = pipeline.blur(effects.blur);
  }
  
  // Sharpen
  if (effects.sharpen) {
    pipeline = pipeline.sharpen(effects.sharpen);
  }
  
  // Negate (invert colors)
  if (effects.negate) {
    pipeline = pipeline.negate();
  }
  
  // Tint
  if (effects.tint) {
    pipeline = pipeline.tint(effects.tint);
  }
  
  // Rotate
  if (effects.rotate) {
    pipeline = pipeline.rotate(effects.rotate, {
      background: effects.rotateBackground || { r: 255, g: 255, b: 255 }
    });
  }
  
  // Flip/Flop
  if (effects.flip) pipeline = pipeline.flip();
  if (effects.flop) pipeline = pipeline.flop();
  
  await pipeline.toFile(outputPath);
}

// Example usage
applyEffects('./input.jpg', './output.jpg', {
  modulate: { brightness: 1.2, saturation: 1.3 },
  sharpen: 1.5,
  rotate: 90
});
```

## Compositing and Watermarks

```javascript
const sharp = require('sharp');

// Add watermark to image
async function addWatermark(imagePath, watermarkPath, outputPath, options = {}) {
  const { position = 'southeast', opacity = 0.7, margin = 10 } = options;
  
  // Get image dimensions
  const imageMetadata = await sharp(imagePath).metadata();
  
  // Resize watermark if needed
  const watermarkWidth = Math.round(imageMetadata.width * 0.2);
  const watermark = await sharp(watermarkPath)
    .resize(watermarkWidth, null)
    .ensureAlpha(opacity)
    .toBuffer();
  
  // Calculate position
  const positionMap = {
    northwest: { top: margin, left: margin },
    northeast: { top: margin, right: margin },
    southwest: { bottom: margin, left: margin },
    southeast: { bottom: margin, right: margin },
    center: { gravity: 'center' }
  };
  
  await sharp(imagePath)
    .composite([{
      input: watermark,
      ...positionMap[position]
    }])
    .toFile(outputPath);
  
  console.log('Watermark added successfully');
}

// Composite multiple images
async function compositeImages(baseImagePath, overlays, outputPath) {
  const compositeOperations = overlays.map(overlay => ({
    input: overlay.path,
    top: overlay.top || 0,
    left: overlay.left || 0,
    blend: overlay.blend || 'over'
  }));
  
  await sharp(baseImagePath)
    .composite(compositeOperations)
    .toFile(outputPath);
}

// Create image collage
async function createCollage(images, outputPath, options = {}) {
  const { columns = 2, spacing = 10, background = '#ffffff' } = options;
  
  // Get dimensions of first image as reference
  const firstMeta = await sharp(images[0]).metadata();
  const cellWidth = firstMeta.width;
  const cellHeight = firstMeta.height;
  
  const rows = Math.ceil(images.length / columns);
  const totalWidth = columns * cellWidth + (columns - 1) * spacing;
  const totalHeight = rows * cellHeight + (rows - 1) * spacing;
  
  // Prepare composite operations
  const composites = await Promise.all(
    images.map(async (imagePath, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      
      const resizedImage = await sharp(imagePath)
        .resize(cellWidth, cellHeight, { fit: 'cover' })
        .toBuffer();
      
      return {
        input: resizedImage,
        top: row * (cellHeight + spacing),
        left: col * (cellWidth + spacing)
      };
    })
  );
  
  // Create collage
  await sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 4,
      background: background
    }
  })
    .composite(composites)
    .toFile(outputPath);
}
```

## Image Processing with Jimp

Jimp is a pure JavaScript alternative that works everywhere:

```javascript
const Jimp = require('jimp');

// Basic operations with Jimp
async function processWithJimp(inputPath, outputPath) {
  const image = await Jimp.read(inputPath);
  
  // Chain multiple operations
  await image
    .resize(800, Jimp.AUTO) // Maintain aspect ratio
    .quality(85)            // JPEG quality
    .greyscale()            // Convert to grayscale
    .contrast(0.2)          // Increase contrast
    .writeAsync(outputPath);
  
  console.log('Image processed with Jimp');
}

// Advanced Jimp operations
async function advancedJimpProcessing(inputPath) {
  const image = await Jimp.read(inputPath);
  
  // Get pixel color
  const color = image.getPixelColor(100, 100);
  const rgba = Jimp.intToRGBA(color);
  console.log('Pixel at (100,100):', rgba);
  
  // Iterate over pixels
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
    // idx is the position in the bitmap buffer
    // Modify pixel values directly
    const red = image.bitmap.data[idx];
    const green = image.bitmap.data[idx + 1];
    const blue = image.bitmap.data[idx + 2];
    const alpha = image.bitmap.data[idx + 3];
    
    // Apply sepia effect
    image.bitmap.data[idx] = Math.min(255, (red * 0.393) + (green * 0.769) + (blue * 0.189));
    image.bitmap.data[idx + 1] = Math.min(255, (red * 0.349) + (green * 0.686) + (blue * 0.168));
    image.bitmap.data[idx + 2] = Math.min(255, (red * 0.272) + (green * 0.534) + (blue * 0.131));
  });
  
  await image.writeAsync('./sepia_output.jpg');
}

// Add text to image with Jimp
async function addTextToImage(inputPath, outputPath, text) {
  const image = await Jimp.read(inputPath);
  
  // Load font
  const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
  
  // Print text
  image.print(
    font,
    10, // x position
    10, // y position
    {
      text: text,
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
      alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
    },
    image.bitmap.width - 20,
    image.bitmap.height - 20
  );
  
  await image.writeAsync(outputPath);
}
```

## Express Image Processing API

```javascript
const express = require('express');
const sharp = require('sharp');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const app = express();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Image upload and processing endpoint
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }
    
    const imageId = Date.now().toString();
    const outputDir = path.join(__dirname, 'uploads', imageId);
    await fs.mkdir(outputDir, { recursive: true });
    
    // Process image into multiple sizes
    const sizes = [
      { name: 'original', width: null },
      { name: 'large', width: 1200 },
      { name: 'medium', width: 800 },
      { name: 'small', width: 400 },
      { name: 'thumbnail', width: 150 }
    ];
    
    const results = await Promise.all(
      sizes.map(async (size) => {
        const outputPath = path.join(outputDir, `${size.name}.webp`);
        
        let pipeline = sharp(req.file.buffer);
        
        if (size.width) {
          pipeline = pipeline.resize(size.width, null, {
            withoutEnlargement: true
          });
        }
        
        await pipeline
          .webp({ quality: 85 })
          .toFile(outputPath);
        
        const stats = await fs.stat(outputPath);
        
        return {
          name: size.name,
          url: `/images/${imageId}/${size.name}.webp`,
          size: stats.size
        };
      })
    );
    
    res.json({
      id: imageId,
      images: results
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

// Dynamic image resizing endpoint
app.get('/images/:id/:width/:height', async (req, res) => {
  const { id, width, height } = req.params;
  const format = req.query.format || 'webp';
  
  try {
    const originalPath = path.join(__dirname, 'uploads', id, 'original.webp');
    
    const image = await sharp(originalPath)
      .resize(parseInt(width), parseInt(height), {
        fit: req.query.fit || 'cover'
      })
      .toFormat(format, { quality: parseInt(req.query.quality) || 80 })
      .toBuffer();
    
    res.type(`image/${format}`);
    res.send(image);
  } catch (error) {
    res.status(404).json({ error: 'Image not found' });
  }
});

app.listen(3000, () => {
  console.log('Image processing API running on port 3000');
});
```

## Batch Processing Images

```javascript
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

async function batchProcessImages(inputDir, outputDir, options = {}) {
  const {
    width = 800,
    format = 'webp',
    quality = 80
  } = options;
  
  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });
  
  // Get all image files
  const files = await fs.readdir(inputDir);
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const imageFiles = files.filter(file => 
    imageExtensions.includes(path.extname(file).toLowerCase())
  );
  
  console.log(`Processing ${imageFiles.length} images...`);
  
  // Process in batches to avoid memory issues
  const batchSize = 10;
  const results = [];
  
  for (let i = 0; i < imageFiles.length; i += batchSize) {
    const batch = imageFiles.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (file) => {
        const inputPath = path.join(inputDir, file);
        const baseName = path.basename(file, path.extname(file));
        const outputPath = path.join(outputDir, `${baseName}.${format}`);
        
        try {
          await sharp(inputPath)
            .resize(width, null, { withoutEnlargement: true })
            .toFormat(format, { quality })
            .toFile(outputPath);
          
          return { file, status: 'success', outputPath };
        } catch (error) {
          return { file, status: 'error', error: error.message };
        }
      })
    );
    
    results.push(...batchResults);
    console.log(`Processed ${Math.min(i + batchSize, imageFiles.length)}/${imageFiles.length}`);
  }
  
  return results;
}

// Usage
batchProcessImages('./raw-images', './processed-images', {
  width: 1200,
  format: 'webp',
  quality: 85
}).then(results => {
  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'error').length;
  console.log(`Completed: ${successful} successful, ${failed} failed`);
});
```

## Summary

| Library | Speed | Dependencies | Best For |
|---------|-------|--------------|----------|
| Sharp | Very Fast | Native (libvips) | Production, high throughput |
| Jimp | Moderate | Pure JS | Cross-platform, simple tasks |
| ImageMagick | Fast | External binary | Complex operations |

| Operation | Sharp | Jimp |
|-----------|-------|------|
| Resize | `resize(w, h)` | `resize(w, h)` |
| Format | `toFormat(fmt)` | `write(path)` |
| Quality | `jpeg({quality})` | `quality(n)` |
| Effects | `modulate()` | `brightness()` |
| Composite | `composite([])` | `composite()` |

Sharp is recommended for most production use cases due to its speed and efficiency. Jimp is a good choice when you need a pure JavaScript solution without native dependencies.
