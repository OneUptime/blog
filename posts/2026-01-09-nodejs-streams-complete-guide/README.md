# How Streams Work in Node.js: From Beginner to Advanced

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Streams, Performance, Backend, JavaScript, Tutorial

Description: A comprehensive course on Node.js Streams - from basic concepts and simple examples to advanced real-world patterns like file processing, HTTP streaming, and data pipelines.

---

Streams are one of the most powerful but often misunderstood features in Node.js. They allow you to process data piece by piece, without loading everything into memory at once. This makes them essential for handling large files, real-time data, and building efficient applications.

In this comprehensive guide, we'll start from the absolute basics and work our way up to advanced real-world patterns. By the end, you'll understand not just how to use streams, but why they work the way they do.

## What Are Streams?

Think of streams like water flowing through a pipe. Instead of filling up a bucket (loading everything into memory) and then using the water, you use the water as it flows through the pipe. This is exactly how Node.js streams work with data.

### The Problem Streams Solve

Let's say you need to read a 2GB log file and send it to a client. Here's the naive approach:

```javascript
const fs = require('fs');
const http = require('http');

// DON'T DO THIS - loads entire file into memory
const server = http.createServer((req, res) => {
  fs.readFile('./huge-log-file.log', (err, data) => {
    if (err) {
      res.statusCode = 500;
      res.end('Error reading file');
      return;
    }
    res.end(data); // Sends 2GB from memory
  });
});
```

This approach has several problems:
- **Memory Usage**: The entire 2GB file sits in memory
- **Slow Start**: The client waits until the whole file is read before receiving anything
- **Scalability**: Multiple requests could crash your server from memory exhaustion

Here's the same thing with streams:

```javascript
const fs = require('fs');
const http = require('http');

// DO THIS - streams data in chunks
const server = http.createServer((req, res) => {
  const stream = fs.createReadStream('./huge-log-file.log');
  stream.pipe(res); // Data flows directly to response
});
```

With streams:
- **Low Memory**: Only a small chunk (typically 64KB) is in memory at a time
- **Fast Start**: Client starts receiving data immediately
- **Scalable**: Can handle many concurrent requests

## The Four Types of Streams

Node.js has four fundamental stream types. Understanding these is key to mastering streams.

### 1. Readable Streams

Readable streams are sources of data. They produce data that you can consume.

**Common examples:**
- `fs.createReadStream()` - reading files
- `http.IncomingMessage` - HTTP request bodies
- `process.stdin` - terminal input

```javascript
const fs = require('fs');

// Create a readable stream from a file
const readStream = fs.createReadStream('./data.txt', {
  encoding: 'utf8',  // Return strings instead of buffers
  highWaterMark: 1024 // Read 1KB chunks (default is 64KB)
});

// Event: 'data' - emitted when a chunk is available
readStream.on('data', (chunk) => {
  console.log('Received chunk:', chunk.length, 'bytes');
});

// Event: 'end' - emitted when no more data
readStream.on('end', () => {
  console.log('Finished reading file');
});

// Event: 'error' - emitted on error
readStream.on('error', (err) => {
  console.error('Error reading file:', err.message);
});
```

### 2. Writable Streams

Writable streams are destinations for data. You write data to them.

**Common examples:**
- `fs.createWriteStream()` - writing to files
- `http.ServerResponse` - HTTP responses
- `process.stdout` - terminal output

```javascript
const fs = require('fs');

// Create a writable stream to a file
const writeStream = fs.createWriteStream('./output.txt');

// Write data in chunks
writeStream.write('Hello, ');
writeStream.write('World!\n');
writeStream.write('This is written in chunks.');

// Signal that we're done writing
writeStream.end();

// Event: 'finish' - emitted when all data has been flushed
writeStream.on('finish', () => {
  console.log('Finished writing to file');
});

// Event: 'error' - emitted on error
writeStream.on('error', (err) => {
  console.error('Error writing file:', err.message);
});
```

### 3. Duplex Streams

Duplex streams can both read and write data. They're like a two-way pipe.

**Common examples:**
- TCP sockets (`net.Socket`)
- WebSocket connections

```javascript
const net = require('net');

// Create a TCP server - each connection is a duplex stream
const server = net.createServer((socket) => {
  // socket is a duplex stream
  
  // Read from the client
  socket.on('data', (data) => {
    console.log('Received:', data.toString());
    
    // Write back to the client (echo server)
    socket.write('Echo: ' + data.toString());
  });
  
  socket.on('end', () => {
    console.log('Client disconnected');
  });
});

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});
```

