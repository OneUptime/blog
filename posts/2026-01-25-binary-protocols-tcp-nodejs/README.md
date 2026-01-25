# How to Handle Binary Protocols Over TCP in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, TCP, Networking, Binary Protocols, Backend

Description: Learn how to implement custom binary protocols over TCP in Node.js, including message framing, parsing, and handling partial reads.

---

Many high-performance systems communicate using binary protocols instead of text-based formats like JSON or HTTP. Database drivers, game servers, IoT devices, and financial trading systems often use custom binary formats for efficiency and speed. Node.js provides the tools to build both clients and servers that speak these protocols.

This guide covers the fundamentals of binary protocol implementation: message framing, buffer manipulation, handling partial reads, and building a complete client-server example.

## Why Binary Protocols?

Text-based protocols like HTTP and JSON are human-readable and easy to debug. Binary protocols trade readability for performance:

| Aspect | Text Protocol | Binary Protocol |
|--------|--------------|-----------------|
| **Message size** | Larger | Compact |
| **Parse speed** | Slower | Faster |
| **Debugging** | Easy | Requires tools |
| **Schema evolution** | Flexible | Needs versioning |

Use binary protocols when bandwidth or latency matters, or when integrating with systems that already use them.

## Message Framing

TCP is a stream protocol. It does not preserve message boundaries. When you send two messages, the receiver might get them as one chunk, or split across multiple chunks. Message framing solves this by adding structure to the byte stream.

Common framing approaches:

```typescript
// 1. Length-prefixed: 4-byte header contains message length
// [length: 4 bytes][payload: N bytes]

// 2. Delimiter-based: Special byte sequence marks message end
// [payload][delimiter]

// 3. Fixed-length: All messages are the same size
// [payload: fixed N bytes]
```

Length-prefixed framing is the most common and flexible approach. Here is the implementation:

```typescript
// framing/lengthPrefixed.ts
import { Buffer } from 'buffer';

// Frame a message by prepending its length as a 4-byte big-endian integer
export function frameMessage(payload: Buffer): Buffer {
  const frame = Buffer.allocUnsafe(4 + payload.length);
  frame.writeUInt32BE(payload.length, 0);
  payload.copy(frame, 4);
  return frame;
}

// Parser that accumulates bytes and emits complete messages
export class MessageParser {
  private buffer: Buffer = Buffer.alloc(0);
  private onMessage: (payload: Buffer) => void;

  constructor(onMessage: (payload: Buffer) => void) {
    this.onMessage = onMessage;
  }

  // Feed incoming data from the socket
  feed(data: Buffer): void {
    // Append new data to existing buffer
    this.buffer = Buffer.concat([this.buffer, data]);

    // Process all complete messages in the buffer
    while (this.buffer.length >= 4) {
      const messageLength = this.buffer.readUInt32BE(0);

      // Check if we have the complete message
      if (this.buffer.length < 4 + messageLength) {
        break; // Wait for more data
      }

      // Extract the message payload
      const payload = this.buffer.subarray(4, 4 + messageLength);

      // Remove processed bytes from buffer
      this.buffer = this.buffer.subarray(4 + messageLength);

      // Emit the complete message
      this.onMessage(payload);
    }
  }

  // Reset parser state
  reset(): void {
    this.buffer = Buffer.alloc(0);
  }
}
```

## Defining a Binary Protocol

Let us define a simple request-response protocol for a key-value store. Each message has a type byte followed by type-specific fields.

```typescript
// protocol/types.ts

// Message types
export enum MessageType {
  GET_REQUEST = 0x01,
  GET_RESPONSE = 0x02,
  SET_REQUEST = 0x03,
  SET_RESPONSE = 0x04,
  DELETE_REQUEST = 0x05,
  DELETE_RESPONSE = 0x06,
  ERROR = 0xFF,
}

// Status codes for responses
export enum StatusCode {
  OK = 0x00,
  NOT_FOUND = 0x01,
  INVALID_REQUEST = 0x02,
  SERVER_ERROR = 0x03,
}

// Message structure definitions
export interface GetRequest {
  type: MessageType.GET_REQUEST;
  requestId: number;
  key: string;
}

export interface GetResponse {
  type: MessageType.GET_RESPONSE;
  requestId: number;
  status: StatusCode;
  value?: Buffer;
}

export interface SetRequest {
  type: MessageType.SET_REQUEST;
  requestId: number;
  key: string;
  value: Buffer;
  ttlSeconds?: number;
}

export interface SetResponse {
  type: MessageType.SET_RESPONSE;
  requestId: number;
  status: StatusCode;
}

export type Message =
  | GetRequest
  | GetResponse
  | SetRequest
  | SetResponse;
```

