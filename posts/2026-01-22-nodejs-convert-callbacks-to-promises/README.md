# How to Convert Callback Functions to Promises in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, JavaScript, Promises, Async, Callbacks, Error Handling

Description: Learn how to convert callback-based functions to Promises in Node.js using manual wrapping, util.promisify, and custom promisification patterns for cleaner async code.

---

Callback-based APIs were the original pattern for handling asynchronous operations in Node.js. While they work, they often lead to deeply nested code (callback hell) that is hard to read and maintain. Promises provide a cleaner way to handle async operations, and modern Node.js makes converting between the two straightforward.

## The Problem with Callbacks

Consider this typical callback-based code for reading a file and processing its contents:

```javascript
// Callback hell - deeply nested and hard to follow
const fs = require('fs');

fs.readFile('config.json', 'utf8', (err, data) => {
  if (err) {
    console.error('Failed to read config:', err);
    return;
  }
  
  const config = JSON.parse(data);
  
  fs.readFile(config.dataFile, 'utf8', (err, fileData) => {
    if (err) {
      console.error('Failed to read data file:', err);
      return;
    }
    
    processData(fileData, (err, result) => {
      if (err) {
        console.error('Processing failed:', err);
        return;
      }
      
      fs.writeFile('output.json', JSON.stringify(result), (err) => {
        if (err) {
          console.error('Failed to write output:', err);
          return;
        }
        
        console.log('Done!');
      });
    });
  });
});
```

The same logic with Promises is much cleaner:

```javascript
// With Promises - flat and readable
const fs = require('fs').promises;

async function processConfiguredData() {
  const configData = await fs.readFile('config.json', 'utf8');
  const config = JSON.parse(configData);
  
  const fileData = await fs.readFile(config.dataFile, 'utf8');
  const result = await processDataAsync(fileData);
  
  await fs.writeFile('output.json', JSON.stringify(result));
  console.log('Done!');
}
```

## Method 1: Manual Promise Wrapping

The most direct way to convert a callback function to a Promise is to wrap it manually. This gives you full control over how the Promise resolves or rejects.

```javascript
// The callback-based function we want to convert
function fetchUserCallback(userId, callback) {
  // Simulates an async database call
  setTimeout(() => {
    if (!userId) {
      callback(new Error('User ID is required'));
      return;
    }
    
    callback(null, { id: userId, name: 'John Doe' });
  }, 100);
}

// Manual Promise wrapper
function fetchUser(userId) {
  return new Promise((resolve, reject) => {
    fetchUserCallback(userId, (error, user) => {
      if (error) {
        reject(error);
      } else {
        resolve(user);
      }
    });
  });
}

// Usage with async/await
async function main() {
  try {
    const user = await fetchUser('123');
    console.log('User:', user);
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

### Wrapping Functions with Multiple Results

Some callbacks return multiple values. You can handle this by resolving with an array or object:

```javascript
// Callback returns multiple values
function getStats(path, callback) {
  // callback(err, size, modified, created)
}

// Wrap with object destructuring
function getStatsAsync(path) {
  return new Promise((resolve, reject) => {
    getStats(path, (err, size, modified, created) => {
      if (err) {
        reject(err);
      } else {
        resolve({ size, modified, created });
      }
    });
  });
}

// Usage
const { size, modified } = await getStatsAsync('/path/to/file');
```

## Method 2: Using util.promisify

Node.js provides `util.promisify()` which automatically converts callback-based functions that follow the Node.js callback convention (error-first callbacks).

```javascript
const util = require('util');
const fs = require('fs');

// Convert fs.readFile to return a Promise
const readFileAsync = util.promisify(fs.readFile);

// Now you can use it with async/await
async function readConfig() {
  const data = await readFileAsync('config.json', 'utf8');
  return JSON.parse(data);
}
```

### Promisifying Multiple Functions at Once

```javascript
const util = require('util');
const fs = require('fs');

// Create promisified versions of common fs functions
const fsAsync = {
  readFile: util.promisify(fs.readFile),
  writeFile: util.promisify(fs.writeFile),
  readdir: util.promisify(fs.readdir),
  stat: util.promisify(fs.stat),
  unlink: util.promisify(fs.unlink),
  mkdir: util.promisify(fs.mkdir),
};

