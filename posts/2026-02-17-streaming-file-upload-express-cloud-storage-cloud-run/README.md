# How to Build a Streaming File Upload API with Express.js and Cloud Storage on Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Storage, Cloud Run, Express, Node.js, File Upload, Google Cloud

Description: Build a streaming file upload API using Express.js that pipes uploaded files directly to Google Cloud Storage without buffering in memory on Cloud Run.

---

Handling file uploads in a web application is a common requirement, but doing it efficiently on a serverless platform like Cloud Run requires some thought. The naive approach - buffering the entire file in memory before uploading to Cloud Storage - works for small files but falls apart when users upload large videos, datasets, or archives. Your Cloud Run instance could run out of memory, and you are paying for that memory the entire time.

A better approach is to stream the upload directly from the HTTP request to Cloud Storage without ever holding the entire file in memory. In this post, I will show you how to build a streaming upload API with Express.js that runs efficiently on Cloud Run.

## Why Streaming Matters

Consider what happens with a traditional buffered upload:

1. Client sends a 500MB file
2. Express receives and buffers the entire file in memory (500MB memory used)
3. Your code then uploads the buffer to Cloud Storage (another copy in flight)
4. Memory is released after the upload completes

With streaming:

1. Client sends a 500MB file
2. Express pipes the incoming stream directly to Cloud Storage
3. At any given moment, only a small buffer (typically 16KB-64KB) is in memory

This means you can handle gigabyte-sized uploads on a Cloud Run instance with only 256MB of memory.

## Project Setup

```bash
# Initialize the project
mkdir streaming-upload && cd streaming-upload
npm init -y
npm install express @google-cloud/storage busboy
```

We are using `busboy` instead of `multer` because busboy gives us direct access to the file stream without buffering. Multer stores files to disk or memory by default, which defeats the purpose of streaming.

## Building the Streaming Upload Handler

```javascript
// app.js - Streaming file upload to Cloud Storage
const express = require('express');
const { Storage } = require('@google-cloud/storage');
const Busboy = require('busboy');
const path = require('path');
const crypto = require('crypto');

const app = express();

// Initialize Cloud Storage
const storage = new Storage();
const BUCKET_NAME = process.env.BUCKET_NAME || 'your-upload-bucket';
const bucket = storage.bucket(BUCKET_NAME);

// Streaming upload endpoint
app.post('/upload', (req, res) => {
  // Validate content type
  const contentType = req.headers['content-type'];
  if (!contentType || !contentType.includes('multipart/form-data')) {
    return res.status(400).json({ error: 'Content-Type must be multipart/form-data' });
  }

  // Initialize busboy to parse the multipart request
  const busboy = Busboy({
    headers: req.headers,
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB max file size
      files: 1, // Only allow 1 file per request
    },
  });

  let uploadResult = null;
  let hadError = false;

  // Handle file stream from the multipart request
  busboy.on('file', (fieldname, fileStream, info) => {
    const { filename, mimeType } = info;

    // Generate a unique filename to prevent collisions
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(filename);
    const destFileName = `uploads/${uniqueId}${extension}`;

    console.log(`Streaming upload: ${filename} -> ${destFileName}`);

    // Create a write stream to Cloud Storage
    const gcsFile = bucket.file(destFileName);
    const writeStream = gcsFile.createWriteStream({
      metadata: {
        contentType: mimeType,
        metadata: {
          originalName: filename,
          uploadedAt: new Date().toISOString(),
        },
      },
      resumable: false, // Disable resumable uploads for smaller files
    });

    // Pipe the incoming file stream directly to Cloud Storage
    // No buffering - data flows from client to GCS in small chunks
    fileStream.pipe(writeStream);

    // Handle the file stream limit being reached
    fileStream.on('limit', () => {
      hadError = true;
      writeStream.destroy();
      gcsFile.delete().catch(() => {});
      res.status(413).json({ error: 'File too large' });
    });

    // Handle write stream errors
    writeStream.on('error', (error) => {
      hadError = true;
      console.error('Upload stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Upload failed' });
      }
    });

    // Handle successful upload completion
    writeStream.on('finish', () => {
      uploadResult = {
        filename: destFileName,
        originalName: filename,
        contentType: mimeType,
        bucket: BUCKET_NAME,
        url: `gs://${BUCKET_NAME}/${destFileName}`,
      };
    });
  });

  // Handle busboy completion (all parts parsed)
  busboy.on('finish', () => {
    if (hadError) return;

    if (uploadResult) {
      console.log('Upload complete:', uploadResult.filename);
      res.json(uploadResult);
    } else {
      res.status(400).json({ error: 'No file provided' });
    }
  });

  // Handle busboy errors
  busboy.on('error', (error) => {
    console.error('Busboy error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Upload parsing failed' });
    }
  });

  // Pipe the Express request stream into busboy
  req.pipe(busboy);
});
```

The key line is `fileStream.pipe(writeStream)`. This connects the incoming HTTP stream directly to the Cloud Storage write stream. Node.js handles the backpressure automatically - if Cloud Storage is slower than the client's upload speed, Node.js will pause reading from the client until the write stream catches up.

## Handling Multiple File Uploads

If you need to support multiple files in a single request, expand the handler to track multiple uploads.

```javascript
// Handle multiple file uploads in a single request
app.post('/upload-multiple', (req, res) => {
  const busboy = Busboy({
    headers: req.headers,
    limits: {
      fileSize: 50 * 1024 * 1024,  // 50MB per file
      files: 5,                     // Max 5 files
    },
  });

  const uploads = [];
  const uploadPromises = [];

  busboy.on('file', (fieldname, fileStream, info) => {
    const { filename, mimeType } = info;
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const destFileName = `uploads/${uniqueId}-${filename}`;

    const gcsFile = bucket.file(destFileName);
    const writeStream = gcsFile.createWriteStream({
      metadata: { contentType: mimeType },
      resumable: false,
    });

    // Track each upload as a promise
    const uploadPromise = new Promise((resolve, reject) => {
      fileStream.pipe(writeStream);

      writeStream.on('finish', () => {
        resolve({
          filename: destFileName,
          originalName: filename,
          contentType: mimeType,
        });
      });

      writeStream.on('error', reject);
    });

    uploadPromises.push(uploadPromise);
  });

  busboy.on('finish', async () => {
    try {
      const results = await Promise.all(uploadPromises);
      res.json({ uploads: results });
    } catch (error) {
      console.error('Multi-upload failed:', error);
      res.status(500).json({ error: 'One or more uploads failed' });
    }
  });

  req.pipe(busboy);
});
```

## Adding Upload Progress Tracking

You can track upload progress by monitoring the bytes flowing through the stream.

```javascript
// Track upload progress with a transform stream
const { Transform } = require('stream');

