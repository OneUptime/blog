# How to Build Streaming File Uploads in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Streaming, File Upload, Express

Description: Learn to handle large file uploads efficiently in Node.js using streams, avoiding memory issues while supporting progress tracking and validation.

---

## Introduction

Handling file uploads is a common requirement in web applications. When dealing with small files, loading the entire file into memory works fine. But when users upload large files (videos, datasets, backups), buffering everything into memory will crash your server or severely degrade performance.

Streaming solves this problem by processing data in chunks as it arrives, keeping memory usage constant regardless of file size.

## Why Streaming Matters for Large Files

Consider what happens when you upload a 2GB video file:

| Approach | Memory Usage | Time to First Byte Processed | Scalability |
|----------|--------------|------------------------------|-------------|
| Buffered (load entire file) | 2GB+ | After full upload completes | Poor - few concurrent uploads crash server |
| Streaming (chunk by chunk) | ~64KB buffer | Immediately | Excellent - handles many concurrent uploads |

With buffered uploads, your Node.js process must hold the entire file in memory before processing. With streaming, you process each chunk immediately and discard it, maintaining a small, fixed memory footprint.

### The Memory Problem in Practice

Here's what happens with a naive buffered approach:

```javascript
// BAD: This loads the entire file into memory
app.post('/upload', (req, res) => {
    let data = [];

    req.on('data', (chunk) => {
        data.push(chunk);  // Accumulating chunks in memory
    });

    req.on('end', () => {
        const buffer = Buffer.concat(data);  // Now holding entire file
        // Process buffer...
    });
});
```

For a 500MB file with 10 concurrent uploads, you need 5GB of memory just for the upload buffers. This approach does not scale.

## Setting Up the Project

Let's build a complete streaming upload solution. Start with these dependencies:

```bash
npm init -y
npm install express busboy @aws-sdk/client-s3 @aws-sdk/lib-storage
```

Create the basic Express server structure:

```javascript
// server.js
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// We intentionally skip body-parser/express.json() for upload routes
// to handle the raw stream ourselves

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
```

## Using Busboy for Stream-Based Parsing

Busboy is a streaming multipart parser. Unlike multer's default configuration, busboy never buffers the file content - it gives you a readable stream directly.

### Basic Busboy Implementation

```javascript
// routes/upload.js
const Busboy = require('busboy');
const fs = require('fs');
const path = require('path');

function handleUpload(req, res) {
    // Initialize busboy with request headers
    const busboy = Busboy({
        headers: req.headers,
        limits: {
            fileSize: 1024 * 1024 * 500,  // 500MB limit
            files: 1                        // Only allow one file
        }
    });

    let uploadedFile = null;
    let savePath = null;

    // 'file' event fires for each file in the form data
    busboy.on('file', (fieldname, file, info) => {
        const { filename, encoding, mimeType } = info;

        // Generate unique filename to prevent collisions
        const uniqueName = `${Date.now()}-${filename}`;
        savePath = path.join(__dirname, '../uploads', uniqueName);

        console.log(`Starting upload: ${filename} (${mimeType})`);

        // Create write stream to disk
        const writeStream = fs.createWriteStream(savePath);

        // Pipe the incoming file stream directly to disk
        // Data flows: client -> busboy -> writeStream -> disk
        file.pipe(writeStream);

        // Track upload completion for this file
        file.on('end', () => {
            uploadedFile = {
                originalName: filename,
                savedAs: uniqueName,
                mimeType: mimeType
            };
        });

        // Handle file-level errors
        file.on('error', (err) => {
            console.error('File stream error:', err);
            writeStream.destroy();
            fs.unlink(savePath, () => {});  // Clean up partial file
        });
    });

    // 'finish' fires when all parts have been processed
    busboy.on('finish', () => {
        if (uploadedFile) {
            res.json({
                success: true,
                file: uploadedFile
            });
        } else {
            res.status(400).json({ error: 'No file uploaded' });
        }
    });

    // Handle parsing errors
    busboy.on('error', (err) => {
        console.error('Busboy error:', err);
        res.status(500).json({ error: 'Upload failed' });
    });

    // Connect the request stream to busboy
    req.pipe(busboy);
}

module.exports = { handleUpload };
```

