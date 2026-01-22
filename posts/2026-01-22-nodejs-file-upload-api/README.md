# How to Create File Upload API in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, FileUpload, Express, API, Multer

Description: Learn how to create a file upload API in Node.js using Multer, handling single and multiple file uploads, validations, and cloud storage integration.

---

File uploads are a common requirement in web applications. This guide covers implementing file upload APIs in Node.js using Express and Multer, including validation, storage options, and cloud integration.

## Basic Setup with Multer

```bash
npm install express multer
```

### Simple File Upload

```javascript
const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();

// Basic storage configuration
const upload = multer({ dest: 'uploads/' });

// Single file upload
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  res.json({
    message: 'File uploaded successfully',
    file: {
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    },
  });
});

app.listen(3000);
```

### Custom Storage Configuration

```javascript
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Disk storage with custom filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({ storage });
```

## File Validation

### File Type Validation

```javascript
const multer = require('multer');

const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and PDF allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,  // 5MB limit
  },
});
```

### Image-Only Upload

```javascript
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 },  // 10MB
});
```

### Multiple Validations

```javascript
const multer = require('multer');

const createUploader = (options) => {
  const { allowedTypes, maxSize, maxFiles } = options;
  
  return multer({
    storage: multer.diskStorage({
      destination: 'uploads/',
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (allowedTypes && !allowedTypes.includes(file.mimetype)) {
        return cb(new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`));
      }
      cb(null, true);
    },
    limits: {
      fileSize: maxSize || 5 * 1024 * 1024,
      files: maxFiles || 10,
    },
  });
};

// Usage
const imageUploader = createUploader({
  allowedTypes: ['image/jpeg', 'image/png'],
  maxSize: 5 * 1024 * 1024,
  maxFiles: 5,
});

const documentUploader = createUploader({
  allowedTypes: ['application/pdf', 'application/msword'],
  maxSize: 10 * 1024 * 1024,
  maxFiles: 3,
});
```

## Multiple File Uploads

### Multiple Files (Same Field)

```javascript
const upload = multer({ storage });

// Upload up to 5 files
app.post('/upload-multiple', upload.array('files', 5), (req, res) => {
  const files = req.files.map(file => ({
    originalName: file.originalname,
    filename: file.filename,
    size: file.size,
  }));
  
  res.json({ message: 'Files uploaded', files });
});
```

### Multiple Fields

```javascript
const upload = multer({ storage });

const uploadFields = upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'documents', maxCount: 5 },
]);

app.post('/upload-fields', uploadFields, (req, res) => {
  const avatar = req.files['avatar']?.[0];
  const documents = req.files['documents'] || [];
  
  res.json({
    avatar: avatar?.filename,
    documents: documents.map(d => d.filename),
  });
});
```

## Error Handling

```javascript
const express = require('express');
const multer = require('multer');

const app = express();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

