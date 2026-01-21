# How to Build an Image Processing Pipeline with BullMQ

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BullMQ, Node.js, Redis, Image Processing, Sharp, Thumbnails, CDN, Media Pipeline

Description: A comprehensive guide to building an image processing pipeline with BullMQ, including thumbnail generation, format conversion, optimization, watermarking, and handling high-volume image uploads.

---

Image processing is resource-intensive and perfect for background job queues. By offloading image operations to BullMQ workers, you can handle uploads quickly while processing happens asynchronously. This guide covers building a complete image processing pipeline.

## Basic Image Processing Setup

Set up a simple image processing queue:

```typescript
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

interface ImageJobData {
  inputPath: string;
  outputDir: string;
  operations: ImageOperation[];
  metadata?: Record<string, any>;
}

interface ImageOperation {
  type: 'resize' | 'format' | 'quality' | 'watermark' | 'blur' | 'rotate';
  options: Record<string, any>;
}

interface ProcessedImage {
  path: string;
  width: number;
  height: number;
  format: string;
  size: number;
}

const imageQueue = new Queue<ImageJobData>('image-processing', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
});

const imageWorker = new Worker<ImageJobData, ProcessedImage>(
  'image-processing',
  async (job) => {
    const { inputPath, outputDir, operations } = job.data;

    let pipeline = sharp(inputPath);

    for (const operation of operations) {
      pipeline = applyOperation(pipeline, operation);
    }

    const outputPath = path.join(
      outputDir,
      `processed_${Date.now()}${path.extname(inputPath)}`
    );

    await pipeline.toFile(outputPath);

    const metadata = await sharp(outputPath).metadata();

    return {
      path: outputPath,
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      size: (await fs.stat(outputPath)).size,
    };
  },
  {
    connection,
    concurrency: 2, // Limit concurrency for CPU-intensive work
  }
);

function applyOperation(pipeline: sharp.Sharp, operation: ImageOperation): sharp.Sharp {
  switch (operation.type) {
    case 'resize':
      return pipeline.resize(operation.options.width, operation.options.height, {
        fit: operation.options.fit || 'cover',
        position: operation.options.position || 'center',
      });

    case 'format':
      const format = operation.options.format;
      if (format === 'jpeg') return pipeline.jpeg({ quality: operation.options.quality || 80 });
      if (format === 'png') return pipeline.png({ quality: operation.options.quality || 80 });
      if (format === 'webp') return pipeline.webp({ quality: operation.options.quality || 80 });
      if (format === 'avif') return pipeline.avif({ quality: operation.options.quality || 80 });
      return pipeline;

    case 'quality':
      return pipeline.jpeg({ quality: operation.options.quality });

    case 'blur':
      return pipeline.blur(operation.options.sigma || 5);

    case 'rotate':
      return pipeline.rotate(operation.options.angle || 0);

    default:
      return pipeline;
  }
}
```

## Thumbnail Generation Service

Create a service for generating multiple thumbnail sizes:

