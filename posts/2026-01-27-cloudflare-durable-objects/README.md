# How to Implement Cloudflare Durable Objects

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cloudflare, Durable Objects, Edge Computing, Serverless, Workers, WebSocket, TypeScript, Distributed Systems

Description: Learn how to implement Cloudflare Durable Objects for stateful serverless applications at the edge, including storage APIs, alarms, WebSocket support, and coordination patterns.

---

> Durable Objects provide a unique programming model that combines the benefits of serverless with the simplicity of traditional stateful applications. Each object is a single-threaded, globally unique instance that maintains state and handles requests sequentially, eliminating the complexity of distributed coordination.

## What Are Durable Objects?

Durable Objects are Cloudflare's solution for stateful serverless computing. Unlike traditional serverless functions that are stateless and ephemeral, Durable Objects provide:

- **Strong consistency**: Each object processes requests sequentially, eliminating race conditions
- **Global uniqueness**: Only one instance of an object with a given ID exists worldwide
- **Durable storage**: Persistent key-value storage that survives restarts
- **Edge deployment**: Objects run close to users for low latency
- **Automatic scaling**: Cloudflare manages object lifecycle and placement

Common use cases include:

- Real-time collaboration (documents, whiteboards)
- Chat rooms and multiplayer games
- Rate limiting and counters
- Session management
- Distributed locks and coordination

## Creating a Durable Object Class

A Durable Object is a JavaScript/TypeScript class that Cloudflare instantiates on demand. Each instance has its own storage and handles requests one at a time.

```typescript
// src/counter.ts
// A simple counter Durable Object demonstrating the basic structure

export interface Env {
  // Binding to access this Durable Object from Workers
  COUNTER: DurableObjectNamespace;
}

export class Counter {
  // The state object provides access to storage and the object's ID
  private state: DurableObjectState;

  // In-memory cache of the counter value for fast access
  private value: number = 0;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;

    // blockConcurrencyWhile ensures initialization completes before
    // any fetch() calls are processed - critical for loading state
    this.state.blockConcurrencyWhile(async () => {
      // Load persisted value from storage, default to 0 if not found
      const stored = await this.state.storage.get<number>('value');
      this.value = stored ?? 0;
    });
  }

  // fetch() handles all incoming HTTP requests to this object
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/increment':
        // Increment and persist the new value
        this.value++;
        await this.state.storage.put('value', this.value);
        return new Response(JSON.stringify({ value: this.value }), {
          headers: { 'Content-Type': 'application/json' },
        });

      case '/decrement':
        this.value--;
        await this.state.storage.put('value', this.value);
        return new Response(JSON.stringify({ value: this.value }), {
          headers: { 'Content-Type': 'application/json' },
        });

      case '/value':
        // Read-only access to current value
        return new Response(JSON.stringify({ value: this.value }), {
          headers: { 'Content-Type': 'application/json' },
        });

      default:
        return new Response('Not Found', { status: 404 });
    }
  }
}
```

### Configuring wrangler.toml

Configure your Durable Object in the Wrangler configuration file:

```toml
# wrangler.toml
name = "my-durable-objects-app"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# Define Durable Object bindings
[durable_objects]
bindings = [
  { name = "COUNTER", class_name = "Counter" }
]

# Specify which classes are Durable Objects for migration tracking
[[migrations]]
tag = "v1"
new_classes = ["Counter"]
```

### Accessing Durable Objects from a Worker

Workers act as the entry point, routing requests to the appropriate Durable Object instance:

```typescript
// src/index.ts
// Worker that routes requests to Durable Object instances

import { Counter } from './counter';

export interface Env {
  COUNTER: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Extract counter name from URL path: /counter/:name/*
    const match = url.pathname.match(/^\/counter\/([^\/]+)(\/.*)?$/);
    if (!match) {
      return new Response('Usage: /counter/:name/:action', { status: 400 });
    }

    const counterName = match[1];
    const action = match[2] || '/value';

    // Create a stable ID from the counter name
    // Objects with the same ID always resolve to the same instance
    const id = env.COUNTER.idFromName(counterName);

    // Get a stub (handle) to communicate with the object
    const stub = env.COUNTER.get(id);

    // Forward the request to the Durable Object
    // The object may be created on-demand if it doesn't exist
    return stub.fetch(new Request(url.origin + action, request));
  },
};

// Export the Durable Object class so Cloudflare can instantiate it
export { Counter };
```

## Storage API

