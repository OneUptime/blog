# How to Use Multer for File Uploads in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Multer, FileUpload, Express, Middleware

Description: Learn how to use Multer middleware for handling file uploads in Node.js Express applications, including configuration, validation, and storage options.

---

Multer is the most popular middleware for handling multipart/form-data in Node.js. It is primarily used for uploading files and integrates seamlessly with Express.

## Installation

```bash
npm install multer
```

## Basic Configuration

### Default Usage

```javascript
const express = require('express');
const multer = require('multer');

const app = express();

// Simple configuration - files saved to 'uploads/' folder
const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('file'), (req, res) => {
  console.log(req.file);  // File info
  console.log(req.body);  // Text fields
  res.json({ file: req.file });
});

app.listen(3000);
```

### File Object Properties

```javascript
req.file = {
  fieldname: 'file',           // Form field name
  originalname: 'photo.jpg',    // Original filename
  encoding: '7bit',            // Encoding type
  mimetype: 'image/jpeg',      // MIME type
  destination: 'uploads/',     // Save destination
  filename: 'abc123',          // New filename
  path: 'uploads/abc123',      // Full path
  size: 12345                  // File size in bytes
};
```

## Storage Engines

### Disk Storage

```javascript
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  // Set destination folder
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  
  // Set filename
  filename: (req, file, cb) => {
    // Keep original name
    cb(null, file.originalname);
    
    // Or generate unique name
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, uniqueName + ext);
  },
});

const upload = multer({ storage });
```

### Dynamic Destination

```javascript
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Organize by file type
    let folder = 'uploads/misc/';
    
    if (file.mimetype.startsWith('image/')) {
      folder = 'uploads/images/';
    } else if (file.mimetype.startsWith('video/')) {
      folder = 'uploads/videos/';
    } else if (file.mimetype === 'application/pdf') {
      folder = 'uploads/documents/';
    }
    
    // Ensure directory exists
    require('fs').mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
```

### Memory Storage

```javascript
// Store files in memory as Buffer
const upload = multer({
  storage: multer.memoryStorage(),
});

app.post('/upload', upload.single('file'), (req, res) => {
  // File available as buffer
  const buffer = req.file.buffer;
  
  // Use buffer directly (e.g., upload to cloud storage)
  res.json({ size: buffer.length });
});
```

## Upload Methods

### Single File

```javascript
const upload = multer({ dest: 'uploads/' });

// 'file' is the field name in the form
app.post('/upload', upload.single('file'), (req, res) => {
  console.log(req.file);
});
```

### Multiple Files (Same Field)

```javascript
// Accept up to 10 files with field name 'photos'
app.post('/upload', upload.array('photos', 10), (req, res) => {
  console.log(req.files);  // Array of files
  res.json({ count: req.files.length });
});
```

### Multiple Fields

```javascript
const uploadFields = upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'gallery', maxCount: 8 },
  { name: 'documents', maxCount: 5 },
]);

app.post('/upload', uploadFields, (req, res) => {
  const avatar = req.files['avatar']?.[0];
  const gallery = req.files['gallery'] || [];
  const documents = req.files['documents'] || [];
  
  res.json({
    avatar: avatar?.filename,
    galleryCount: gallery.length,
    documentsCount: documents.length,
  });
});
```

### Any Field

```javascript
// Accept files from any field
app.post('/upload', upload.any(), (req, res) => {
  console.log(req.files);  // Array of all files
});
```

### No Files (Text Only)

```javascript
// Only parse text fields, reject any files
app.post('/form', upload.none(), (req, res) => {
  console.log(req.body);  // Form fields
});
```

## File Filtering

### Filter by MIME Type

```javascript
const fileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
});
```

### Filter by Extension