### 4. Transform Streams

Transform streams modify data as it passes through. They're duplex streams where the output is computed from the input.

**Common examples:**
- `zlib.createGzip()` - compression
- `crypto.createCipher()` - encryption

```javascript
const { Transform } = require('stream');

// Create a transform stream that converts text to uppercase
const upperCaseTransform = new Transform({
  transform(chunk, encoding, callback) {
    // Transform the chunk
    const upperCased = chunk.toString().toUpperCase();
    
    // Push the transformed data
    this.push(upperCased);
    
    // Signal that we're done processing this chunk
    callback();
  }
});

// Use the transform stream
process.stdin
  .pipe(upperCaseTransform)
  .pipe(process.stdout);

// Now type in your terminal - text will be uppercased!
```

## Understanding Stream Modes

Readable streams operate in one of two modes: **flowing** and **paused**.

### Flowing Mode

In flowing mode, data is read automatically and provided as fast as possible through events.

```javascript
const fs = require('fs');

const readStream = fs.createReadStream('./data.txt');

// Attaching a 'data' listener switches to flowing mode
readStream.on('data', (chunk) => {
  console.log('Chunk received:', chunk.length);
});
```

### Paused Mode

In paused mode, you must explicitly call `read()` to get chunks of data.

```javascript
const fs = require('fs');

const readStream = fs.createReadStream('./data.txt');

// Stream starts in paused mode
readStream.on('readable', () => {
  let chunk;
  
  // Explicitly read chunks
  while ((chunk = readStream.read()) !== null) {
    console.log('Read chunk:', chunk.length);
  }
});
```

### Switching Between Modes

```javascript
const fs = require('fs');

const readStream = fs.createReadStream('./data.txt');

// Start flowing
readStream.on('data', (chunk) => {
  console.log('Got chunk');
  
  // Pause the stream
  readStream.pause();
  
  // Resume after 1 second
  setTimeout(() => {
    readStream.resume();
  }, 1000);
});
```

## The Pipe Method

The `pipe()` method is the simplest way to connect streams. It handles backpressure automatically.

```javascript
const fs = require('fs');

// Simple file copy
const source = fs.createReadStream('./source.txt');
const destination = fs.createWriteStream('./destination.txt');

source.pipe(destination);

destination.on('finish', () => {
  console.log('File copied successfully');
});
```

### Chaining Pipes

You can chain multiple streams together:

```javascript
const fs = require('fs');
const zlib = require('zlib');

// Read file -> Compress -> Write compressed file
fs.createReadStream('./large-file.txt')
  .pipe(zlib.createGzip())
  .pipe(fs.createWriteStream('./large-file.txt.gz'))
  .on('finish', () => {
    console.log('File compressed successfully');
  });
```

### Decompression Chain

```javascript
const fs = require('fs');
const zlib = require('zlib');

// Read compressed file -> Decompress -> Write decompressed file
fs.createReadStream('./large-file.txt.gz')
  .pipe(zlib.createGunzip())
  .pipe(fs.createWriteStream('./large-file-restored.txt'))
  .on('finish', () => {
    console.log('File decompressed successfully');
  });
```

## Understanding Backpressure

Backpressure occurs when data is being produced faster than it can be consumed. Without proper handling, this can cause memory issues.

### The Problem

```javascript
const fs = require('fs');

const readStream = fs.createReadStream('./huge-file.bin');
const writeStream = fs.createWriteStream('./slow-destination.bin');

// If writing is slow, data accumulates in memory
readStream.on('data', (chunk) => {
  writeStream.write(chunk); // What if this can't keep up?
});
```

### Manual Backpressure Handling

```javascript
const fs = require('fs');

const readStream = fs.createReadStream('./huge-file.bin');
const writeStream = fs.createWriteStream('./slow-destination.bin');

readStream.on('data', (chunk) => {
  // write() returns false if internal buffer is full
  const canContinue = writeStream.write(chunk);
  
  if (!canContinue) {
    // Pause reading until writing catches up
    readStream.pause();
  }
});

// Resume reading when write buffer drains
writeStream.on('drain', () => {
  readStream.resume();
});

readStream.on('end', () => {
  writeStream.end();
});
```

### Let Pipe Handle It

