# How to Handle File Uploads with Multer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, Express, Multer, File Upload, API

Description: Learn how to handle file uploads in Express.js using Multer, covering storage options, validation, error handling, and production best practices.

---

File uploads are a common requirement in web applications, whether you're building a profile picture uploader, a document management system, or a media sharing platform. Multer is the go-to middleware for handling multipart/form-data in Node.js and Express. This guide covers everything from basic setup to production-ready configurations.

## What is Multer?

Multer is a Node.js middleware designed specifically for handling `multipart/form-data`, which is the encoding type used for file uploads. It adds a `body` object and a `file` or `files` object to the request, making it easy to access both text fields and uploaded files.

## Installation

Start by installing Multer in your Express project.

```bash
npm install multer express
```

## Basic File Upload

The simplest way to get started is using memory storage, which stores files as Buffer objects in memory.

```javascript
// app.js
const express = require('express');
const multer = require('multer');

const app = express();

// Configure multer to store files in memory
const upload = multer({ storage: multer.memoryStorage() });

// Single file upload endpoint
// The 'avatar' parameter must match the field name in your form
app.post('/upload', upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // req.file contains the uploaded file information
  console.log('File received:', {
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
  });

  res.json({
    message: 'File uploaded successfully',
    filename: req.file.originalname,
    size: req.file.size,
  });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Storage Options

Multer provides two built-in storage engines: memory storage and disk storage.

### Memory Storage

Memory storage keeps files in RAM as Buffer objects. This is useful for small files or when you need to process files before saving them.

```javascript
// Memory storage configuration
// Files are stored as Buffer objects in req.file.buffer
const memoryStorage = multer.memoryStorage();

const upload = multer({ storage: memoryStorage });

app.post('/upload', upload.single('file'), (req, res) => {
  // Access the file buffer directly
  const fileBuffer = req.file.buffer;

  // You can process the buffer, upload to cloud storage, etc.
  console.log('Buffer size:', fileBuffer.length);

  res.json({ success: true });
});
```

### Disk Storage

Disk storage saves files directly to the filesystem. You can customize the destination directory and filename.

```javascript
const path = require('path');
const crypto = require('crypto');