### Adding to Express Routes

```javascript
// server.js (updated)
const express = require('express');
const { handleUpload } = require('./routes/upload');

const app = express();

// Serve a simple upload form for testing
app.get('/', (req, res) => {
    res.send(`
        <form action="/upload" method="POST" enctype="multipart/form-data">
            <input type="file" name="document" />
            <button type="submit">Upload</button>
        </form>
    `);
});

// Upload endpoint - no body parser middleware
app.post('/upload', handleUpload);

app.listen(3000);
```

## Streaming Directly to S3

Saving to local disk is often just an intermediate step. For production applications, streaming directly to cloud storage (S3, GCS, Azure Blob) eliminates the local storage bottleneck.

### S3 Upload with Stream

```javascript
// services/s3-upload.js
const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const Busboy = require('busboy');
const { PassThrough } = require('stream');

// Initialize S3 client
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function streamToS3(req, res) {
    const busboy = Busboy({ headers: req.headers });

    let uploadPromise = null;
    let fileInfo = null;

    busboy.on('file', (fieldname, file, info) => {
        const { filename, mimeType } = info;

        // Generate S3 key (path within bucket)
        const s3Key = `uploads/${Date.now()}/${filename}`;

        fileInfo = {
            originalName: filename,
            s3Key: s3Key,
            mimeType: mimeType
        };

        // Create a PassThrough stream to bridge busboy and S3
        const passThrough = new PassThrough();

        // Start the S3 multipart upload
        // @aws-sdk/lib-storage handles chunking automatically
        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: process.env.S3_BUCKET,
                Key: s3Key,
                Body: passThrough,
                ContentType: mimeType
            },
            // Configure multipart upload settings
            queueSize: 4,          // Concurrent part uploads
            partSize: 5 * 1024 * 1024  // 5MB parts (minimum for S3)
        });

        // Pipe incoming file to S3 via PassThrough
        file.pipe(passThrough);

        // Store the upload promise to await later
        uploadPromise = upload.done();
    });

    busboy.on('finish', async () => {
        if (!uploadPromise) {
            return res.status(400).json({ error: 'No file provided' });
        }

        try {
            // Wait for S3 upload to complete
            const result = await uploadPromise;

            res.json({
                success: true,
                file: fileInfo,
                location: result.Location
            });
        } catch (err) {
            console.error('S3 upload failed:', err);
            res.status(500).json({ error: 'Failed to upload to S3' });
        }
    });

    req.pipe(busboy);
}

module.exports = { streamToS3 };
```

## Progress Tracking

Users uploading large files need feedback. Here's how to track and report upload progress.

### Server-Side Progress Tracking

```javascript
// routes/upload-with-progress.js
const Busboy = require('busboy');
const fs = require('fs');
const path = require('path');

function uploadWithProgress(req, res) {
    // Get total content length from headers
    const contentLength = parseInt(req.headers['content-length'], 10);

    const busboy = Busboy({ headers: req.headers });

    let bytesReceived = 0;
    let lastProgressUpdate = 0;

    busboy.on('file', (fieldname, file, info) => {
        const { filename } = info;
        const savePath = path.join(__dirname, '../uploads', `${Date.now()}-${filename}`);
        const writeStream = fs.createWriteStream(savePath);

        // Track bytes as they flow through
        file.on('data', (chunk) => {
            bytesReceived += chunk.length;

            // Calculate progress percentage
            const progress = Math.round((bytesReceived / contentLength) * 100);

            // Throttle progress logging to avoid spam
            if (progress - lastProgressUpdate >= 5) {
                console.log(`Upload progress: ${progress}% (${bytesReceived}/${contentLength} bytes)`);
                lastProgressUpdate = progress;
            }
        });

        file.pipe(writeStream);
    });

    busboy.on('finish', () => {
        res.json({
            success: true,
            totalBytes: bytesReceived
        });
    });

    req.pipe(busboy);
}

module.exports = { uploadWithProgress };
```

### Server-Sent Events for Real-Time Progress

For real-time progress updates to the client, use Server-Sent Events (SSE):