The `pipe()` method handles backpressure automatically:

```javascript
const fs = require('fs');

// pipe() handles all the backpressure logic for you
fs.createReadStream('./huge-file.bin')
  .pipe(fs.createWriteStream('./destination.bin'));
```

## Creating Custom Streams

Now let's create our own streams. This is where streams become really powerful.

### Custom Readable Stream

```javascript
const { Readable } = require('stream');

// A readable stream that produces numbers
class NumberStream extends Readable {
  constructor(max) {
    super();
    this.current = 0;
    this.max = max;
  }
  
  _read() {
    if (this.current <= this.max) {
      // Push data into the stream
      this.push(String(this.current) + '\n');
      this.current++;
    } else {
      // Push null to signal end of stream
      this.push(null);
    }
  }
}

// Use the custom stream
const numberStream = new NumberStream(5);
numberStream.pipe(process.stdout);

// Output:
// 0
// 1
// 2
// 3
// 4
// 5
```

### Custom Writable Stream

```javascript
const { Writable } = require('stream');

// A writable stream that logs chunks
class LoggerStream extends Writable {
  constructor(prefix) {
    super();
    this.prefix = prefix;
  }
  
  _write(chunk, encoding, callback) {
    console.log(`${this.prefix}: ${chunk.toString().trim()}`);
    
    // Call callback when done processing
    // Pass error as first argument if something went wrong
    callback();
  }
}

// Use the custom stream
const logger = new LoggerStream('[LOG]');

logger.write('Hello\n');
logger.write('World\n');
logger.end();

// Output:
// [LOG]: Hello
// [LOG]: World
```

### Custom Transform Stream

```javascript
const { Transform } = require('stream');

// Transform stream that converts CSV to JSON
class CSVToJSON extends Transform {
  constructor() {
    super({ objectMode: true }); // Output JavaScript objects
    this.headers = null;
    this.buffer = '';
  }
  
  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString();
    const lines = this.buffer.split('\n');
    
    // Keep incomplete line in buffer
    this.buffer = lines.pop();
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const values = line.split(',').map(v => v.trim());
      
      if (!this.headers) {
        this.headers = values;
      } else {
        const obj = {};
        this.headers.forEach((header, i) => {
          obj[header] = values[i];
        });
        this.push(obj);
      }
    }
    
    callback();
  }
  
  _flush(callback) {
    // Handle any remaining data in buffer
    if (this.buffer.trim() && this.headers) {
      const values = this.buffer.split(',').map(v => v.trim());
      const obj = {};
      this.headers.forEach((header, i) => {
        obj[header] = values[i];
      });
      this.push(obj);
    }
    callback();
  }
}

// Use the transform stream
const fs = require('fs');

fs.createReadStream('./data.csv')
  .pipe(new CSVToJSON())
  .on('data', (obj) => {
    console.log('Row:', obj);
  })
  .on('end', () => {
    console.log('Done parsing CSV');
  });
```

## Object Mode Streams

By default, streams work with Buffers or strings. Object mode allows streams to work with any JavaScript values.

```javascript
const { Transform } = require('stream');

// Transform stream in object mode
const filterUsers = new Transform({
  objectMode: true,
  transform(user, encoding, callback) {
    // Only pass through active users
    if (user.active) {
      this.push(user);
    }
    callback();
  }
});

// Use it in a pipeline
const users = [
  { name: 'Alice', active: true },
  { name: 'Bob', active: false },
  { name: 'Charlie', active: true },
];

const { Readable } = require('stream');

// Create readable from array
Readable.from(users)
  .pipe(filterUsers)
  .on('data', (user) => {
    console.log('Active user:', user.name);
  });

// Output:
// Active user: Alice
// Active user: Charlie
```

## The Pipeline Function

Node.js provides `pipeline()` as a better alternative to `pipe()`. It handles errors properly and cleans up streams.

```javascript
const { pipeline } = require('stream');
const fs = require('fs');
const zlib = require('zlib');

// Using pipeline with callback
pipeline(
  fs.createReadStream('./input.txt'),
  zlib.createGzip(),
  fs.createWriteStream('./input.txt.gz'),
  (err) => {
    if (err) {
      console.error('Pipeline failed:', err);
    } else {
      console.log('Pipeline succeeded');
    }
  }
);
```

### Pipeline with Promises

