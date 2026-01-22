# How to Write Files Asynchronously in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, JavaScript, FileSystem, Async, Streams, IO

Description: Learn different methods to write files asynchronously in Node.js including fs.promises, callbacks, streams, and best practices for handling large files and concurrent writes.

---

Writing files is a fundamental operation in Node.js applications, from saving user uploads to generating reports. Node.js provides multiple ways to write files asynchronously, preventing your application from blocking while waiting for disk I/O.

## Quick Reference

```javascript
// Modern approach with fs/promises (recommended)
const fs = require('fs/promises');

await fs.writeFile('output.txt', 'Hello, World!');

// Callback approach
const fs = require('fs');

fs.writeFile('output.txt', 'Hello, World!', (err) => {
  if (err) throw err;
  console.log('File written');
});

// Streams for large files
const stream = fs.createWriteStream('large-file.txt');
stream.write('First chunk\n');
stream.write('Second chunk\n');
stream.end();
```

## Using fs/promises (Recommended)

The promise-based API is the cleanest way to work with files:

```javascript
const fs = require('fs/promises');

async function writeFile() {
  try {
    // Write string content
    await fs.writeFile('message.txt', 'Hello, World!');
    
    // Write with options
    await fs.writeFile('config.json', JSON.stringify({ key: 'value' }), {
      encoding: 'utf8',
      mode: 0o644,  // File permissions
      flag: 'w',    // Write mode (overwrites existing)
    });
    
    console.log('Files written successfully');
  } catch (error) {
    console.error('Failed to write file:', error.message);
  }
}

writeFile();
```

### Write Flags

The `flag` option controls how the file is opened:

```javascript
const fs = require('fs/promises');

// 'w' - Open for writing. Creates or truncates file (default)
await fs.writeFile('file.txt', 'content', { flag: 'w' });

// 'a' - Open for appending. Creates file if it doesn't exist
await fs.writeFile('log.txt', 'new log entry\n', { flag: 'a' });

// 'wx' - Like 'w' but fails if file exists
try {
  await fs.writeFile('unique.txt', 'content', { flag: 'wx' });
} catch (err) {
  if (err.code === 'EEXIST') {
    console.log('File already exists');
  }
}

// 'ax' - Like 'a' but fails if file exists
await fs.writeFile('new-log.txt', 'first entry\n', { flag: 'ax' });
```

### Writing Different Data Types

```javascript
const fs = require('fs/promises');

// String
await fs.writeFile('text.txt', 'Plain text content');

// Buffer
const buffer = Buffer.from('Binary data');
await fs.writeFile('binary.dat', buffer);

// JSON
const data = { users: [{ name: 'John' }] };
await fs.writeFile('data.json', JSON.stringify(data, null, 2));

// TypedArray
const array = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
await fs.writeFile('bytes.bin', array);
```

## Using Callbacks

The callback API is still common in older codebases:

```javascript
const fs = require('fs');

fs.writeFile('output.txt', 'Hello, World!', 'utf8', (err) => {
  if (err) {
    console.error('Error writing file:', err);
    return;
  }
  console.log('File written successfully');
});

// With options object
fs.writeFile('config.json', JSON.stringify(config), {
  encoding: 'utf8',
  mode: 0o644,
  flag: 'w',
}, (err) => {
  if (err) throw err;
});
```

### Promisifying Callbacks

If you need promises with the callback API:

```javascript
const fs = require('fs');
const util = require('util');

// Convert callback to promise
const writeFileAsync = util.promisify(fs.writeFile);

async function saveConfig(config) {
  await writeFileAsync('config.json', JSON.stringify(config));
}
```

## Appending to Files

To add content without overwriting:

```javascript
const fs = require('fs/promises');

// Append using flag
await fs.writeFile('log.txt', 'New entry\n', { flag: 'a' });

// Using appendFile (more explicit)
await fs.appendFile('log.txt', `[${new Date().toISOString()}] Event occurred\n`);

// Multiple appends
async function logEvents(events) {
  for (const event of events) {
    await fs.appendFile('events.log', `${JSON.stringify(event)}\n`);
  }
}
```

