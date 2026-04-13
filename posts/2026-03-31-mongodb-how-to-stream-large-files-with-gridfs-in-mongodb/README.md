# How to Stream Large Files with GridFS in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, GridFS, Streaming, Large File, Node.js

Description: Stream large files directly from MongoDB GridFS to HTTP responses or other destinations without loading entire files into memory.

---

## Why Streaming Matters

Without streaming, downloading a 500MB file from GridFS would load the entire file into Node.js memory before sending it to the client. Streaming reads and sends data chunk by chunk, keeping memory usage constant regardless of file size.

## GridFS Download Stream

`bucket.openDownloadStream()` returns a Node.js Readable stream. You can pipe it directly to any Writable stream.

## Step 1: Stream a File to an HTTP Response

```javascript
const express = require('express');
const { MongoClient, GridFSBucket, ObjectId } = require('mongodb');

const app = express();
let bucket;

async function connect() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  bucket = new GridFSBucket(client.db('myapp'), { bucketName: 'uploads' });
}

app.get('/stream/:fileId', async (req, res) => {
  try {
    const fileId = new ObjectId(req.params.fileId);

    // Get file metadata first
    const files = await bucket.find({ _id: fileId }).toArray();
    if (!files.length) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = files[0];

    // Set response headers
    res.set('Content-Type', file.contentType || 'application/octet-stream');
    res.set('Content-Length', file.length);
    res.set('Content-Disposition', `inline; filename="${file.filename}"`);

    // Stream directly to response - no memory buffering
    const downloadStream = bucket.openDownloadStream(fileId);

    downloadStream.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream failed' });
      }
    });

    downloadStream.pipe(res);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

connect().then(() => app.listen(3000));
```

## Step 2: HTTP Range Requests (Video/Audio Seeking)

Support browser media players that request byte ranges for video seeking:

```javascript
app.get('/video/:fileId', async (req, res) => {
  const fileId = new ObjectId(req.params.fileId);
  const files = await bucket.find({ _id: fileId }).toArray();

  if (!files.length) return res.status(404).send('Not found');

  const file = files[0];
  const fileSize = file.length;
  const rangeHeader = req.headers.range;

  if (rangeHeader) {
    // Parse range: "bytes=start-end"
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 1048576, fileSize - 1);
    const chunkSize = end - start + 1;

    res.status(206);
    res.set({
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4'
    });

    // Stream only the requested byte range
    bucket.openDownloadStream(fileId, { start, end: end + 1 }).pipe(res);

  } else {
    // No range header - stream entire file
    res.set({
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes'
    });

    bucket.openDownloadStream(fileId).pipe(res);
  }
});
```

## Step 3: Stream Upload from HTTP Request

Stream an incoming file upload directly to GridFS without buffering:

```javascript
const busboy = require('busboy');

app.post('/upload-stream', (req, res) => {
  const bb = busboy({ headers: req.headers });

  bb.on('file', (fieldname, fileStream, info) => {
    const { filename, mimeType } = info;

    const uploadStream = bucket.openUploadStream(filename, {
      contentType: mimeType
    });

    // Pipe incoming HTTP data directly to GridFS
    fileStream.pipe(uploadStream);

    uploadStream.on('finish', () => {
      res.json({
        message: 'Upload complete',
        fileId: uploadStream.id.toString(),
        filename
      });
    });

    uploadStream.on('error', (err) => {
      res.status(500).json({ error: err.message });
    });
  });

  req.pipe(bb);
});
```

## Step 4: Stream Between GridFS and S3

Copy files from GridFS to S3 without loading into memory:

```javascript
const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

async function gridFSToS3(fileId, s3Bucket, s3Key) {
  const s3 = new S3Client({ region: 'us-east-1' });

  const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: s3Bucket,
      Key: s3Key,
      Body: downloadStream
    },
    queueSize: 4,
    partSize: 5 * 1024 * 1024  // 5MB parts
  });

  upload.on('httpUploadProgress', (progress) => {
    console.log(`Uploaded ${progress.loaded} bytes`);
  });

  await upload.done();
  console.log(`File copied to s3://${s3Bucket}/${s3Key}`);
}
```

## Step 5: Transform While Streaming

Apply transformations using Node.js Transform streams:

```javascript
const zlib = require('zlib');

app.get('/download-compressed/:fileId', async (req, res) => {
  const fileId = new ObjectId(req.params.fileId);
  const files = await bucket.find({ _id: fileId }).toArray();

  if (!files.length) return res.status(404).send('Not found');

  res.set('Content-Type', 'application/gzip');
  res.set('Content-Disposition', `attachment; filename="${files[0].filename}.gz"`);

  // Download stream -> gzip compression -> HTTP response
  bucket.openDownloadStream(fileId)
    .pipe(zlib.createGzip())
    .pipe(res);
});
```

## Step 6: Track Streaming Progress

```javascript
const fs = require('fs');

async function downloadWithProgress(fileId, outputPath) {
  const files = await bucket.find({ _id: new ObjectId(fileId) }).toArray();
  const totalSize = files[0].length;
  let downloaded = 0;

  const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
  const writeStream = fs.createWriteStream(outputPath);

  downloadStream.on('data', (chunk) => {
    downloaded += chunk.length;
    const pct = ((downloaded / totalSize) * 100).toFixed(1);
    process.stdout.write(`\rDownloading: ${pct}%`);
  });

  downloadStream.pipe(writeStream);

  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    downloadStream.on('error', reject);
  });

  console.log('\nDownload complete');
}
```

## Summary

GridFS download streams pipe file data chunk by chunk from MongoDB to the destination without loading entire files into memory. Stream directly to HTTP responses for instant delivery, implement byte-range support for video seeking, stream uploads directly from HTTP requests to GridFS to avoid memory spikes, and chain with Node.js Transform streams for on-the-fly compression or processing. Memory usage stays constant regardless of file size when using streaming correctly.