```javascript
const { pipeline } = require('stream/promises');
const fs = require('fs');
const zlib = require('zlib');

async function compress() {
  try {
    await pipeline(
      fs.createReadStream('./input.txt'),
      zlib.createGzip(),
      fs.createWriteStream('./input.txt.gz')
    );
    console.log('Compression complete');
  } catch (err) {
    console.error('Compression failed:', err);
  }
}

compress();
```

## Real-World Examples

Now let's look at practical applications of streams.

### Example 1: HTTP File Download with Progress

```javascript
const https = require('https');
const fs = require('fs');
const { Transform } = require('stream');

function downloadWithProgress(url, destination) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const totalBytes = parseInt(response.headers['content-length'], 10);
      let downloadedBytes = 0;
      
      // Transform stream to track progress
      const progressTracker = new Transform({
        transform(chunk, encoding, callback) {
          downloadedBytes += chunk.length;
          const percent = ((downloadedBytes / totalBytes) * 100).toFixed(2);
          process.stdout.write(`\rDownloading: ${percent}%`);
          callback(null, chunk);
        }
      });
      
      const file = fs.createWriteStream(destination);
      
      response
        .pipe(progressTracker)
        .pipe(file)
        .on('finish', () => {
          console.log('\nDownload complete!');
          resolve();
        })
        .on('error', reject);
    }).on('error', reject);
  });
}

// Usage
downloadWithProgress(
  'https://example.com/large-file.zip',
  './downloaded-file.zip'
);
```

### Example 2: Real-time Log Processing

```javascript
const fs = require('fs');
const readline = require('readline');
const { Transform } = require('stream');

// Transform stream to filter error logs
const errorFilter = new Transform({
  transform(chunk, encoding, callback) {
    const line = chunk.toString();
    if (line.includes('ERROR') || line.includes('FATAL')) {
      this.push(line + '\n');
    }
    callback();
  }
});

// Process a log file line by line
function processLogs(logFile) {
  const rl = readline.createInterface({
    input: fs.createReadStream(logFile),
    crlfDelay: Infinity
  });
  
  const errors = [];
  
  rl.on('line', (line) => {
    if (line.includes('ERROR') || line.includes('FATAL')) {
      const timestamp = line.substring(0, 23);
      const message = line.substring(24);
      errors.push({ timestamp, message, level: line.includes('FATAL') ? 'FATAL' : 'ERROR' });
    }
  });
  
  rl.on('close', () => {
    console.log(`Found ${errors.length} errors:`);
    errors.forEach(err => {
      console.log(`[${err.level}] ${err.timestamp}: ${err.message}`);
    });
  });
}

processLogs('./application.log');
```

### Example 3: CSV to JSON API Stream

```javascript
const http = require('http');
const fs = require('fs');
const { Transform } = require('stream');

// Transform CSV to JSON Lines (NDJSON)
class CSVToJSONLines extends Transform {
  constructor() {
    super();
    this.headers = null;
    this.buffer = '';
    this.first = true;
  }
  
  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString();
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop(); // Keep incomplete line
    
    let output = '';
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const values = line.split(',').map(v => v.trim());
      
      if (!this.headers) {
        this.headers = values;
      } else {
        const obj = {};
        this.headers.forEach((header, i) => {
          obj[header] = values[i];
        });
        output += JSON.stringify(obj) + '\n';
      }
    }
    
    if (output) {
      this.push(output);
    }
    callback();
  }
  
  _flush(callback) {
    if (this.buffer.trim() && this.headers) {
      const values = this.buffer.split(',').map(v => v.trim());
      const obj = {};
      this.headers.forEach((header, i) => {
        obj[header] = values[i];
      });
      this.push(JSON.stringify(obj) + '\n');
    }
    callback();
  }
}

// Create HTTP server that streams CSV as JSON
const server = http.createServer((req, res) => {
  if (req.url === '/data') {
    res.setHeader('Content-Type', 'application/x-ndjson');
    
    fs.createReadStream('./large-data.csv')
      .pipe(new CSVToJSONLines())
      .pipe(res);
  } else {
    res.statusCode = 404;
    res.end('Not found');
  }
});

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});
```

### Example 4: Database Streaming with Connection Pooling

