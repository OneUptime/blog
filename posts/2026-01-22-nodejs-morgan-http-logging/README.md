# How to Use Morgan for HTTP Logging in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Morgan, Logging, Express, HTTP

Description: Learn how to use Morgan for HTTP request logging in Node.js Express applications with custom formats, file logging, and production configurations.

---

Morgan is an HTTP request logger middleware for Node.js. It logs details about incoming requests, making it easier to debug and monitor your Express applications.

## Installation

```bash
npm install morgan
```

## Basic Usage

```javascript
const express = require('express');
const morgan = require('morgan');

const app = express();

// Use predefined format
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.json({ message: 'Hello!' });
});

app.listen(3000);
```

Output:
```
GET / 200 5.123 ms - 23
```

## Predefined Formats

### combined (Apache Combined Log Format)

```javascript
app.use(morgan('combined'));
```

Output:
```
::1 - - [10/Jan/2024:12:30:45 +0000] "GET / HTTP/1.1" 200 23 "-" "Mozilla/5.0..."
```

### common (Apache Common Log Format)

```javascript
app.use(morgan('common'));
```

Output:
```
::1 - - [10/Jan/2024:12:30:45 +0000] "GET / HTTP/1.1" 200 23
```

### dev (Concise colored output for development)

```javascript
app.use(morgan('dev'));
```

Output:
```
GET / 200 5.123 ms - 23
```

### short

```javascript
app.use(morgan('short'));
```

Output:
```
::1 - GET / HTTP/1.1 200 23 - 5.123 ms
```

### tiny

```javascript
app.use(morgan('tiny'));
```

Output:
```
GET / 200 23 - 5.123 ms
```

## Custom Formats

### Using Format String

```javascript
// Define custom format
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// With more details
app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'));
```

### Available Tokens

| Token | Description |
|-------|-------------|
| `:method` | HTTP method |
| `:url` | Request URL |
| `:status` | Response status |
| `:res[header]` | Response header |
| `:req[header]` | Request header |
| `:response-time` | Response time in ms |
| `:date[format]` | Date (clf, iso, web) |
| `:remote-addr` | Client IP |
| `:remote-user` | Basic auth user |
| `:http-version` | HTTP version |
| `:referrer` | Referrer header |
| `:user-agent` | User agent |
| `:total-time` | Total request time |

### Custom Tokens

```javascript
// Add user ID token
morgan.token('user-id', (req) => {
  return req.user?.id || 'anonymous';
});

// Add request ID token
morgan.token('request-id', (req) => {
  return req.headers['x-request-id'] || '-';
});

// Add body token (for POST requests)
morgan.token('body', (req) => {
  return JSON.stringify(req.body);
});

// Use custom tokens
app.use(morgan(':method :url :status :response-time ms - user::user-id req::request-id'));
```

### Custom Token for Response Body

```javascript
morgan.token('response-body', (req, res) => {
  return res.locals.body;
});

// Middleware to capture response body
app.use((req, res, next) => {
  const oldJson = res.json;
  res.json = function(body) {
    res.locals.body = JSON.stringify(body);
    return oldJson.call(this, body);
  };
  next();
});

app.use(morgan(':method :url :status - :response-body'));
```

## Writing to Files

### Basic File Logging

```javascript
const fs = require('fs');
const path = require('path');
const morgan = require('morgan');

// Create write stream
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'logs', 'access.log'),
  { flags: 'a' }  // Append mode
);

// Log to file
app.use(morgan('combined', { stream: accessLogStream }));
```

### Rotating Log Files

```bash
npm install rotating-file-stream
```

```javascript
const rfs = require('rotating-file-stream');
const path = require('path');
const morgan = require('morgan');

// Create rotating write stream
const accessLogStream = rfs.createStream('access.log', {
  interval: '1d',        // Rotate daily
  path: path.join(__dirname, 'logs'),
  compress: 'gzip',      // Compress rotated files
  maxFiles: 14,          // Keep 14 days of logs
});

app.use(morgan('combined', { stream: accessLogStream }));
```

### Multiple Outputs

```javascript
const morgan = require('morgan');
const fs = require('fs');

// Log to console in development
app.use(morgan('dev'));

// Log to file in production
const accessLogStream = fs.createWriteStream('./logs/access.log', { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream }));
```

## Conditional Logging

### Skip Certain Requests