// Usage
async function processFiles() {
  const files = await fsAsync.readdir('./data');
  
  for (const file of files) {
    const stats = await fsAsync.stat(`./data/${file}`);
    console.log(`${file}: ${stats.size} bytes`);
  }
}
```

### Custom promisify Behavior

Some functions do not follow the standard callback convention. You can define custom promisify behavior using `util.promisify.custom`:

```javascript
const util = require('util');

// Function with non-standard callback
function customAsyncOp(options, callback) {
  // callback(result, error) - note: reversed order!
  setTimeout(() => {
    if (options.fail) {
      callback(null, new Error('Operation failed'));
    } else {
      callback({ data: 'success' }, null);
    }
  }, 100);
}

// Define custom promisify behavior
customAsyncOp[util.promisify.custom] = (options) => {
  return new Promise((resolve, reject) => {
    customAsyncOp(options, (result, error) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
};

// Now promisify works correctly
const customAsyncOpAsync = util.promisify(customAsyncOp);

// Usage
const result = await customAsyncOpAsync({ fail: false });
```

## Method 3: Using Built-in Promise APIs

Modern Node.js versions provide Promise-based APIs out of the box. Always prefer these over promisifying the callback versions.

```javascript
// fs promises API (Node.js 10+)
const fs = require('fs').promises;
// Or: const fs = require('fs/promises'); // Node.js 14+

async function fileOperations() {
  await fs.writeFile('test.txt', 'Hello World');
  const content = await fs.readFile('test.txt', 'utf8');
  await fs.unlink('test.txt');
}

// DNS promises API
const dns = require('dns').promises;

async function lookupDomain() {
  const addresses = await dns.resolve4('example.com');
  console.log('IP addresses:', addresses);
}

// Timers promises API (Node.js 15+)
const { setTimeout: delay } = require('timers/promises');

async function waitAndContinue() {
  console.log('Starting...');
  await delay(1000);
  console.log('1 second later');
}
```

## Method 4: Creating a Generic Promisify Helper

For projects with many callback-based functions, create a reusable helper:

```javascript
/**
 * Converts a callback-based function to return a Promise.
 * Supports both (err, result) and (err, ...results) patterns.
 */
function promisify(fn) {
  return function(...args) {
    return new Promise((resolve, reject) => {
      fn(...args, (err, ...results) => {
        if (err) {
          reject(err);
        } else if (results.length <= 1) {
          resolve(results[0]);
        } else {
          resolve(results);
        }
      });
    });
  };
}

// Usage
const readFileAsync = promisify(require('fs').readFile);
```

### Promisifying Object Methods

When promisifying methods that use `this`, you need to preserve the context:

```javascript
const util = require('util');

class Database {
  constructor(connection) {
    this.connection = connection;
  }
  
  // Callback-based method
  query(sql, params, callback) {
    this.connection.execute(sql, params, callback);
  }
}

// Promisify while preserving context
function promisifyMethod(obj, methodName) {
  const original = obj[methodName];
  obj[methodName + 'Async'] = util.promisify(original).bind(obj);
}

// Usage
const db = new Database(connection);
promisifyMethod(db, 'query');

const rows = await db.queryAsync('SELECT * FROM users WHERE id = ?', [userId]);
```

## Method 5: Converting Event Emitters to Promises

Some Node.js APIs use event emitters instead of callbacks. Here is how to convert them:

```javascript
const { EventEmitter } = require('events');

/**
 * Waits for a specific event and returns the first argument.
 * Rejects if an 'error' event is emitted first.
 */
function waitForEvent(emitter, eventName) {
  return new Promise((resolve, reject) => {
    const onSuccess = (result) => {
      emitter.off('error', onError);
      resolve(result);
    };
    
    const onError = (error) => {
      emitter.off(eventName, onSuccess);
      reject(error);
    };
    
    emitter.once(eventName, onSuccess);
    emitter.once('error', onError);
  });
}

// Usage with a stream
const fs = require('fs');

async function readStreamFully(filePath) {
  const stream = fs.createReadStream(filePath);
  const chunks = [];
  
  stream.on('data', (chunk) => chunks.push(chunk));
  
  await waitForEvent(stream, 'end');
  
  return Buffer.concat(chunks);
}
```

### Using events.once (Node.js 11.13+)

Node.js provides a built-in helper for this:

```javascript
const { once } = require('events');
const fs = require('fs');

async function waitForStreamEnd() {
  const stream = fs.createReadStream('large-file.txt');
  
  // Wait for the stream to be ready
  await once(stream, 'ready');
  
  // Process data...
  
  // Wait for completion
  await once(stream, 'end');
}
```

## Handling Edge Cases

### Callbacks Called Multiple Times

Some callback APIs may call the callback multiple times. Promises only resolve/reject once, so you need to handle this:

```javascript
function promisifyOnce(fn) {
  return function(...args) {
    return new Promise((resolve, reject) => {
      let settled = false;
      
      fn(...args, (err, result) => {
        if (settled) {
          console.warn('Callback called after Promise settled');
          return;
        }
        
        settled = true;
        
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  };
}
```

### Callbacks with No Arguments

Some callbacks signal completion without passing any arguments:

```javascript
function closeConnection(callback) {
  // callback() - no arguments
}

// Wrap appropriately
function closeConnectionAsync() {
  return new Promise((resolve, reject) => {
    closeConnection(() => {
      resolve();
    });
  });
}
```

### Optional Callbacks

Many Node.js functions have optional callbacks. When promisifying, handle both cases:

```javascript
function saveData(data, options, callback) {
  // callback is optional
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  
  // ... save logic
}

// Promisified version
function saveDataAsync(data, options = {}) {
  return new Promise((resolve, reject) => {
    saveData(data, options, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}
```

## Real-World Example: Converting a Legacy Module

Here is a complete example of converting a callback-based module to Promises:

```javascript
// legacy-db.js - Original callback-based module
class LegacyDatabase {
  connect(config, callback) {
    setTimeout(() => {
      this.connected = true;
      callback(null, { status: 'connected' });
    }, 100);
  }
  
  query(sql, params, callback) {
    if (!this.connected) {
      callback(new Error('Not connected'));
      return;
    }
    setTimeout(() => {
      callback(null, [{ id: 1, name: 'Test' }]);
    }, 50);
  }
  
  close(callback) {
    this.connected = false;
    setTimeout(() => callback(), 10);
  }
}

// promisified-db.js - Promise-based wrapper
const util = require('util');

class PromisifiedDatabase {
  constructor() {
    this.legacy = new LegacyDatabase();
    
    // Promisify and bind methods
    this.connect = util.promisify(this.legacy.connect).bind(this.legacy);
    this.query = util.promisify(this.legacy.query).bind(this.legacy);
    this.close = util.promisify(this.legacy.close).bind(this.legacy);
  }
  
  // Add convenience methods
  async transaction(fn) {
    await this.query('BEGIN');
    try {
      const result = await fn(this);
      await this.query('COMMIT');
      return result;
    } catch (error) {
      await this.query('ROLLBACK');
      throw error;
    }
  }
}

// Usage
async function main() {
  const db = new PromisifiedDatabase();
  
  await db.connect({ host: 'localhost' });
  
  const users = await db.query('SELECT * FROM users');
  console.log('Users:', users);
  
  await db.close();
}
```

## Summary

| Method | When to Use |
|--------|-------------|
| **Manual wrapping** | Full control needed, non-standard callbacks |
| **util.promisify** | Standard Node.js callbacks (err, result) |
| **Built-in promises** | Modern Node.js APIs (fs/promises, dns/promises) |
| **events.once** | Event emitter patterns |
| **Custom helper** | Project-wide consistency |

Converting callbacks to Promises makes your code more readable, enables async/await syntax, and simplifies error handling with try/catch. Most modern Node.js APIs now provide Promise-based alternatives, but when working with older libraries or custom code, these patterns give you the tools to modernize your codebase.