Durable Objects provide a transactional key-value storage API with strong consistency guarantees.

### Basic Operations

```typescript
// Storage API examples within a Durable Object

export class StorageDemo {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const storage = this.state.storage;

    // PUT: Store a single value
    // Values can be any serializable JavaScript type
    await storage.put('user:123', {
      name: 'Alice',
      email: 'alice@example.com',
      createdAt: new Date().toISOString(),
    });

    // PUT Multiple: Store many values atomically
    // Either all succeed or none do
    await storage.put({
      'user:124': { name: 'Bob', email: 'bob@example.com' },
      'user:125': { name: 'Carol', email: 'carol@example.com' },
      'meta:lastUpdate': Date.now(),
    });

    // GET: Retrieve a single value
    const user = await storage.get<{ name: string; email: string }>('user:123');

    // GET Multiple: Retrieve several values at once
    const users = await storage.get(['user:123', 'user:124', 'user:125']);
    // Returns: Map { 'user:123' => {...}, 'user:124' => {...}, ... }

    // LIST: Retrieve values by prefix with pagination
    // Useful for scanning related keys
    const allUsers = await storage.list({
      prefix: 'user:',    // Only keys starting with 'user:'
      limit: 100,         // Maximum 100 results
      // start: 'user:100', // Optional: start after this key
      // end: 'user:200',   // Optional: stop before this key
    });

    // DELETE: Remove a single key
    await storage.delete('user:125');

    // DELETE Multiple: Remove several keys atomically
    await storage.delete(['user:123', 'user:124']);

    // DELETE by prefix: Remove all matching keys
    // Returns the number of keys deleted
    const deletedCount = await storage.deleteAll();

    return new Response(JSON.stringify({
      user,
      userCount: allUsers.size,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
```

### Transactions

For operations that must be atomic, use the transaction API:

```typescript
// Transaction example: Transfer funds between accounts

export class BankAccount {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async transfer(fromId: string, toId: string, amount: number): Promise<boolean> {
    // Use a transaction to ensure both operations succeed or fail together
    // This prevents partial updates that could lose or duplicate money
    const result = await this.state.storage.transaction(async (txn) => {
      // Read both balances within the transaction
      const fromBalance = await txn.get<number>(`balance:${fromId}`) ?? 0;
      const toBalance = await txn.get<number>(`balance:${toId}`) ?? 0;

      // Validate the transfer
      if (fromBalance < amount) {
        // Returning without writing rolls back the transaction
        return { success: false, error: 'Insufficient funds' };
      }

      // Write new balances - these are buffered until transaction completes
      await txn.put(`balance:${fromId}`, fromBalance - amount);
      await txn.put(`balance:${toId}`, toBalance + amount);

      // Log the transaction for audit trail
      const txnId = crypto.randomUUID();
      await txn.put(`txn:${txnId}`, {
        from: fromId,
        to: toId,
        amount,
        timestamp: Date.now(),
      });

      return { success: true, transactionId: txnId };
    });

    return result.success;
  }
}
```

## Alarms

Alarms allow Durable Objects to schedule future execution without external triggers. They are perfect for timeouts, delayed processing, and periodic tasks.

```typescript
// Alarm example: Session expiration and cleanup

export class Session {
  private state: DurableObjectState;
  private env: Env;

  // Session timeout: 30 minutes of inactivity
  private static SESSION_TIMEOUT_MS = 30 * 60 * 1000;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/activity':
        // User activity detected - refresh the session
        await this.refreshSession();
        return new Response('Session refreshed');

      case '/data':
        // Get session data
        const data = await this.state.storage.get('sessionData');
        if (!data) {
          return new Response('Session expired', { status: 401 });
        }
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' },
        });

      case '/login':
        // Create new session
        const body = await request.json() as { userId: string };
        await this.createSession(body.userId);
        return new Response('Session created');

      default:
        return new Response('Not Found', { status: 404 });
    }
  }

  private async createSession(userId: string): Promise<void> {
    // Store session data
    await this.state.storage.put('sessionData', {
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    });

    // Schedule expiration alarm
    await this.scheduleExpiration();
  }

  private async refreshSession(): Promise<void> {
    const data = await this.state.storage.get<{
      userId: string;
      createdAt: number;
      lastActivity: number;
    }>('sessionData');

    if (data) {
      // Update last activity timestamp
      data.lastActivity = Date.now();
      await this.state.storage.put('sessionData', data);

      // Reschedule the expiration alarm
      await this.scheduleExpiration();
    }
  }

  private async scheduleExpiration(): Promise<void> {
    // setAlarm schedules the alarm() method to be called
    // Only one alarm can be scheduled at a time per object
    // Setting a new alarm cancels any existing alarm
    const alarmTime = Date.now() + Session.SESSION_TIMEOUT_MS;
    await this.state.storage.setAlarm(alarmTime);
  }

  // This method is called when the alarm fires
  async alarm(): Promise<void> {
    const data = await this.state.storage.get<{
      userId: string;
      lastActivity: number;
    }>('sessionData');

    if (!data) {
      // Session already deleted
      return;
    }

    const timeSinceActivity = Date.now() - data.lastActivity;

    if (timeSinceActivity >= Session.SESSION_TIMEOUT_MS) {
      // Session has expired - clean up
      console.log(`Session expired for user ${data.userId}`);
      await this.state.storage.deleteAll();
    } else {
      // Activity occurred since alarm was set - reschedule
      const remainingTime = Session.SESSION_TIMEOUT_MS - timeSinceActivity;
      await this.state.storage.setAlarm(Date.now() + remainingTime);
    }
  }
}
```