```javascript
// routes/upload-sse.js
const Busboy = require('busboy');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

// Store for tracking active uploads
const uploadProgress = new Map();

// Endpoint to receive progress updates via SSE
function progressStream(req, res) {
    const uploadId = req.params.uploadId;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Create emitter for this upload
    const emitter = new EventEmitter();
    uploadProgress.set(uploadId, emitter);

    // Send progress events to client
    emitter.on('progress', (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    });

    emitter.on('complete', (data) => {
        res.write(`data: ${JSON.stringify({ ...data, complete: true })}\n\n`);
        res.end();
        uploadProgress.delete(uploadId);
    });

    emitter.on('error', (error) => {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
        uploadProgress.delete(uploadId);
    });

    // Clean up on client disconnect
    req.on('close', () => {
        uploadProgress.delete(uploadId);
    });
}

// Upload endpoint that emits progress
function uploadWithSSE(req, res) {
    const uploadId = req.headers['x-upload-id'];
    const contentLength = parseInt(req.headers['content-length'], 10);
    const emitter = uploadProgress.get(uploadId);

    const busboy = Busboy({ headers: req.headers });
    let bytesReceived = 0;

    busboy.on('file', (fieldname, file, info) => {
        const { filename } = info;
        const savePath = path.join(__dirname, '../uploads', `${Date.now()}-${filename}`);
        const writeStream = fs.createWriteStream(savePath);

        file.on('data', (chunk) => {
            bytesReceived += chunk.length;

            // Emit progress to SSE stream
            if (emitter) {
                emitter.emit('progress', {
                    bytesReceived,
                    totalBytes: contentLength,
                    percent: Math.round((bytesReceived / contentLength) * 100)
                });
            }
        });

        file.pipe(writeStream);

        writeStream.on('finish', () => {
            if (emitter) {
                emitter.emit('complete', {
                    filename,
                    size: bytesReceived
                });
            }
        });
    });

    busboy.on('finish', () => {
        res.json({ success: true, uploadId });
    });

    req.pipe(busboy);
}

module.exports = { progressStream, uploadWithSSE };
```

### Client-Side Progress with Fetch API

```javascript
// client-upload.js (browser code)
async function uploadWithProgress(file, onProgress) {
    const uploadId = crypto.randomUUID();

    // Start listening for progress events
    const eventSource = new EventSource(`/progress/${uploadId}`);

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.error) {
            console.error('Upload error:', data.error);
            eventSource.close();
            return;
        }

        onProgress(data.percent);

        if (data.complete) {
            console.log('Upload complete:', data.filename);
            eventSource.close();
        }
    };

    // Build form data
    const formData = new FormData();
    formData.append('file', file);

    // Start the upload
    const response = await fetch('/upload', {
        method: 'POST',
        headers: {
            'X-Upload-Id': uploadId
        },
        body: formData
    });

    return response.json();
}

// Usage
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];

    await uploadWithProgress(file, (percent) => {
        console.log(`Progress: ${percent}%`);
        document.querySelector('.progress-bar').style.width = `${percent}%`;
    });
});
```

## File Validation During Upload

Validating files as they stream in lets you reject invalid uploads early without wasting bandwidth or storage.

### MIME Type and Magic Number Validation