app.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer-specific errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Max 5MB allowed.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Too many files.' });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'Unexpected field name.' });
      }
      return res.status(400).json({ error: err.message });
    }
    
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    res.json({ filename: req.file.filename });
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});
```

## Memory Storage

For processing files without saving to disk:

```javascript
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.post('/upload', upload.single('file'), (req, res) => {
  // File is available as buffer
  const buffer = req.file.buffer;
  
  // Process the buffer (e.g., upload to cloud, process image)
  console.log('Buffer size:', buffer.length);
  
  res.json({ size: buffer.length });
});
```

## Cloud Storage Integration

### AWS S3 Upload

```bash
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage
```

```javascript
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const multer = require('multer');
const crypto = require('crypto');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const upload = multer({ storage: multer.memoryStorage() });

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const key = `uploads/${crypto.randomUUID()}-${req.file.originalname}`;
    
    const uploadParams = {
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };
    
    await s3Client.send(new PutObjectCommand(uploadParams));
    
    const url = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    
    res.json({ url });
  } catch (error) {
    console.error('S3 upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});
```

### Google Cloud Storage

```bash
npm install @google-cloud/storage
```

```javascript
const { Storage } = require('@google-cloud/storage');
const multer = require('multer');

const storage = new Storage({
  keyFilename: './service-account.json',
});
const bucket = storage.bucket(process.env.GCS_BUCKET);

const upload = multer({ storage: multer.memoryStorage() });

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const filename = `${Date.now()}-${req.file.originalname}`;
    const blob = bucket.file(filename);
    
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
    });
    
    blobStream.on('error', (err) => {
      res.status(500).json({ error: 'Upload failed' });
    });
    
    blobStream.on('finish', async () => {
      // Make file public (optional)
      await blob.makePublic();
      
      const publicUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET}/${filename}`;
      res.json({ url: publicUrl });
    });
    
    blobStream.end(req.file.buffer);
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});
```

## Progress Tracking

### Server-Side Streaming

```javascript
const express = require('express');
const busboy = require('busboy');
const fs = require('fs');
const path = require('path');

app.post('/upload-progress', (req, res) => {
  const bb = busboy({ headers: req.headers });
  const totalSize = parseInt(req.headers['content-length'], 10);
  let uploadedSize = 0;
  
  bb.on('file', (name, file, info) => {
    const { filename, mimeType } = info;
    const savePath = path.join('uploads', filename);
    const writeStream = fs.createWriteStream(savePath);
    
    file.on('data', (chunk) => {
      uploadedSize += chunk.length;
      const progress = Math.round((uploadedSize / totalSize) * 100);
      console.log(`Progress: ${progress}%`);
    });
    
    file.pipe(writeStream);
  });
  
  bb.on('finish', () => {
    res.json({ message: 'Upload complete' });
  });
  
  req.pipe(bb);
});
```

## Image Processing

```bash
npm install sharp
```

```javascript
const sharp = require('sharp');
const multer = require('multer');
const path = require('path');

const upload = multer({ storage: multer.memoryStorage() });

app.post('/upload-image', upload.single('image'), async (req, res) => {
  try {
    const filename = `${Date.now()}.webp`;
    const outputPath = path.join('uploads', filename);
    
    // Resize and convert to WebP
    await sharp(req.file.buffer)
      .resize(800, 600, { fit: 'inside' })
      .webp({ quality: 80 })
      .toFile(outputPath);
    
    // Create thumbnail
    const thumbPath = path.join('uploads', `thumb-${filename}`);
    await sharp(req.file.buffer)
      .resize(200, 200, { fit: 'cover' })
      .webp({ quality: 70 })
      .toFile(thumbPath);
    
    res.json({
      image: `/uploads/${filename}`,
      thumbnail: `/uploads/thumb-${filename}`,
    });
  } catch (error) {
    res.status(500).json({ error: 'Image processing failed' });
  }
});
```

## Complete File Upload API

```javascript
const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs').promises;

const app = express();

// Ensure upload directory exists
const uploadDir = 'uploads';
fs.mkdir(uploadDir, { recursive: true });

// Storage configuration
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = crypto.randomBytes(16).toString('hex');
    cb(null, `${name}${ext}`);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowed = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
  ];
  
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,  // 10MB
    files: 5,
  },
});

// Upload endpoint
app.post('/api/upload', (req, res) => {
  upload.array('files', 5)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        error: err.message,
      });
    }
    
    if (!req.files?.length) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded',
      });
    }
    
    const files = req.files.map(file => ({
      id: path.basename(file.filename, path.extname(file.filename)),
      originalName: file.originalname,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      url: `/uploads/${file.filename}`,
    }));
    
    res.json({
      success: true,
      files,
    });
  });
});

// Serve uploaded files
app.use('/uploads', express.static(uploadDir));

// Delete file
app.delete('/api/files/:filename', async (req, res) => {
  try {
    const filepath = path.join(uploadDir, req.params.filename);
    await fs.unlink(filepath);
    res.json({ success: true });
  } catch (error) {
    res.status(404).json({ error: 'File not found' });
  }
});

app.listen(3000);
```

## Summary

| Feature | Implementation |
|---------|----------------|
| Single file | `upload.single('fieldname')` |
| Multiple files | `upload.array('fieldname', max)` |
| Multiple fields | `upload.fields([...])` |
| File validation | `fileFilter` option |
| Size limit | `limits.fileSize` option |
| Cloud storage | Memory storage + SDK |
| Image processing | Sharp library |

Best practices:
- Always validate file types and sizes
- Use unique filenames to prevent collisions
- Store files outside web root for security
- Implement proper error handling
- Consider cloud storage for production
- Add virus scanning for sensitive applications
- Clean up orphaned files periodically
