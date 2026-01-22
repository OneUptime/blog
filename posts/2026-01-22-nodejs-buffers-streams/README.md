# How to Work with Buffers and Streams in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Buffers, Streams, Performance, FileHandling

Description: Learn how to work with Buffers and Streams in Node.js for efficient memory usage when handling binary data, large files, and network operations.

---

Buffers and Streams are fundamental Node.js concepts for handling binary data and processing large datasets efficiently without loading everything into memory.

## Understanding Buffers

Buffers represent fixed-length sequences of bytes. They are used to handle binary data directly.

### Creating Buffers

```javascript
// From string
const buf1 = Buffer.from('Hello World');
const buf2 = Buffer.from('Hello', 'utf8');  // With encoding

// From array
const buf3 = Buffer.from([72, 101, 108, 108, 111]);  // "Hello"

// Allocate empty buffer
const buf4 = Buffer.alloc(10);      // 10 bytes, filled with zeros
const buf5 = Buffer.allocUnsafe(10); // 10 bytes, may contain old data (faster)

// From hex string
const buf6 = Buffer.from('48656c6c6f', 'hex');  // "Hello"

// From base64
const buf7 = Buffer.from('SGVsbG8=', 'base64');  // "Hello"
```

### Reading Buffer Data

```javascript
const buf = Buffer.from('Hello World');

// To string
console.log(buf.toString());           // 'Hello World'
console.log(buf.toString('utf8'));     // 'Hello World'
console.log(buf.toString('hex'));      // '48656c6c6f20576f726c64'
console.log(buf.toString('base64'));   // 'SGVsbG8gV29ybGQ='

// Partial conversion
console.log(buf.toString('utf8', 0, 5));  // 'Hello'

// Access individual bytes
console.log(buf[0]);  // 72 (ASCII for 'H')

// Length
console.log(buf.length);  // 11 bytes
```

### Writing to Buffers

```javascript
const buf = Buffer.alloc(10);

// Write string
buf.write('Hi');
console.log(buf.toString());  // 'Hi' + null bytes

// Write at offset
buf.write('Lo', 2);
console.log(buf.toString());  // 'HiLo' + null bytes

// Write individual bytes
buf[0] = 65;  // 'A'
buf[1] = 66;  // 'B'

// Fill buffer
buf.fill(0);     // Fill with zeros
buf.fill('x');   // Fill with 'x'
```

### Buffer Operations

```javascript
// Concatenate buffers
const buf1 = Buffer.from('Hello ');
const buf2 = Buffer.from('World');
const combined = Buffer.concat([buf1, buf2]);
console.log(combined.toString());  // 'Hello World'

// Copy buffer
const source = Buffer.from('Hello');
const target = Buffer.alloc(10);
source.copy(target);
console.log(target.toString());  // 'Hello' + nulls

// Slice buffer (creates a view, not a copy)
const buf = Buffer.from('Hello World');
const slice = buf.slice(0, 5);
console.log(slice.toString());  // 'Hello'

// Compare buffers
const a = Buffer.from('abc');
const b = Buffer.from('abc');
const c = Buffer.from('abd');
console.log(a.equals(b));     // true
console.log(a.compare(c));    // -1 (a < c)
console.log(Buffer.compare(a, c));  // -1

// Find in buffer
const buf = Buffer.from('Hello World');
console.log(buf.indexOf('World'));  // 6
console.log(buf.includes('World')); // true
```

### Buffer and JSON

```javascript
const buf = Buffer.from('Hello');

// To JSON
const json = buf.toJSON();
console.log(json);
// { type: 'Buffer', data: [72, 101, 108, 108, 111] }

// From JSON
const restored = Buffer.from(json.data);
console.log(restored.toString());  // 'Hello'
```

## Understanding Streams

Streams process data piece by piece, ideal for large files or network data.

### Stream Types

```javascript
const { Readable, Writable, Duplex, Transform } = require('stream');

// Readable - Source of data
// Writable - Destination for data
// Duplex - Both readable and writable
// Transform - Modify data as it passes through
```

### Reading Files with Streams