```javascript
// validators/file-validator.js
const Busboy = require('busboy');
const { Transform } = require('stream');

// Magic numbers for common file types
const MAGIC_NUMBERS = {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'image/gif': [0x47, 0x49, 0x46],
    'application/pdf': [0x25, 0x50, 0x44, 0x46],
    'application/zip': [0x50, 0x4B, 0x03, 0x04],
    'video/mp4': null  // MP4 has variable magic numbers
};

// Allowed types for this endpoint
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 50 * 1024 * 1024;  // 50MB

class FileValidator extends Transform {
    constructor(options = {}) {
        super(options);
        this.bytesReceived = 0;
        this.maxSize = options.maxSize || MAX_FILE_SIZE;
        this.allowedTypes = options.allowedTypes || ALLOWED_TYPES;
        this.declaredType = options.mimeType;
        this.validated = false;
        this.headerBytes = [];
    }

    _transform(chunk, encoding, callback) {
        this.bytesReceived += chunk.length;

        // Check file size limit
        if (this.bytesReceived > this.maxSize) {
            return callback(new Error(`File exceeds maximum size of ${this.maxSize} bytes`));
        }

        // Validate magic numbers from first chunk
        if (!this.validated) {
            this.headerBytes.push(...chunk.slice(0, 10));

            if (this.headerBytes.length >= 4) {
                const isValid = this.validateMagicNumber();
                if (!isValid) {
                    return callback(new Error('File type does not match declared MIME type'));
                }
                this.validated = true;
            }
        }

        // Pass chunk through if valid
        callback(null, chunk);
    }

    validateMagicNumber() {
        // Check if declared type is allowed
        if (!this.allowedTypes.includes(this.declaredType)) {
            return false;
        }

        const expected = MAGIC_NUMBERS[this.declaredType];

        // Skip validation for types without defined magic numbers
        if (expected === null) {
            return true;
        }

        // Compare magic numbers
        for (let i = 0; i < expected.length; i++) {
            if (this.headerBytes[i] !== expected[i]) {
                return false;
            }
        }

        return true;
    }
}

function validatedUpload(req, res) {
    const busboy = Busboy({
        headers: req.headers,
        limits: { fileSize: MAX_FILE_SIZE }
    });

    busboy.on('file', (fieldname, file, info) => {
        const { filename, mimeType } = info;

        // Check MIME type before processing
        if (!ALLOWED_TYPES.includes(mimeType)) {
            file.resume();  // Drain the stream
            return res.status(400).json({
                error: `File type ${mimeType} not allowed`
            });
        }

        // Create validator transform stream
        const validator = new FileValidator({
            mimeType: mimeType,
            maxSize: MAX_FILE_SIZE,
            allowedTypes: ALLOWED_TYPES
        });

        // Handle validation errors
        validator.on('error', (err) => {
            file.unpipe(validator);
            file.resume();
            res.status(400).json({ error: err.message });
        });

        const savePath = `./uploads/${Date.now()}-${filename}`;
        const writeStream = require('fs').createWriteStream(savePath);

        // Chain: file -> validator -> disk
        file.pipe(validator).pipe(writeStream);

        writeStream.on('finish', () => {
            res.json({
                success: true,
                filename: filename,
                size: validator.bytesReceived
            });
        });
    });

    busboy.on('filesLimit', () => {
        res.status(400).json({ error: 'Too many files' });
    });

    req.pipe(busboy);
}

module.exports = { validatedUpload, FileValidator };
```

### Content Scanning During Upload

For virus scanning or content analysis during upload:

```javascript
// validators/content-scanner.js
const { Transform } = require('stream');
const crypto = require('crypto');

class ContentScanner extends Transform {
    constructor(options = {}) {
        super(options);
        this.hash = crypto.createHash('sha256');
        this.patterns = options.blockedPatterns || [];
        this.chunks = [];
        this.totalSize = 0;
    }

    _transform(chunk, encoding, callback) {
        // Update hash
        this.hash.update(chunk);
        this.totalSize += chunk.length;

        // Check for blocked patterns in chunk
        const chunkStr = chunk.toString('utf8');
        for (const pattern of this.patterns) {
            if (chunkStr.includes(pattern)) {
                return callback(new Error(`Blocked content detected: ${pattern}`));
            }
        }

        callback(null, chunk);
    }

    _flush(callback) {
        // Finalize hash when stream ends
        this.fileHash = this.hash.digest('hex');
        callback();
    }

    getResults() {
        return {
            hash: this.fileHash,
            size: this.totalSize
        };
    }
}

module.exports = { ContentScanner };
```

## Error Handling

Proper error handling for streaming uploads requires attention to cleanup and client communication.

### Comprehensive Error Handler

