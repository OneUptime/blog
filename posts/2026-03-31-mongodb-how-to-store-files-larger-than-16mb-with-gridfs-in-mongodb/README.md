# How to Store Files Larger Than 16MB with GridFS in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, GridFS, File Storage, Binary Data, Large File

Description: Use MongoDB GridFS to store and retrieve files larger than 16MB by splitting them into chunks stored across two collections in MongoDB.

---

## Why GridFS?

MongoDB documents have a 16MB size limit. GridFS is a specification for storing files of any size by splitting them into smaller chunks (default 255KB each) and storing the chunks in a collection. Metadata about the file is stored in a separate collection.

GridFS is built into the MongoDB drivers - no additional software needed.

## GridFS Collections

GridFS uses two collections (by default in the `fs` bucket):
- **`fs.files`**: File metadata (filename, size, contentType, uploadDate, custom metadata)
- **`fs.chunks`**: Binary chunks of file data

## When to Use GridFS vs. External Storage

| Use GridFS when | Use S3/GCS when |
|---|---|
| Files are accessed with MongoDB queries | Files accessed via URL/CDN |
| Metadata-driven file retrieval | Very large files (> 1GB) |
| Atomic file + metadata updates | High-frequency streaming |
| You need transactions | Public file serving |

## Step 1: Upload a File with GridFS (Node.js)

```javascript
const { MongoClient, GridFSBucket } = require('mongodb');
const fs = require('fs');
const path = require('path');

async function uploadFile(localPath, filename) {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const db = client.db('myapp');
  const bucket = new GridFSBucket(db, {
    bucketName: 'uploads',   // Optional - defaults to 'fs'
    chunkSizeBytes: 261120   // Optional - defaults to 255KB
  });

  const uploadStream = bucket.openUploadStream(filename, {
    contentType: 'video/mp4',
    metadata: {
      uploadedBy: 'user123',
      category: 'video'
    }
  });

  const readStream = fs.createReadStream(localPath);

  await new Promise((resolve, reject) => {
    readStream.pipe(uploadStream)
      .on('finish', resolve)
      .on('error', reject);
  });

  console.log(`File uploaded with ID: ${uploadStream.id}`);
  await client.close();

  return uploadStream.id;
}

// Upload a large video file
uploadFile('/path/to/large-video.mp4', 'large-video.mp4');
```

## Step 2: Upload from a Buffer

```javascript
async function uploadBuffer(buffer, filename, contentType) {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const db = client.db('myapp');
  const bucket = new GridFSBucket(db);

  const uploadStream = bucket.openUploadStream(filename, { contentType });

  await new Promise((resolve, reject) => {
    uploadStream.on('finish', resolve);
    uploadStream.on('error', reject);
    uploadStream.end(buffer);
  });

  await client.close();
  return uploadStream.id;
}
```

## Step 3: Download a File by ID

```javascript
const { ObjectId } = require('mongodb');

async function downloadFile(fileId, outputPath) {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const db = client.db('myapp');
  const bucket = new GridFSBucket(db);

  const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
  const writeStream = fs.createWriteStream(outputPath);

  await new Promise((resolve, reject) => {
    downloadStream.pipe(writeStream)
      .on('finish', resolve)
      .on('error', reject);
  });

  console.log(`File downloaded to ${outputPath}`);
  await client.close();
}

downloadFile('507f1f77bcf86cd799439011', '/tmp/downloaded-video.mp4');
```

## Step 4: Download by Filename

```javascript
async function downloadByFilename(filename, outputPath) {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const db = client.db('myapp');
  const bucket = new GridFSBucket(db);

  // Download the most recent revision by filename
  const downloadStream = bucket.openDownloadStreamByName(filename);
  const writeStream = fs.createWriteStream(outputPath);

  await new Promise((resolve, reject) => {
    downloadStream.pipe(writeStream)
      .on('finish', resolve)
      .on('error', reject);
  });

  await client.close();
}
```

## Step 5: Express.js File Upload/Download API

```javascript
const express = require('express');
const multer = require('multer');
const { MongoClient, GridFSBucket, ObjectId } = require('mongodb');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

let bucket;

async function connectDB() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('myapp');
  bucket = new GridFSBucket(db, { bucketName: 'uploads' });
}

// Upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  const uploadStream = bucket.openUploadStream(req.file.originalname, {
    contentType: req.file.mimetype,
    metadata: { uploadedBy: req.headers['user-id'] }
  });

  uploadStream.end(req.file.buffer);

  uploadStream.on('finish', () => {
    res.json({ fileId: uploadStream.id, filename: req.file.originalname });
  });

  uploadStream.on('error', (err) => {
    res.status(500).json({ error: err.message });
  });
});

// Download endpoint
app.get('/files/:fileId', async (req, res) => {
  try {
    const fileId = new ObjectId(req.params.fileId);
    const files = await bucket.find({ _id: fileId }).toArray();

    if (!files.length) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.set('Content-Type', files[0].contentType);
    res.set('Content-Disposition', `attachment; filename="${files[0].filename}"`);

    bucket.openDownloadStream(fileId).pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

connectDB().then(() => app.listen(3000));
```

## Step 6: List Files in GridFS

```javascript
async function listFiles() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const db = client.db('myapp');
  const bucket = new GridFSBucket(db, { bucketName: 'uploads' });

  const files = await bucket.find({}).toArray();
  files.forEach(f => {
    console.log(`${f.filename} (${(f.length / 1024 / 1024).toFixed(1)} MB) - ${f.uploadDate}`);
  });

  await client.close();
}
```

## Step 7: Delete a File

```javascript
async function deleteFile(fileId) {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const db = client.db('myapp');
  const bucket = new GridFSBucket(db, { bucketName: 'uploads' });

  await bucket.delete(new ObjectId(fileId));
  console.log(`Deleted file ${fileId}`);

  await client.close();
}
```

## Summary

GridFS splits files into 255KB chunks stored in two collections: metadata in `fs.files` and binary data in `fs.chunks`. Use the `GridFSBucket` class in MongoDB drivers to open upload/download streams, pipe file data to/from GridFS, and manage files with list and delete operations. GridFS is ideal when you need to store files alongside MongoDB metadata and query files by their properties using standard MongoDB queries.
