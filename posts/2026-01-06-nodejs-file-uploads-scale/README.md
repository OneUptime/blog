# How to Handle File Uploads in Node.js at Scale

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Performance, API, Storage, DevOps

Description: Learn to handle file uploads at scale in Node.js with streaming, chunked uploads, S3 multipart uploads, and memory-efficient processing patterns.

---

File uploads are a common source of Node.js performance problems. Loading entire files into memory, blocking the event loop during processing, and not handling large files correctly can crash your application. This guide covers patterns for handling file uploads efficiently at any scale.

## The Problem with Naive Uploads

```javascript
// BAD: Loads entire file into memory
const multer = require('multer');
const upload = multer(); // memory storage

app.post('/upload', upload.single('file'), (req, res) => {
  // req.file.buffer contains entire file in memory
  // 100 concurrent uploads of 100MB files = 10GB memory
  processFile(req.file.buffer);
  res.json({ success: true });
});
```

## Streaming Uploads

### Basic Stream Processing

```javascript
const express = require('express');
const busboy = require('busboy');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();

app.post('/upload', (req, res) => {
  const bb = busboy({
    headers: req.headers,
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB limit
      files: 1, // Single file
    },
  });

  let uploadedFile = null;

  bb.on('file', (name, file, info) => {
    const { filename, mimeType } = info;

    // Generate unique filename
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(filename)}`;
    const savePath = path.join('/uploads', uniqueName);

    // Stream directly to disk
    const writeStream = fs.createWriteStream(savePath);

    file.pipe(writeStream);

    // Track progress
    let bytesReceived = 0;
    file.on('data', (data) => {
      bytesReceived += data.length;
    });

    file.on('limit', () => {
      // File too large, clean up
      writeStream.destroy();
      fs.unlink(savePath, () => {});
      res.status(413).json({ error: 'File too large' });
    });

    writeStream.on('finish', () => {
      uploadedFile = {
        filename: uniqueName,
        originalName: filename,
        mimeType,
        size: bytesReceived,
        path: savePath,
      };
    });

    writeStream.on('error', (err) => {
      console.error('Write error:', err);
      res.status(500).json({ error: 'Upload failed' });
    });
  });

  bb.on('finish', () => {
    if (uploadedFile) {
      res.json(uploadedFile);
    }
  });

  bb.on('error', (err) => {
    console.error('Busboy error:', err);
    res.status(500).json({ error: 'Upload failed' });
  });

  req.pipe(bb);
});
```

### Streaming to S3

```javascript
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { PassThrough } = require('stream');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
});

app.post('/upload/s3', async (req, res) => {
  const bb = busboy({ headers: req.headers });

  bb.on('file', async (name, file, info) => {
    const { filename, mimeType } = info;
    const key = `uploads/${Date.now()}-${filename}`;

    // Create pass-through stream
    const passThrough = new PassThrough();

    // Start S3 multipart upload
    const upload = new Upload({
      client: s3,
      params: {
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: passThrough,
        ContentType: mimeType,
      },
      queueSize: 4, // Concurrent part uploads
      partSize: 5 * 1024 * 1024, // 5MB parts
      leavePartsOnError: false,
    });

    // Track progress
    upload.on('httpUploadProgress', (progress) => {
      console.log(`Uploaded ${progress.loaded} of ${progress.total || 'unknown'} bytes`);
    });

    // Pipe file to S3
    file.pipe(passThrough);

    try {
      await upload.done();
      res.json({
        key,
        url: `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`,
      });
    } catch (error) {
      console.error('S3 upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  req.pipe(bb);
});
```

## Chunked Uploads

For very large files, upload in chunks that can be resumed:

### Frontend Chunk Upload

```javascript
// client.js
async function uploadFileInChunks(file, onProgress) {
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  // Initialize upload
  const { uploadId } = await fetch('/upload/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      fileSize: file.size,
      mimeType: file.type,
      totalChunks,
    }),
  }).then(r => r.json());

  // Upload chunks
  const uploadedParts = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('uploadId', uploadId);
    formData.append('partNumber', i + 1);

    const result = await fetch('/upload/chunk', {
      method: 'POST',
      body: formData,
    }).then(r => r.json());

    uploadedParts.push({
      partNumber: i + 1,
      etag: result.etag,
    });

    onProgress?.((i + 1) / totalChunks * 100);
  }

  // Complete upload
  return fetch('/upload/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uploadId,
      parts: uploadedParts,
    }),
  }).then(r => r.json());
}
```

### Backend Chunked Upload

```javascript
const { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');

const s3 = new S3Client({ region: process.env.AWS_REGION });
const upload = multer({ storage: multer.memoryStorage() });

// Store upload state (use Redis in production)
const uploads = new Map();

// Initialize multipart upload
app.post('/upload/init', async (req, res) => {
  const { filename, fileSize, mimeType, totalChunks } = req.body;
  const key = `uploads/${Date.now()}-${filename}`;

  const command = new CreateMultipartUploadCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: mimeType,
  });

  const { UploadId } = await s3.send(command);

  uploads.set(UploadId, {
    key,
    filename,
    fileSize,
    totalChunks,
    parts: [],
    createdAt: Date.now(),
  });

  res.json({ uploadId: UploadId });
});

