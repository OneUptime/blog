# How to Upload Files to S3 with AWS SDK for JavaScript v3

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, JavaScript, Node.js

Description: Learn how to upload files to Amazon S3 using the AWS SDK for JavaScript v3 in Node.js, covering single uploads, multipart uploads, streaming, and presigned URLs.

---

Uploading files to S3 from Node.js is one of the most common AWS operations, and the v3 SDK handles it well once you understand the different approaches. The right method depends on your file size and whether you're working with files on disk, buffers in memory, or streams. Let's go through each option.

## Simple Upload with PutObject

For small files (under 5 GB), `PutObjectCommand` is the straightforward choice.

```javascript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';

const s3 = new S3Client({ region: 'us-east-1' });

// Upload a file from disk
const fileContent = readFileSync('./report.pdf');

const response = await s3.send(new PutObjectCommand({
    Bucket: 'my-documents-bucket',
    Key: 'reports/2026/report.pdf',
    Body: fileContent,
    ContentType: 'application/pdf'
}));

console.log(`Uploaded! ETag: ${response.ETag}`);
```

You can also upload strings and buffers directly.

```javascript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'us-east-1' });

// Upload a JSON string
await s3.send(new PutObjectCommand({
    Bucket: 'my-bucket',
    Key: 'data/config.json',
    Body: JSON.stringify({ version: '2.0', features: ['a', 'b'] }),
    ContentType: 'application/json'
}));

// Upload a Buffer
const buffer = Buffer.from('Hello, World!', 'utf-8');
await s3.send(new PutObjectCommand({
    Bucket: 'my-bucket',
    Key: 'data/hello.txt',
    Body: buffer,
    ContentType: 'text/plain'
}));
```

## Streaming Uploads

For larger files, you don't want to load the entire file into memory. Use a readable stream as the body.

```javascript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';

const s3 = new S3Client({ region: 'us-east-1' });

const filePath = './large-backup.tar.gz';
const fileStats = await stat(filePath);

await s3.send(new PutObjectCommand({
    Bucket: 'my-backup-bucket',
    Key: 'backups/large-backup.tar.gz',
    Body: createReadStream(filePath),
    ContentLength: fileStats.size,  // required for streams
    ContentType: 'application/gzip'
}));

console.log('Stream upload complete');
```

## Managed Multipart Upload with @aws-sdk/lib-storage

For large files (over 100 MB), use the `Upload` class from `@aws-sdk/lib-storage`. It handles multipart upload automatically, including parallelization, retry on failed parts, and progress tracking.

Install the package first.

```bash
npm install @aws-sdk/lib-storage
```

Then use it for large file uploads.

```javascript
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { createReadStream } from 'fs';

const s3 = new S3Client({ region: 'us-east-1' });

const upload = new Upload({
    client: s3,
    params: {
        Bucket: 'my-bucket',
        Key: 'videos/large-video.mp4',
        Body: createReadStream('./large-video.mp4'),
        ContentType: 'video/mp4'
    },
    // Configuration options
    queueSize: 4,          // number of parallel uploads
    partSize: 10 * 1024 * 1024,  // 10 MB per part
    leavePartsOnError: false      // clean up on failure
});

// Track progress
upload.on('httpUploadProgress', (progress) => {
    const percentage = progress.loaded && progress.total
        ? ((progress.loaded / progress.total) * 100).toFixed(1)
        : 'unknown';
    console.log(`Progress: ${percentage}% (${progress.loaded} / ${progress.total})`);
});

// Execute the upload
const result = await upload.done();
console.log(`Upload complete: ${result.Location}`);
```

## Uploading with Metadata and Tags

Add metadata, tags, and other properties to your uploads.

```javascript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';

const s3 = new S3Client({ region: 'us-east-1' });

await s3.send(new PutObjectCommand({
    Bucket: 'my-bucket',
    Key: 'assets/logo.png',
    Body: readFileSync('./logo.png'),
    ContentType: 'image/png',
    CacheControl: 'max-age=31536000',  // cache for 1 year
    Metadata: {
        'uploaded-by': 'deploy-script',
        'version': '3.1.0',
        'environment': 'production'
    },
    Tagging: 'project=website&team=frontend',
    ServerSideEncryption: 'AES256'
}));
```

## Uploading a Directory