```javascript
const path = require('path');

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Extension ${ext} not allowed`), false);
  }
};
```

### Configurable Filter

```javascript
function createFileFilter(allowedTypes) {
  return (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Type ${file.mimetype} not allowed`), false);
    }
  };
}

const imageUpload = multer({
  storage,
  fileFilter: createFileFilter(['image/jpeg', 'image/png', 'image/gif']),
});

const documentUpload = multer({
  storage,
  fileFilter: createFileFilter(['application/pdf', 'application/msword']),
});
```

## Limits

```javascript
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,  // 5MB max file size
    files: 10,                  // Max 10 files
    fields: 20,                 // Max 20 non-file fields
    fieldNameSize: 100,         // Max field name length
    fieldSize: 1024 * 1024,     // Max field value size (1MB)
  },
});
```

### Different Limits for Different Routes

```javascript
const smallUpload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 },  // 1MB
});

const largeUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },  // 50MB
});

app.post('/avatar', smallUpload.single('avatar'), handleAvatar);
app.post('/video', largeUpload.single('video'), handleVideo);
```

## Error Handling

### Basic Error Handling

```javascript
const multer = require('multer');

app.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer error
      switch (err.code) {
        case 'LIMIT_FILE_SIZE':
          return res.status(400).json({ error: 'File too large' });
        case 'LIMIT_FILE_COUNT':
          return res.status(400).json({ error: 'Too many files' });
        case 'LIMIT_UNEXPECTED_FILE':
          return res.status(400).json({ error: `Unexpected field: ${err.field}` });
        default:
          return res.status(400).json({ error: err.message });
      }
    } else if (err) {
      // Custom error from fileFilter
      return res.status(400).json({ error: err.message });
    }
    
    // Success
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    res.json({ filename: req.file.filename });
  });
});
```

### Error Handling Middleware

```javascript
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const messages = {
      'LIMIT_FILE_SIZE': 'File is too large',
      'LIMIT_FILE_COUNT': 'Too many files',
      'LIMIT_UNEXPECTED_FILE': 'Unexpected file field',
      'LIMIT_FIELD_KEY': 'Field name too long',
      'LIMIT_FIELD_VALUE': 'Field value too long',
      'LIMIT_FIELD_COUNT': 'Too many fields',
      'LIMIT_PART_COUNT': 'Too many parts',
    };
    
    return res.status(400).json({
      error: messages[err.code] || err.message,
      code: err.code,
    });
  }
  
  next(err);
};

app.post('/upload', upload.single('file'), (req, res) => {
  res.json({ file: req.file });
});

app.use(handleMulterError);
```

## Preserving Original Filename Safely

```javascript
const path = require('path');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    // Sanitize filename
    const originalName = file.originalname;
    const ext = path.extname(originalName);
    const basename = path.basename(originalName, ext);
    
    // Remove special characters
    const safeName = basename
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 100);
    
    // Add timestamp for uniqueness
    const uniqueName = `${safeName}-${Date.now()}${ext}`;
    cb(null, uniqueName);
  },
});
```

## Custom Storage Engine

```javascript
const multer = require('multer');

class CustomStorage {
  constructor(opts) {
    this.opts = opts;
  }
  
  _handleFile(req, file, cb) {
    // Process the file stream
    const chunks = [];
    
    file.stream.on('data', chunk => chunks.push(chunk));
    file.stream.on('error', err => cb(err));
    file.stream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      
      // Custom processing here
      cb(null, {
        buffer,
        size: buffer.length,
        originalname: file.originalname,
      });
    });
  }
  
  _removeFile(req, file, cb) {
    // Clean up if needed
    cb(null);
  }
}

const upload = multer({
  storage: new CustomStorage({}),
});
```

## Integration with Form Data

### HTML Form

```html
<form action="/upload" method="POST" enctype="multipart/form-data">
  <input type="text" name="title" />
  <input type="file" name="image" />
  <input type="file" name="documents" multiple />
  <button type="submit">Upload</button>
</form>
```

### Accessing Form Fields

```javascript
app.post('/upload', upload.single('image'), (req, res) => {
  const title = req.body.title;      // Text field
  const image = req.file;            // File
  
  res.json({ title, image: image.filename });
});
```

## Conditional Upload

```javascript
app.post('/upload', (req, res, next) => {
  // Check condition before processing upload
  if (!req.headers['x-upload-token']) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  upload.single('file')(req, res, (err) => {
    if (err) return next(err);
    res.json({ file: req.file });
  });
});
```

## Cleanup on Error

```javascript
const fs = require('fs').promises;

app.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    // Process file
    await processFile(req.file);
    res.json({ success: true });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
});
```

## Summary

| Method | Usage |
|--------|-------|
| `single(fieldname)` | Single file |
| `array(fieldname, max)` | Multiple files, same field |
| `fields([...])` | Multiple files, different fields |
| `any()` | Accept any file field |
| `none()` | Text fields only |

| Storage | Use Case |
|---------|----------|
| `diskStorage` | Save to disk with custom filename |
| `memoryStorage` | Process in memory, cloud upload |
| Custom engine | Special processing needs |

Best practices:
- Always validate file types and sizes
- Use unique filenames to prevent overwrites
- Handle errors gracefully
- Clean up files on processing errors
- Use memory storage for cloud uploads
- Set appropriate limits based on use case