// Upload chunk
app.post('/upload/chunk', upload.single('chunk'), async (req, res) => {
  const { uploadId, partNumber } = req.body;
  const uploadState = uploads.get(uploadId);

  if (!uploadState) {
    return res.status(404).json({ error: 'Upload not found' });
  }

  const command = new UploadPartCommand({
    Bucket: process.env.S3_BUCKET,
    Key: uploadState.key,
    UploadId: uploadId,
    PartNumber: parseInt(partNumber),
    Body: req.file.buffer,
  });

  const { ETag } = await s3.send(command);

  uploadState.parts.push({
    PartNumber: parseInt(partNumber),
    ETag,
  });

  res.json({ etag: ETag });
});

// Complete upload
app.post('/upload/complete', async (req, res) => {
  const { uploadId, parts } = req.body;
  const uploadState = uploads.get(uploadId);

  if (!uploadState) {
    return res.status(404).json({ error: 'Upload not found' });
  }

  const command = new CompleteMultipartUploadCommand({
    Bucket: process.env.S3_BUCKET,
    Key: uploadState.key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts.sort((a, b) => a.partNumber - b.partNumber).map(p => ({
        PartNumber: p.partNumber,
        ETag: p.etag,
      })),
    },
  });

  await s3.send(command);

  uploads.delete(uploadId);

  res.json({
    key: uploadState.key,
    url: `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${uploadState.key}`,
  });
});

// Abort failed upload
app.post('/upload/abort', async (req, res) => {
  const { uploadId } = req.body;
  const uploadState = uploads.get(uploadId);

  if (uploadState) {
    const command = new AbortMultipartUploadCommand({
      Bucket: process.env.S3_BUCKET,
      Key: uploadState.key,
      UploadId: uploadId,
    });

    await s3.send(command);
    uploads.delete(uploadId);
  }

  res.json({ success: true });
});
```

## Processing Uploads with Streams

### Image Processing

```javascript
const sharp = require('sharp');
const { PassThrough } = require('stream');

app.post('/upload/image', (req, res) => {
  const bb = busboy({
    headers: req.headers,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for images
  });

  bb.on('file', async (name, file, info) => {
    // Create transform pipeline
    const transformer = sharp()
      .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 });

    // Create thumbnail pipeline
    const thumbnailTransformer = sharp()
      .resize(200, 200, { fit: 'cover' })
      .jpeg({ quality: 70 });

    // Fork the stream
    const mainStream = new PassThrough();
    const thumbStream = new PassThrough();

    file.pipe(mainStream);
    file.pipe(thumbStream);

    const mainKey = `images/${Date.now()}-main.jpg`;
    const thumbKey = `images/${Date.now()}-thumb.jpg`;

    try {
      // Upload both in parallel
      await Promise.all([
        uploadToS3(mainStream.pipe(transformer), mainKey),
        uploadToS3(thumbStream.pipe(thumbnailTransformer), thumbKey),
      ]);

      res.json({
        main: mainKey,
        thumbnail: thumbKey,
      });
    } catch (error) {
      console.error('Processing error:', error);
      res.status(500).json({ error: 'Processing failed' });
    }
  });

  req.pipe(bb);
});

async function uploadToS3(stream, key) {
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: stream,
    },
  });

  return upload.done();
}
```

### Video Processing

For video, process asynchronously:

```javascript
const Queue = require('bull');

const videoQueue = new Queue('video-processing', process.env.REDIS_URL);

app.post('/upload/video', (req, res) => {
  const bb = busboy({
    headers: req.headers,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  });

  bb.on('file', async (name, file, info) => {
    const key = `videos/raw/${Date.now()}-${info.filename}`;

    // Upload raw video to S3
    const upload = new Upload({
      client: s3,
      params: {
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: file,
        ContentType: info.mimeType,
      },
    });

    await upload.done();

    // Queue for processing
    const job = await videoQueue.add({
      sourceKey: key,
      filename: info.filename,
    });

    res.json({
      jobId: job.id,
      status: 'processing',
      statusUrl: `/upload/status/${job.id}`,
    });
  });

  req.pipe(bb);
});