```typescript
interface ThumbnailConfig {
  name: string;
  width: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  quality?: number;
}

interface ThumbnailJobData {
  inputPath: string;
  outputDir: string;
  thumbnails: ThumbnailConfig[];
  originalId: string;
}

interface ThumbnailResult {
  originalId: string;
  thumbnails: Array<{
    name: string;
    path: string;
    width: number;
    height: number;
    size: number;
  }>;
}

class ThumbnailService {
  private queue: Queue<ThumbnailJobData>;

  constructor(connection: Redis) {
    this.queue = new Queue('thumbnails', { connection });

    // Worker
    new Worker<ThumbnailJobData, ThumbnailResult>(
      'thumbnails',
      async (job) => this.processJob(job),
      {
        connection,
        concurrency: 3,
      }
    );
  }

  async generateThumbnails(
    inputPath: string,
    outputDir: string,
    configs: ThumbnailConfig[] = this.getDefaultConfigs()
  ): Promise<Job<ThumbnailJobData>> {
    const originalId = path.basename(inputPath, path.extname(inputPath));

    return this.queue.add('generate', {
      inputPath,
      outputDir,
      thumbnails: configs,
      originalId,
    });
  }

  private async processJob(job: Job<ThumbnailJobData>): Promise<ThumbnailResult> {
    const { inputPath, outputDir, thumbnails, originalId } = job.data;
    const results: ThumbnailResult['thumbnails'] = [];

    await fs.mkdir(outputDir, { recursive: true });

    const totalThumbnails = thumbnails.length;

    for (let i = 0; i < thumbnails.length; i++) {
      const config = thumbnails[i];

      const outputPath = path.join(
        outputDir,
        `${originalId}_${config.name}.${config.format || 'jpg'}`
      );

      let pipeline = sharp(inputPath)
        .resize(config.width, config.height, {
          fit: config.fit || 'cover',
          withoutEnlargement: true,
        });

      // Apply format
      const format = config.format || 'jpeg';
      if (format === 'jpeg') pipeline = pipeline.jpeg({ quality: config.quality || 80 });
      else if (format === 'png') pipeline = pipeline.png();
      else if (format === 'webp') pipeline = pipeline.webp({ quality: config.quality || 80 });
      else if (format === 'avif') pipeline = pipeline.avif({ quality: config.quality || 80 });

      await pipeline.toFile(outputPath);

      const metadata = await sharp(outputPath).metadata();
      const stats = await fs.stat(outputPath);

      results.push({
        name: config.name,
        path: outputPath,
        width: metadata.width || 0,
        height: metadata.height || 0,
        size: stats.size,
      });

      await job.updateProgress(((i + 1) / totalThumbnails) * 100);
    }

    return { originalId, thumbnails: results };
  }

  private getDefaultConfigs(): ThumbnailConfig[] {
    return [
      { name: 'thumb', width: 150, height: 150, fit: 'cover' },
      { name: 'small', width: 320, fit: 'inside' },
      { name: 'medium', width: 640, fit: 'inside' },
      { name: 'large', width: 1280, fit: 'inside' },
      { name: 'thumb_webp', width: 150, height: 150, fit: 'cover', format: 'webp' },
      { name: 'medium_webp', width: 640, fit: 'inside', format: 'webp' },
    ];
  }
}
```

## Image Optimization Pipeline

Optimize images for web delivery:

```typescript
interface OptimizationJobData {
  inputPath: string;
  outputPath: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  stripMetadata?: boolean;
  convertToWebp?: boolean;
  generateAvif?: boolean;
}

interface OptimizationResult {
  original: { path: string; size: number };
  optimized: { path: string; size: number; savings: number };
  webp?: { path: string; size: number };
  avif?: { path: string; size: number };
}

class ImageOptimizer {
  private queue: Queue<OptimizationJobData>;

  constructor(connection: Redis) {
    this.queue = new Queue('image-optimization', { connection });

    new Worker<OptimizationJobData, OptimizationResult>(
      'image-optimization',
      async (job) => this.optimize(job),
      {
        connection,
        concurrency: 2,
      }
    );
  }

  async optimizeImage(options: OptimizationJobData): Promise<Job<OptimizationJobData>> {
    return this.queue.add('optimize', options);
  }

  private async optimize(job: Job<OptimizationJobData>): Promise<OptimizationResult> {
    const {
      inputPath,
      outputPath,
      maxWidth = 2048,
      maxHeight = 2048,
      quality = 80,
      stripMetadata = true,
      convertToWebp = true,
      generateAvif = false,
    } = job.data;

    const originalStats = await fs.stat(inputPath);
    const metadata = await sharp(inputPath).metadata();

    let pipeline = sharp(inputPath);

    // Resize if needed
    if (
      (metadata.width && metadata.width > maxWidth) ||
      (metadata.height && metadata.height > maxHeight)
    ) {
      pipeline = pipeline.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Auto-rotate based on EXIF
    pipeline = pipeline.rotate();

    // Strip metadata if requested
    if (stripMetadata) {
      pipeline = pipeline.withMetadata({ orientation: undefined });
    }

    // Determine output format
    const format = metadata.format || 'jpeg';
    if (format === 'jpeg' || format === 'jpg') {
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
    } else if (format === 'png') {
      pipeline = pipeline.png({ quality, compressionLevel: 9 });
    }

    await pipeline.toFile(outputPath);

    const optimizedStats = await fs.stat(outputPath);
    const savings = ((originalStats.size - optimizedStats.size) / originalStats.size) * 100;

    const result: OptimizationResult = {
      original: { path: inputPath, size: originalStats.size },
      optimized: { path: outputPath, size: optimizedStats.size, savings },
    };

    await job.updateProgress(50);

    // Generate WebP version
    if (convertToWebp) {
      const webpPath = outputPath.replace(/\.[^.]+$/, '.webp');
      await sharp(outputPath).webp({ quality }).toFile(webpPath);
      const webpStats = await fs.stat(webpPath);
      result.webp = { path: webpPath, size: webpStats.size };
    }

    await job.updateProgress(75);

    // Generate AVIF version
    if (generateAvif) {
      const avifPath = outputPath.replace(/\.[^.]+$/, '.avif');
      await sharp(outputPath).avif({ quality }).toFile(avifPath);
      const avifStats = await fs.stat(avifPath);
      result.avif = { path: avifPath, size: avifStats.size };
    }

    await job.updateProgress(100);

    return result;
  }
}
```