## Serializing Messages

The encoder converts TypeScript objects into binary buffers. Each field is written at a specific offset with a defined size and byte order.

```typescript
// protocol/encoder.ts
import { Buffer } from 'buffer';
import { Message, MessageType } from './types';

export function encodeMessage(message: Message): Buffer {
  switch (message.type) {
    case MessageType.GET_REQUEST:
      return encodeGetRequest(message);
    case MessageType.GET_RESPONSE:
      return encodeGetResponse(message);
    case MessageType.SET_REQUEST:
      return encodeSetRequest(message);
    case MessageType.SET_RESPONSE:
      return encodeSetResponse(message);
    default:
      throw new Error('Unknown message type');
  }
}

// GET_REQUEST format:
// [type: 1 byte][requestId: 4 bytes][keyLength: 2 bytes][key: N bytes]
function encodeGetRequest(msg: { requestId: number; key: string }): Buffer {
  const keyBuffer = Buffer.from(msg.key, 'utf-8');
  const buffer = Buffer.allocUnsafe(1 + 4 + 2 + keyBuffer.length);

  let offset = 0;
  buffer.writeUInt8(MessageType.GET_REQUEST, offset);
  offset += 1;

  buffer.writeUInt32BE(msg.requestId, offset);
  offset += 4;

  buffer.writeUInt16BE(keyBuffer.length, offset);
  offset += 2;

  keyBuffer.copy(buffer, offset);

  return buffer;
}

// GET_RESPONSE format:
// [type: 1][requestId: 4][status: 1][valueLength: 4][value: N]
function encodeGetResponse(msg: {
  requestId: number;
  status: number;
  value?: Buffer;
}): Buffer {
  const valueLength = msg.value?.length || 0;
  const buffer = Buffer.allocUnsafe(1 + 4 + 1 + 4 + valueLength);

  let offset = 0;
  buffer.writeUInt8(MessageType.GET_RESPONSE, offset);
  offset += 1;

  buffer.writeUInt32BE(msg.requestId, offset);
  offset += 4;

  buffer.writeUInt8(msg.status, offset);
  offset += 1;

  buffer.writeUInt32BE(valueLength, offset);
  offset += 4;

  if (msg.value) {
    msg.value.copy(buffer, offset);
  }

  return buffer;
}

// SET_REQUEST format:
// [type: 1][requestId: 4][keyLength: 2][key: N][ttl: 4][valueLength: 4][value: M]
function encodeSetRequest(msg: {
  requestId: number;
  key: string;
  value: Buffer;
  ttlSeconds?: number;
}): Buffer {
  const keyBuffer = Buffer.from(msg.key, 'utf-8');
  const buffer = Buffer.allocUnsafe(
    1 + 4 + 2 + keyBuffer.length + 4 + 4 + msg.value.length
  );

  let offset = 0;
  buffer.writeUInt8(MessageType.SET_REQUEST, offset);
  offset += 1;

  buffer.writeUInt32BE(msg.requestId, offset);
  offset += 4;

  buffer.writeUInt16BE(keyBuffer.length, offset);
  offset += 2;

  keyBuffer.copy(buffer, offset);
  offset += keyBuffer.length;

  buffer.writeUInt32BE(msg.ttlSeconds || 0, offset);
  offset += 4;

  buffer.writeUInt32BE(msg.value.length, offset);
  offset += 4;

  msg.value.copy(buffer, offset);

  return buffer;
}

// SET_RESPONSE format:
// [type: 1][requestId: 4][status: 1]
function encodeSetResponse(msg: {
  requestId: number;
  status: number;
}): Buffer {
  const buffer = Buffer.allocUnsafe(1 + 4 + 1);

  buffer.writeUInt8(MessageType.SET_RESPONSE, 0);
  buffer.writeUInt32BE(msg.requestId, 1);
  buffer.writeUInt8(msg.status, 5);

  return buffer;
}
```

## Parsing Messages

The decoder reads bytes from the buffer and reconstructs TypeScript objects. It needs to handle each message type and validate the data.