// Check processing status
app.get('/upload/status/:jobId', async (req, res) => {
  const job = await videoQueue.getJob(req.params.jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const state = await job.getState();
  const progress = job.progress();

  res.json({
    state,
    progress,
    result: state === 'completed' ? job.returnvalue : null,
    error: state === 'failed' ? job.failedReason : null,
  });
});
```

## Memory-Efficient Large File Handling

### Hash Files Without Loading into Memory

```javascript
const crypto = require('crypto');
const fs = require('fs');

function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}
```

### Validate File Type by Magic Bytes

```javascript
const fileType = require('file-type');

app.post('/upload', (req, res) => {
  const bb = busboy({ headers: req.headers });
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

  bb.on('file', async (name, file, info) => {
    // Buffer first 4100 bytes to detect file type
    const chunks = [];
    let bytesRead = 0;
    let detectedType = null;

    for await (const chunk of file) {
      if (bytesRead < 4100) {
        chunks.push(chunk.slice(0, 4100 - bytesRead));
        bytesRead += chunk.length;

        if (bytesRead >= 4100 && !detectedType) {
          const buffer = Buffer.concat(chunks);
          detectedType = await fileType.fromBuffer(buffer);

          if (!detectedType || !allowedTypes.includes(detectedType.mime)) {
            file.resume(); // Drain stream
            return res.status(400).json({
              error: 'Invalid file type',
              detected: detectedType?.mime,
            });
          }
        }
      }

      // Process chunk (write to disk/S3)
    }
  });

  req.pipe(bb);
});
```

## Upload Progress Tracking

### Server-Sent Events Progress

```javascript
// Upload with progress tracking
app.post('/upload/progress', (req, res) => {
  const uploadId = crypto.randomUUID();

  // Store SSE connection for progress updates
  const bb = busboy({ headers: req.headers });
  let totalBytes = parseInt(req.headers['content-length']) || 0;
  let uploadedBytes = 0;

  bb.on('file', (name, file, info) => {
    const writeStream = fs.createWriteStream(`/uploads/${uploadId}`);

    file.on('data', (chunk) => {
      uploadedBytes += chunk.length;

      // Store progress (use Redis for distributed systems)
      uploadProgress.set(uploadId, {
        uploaded: uploadedBytes,
        total: totalBytes,
        percent: Math.round((uploadedBytes / totalBytes) * 100),
      });
    });

    file.pipe(writeStream);

    writeStream.on('finish', () => {
      uploadProgress.set(uploadId, { complete: true });
    });
  });

  req.pipe(bb);

  res.json({ uploadId });
});

// SSE endpoint for progress
app.get('/upload/progress/:id', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const interval = setInterval(() => {
    const progress = uploadProgress.get(req.params.id);

    if (progress) {
      res.write(`data: ${JSON.stringify(progress)}\n\n`);

      if (progress.complete) {
        clearInterval(interval);
        res.end();
      }
    }
  }, 100);

  req.on('close', () => {
    clearInterval(interval);
  });
});
```

## Security Best Practices

```javascript
const path = require('path');

// Validation middleware
function validateUpload(options = {}) {
  const {
    maxSize = 10 * 1024 * 1024,
    allowedTypes = [],
    allowedExtensions = [],
  } = options;

  return (req, res, next) => {
    // Check content length
    const contentLength = parseInt(req.headers['content-length']);
    if (contentLength > maxSize) {
      return res.status(413).json({ error: 'File too large' });
    }

    // Check content type
    const contentType = req.headers['content-type'];
    if (allowedTypes.length && !allowedTypes.some(t => contentType.includes(t))) {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    next();
  };
}

// Sanitize filename
function sanitizeFilename(filename) {
  // Remove path components
  const base = path.basename(filename);

  // Remove special characters
  return base
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.+/g, '.')
    .slice(0, 255);
}

// Generate safe storage path
function getStoragePath(filename, userId) {
  const sanitized = sanitizeFilename(filename);
  const hash = crypto.randomBytes(8).toString('hex');

  // Distribute files across directories
  const prefix = hash.slice(0, 2);

  return `${userId}/${prefix}/${hash}-${sanitized}`;
}
```

## Summary

| Technique | Use Case | Memory Usage |
|-----------|----------|--------------|
| **Buffer upload** | Small files < 1MB | High |
| **Stream to disk** | Medium files | Low |
| **Stream to S3** | Any size | Low |
| **Chunked upload** | Large files, resumable | Low |
| **Background processing** | Video, transforms | Deferred |

File uploads at scale require streaming, proper limits, and async processing. By avoiding memory buffers and using streams throughout, your Node.js application can handle many concurrent uploads without memory issues.