### Periodic Tasks with Alarms

```typescript
// Periodic task example: Aggregate metrics every minute

export class MetricsAggregator {
  private state: DurableObjectState;

  // How often to aggregate (1 minute)
  private static AGGREGATION_INTERVAL_MS = 60 * 1000;

  constructor(state: DurableObjectState) {
    this.state = state;

    // Schedule first alarm on construction if not already set
    this.state.blockConcurrencyWhile(async () => {
      const existingAlarm = await this.state.storage.getAlarm();
      if (!existingAlarm) {
        await this.state.storage.setAlarm(
          Date.now() + MetricsAggregator.AGGREGATION_INTERVAL_MS
        );
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    // Record a metric data point
    const body = await request.json() as { metric: string; value: number };

    // Store with timestamp key for later aggregation
    const key = `raw:${body.metric}:${Date.now()}`;
    await this.state.storage.put(key, body.value);

    return new Response('Recorded');
  }

  async alarm(): Promise<void> {
    // Aggregate all raw metrics
    const rawMetrics = await this.state.storage.list({ prefix: 'raw:' });

    // Group by metric name
    const aggregated = new Map<string, number[]>();
    for (const [key, value] of rawMetrics) {
      // Key format: raw:metricName:timestamp
      const metricName = key.split(':')[1];
      if (!aggregated.has(metricName)) {
        aggregated.set(metricName, []);
      }
      aggregated.get(metricName)!.push(value as number);
    }

    // Calculate aggregates and store
    const timestamp = Date.now();
    for (const [metric, values] of aggregated) {
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);

      await this.state.storage.put(`agg:${metric}:${timestamp}`, {
        count: values.length,
        sum,
        avg,
        min,
        max,
      });
    }

    // Delete raw metrics that were aggregated
    await this.state.storage.delete([...rawMetrics.keys()]);

    // Schedule next aggregation
    await this.state.storage.setAlarm(
      Date.now() + MetricsAggregator.AGGREGATION_INTERVAL_MS
    );
  }
}
```

## WebSocket Support

Durable Objects can accept WebSocket connections, making them ideal for real-time applications. The Hibernation API allows objects to sleep while maintaining connections, reducing costs.