function createProgressTracker(totalSize, onProgress) {
  let bytesUploaded = 0;

  return new Transform({
    transform(chunk, encoding, callback) {
      bytesUploaded += chunk.length;
      const percent = totalSize
        ? Math.round((bytesUploaded / totalSize) * 100)
        : null;

      onProgress({ bytesUploaded, totalSize, percent });

      // Pass the chunk through unchanged
      callback(null, chunk);
    },
  });
}

// Usage in the upload handler
busboy.on('file', (fieldname, fileStream, info) => {
  const totalSize = parseInt(req.headers['content-length'] || '0');

  const progressTracker = createProgressTracker(totalSize, (progress) => {
    console.log(`Upload progress: ${progress.bytesUploaded} bytes (${progress.percent}%)`);
  });

  // Chain: fileStream -> progressTracker -> writeStream
  fileStream.pipe(progressTracker).pipe(writeStream);
});
```

## Generating Signed URLs for Uploaded Files

After uploading, you often want to give the client a URL to access the file.

```javascript
// Generate a signed URL for the uploaded file
app.get('/files/:filename/url', async (req, res) => {
  const { filename } = req.params;
  const file = bucket.file(`uploads/${filename}`);

  try {
    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Generate a signed URL valid for 1 hour
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000,
    });

    res.json({ url: signedUrl });
  } catch (error) {
    console.error('Failed to generate signed URL:', error);
    res.status(500).json({ error: 'Failed to generate URL' });
  }
});
```

## Cloud Run Configuration

Deploy with settings optimized for file uploads.

```bash
# Deploy with increased timeout and memory for file processing
gcloud run deploy upload-service \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 256Mi \
  --timeout 300 \
  --concurrency 10 \
  --set-env-vars "BUCKET_NAME=your-upload-bucket" \
  --max-instances 20
```

Key settings:

- `--timeout 300`: Allow up to 5 minutes for large file uploads
- `--memory 256Mi`: Streaming means we do not need much memory
- `--concurrency 10`: Handle multiple concurrent uploads per instance

## Testing the Upload

```bash
# Upload a file using curl
curl -X POST http://localhost:8080/upload \
  -F "file=@./large-video.mp4"

# Upload multiple files
curl -X POST http://localhost:8080/upload-multiple \
  -F "files=@./photo1.jpg" \
  -F "files=@./photo2.jpg"
```

## Starting the Server

```javascript
// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Upload service listening on port ${PORT}`);
});
```

Streaming uploads are the right approach any time you are dealing with files larger than a few megabytes, especially on memory-constrained platforms like Cloud Run. By piping the request stream directly to Cloud Storage, you keep memory usage constant regardless of file size, handle concurrent uploads efficiently, and avoid the risk of running out of memory during peak traffic.