```javascript
const fs = require('fs');

// Without streams (loads entire file into memory)
const data = fs.readFileSync('large-file.txt');
console.log(data.toString());

// With streams (processes chunk by chunk)
const readStream = fs.createReadStream('large-file.txt', {
  encoding: 'utf8',
  highWaterMark: 64 * 1024,  // 64KB chunks
});

readStream.on('data', (chunk) => {
  console.log('Received chunk:', chunk.length, 'bytes');
});

readStream.on('end', () => {
  console.log('Finished reading');
});

readStream.on('error', (error) => {
  console.error('Error:', error.message);
});
```

### Writing Files with Streams

```javascript
const fs = require('fs');

const writeStream = fs.createWriteStream('output.txt');

writeStream.write('Hello ');
writeStream.write('World\n');
writeStream.end();  // Signal end of writing

writeStream.on('finish', () => {
  console.log('Write complete');
});

writeStream.on('error', (error) => {
  console.error('Write error:', error.message);
});
```

### Piping Streams

```javascript
const fs = require('fs');
const zlib = require('zlib');

// Copy file
fs.createReadStream('input.txt')
  .pipe(fs.createWriteStream('output.txt'));

// Compress file
fs.createReadStream('file.txt')
  .pipe(zlib.createGzip())
  .pipe(fs.createWriteStream('file.txt.gz'));

// Decompress file
fs.createReadStream('file.txt.gz')
  .pipe(zlib.createGunzip())
  .pipe(fs.createWriteStream('file.txt'));
```

### Creating Custom Readable Stream

```javascript
const { Readable } = require('stream');

// Using push
class CounterStream extends Readable {
  constructor(max) {
    super();
    this.max = max;
    this.current = 0;
  }
  
  _read() {
    if (this.current < this.max) {
      this.push(String(this.current++));
    } else {
      this.push(null);  // Signal end of stream
    }
  }
}

const counter = new CounterStream(5);
counter.on('data', chunk => console.log(chunk.toString()));
// Output: 0, 1, 2, 3, 4

// Using generator
function* generateNumbers(max) {
  for (let i = 0; i < max; i++) {
    yield String(i);
  }
}

const stream = Readable.from(generateNumbers(5));
```

### Creating Custom Writable Stream

```javascript
const { Writable } = require('stream');

class LoggerStream extends Writable {
  _write(chunk, encoding, callback) {
    console.log(`[LOG]: ${chunk.toString()}`);
    callback();  // Signal that chunk was processed
  }
  
  _final(callback) {
    console.log('Stream ended');
    callback();
  }
}

const logger = new LoggerStream();
logger.write('Hello');
logger.write('World');
logger.end();
```

### Creating Transform Stream

```javascript
const { Transform } = require('stream');

// Uppercase transform
class UppercaseTransform extends Transform {
  _transform(chunk, encoding, callback) {
    this.push(chunk.toString().toUpperCase());
    callback();
  }
}

// Usage
const upper = new UppercaseTransform();
process.stdin.pipe(upper).pipe(process.stdout);

// Line counter transform
class LineCounter extends Transform {
  constructor() {
    super();
    this.lineCount = 0;
  }
  
  _transform(chunk, encoding, callback) {
    const lines = chunk.toString().split('\n').length - 1;
    this.lineCount += lines;
    this.push(chunk);
    callback();
  }
  
  _flush(callback) {
    this.push(`\nTotal lines: ${this.lineCount}\n`);
    callback();
  }
}
```

## Practical Examples

### Processing Large CSV Files

```javascript
const fs = require('fs');
const { Transform } = require('stream');
const readline = require('readline');

// Using readline for line-by-line processing
async function processCSV(filePath) {
  const fileStream = fs.createReadStream(filePath);
  
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
  
  let lineNumber = 0;
  
  for await (const line of rl) {
    lineNumber++;
    const columns = line.split(',');
    console.log(`Line ${lineNumber}:`, columns);
  }
}

processCSV('data.csv');
```

### HTTP Response Streaming

