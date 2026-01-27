# How to Build File Upload APIs with Express and Multer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NodeJS, Express, Multer, API, File Upload, AWS S3, Backend

Description: A comprehensive guide to building file upload APIs with Express.js and Multer, covering configuration, validation, storage options, and production best practices.

---

> File uploads are one of the most common yet error-prone features in web applications. Getting them right means balancing usability, security, and performance from the start.

## What is Multer?

Multer is a Node.js middleware for handling `multipart/form-data`, which is primarily used for uploading files. It is built on top of busboy for maximum efficiency and integrates seamlessly with Express.js applications.

```javascript
// Install Multer
// npm install multer

const express = require('express');
const multer = require('multer');

const app = express();

// Basic Multer setup with memory storage
const upload = multer({ storage: multer.memoryStorage() });

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Multer Configuration

Multer provides flexible configuration options to control how files are stored and processed.

### Memory Storage

Memory storage keeps files in memory as Buffer objects. This is useful for small files that need immediate processing.

```javascript
const multer = require('multer');

// Memory storage configuration
// Files are stored in memory as Buffer objects
const memoryStorage = multer.memoryStorage();

const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5, // Maximum 5 files per request
  },
});
```

### Disk Storage

Disk storage writes files directly to the filesystem, which is more memory-efficient for large files.

```javascript
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Disk storage configuration
const diskStorage = multer.diskStorage({
  // Set the destination directory for uploads
  destination: function (req, file, cb) {
    cb(null, './uploads/');
  },

  // Generate a unique filename to prevent collisions
  filename: function (req, file, cb) {
    // Create unique filename: timestamp-randomhex.extension
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const extension = path.extname(file.originalname);
    cb(null, uniqueSuffix + extension);
  },
});

const upload = multer({
  storage: diskStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for disk storage
  },
});
```

## Single File Uploads

Handle single file uploads using the `.single()` method.

```javascript
const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();

// Configure storage
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Single file upload endpoint
// 'avatar' is the field name in the form
app.post('/upload/avatar', upload.single('avatar'), (req, res) => {
  // req.file contains the uploaded file information
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // File information available in req.file
  const fileInfo = {
    originalName: req.file.originalname,
    filename: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size,
    path: req.file.path,
  };

  res.json({
    message: 'File uploaded successfully',
    file: fileInfo,
  });
});

// Access other form fields via req.body
app.post('/upload/profile', upload.single('photo'), (req, res) => {
  const { username, email } = req.body;

  res.json({
    message: 'Profile updated',
    username,
    email,
    photo: req.file ? req.file.filename : null,
  });
});
```

## Multiple File Uploads

Multer provides several methods for handling multiple files.

### Multiple Files with Same Field Name

```javascript
// Upload up to 10 images with the same field name
app.post('/upload/gallery', upload.array('images', 10), (req, res) => {
  // req.files is an array of uploaded files
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const uploadedFiles = req.files.map(file => ({
    originalName: file.originalname,
    filename: file.filename,
    size: file.size,
  }));

  res.json({
    message: `${req.files.length} files uploaded successfully`,
    files: uploadedFiles,
  });
});
```

### Multiple Fields with Different Names

```javascript
// Define field configurations for multiple file inputs
const uploadFields = upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'documents', maxCount: 5 },
  { name: 'gallery', maxCount: 10 },
]);

app.post('/upload/mixed', uploadFields, (req, res) => {
  // Access files by field name
  const avatar = req.files['avatar'] ? req.files['avatar'][0] : null;
  const documents = req.files['documents'] || [];
  const gallery = req.files['gallery'] || [];

  res.json({
    avatar: avatar ? avatar.filename : null,
    documentsCount: documents.length,
    galleryCount: gallery.length,
  });
});
```

### Any Field Name

```javascript
// Accept files from any field name
app.post('/upload/any', upload.any(), (req, res) => {
  // req.files contains all uploaded files regardless of field name
  const filesByField = {};

  req.files.forEach(file => {
    if (!filesByField[file.fieldname]) {
      filesByField[file.fieldname] = [];
    }
    filesByField[file.fieldname].push(file.filename);
  });

  res.json({
    totalFiles: req.files.length,
    filesByField,
  });
});
```

## File Validation

Implement robust validation to ensure only allowed files are uploaded.

### File Type Validation

```javascript
const multer = require('multer');
const path = require('path');