```javascript
const { Transform, pipeline } = require('stream');
const { Pool } = require('pg');
const fs = require('fs');

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Stream query results to a file
async function exportToCSV(query, outputFile) {
  const client = await pool.connect();
  
  try {
    // Use cursor for streaming large results
    const cursor = client.query(new Cursor(query));
    
    let headers = null;
    const writeStream = fs.createWriteStream(outputFile);
    
    // Transform rows to CSV
    const toCSV = new Transform({
      objectMode: true,
      transform(row, encoding, callback) {
        if (!headers) {
          headers = Object.keys(row);
          this.push(headers.join(',') + '\n');
        }
        const values = headers.map(h => {
          const val = row[h];
          if (typeof val === 'string' && val.includes(',')) {
            return `"${val}"`;
          }
          return val;
        });
        this.push(values.join(',') + '\n');
        callback();
      }
    });
    
    // Read in batches of 1000 rows
    const batchSize = 1000;
    
    function readBatch() {
      cursor.read(batchSize, (err, rows) => {
        if (err) {
          writeStream.destroy(err);
          return;
        }
        
        if (rows.length === 0) {
          toCSV.end();
          return;
        }
        
        for (const row of rows) {
          toCSV.write(row);
        }
        
        readBatch(); // Read next batch
      });
    }
    
    toCSV.pipe(writeStream).on('finish', () => {
      console.log('Export complete');
    });
    
    readBatch();
    
  } finally {
    client.release();
  }
}
```

### Example 5: Video/Audio Streaming Server

```javascript
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  const videoPath = path.join(__dirname, 'video.mp4');
  
  fs.stat(videoPath, (err, stat) => {
    if (err) {
      res.statusCode = 404;
      res.end('Video not found');
      return;
    }
    
    const fileSize = stat.size;
    const range = req.headers.range;
    
    if (range) {
      // Handle range request for video seeking
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      
      const file = fs.createReadStream(videoPath, { start, end });
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
      });
      
      file.pipe(res);
    } else {
      // Stream entire video
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      });
      
      fs.createReadStream(videoPath).pipe(res);
    }
  });
});

server.listen(3000, () => {
  console.log('Video server listening on port 3000');
});
```

### Example 6: Encryption/Decryption Pipeline

```javascript
const crypto = require('crypto');
const fs = require('fs');
const { pipeline } = require('stream/promises');

const algorithm = 'aes-256-cbc';

// Generate key and IV (in production, store these securely)
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

async function encryptFile(inputPath, outputPath) {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  await pipeline(
    fs.createReadStream(inputPath),
    cipher,
    fs.createWriteStream(outputPath)
  );
  
  console.log('File encrypted successfully');
  return { key, iv }; // Return for decryption
}

async function decryptFile(inputPath, outputPath, key, iv) {
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  
  await pipeline(
    fs.createReadStream(inputPath),
    decipher,
    fs.createWriteStream(outputPath)
  );
  
  console.log('File decrypted successfully');
}

// Usage
async function main() {
  const { key, iv } = await encryptFile('./secret.txt', './secret.enc');
  await decryptFile('./secret.enc', './secret-decrypted.txt', key, iv);
}

main().catch(console.error);
```

### Example 7: Multi-File Compression (Creating a TAR-like Archive)

```javascript
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { Transform, PassThrough } = require('stream');
const { pipeline } = require('stream/promises');

// Create a simple archive format
class Archiver extends PassThrough {
  async addFile(filePath) {
    const stat = await fs.promises.stat(filePath);
    const fileName = path.basename(filePath);
    
    // Write header: filename length (4 bytes) + filename + file size (8 bytes)
    const header = Buffer.alloc(4 + fileName.length + 8);
    header.writeUInt32BE(fileName.length, 0);
    header.write(fileName, 4);
    header.writeBigUInt64BE(BigInt(stat.size), 4 + fileName.length);
    
    this.push(header);
    
    // Stream file content
    const fileStream = fs.createReadStream(filePath);
    for await (const chunk of fileStream) {
      this.push(chunk);
    }
  }
  
  finish() {
    this.push(null);
  }
}

async function createArchive(files, outputPath) {
  const archiver = new Archiver();
  const gzip = zlib.createGzip();
  const output = fs.createWriteStream(outputPath);
  
  // Start the pipeline
  const pipelinePromise = pipeline(archiver, gzip, output);
  
  // Add files
  for (const file of files) {
    await archiver.addFile(file);
    console.log(`Added: ${file}`);
  }
  
  archiver.finish();
  await pipelinePromise;
  
  console.log('Archive created successfully');
}

// Usage
createArchive(['./file1.txt', './file2.txt', './file3.txt'], './archive.gz');
```

