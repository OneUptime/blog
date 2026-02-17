# How to Set Up a Cloud Function to Automatically Resize Images Uploaded to Cloud Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Functions, Cloud Storage, Image Processing, Serverless

Description: Build a Cloud Function that automatically resizes images when they are uploaded to Google Cloud Storage, generating thumbnails and optimized versions.

---

Automatically resizing images on upload is one of the most common Cloud Functions use cases, and for good reason. Instead of making your application server handle image processing (which is CPU-intensive and slows down your API), you offload it to a serverless function that triggers whenever a new image lands in Cloud Storage. The user uploads the original, and within seconds they have thumbnails and optimized versions ready to serve.

Let me walk through building this from scratch with a production-ready setup.

## Architecture Overview

Here is the flow we are going to build:

```mermaid
graph LR
    A[User uploads image] --> B[Cloud Storage - originals bucket]
    B -->|Finalize event| C[Cloud Function]
    C --> D[Read original image]
    D --> E[Resize to multiple sizes]
    E --> F[Cloud Storage - resized bucket]
    F --> G[CDN serves resized images]
```

We use two separate buckets - one for originals and one for resized images. This prevents infinite loops where the function triggers itself by writing resized images back to the same bucket.

## Setting Up the Buckets

```bash
# Create the bucket for original uploads
gcloud storage buckets create gs://my-project-originals \
  --location=us-central1

# Create the bucket for resized images
gcloud storage buckets create gs://my-project-resized \
  --location=us-central1

# Optionally, set lifecycle rules to delete originals after 30 days
gcloud storage buckets update gs://my-project-originals \
  --lifecycle-file=lifecycle.json
```

## Writing the Resize Function

We will use the `sharp` library for Node.js, which is the fastest image processing library available and handles JPEG, PNG, WebP, and AVIF formats.

Here is the package.json:

```json
{
  "name": "image-resizer",
  "version": "1.0.0",
  "dependencies": {
    "@google-cloud/functions-framework": "^3.0.0",
    "@google-cloud/storage": "^7.0.0",
    "sharp": "^0.33.0"
  }
}
```

And the function code:

```javascript
// index.js - Cloud Function to resize images uploaded to Cloud Storage
const functions = require('@google-cloud/functions-framework');
const { Storage } = require('@google-cloud/storage');
const sharp = require('sharp');
const path = require('path');

const storage = new Storage();

// Define the resize configurations
const RESIZE_CONFIGS = [
  { suffix: 'thumb', width: 150, height: 150, fit: 'cover' },
  { suffix: 'small', width: 320, height: null, fit: 'inside' },
  { suffix: 'medium', width: 800, height: null, fit: 'inside' },
  { suffix: 'large', width: 1920, height: null, fit: 'inside' }
];

// Bucket names
const RESIZED_BUCKET = process.env.RESIZED_BUCKET || 'my-project-resized';

// Supported image content types
const SUPPORTED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/tiff'
]);

functions.cloudEvent('resizeImage', async (cloudEvent) => {
  const file = cloudEvent.data;
  const bucketName = file.bucket;
  const filePath = file.name;
  const contentType = file.contentType;

  // Skip non-image files
  if (!SUPPORTED_TYPES.has(contentType)) {
    console.log(`Skipping non-image file: ${filePath} (${contentType})`);
    return;
  }

  // Skip files in subdirectories that we create (prevent loops)
  if (filePath.includes('/resized/')) {
    console.log(`Skipping already-resized file: ${filePath}`);
    return;
  }

  console.log(`Processing image: ${filePath} from bucket: ${bucketName}`);

  // Download the original image into memory
  const bucket = storage.bucket(bucketName);
  const originalFile = bucket.file(filePath);
  const [imageBuffer] = await originalFile.download();

  console.log(`Downloaded ${filePath}, size: ${imageBuffer.length} bytes`);

  // Get original image metadata
  const metadata = await sharp(imageBuffer).metadata();
  console.log(`Original dimensions: ${metadata.width}x${metadata.height}`);

  // Parse the file name and extension
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath, ext);
  const dirName = path.dirname(filePath);

  // Process each resize configuration in parallel
  const resizePromises = RESIZE_CONFIGS.map(async (config) => {
    // Skip if original is smaller than the target size
    if (config.width && metadata.width <= config.width) {
      console.log(
        `Skipping ${config.suffix}: original (${metadata.width}px) is smaller than target (${config.width}px)`
      );
      return;
    }

    try {
      // Resize the image using sharp
      let resizer = sharp(imageBuffer).resize({
        width: config.width,
        height: config.height,
        fit: config.fit,
        withoutEnlargement: true
      });

      // Convert to WebP for better compression (optional)
      // Keep original format if you prefer
      const outputFormat = 'webp';
      resizer = resizer.webp({ quality: 80 });

      const resizedBuffer = await resizer.toBuffer();

      // Construct the output path
      const outputPath = `${dirName}/${baseName}-${config.suffix}.${outputFormat}`;

      // Upload to the resized bucket
      const resizedFile = storage.bucket(RESIZED_BUCKET).file(outputPath);
      await resizedFile.save(resizedBuffer, {
        metadata: {
          contentType: `image/${outputFormat}`,
          metadata: {
            originalFile: filePath,
            originalBucket: bucketName,
            resizeConfig: config.suffix,
            originalWidth: metadata.width.toString(),
            originalHeight: metadata.height.toString()
          }
        }
      });

      console.log(
        `Created ${config.suffix}: ${outputPath} (${resizedBuffer.length} bytes)`
      );
    } catch (error) {
      console.error(`Failed to create ${config.suffix} for ${filePath}:`, error);
      throw error;
    }
  });

  await Promise.all(resizePromises);
  console.log(`All resize operations completed for ${filePath}`);
});
```