A utility function that recursively uploads all files in a directory.

```javascript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, extname } from 'path';
import { lookup } from 'mime-types';

const s3 = new S3Client({ region: 'us-east-1' });

// Map of file extensions to content types
function getContentType(filePath) {
    return lookup(filePath) || 'application/octet-stream';
}

async function uploadDirectory(localDir, bucket, s3Prefix = '') {
    const files = [];

    function collectFiles(dir) {
        for (const entry of readdirSync(dir)) {
            const fullPath = join(dir, entry);
            if (statSync(fullPath).isDirectory()) {
                collectFiles(fullPath);
            } else {
                files.push(fullPath);
            }
        }
    }

    collectFiles(localDir);
    console.log(`Found ${files.length} files to upload`);

    // Upload in parallel batches of 10
    const batchSize = 10;
    let uploaded = 0;

    for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        await Promise.all(batch.map(async (filePath) => {
            const relativePath = relative(localDir, filePath);
            const s3Key = s3Prefix
                ? `${s3Prefix}/${relativePath}`
                : relativePath;

            await s3.send(new PutObjectCommand({
                Bucket: bucket,
                Key: s3Key.replace(/\\/g, '/'),  // normalize path separators
                Body: readFileSync(filePath),
                ContentType: getContentType(filePath)
            }));

            uploaded++;
            console.log(`[${uploaded}/${files.length}] ${s3Key}`);
        }));
    }

    return uploaded;
}

// Upload a build directory
await uploadDirectory('./dist', 'my-website-bucket', 'static/v2');
```

## Presigned Upload URLs

Generate URLs that allow clients to upload directly to S3 without having AWS credentials. This is perfect for browser-based uploads.

```javascript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({ region: 'us-east-1' });

// Generate a presigned URL for uploading
const command = new PutObjectCommand({
    Bucket: 'my-upload-bucket',
    Key: 'user-uploads/photo.jpg',
    ContentType: 'image/jpeg'
});

const presignedUrl = await getSignedUrl(s3, command, {
    expiresIn: 3600  // URL valid for 1 hour
});

console.log(`Upload URL: ${presignedUrl}`);

// Client-side usage (browser or any HTTP client):
// await fetch(presignedUrl, {
//     method: 'PUT',
//     body: fileData,
//     headers: { 'Content-Type': 'image/jpeg' }
// });
```

## Error Handling

Upload errors need specific handling. Network issues, permission errors, and storage limits all require different responses.

```javascript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';

const s3 = new S3Client({ region: 'us-east-1' });

async function safeUpload(filePath, bucket, key, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await s3.send(new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: readFileSync(filePath)
            }));

            console.log(`Uploaded ${key} (ETag: ${response.ETag})`);
            return response;
        } catch (error) {
            if (error.name === 'NoSuchBucket') {
                console.error(`Bucket '${bucket}' does not exist`);
                throw error;  // don't retry
            }

            if (error.name === 'AccessDenied') {
                console.error('Permission denied - check IAM policies');
                throw error;  // don't retry
            }

            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1000;
                console.warn(`Upload failed (attempt ${attempt}), ` +
                    `retrying in ${delay}ms: ${error.message}`);
                await new Promise(r => setTimeout(r, delay));
            } else {
                console.error(`Upload failed after ${maxRetries} attempts`);
                throw error;
            }
        }
    }
}

await safeUpload('./data.json', 'my-bucket', 'data/output.json');
```

## Best Practices

- **Use `@aws-sdk/lib-storage` for files over 100 MB.** It handles multipart upload, retries failed parts, and supports progress tracking.
- **Set ContentType explicitly.** Don't rely on S3 to guess the content type.
- **Use streams for large files.** Don't load entire files into memory with `readFileSync`.
- **Batch directory uploads.** Parallel uploads dramatically improve throughput, but don't open too many connections at once.
- **Use presigned URLs for client-side uploads.** It's more secure than proxying uploads through your server.

For more on the v3 SDK fundamentals, check out the [SDK overview](https://oneuptime.com/blog/post/2026-02-12-aws-sdk-javascript-v3-nodejs/view). And for uploading from Python instead, see the [Boto3 S3 upload guide](https://oneuptime.com/blog/post/2026-02-12-upload-files-s3-boto3/view).
