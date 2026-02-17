# How to Use the google-cloud/storage npm Package to Generate Signed URLs for Secure File Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Storage, Node.js, Signed URLs, Security

Description: Learn how to generate signed URLs using the google-cloud/storage npm package for temporary and secure file access without exposing your Cloud Storage bucket publicly.

---

When you need to give users temporary access to files in a private Cloud Storage bucket, signed URLs are the way to go. A signed URL contains an embedded authentication token that grants access to a specific object for a limited time. The user does not need a Google account, and your bucket stays private. The `@google-cloud/storage` npm package makes generating these URLs straightforward from Node.js.

## Why Signed URLs?

Making a Cloud Storage bucket public is the simplest way to serve files, but it means anyone with the URL can access any file forever. Signed URLs solve this by providing time-limited access to specific files. Common use cases include serving private user uploads, allowing file downloads from a web application, and providing temporary access to reports or exports.

## Setup

Install the Cloud Storage Node.js client.

```bash
# Install the Cloud Storage npm package
npm install @google-cloud/storage
```

## Generating a Download Signed URL

Here is the basic pattern for generating a signed URL that allows downloading a file.

```javascript
// generate-signed-url.js - Basic signed URL generation
const { Storage } = require('@google-cloud/storage');

// Create a storage client - uses Application Default Credentials
const storage = new Storage();

async function generateDownloadUrl(bucketName, fileName, expirationMinutes = 60) {
  // Get a reference to the file
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(fileName);

  // Generate a signed URL for downloading the file
  const [url] = await file.getSignedUrl({
    version: 'v4',                   // Use V4 signing (recommended)
    action: 'read',                   // Allow reading (downloading)
    expires: Date.now() + expirationMinutes * 60 * 1000, // Expiry time in milliseconds
  });

  console.log(`Signed URL: ${url}`);
  return url;
}

// Generate a URL that expires in 30 minutes
generateDownloadUrl('my-private-bucket', 'reports/monthly-report.pdf', 30);
```

## Generating an Upload Signed URL

Signed URLs can also allow uploads. This is useful when you want users to upload files directly to Cloud Storage without going through your server.

```javascript
const { Storage } = require('@google-cloud/storage');

const storage = new Storage();

async function generateUploadUrl(bucketName, fileName, contentType, expirationMinutes = 15) {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(fileName);

  // Generate a signed URL for uploading a file
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',                  // Allow writing (uploading)
    expires: Date.now() + expirationMinutes * 60 * 1000,
    contentType: contentType,          // Restrict the content type
  });

  return {
    uploadUrl: url,
    fileName: fileName,
    contentType: contentType,
    expiresIn: `${expirationMinutes} minutes`,
  };
}

// Generate an upload URL for a PNG image
async function main() {
  const result = await generateUploadUrl(
    'my-upload-bucket',
    'uploads/user-123/avatar.png',
    'image/png',
    15
  );
  console.log('Upload URL generated:', result);
}

main();
```

## Using Signed URLs in an Express.js API

Here is a practical example integrating signed URLs into an Express.js API for a file management system.