```javascript
// middleware/upload-error-handler.js
const fs = require('fs');
const Busboy = require('busboy');

class UploadError extends Error {
    constructor(message, code, statusCode = 400) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
    }
}

function createUploadHandler(options = {}) {
    const {
        uploadDir = './uploads',
        maxFileSize = 100 * 1024 * 1024,
        allowedTypes = [],
        onFile = null
    } = options;

    return function(req, res, next) {
        const busboy = Busboy({
            headers: req.headers,
            limits: { fileSize: maxFileSize }
        });

        const cleanupFiles = [];
        let hasError = false;
        let fileCount = 0;

        // Helper to clean up partial uploads
        const cleanup = () => {
            for (const filepath of cleanupFiles) {
                fs.unlink(filepath, (err) => {
                    if (err && err.code !== 'ENOENT') {
                        console.error(`Failed to clean up ${filepath}:`, err);
                    }
                });
            }
        };

        // Handle request abort
        req.on('aborted', () => {
            hasError = true;
            cleanup();
            busboy.destroy();
        });

        busboy.on('file', (fieldname, file, info) => {
            if (hasError) {
                file.resume();
                return;
            }

            const { filename, mimeType } = info;
            fileCount++;

            // Validate MIME type
            if (allowedTypes.length > 0 && !allowedTypes.includes(mimeType)) {
                hasError = true;
                file.resume();
                cleanup();
                return res.status(400).json({
                    error: 'Invalid file type',
                    code: 'INVALID_TYPE',
                    allowed: allowedTypes
                });
            }

            const savePath = `${uploadDir}/${Date.now()}-${filename}`;
            cleanupFiles.push(savePath);

            const writeStream = fs.createWriteStream(savePath);

            // Handle write errors
            writeStream.on('error', (err) => {
                hasError = true;
                file.unpipe(writeStream);
                file.resume();
                cleanup();

                if (!res.headersSent) {
                    res.status(500).json({
                        error: 'Failed to save file',
                        code: 'WRITE_ERROR'
                    });
                }
            });

            // Handle file size limit exceeded
            file.on('limit', () => {
                hasError = true;
                writeStream.destroy();
                cleanup();

                if (!res.headersSent) {
                    res.status(413).json({
                        error: 'File too large',
                        code: 'FILE_TOO_LARGE',
                        maxSize: maxFileSize
                    });
                }
            });

            file.pipe(writeStream);

            writeStream.on('finish', () => {
                if (!hasError && onFile) {
                    onFile({
                        fieldname,
                        filename,
                        mimeType,
                        path: savePath,
                        size: writeStream.bytesWritten
                    });
                }
            });
        });

        busboy.on('error', (err) => {
            hasError = true;
            cleanup();

            if (!res.headersSent) {
                res.status(500).json({
                    error: 'Upload processing failed',
                    code: 'PARSE_ERROR'
                });
            }
        });

        busboy.on('finish', () => {
            if (hasError) return;

            if (fileCount === 0) {
                return res.status(400).json({
                    error: 'No file provided',
                    code: 'NO_FILE'
                });
            }

            // Success - remove from cleanup list
            cleanupFiles.length = 0;
            next();
        });

        req.pipe(busboy);
    };
}

module.exports = { createUploadHandler, UploadError };
```

### Using the Error Handler

```javascript
// routes/protected-upload.js
const express = require('express');
const { createUploadHandler } = require('../middleware/upload-error-handler');

const router = express.Router();

const uploadedFiles = [];

const uploadHandler = createUploadHandler({
    uploadDir: './uploads',
    maxFileSize: 50 * 1024 * 1024,  // 50MB
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    onFile: (file) => {
        uploadedFiles.push(file);
    }
});

router.post('/upload', uploadHandler, (req, res) => {
    // At this point, upload succeeded
    const lastFile = uploadedFiles.pop();
    res.json({
        success: true,
        file: {
            name: lastFile.filename,
            size: lastFile.size,
            type: lastFile.mimeType
        }
    });
});

module.exports = router;
```

## Multer with Streaming (Custom Storage)

If you prefer multer's middleware pattern, you can create custom storage that streams:

```javascript
// storage/stream-storage.js
const { PassThrough } = require('stream');
const fs = require('fs');
const path = require('path');

class StreamStorage {
    constructor(options) {
        this.destination = options.destination || './uploads';
        this.onStream = options.onStream || null;
    }

    _handleFile(req, file, callback) {
        const filename = `${Date.now()}-${file.originalname}`;
        const filepath = path.join(this.destination, filename);

        // Create a passthrough to allow interception
        const passThrough = new PassThrough();
        const writeStream = fs.createWriteStream(filepath);

        let bytesWritten = 0;

        passThrough.on('data', (chunk) => {
            bytesWritten += chunk.length;
        });

        // Allow custom stream processing
        if (this.onStream) {
            this.onStream(passThrough, file, req);
        }

        passThrough.pipe(writeStream);
        file.stream.pipe(passThrough);

        writeStream.on('error', callback);
        writeStream.on('finish', () => {
            callback(null, {
                path: filepath,
                filename: filename,
                size: bytesWritten
            });
        });
    }

    _removeFile(req, file, callback) {
        fs.unlink(file.path, callback);
    }
}

function streamStorage(options) {
    return new StreamStorage(options);
}

module.exports = { streamStorage };
```

