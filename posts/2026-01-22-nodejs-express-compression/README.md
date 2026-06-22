# How to Use Compression in Express.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Node.js, Express.js, Compression, Performance, Gzip

Description: Learn how to implement response compression in Express.js applications using gzip, deflate, and Brotli to improve performance and reduce bandwidth.

---

Response compression significantly reduces the size of HTTP responses, improving load times and reducing bandwidth costs. Let's explore how to implement compression effectively in Express.js applications.

## Installing the Compression Middleware

```bash
npm install compression
```

## Basic Compression Setup

```javascript
const express = require('express');
const compression = require('compression');

const app = express();

// Enable compression for all responses
app.use(compression());

// Your routes
app.get('/api/data', (req, res) => {
  // Large JSON response will be compressed automatically
  const largeData = generateLargeDataset();
  res.json(largeData);
});

app.listen(3000, () => {
  console.log('Server running with compression enabled');
});
```

## Configuring Compression Options

```javascript
const express = require('express');
const compression = require('compression');

const app = express();

// Advanced compression configuration
app.use(compression({
  // Compression level (0-9, -1 for default)
  // Higher = better compression, slower
  level: 6,
  
  // Minimum size to compress (in bytes)
  threshold: 1024, // Only compress responses > 1KB
  
  // Filter function to decide what to compress
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Use default filter (compresses based on content-type)
    return compression.filter(req, res);
  },
  
  // Memory level (1-9)
  memLevel: 8,
  
  // Chunk size for streaming
  chunkSize: 16 * 1024
}));

app.listen(3000);
```

## Selective Compression

```javascript
const express = require('express');
const compression = require('compression');

const app = express();

// Compression middleware with custom filter
const shouldCompress = (req, res) => {
  // Don't compress small responses
  const contentLength = res.get('Content-Length');
  if (contentLength && parseInt(contentLength) < 1024) {
    return false;
  }
  
  // Don't compress already compressed content
  const contentType = res.get('Content-Type') || '';
  const compressedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/'];
  if (compressedTypes.some(type => contentType.includes(type))) {
    return false;
  }
  
  // Don't compress server-sent events
  if (contentType.includes('text/event-stream')) {
    return false;
  }
  
  // Use default compression filter
  return compression.filter(req, res);
};

app.use(compression({ filter: shouldCompress }));

// Apply compression only to specific routes
const compressResponse = compression();

app.get('/api/large-data', compressResponse, (req, res) => {
  res.json(getLargeData());
});

app.get('/api/small-data', (req, res) => {
  // No compression for this route
  res.json({ status: 'ok' });
});

app.listen(3000);
```

## Brotli Compression

Brotli offers better compression ratios than gzip. Enable it with Express:

```javascript
const express = require('express');
const compression = require('compression');
const zlib = require('zlib');

const app = express();

// compression supports Brotli when the client sends Accept-Encoding: br
app.use(compression({
  brotli: {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 4 // 0-11, higher = better but slower
    }
  }
}));

app.get('/api/data', (req, res) => {
  res.json({ message: 'Compressed with Brotli!' });
});

app.listen(3000);
```

## Using shrink-ray-current for Better Compression

```bash
npm install shrink-ray-current
```

```javascript
const express = require('express');
const shrinkRay = require('shrink-ray-current');

const app = express();

// shrink-ray provides both Brotli and gzip with smart defaults
app.use(shrinkRay({
  // Brotli settings
  brotli: {
    quality: 4 // 0-11
  },
  
  // Gzip settings
  zlib: {
    level: 6
  },
  
  // Cache compressed versions
  cache: (req, res) => {
    return req.method === 'GET' && res.statusCode === 200;
  },
  
  // Threshold
  threshold: 1024,
  
  // Filter
  filter: (req, res) => {
    // Custom filtering logic
    return true;
  }
}));

app.listen(3000);
```

## Static File Compression

```javascript
const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();

// Enable compression before serving static files
app.use(compression());

// Serve static files with cache headers
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Set Vary header for caching
    res.set('Vary', 'Accept-Encoding');
    
    // Add cache control for compressed content
    if (filePath.endsWith('.gz') || filePath.endsWith('.br')) {
      res.set('Cache-Control', 'public, max-age=31536000');
    }
  }
}));

app.listen(3000);
```

## Pre-compressed Static Files

```javascript
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

function safeJoin(basePath, requestPath) {
  const resolvedPath = path.resolve(basePath, '.' + requestPath);
  if (resolvedPath !== basePath && !resolvedPath.startsWith(basePath + path.sep)) {
    return null;
  }
  return resolvedPath;
}

// Serve pre-compressed files when available
function servePrecompressed(staticPath) {
  const staticRoot = path.resolve(staticPath);

  return (req, res, next) => {
    const filePath = safeJoin(staticRoot, req.path);
    if (!filePath) {
      return res.status(403).send('Forbidden');
    }
    
    // Try Brotli first
    if (req.acceptsEncodings('br')) {
      const brotliPath = filePath + '.br';
      if (fs.existsSync(brotliPath)) {
        res.set('Content-Encoding', 'br');
        res.vary('Accept-Encoding');
        res.type(filePath);
        return res.sendFile(brotliPath);
      }
    }
    
    // Try gzip
    if (req.acceptsEncodings('gzip')) {
      const gzipPath = filePath + '.gz';
      if (fs.existsSync(gzipPath)) {
        res.set('Content-Encoding', 'gzip');
        res.vary('Accept-Encoding');
        res.type(filePath);
        return res.sendFile(gzipPath);
      }
    }
    
    // Fall back to uncompressed
    next();
  };
}

app.use(servePrecompressed(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

app.listen(3000);
```

