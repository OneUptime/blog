# How to Use the AWS SDK for JavaScript (v3) with S3

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, JavaScript, Node.js

Description: Comprehensive guide to using the AWS SDK for JavaScript v3 with S3, covering uploads, downloads, streams, presigned URLs, and migrating from v2 to v3.

---

The AWS SDK for JavaScript v3 is a complete rewrite of v2. It's modular, tree-shakeable, and uses modern JavaScript patterns like async/await and middleware. If you're still on v2, it's time to upgrade. And if you're starting fresh, v3 is the way to go.

Let's walk through common S3 operations with v3, from basic uploads to streaming large files.

## Installation

V3 is modular - you install only the packages you need instead of the entire SDK.

```bash
# Install S3 client and required utilities
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage @aws-sdk/s3-request-presigner
```

Compare this to v2 where you'd install the entire `aws-sdk` package (over 60 MB). The S3 client alone is a fraction of that size.

## Creating the S3 Client

Initialize the client with your region. Credentials are loaded automatically from environment variables, shared config file, or IAM role.

```javascript
import { S3Client } from '@aws-sdk/client-s3';

// Create S3 client - credentials auto-loaded from environment/IAM role
const s3 = new S3Client({
  region: 'us-east-1',
});

// Or with explicit credentials (not recommended for production)
const s3WithCreds = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
```

## Uploading Objects

Upload a string, buffer, or stream to S3.

```javascript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'us-east-1' });

// Upload a string
async function uploadString() {
  const command = new PutObjectCommand({
    Bucket: 'my-data-bucket',
    Key: 'messages/hello.txt',
    Body: 'Hello from v3!',
    ContentType: 'text/plain',
  });

  const response = await s3.send(command);
  console.log('Upload successful:', response.$metadata.httpStatusCode);
}

// Upload a buffer (e.g., from a file read)
import { readFileSync } from 'fs';

async function uploadBuffer() {
  const fileContent = readFileSync('report.pdf');

  const command = new PutObjectCommand({
    Bucket: 'my-data-bucket',
    Key: 'reports/report.pdf',
    Body: fileContent,
    ContentType: 'application/pdf',
    Metadata: {
      'generated-by': 'reporting-service',
      'report-date': '2026-02-12',
    },
  });

  await s3.send(command);
}

// Upload JSON data
async function uploadJSON() {
  const data = { users: [{ name: 'Alice' }, { name: 'Bob' }] };

  const command = new PutObjectCommand({
    Bucket: 'my-data-bucket',
    Key: 'data/users.json',
    Body: JSON.stringify(data),
    ContentType: 'application/json',
  });

  await s3.send(command);
}
```

## Uploading Large Files with Multipart

For files larger than a few MB, use the `@aws-sdk/lib-storage` package which handles multipart uploads automatically.

```javascript
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { createReadStream } from 'fs';

const s3 = new S3Client({ region: 'us-east-1' });

async function uploadLargeFile(filePath, bucket, key) {
  const fileStream = createReadStream(filePath);

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: bucket,
      Key: key,
      Body: fileStream,
    },
    // Optional configuration
    queueSize: 4,              // Number of concurrent uploads
    partSize: 1024 * 1024 * 10, // 10 MB per part
    leavePartsOnError: false,   // Clean up on failure
  });

  // Track progress
  upload.on('httpUploadProgress', (progress) => {
    const percent = Math.round((progress.loaded / progress.total) * 100);
    console.log(`Upload progress: ${percent}%`);
  });

  const result = await upload.done();
  console.log('Upload complete:', result.Location);
}

uploadLargeFile('big-dataset.csv', 'my-data-bucket', 'datasets/big.csv');
```

## Downloading Objects

Download objects to memory or stream them to files.

```javascript
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'us-east-1' });

// Download to string
async function downloadToString(bucket, key) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3.send(command);

  // In v3, Body is a readable stream - convert to string
  const bodyString = await response.Body.transformToString();
  return bodyString;
}

// Download to buffer
async function downloadToBuffer(bucket, key) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3.send(command);

  const byteArray = await response.Body.transformToByteArray();
  return Buffer.from(byteArray);
}

// Download and save to file
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

async function downloadToFile(bucket, key, localPath) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3.send(command);

  const writeStream = createWriteStream(localPath);
  await pipeline(response.Body, writeStream);
  console.log(`Downloaded to ${localPath}`);
}
```