// Define allowed MIME types and extensions
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword'];

// File filter function for images
const imageFileFilter = (req, file, cb) => {
  // Check MIME type
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    // Reject file with error
    return cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
  }

  // Check file extension as additional validation
  const extension = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  if (!allowedExtensions.includes(extension)) {
    return cb(new Error('Invalid file extension'), false);
  }

  // Accept the file
  cb(null, true);
};

// Create upload middleware with file filter
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: './uploads/images/',
    filename: (req, file, cb) => {
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueName + path.extname(file.originalname));
    },
  }),
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB for images
  },
});

// Document upload with different filter
const documentUpload = multer({
  storage: multer.diskStorage({
    destination: './uploads/documents/',
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
      return cb(new Error('Only PDF and Word documents are allowed'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB for documents
  },
});
```

### Magic Byte Validation

For enhanced security, validate file contents by checking magic bytes.

```javascript
const fileType = require('file-type');
const fs = require('fs');

// Middleware to validate file contents after upload
async function validateFileContent(req, res, next) {
  if (!req.file) {
    return next();
  }

  try {
    // Read file and detect actual type from magic bytes
    const buffer = fs.readFileSync(req.file.path);
    const type = await fileType.fromBuffer(buffer);

    // Define allowed types
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif'];

    if (!type || !allowedMimes.includes(type.mime)) {
      // Delete the invalid file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'Invalid file content',
        detected: type ? type.mime : 'unknown',
      });
    }

    // Attach detected type to request for later use
    req.detectedFileType = type;
    next();
  } catch (error) {
    next(error);
  }
}

// Use both Multer filter and content validation
app.post('/upload/secure',
  imageUpload.single('image'),
  validateFileContent,
  (req, res) => {
    res.json({
      message: 'File validated and uploaded',
      file: req.file.filename,
      detectedType: req.detectedFileType,
    });
  }
);
```

## Storage Options

### Local File System Storage

```javascript
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create upload directories if they do not exist
const createUploadDirs = () => {
  const dirs = ['./uploads', './uploads/images', './uploads/documents'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();

// Organize files by date
const dateBasedStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const uploadPath = `./uploads/${year}/${month}/${day}`;

    // Create directory structure
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: dateBasedStorage });
```

### Custom Storage Engine

```javascript
const multer = require('multer');
const { Writable } = require('stream');

// Custom storage engine example
class CustomStorage {
  constructor(opts) {
    this.opts = opts;
  }

  _handleFile(req, file, cb) {
    // Custom file handling logic
    const chunks = [];

    file.stream.on('data', chunk => chunks.push(chunk));
    file.stream.on('end', () => {
      const buffer = Buffer.concat(chunks);

      // Process the buffer (e.g., compress, encrypt, etc.)
      const processedBuffer = this.processFile(buffer);

      // Return file info
      cb(null, {
        buffer: processedBuffer,
        size: processedBuffer.length,
      });
    });
    file.stream.on('error', cb);
  }

  _removeFile(req, file, cb) {
    // Cleanup logic
    cb(null);
  }

  processFile(buffer) {
    // Add custom processing here
    return buffer;
  }
}

const customStorage = new CustomStorage({});
const uploadWithCustomStorage = multer({ storage: customStorage });
```

## S3 Integration

Integrate with AWS S3 for scalable cloud storage.

### Basic S3 Upload

```javascript
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const path = require('path');

// Configure S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Configure Multer with S3 storage
const s3Upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.S3_BUCKET_NAME,

    // Set ACL (access control list)
    acl: 'private',

    // Set content type automatically
    contentType: multerS3.AUTO_CONTENT_TYPE,

    // Generate S3 key (file path in bucket)
    key: function (req, file, cb) {
      const folder = req.body.folder || 'uploads';
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      const key = `${folder}/${uniqueSuffix}${extension}`;
      cb(null, key);
    },

    // Set metadata
    metadata: function (req, file, cb) {
      cb(null, {
        fieldName: file.fieldname,
        originalName: file.originalname,
        uploadedBy: req.user ? req.user.id : 'anonymous',
      });
    },
  }),

  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  },
});

