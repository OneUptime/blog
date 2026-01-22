# How to Process POST Data in Express.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Express, POST, HTTP, API, Forms, JSON

Description: Learn how to handle POST request data in Express.js including JSON payloads, form data, file uploads, and raw body parsing with proper validation and error handling.

---

Processing POST data is one of the most common tasks in Express.js applications. Whether you are building a REST API that accepts JSON or handling HTML form submissions, Express provides middleware to parse various content types and make the data available in `req.body`.

## Quick Setup

Modern Express (4.16+) includes built-in body parsing middleware:

```javascript
const express = require('express');
const app = express();

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies (HTML forms)
app.use(express.urlencoded({ extended: true }));

app.post('/api/users', (req, res) => {
  console.log(req.body); // Parsed request body
  res.json({ received: req.body });
});

app.listen(3000);
```

## Parsing JSON Data

Most APIs today accept JSON. Use `express.json()` middleware to parse `application/json` content:

```javascript
const express = require('express');
const app = express();

// Configure JSON parser
app.use(express.json({
  limit: '10mb',        // Max body size
  strict: true,         // Only accept arrays and objects
  type: 'application/json', // Content types to parse
}));

app.post('/api/users', (req, res) => {
  const { name, email, age } = req.body;
  
  // req.body contains the parsed JSON
  console.log('Name:', name);
  console.log('Email:', email);
  console.log('Age:', age);
  
  res.status(201).json({
    message: 'User created',
    user: { name, email, age },
  });
});
```

### Client Request Example

```javascript
// Using fetch
fetch('/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
  }),
});
```

```bash
# Using curl
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com", "age": 30}'
```

## Parsing URL-Encoded Form Data

HTML forms with `enctype="application/x-www-form-urlencoded"` (the default) send data in URL-encoded format:

```javascript
app.use(express.urlencoded({
  extended: true,  // Use qs library for nested objects
  limit: '10mb',
  parameterLimit: 1000, // Max number of parameters
}));

app.post('/submit-form', (req, res) => {
  const { username, password } = req.body;
  
  // Validate and process...
  res.redirect('/dashboard');
});
```

### HTML Form

```html
<form action="/submit-form" method="POST">
  <input type="text" name="username" />
  <input type="password" name="password" />
  <button type="submit">Login</button>
</form>
```

### Extended vs Simple Parsing

```javascript
// extended: true (default) - uses qs library
// Supports nested objects and arrays
// Form: user[name]=John&user[email]=john@example.com&tags[]=a&tags[]=b
// Result: { user: { name: 'John', email: 'john@example.com' }, tags: ['a', 'b'] }

// extended: false - uses querystring library
// Only supports flat key-value pairs
// Form: name=John&email=john@example.com
// Result: { name: 'John', email: 'john@example.com' }
```

## Handling File Uploads

File uploads use `multipart/form-data` encoding. Express does not parse this by default. Use `multer`:

```bash
npm install multer
```

```javascript
const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();

// Configure storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: function(req, file, cb) {
    // Accept images only
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images are allowed'));
  },
});

// Single file upload
app.post('/upload/avatar', upload.single('avatar'), (req, res) => {
  // req.file contains the uploaded file info
  // req.body contains text fields
  
  res.json({
    message: 'File uploaded',
    file: {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    },
  });
});

// Multiple files upload
app.post('/upload/photos', upload.array('photos', 10), (req, res) => {
  // req.files is an array of uploaded files
  res.json({
    message: 'Files uploaded',
    files: req.files.map(f => f.filename),
  });
});

// Multiple fields with files
app.post('/upload/profile', upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'documents', maxCount: 5 },
]), (req, res) => {
  // req.files is an object with field names as keys
  res.json({
    avatar: req.files['avatar']?.[0]?.filename,
    documents: req.files['documents']?.map(f => f.filename),
  });
});
```

### Memory Storage (for Processing)

When you need to process files without saving to disk:

```javascript
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

app.post('/upload/process', upload.single('image'), async (req, res) => {
  // req.file.buffer contains the file data
  const buffer = req.file.buffer;
  
  // Process the image (resize, compress, etc.)
  const processedImage = await sharp(buffer)
    .resize(200, 200)
    .jpeg({ quality: 80 })
    .toBuffer();
  
  // Upload to cloud storage
  await s3.upload({
    Bucket: 'my-bucket',
    Key: `images/${Date.now()}.jpg`,
    Body: processedImage,
  }).promise();
  
  res.json({ message: 'Image processed and uploaded' });
});
```