## Writing Large Files with Streams

For large files, streams prevent loading everything into memory:

```javascript
const fs = require('fs');

function writeLargeFile(filename, dataGenerator) {
  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(filename);
    
    stream.on('error', reject);
    stream.on('finish', resolve);
    
    // Write data in chunks
    for (const chunk of dataGenerator()) {
      // Check if we should wait for drain
      const canContinue = stream.write(chunk);
      
      if (!canContinue) {
        // Buffer is full, wait for drain
        stream.once('drain', () => {
          // Continue writing
        });
      }
    }
    
    stream.end();
  });
}

// Generator function for test data
function* generateData() {
  for (let i = 0; i < 1000000; i++) {
    yield `Line ${i}: ${Math.random()}\n`;
  }
}

writeLargeFile('large.txt', generateData)
  .then(() => console.log('Done'))
  .catch(console.error);
```

### Handling Backpressure

When writing faster than the disk can handle:

```javascript
const fs = require('fs');

async function writeWithBackpressure(filename, lines) {
  const stream = fs.createWriteStream(filename);
  
  for (const line of lines) {
    const canContinue = stream.write(line + '\n');
    
    if (!canContinue) {
      // Wait for the buffer to drain
      await new Promise(resolve => stream.once('drain', resolve));
    }
  }
  
  // Signal we're done writing
  stream.end();
  
  // Wait for finish
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}
```

### Pipeline for Transforming Data

```javascript
const { pipeline } = require('stream/promises');
const fs = require('fs');
const zlib = require('zlib');

async function writeCompressed(filename, data) {
  const source = require('stream').Readable.from([data]);
  const gzip = zlib.createGzip();
  const destination = fs.createWriteStream(filename + '.gz');
  
  await pipeline(source, gzip, destination);
}

// Write CSV with transformation
const { Transform } = require('stream');

async function writeCSV(filename, records) {
  const toCSV = new Transform({
    objectMode: true,
    transform(record, encoding, callback) {
      const line = Object.values(record).join(',') + '\n';
      callback(null, line);
    },
  });
  
  const source = require('stream').Readable.from(records);
  const destination = fs.createWriteStream(filename);
  
  // Write header
  destination.write('name,email,age\n');
  
  await pipeline(source, toCSV, destination);
}
```

## Creating Directories Before Writing

Ensure the directory exists before writing:

```javascript
const fs = require('fs/promises');
const path = require('path');

async function writeFileSafe(filepath, content) {
  // Create directory if it doesn't exist
  const dir = path.dirname(filepath);
  await fs.mkdir(dir, { recursive: true });
  
  // Write the file
  await fs.writeFile(filepath, content);
}

// Usage
await writeFileSafe('logs/2024/01/15/app.log', 'Log content');
```

## Atomic Writes

To prevent partial writes on crash:

```javascript
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

async function atomicWrite(filepath, content) {
  // Write to a temporary file first
  const tempPath = filepath + '.' + crypto.randomBytes(6).toString('hex');
  
  try {
    await fs.writeFile(tempPath, content);
    
    // Rename is atomic on most filesystems
    await fs.rename(tempPath, filepath);
  } catch (error) {
    // Clean up temp file on error
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}
```

## Concurrent File Writing

Handle multiple files efficiently:

```javascript
const fs = require('fs/promises');

// Write multiple files in parallel
async function writeMultipleFiles(files) {
  const operations = files.map(({ path, content }) =>
    fs.writeFile(path, content)
  );
  
  await Promise.all(operations);
}

// With concurrency limit
async function writeWithLimit(files, concurrency = 10) {
  const results = [];
  const executing = [];
  
  for (const file of files) {
    const promise = fs.writeFile(file.path, file.content)
      .then(() => ({ path: file.path, success: true }))
      .catch(err => ({ path: file.path, success: false, error: err }));
    
    results.push(promise);
    executing.push(promise);
    
    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // Remove completed promises
      executing.splice(0, executing.length, 
        ...executing.filter(p => !p.settled));
    }
  }
  
  return Promise.all(results);
}
```