// S3 upload endpoint
app.post('/upload/s3', s3Upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  res.json({
    message: 'File uploaded to S3',
    file: {
      key: req.file.key,
      location: req.file.location,
      bucket: req.file.bucket,
      size: req.file.size,
      mimetype: req.file.mimetype,
    },
  });
});
```

### S3 with Presigned URLs

For large files, use presigned URLs to upload directly to S3.

```javascript
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({ region: process.env.AWS_REGION });

// Generate presigned URL for upload
app.post('/upload/presigned-url', async (req, res) => {
  const { filename, contentType } = req.body;

  // Generate unique key
  const key = `uploads/${Date.now()}-${filename}`;

  // Create presigned URL for PUT request
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  try {
    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // URL expires in 1 hour
    });

    res.json({
      uploadUrl: presignedUrl,
      key: key,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

// Generate presigned URL for download
app.get('/download/:key', async (req, res) => {
  const { key } = req.params;

  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
  });

  try {
    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });

    res.json({ downloadUrl: presignedUrl });
  } catch (error) {
    console.error('Error generating download URL:', error);
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
});
```

## Progress Tracking

Track upload progress for better user experience.

### Server-Side Progress with Streams

```javascript
const express = require('express');
const busboy = require('busboy');
const fs = require('fs');
const path = require('path');

const app = express();

// Store upload progress in memory (use Redis for production)
const uploadProgress = new Map();

// Upload endpoint with progress tracking
app.post('/upload/progress', (req, res) => {
  const uploadId = Date.now().toString();
  const contentLength = parseInt(req.headers['content-length'], 10);

  // Initialize progress tracking
  uploadProgress.set(uploadId, {
    total: contentLength,
    uploaded: 0,
    percent: 0,
    status: 'uploading',
  });

  const bb = busboy({ headers: req.headers });

  bb.on('file', (name, file, info) => {
    const { filename } = info;
    const savePath = path.join('./uploads', `${uploadId}-${filename}`);
    const writeStream = fs.createWriteStream(savePath);

    // Track bytes uploaded
    file.on('data', (data) => {
      const progress = uploadProgress.get(uploadId);
      progress.uploaded += data.length;
      progress.percent = Math.round((progress.uploaded / progress.total) * 100);
      uploadProgress.set(uploadId, progress);
    });

    file.pipe(writeStream);

    writeStream.on('finish', () => {
      const progress = uploadProgress.get(uploadId);
      progress.status = 'complete';
      progress.filename = `${uploadId}-${filename}`;
      uploadProgress.set(uploadId, progress);
    });
  });

  bb.on('finish', () => {
    res.json({
      uploadId,
      message: 'Upload started',
      progressUrl: `/upload/progress/${uploadId}`,
    });
  });

  req.pipe(bb);
});

