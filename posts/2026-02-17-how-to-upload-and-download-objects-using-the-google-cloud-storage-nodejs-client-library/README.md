# How to Upload and Download Objects Using the Google Cloud Storage Node.js Client Library

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Storage, Node.js, JavaScript, Cloud Development

Description: A hands-on guide to uploading and downloading objects in Google Cloud Storage using the Node.js client library with production-ready code examples.

---

The Google Cloud Storage Node.js client library is what most JavaScript and TypeScript developers reach for when working with GCS. It wraps the REST API into a clean, promise-based interface that fits naturally into async/await code. Whether you are building an Express API that handles file uploads, a serverless function that processes data, or a CLI tool for batch operations, this library has you covered.

This guide walks through uploading and downloading objects with examples you can drop into your projects.

## Installation and Setup

Install the package:

```bash
# Install the Google Cloud Storage Node.js client
npm install @google-cloud/storage
```

For authentication in development:

```bash
# Set up local credentials
gcloud auth application-default login
```

In production environments like Cloud Run, GKE, or Cloud Functions, credentials are injected automatically.

## Initializing the Client

```javascript
const { Storage } = require('@google-cloud/storage');

// Uses Application Default Credentials automatically
const storage = new Storage();

// Or specify a project explicitly
const storageWithProject = new Storage({
  projectId: 'my-project-id',
});

// Or use a service account key file
const storageWithKey = new Storage({
  keyFilename: './service-account-key.json',
});
```

## Uploading Files

### Upload a Local File

The most straightforward upload - sending a file from disk to a bucket:

```javascript
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();

async function uploadFile(bucketName, filePath, destination) {
  // Upload the file to the specified destination in the bucket
  await storage.bucket(bucketName).upload(filePath, {
    destination: destination,
  });

  console.log(`Uploaded ${filePath} to gs://${bucketName}/${destination}`);
}

// Usage
uploadFile('my-bucket', '/tmp/report.pdf', 'reports/2026/february-report.pdf');
```

### Upload with Metadata

Attach custom metadata to track file origins, processing status, or any other information:

```javascript
async function uploadWithMetadata(bucketName, filePath, destination) {
  // Upload with content type and custom metadata
  await storage.bucket(bucketName).upload(filePath, {
    destination: destination,
    metadata: {
      contentType: 'application/pdf',
      metadata: {
        // Custom metadata fields go here
        uploadedBy: 'api-service',
        sourceSystem: 'crm',
        version: '2',
      },
    },
  });

  console.log(`Uploaded with metadata to ${destination}`);
}

uploadWithMetadata('my-bucket', '/tmp/invoice.pdf', 'invoices/inv-2026-001.pdf');
```

### Upload a String or Buffer

When your data is already in memory, you do not need to write it to a file first:

```javascript
async function uploadString(bucketName, content, destination, contentType) {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(destination);

  // Save string content directly to GCS
  await file.save(content, {
    contentType: contentType || 'text/plain',
  });

  console.log(`Uploaded string to gs://${bucketName}/${destination}`);
}

// Upload JSON data
const data = { users: 150, timestamp: new Date().toISOString() };
uploadString(
  'my-bucket',
  JSON.stringify(data, null, 2),
  'data/stats.json',
  'application/json'
);

// Upload a buffer
async function uploadBuffer(bucketName, buffer, destination) {
  const file = storage.bucket(bucketName).file(destination);

  // Save buffer content directly
  await file.save(buffer, {
    contentType: 'application/octet-stream',
  });

  console.log(`Uploaded buffer to ${destination}`);
}
```

### Streaming Upload

For large files or data coming from another stream (like an HTTP request):

```javascript
const fs = require('fs');

async function streamUpload(bucketName, localFilePath, destination) {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(destination);

  return new Promise((resolve, reject) => {
    // Create a write stream to GCS
    const writeStream = file.createWriteStream({
      resumable: true,
      contentType: 'application/octet-stream',
    });

    // Pipe the local file into the GCS write stream
    fs.createReadStream(localFilePath)
      .pipe(writeStream)
      .on('error', (err) => {
        console.error('Upload failed:', err);
        reject(err);
      })
      .on('finish', () => {
        console.log(`Stream upload complete: ${destination}`);
        resolve();
      });
  });
}

streamUpload('my-bucket', '/tmp/large-file.zip', 'uploads/large-file.zip');
```

### Upload from an Express Request

A common pattern in web applications - handling file uploads and storing them in GCS:

```javascript
const express = require('express');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const { v4: uuidv4 } = require('uuid');