## Parsing Raw Body Data

For webhooks or custom content types, you may need the raw body:

```javascript
// Parse raw body as Buffer
app.use('/webhooks', express.raw({
  type: 'application/json',
  limit: '10mb',
}));

app.post('/webhooks/stripe', (req, res) => {
  // req.body is a Buffer
  const signature = req.headers['stripe-signature'];
  
  try {
    // Stripe requires raw body for signature verification
    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    // Process event...
    res.json({ received: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
```

### Keeping Raw Body Available

When you need both parsed JSON and raw body:

```javascript
app.use(express.json({
  verify: (req, res, buf) => {
    // Store raw body for later use
    req.rawBody = buf;
  },
}));

app.post('/webhooks/github', (req, res) => {
  // req.body is parsed JSON
  // req.rawBody is the raw Buffer (for signature verification)
  
  const signature = req.headers['x-hub-signature-256'];
  const hmac = crypto.createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET);
  hmac.update(req.rawBody);
  const expectedSignature = 'sha256=' + hmac.digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook...
  res.json({ received: true });
});
```

## Handling Text and XML

For plain text or XML content:

```javascript
// Parse plain text
app.use(express.text({
  type: 'text/plain',
  limit: '1mb',
}));

// For XML, use express.text() and parse manually
app.use('/api/xml', express.text({ type: 'application/xml' }));

app.post('/api/xml', (req, res) => {
  // req.body is a string containing XML
  const xmlParser = require('fast-xml-parser');
  const parsed = xmlParser.parse(req.body);
  
  res.json(parsed);
});
```

## Input Validation

Always validate POST data. Never trust user input:

```javascript
const Joi = require('joi');

// Define validation schema
const userSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  age: Joi.number().integer().min(0).max(150).optional(),
  role: Joi.string().valid('user', 'admin').default('user'),
});

// Validation middleware
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,      // Return all errors
      stripUnknown: true,     // Remove unknown fields
    });
    
    if (error) {
      const errors = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      
      return res.status(400).json({ errors });
    }
    
    // Replace body with validated/sanitized value
    req.body = value;
    next();
  };
}

app.post('/api/users', validate(userSchema), (req, res) => {
  // req.body is validated and sanitized
  const user = createUser(req.body);
  res.status(201).json(user);
});
```

## Error Handling

Handle body parsing errors gracefully:

```javascript
app.use(express.json());

// Catch JSON parsing errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON',
      message: err.message,
    });
  }
  next(err);
});

// Handle multer errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        maxSize: '5MB',
      });
    }
    return res.status(400).json({
      error: 'Upload error',
      message: err.message,
    });
  }
  next(err);
});
```

## Content-Type Based Routing

Handle different content types on the same endpoint:

```javascript
const express = require('express');
const app = express();

// Parse different content types
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

app.post('/api/data', (req, res) => {
  const contentType = req.headers['content-type'];
  
  if (contentType?.includes('application/json')) {
    // req.body is parsed JSON
    return res.json({ type: 'json', data: req.body });
  }
  
  if (contentType?.includes('application/x-www-form-urlencoded')) {
    // req.body is parsed form data
    return res.json({ type: 'form', data: req.body });
  }
  
  if (contentType?.includes('text/plain')) {
    // req.body is a string
    return res.json({ type: 'text', data: req.body });
  }
  
  res.status(415).json({ error: 'Unsupported content type' });
});
```

## Complete Example

Here is a complete Express application handling various POST scenarios:

```javascript
const express = require('express');
const multer = require('multer');
const Joi = require('joi');

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// File upload config
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Validation schemas
const schemas = {
  user: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
  }),
};

// Validation middleware
function validate(schemaName) {
  return (req, res, next) => {
    const { error, value } = schemas[schemaName].validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    req.body = value;
    next();
  };
}

// Routes
app.post('/api/users', validate('user'), (req, res) => {
  res.status(201).json({ user: req.body });
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({
    filename: req.file.originalname,
    size: req.file.size,
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Summary

| Content Type | Middleware | req.body Type |
|--------------|------------|---------------|
| `application/json` | `express.json()` | Object |
| `application/x-www-form-urlencoded` | `express.urlencoded()` | Object |
| `multipart/form-data` | `multer` | Object + req.file(s) |
| `text/plain` | `express.text()` | String |
| Any | `express.raw()` | Buffer |

Processing POST data in Express involves choosing the right parser for your content type, validating the data thoroughly, and handling errors gracefully. Always validate and sanitize user input before processing.