### Using Custom Storage with Multer

```javascript
// routes/multer-stream.js
const express = require('express');
const multer = require('multer');
const { streamStorage } = require('../storage/stream-storage');
const { ContentScanner } = require('../validators/content-scanner');

const router = express.Router();

const upload = multer({
    storage: streamStorage({
        destination: './uploads',
        onStream: (stream, file, req) => {
            // Insert content scanner into stream
            const scanner = new ContentScanner({
                blockedPatterns: ['malicious-pattern']
            });

            stream.pipe(scanner);

            req.scanner = scanner;  // Store for later access
        }
    }),
    limits: {
        fileSize: 100 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'), false);
        }
    }
});

router.post('/upload', upload.single('file'), (req, res) => {
    const scanResults = req.scanner?.getResults();

    res.json({
        success: true,
        file: req.file,
        scan: scanResults
    });
});

module.exports = router;
```

## Complete Working Example

Here's a full implementation combining all the concepts:

```javascript
// app.js - Complete streaming upload server
const express = require('express');
const Busboy = require('busboy');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Transform } = require('stream');

const app = express();
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configuration
const CONFIG = {
    maxFileSize: 100 * 1024 * 1024,  // 100MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'video/mp4'],
    chunkSize: 64 * 1024  // 64KB chunks
};

// Validation transform stream
class ValidationStream extends Transform {
    constructor(options) {
        super();
        this.maxSize = options.maxSize;
        this.allowedTypes = options.allowedTypes;
        this.mimeType = options.mimeType;
        this.bytesReceived = 0;
        this.hash = crypto.createHash('sha256');
    }

    _transform(chunk, encoding, callback) {
        this.bytesReceived += chunk.length;
        this.hash.update(chunk);

        if (this.bytesReceived > this.maxSize) {
            callback(new Error('File size limit exceeded'));
            return;
        }

        callback(null, chunk);
    }

    _flush(callback) {
        this.fileHash = this.hash.digest('hex');
        callback();
    }
}

// Main upload endpoint
app.post('/api/upload', (req, res) => {
    const contentLength = parseInt(req.headers['content-length'], 10);

    const busboy = Busboy({
        headers: req.headers,
        limits: {
            fileSize: CONFIG.maxFileSize,
            files: 5
        }
    });

    const results = [];
    const errors = [];
    let fileIndex = 0;

    busboy.on('file', (fieldname, file, info) => {
        const { filename, mimeType } = info;
        const currentIndex = fileIndex++;

        // Validate MIME type
        if (!CONFIG.allowedTypes.includes(mimeType)) {
            errors.push({
                index: currentIndex,
                filename: filename,
                error: `Type ${mimeType} not allowed`
            });
            file.resume();  // Drain the stream
            return;
        }

        // Generate safe filename
        const ext = path.extname(filename);
        const safeName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
        const savePath = path.join(UPLOAD_DIR, safeName);

        // Create streams
        const validator = new ValidationStream({
            maxSize: CONFIG.maxFileSize,
            allowedTypes: CONFIG.allowedTypes,
            mimeType: mimeType
        });

        const writeStream = fs.createWriteStream(savePath);

        // Track progress
        let lastProgress = 0;
        file.on('data', (chunk) => {
            const progress = Math.round((validator.bytesReceived / contentLength) * 100);
            if (progress - lastProgress >= 10) {
                console.log(`File ${currentIndex}: ${progress}% uploaded`);
                lastProgress = progress;
            }
        });

        // Handle validation errors
        validator.on('error', (err) => {
            errors.push({
                index: currentIndex,
                filename: filename,
                error: err.message
            });
            file.unpipe(validator);
            writeStream.destroy();
            fs.unlink(savePath, () => {});
        });

        // Handle write errors
        writeStream.on('error', (err) => {
            errors.push({
                index: currentIndex,
                filename: filename,
                error: 'Failed to save file'
            });
        });

        // Handle successful write
        writeStream.on('finish', () => {
            if (!errors.find(e => e.index === currentIndex)) {
                results.push({
                    index: currentIndex,
                    originalName: filename,
                    savedAs: safeName,
                    mimeType: mimeType,
                    size: validator.bytesReceived,
                    hash: validator.fileHash
                });
            }
        });

        // Connect the pipeline
        file.pipe(validator).pipe(writeStream);

        // Handle file size limit from busboy
        file.on('limit', () => {
            errors.push({
                index: currentIndex,
                filename: filename,
                error: 'File size limit exceeded'
            });
            writeStream.destroy();
            fs.unlink(savePath, () => {});
        });
    });

    busboy.on('finish', () => {
        // Wait a tick for all writeStreams to finish
        setImmediate(() => {
            const response = {
                success: errors.length === 0,
                uploaded: results,
                errors: errors.length > 0 ? errors : undefined
            };

            const statusCode = errors.length === 0 ? 200 :
                              results.length > 0 ? 207 : 400;

            res.status(statusCode).json(response);
        });
    });

    busboy.on('error', (err) => {
        console.error('Busboy error:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Upload processing failed' });
        }
    });

    // Handle client disconnect
    req.on('aborted', () => {
        busboy.destroy();
    });

    req.pipe(busboy);
});

// Simple upload form for testing
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Streaming Upload Demo</title>
            <style>
                body { font-family: sans-serif; max-width: 600px; margin: 50px auto; }
                .progress { width: 100%; height: 20px; background: #eee; margin: 10px 0; }
                .progress-bar { height: 100%; background: #4CAF50; width: 0%; transition: width 0.3s; }
                .result { padding: 10px; margin: 10px 0; border-radius: 4px; }
                .success { background: #dff0d8; }
                .error { background: #f2dede; }
            </style>
        </head>
        <body>
            <h1>Streaming File Upload</h1>
            <form id="uploadForm">
                <input type="file" name="files" multiple />
                <button type="submit">Upload</button>
            </form>
            <div class="progress"><div class="progress-bar" id="progressBar"></div></div>
            <div id="result"></div>

            <script>
                document.getElementById('uploadForm').onsubmit = async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    const progressBar = document.getElementById('progressBar');
                    const resultDiv = document.getElementById('result');

                    const xhr = new XMLHttpRequest();
                    xhr.upload.onprogress = (e) => {
                        if (e.lengthComputable) {
                            const percent = (e.loaded / e.total) * 100;
                            progressBar.style.width = percent + '%';
                        }
                    };

                    xhr.onload = () => {
                        const response = JSON.parse(xhr.responseText);
                        resultDiv.innerHTML = '<pre class="result ' +
                            (response.success ? 'success' : 'error') + '">' +
                            JSON.stringify(response, null, 2) + '</pre>';
                    };

                    xhr.open('POST', '/api/upload');
                    xhr.send(formData);
                };
            </script>
        </body>
        </html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
```

## Performance Benchmarks

Here are typical performance characteristics when streaming vs buffering:

| Metric | Buffered Upload | Streaming Upload |
|--------|-----------------|------------------|
| Memory per 100MB file | ~100MB | ~1MB |
| Time to start processing | After full upload | Immediate |
| Concurrent 100MB uploads (1GB RAM) | ~8 | ~900+ |
| Disk I/O pattern | Burst write | Continuous write |
| Network timeout risk | Higher | Lower |

## Summary

Streaming file uploads in Node.js requires understanding a few core concepts:

1. Use busboy or similar streaming parsers instead of buffering middleware
2. Pipe streams directly to their destination (disk, S3, processing pipeline)
3. Validate content as it streams through using Transform streams
4. Track progress by counting bytes in the data event
5. Clean up partial files when errors occur
6. Handle client disconnects gracefully

The key insight is that streams let you process data as it arrives rather than waiting for the complete file. This transforms file uploads from a memory-bound operation into an I/O-bound one, dramatically improving scalability.

Start with the basic busboy example, then add validation, progress tracking, and cloud storage as your requirements grow.