const app = express();
const storage = new Storage();
const upload = multer({ storage: multer.memoryStorage() });

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  // Generate a unique filename to avoid collisions
  const uniqueName = `uploads/${uuidv4()}-${req.file.originalname}`;
  const bucket = storage.bucket('my-upload-bucket');
  const blob = bucket.file(uniqueName);

  try {
    // Save the uploaded file buffer to GCS
    await blob.save(req.file.buffer, {
      contentType: req.file.mimetype,
      metadata: {
        metadata: {
          originalName: req.file.originalname,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    res.json({
      message: 'Upload successful',
      path: uniqueName,
      size: req.file.size,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});
```

## Downloading Files

### Download to a Local File

```javascript
async function downloadFile(bucketName, srcFileName, destFilePath) {
  // Download the file to the specified local path
  await storage.bucket(bucketName).file(srcFileName).download({
    destination: destFilePath,
  });

  console.log(`Downloaded gs://${bucketName}/${srcFileName} to ${destFilePath}`);
}

downloadFile('my-bucket', 'reports/2026/february-report.pdf', '/tmp/report.pdf');
```

### Download as a Buffer

For processing files in memory:

```javascript
async function downloadAsBuffer(bucketName, fileName) {
  // Download the file contents into a buffer
  const [contents] = await storage
    .bucket(bucketName)
    .file(fileName)
    .download();

  console.log(`Downloaded ${contents.length} bytes`);
  return contents;
}

// Download and parse a JSON file
async function downloadJSON(bucketName, fileName) {
  const [contents] = await storage
    .bucket(bucketName)
    .file(fileName)
    .download();

  // Parse the buffer as JSON
  return JSON.parse(contents.toString('utf-8'));
}

downloadJSON('my-bucket', 'data/config.json')
  .then(config => console.log('Config:', config));
```

### Streaming Download

For large files, stream the download to avoid loading everything into memory:

```javascript
const fs = require('fs');

async function streamDownload(bucketName, srcFileName, destFilePath) {
  return new Promise((resolve, reject) => {
    const file = storage.bucket(bucketName).file(srcFileName);

    // Create a read stream from GCS and pipe to a local file
    file.createReadStream()
      .on('error', (err) => {
        console.error('Download error:', err);
        reject(err);
      })
      .pipe(fs.createWriteStream(destFilePath))
      .on('error', (err) => {
        console.error('Write error:', err);
        reject(err);
      })
      .on('finish', () => {
        console.log(`Stream download complete: ${destFilePath}`);
        resolve();
      });
  });
}

streamDownload('my-bucket', 'backups/db-dump.sql.gz', '/tmp/db-dump.sql.gz');
```

### Serving Files via Express

Stream files directly from GCS through your Express server:

```javascript
app.get('/files/:filename', async (req, res) => {
  const fileName = req.params.filename;
  const file = storage.bucket('my-bucket').file(`public/${fileName}`);

  try {
    // Check if the file exists before streaming
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Get metadata for content type
    const [metadata] = await file.getMetadata();
    res.setHeader('Content-Type', metadata.contentType);

    // Stream the file directly to the response
    file.createReadStream().pipe(res);
  } catch (err) {
    console.error('Error serving file:', err);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});
```

## Error Handling

Wrap your operations with proper error handling:

```javascript
async function safeDownload(bucketName, fileName) {
  try {
    const [contents] = await storage
      .bucket(bucketName)
      .file(fileName)
      .download();

    return contents;
  } catch (err) {
    if (err.code === 404) {
      console.error(`File not found: ${fileName}`);
    } else if (err.code === 403) {
      console.error(`Permission denied for: ${fileName}`);
    } else {
      console.error(`Unexpected error: ${err.message}`);
    }
    return null;
  }
}
```

## Listing and Batch Operations

Download all files under a prefix:

```javascript
const path = require('path');
const fs = require('fs');

async function downloadPrefix(bucketName, prefix, localDir) {
  // List all files with the given prefix
  const [files] = await storage.bucket(bucketName).getFiles({
    prefix: prefix,
  });

  console.log(`Found ${files.length} files to download`);

  for (const file of files) {
    // Skip directory markers
    if (file.name.endsWith('/')) continue;

    const localPath = path.join(localDir, file.name);
    const dir = path.dirname(localPath);

    // Create local directories as needed
    fs.mkdirSync(dir, { recursive: true });

    await file.download({ destination: localPath });
    console.log(`Downloaded: ${file.name}`);
  }

  console.log('All files downloaded');
}

downloadPrefix('my-bucket', 'data/2026/02/', '/tmp/downloads');
```

The Node.js client library handles retries, resumable uploads, and authentication transparently. For most applications, you can focus on your business logic and trust the library to manage the connection details reliably.