```typescript
// WebSocket chat room example with Hibernation API

interface ChatMessage {
  type: 'message' | 'join' | 'leave';
  username: string;
  content?: string;
  timestamp: number;
}

export class ChatRoom {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle WebSocket upgrade request
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    // HTTP endpoints for room management
    switch (url.pathname) {
      case '/history':
        // Return recent message history
        const messages = await this.state.storage.list<ChatMessage>({
          prefix: 'msg:',
          limit: 50,
          reverse: true, // Most recent first
        });
        return new Response(JSON.stringify([...messages.values()]), {
          headers: { 'Content-Type': 'application/json' },
        });

      case '/users':
        // Return list of connected users using Hibernation API
        const sockets = this.state.getWebSockets();
        const users = sockets
          .map(ws => ws.deserializeAttachment() as { username: string })
          .filter(Boolean)
          .map(attachment => attachment.username);
        return new Response(JSON.stringify(users), {
          headers: { 'Content-Type': 'application/json' },
        });

      default:
        return new Response('Not Found', { status: 404 });
    }
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    // Parse username from query string
    const url = new URL(request.url);
    const username = url.searchParams.get('username');
    if (!username) {
      return new Response('Username required', { status: 400 });
    }

    // Create WebSocket pair - one for client, one for server
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the WebSocket connection with Hibernation API
    // This allows the object to hibernate while maintaining the connection
    this.state.acceptWebSocket(server);

    // Attach metadata to the WebSocket for later retrieval
    // This data persists across hibernation
    server.serializeAttachment({ username, joinedAt: Date.now() });

    // Broadcast join notification to other users
    const joinMessage: ChatMessage = {
      type: 'join',
      username,
      timestamp: Date.now(),
    };
    this.broadcast(joinMessage, server);

    // Return the client side of the WebSocket pair
    return new Response(null, { status: 101, webSocket: client });
  }

  // Called when a WebSocket receives a message
  // This is part of the Hibernation API
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const attachment = ws.deserializeAttachment() as { username: string };
    if (!attachment) return;

    // Parse and validate the message
    let parsed: { content: string };
    try {
      parsed = JSON.parse(message as string);
    } catch {
      ws.send(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }

    // Create chat message
    const chatMessage: ChatMessage = {
      type: 'message',
      username: attachment.username,
      content: parsed.content,
      timestamp: Date.now(),
    };

    // Persist message to storage
    await this.state.storage.put(`msg:${chatMessage.timestamp}`, chatMessage);

    // Broadcast to all connected clients including sender
    this.broadcast(chatMessage);
  }

  // Called when a WebSocket connection closes
  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    const attachment = ws.deserializeAttachment() as { username: string };
    if (!attachment) return;

    // Broadcast leave notification
    const leaveMessage: ChatMessage = {
      type: 'leave',
      username: attachment.username,
      timestamp: Date.now(),
    };
    this.broadcast(leaveMessage);
  }

  // Called when a WebSocket connection errors
  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error('WebSocket error:', error);
    ws.close(1011, 'Internal error');
  }

  // Broadcast a message to all connected WebSockets
  private broadcast(message: ChatMessage, exclude?: WebSocket): void {
    const payload = JSON.stringify(message);

    // getWebSockets() returns all accepted WebSockets (Hibernation API)
    for (const ws of this.state.getWebSockets()) {
      if (ws !== exclude && ws.readyState === WebSocket.READY_STATE_OPEN) {
        ws.send(payload);
      }
    }
  }
}
```

### Client-Side WebSocket Connection

```typescript
// Client-side WebSocket connection to a Durable Object chat room

class ChatClient {
  private ws: WebSocket | null = null;
  private roomId: string;
  private username: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(roomId: string, username: string) {
    this.roomId = roomId;
    this.username = username;
  }

  connect(): void {
    // Connect to the chat room Durable Object
    const url = `wss://your-worker.your-subdomain.workers.dev/room/${this.roomId}/websocket?username=${encodeURIComponent(this.username)}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('Connected to chat room');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onclose = (event) => {
      console.log(`Disconnected: ${event.code} ${event.reason}`);
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private handleMessage(message: ChatMessage): void {
    switch (message.type) {
      case 'message':
        console.log(`${message.username}: ${message.content}`);
        break;
      case 'join':
        console.log(`${message.username} joined the room`);
        break;
      case 'leave':
        console.log(`${message.username} left the room`);
        break;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connect(), delay);
  }

  send(content: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ content }));
    }
  }

  disconnect(): void {
    this.maxReconnectAttempts = 0; // Prevent reconnection
    this.ws?.close(1000, 'User disconnected');
  }
}
```

## Coordination Patterns

Durable Objects excel at coordination patterns that are difficult in distributed systems.

### Distributed Lock

```typescript
// Distributed lock implementation using a Durable Object

interface LockState {
  holder: string | null;
  acquiredAt: number | null;
  expiresAt: number | null;
}

export class DistributedLock {
  private state: DurableObjectState;
  private lock: LockState = { holder: null, acquiredAt: null, expiresAt: null };

  // Default lock timeout prevents deadlocks from crashed clients
  private static DEFAULT_TTL_MS = 30 * 1000;