## Listing Objects

List objects with pagination support.

```javascript
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { paginateListObjectsV2 } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'us-east-1' });

// Simple listing
async function listObjects(bucket, prefix) {
  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
    MaxKeys: 100,
  });

  const response = await s3.send(command);

  for (const obj of response.Contents || []) {
    console.log(`${obj.Key} (${obj.Size} bytes)`);
  }
}

// Paginated listing for large buckets
async function listAllObjects(bucket, prefix) {
  const paginator = paginateListObjectsV2(
    { client: s3 },
    { Bucket: bucket, Prefix: prefix }
  );

  const allObjects = [];
  for await (const page of paginator) {
    for (const obj of page.Contents || []) {
      allObjects.push(obj);
    }
  }

  console.log(`Found ${allObjects.length} objects`);
  return allObjects;
}
```

## Deleting Objects

Delete single objects or batch delete multiple objects.

```javascript
import {
  S3Client,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'us-east-1' });

// Delete a single object
async function deleteObject(bucket, key) {
  const command = new DeleteObjectCommand({ Bucket: bucket, Key: key });
  await s3.send(command);
  console.log(`Deleted: ${key}`);
}

// Batch delete (up to 1000 objects per call)
async function deleteMultiple(bucket, keys) {
  const command = new DeleteObjectsCommand({
    Bucket: bucket,
    Delete: {
      Objects: keys.map((key) => ({ Key: key })),
      Quiet: true, // Only report errors, not successes
    },
  });

  const response = await s3.send(command);

  if (response.Errors && response.Errors.length > 0) {
    console.error('Failed to delete:', response.Errors);
  }
}
```

## Generating Presigned URLs

Create temporary URLs for upload or download without sharing credentials.

```javascript
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({ region: 'us-east-1' });

// Presigned download URL (valid for 1 hour)
async function getDownloadUrl(bucket, key) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
  return url;
}

// Presigned upload URL (valid for 15 minutes)
async function getUploadUrl(bucket, key, contentType) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  const url = await getSignedUrl(s3, command, { expiresIn: 900 });
  return url;
}
```

## Error Handling

V3 throws specific error classes that you can catch.

```javascript
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { S3ServiceException } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'us-east-1' });

async function safeDownload(bucket, key) {
  try {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3.send(command);
    return await response.Body.transformToString();
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      console.log(`Object not found: ${key}`);
      return null;
    }
    if (error.name === 'NoSuchBucket') {
      console.log(`Bucket not found: ${bucket}`);
      return null;
    }
    if (error.$metadata?.httpStatusCode === 403) {
      console.log('Access denied');
      return null;
    }
    // Re-throw unexpected errors
    throw error;
  }
}
```

## Middleware

V3's middleware stack lets you intercept and modify requests and responses.

```javascript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'us-east-1' });

// Add logging middleware
s3.middlewareStack.add(
  (next) => async (args) => {
    console.log(`S3 Request: ${args.constructor.name}`, {
      bucket: args.input.Bucket,
      key: args.input.Key,
    });
    const start = Date.now();
    const result = await next(args);
    const duration = Date.now() - start;
    console.log(`S3 Response: ${result.output.$metadata.httpStatusCode} (${duration}ms)`);
    return result;
  },
  { step: 'initialize', name: 'loggingMiddleware' }
);
```

This is great for adding request timing, logging, or custom headers to all S3 operations.

## Migrating from v2

If you're coming from v2, here's a quick mapping of common patterns.

```javascript
// v2 style (old)
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const data = await s3.getObject({ Bucket: 'b', Key: 'k' }).promise();

// v3 style (new)
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
const s3 = new S3Client({ region: 'us-east-1' });
const data = await s3.send(new GetObjectCommand({ Bucket: 'b', Key: 'k' }));
```

The command pattern in v3 is more verbose but gives you better type safety and tree-shaking.

For streaming large files from S3, check out our dedicated guide on [streaming large files from S3 in Node.js](https://oneuptime.com/blog/post/stream-large-files-s3-nodejs/view). And for a complete monitoring solution for your S3 operations, take a look at [OneUptime](https://oneuptime.com).