## Watermark Processing

Add watermarks to images:

```typescript
interface WatermarkJobData {
  inputPath: string;
  outputPath: string;
  watermark: {
    type: 'image' | 'text';
    content: string; // Path for image, text for text
    position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    opacity?: number;
    scale?: number; // For image watermarks, percentage of image width
    font?: string;
    fontSize?: number;
    color?: string;
  };
}

class WatermarkService {
  private queue: Queue<WatermarkJobData>;

  constructor(connection: Redis) {
    this.queue = new Queue('watermarks', { connection });

    new Worker<WatermarkJobData>(
      'watermarks',
      async (job) => this.applyWatermark(job),
      {
        connection,
        concurrency: 3,
      }
    );
  }

  async addWatermark(options: WatermarkJobData): Promise<Job<WatermarkJobData>> {
    return this.queue.add('watermark', options);
  }

  private async applyWatermark(job: Job<WatermarkJobData>): Promise<{ path: string }> {
    const { inputPath, outputPath, watermark } = job.data;

    const image = sharp(inputPath);
    const metadata = await image.metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 600;

    let watermarkBuffer: Buffer;

    if (watermark.type === 'image') {
      // Load and resize watermark image
      const watermarkWidth = Math.round(width * (watermark.scale || 0.2));
      watermarkBuffer = await sharp(watermark.content)
        .resize(watermarkWidth)
        .toBuffer();
    } else {
      // Create text watermark using SVG
      const fontSize = watermark.fontSize || 48;
      const color = watermark.color || 'rgba(255,255,255,0.5)';

      const svg = `
        <svg width="${width}" height="${fontSize * 1.5}">
          <text
            x="50%"
            y="50%"
            font-family="${watermark.font || 'Arial'}"
            font-size="${fontSize}"
            fill="${color}"
            text-anchor="middle"
            dominant-baseline="middle"
          >${watermark.content}</text>
        </svg>
      `;

      watermarkBuffer = Buffer.from(svg);
    }

    // Calculate position
    const position = this.calculatePosition(
      watermark.position || 'bottom-right',
      width,
      height,
      watermarkBuffer
    );

    await image
      .composite([
        {
          input: watermarkBuffer,
          ...position,
          blend: 'over',
        },
      ])
      .toFile(outputPath);

    return { path: outputPath };
  }

  private calculatePosition(
    position: string,
    imageWidth: number,
    imageHeight: number,
    watermarkBuffer: Buffer
  ): { left?: number; top?: number; gravity?: string } {
    const padding = 20;

    switch (position) {
      case 'center':
        return { gravity: 'center' };
      case 'top-left':
        return { left: padding, top: padding };
      case 'top-right':
        return { gravity: 'northeast' };
      case 'bottom-left':
        return { gravity: 'southwest' };
      case 'bottom-right':
      default:
        return { gravity: 'southeast' };
    }
  }
}
```

## Flow-Based Image Pipeline

Use BullMQ Flows for complex pipelines:

