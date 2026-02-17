# How to Use Multer with Express.js to Upload Files Directly to Cloud Storage on Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Storage, Express, Multer, Cloud Run, Node.js, File Upload, Google Cloud

Description: Use Multer with Express.js to handle file uploads and store them directly in Google Cloud Storage when running on Cloud Run.

---

Multer is the go-to middleware for handling file uploads in Express.js applications. By default, it stores uploaded files in memory or on the local filesystem. On Cloud Run, local disk storage is ephemeral - files disappear when the instance shuts down. Instead, you want to pipe uploads directly to Google Cloud Storage for durable storage.

In this post, I will show you how to configure Multer with a custom storage engine that writes files to Cloud Storage, handles multiple file uploads, validates file types and sizes, and generates signed URLs for accessing uploaded files.

## Project Setup

```bash
# Initialize project and install dependencies
mkdir multer-gcs && cd multer-gcs
npm init -y
npm install express multer @google-cloud/storage multer-cloud-storage uuid
```

## Using multer-cloud-storage

The `multer-cloud-storage` package provides a Multer storage engine that writes directly to Cloud Storage.

```javascript
// app.js - Express app with Multer and Cloud Storage
const express = require('express');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
app.use(express.json());

const storage = new Storage();
const BUCKET_NAME = process.env.BUCKET_NAME || 'your-upload-bucket';
const bucket = storage.bucket(BUCKET_NAME);

// Custom storage engine for Cloud Storage
const cloudStorageEngine = {
  _handleFile(req, file, cb) {
    // Generate a unique filename
    const uniqueId = uuidv4();
    const extension = path.extname(file.originalname);
    const destFileName = `uploads/${uniqueId}${extension}`;

    // Create a write stream to Cloud Storage
    const gcsFile = bucket.file(destFileName);
    const writeStream = gcsFile.createWriteStream({
      metadata: {
        contentType: file.mimetype,
        metadata: {
          originalName: file.originalname,
          uploadedBy: req.user?.id || 'anonymous',
        },
      },
      resumable: false,
    });

    // Pipe the file stream to Cloud Storage
    file.stream.pipe(writeStream);

    writeStream.on('error', (error) => {
      cb(error);
    });

    writeStream.on('finish', () => {
      cb(null, {
        bucket: BUCKET_NAME,
        filename: destFileName,
        originalname: file.originalname,
        contentType: file.mimetype,
        size: writeStream.bytesWritten,
        publicUrl: `https://storage.googleapis.com/${BUCKET_NAME}/${destFileName}`,
      });
    });
  },

  _removeFile(req, file, cb) {
    // Delete the file from Cloud Storage if needed
    const gcsFile = bucket.file(file.filename);
    gcsFile.delete().then(() => cb()).catch(cb);
  },
};

// Configure Multer with the custom engine
const upload = multer({
  storage: cloudStorageEngine,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5, // Max 5 files per request
  },
  fileFilter: (req, file, cb) => {
    // Allow only specific file types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  },
});
```

## Single File Upload Endpoint

```javascript
// Upload a single file
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  res.json({
    message: 'File uploaded successfully',
    file: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      contentType: req.file.contentType,
      size: req.file.size,
      bucket: req.file.bucket,
    },
  });
});
```

## Multiple File Upload Endpoint

```javascript
// Upload multiple files at once
app.post('/api/upload-multiple', upload.array('files', 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files provided' });
  }

  const uploaded = req.files.map((file) => ({
    filename: file.filename,
    originalName: file.originalname,
    contentType: file.contentType,
    size: file.size,
  }));

  res.json({
    message: `${uploaded.length} files uploaded`,
    files: uploaded,
  });
});
```

## Upload with Different Fields

```javascript
// Handle uploads from different form fields
const profileUpload = upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'documents', maxCount: 5 },
]);

app.post('/api/profile/upload', profileUpload, (req, res) => {
  const avatar = req.files['avatar'] ? req.files['avatar'][0] : null;
  const documents = req.files['documents'] || [];

  res.json({
    avatar: avatar ? {
      filename: avatar.filename,
      contentType: avatar.contentType,
    } : null,
    documents: documents.map((doc) => ({
      filename: doc.filename,
      originalName: doc.originalname,
    })),
  });
});
```

## Generating Signed URLs

Give clients temporary access to uploaded files with signed URLs.

```javascript
// Generate a signed URL for a file
app.get('/api/files/:filename/url', async (req, res) => {
  const { filename } = req.params;
  const filePath = `uploads/${filename}`;
  const file = bucket.file(filePath);

  try {
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Generate a signed URL valid for 1 hour
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });

    res.json({ url: signedUrl, expiresIn: '1 hour' });
  } catch (error) {
    console.error('Failed to generate signed URL:', error);
    res.status(500).json({ error: 'Failed to generate URL' });
  }
});
```

## Using Signed Upload URLs

For large files or direct browser uploads, generate a signed URL that the client uses to upload directly to Cloud Storage, bypassing your server entirely.

```javascript
// Generate a signed upload URL for direct browser-to-GCS upload
app.post('/api/upload-url', async (req, res) => {
  const { filename, contentType } = req.body;

  if (!filename || !contentType) {
    return res.status(400).json({ error: 'filename and contentType are required' });
  }

  const uniqueId = uuidv4();
  const extension = path.extname(filename);
  const destFileName = `uploads/${uniqueId}${extension}`;
  const file = bucket.file(destFileName);

  try {
    // Generate a signed URL for uploading
    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: contentType,
    });

    res.json({
      uploadUrl,
      filename: destFileName,
      expiresIn: '15 minutes',
      // Client uses PUT to upload to this URL
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
    });
  } catch (error) {
    console.error('Failed to generate upload URL:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});
```

The client can then upload directly from the browser.

```javascript
// Browser-side: upload directly to Cloud Storage
async function uploadFile(file) {
  // Step 1: Get the signed URL from your API
  const response = await fetch('/api/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
    }),
  });
  const { uploadUrl, filename } = await response.json();

  // Step 2: Upload directly to Cloud Storage
  await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  return filename;
}
```

## Error Handling Middleware

Handle Multer errors with a dedicated error handler.

```javascript
// Error handling for upload failures
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    // Multer-specific errors
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(413).json({ error: 'File too large. Maximum size is 10MB.' });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({ error: 'Too many files. Maximum is 5.' });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({ error: `Unexpected field: ${error.field}` });
      default:
        return res.status(400).json({ error: error.message });
    }
  }

  if (error.message && error.message.includes('not allowed')) {
    return res.status(400).json({ error: error.message });
  }

  console.error('Upload error:', error);
  res.status(500).json({ error: 'Upload failed' });
});
```

## Deleting Files

```javascript
// Delete an uploaded file
app.delete('/api/files/:filename', async (req, res) => {
  const { filename } = req.params;
  const file = bucket.file(`uploads/${filename}`);

  try {
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    await file.delete();
    res.json({ message: 'File deleted' });
  } catch (error) {
    console.error('Delete failed:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});
```

## Deploying to Cloud Run

```bash
# Deploy the upload service
gcloud run deploy upload-service \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --timeout 300 \
  --set-env-vars "BUCKET_NAME=your-upload-bucket"
```

## Starting the Server

```javascript
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Upload service running on port ${PORT}`);
});
```

Using Multer with a custom Cloud Storage engine gives you the familiar Express.js upload API while storing files durably in Cloud Storage. For larger files, consider signed upload URLs that let clients upload directly to Cloud Storage without passing through your server at all. Either approach works well on Cloud Run, and you get the benefit of Cloud Storage's durability, CDN integration, and lifecycle management.