```typescript
// protocol/decoder.ts
import { Buffer } from 'buffer';
import { Message, MessageType, StatusCode } from './types';

export function decodeMessage(buffer: Buffer): Message {
  if (buffer.length < 1) {
    throw new Error('Buffer too short');
  }

  const type = buffer.readUInt8(0);

  switch (type) {
    case MessageType.GET_REQUEST:
      return decodeGetRequest(buffer);
    case MessageType.GET_RESPONSE:
      return decodeGetResponse(buffer);
    case MessageType.SET_REQUEST:
      return decodeSetRequest(buffer);
    case MessageType.SET_RESPONSE:
      return decodeSetResponse(buffer);
    default:
      throw new Error(`Unknown message type: ${type}`);
  }
}

function decodeGetRequest(buffer: Buffer): Message {
  let offset = 1;

  const requestId = buffer.readUInt32BE(offset);
  offset += 4;

  const keyLength = buffer.readUInt16BE(offset);
  offset += 2;

  const key = buffer.subarray(offset, offset + keyLength).toString('utf-8');

  return {
    type: MessageType.GET_REQUEST,
    requestId,
    key,
  };
}

function decodeGetResponse(buffer: Buffer): Message {
  let offset = 1;

  const requestId = buffer.readUInt32BE(offset);
  offset += 4;

  const status = buffer.readUInt8(offset) as StatusCode;
  offset += 1;

  const valueLength = buffer.readUInt32BE(offset);
  offset += 4;

  const value = valueLength > 0
    ? buffer.subarray(offset, offset + valueLength)
    : undefined;

  return {
    type: MessageType.GET_RESPONSE,
    requestId,
    status,
    value,
  };
}

function decodeSetRequest(buffer: Buffer): Message {
  let offset = 1;

  const requestId = buffer.readUInt32BE(offset);
  offset += 4;

  const keyLength = buffer.readUInt16BE(offset);
  offset += 2;

  const key = buffer.subarray(offset, offset + keyLength).toString('utf-8');
  offset += keyLength;

  const ttlSeconds = buffer.readUInt32BE(offset);
  offset += 4;

  const valueLength = buffer.readUInt32BE(offset);
  offset += 4;

  const value = buffer.subarray(offset, offset + valueLength);

  return {
    type: MessageType.SET_REQUEST,
    requestId,
    key,
    value,
    ttlSeconds: ttlSeconds || undefined,
  };
}

function decodeSetResponse(buffer: Buffer): Message {
  return {
    type: MessageType.SET_RESPONSE,
    requestId: buffer.readUInt32BE(1),
    status: buffer.readUInt8(5) as StatusCode,
  };
}
```

## TCP Server Implementation

The server listens for connections, parses incoming messages, and sends responses.

```typescript
// server.ts
import * as net from 'net';
import { MessageParser, frameMessage } from './framing/lengthPrefixed';
import { decodeMessage } from './protocol/decoder';
import { encodeMessage } from './protocol/encoder';
import { MessageType, StatusCode } from './protocol/types';

// Simple in-memory storage
const storage = new Map<string, { value: Buffer; expiresAt?: number }>();

function handleMessage(payload: Buffer, socket: net.Socket): void {
  const message = decodeMessage(payload);

  switch (message.type) {
    case MessageType.GET_REQUEST: {
      const entry = storage.get(message.key);
      let response;

      if (!entry || (entry.expiresAt && Date.now() > entry.expiresAt)) {
        // Key not found or expired
        response = encodeMessage({
          type: MessageType.GET_RESPONSE,
          requestId: message.requestId,
          status: StatusCode.NOT_FOUND,
        });
      } else {
        response = encodeMessage({
          type: MessageType.GET_RESPONSE,
          requestId: message.requestId,
          status: StatusCode.OK,
          value: entry.value,
        });
      }

      socket.write(frameMessage(response));
      break;
    }

    case MessageType.SET_REQUEST: {
      const expiresAt = message.ttlSeconds
        ? Date.now() + message.ttlSeconds * 1000
        : undefined;

      storage.set(message.key, {
        value: message.value,
        expiresAt,
      });

      const response = encodeMessage({
        type: MessageType.SET_RESPONSE,
        requestId: message.requestId,
        status: StatusCode.OK,
      });

      socket.write(frameMessage(response));
      break;
    }
  }
}

const server = net.createServer((socket) => {
  console.log('Client connected:', socket.remoteAddress);

  const parser = new MessageParser((payload) => {
    try {
      handleMessage(payload, socket);
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  socket.on('data', (data) => {
    parser.feed(data);
  });

  socket.on('close', () => {
    console.log('Client disconnected');
    parser.reset();
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

server.listen(9000, () => {
  console.log('Binary protocol server listening on port 9000');
});
```

## TCP Client Implementation

The client connects to the server and provides a Promise-based API for sending requests.