## Streaming Compression

```javascript
const express = require('express');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const app = express();
const filesRoot = path.resolve(__dirname, 'files');

// Stream large files with compression
app.get('/download/:file', (req, res) => {
  const filePath = path.resolve(filesRoot, req.params.file);
  if (!filePath.startsWith(filesRoot + path.sep)) {
    return res.status(403).send('Forbidden');
  }
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }
  
  const readStream = fs.createReadStream(filePath);
  
  // Choose compression based on client support
  if (req.acceptsEncodings('br')) {
    res.set('Content-Encoding', 'br');
    res.vary('Accept-Encoding');
    readStream.pipe(zlib.createBrotliCompress()).pipe(res);
  } else if (req.acceptsEncodings('gzip')) {
    res.set('Content-Encoding', 'gzip');
    res.vary('Accept-Encoding');
    readStream.pipe(zlib.createGzip()).pipe(res);
  } else if (req.acceptsEncodings('deflate')) {
    res.set('Content-Encoding', 'deflate');
    res.vary('Accept-Encoding');
    readStream.pipe(zlib.createDeflate()).pipe(res);
  } else {
    readStream.pipe(res);
  }
});

app.listen(3000);
```

## Compression with Caching

```javascript
const express = require('express');
const compression = require('compression');
const mcache = require('memory-cache');

const app = express();

// Cache response bodies; compression is still negotiated per request
const cacheMiddleware = (duration) => {
  return (req, res, next) => {
    const key = '__express__' + req.originalUrl;
    const cachedBody = mcache.get(key);
    
    if (cachedBody) {
      res.set('X-Cache', 'HIT');
      return res.send(cachedBody);
    }
    
    res.set('X-Cache', 'MISS');
    
    // Capture response
    const originalSend = res.send.bind(res);
    res.send = (body) => {
      mcache.put(key, body, duration * 1000);
      originalSend(body);
    };
    
    next();
  };
};

// Apply compression before routes so cached hits are compressed per client
app.use(compression());

app.get('/api/data', cacheMiddleware(300), (req, res) => {
  const data = computeExpensiveData();
  res.json(data);
});

app.listen(3000);
```

## Monitoring Compression Performance

```javascript
const express = require('express');
const compression = require('compression');

const app = express();

// Track compression stats
const compressionStats = {
  requests: 0,
  compressed: 0,
  bytesWritten: 0,
  compressedSize: 0
};

// Middleware to track compression
app.use((req, res, next) => {
  compressionStats.requests++;
  
  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);
  let responseSize = 0;
  
  res.write = function(chunk, encoding, callback) {
    if (chunk) {
      responseSize += Buffer.byteLength(chunk);
    }
    return originalWrite(chunk, encoding, callback);
  };
  
  res.end = function(chunk, encoding, callback) {
    if (chunk) {
      responseSize += Buffer.byteLength(chunk);
    }
    
    compressionStats.bytesWritten += responseSize;
    
    const contentEncoding = res.get('Content-Encoding');
    if (contentEncoding === 'gzip' || contentEncoding === 'br' || contentEncoding === 'deflate') {
      compressionStats.compressed++;
      compressionStats.compressedSize += responseSize;
    }
    
    return originalEnd(chunk, encoding, callback);
  };
  
  next();
});

app.use(compression());

// Stats endpoint
app.get('/stats/compression', (req, res) => {
  res.json({
    ...compressionStats,
    compressedRequestRatio: compressionStats.compressed / compressionStats.requests
  });
});

app.listen(3000);
```

## Best Practices

1. **Set appropriate threshold** - Don't compress tiny responses
2. **Use Brotli when possible** - Better compression than gzip
3. **Pre-compress static assets** - Build-time compression is faster
4. **Set Vary header** - Important for caching proxies
5. **Monitor compression ratios** - Track effectiveness

## Summary

| Algorithm | Compression | Speed | Browser Support |
|-----------|-------------|-------|-----------------|
| gzip | Good | Fast | Universal |
| Brotli | Better | Slower | Modern browsers |
| deflate | Good | Fast | Universal |

| Configuration | Recommended Value | Use Case |
|---------------|-------------------|----------|
| Level | 6 | Balance of speed/ratio |
| Threshold | 1024 bytes | Avoid overhead for small responses |
| Filter | Content-based | Skip images, videos |
| Cache | Enable | Repeated requests |

Compression is an essential optimization for any Express.js application. The compression middleware handles most cases well, but consider Brotli for additional savings on modern browsers.