// Disk storage with custom destination and filename
const diskStorage = multer.diskStorage({
  // Set the destination folder for uploads
  destination: (req, file, cb) => {
    cb(null, './uploads/');
  },

  // Generate a unique filename to prevent overwrites
  filename: (req, file, cb) => {
    // Create a unique suffix using timestamp and random bytes
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

const upload = multer({ storage: diskStorage });

app.post('/upload', upload.single('document'), (req, res) => {
  // req.file.path contains the full path to the saved file
  res.json({
    message: 'File saved to disk',
    path: req.file.path,
    filename: req.file.filename,
  });
});
```

## File Validation

Always validate uploaded files to prevent security issues and ensure your application handles only expected file types.

### File Type Validation

Use a file filter to accept only specific MIME types.

```javascript
// Define allowed MIME types for images
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// File filter function to validate uploads
const imageFileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    // Accept the file
    cb(null, true);
  } else {
    // Reject the file with an error
    cb(new Error(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`), false);
  }
};

const upload = multer({
  storage: multer.diskStorage({
    destination: './uploads/images/',
    filename: (req, file, cb) => {
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueName + path.extname(file.originalname));
    },
  }),
  fileFilter: imageFileFilter,
});
```

### File Size Limits

Set limits to prevent users from uploading excessively large files.

```javascript
// Configure multer with size limits
const upload = multer({
  storage: multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 5,                   // Maximum 5 files per request
    fields: 10,                 // Maximum 10 non-file fields
    fieldSize: 1024 * 1024,     // Max field value size (1MB)
  },
});
```

## Multiple File Uploads

Multer supports several methods for handling multiple files.

### Multiple Files with Same Field Name

Use `.array()` when accepting multiple files under the same field name.

```javascript
// Accept up to 10 files with the field name 'photos'
app.post('/upload/photos', upload.array('photos', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  // req.files is an array of file objects
  const uploadedFiles = req.files.map(file => ({
    originalname: file.originalname,
    filename: file.filename,
    size: file.size,
    path: file.path,
  }));

  res.json({
    message: `${req.files.length} files uploaded successfully`,
    files: uploadedFiles,
  });
});
```

### Multiple Files with Different Field Names

Use `.fields()` when accepting files from multiple form fields.

```javascript
// Define which fields to accept and their limits
const cpUpload = upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'coverPhoto', maxCount: 1 },
  { name: 'gallery', maxCount: 8 },
]);

app.post('/upload/profile', cpUpload, (req, res) => {
  // req.files is an object with field names as keys
  const avatar = req.files['avatar'] ? req.files['avatar'][0] : null;
  const coverPhoto = req.files['coverPhoto'] ? req.files['coverPhoto'][0] : null;
  const gallery = req.files['gallery'] || [];

  res.json({
    avatar: avatar ? avatar.filename : null,
    coverPhoto: coverPhoto ? coverPhoto.filename : null,
    galleryCount: gallery.length,
  });
});
```

### Any File Upload

Use `.any()` to accept all files (use with caution).

```javascript
// Accept any files - use carefully and validate thoroughly
app.post('/upload/any', upload.any(), (req, res) => {
  res.json({
    files: req.files.map(f => ({
      fieldname: f.fieldname,
      filename: f.filename,
    })),
  });
});
```

## Error Handling

Proper error handling is important for providing good user feedback and preventing server crashes.

```javascript
const multer = require('multer');

// Create upload middleware with all configurations
const upload = multer({
  storage: multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  },
});

// Route with error handling middleware
app.post('/upload', (req, res, next) => {
  // Wrap multer in a custom middleware for error handling
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer-specific errors
      switch (err.code) {
        case 'LIMIT_FILE_SIZE':
          return res.status(400).json({
            error: 'File too large',
            message: 'Maximum file size is 5MB',
          });
        case 'LIMIT_FILE_COUNT':
          return res.status(400).json({
            error: 'Too many files',
            message: 'Maximum 5 files allowed',
          });
        case 'LIMIT_UNEXPECTED_FILE':
          return res.status(400).json({
            error: 'Unexpected field',
            message: `Unexpected file field: ${err.field}`,
          });
        default:
          return res.status(400).json({
            error: 'Upload error',
            message: err.message,
          });
      }
    } else if (err) {
      // Custom errors (like file type validation)
      return res.status(400).json({
        error: 'Validation error',
        message: err.message,
      });
    }

    // No error, continue to route handler
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    res.json({
      message: 'Upload successful',
      file: req.file.filename,
    });
  });
});
```

## File Upload Flow

Here is a visual representation of how Multer processes file uploads:

```mermaid
flowchart TD
    A[Client sends POST request] --> B[Express receives request]
    B --> C[Multer middleware intercepts]
    C --> D{Is multipart/form-data?}
    D -->|No| E[Pass to next middleware]
    D -->|Yes| F[Parse form data]
    F --> G{File filter check}
    G -->|Rejected| H[Return error]
    G -->|Accepted| I{Check file size}
    I -->|Too large| J[Return LIMIT_FILE_SIZE error]
    I -->|OK| K{Storage type?}
    K -->|Memory| L[Store in req.file.buffer]
    K -->|Disk| M[Write to filesystem]
    L --> N[Attach to req.file]
    M --> N
    N --> O[Call route handler]
    O --> P[Send response to client]
```

## Uploading to Cloud Storage

For production applications, you often want to upload files directly to cloud storage like AWS S3.

### Using multer-s3 with AWS S3

```javascript
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');

// Configure AWS S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Configure multer to upload directly to S3
const uploadS3 = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,

    // Set the ACL (access control list)
    acl: 'private',

    // Set content type based on file
    contentType: multerS3.AUTO_CONTENT_TYPE,

    // Generate the S3 key (file path in bucket)
    key: (req, file, cb) => {
      const folder = 'uploads';
      const filename = Date.now() + '-' + file.originalname;
      cb(null, `${folder}/${filename}`);
    },

    // Optional: Add metadata
    metadata: (req, file, cb) => {
      cb(null, {
        fieldName: file.fieldname,
        uploadedBy: req.user?.id || 'anonymous',
      });
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

app.post('/upload/s3', uploadS3.single('file'), (req, res) => {
  res.json({
    message: 'File uploaded to S3',
    location: req.file.location, // S3 URL
    key: req.file.key,           // S3 key
    bucket: req.file.bucket,     // Bucket name
  });
});
```

## Security Best Practices

When handling file uploads, security should be a top priority.

```javascript
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// Secure upload configuration
const secureUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Use a dedicated upload directory outside web root
      const uploadDir = './secure-uploads';

      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Generate a random filename to prevent path traversal attacks
      // Never use the original filename directly
      const randomName = crypto.randomBytes(16).toString('hex');
      const ext = path.extname(file.originalname).toLowerCase();

      // Only allow specific extensions
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'];
      if (!allowedExtensions.includes(ext)) {
        return cb(new Error('Invalid file extension'));
      }

      cb(null, randomName + ext);
    },
  }),

  fileFilter: (req, file, cb) => {
    // Check MIME type
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
    ];

    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type'));
    }

    cb(null, true);
  },

  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,                   // One file at a time
  },
});

// Store original filename in database, not on filesystem
app.post('/upload/secure', secureUpload.single('file'), async (req, res) => {
  try {
    // Store file metadata in database
    const fileRecord = {
      storedFilename: req.file.filename,
      originalFilename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user?.id,
      uploadedAt: new Date(),
    };

    // Save to database (pseudo-code)
    // await db.files.create(fileRecord);

    res.json({
      message: 'File uploaded securely',
      fileId: fileRecord.storedFilename,
    });
  } catch (error) {
    // Clean up file on error
    fs.unlink(req.file.path, () => {});
    res.status(500).json({ error: 'Upload failed' });
  }
});
```

## Complete Production Example

Here is a complete example bringing together all the concepts for a production-ready file upload API.

```javascript
const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
app.use(express.json());

// Ensure upload directory exists
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuration
const config = {
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
  allowedMimeTypes: {
    images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    documents: ['application/pdf', 'application/msword'],
  },
};

// Create storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Organize files by type
    let subDir = 'misc';
    if (config.allowedMimeTypes.images.includes(file.mimetype)) {
      subDir = 'images';
    } else if (config.allowedMimeTypes.documents.includes(file.mimetype)) {
      subDir = 'documents';
    }

    const fullPath = path.join(uploadDir, subDir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }

    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueId}${ext}`);
  },
});

// Create file filter
const fileFilter = (req, file, cb) => {
  const allAllowed = [
    ...config.allowedMimeTypes.images,
    ...config.allowedMimeTypes.documents,
  ];

  if (allAllowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Accepted: ${allAllowed.join(', ')}`));
  }
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSize,
    files: 5,
  },
});

// Error handling middleware for multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const errors = {
      LIMIT_FILE_SIZE: `File too large. Maximum size: ${config.maxFileSize / 1024 / 1024}MB`,
      LIMIT_FILE_COUNT: 'Too many files. Maximum 5 files allowed.',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field.',
    };
    return res.status(400).json({
      success: false,
      error: errors[err.code] || err.message,
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  next();
};

// Single file upload route
app.post('/api/upload/single',
  upload.single('file'),
  handleUploadError,
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided',
      });
    }

    res.json({
      success: true,
      data: {
        id: path.basename(req.file.filename, path.extname(req.file.filename)),
        originalName: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
      },
    });
  }
);

// Multiple files upload route
app.post('/api/upload/multiple',
  upload.array('files', 5),
  handleUploadError,
  (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files provided',
      });
    }

    const files = req.files.map(file => ({
      id: path.basename(file.filename, path.extname(file.filename)),
      originalName: file.originalname,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
    }));

    res.json({
      success: true,
      data: {
        count: files.length,
        files,
      },
    });
  }
);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Testing Your Upload API

Here is how to test your upload endpoint using curl:

```bash
# Single file upload
curl -X POST http://localhost:3000/api/upload/single \
  -F "file=@/path/to/image.jpg"

# Multiple files upload
curl -X POST http://localhost:3000/api/upload/multiple \
  -F "files=@/path/to/file1.jpg" \
  -F "files=@/path/to/file2.png"
```

## Quick Reference

| Method | Use Case | Example |
|--------|----------|---------|
| `upload.single(fieldname)` | One file from one field | Profile avatar |
| `upload.array(fieldname, max)` | Multiple files from one field | Photo gallery |
| `upload.fields(fields)` | Files from multiple fields | Avatar + cover photo |
| `upload.none()` | No files, only text fields | Form data without files |
| `upload.any()` | Any files (use carefully) | Dynamic file uploads |

## Summary

Multer makes file uploads in Express straightforward while providing the flexibility needed for production applications. Key takeaways:

- Always validate file types using both MIME type and extension checks
- Set appropriate size limits to prevent abuse
- Use random filenames instead of original filenames for security
- Handle errors gracefully with clear messages for users
- Consider cloud storage for scalability
- Store file metadata in a database for better management

---

*Need to monitor your file upload API performance? [OneUptime](https://oneuptime.com) provides comprehensive monitoring, alerting, and incident management to keep your applications running smoothly.*
