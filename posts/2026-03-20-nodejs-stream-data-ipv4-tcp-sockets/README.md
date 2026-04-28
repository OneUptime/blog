# How to Stream Data over IPv4 TCP Sockets in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, Stream, TCP, IPv4, Backpressure, Net Module, Performance

Description: Use Node.js streams and the net module to efficiently stream large data sets over IPv4 TCP connections with proper backpressure handling.

## Introduction

Node.js TCP sockets are duplex streams. This means you can pipe readable streams (files, HTTP responses, generators) directly to sockets, and Node.js handles backpressure automatically. Understanding this stream model is key to building efficient data streaming applications over IPv4.

## Streaming a File to a Client

```javascript
// server.js - stream a file to connecting clients
const net = require('net');
const fs = require('fs');
const path = require('path');

const FILE_PATH = './large-dataset.csv';

const server = net.createServer((socket) => {
  console.log(`Streaming to ${socket.remoteAddress}`);
  
  const readStream = fs.createReadStream(FILE_PATH, {
    highWaterMark: 64 * 1024   // 64KB read chunks
  });
  
  // pipe() handles backpressure automatically:
  // - pauses the readStream when socket buffer is full
  // - resumes when socket drains
  readStream.pipe(socket);
  
  readStream.on('error', (err) => {
    console.error(`Read error: ${err.message}`);
    socket.destroy(err);
  });
  
  socket.on('error', (err) => {
    if (err.code !== 'ECONNRESET') {
      console.error(`Socket error: ${err.message}`);
    }
    readStream.destroy();
  });
  
  socket.on('finish', () => {
    console.log(`Stream complete for ${socket.remoteAddress}`);
  });
});

server.listen(4000, '0.0.0.0', () => {
  console.log('Streaming server on port 4000');
});
```

## Streaming with Manual Backpressure Control

When you need custom logic between source and socket, handle backpressure manually:

```javascript
const net = require('net');
const fs = require('fs');

const server = net.createServer((socket) => {
  const readStream = fs.createReadStream('./data.bin');
  let bytesSent = 0;
  
  readStream.on('data', (chunk) => {
    bytesSent += chunk.length;
    
    // socket.write returns false when the internal buffer is full
    const canContinue = socket.write(chunk);
    
    if (!canContinue) {
      // Pause reading until the socket drains
      readStream.pause();
      console.log(`Backpressure: paused at ${bytesSent} bytes`);
    }
  });
  
  // Resume reading when the socket buffer drains
  socket.on('drain', () => {
    readStream.resume();
    console.log('Socket drained, resuming stream');
  });
  
  readStream.on('end', () => {
    socket.end(); // Send FIN after all data is written
    console.log(`Sent ${bytesSent} bytes total`);
  });
});
```

## Streaming Generated Data (Transform Stream)

```javascript
const { Transform } = require('stream');
const net = require('net');

// Transform stream that generates timestamped JSON data
class DataGenerator extends Transform {
  constructor() {
    super({ objectMode: false });
    this.counter = 0;
    this.interval = null;
  }
  
  _transform(chunk, encoding, callback) {
    callback(null, chunk);
  }
  
  startGenerating(socket) {
    this.interval = setInterval(() => {
      const data = JSON.stringify({
        id: ++this.counter,
        timestamp: Date.now(),
        value: Math.random() * 100
      }) + '\n';
      
      // Stop if socket is not writable
      if (!socket.writable) {
        this.stopGenerating();
        return;
      }
      
      socket.write(data);
    }, 100); // Generate 10 records per second
  }
  
  stopGenerating() {
    if (this.interval) clearInterval(this.interval);
  }
}

const server = net.createServer((socket) => {
  const generator = new DataGenerator();
  generator.startGenerating(socket);
  
  socket.on('close', () => generator.stopGenerating());
  socket.on('error', () => generator.stopGenerating());
});

server.listen(5000, '0.0.0.0', () => {
  console.log('Streaming data generator on port 5000');
});
```

## Receiving a Stream (Client Side)

```javascript
// client.js - receive and process a stream
const net = require('net');

const client = net.createConnection({
  host: '192.168.1.100',
  port: 4000,
  family: 4
});

let totalBytes = 0;

client.on('data', (chunk) => {
  totalBytes += chunk.length;
  process.stdout.write(`\rReceived: ${(totalBytes / 1024).toFixed(1)} KB`);
  
  // Process chunk here (write to file, parse JSON lines, etc.)
});

client.on('end', () => {
  console.log(`\nStream complete. Total: ${totalBytes} bytes`);
});

client.on('error', (err) => console.error(`Client error: ${err.message}`));
```

## Transform Stream: CSV to JSON Conversion Over TCP

```javascript
const { Transform } = require('stream');
const net = require('net');
const fs = require('fs');

class CsvToJsonTransform extends Transform {
  constructor() {
    super({ readableObjectMode: false });
    this.headers = null;
    this.buffer = '';
  }
  
  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString();
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop();  // Keep incomplete last line
    
    for (const line of lines) {
      if (!this.headers) {
        this.headers = line.split(',').map(h => h.trim());
      } else if (line.trim()) {
        const values = line.split(',');
        const obj = Object.fromEntries(this.headers.map((h, i) => [h, values[i]?.trim()]));
        this.push(JSON.stringify(obj) + '\n');
      }
    }
    callback();
  }
}

const server = net.createServer((socket) => {
  const transform = new CsvToJsonTransform();
  // Read CSV from file, transform to JSON, send over socket
  fs.createReadStream('./data.csv').pipe(transform).pipe(socket);
});
```

## Conclusion

Node.js's stream-based TCP socket model enables efficient, memory-safe data streaming over IPv4. Use `pipe()` for simple cases, handle `drain` events for manual backpressure control, and use Transform streams to process data on-the-fly as it flows from source to socket.
