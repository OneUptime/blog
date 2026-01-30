# How to Implement Custom Transform Streams in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Streams, Transform, Performance

Description: Learn how to implement custom Transform streams in Node.js for efficient data processing pipelines.

---

Transform streams are one of the most powerful features in Node.js for processing data on-the-fly. They sit between readable and writable streams, allowing you to modify or transform data as it passes through. This guide covers everything you need to know to implement custom Transform streams effectively.

## Understanding Transform Stream Basics

A Transform stream is a duplex stream where the output is computed based on the input. Unlike a simple passthrough, Transform streams let you manipulate data chunks before passing them downstream. Common use cases include compression, encryption, parsing, and data format conversion.

To create a custom Transform stream, you extend the `Transform` class from the `stream` module:

```javascript
const { Transform } = require('stream');

class UpperCaseTransform extends Transform {
  _transform(chunk, encoding, callback) {
    const upperCased = chunk.toString().toUpperCase();
    this.push(upperCased);
    callback();
  }
}
```

## The _transform Method

The `_transform` method is the heart of any Transform stream. It receives three arguments:

- **chunk**: The data to be transformed (Buffer or string by default)
- **encoding**: The encoding type if chunk is a string
- **callback**: A function to call when transformation is complete

You must call `callback()` to signal completion. To pass transformed data downstream, use `this.push()`. You can push multiple times per chunk or skip pushing entirely to filter data:

```javascript
class FilterNumbers extends Transform {
  _transform(chunk, encoding, callback) {
    const text = chunk.toString();
    const filtered = text.replace(/[0-9]/g, '');
    if (filtered.length > 0) {
      this.push(filtered);
    }
    callback();
  }
}
```

## The _flush Method

The `_flush` method is called when there's no more data to consume, but before the stream closes. This is perfect for handling any remaining buffered data or adding final output:

```javascript
class LineCounter extends Transform {
  constructor(options) {
    super(options);
    this.lineCount = 0;
  }

  _transform(chunk, encoding, callback) {
    const lines = chunk.toString().split('\n');
    this.lineCount += lines.length - 1;
    this.push(chunk);
    callback();
  }

  _flush(callback) {
    this.push(`\n--- Total lines: ${this.lineCount} ---\n`);
    callback();
  }
}
```

## Working with objectMode

By default, streams work with Buffer or string data. Setting `objectMode: true` allows streams to handle JavaScript objects, which is invaluable for processing structured data:

```javascript
class JSONParser extends Transform {
  constructor() {
    super({
      objectMode: true,
      readableObjectMode: true,
      writableObjectMode: false
    });
  }

  _transform(chunk, encoding, callback) {
    try {
      const obj = JSON.parse(chunk.toString());
      this.push(obj);
      callback();
    } catch (err) {
      callback(err);
    }
  }
}
```

## Configuring highWaterMark

The `highWaterMark` option controls the internal buffer size. For Transform streams, you can set different values for the readable and writable sides:

```javascript
const transform = new Transform({
  highWaterMark: 64 * 1024, // 64KB buffer
  transform(chunk, encoding, callback) {
    this.push(processChunk(chunk));
    callback();
  }
});
```

A higher `highWaterMark` improves throughput but uses more memory. Lower values reduce memory usage but may increase processing overhead.

## Practical Example: Compression Stream

Here's a practical example implementing a simple run-length encoding compression:

```javascript
class RLECompress extends Transform {
  constructor() {
    super();
    this.lastChar = null;
    this.count = 0;
  }

  _transform(chunk, encoding, callback) {
    const str = chunk.toString();
    for (const char of str) {
      if (char === this.lastChar) {
        this.count++;
      } else {
        if (this.lastChar !== null) {
          this.push(`${this.count}${this.lastChar}`);
        }
        this.lastChar = char;
        this.count = 1;
      }
    }
    callback();
  }

  _flush(callback) {
    if (this.lastChar !== null) {
      this.push(`${this.count}${this.lastChar}`);
    }
    callback();
  }
}
```

## Practical Example: Simple Encryption

A basic XOR cipher Transform stream demonstrates encryption patterns:

```javascript
class XORCipher extends Transform {
  constructor(key) {
    super();
    this.key = Buffer.from(key);
    this.keyIndex = 0;
  }

  _transform(chunk, encoding, callback) {
    const output = Buffer.alloc(chunk.length);
    for (let i = 0; i < chunk.length; i++) {
      output[i] = chunk[i] ^ this.key[this.keyIndex];
      this.keyIndex = (this.keyIndex + 1) % this.key.length;
    }
    this.push(output);
    callback();
  }
}
```

## Practical Example: CSV Parser

Transform streams excel at parsing structured data:

```javascript
class CSVParser extends Transform {
  constructor() {
    super({ objectMode: true });
    this.headers = null;
    this.buffer = '';
  }

  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString();
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop();

    for (const line of lines) {
      if (!line.trim()) continue;
      const values = line.split(',').map(v => v.trim());

      if (!this.headers) {
        this.headers = values;
      } else {
        const obj = {};
        this.headers.forEach((h, i) => obj[h] = values[i]);
        this.push(obj);
      }
    }
    callback();
  }
}
```

## Piping Transform Streams

The real power emerges when you chain multiple transforms:

```javascript
const fs = require('fs');

fs.createReadStream('input.csv')
  .pipe(new CSVParser())
  .pipe(new FilterTransform())
  .pipe(new JSONStringify())
  .pipe(fs.createWriteStream('output.json'));
```

## Conclusion

Custom Transform streams provide a clean, memory-efficient way to process data in Node.js. By implementing `_transform` and `_flush` methods, configuring `objectMode` and `highWaterMark`, you can build powerful data processing pipelines for compression, encryption, parsing, and virtually any transformation task. The streaming approach ensures your application handles large datasets without memory issues while maintaining clean, modular code.