  constructor(state: DurableObjectState) {
    this.state = state;

    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get<LockState>('lock');
      if (stored) {
        this.lock = stored;
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const clientId = url.searchParams.get('clientId');

    if (!clientId) {
      return new Response('clientId required', { status: 400 });
    }

    switch (url.pathname) {
      case '/acquire':
        return this.acquire(clientId);

      case '/release':
        return this.release(clientId);

      case '/extend':
        return this.extend(clientId);

      case '/status':
        return new Response(JSON.stringify({
          locked: this.isLocked(),
          holder: this.lock.holder,
          expiresAt: this.lock.expiresAt,
        }), {
          headers: { 'Content-Type': 'application/json' },
        });

      default:
        return new Response('Not Found', { status: 404 });
    }
  }

  private isLocked(): boolean {
    // Lock is valid if it exists and hasn't expired
    return this.lock.holder !== null &&
           this.lock.expiresAt !== null &&
           this.lock.expiresAt > Date.now();
  }

  private async acquire(clientId: string): Promise<Response> {
    // Check if lock is already held by someone else
    if (this.isLocked() && this.lock.holder !== clientId) {
      return new Response(JSON.stringify({
        acquired: false,
        holder: this.lock.holder,
        expiresAt: this.lock.expiresAt,
      }), {
        status: 409, // Conflict
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Acquire or re-acquire the lock
    const now = Date.now();
    this.lock = {
      holder: clientId,
      acquiredAt: now,
      expiresAt: now + DistributedLock.DEFAULT_TTL_MS,
    };

    await this.state.storage.put('lock', this.lock);

    // Schedule alarm to clean up expired lock
    await this.state.storage.setAlarm(this.lock.expiresAt);

    return new Response(JSON.stringify({
      acquired: true,
      expiresAt: this.lock.expiresAt,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async release(clientId: string): Promise<Response> {
    // Only the lock holder can release
    if (this.lock.holder !== clientId) {
      return new Response(JSON.stringify({
        released: false,
        error: 'Not lock holder',
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    this.lock = { holder: null, acquiredAt: null, expiresAt: null };
    await this.state.storage.put('lock', this.lock);
    await this.state.storage.deleteAlarm();

    return new Response(JSON.stringify({ released: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async extend(clientId: string): Promise<Response> {
    if (this.lock.holder !== clientId) {
      return new Response(JSON.stringify({
        extended: false,
        error: 'Not lock holder',
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Extend the lock TTL
    this.lock.expiresAt = Date.now() + DistributedLock.DEFAULT_TTL_MS;
    await this.state.storage.put('lock', this.lock);
    await this.state.storage.setAlarm(this.lock.expiresAt);

    return new Response(JSON.stringify({
      extended: true,
      expiresAt: this.lock.expiresAt,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async alarm(): Promise<void> {
    // Clean up expired lock
    if (this.lock.expiresAt && this.lock.expiresAt <= Date.now()) {
      console.log(`Lock expired for client ${this.lock.holder}`);
      this.lock = { holder: null, acquiredAt: null, expiresAt: null };
      await this.state.storage.put('lock', this.lock);
    }
  }
}
```

### Rate Limiter

```typescript
// Sliding window rate limiter using a Durable Object

interface RateLimitConfig {
  maxRequests: number;  // Maximum requests allowed
  windowMs: number;     // Time window in milliseconds
}

export class RateLimiter {
  private state: DurableObjectState;
  private config: RateLimitConfig = {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  };

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/check':
        return this.checkLimit();

      case '/configure':
        const body = await request.json() as Partial<RateLimitConfig>;
        if (body.maxRequests) this.config.maxRequests = body.maxRequests;
        if (body.windowMs) this.config.windowMs = body.windowMs;
        return new Response(JSON.stringify(this.config), {
          headers: { 'Content-Type': 'application/json' },
        });

      default:
        return new Response('Not Found', { status: 404 });
    }
  }

  private async checkLimit(): Promise<Response> {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get all requests within the window
    const requests = await this.state.storage.list<number>({
      prefix: 'req:',
    });

    // Count requests still within the window and clean up old ones
    let validCount = 0;
    const toDelete: string[] = [];

    for (const [key, timestamp] of requests) {
      if (timestamp < windowStart) {
        // Request is outside the window - mark for deletion
        toDelete.push(key);
      } else {
        validCount++;
      }
    }

    // Clean up old entries
    if (toDelete.length > 0) {
      await this.state.storage.delete(toDelete);
    }

    // Check if limit exceeded
    if (validCount >= this.config.maxRequests) {
      // Find the oldest request to calculate reset time
      const oldestInWindow = Math.min(
        ...Array.from(requests.values()).filter(t => t >= windowStart)
      );
      const resetAt = oldestInWindow + this.config.windowMs;

      return new Response(JSON.stringify({
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil((resetAt - now) / 1000),
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((resetAt - now) / 1000)),
          'X-RateLimit-Limit': String(this.config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
        },
      });
    }

    // Record this request
    await this.state.storage.put(`req:${now}:${crypto.randomUUID()}`, now);

    const remaining = this.config.maxRequests - validCount - 1;

    return new Response(JSON.stringify({
      allowed: true,
      remaining,
      limit: this.config.maxRequests,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(this.config.maxRequests),
        'X-RateLimit-Remaining': String(remaining),
      },
    });
  }
}
```

## Billing Considerations

Understanding Durable Objects billing helps optimize costs:

| Resource | Free Tier | Paid Plan |
|----------|-----------|-----------|
| Requests | 1M/month | $0.15/million |
| Duration | 400K GB-s/month | $12.50/million GB-s |
| Storage | 1 GB | $0.20/GB-month |
| Storage reads | 1M/month | $0.20/million |
| Storage writes | 1M/month | $1.00/million |

### Cost Optimization Tips

```typescript
// Cost optimization patterns

export class OptimizedDurableObject {
  private state: DurableObjectState;

  // In-memory cache to reduce storage reads
  private cache: Map<string, { value: unknown; cachedAt: number }> = new Map();
  private cacheTtlMs = 60 * 1000; // 1 minute cache TTL

  // Batch writes to reduce storage operations
  private pendingWrites: Map<string, unknown> = new Map();
  private flushTimeout: number | null = null;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  // Cached read - reduces storage read operations
  private async cachedGet<T>(key: string): Promise<T | undefined> {
    const cached = this.cache.get(key);

    // Return cached value if still valid
    if (cached && Date.now() - cached.cachedAt < this.cacheTtlMs) {
      return cached.value as T;
    }

    // Fetch from storage and cache
    const value = await this.state.storage.get<T>(key);
    if (value !== undefined) {
      this.cache.set(key, { value, cachedAt: Date.now() });
    }

    return value;
  }

  // Batched write - combines multiple writes into one operation
  private async batchedPut(key: string, value: unknown): Promise<void> {
    this.pendingWrites.set(key, value);

    // Update cache immediately for read-your-writes consistency
    this.cache.set(key, { value, cachedAt: Date.now() });

    // Debounce the flush operation
    if (this.flushTimeout === null) {
      this.flushTimeout = setTimeout(() => this.flush(), 100) as unknown as number;
    }
  }

  private async flush(): Promise<void> {
    this.flushTimeout = null;

    if (this.pendingWrites.size === 0) return;

    // Write all pending changes in a single operation
    const writes = Object.fromEntries(this.pendingWrites);
    this.pendingWrites.clear();

    await this.state.storage.put(writes);
  }

  // Use Hibernation API for WebSockets to reduce duration billing
  // Objects hibernate when only WebSocket connections are active
  // This significantly reduces GB-s charges for long-lived connections

  async fetch(request: Request): Promise<Response> {
    // Ensure pending writes are flushed before responding
    await this.flush();

    // ... handle request
    return new Response('OK');
  }
}
```

## Best Practices Summary

1. **Use blockConcurrencyWhile for initialization**: Load critical state before processing any requests to ensure consistency.

2. **Leverage in-memory caching**: Durable Objects persist between requests. Cache frequently accessed data in instance variables to reduce storage reads.

3. **Batch storage operations**: Use multi-key put() and get() operations instead of individual calls to reduce costs and latency.

4. **Use the Hibernation API for WebSockets**: This allows objects to sleep while maintaining connections, significantly reducing duration charges.

5. **Set appropriate alarm timeouts**: Use alarms for session expiration, lock cleanup, and periodic tasks instead of external cron jobs.

6. **Design for single-threaded execution**: Requests are processed sequentially. Keep request handlers fast to avoid queuing delays.

7. **Use stable IDs**: Use idFromName() for human-readable identifiers. The ID determines which data center runs the object.

8. **Handle object migration**: Objects may move between data centers. Never store data center-specific information.

9. **Implement graceful degradation**: Handle storage failures and implement retry logic for critical operations.

10. **Monitor costs**: Track storage operations and duration. Optimize hot paths that generate many requests.

For production applications requiring reliable monitoring of your edge infrastructure, including Durable Objects, consider [OneUptime](https://oneuptime.com). OneUptime provides comprehensive observability for distributed systems with real-time alerting, performance monitoring, and incident management designed for modern edge computing architectures.