## Error Handling

Handle common file writing errors:

```javascript
const fs = require('fs/promises');

async function safeWriteFile(filepath, content) {
  try {
    await fs.writeFile(filepath, content);
    return { success: true };
  } catch (error) {
    switch (error.code) {
      case 'ENOENT':
        return { success: false, error: 'Directory does not exist' };
      
      case 'EACCES':
        return { success: false, error: 'Permission denied' };
      
      case 'ENOSPC':
        return { success: false, error: 'No space left on device' };
      
      case 'EROFS':
        return { success: false, error: 'Read-only file system' };
      
      case 'EMFILE':
        return { success: false, error: 'Too many open files' };
      
      default:
        return { success: false, error: error.message };
    }
  }
}
```

## Writing JSON Files

Common pattern for JSON files:

```javascript
const fs = require('fs/promises');

async function writeJSON(filepath, data, options = {}) {
  const {
    pretty = true,
    spaces = 2,
    replacer = null,
  } = options;
  
  const content = pretty
    ? JSON.stringify(data, replacer, spaces)
    : JSON.stringify(data, replacer);
  
  await fs.writeFile(filepath, content + '\n', 'utf8');
}

async function updateJSON(filepath, updater) {
  // Read existing data
  let data;
  try {
    const content = await fs.readFile(filepath, 'utf8');
    data = JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      data = {}; // File doesn't exist, start fresh
    } else {
      throw error;
    }
  }
  
  // Apply updates
  const updated = await updater(data);
  
  // Write back
  await writeJSON(filepath, updated);
  
  return updated;
}

// Usage
await updateJSON('config.json', config => ({
  ...config,
  lastUpdated: new Date().toISOString(),
}));
```

## Complete Example

Here is a logging utility using async file writing:

```javascript
const fs = require('fs/promises');
const path = require('path');

class AsyncLogger {
  constructor(logDir) {
    this.logDir = logDir;
    this.queue = [];
    this.isWriting = false;
  }
  
  async ensureDirectory() {
    await fs.mkdir(this.logDir, { recursive: true });
  }
  
  getLogFile() {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `${date}.log`);
  }
  
  formatMessage(level, message, meta) {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ' ' + JSON.stringify(meta) : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}\n`;
  }
  
  log(level, message, meta) {
    this.queue.push({ level, message, meta });
    this.processQueue();
  }
  
  async processQueue() {
    if (this.isWriting || this.queue.length === 0) return;
    
    this.isWriting = true;
    
    try {
      await this.ensureDirectory();
      
      // Batch all pending messages
      const messages = this.queue.splice(0, this.queue.length);
      const content = messages
        .map(m => this.formatMessage(m.level, m.message, m.meta))
        .join('');
      
      await fs.appendFile(this.getLogFile(), content);
    } catch (error) {
      console.error('Failed to write log:', error);
    } finally {
      this.isWriting = false;
      
      // Process any new messages that arrived
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }
  }
  
  info(message, meta) { this.log('INFO', message, meta); }
  warn(message, meta) { this.log('WARN', message, meta); }
  error(message, meta) { this.log('ERROR', message, meta); }
}

// Usage
const logger = new AsyncLogger('./logs');

logger.info('Application started');
logger.info('User logged in', { userId: '123' });
logger.error('Database connection failed', { error: 'timeout' });
```

## Summary

| Method | Use Case |
|--------|----------|
| `fs/promises.writeFile` | Simple files, modern code |
| `fs.writeFile` (callback) | Legacy code, event-driven |
| `fs.createWriteStream` | Large files, continuous data |
| `pipeline` | Transform and compress |
| Atomic write | Critical data, crash safety |

Choose the right approach based on your file size and requirements. For most cases, `fs/promises.writeFile` is the cleanest option. Use streams for large files or when processing data on the fly.