## Stream Performance Tips

### 1. Choose the Right highWaterMark

The `highWaterMark` option controls the buffer size. Default is 16KB for object mode, 64KB for binary.

```javascript
// For small files or memory-constrained environments
const stream = fs.createReadStream('./file.txt', {
  highWaterMark: 16 * 1024 // 16KB chunks
});

// For large files on systems with more memory
const stream = fs.createReadStream('./large-file.bin', {
  highWaterMark: 1024 * 1024 // 1MB chunks - fewer I/O operations
});
```

### 2. Use pipeline() Instead of pipe()

`pipeline()` properly handles errors and cleanup:

```javascript
const { pipeline } = require('stream/promises');

// Good - errors are handled, streams are cleaned up
await pipeline(source, transform, destination);

// Avoid - errors can be missed, streams may not be cleaned up
source.pipe(transform).pipe(destination);
```

### 3. Avoid Synchronous Operations in Transform

```javascript
// BAD - blocks the event loop
const badTransform = new Transform({
  transform(chunk, encoding, callback) {
    const result = heavySyncOperation(chunk); // Blocks!
    callback(null, result);
  }
});

// GOOD - use setImmediate to yield to event loop
const goodTransform = new Transform({
  transform(chunk, encoding, callback) {
    setImmediate(() => {
      const result = heavySyncOperation(chunk);
      callback(null, result);
    });
  }
});
```

### 4. Use Readable.from() for Easy Stream Creation

```javascript
const { Readable } = require('stream');

// Create stream from array
const arrayStream = Readable.from(['a', 'b', 'c']);

// Create stream from async generator
async function* generateData() {
  for (let i = 0; i < 100; i++) {
    yield `Item ${i}\n`;
    await new Promise(r => setTimeout(r, 10)); // Simulate async
  }
}

const asyncStream = Readable.from(generateData());
asyncStream.pipe(process.stdout);
```

## Error Handling Best Practices

### Always Handle Errors

```javascript
const { pipeline } = require('stream/promises');

async function processFile() {
  try {
    await pipeline(
      fs.createReadStream('./input.txt'),
      transformStream,
      fs.createWriteStream('./output.txt')
    );
  } catch (err) {
    // Handle specific error types
    if (err.code === 'ENOENT') {
      console.error('Input file not found');
    } else if (err.code === 'EACCES') {
      console.error('Permission denied');
    } else {
      console.error('Stream error:', err.message);
    }
  }
}
```

### Clean Up on Errors

```javascript
const { finished } = require('stream/promises');

async function safeStreamProcessing() {
  const readStream = fs.createReadStream('./input.txt');
  const writeStream = fs.createWriteStream('./output.txt');
  
  try {
    readStream.pipe(writeStream);
    await finished(writeStream);
  } catch (err) {
    // Clean up streams
    readStream.destroy();
    writeStream.destroy();
    
    // Remove partially written file
    await fs.promises.unlink('./output.txt').catch(() => {});
    
    throw err;
  }
}
```

## Summary

Streams are a fundamental pattern in Node.js that enable efficient data processing. Here's what we covered:

1. **Basic Concepts**: Streams process data in chunks, reducing memory usage
2. **Four Types**: Readable, Writable, Duplex, and Transform streams
3. **Modes**: Flowing mode (automatic) vs Paused mode (manual)
4. **pipe()**: Connects streams and handles backpressure automatically
5. **pipeline()**: Better error handling and cleanup than pipe()
6. **Custom Streams**: Create your own for specific use cases
7. **Object Mode**: Work with JavaScript objects, not just buffers
8. **Real-World Examples**: File processing, HTTP streaming, compression, encryption

Streams become intuitive with practice. Start with simple pipe operations and gradually move to custom transforms as you get comfortable. The key insight is that streams let you write code that scales from small files to enormous datasets without changing your approach.

For more Node.js patterns, check out our guides on [connection pooling](https://oneuptime.com/blog/post/2026-01-06-nodejs-connection-pooling-postgresql-mysql/view), [graceful shutdown](https://oneuptime.com/blog/post/2026-01-06-nodejs-graceful-shutdown-handler/view), and [OpenTelemetry instrumentation](https://oneuptime.com/blog/post/2026-01-06-nodejs-express-opentelemetry-instrumentation/view).