```javascript
const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
  // Stream large file to response
  if (req.url === '/video') {
    const stat = fs.statSync('video.mp4');
    
    res.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Content-Length': stat.size,
    });
    
    fs.createReadStream('video.mp4').pipe(res);
  }
  
  // Stream with range support
  if (req.url === '/video-range') {
    const stat = fs.statSync('video.mp4');
    const range = req.headers.range;
    
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': 'video/mp4',
      });
      
      fs.createReadStream('video.mp4', { start, end }).pipe(res);
    }
  }
});

server.listen(3000);
```

### Binary File Processing

```javascript
const fs = require('fs');

// Read binary header
function readFileHeader(filePath) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath, {
      start: 0,
      end: 11,  // Read first 12 bytes
    });
    
    const chunks = [];
    
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

// Check file type by magic bytes
async function getFileType(filePath) {
  const header = await readFileHeader(filePath);
  
  // Check magic bytes
  if (header[0] === 0xFF && header[1] === 0xD8) {
    return 'JPEG';
  }
  if (header.slice(0, 4).toString() === '\x89PNG') {
    return 'PNG';
  }
  if (header.slice(0, 4).toString() === '%PDF') {
    return 'PDF';
  }
  
  return 'Unknown';
}
```

### Pipeline with Error Handling

```javascript
const { pipeline } = require('stream');
const fs = require('fs');
const zlib = require('zlib');

// Compress with proper error handling
pipeline(
  fs.createReadStream('input.txt'),
  zlib.createGzip(),
  fs.createWriteStream('input.txt.gz'),
  (error) => {
    if (error) {
      console.error('Pipeline failed:', error);
    } else {
      console.log('Pipeline succeeded');
    }
  }
);

// Promise-based pipeline
const { pipeline: pipelinePromise } = require('stream/promises');

async function compress(input, output) {
  try {
    await pipelinePromise(
      fs.createReadStream(input),
      zlib.createGzip(),
      fs.createWriteStream(output)
    );
    console.log('Compression complete');
  } catch (error) {
    console.error('Compression failed:', error);
  }
}
```

### Memory-Efficient File Copy

```javascript
const fs = require('fs');
const { pipeline } = require('stream/promises');

async function copyFile(source, destination) {
  await pipeline(
    fs.createReadStream(source),
    fs.createWriteStream(destination)
  );
}

// With progress
const fs = require('fs');

function copyWithProgress(source, destination) {
  const stat = fs.statSync(source);
  const totalSize = stat.size;
  let copied = 0;
  
  const readStream = fs.createReadStream(source);
  const writeStream = fs.createWriteStream(destination);
  
  readStream.on('data', (chunk) => {
    copied += chunk.length;
    const percent = ((copied / totalSize) * 100).toFixed(1);
    process.stdout.write(`\rProgress: ${percent}%`);
  });
  
  readStream.pipe(writeStream);
  
  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => {
      console.log('\nCopy complete');
      resolve();
    });
    writeStream.on('error', reject);
    readStream.on('error', reject);
  });
}
```

## Stream Backpressure

Handle when writable stream cannot keep up:

```javascript
const fs = require('fs');

const readStream = fs.createReadStream('large-file.txt');
const writeStream = fs.createWriteStream('output.txt');

readStream.on('data', (chunk) => {
  // write() returns false if internal buffer is full
  const canContinue = writeStream.write(chunk);
  
  if (!canContinue) {
    // Pause reading until drain event
    readStream.pause();
  }
});

writeStream.on('drain', () => {
  // Resume reading when buffer is empty
  readStream.resume();
});

readStream.on('end', () => {
  writeStream.end();
});
```

## Summary

| Concept | Use Case | Memory Usage |
|---------|----------|--------------|
| Buffer | Small binary data, fixed size | Loaded entirely |
| Readable Stream | Reading large files | Chunk by chunk |
| Writable Stream | Writing large files | Chunk by chunk |
| Transform Stream | Processing data in transit | Minimal |
| pipeline() | Chaining streams safely | Handles backpressure |

Best practices:
- Use streams for files larger than ~100MB
- Always handle stream errors
- Use `pipeline()` for proper error propagation
- Respect backpressure in custom streams
- Use `highWaterMark` to tune buffer sizes
- Prefer `Buffer.alloc()` over `allocUnsafe()` for security