```typescript
// client.ts
import * as net from 'net';
import { MessageParser, frameMessage } from './framing/lengthPrefixed';
import { decodeMessage } from './protocol/decoder';
import { encodeMessage } from './protocol/encoder';
import { Message, MessageType, StatusCode } from './protocol/types';

class BinaryProtocolClient {
  private socket: net.Socket;
  private parser: MessageParser;
  private pendingRequests: Map<number, {
    resolve: (msg: Message) => void;
    reject: (err: Error) => void;
  }> = new Map();
  private nextRequestId = 1;
  private connected = false;

  constructor() {
    this.socket = new net.Socket();

    // Handle incoming responses
    this.parser = new MessageParser((payload) => {
      const message = decodeMessage(payload);
      const requestId = (message as any).requestId;

      const pending = this.pendingRequests.get(requestId);
      if (pending) {
        this.pendingRequests.delete(requestId);
        pending.resolve(message);
      }
    });

    this.socket.on('data', (data) => {
      this.parser.feed(data);
    });

    this.socket.on('close', () => {
      this.connected = false;
      // Reject all pending requests
      for (const [, pending] of this.pendingRequests) {
        pending.reject(new Error('Connection closed'));
      }
      this.pendingRequests.clear();
    });

    this.socket.on('error', (error) => {
      console.error('Client socket error:', error);
    });
  }

  connect(host: string, port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.connect(port, host, () => {
        this.connected = true;
        resolve();
      });

      this.socket.once('error', reject);
    });
  }

  // Send a request and wait for the response
  private sendRequest(message: Message): Promise<Message> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected'));
        return;
      }

      const requestId = (message as any).requestId;
      this.pendingRequests.set(requestId, { resolve, reject });

      const encoded = encodeMessage(message);
      const framed = frameMessage(encoded);
      this.socket.write(framed);

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 5000);
    });
  }

  // High-level API methods
  async get(key: string): Promise<Buffer | null> {
    const response = await this.sendRequest({
      type: MessageType.GET_REQUEST,
      requestId: this.nextRequestId++,
      key,
    });

    if (response.type === MessageType.GET_RESPONSE) {
      if (response.status === StatusCode.OK && response.value) {
        return response.value;
      }
      return null;
    }

    throw new Error('Unexpected response type');
  }

  async set(key: string, value: Buffer, ttlSeconds?: number): Promise<boolean> {
    const response = await this.sendRequest({
      type: MessageType.SET_REQUEST,
      requestId: this.nextRequestId++,
      key,
      value,
      ttlSeconds,
    });

    if (response.type === MessageType.SET_RESPONSE) {
      return response.status === StatusCode.OK;
    }

    throw new Error('Unexpected response type');
  }

  close(): void {
    this.socket.end();
  }
}

// Usage example
async function main() {
  const client = new BinaryProtocolClient();
  await client.connect('localhost', 9000);

  // Store a value
  await client.set('user:123', Buffer.from('{"name":"Alice"}'));
  console.log('Value stored');

  // Retrieve the value
  const value = await client.get('user:123');
  if (value) {
    console.log('Retrieved:', value.toString());
  }

  // Try to get non-existent key
  const missing = await client.get('user:999');
  console.log('Missing key result:', missing);

  client.close();
}

main().catch(console.error);
```

## Handling Edge Cases

Production implementations need to handle connection drops, malformed data, and backpressure:

```typescript
// Connection management with automatic reconnection
class ResilientClient {
  private client: BinaryProtocolClient | null = null;
  private reconnecting = false;
  private host: string;
  private port: number;

  constructor(host: string, port: number) {
    this.host = host;
    this.port = port;
  }

  async ensureConnected(): Promise<BinaryProtocolClient> {
    if (this.client) {
      return this.client;
    }

    if (this.reconnecting) {
      // Wait for reconnection in progress
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.ensureConnected();
    }

    this.reconnecting = true;
    try {
      this.client = new BinaryProtocolClient();
      await this.client.connect(this.host, this.port);
      console.log('Connected to server');
      return this.client;
    } finally {
      this.reconnecting = false;
    }
  }

  async get(key: string): Promise<Buffer | null> {
    const client = await this.ensureConnected();
    try {
      return await client.get(key);
    } catch (error) {
      this.client = null; // Force reconnection on next call
      throw error;
    }
  }
}
```

## Summary

Building binary protocols in Node.js requires understanding:

| Concept | Purpose |
|---------|---------|
| **Message framing** | Preserve message boundaries over TCP streams |
| **Buffer manipulation** | Read and write binary data with correct byte order |
| **Protocol definition** | Define message types and field layouts |
| **Async request/response** | Match responses to pending requests by ID |

Binary protocols offer significant performance benefits when you need low latency or compact messages. The patterns shown here apply to implementing clients for databases, game servers, IoT devices, and any system using custom binary formats.