```typescript
import { FlowProducer } from 'bullmq';

interface ImageUploadData {
  originalPath: string;
  userId: string;
  imageId: string;
}

class ImagePipelineService {
  private flowProducer: FlowProducer;

  constructor(connection: Redis) {
    this.flowProducer = new FlowProducer({ connection });

    // Set up workers for each step
    this.setupWorkers(connection);
  }

  private setupWorkers(connection: Redis): void {
    // Validation worker
    new Worker('image-validate', async (job) => {
      const { path } = job.data;
      const metadata = await sharp(path).metadata();

      if (!['jpeg', 'png', 'webp', 'gif'].includes(metadata.format || '')) {
        throw new Error('Unsupported image format');
      }

      return {
        valid: true,
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
      };
    }, { connection });

    // Optimization worker
    new Worker('image-optimize', async (job) => {
      const { inputPath, outputDir, imageId } = job.data;
      const outputPath = path.join(outputDir, `${imageId}_optimized.jpg`);

      await sharp(inputPath)
        .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true })
        .toFile(outputPath);

      return { optimizedPath: outputPath };
    }, { connection });

    // Thumbnail worker
    new Worker('image-thumbnails', async (job) => {
      const { inputPath, outputDir, imageId } = job.data;
      const thumbnails = [];

      const sizes = [
        { name: 'thumb', width: 150, height: 150 },
        { name: 'small', width: 320 },
        { name: 'medium', width: 640 },
      ];

      for (const size of sizes) {
        const thumbPath = path.join(outputDir, `${imageId}_${size.name}.jpg`);
        await sharp(inputPath)
          .resize(size.width, size.height, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toFile(thumbPath);

        thumbnails.push({ name: size.name, path: thumbPath });
      }

      return { thumbnails };
    }, { connection });

    // CDN upload worker
    new Worker('image-upload-cdn', async (job) => {
      const { files, imageId } = job.data;
      const urls: Record<string, string> = {};

      for (const file of files) {
        const url = await uploadToCDN(file.path, `images/${imageId}/${path.basename(file.path)}`);
        urls[file.name || path.basename(file.path)] = url;
      }

      return { urls };
    }, { connection });

    // Finalization worker
    new Worker('image-finalize', async (job) => {
      const childValues = await job.getChildrenValues();
      // Aggregate results from all steps
      return {
        status: 'completed',
        ...Object.values(childValues).reduce((acc, val) => ({ ...acc, ...val }), {}),
      };
    }, { connection });
  }

  async processUpload(data: ImageUploadData): Promise<any> {
    const { originalPath, userId, imageId } = data;
    const outputDir = `/tmp/processed/${imageId}`;

    await fs.mkdir(outputDir, { recursive: true });

    return this.flowProducer.add({
      name: 'finalize',
      queueName: 'image-finalize',
      data: { imageId, userId },
      children: [
        {
          name: 'upload-to-cdn',
          queueName: 'image-upload-cdn',
          data: { imageId },
          children: [
            {
              name: 'generate-thumbnails',
              queueName: 'image-thumbnails',
              data: { inputPath: originalPath, outputDir, imageId },
              children: [
                {
                  name: 'optimize',
                  queueName: 'image-optimize',
                  data: { inputPath: originalPath, outputDir, imageId },
                  children: [
                    {
                      name: 'validate',
                      queueName: 'image-validate',
                      data: { path: originalPath },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
  }
}

async function uploadToCDN(localPath: string, remotePath: string): Promise<string> {
  // Implement CDN upload logic
  return `https://cdn.example.com/${remotePath}`;
}
```

## Batch Processing

Process multiple images efficiently:

```typescript
interface BatchJobData {
  images: Array<{
    id: string;
    inputPath: string;
  }>;
  operations: ImageOperation[];
  outputDir: string;
}

class BatchImageProcessor {
  private queue: Queue<BatchJobData>;

  constructor(connection: Redis) {
    this.queue = new Queue('image-batch', { connection });

    new Worker<BatchJobData>(
      'image-batch',
      async (job) => this.processBatch(job),
      {
        connection,
        concurrency: 1, // One batch at a time
      }
    );
  }

  async processBatch(job: Job<BatchJobData>): Promise<any> {
    const { images, operations, outputDir } = job.data;
    const results = [];
    const errors = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];

      try {
        let pipeline = sharp(image.inputPath);

        for (const operation of operations) {
          pipeline = applyOperation(pipeline, operation);
        }

        const outputPath = path.join(outputDir, `${image.id}_processed.jpg`);
        await pipeline.toFile(outputPath);

        results.push({
          id: image.id,
          success: true,
          outputPath,
        });
      } catch (error) {
        errors.push({
          id: image.id,
          success: false,
          error: (error as Error).message,
        });
      }

      await job.updateProgress(((i + 1) / images.length) * 100);
    }

    return {
      total: images.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }
}
```

## Best Practices

1. **Limit concurrency** - Image processing is CPU-intensive.

2. **Use streams for large files** - Avoid loading entire images into memory.

3. **Validate before processing** - Check format and size early.

4. **Generate multiple formats** - Serve WebP with JPEG fallback.

5. **Clean up temporary files** - Remove processed files after upload.

6. **Monitor memory usage** - Sharp can use significant memory.

7. **Use job progress** - Track long-running operations.

8. **Implement retries** - Handle transient failures.

9. **Cache processed images** - Avoid reprocessing same images.

10. **Use CDN for delivery** - Don't serve images from your server.

## Conclusion

BullMQ provides an excellent foundation for building image processing pipelines. By separating upload handling from processing, using flows for complex pipelines, and implementing proper error handling, you can handle high volumes of image uploads while maintaining responsiveness. Remember to monitor resource usage and adjust concurrency based on your server capacity.