```javascript
// Skip successful requests
app.use(morgan('combined', {
  skip: (req, res) => res.statusCode < 400,
}));

// Skip health check endpoints
app.use(morgan('dev', {
  skip: (req) => req.url === '/health' || req.url === '/ready',
}));

// Skip static files
app.use(morgan('dev', {
  skip: (req) => req.url.startsWith('/static'),
}));
```

### Different Formats for Different Conditions

```javascript
// Error logging (4xx, 5xx only)
app.use(morgan('combined', {
  skip: (req, res) => res.statusCode < 400,
  stream: fs.createWriteStream('./logs/error.log', { flags: 'a' }),
}));

// Success logging
app.use(morgan('short', {
  skip: (req, res) => res.statusCode >= 400,
  stream: fs.createWriteStream('./logs/access.log', { flags: 'a' }),
}));
```

## Environment-Based Configuration

```javascript
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

function setupLogging(app) {
  if (process.env.NODE_ENV === 'production') {
    // Production: Log to files in combined format
    const accessLogStream = fs.createWriteStream(
      path.join(__dirname, 'logs', 'access.log'),
      { flags: 'a' }
    );
    
    app.use(morgan('combined', { stream: accessLogStream }));
    
  } else if (process.env.NODE_ENV === 'test') {
    // Test: Disable logging
    // No morgan middleware
    
  } else {
    // Development: Colored console output
    app.use(morgan('dev'));
  }
}

setupLogging(app);
```

## Integration with Winston

```bash
npm install winston
```

```javascript
const morgan = require('morgan');
const winston = require('winston');

// Create Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/http.log' }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

// Create stream for Morgan
const stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

// Use Morgan with Winston stream
app.use(morgan('combined', { stream }));
```

### Structured JSON Logging

```javascript
const morgan = require('morgan');
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/http.json' }),
  ],
});

// Custom format function for JSON
morgan.format('json', (tokens, req, res) => {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: parseInt(tokens.status(req, res)),
    responseTime: parseFloat(tokens['response-time'](req, res)),
    contentLength: tokens.res(req, res, 'content-length'),
    userAgent: tokens['user-agent'](req, res),
    ip: tokens['remote-addr'](req, res),
    userId: req.user?.id,
  });
});

const stream = {
  write: (message) => {
    const log = JSON.parse(message);
    logger.info('HTTP Request', log);
  },
};

app.use(morgan('json', { stream }));
```

## Complete Example

```javascript
const express = require('express');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const rfs = require('rotating-file-stream');

const app = express();
app.use(express.json());

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Custom tokens
morgan.token('user-id', (req) => req.user?.id || '-');
morgan.token('request-id', (req) => req.headers['x-request-id'] || '-');

// Custom format
const customFormat = ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms :request-id';

if (process.env.NODE_ENV === 'production') {
  // Rotating file logs for production
  const accessLogStream = rfs.createStream('access.log', {
    interval: '1d',
    path: logsDir,
    compress: 'gzip',
    maxFiles: 30,
  });
  
  const errorLogStream = rfs.createStream('error.log', {
    interval: '1d',
    path: logsDir,
    compress: 'gzip',
    maxFiles: 90,
  });
  
  // All requests to access.log
  app.use(morgan(customFormat, { stream: accessLogStream }));
  
  // Errors only to error.log
  app.use(morgan(customFormat, {
    skip: (req, res) => res.statusCode < 400,
    stream: errorLogStream,
  }));
  
} else {
  // Colorful console output for development
  app.use(morgan('dev'));
}

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Hello!' });
});

app.get('/error', (req, res) => {
  res.status(500).json({ error: 'Something went wrong' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Summary

| Format | Use Case |
|--------|----------|
| `dev` | Development, colored output |
| `combined` | Production, Apache format |
| `common` | Basic production logs |
| `tiny` | Minimal logging |
| `short` | Brief logs |

| Feature | Implementation |
|---------|----------------|
| File logging | Use `stream` option |
| Rotation | rotating-file-stream |
| Custom tokens | `morgan.token()` |
| JSON logging | Custom format function |
| Skip requests | `skip` option |

| Best Practice | Description |
|---------------|-------------|
| Rotate logs | Prevent disk fill |
| Skip health checks | Reduce noise |
| Use different formats | Dev vs Production |
| Integrate with logger | Winston/Bunyan |