## Deploying the Function

```bash
# Deploy with a Cloud Storage trigger on the originals bucket
gcloud functions deploy resize-image \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=resizeImage \
  --trigger-event-filters="type=google.cloud.storage.object.v1.finalized" \
  --trigger-event-filters="bucket=my-project-originals" \
  --memory=1Gi \
  --cpu=1 \
  --timeout=120s \
  --set-env-vars="RESIZED_BUCKET=my-project-resized" \
  --max-instances=20
```

Note the higher memory allocation (1Gi). Image processing is memory-intensive, and sharp needs enough memory to hold both the original and resized images in memory simultaneously. For large images (10MB+), you might need 2Gi or more.

## Testing the Function

Upload a test image and check the results:

```bash
# Upload a test image
gcloud storage cp test-photo.jpg gs://my-project-originals/photos/

# Check the resized bucket after a few seconds
gcloud storage ls gs://my-project-resized/photos/

# You should see:
# gs://my-project-resized/photos/test-photo-thumb.webp
# gs://my-project-resized/photos/test-photo-small.webp
# gs://my-project-resized/photos/test-photo-medium.webp
# gs://my-project-resized/photos/test-photo-large.webp
```

## Keeping the Original Format

If you want to keep the original format instead of converting to WebP, modify the resize logic:

```javascript
// Resize while keeping the original format
async function resizeKeepingFormat(imageBuffer, config, contentType) {
  let resizer = sharp(imageBuffer).resize({
    width: config.width,
    height: config.height,
    fit: config.fit,
    withoutEnlargement: true
  });

  // Apply format-specific optimization
  switch (contentType) {
    case 'image/jpeg':
      resizer = resizer.jpeg({ quality: 85, progressive: true });
      break;
    case 'image/png':
      resizer = resizer.png({ compressionLevel: 8 });
      break;
    case 'image/webp':
      resizer = resizer.webp({ quality: 80 });
      break;
    default:
      // Fall back to JPEG for unsupported formats
      resizer = resizer.jpeg({ quality: 85 });
  }

  return resizer.toBuffer();
}
```

## Handling Edge Cases

### Very Large Images

For images larger than the function's available memory, use streaming instead of loading the entire image into memory:

```javascript
// Stream-based approach for very large images
async function resizeLargeImage(bucket, filePath, config) {
  const readStream = storage.bucket(bucket).file(filePath).createReadStream();
  const resizedBucket = storage.bucket(RESIZED_BUCKET);
  const outputPath = buildOutputPath(filePath, config);

  const writeStream = resizedBucket.file(outputPath).createWriteStream({
    metadata: { contentType: 'image/webp' }
  });

  // Pipe through sharp transformer
  const transformer = sharp()
    .resize(config.width, config.height, { fit: config.fit })
    .webp({ quality: 80 });

  return new Promise((resolve, reject) => {
    readStream
      .pipe(transformer)
      .pipe(writeStream)
      .on('finish', resolve)
      .on('error', reject);
  });
}
```

### Animated GIFs

Sharp can handle animated GIFs, but you need to enable it explicitly:

```javascript
// Handle animated GIFs by preserving all frames
if (contentType === 'image/gif') {
  resizer = sharp(imageBuffer, { animated: true })
    .resize(config.width, config.height, { fit: config.fit })
    .gif();
}
```

### EXIF Rotation

Some images have EXIF rotation metadata that makes them appear rotated. Sharp handles this automatically by default with the `autoOrient` option:

```javascript
// Sharp auto-rotates based on EXIF by default
// This is explicitly shown for clarity
const resizedBuffer = await sharp(imageBuffer)
  .rotate() // Auto-rotate based on EXIF orientation
  .resize(config.width, config.height, { fit: config.fit })
  .webp({ quality: 80 })
  .toBuffer();
```

## Cost Optimization

Image resizing functions can get expensive if you process a high volume of images. Here are some tips:

- Set `--max-instances` to prevent runaway scaling
- Use `--cpu=1` unless you need parallel processing within a single invocation
- Consider batch processing: if images arrive in bursts, process them in batches using Pub/Sub instead of direct Storage triggers
- Delete originals after processing if you do not need them

## Monitoring

Set up monitoring with OneUptime to track your image processing pipeline. Key metrics to watch are function execution time (which correlates with image size), error rate (which might indicate corrupt images or memory limits), and the lag between upload time and resize completion. If processing times start creeping up, it usually means you are hitting memory limits and the function is swapping.

This pattern scales well from a few images per day to thousands per hour, all without managing any servers. The key is getting the memory allocation right and handling edge cases like oversized images and unsupported formats gracefully.