```javascript
// server.js - Express API with signed URL endpoints
const express = require('express');
const { Storage } = require('@google-cloud/storage');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const storage = new Storage();
const BUCKET_NAME = process.env.BUCKET_NAME || 'my-app-files';

// Endpoint to get a download URL for a private file
app.get('/api/files/:fileId/download', async (req, res) => {
  try {
    const { fileId } = req.params;

    // In a real app, verify the user has permission to access this file
    // const userId = req.user.id;
    // const hasAccess = await checkFileAccess(userId, fileId);

    const filePath = `files/${fileId}`;
    const file = storage.bucket(BUCKET_NAME).file(filePath);

    // Check if the file exists
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Generate a signed URL that expires in 1 hour
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000,
      // Set content disposition to trigger a download dialog
      responseDisposition: `attachment; filename="${fileId}"`,
    });

    res.json({ downloadUrl: url, expiresIn: '1 hour' });
  } catch (error) {
    console.error('Failed to generate download URL:', error);
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

// Endpoint to get an upload URL for a new file
app.post('/api/files/upload-url', async (req, res) => {
  try {
    const { fileName, contentType, maxSizeBytes } = req.body;

    // Validate the content type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(contentType)) {
      return res.status(400).json({ error: `Content type ${contentType} not allowed` });
    }

    // Generate a unique file path
    const fileId = uuidv4();
    const extension = fileName.split('.').pop();
    const filePath = `uploads/${fileId}.${extension}`;

    const file = storage.bucket(BUCKET_NAME).file(filePath);

    // Generate a signed URL for upload
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes to complete upload
      contentType: contentType,
      extensionHeaders: {
        // Optionally restrict the upload size
        'x-goog-content-length-range': `0,${maxSizeBytes || 10 * 1024 * 1024}`,
      },
    });

    res.json({
      uploadUrl: url,
      fileId: fileId,
      filePath: filePath,
      contentType: contentType,
      expiresIn: '15 minutes',
    });
  } catch (error) {
    console.error('Failed to generate upload URL:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

// Endpoint to list files and generate preview URLs
app.get('/api/files', async (req, res) => {
  try {
    const [files] = await storage.bucket(BUCKET_NAME).getFiles({
      prefix: 'files/',
      maxResults: 50,
    });

    // Generate signed URLs for each file
    const fileList = await Promise.all(
      files.map(async (file) => {
        const [url] = await file.getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + 30 * 60 * 1000, // 30 minutes
        });

        return {
          name: file.name,
          size: file.metadata.size,
          contentType: file.metadata.contentType,
          created: file.metadata.timeCreated,
          previewUrl: url,
        };
      })
    );

    res.json({ files: fileList });
  } catch (error) {
    console.error('Failed to list files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Client-Side Upload with Signed URLs

Here is how a browser client uses the signed upload URL.

```javascript
// client-upload.js - Browser-side file upload using signed URL
async function uploadFile(file) {
  // Step 1: Request an upload URL from your API
  const urlResponse = await fetch('/api/files/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
      maxSizeBytes: file.size,
    }),
  });

  const { uploadUrl, fileId } = await urlResponse.json();

  // Step 2: Upload the file directly to Cloud Storage using the signed URL
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,  // Send the raw file bytes
  });

  if (!uploadResponse.ok) {
    throw new Error(`Upload failed: ${uploadResponse.status}`);
  }

  console.log(`File uploaded successfully. File ID: ${fileId}`);
  return fileId;
}

// Usage with a file input element
// document.getElementById('fileInput').addEventListener('change', (e) => {
//   uploadFile(e.target.files[0]);
// });
```

## Signed URLs with Custom Headers

You can require specific headers when using a signed URL, adding an extra layer of control.

```javascript
const { Storage } = require('@google-cloud/storage');

const storage = new Storage();

async function generateUrlWithHeaders(bucketName, fileName) {
  const file = storage.bucket(bucketName).file(fileName);

  // Generate a URL that requires specific headers
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000,
    // These headers must be included in the request
    extensionHeaders: {
      'x-goog-meta-requester': 'my-app',
    },
    // Set response headers for the download
    responseType: 'application/pdf',
    responseDisposition: 'inline',
  });

  return url;
}
```

## Signed URL Security Best Practices

Here is a summary of security practices for signed URLs.

```javascript
// security-config.js - Security best practices for signed URLs

// 1. Use short expiration times
const DOWNLOAD_URL_EXPIRY = 60 * 60 * 1000;  // 1 hour for downloads
const UPLOAD_URL_EXPIRY = 15 * 60 * 1000;     // 15 minutes for uploads

// 2. Restrict content types for uploads
const ALLOWED_UPLOAD_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'text/csv',
];

// 3. Enforce file size limits
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;  // 50 MB

// 4. Use a dedicated service account with minimal permissions
// Only grant storage.objects.get for downloads
// Only grant storage.objects.create for uploads

// 5. Generate unique file paths to prevent overwrites
function generateFilePath(userId, originalName) {
  const fileId = require('crypto').randomUUID();
  const extension = originalName.split('.').pop().toLowerCase();
  const sanitized = extension.replace(/[^a-z0-9]/g, '');
  return `uploads/${userId}/${fileId}.${sanitized}`;
}
```

## Monitoring File Access

When you serve files through signed URLs, you want to monitor for unusual access patterns. OneUptime (https://oneuptime.com) can monitor your API endpoints that generate signed URLs, tracking response times and error rates to ensure your file serving infrastructure stays healthy.

## Summary

Signed URLs from the `@google-cloud/storage` npm package give you secure, temporary access to private Cloud Storage files without making your bucket public. Use `action: 'read'` for downloads and `action: 'write'` for uploads, keep expiration times short, restrict content types for uploads, and always verify user permissions in your API before generating a signed URL. This pattern keeps your files private while giving users the access they need, exactly when they need it.