// Progress polling endpoint
app.get('/upload/progress/:uploadId', (req, res) => {
  const { uploadId } = req.params;
  const progress = uploadProgress.get(uploadId);

  if (!progress) {
    return res.status(404).json({ error: 'Upload not found' });
  }

  res.json(progress);

  // Clean up completed uploads after sending response
  if (progress.status === 'complete') {
    setTimeout(() => uploadProgress.delete(uploadId), 60000);
  }
});
```

### Server-Sent Events for Real-Time Progress

```javascript
// SSE endpoint for real-time progress updates
app.get('/upload/progress/:uploadId/stream', (req, res) => {
  const { uploadId } = req.params;

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send progress updates every 100ms
  const interval = setInterval(() => {
    const progress = uploadProgress.get(uploadId);

    if (!progress) {
      res.write('data: {"error": "Upload not found"}\n\n');
      clearInterval(interval);
      res.end();
      return;
    }

    res.write(`data: ${JSON.stringify(progress)}\n\n`);

    if (progress.status === 'complete' || progress.status === 'error') {
      clearInterval(interval);
      res.end();
    }
  }, 100);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
});
```

## Error Handling

Implement comprehensive error handling for upload failures.

### Multer Error Handler

```javascript
const multer = require('multer');

// Custom error handler middleware
function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    const errorMessages = {
      LIMIT_FILE_SIZE: 'File is too large',
      LIMIT_FILE_COUNT: 'Too many files uploaded',
      LIMIT_FIELD_KEY: 'Field name is too long',
      LIMIT_FIELD_VALUE: 'Field value is too long',
      LIMIT_FIELD_COUNT: 'Too many fields',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field',
      LIMIT_PART_COUNT: 'Too many parts',
    };

    return res.status(400).json({
      error: 'Upload error',
      message: errorMessages[err.code] || err.message,
      code: err.code,
      field: err.field,
    });
  }

  if (err) {
    // Custom validation errors
    return res.status(400).json({
      error: 'Upload error',
      message: err.message,
    });
  }

  next();
}

// Apply error handler after upload middleware
app.post('/upload',
  upload.single('file'),
  handleMulterError,
  (req, res) => {
    res.json({ success: true, file: req.file });
  }
);
```

### Comprehensive Error Handling

```javascript
const express = require('express');
const multer = require('multer');
const fs = require('fs');

const app = express();

// Wrapper function for async route handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Upload configuration
const upload = multer({
  storage: multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only JPEG and PNG allowed.'), false);
    }
    cb(null, true);
  },
});

// Upload route with comprehensive error handling
app.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      // Clean up partial uploads
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, () => {});
      }

      // Handle specific error types
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            error: 'File too large',
            maxSize: '10MB',
          });
        }
        return res.status(400).json({
          error: 'Upload error',
          details: err.message,
        });
      }

      // Handle custom validation errors
      return res.status(400).json({
        error: 'Validation error',
        details: err.message,
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select a file to upload',
      });
    }

    // Success response
    res.json({
      success: true,
      file: {
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Clean up uploaded file on error
  if (req.file && req.file.path) {
    fs.unlink(req.file.path, () => {});
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});
```

## Best Practices Summary

Building robust file upload APIs requires attention to security, performance, and user experience.

**Security Best Practices:**
- Always validate file types using both MIME type and magic bytes
- Sanitize filenames to prevent path traversal attacks
- Set appropriate file size limits based on your use case
- Store uploaded files outside the web root directory
- Use virus scanning for user-uploaded content in production

**Performance Best Practices:**
- Use disk storage instead of memory storage for large files
- Stream files directly to cloud storage for scalability
- Implement chunked uploads for files larger than 10MB
- Set up CDN for serving uploaded files
- Use presigned URLs for direct-to-storage uploads

**User Experience Best Practices:**
- Provide clear progress feedback during uploads
- Return meaningful error messages for validation failures
- Support resumable uploads for large files
- Implement proper file type detection and feedback

**Code Organization:**
- Create reusable upload middleware configurations
- Centralize file validation logic
- Use environment variables for storage configuration
- Implement proper cleanup for failed uploads

File upload functionality is a critical part of many applications. By following these patterns with Express and Multer, you can build secure, scalable, and user-friendly upload APIs.

---

Monitor your file upload APIs and track errors in real-time with [OneUptime](https://oneuptime.com). Get alerts when uploads fail and identify bottlenecks before they impact your users.
