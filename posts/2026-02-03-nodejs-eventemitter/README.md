# How to Build Event-Driven Systems with EventEmitter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, EventEmitter, Events, Architecture, Decoupling

Description: Learn how to build event-driven systems in Node.js with EventEmitter. This guide covers event patterns, custom emitters, error handling, and real-world applications.

---

Event-driven architecture is a design pattern where components communicate by emitting and listening to events. Instead of direct function calls that create tight coupling, events allow loose coupling where producers and consumers operate independently. Node.js provides the `EventEmitter` class as the foundation for this pattern.

## Why Event-Driven Architecture?

| Traditional Approach | Event-Driven Approach |
|---------------------|----------------------|
| Direct function calls | Emit events, listeners respond |
| Tight coupling between modules | Loose coupling via events |
| Caller waits for completion | Fire and forget (async) |
| Hard to extend behavior | Easy to add new listeners |
| Testing requires mocking dependencies | Testing focuses on events emitted |

## EventEmitter Basics

The `EventEmitter` class from the `events` module provides methods to emit events and register listeners. Understanding these core methods is essential for building event-driven systems.

```javascript
const EventEmitter = require('events');

// Create an emitter instance
const emitter = new EventEmitter();

// Register a listener for the 'message' event
// Listeners are called in the order they are registered
emitter.on('message', (data) => {
  console.log('Received message:', data);
});

// Emit the 'message' event with data
// All registered listeners are called synchronously
emitter.emit('message', { text: 'Hello, World!' });

// Output: Received message: { text: 'Hello, World!' }
```

### Core EventEmitter Methods

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

// on() - Register a persistent listener
// Called every time the event is emitted
emitter.on('data', (chunk) => {
  console.log('Received chunk:', chunk);
});

// once() - Register a one-time listener
// Automatically removed after first invocation
emitter.once('connected', () => {
  console.log('Connection established');
});

// emit() - Trigger an event with optional arguments
// Returns true if the event had listeners, false otherwise
const hadListeners = emitter.emit('data', 'chunk-1');
console.log('Had listeners:', hadListeners); // true

// off() / removeListener() - Remove a specific listener
// Must pass the same function reference
function handler(data) {
  console.log('Handler:', data);
}
emitter.on('event', handler);
emitter.off('event', handler);

// removeAllListeners() - Remove all listeners for an event
// Or all listeners if no event name provided
emitter.removeAllListeners('data');

// listenerCount() - Get the number of listeners for an event
const count = emitter.listenerCount('connected');
console.log('Listener count:', count);

// eventNames() - Get array of event names with registered listeners
const events = emitter.eventNames();
console.log('Registered events:', events);
```

### Event Arguments

Events can pass multiple arguments to listeners. This allows rich data transfer between emitters and listeners.

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

// Listener receives all arguments passed to emit()
emitter.on('request', (method, path, headers) => {
  console.log(`${method} ${path}`);
  console.log('Headers:', headers);
});

// Emit with multiple arguments
emitter.emit('request', 'GET', '/api/users', {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer token123',
});

// Alternative: Pass a single object for named parameters
emitter.on('request-v2', ({ method, path, headers }) => {
  console.log(`${method} ${path}`);
});

emitter.emit('request-v2', {
  method: 'POST',
  path: '/api/orders',
  headers: { 'Content-Type': 'application/json' },
});
```

## Creating Custom EventEmitters

The real power of EventEmitter comes from extending it in your own classes. This creates domain-specific emitters that encapsulate business logic while exposing a clean event-based API.

### Basic Class Extension

```javascript
const EventEmitter = require('events');

// OrderProcessor emits events as orders move through stages
// Consumers can listen without knowing implementation details
class OrderProcessor extends EventEmitter {
  constructor() {
    super();
    this.orders = new Map();
  }

  // Process an order and emit events at each stage
  async processOrder(order) {
    const orderId = order.id;

    // Emit event when order processing starts
    this.emit('order:received', { orderId, order });

    try {
      // Validate the order
      await this.validateOrder(order);
      this.emit('order:validated', { orderId });

      // Process payment
      const payment = await this.processPayment(order);
      this.emit('order:paid', { orderId, payment });

      // Fulfill the order
      const shipment = await this.fulfillOrder(order);
      this.emit('order:shipped', { orderId, shipment });

      // Mark as complete
      this.orders.set(orderId, { status: 'completed', order, shipment });
      this.emit('order:completed', { orderId, order, shipment });

      return { success: true, orderId };
    } catch (error) {
      // Emit failure event with error details
      this.emit('order:failed', { orderId, error: error.message });
      throw error;
    }
  }

  async validateOrder(order) {
    // Validation logic
    if (!order.items || order.items.length === 0) {
      throw new Error('Order must have at least one item');
    }
    return true;
  }

  async processPayment(order) {
    // Payment processing logic
    return { transactionId: `txn_${Date.now()}`, amount: order.total };
  }

  async fulfillOrder(order) {
    // Fulfillment logic
    return { trackingNumber: `TRACK_${Date.now()}` };
  }
}

// Usage with multiple listeners
const processor = new OrderProcessor();

// Logging listener
processor.on('order:received', ({ orderId }) => {
  console.log(`[LOG] Order ${orderId} received`);
});

// Analytics listener
processor.on('order:completed', ({ orderId, order }) => {
  console.log(`[ANALYTICS] Order ${orderId} completed, total: $${order.total}`);
});

// Notification listener
processor.on('order:shipped', ({ orderId, shipment }) => {
  console.log(`[NOTIFY] Sending shipment notification for ${orderId}`);
  // Send email/SMS with tracking number
});

// Error monitoring listener
processor.on('order:failed', ({ orderId, error }) => {
  console.error(`[ALERT] Order ${orderId} failed: ${error}`);
  // Send alert to operations team
});

// Process an order
processor.processOrder({
  id: 'ORD-001',
  items: [{ sku: 'ITEM-1', quantity: 2 }],
  total: 99.99,
});
```

### Typed Events with Documentation

For better maintainability, document your events and their payloads clearly.

```javascript
const EventEmitter = require('events');

/**
 * UserService - Manages user lifecycle events
 *
 * Events:
 * - 'user:created' - { userId: string, email: string, createdAt: Date }
 * - 'user:updated' - { userId: string, changes: object, updatedAt: Date }
 * - 'user:deleted' - { userId: string, deletedAt: Date }
 * - 'user:login' - { userId: string, ip: string, userAgent: string }
 * - 'user:logout' - { userId: string }
 * - 'user:password-changed' - { userId: string }
 */
class UserService extends EventEmitter {
  constructor(database) {
    super();
    this.db = database;
  }

  async createUser(userData) {
    const user = await this.db.users.create(userData);

    // Emit with a well-defined payload structure
    this.emit('user:created', {
      userId: user.id,
      email: user.email,
      createdAt: new Date(),
    });

    return user;
  }

  async updateUser(userId, changes) {
    const user = await this.db.users.update(userId, changes);

    this.emit('user:updated', {
      userId,
      changes,
      updatedAt: new Date(),
    });

    return user;
  }

  async deleteUser(userId) {
    await this.db.users.delete(userId);

    this.emit('user:deleted', {
      userId,
      deletedAt: new Date(),
    });
  }

  async login(userId, context) {
    await this.db.sessions.create({ userId, ...context });

    this.emit('user:login', {
      userId,
      ip: context.ip,
      userAgent: context.userAgent,
    });
  }

  async changePassword(userId, newPasswordHash) {
    await this.db.users.update(userId, { passwordHash: newPasswordHash });

    this.emit('user:password-changed', { userId });
  }
}

// Consumers can subscribe to specific events
const userService = new UserService(database);

// Security audit logging
userService.on('user:login', ({ userId, ip, userAgent }) => {
  auditLog.record('login', { userId, ip, userAgent });
});

userService.on('user:password-changed', ({ userId }) => {
  auditLog.record('password-change', { userId });
  // Send security notification email
});

// Welcome email sender
userService.on('user:created', async ({ userId, email }) => {
  await emailService.sendWelcome(email);
});

// Analytics tracking
userService.on('user:created', ({ userId }) => {
  analytics.track('user_signup', { userId });
});
```

## Error Handling in EventEmitters

Error handling is critical in event-driven systems. Unhandled errors in listeners can crash your application. Node.js treats the 'error' event specially.

### The Special 'error' Event

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

// IMPORTANT: If no 'error' listener is registered, emitting 'error'
// throws the error and crashes the process
// emitter.emit('error', new Error('Unhandled!')); // This would crash!

// Always register an 'error' listener
emitter.on('error', (error) => {
  console.error('Emitter error:', error.message);
  // Handle error appropriately: log, report, recover
});

// Now 'error' events are handled safely
emitter.emit('error', new Error('Something went wrong'));
// Output: Emitter error: Something went wrong
```

### Safe Event Emission Patterns

```javascript
const EventEmitter = require('events');

class SafeEmitter extends EventEmitter {
  constructor() {
    super();

    // Always register a default error handler
    this.on('error', (error) => {
      console.error(`[SafeEmitter] Unhandled error: ${error.message}`);
    });
  }

  // Wrapper that catches listener errors
  safeEmit(event, ...args) {
    try {
      return this.emit(event, ...args);
    } catch (error) {
      // If a listener throws, emit an error event instead of crashing
      console.error(`Error in listener for '${event}':`, error);
      this.emit('error', error);
      return false;
    }
  }
}

// Using the safe emitter
const emitter = new SafeEmitter();

emitter.on('data', (data) => {
  // This listener throws an error
  throw new Error('Listener failed!');
});

// safeEmit catches the error instead of crashing
emitter.safeEmit('data', { value: 123 });
// Output: Error in listener for 'data': Error: Listener failed!
// Output: [SafeEmitter] Unhandled error: Listener failed!
```

### Async Error Handling

When listeners perform async operations, errors need special handling since they occur after emit() returns.

```javascript
const EventEmitter = require('events');

class AsyncSafeEmitter extends EventEmitter {
  constructor() {
    super();
    this.asyncListeners = new Map();
  }

  // Register an async listener
  onAsync(event, asyncHandler) {
    if (!this.asyncListeners.has(event)) {
      this.asyncListeners.set(event, []);
    }
    this.asyncListeners.get(event).push(asyncHandler);
  }

  // Emit and wait for all async listeners to complete
  async emitAsync(event, ...args) {
    const listeners = this.asyncListeners.get(event) || [];
    const results = [];

    for (const listener of listeners) {
      try {
        const result = await listener(...args);
        results.push({ success: true, result });
      } catch (error) {
        results.push({ success: false, error });
        // Emit error event for centralized error handling
        this.emit('error', error);
      }
    }

    return results;
  }

  // Emit and run all async listeners in parallel
  async emitAsyncParallel(event, ...args) {
    const listeners = this.asyncListeners.get(event) || [];

    const results = await Promise.allSettled(
      listeners.map((listener) => listener(...args))
    );

    // Report errors
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.emit('error', result.reason);
      }
    });

    return results;
  }
}

// Usage
const emitter = new AsyncSafeEmitter();

emitter.on('error', (error) => {
  console.error('Async listener error:', error.message);
});

emitter.onAsync('save', async (data) => {
  // Simulate async database save
  await new Promise((r) => setTimeout(r, 100));
  console.log('Saved to database:', data.id);
});

emitter.onAsync('save', async (data) => {
  // This one fails
  throw new Error('Cache save failed');
});

// Wait for all listeners
async function main() {
  const results = await emitter.emitAsyncParallel('save', { id: 123 });
  console.log('Results:', results);
}

main();
```

## Event-Driven Patterns

### Pub/Sub Pattern with Namespaced Events

The publish-subscribe pattern allows multiple subscribers to receive events from a central hub.

```javascript
const EventEmitter = require('events');

class EventBus extends EventEmitter {
  constructor() {
    super();
    // Increase max listeners for bus pattern where many components subscribe
    this.setMaxListeners(100);
  }

  // Subscribe to events matching a pattern
  subscribe(pattern, handler) {
    // Support wildcard patterns like 'order:*'
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
      const wrappedHandler = (event, data) => {
        if (regex.test(event)) {
          handler(event, data);
        }
      };
      this.on('__event__', wrappedHandler);
      return () => this.off('__event__', wrappedHandler);
    }

    this.on(pattern, handler);
    return () => this.off(pattern, handler);
  }

  // Publish an event to all matching subscribers
  publish(event, data) {
    // Emit to exact match listeners
    this.emit(event, data);

    // Emit to wildcard listeners
    this.emit('__event__', event, data);
  }
}

// Global event bus instance
const bus = new EventBus();

// Service A: Order service publishes order events
function orderService() {
  bus.publish('order:created', { orderId: '123', total: 99.99 });
  bus.publish('order:paid', { orderId: '123', paymentId: 'pay_456' });
  bus.publish('order:shipped', { orderId: '123', trackingId: 'TRACK_789' });
}

// Service B: Notification service subscribes to order events
const unsubscribe = bus.subscribe('order:*', (event, data) => {
  console.log(`[Notifications] Event: ${event}`, data);
});

// Service C: Analytics subscribes to specific events
bus.subscribe('order:created', (data) => {
  console.log('[Analytics] New order:', data.orderId);
});

bus.subscribe('order:paid', (data) => {
  console.log('[Analytics] Payment received:', data.paymentId);
});

// Run the order service
orderService();

// Later: unsubscribe from all order events
// unsubscribe();
```

### Observer Pattern with Lifecycle Events

```javascript
const EventEmitter = require('events');

class Component extends EventEmitter {
  constructor(name) {
    super();
    this.name = name;
    this.state = 'created';
  }

  async initialize() {
    this.emit('lifecycle:initializing', { component: this.name });

    try {
      await this.doInitialize();
      this.state = 'initialized';
      this.emit('lifecycle:initialized', { component: this.name });
    } catch (error) {
      this.state = 'error';
      this.emit('lifecycle:error', { component: this.name, error });
      throw error;
    }
  }

  async start() {
    if (this.state !== 'initialized') {
      throw new Error(`Cannot start component in state: ${this.state}`);
    }

    this.emit('lifecycle:starting', { component: this.name });

    try {
      await this.doStart();
      this.state = 'running';
      this.emit('lifecycle:started', { component: this.name });
    } catch (error) {
      this.state = 'error';
      this.emit('lifecycle:error', { component: this.name, error });
      throw error;
    }
  }

  async stop() {
    this.emit('lifecycle:stopping', { component: this.name });

    try {
      await this.doStop();
      this.state = 'stopped';
      this.emit('lifecycle:stopped', { component: this.name });
    } catch (error) {
      this.state = 'error';
      this.emit('lifecycle:error', { component: this.name, error });
      throw error;
    }
  }

  // Override in subclasses
  async doInitialize() {}
  async doStart() {}
  async doStop() {}
}

// Database component with lifecycle
class DatabaseComponent extends Component {
  constructor() {
    super('database');
    this.pool = null;
  }

  async doInitialize() {
    // Simulate connection pool setup
    await new Promise((r) => setTimeout(r, 100));
    this.pool = { connected: true };
  }

  async doStart() {
    // Verify connection
    await new Promise((r) => setTimeout(r, 50));
  }

  async doStop() {
    // Close pool
    await new Promise((r) => setTimeout(r, 50));
    this.pool = null;
  }
}

// Application manager observes component lifecycles
class ApplicationManager {
  constructor() {
    this.components = [];
  }

  register(component) {
    this.components.push(component);

    // Observe lifecycle events
    component.on('lifecycle:initializing', ({ component }) => {
      console.log(`[App] Initializing: ${component}`);
    });

    component.on('lifecycle:initialized', ({ component }) => {
      console.log(`[App] Initialized: ${component}`);
    });

    component.on('lifecycle:started', ({ component }) => {
      console.log(`[App] Started: ${component}`);
    });

    component.on('lifecycle:stopped', ({ component }) => {
      console.log(`[App] Stopped: ${component}`);
    });

    component.on('lifecycle:error', ({ component, error }) => {
      console.error(`[App] Error in ${component}:`, error.message);
    });
  }

  async startAll() {
    for (const component of this.components) {
      await component.initialize();
      await component.start();
    }
  }

  async stopAll() {
    // Stop in reverse order
    for (let i = this.components.length - 1; i >= 0; i--) {
      await this.components[i].stop();
    }
  }
}

// Usage
const app = new ApplicationManager();
const db = new DatabaseComponent();

app.register(db);

app.startAll().then(() => {
  console.log('Application started');
});
```

### Event Sourcing Pattern

Event sourcing stores all changes as a sequence of events. The current state is derived by replaying events.

```javascript
const EventEmitter = require('events');

class EventStore extends EventEmitter {
  constructor() {
    super();
    this.events = [];
  }

  // Append an event to the store
  append(event) {
    const storedEvent = {
      ...event,
      id: this.events.length + 1,
      timestamp: new Date().toISOString(),
    };

    this.events.push(storedEvent);
    this.emit('event:appended', storedEvent);

    return storedEvent;
  }

  // Get all events for an aggregate
  getEvents(aggregateId) {
    return this.events.filter((e) => e.aggregateId === aggregateId);
  }

  // Get all events of a specific type
  getEventsByType(type) {
    return this.events.filter((e) => e.type === type);
  }

  // Replay events to rebuild state
  replay(aggregateId, reducer, initialState = {}) {
    const events = this.getEvents(aggregateId);
    return events.reduce((state, event) => reducer(state, event), initialState);
  }
}

// Account aggregate using event sourcing
class BankAccount {
  constructor(eventStore, accountId) {
    this.eventStore = eventStore;
    this.accountId = accountId;
  }

  // Commands that produce events
  open(initialDeposit) {
    this.eventStore.append({
      type: 'AccountOpened',
      aggregateId: this.accountId,
      data: { initialDeposit },
    });
  }

  deposit(amount) {
    this.eventStore.append({
      type: 'MoneyDeposited',
      aggregateId: this.accountId,
      data: { amount },
    });
  }

  withdraw(amount) {
    const balance = this.getBalance();
    if (amount > balance) {
      throw new Error('Insufficient funds');
    }

    this.eventStore.append({
      type: 'MoneyWithdrawn',
      aggregateId: this.accountId,
      data: { amount },
    });
  }

  // Query current state by replaying events
  getBalance() {
    return this.eventStore.replay(
      this.accountId,
      (state, event) => {
        switch (event.type) {
          case 'AccountOpened':
            return { balance: event.data.initialDeposit };
          case 'MoneyDeposited':
            return { balance: state.balance + event.data.amount };
          case 'MoneyWithdrawn':
            return { balance: state.balance - event.data.amount };
          default:
            return state;
        }
      },
      { balance: 0 }
    ).balance;
  }

  // Get transaction history
  getHistory() {
    return this.eventStore.getEvents(this.accountId);
  }
}

// Usage
const store = new EventStore();

// Listen to all events for audit logging
store.on('event:appended', (event) => {
  console.log(`[Audit] ${event.type}: ${JSON.stringify(event.data)}`);
});

const account = new BankAccount(store, 'ACC-001');

account.open(100);
account.deposit(50);
account.withdraw(30);

console.log('Balance:', account.getBalance()); // 120
console.log('History:', account.getHistory());
```

## Real-World Applications

### HTTP Server Request Events

```javascript
const EventEmitter = require('events');
const http = require('http');

class RequestTracker extends EventEmitter {
  constructor() {
    super();
    this.activeRequests = new Map();
    this.requestCount = 0;
  }

  track(req, res) {
    const requestId = ++this.requestCount;
    const startTime = Date.now();

    // Store request metadata
    this.activeRequests.set(requestId, {
      method: req.method,
      url: req.url,
      startTime,
    });

    this.emit('request:start', {
      requestId,
      method: req.method,
      url: req.url,
    });

    // Track response completion
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const requestData = this.activeRequests.get(requestId);

      this.activeRequests.delete(requestId);

      this.emit('request:end', {
        requestId,
        method: requestData.method,
        url: requestData.url,
        statusCode: res.statusCode,
        duration,
      });
    });

    // Track errors
    res.on('error', (error) => {
      this.activeRequests.delete(requestId);

      this.emit('request:error', {
        requestId,
        error: error.message,
      });
    });

    return requestId;
  }

  getActiveCount() {
    return this.activeRequests.size;
  }
}

// Usage with HTTP server
const tracker = new RequestTracker();

// Metrics listener
tracker.on('request:end', ({ method, url, statusCode, duration }) => {
  console.log(`${method} ${url} ${statusCode} ${duration}ms`);
});

// Slow request alerting
tracker.on('request:end', ({ requestId, duration, url }) => {
  if (duration > 1000) {
    console.warn(`[SLOW] Request ${requestId} to ${url} took ${duration}ms`);
  }
});

// Error tracking
tracker.on('request:error', ({ requestId, error }) => {
  console.error(`[ERROR] Request ${requestId} failed: ${error}`);
});

const server = http.createServer((req, res) => {
  tracker.track(req, res);

  // Simulate some work
  setTimeout(() => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  }, Math.random() * 500);
});

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});
```

### Job Queue with Events

```javascript
const EventEmitter = require('events');

class JobQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    this.concurrency = options.concurrency || 3;
    this.queue = [];
    this.running = 0;
    this.processors = new Map();
  }

  // Register a processor for a job type
  process(jobType, handler) {
    this.processors.set(jobType, handler);
  }

  // Add a job to the queue
  add(jobType, data, options = {}) {
    const job = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: jobType,
      data,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      createdAt: new Date(),
    };

    this.queue.push(job);
    this.emit('job:added', { job });
    this.processNext();

    return job;
  }

  // Process jobs from the queue
  async processNext() {
    if (this.running >= this.concurrency) return;
    if (this.queue.length === 0) return;

    const job = this.queue.shift();
    this.running++;

    this.emit('job:started', { job });

    const processor = this.processors.get(job.type);
    if (!processor) {
      this.emit('job:failed', {
        job,
        error: `No processor for job type: ${job.type}`,
      });
      this.running--;
      this.processNext();
      return;
    }

    try {
      job.attempts++;
      const result = await processor(job);

      this.emit('job:completed', { job, result });
    } catch (error) {
      if (job.attempts < job.maxAttempts) {
        // Retry with exponential backoff
        const delay = Math.pow(2, job.attempts) * 1000;
        this.emit('job:retry', { job, error: error.message, delay });

        setTimeout(() => {
          this.queue.push(job);
          this.processNext();
        }, delay);
      } else {
        this.emit('job:failed', { job, error: error.message });
      }
    }

    this.running--;
    this.processNext();
  }

  // Get queue statistics
  getStats() {
    return {
      queued: this.queue.length,
      running: this.running,
      concurrency: this.concurrency,
    };
  }
}

// Usage
const queue = new JobQueue({ concurrency: 3 });

// Register job processors
queue.process('email', async (job) => {
  console.log(`Sending email to: ${job.data.to}`);
  await new Promise((r) => setTimeout(r, 1000));
  return { sent: true };
});

queue.process('resize-image', async (job) => {
  console.log(`Resizing image: ${job.data.path}`);
  await new Promise((r) => setTimeout(r, 2000));
  return { resizedPath: job.data.path.replace('.jpg', '-resized.jpg') };
});

// Event listeners
queue.on('job:added', ({ job }) => {
  console.log(`[Queue] Job added: ${job.id} (${job.type})`);
});

queue.on('job:started', ({ job }) => {
  console.log(`[Queue] Job started: ${job.id}`);
});

queue.on('job:completed', ({ job, result }) => {
  console.log(`[Queue] Job completed: ${job.id}`, result);
});

queue.on('job:failed', ({ job, error }) => {
  console.error(`[Queue] Job failed: ${job.id} - ${error}`);
});

queue.on('job:retry', ({ job, delay }) => {
  console.log(`[Queue] Job ${job.id} will retry in ${delay}ms`);
});

// Add jobs
queue.add('email', { to: 'user@example.com', subject: 'Welcome' });
queue.add('resize-image', { path: '/uploads/photo.jpg' });
queue.add('email', { to: 'admin@example.com', subject: 'Report' });
```

### WebSocket Connection Manager

```javascript
const EventEmitter = require('events');
const WebSocket = require('ws');

class WebSocketManager extends EventEmitter {
  constructor(server) {
    super();
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map();
    this.rooms = new Map();

    this.setupServer();
  }

  setupServer() {
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();

      // Store client metadata
      this.clients.set(clientId, {
        ws,
        rooms: new Set(),
        connectedAt: new Date(),
        ip: req.socket.remoteAddress,
      });

      this.emit('client:connected', { clientId });

      // Handle incoming messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          this.emit('error', {
            clientId,
            error: 'Invalid message format',
          });
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        const client = this.clients.get(clientId);
        if (client) {
          // Leave all rooms
          for (const room of client.rooms) {
            this.leaveRoom(clientId, room);
          }
          this.clients.delete(clientId);
        }

        this.emit('client:disconnected', { clientId });
      });

      // Handle errors
      ws.on('error', (error) => {
        this.emit('client:error', { clientId, error: error.message });
      });
    });
  }

  handleMessage(clientId, message) {
    this.emit('message:received', { clientId, message });

    switch (message.type) {
      case 'join':
        this.joinRoom(clientId, message.room);
        break;
      case 'leave':
        this.leaveRoom(clientId, message.room);
        break;
      case 'broadcast':
        this.broadcast(message.room, message.data, clientId);
        break;
      default:
        // Emit custom message types
        this.emit(`message:${message.type}`, { clientId, data: message.data });
    }
  }

  joinRoom(clientId, room) {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }

    this.rooms.get(room).add(clientId);
    client.rooms.add(room);

    this.emit('room:joined', { clientId, room });
  }

  leaveRoom(clientId, room) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const roomClients = this.rooms.get(room);
    if (roomClients) {
      roomClients.delete(clientId);
      if (roomClients.size === 0) {
        this.rooms.delete(room);
      }
    }

    client.rooms.delete(room);

    this.emit('room:left', { clientId, room });
  }

  broadcast(room, data, excludeClient = null) {
    const roomClients = this.rooms.get(room);
    if (!roomClients) return;

    const message = JSON.stringify({ type: 'broadcast', room, data });

    for (const clientId of roomClients) {
      if (clientId === excludeClient) continue;

      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }

    this.emit('room:broadcast', {
      room,
      data,
      clientCount: roomClients.size,
    });
  }

  send(clientId, data) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(data));
    }
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getStats() {
    return {
      totalClients: this.clients.size,
      totalRooms: this.rooms.size,
      rooms: Array.from(this.rooms.entries()).map(([name, clients]) => ({
        name,
        clientCount: clients.size,
      })),
    };
  }
}

// Usage
const http = require('http');
const server = http.createServer();

const wsManager = new WebSocketManager(server);

wsManager.on('client:connected', ({ clientId }) => {
  console.log(`Client connected: ${clientId}`);
});

wsManager.on('client:disconnected', ({ clientId }) => {
  console.log(`Client disconnected: ${clientId}`);
});

wsManager.on('room:joined', ({ clientId, room }) => {
  console.log(`Client ${clientId} joined room: ${room}`);
});

wsManager.on('room:broadcast', ({ room, clientCount }) => {
  console.log(`Broadcast to ${room} (${clientCount} clients)`);
});

// Custom message handler
wsManager.on('message:chat', ({ clientId, data }) => {
  console.log(`Chat from ${clientId}: ${data.text}`);
});

server.listen(3000, () => {
  console.log('WebSocket server listening on port 3000');
});
```

## Performance Considerations

### Max Listeners Warning

EventEmitter warns when more than 10 listeners are registered for a single event, as this often indicates a memory leak.

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

// Default max is 10 - adding more triggers a warning
for (let i = 0; i < 15; i++) {
  emitter.on('data', () => {});
}
// Warning: Possible EventEmitter memory leak detected

// Increase max listeners when you legitimately need more
emitter.setMaxListeners(50);

// Or set to 0 for unlimited (use with caution)
emitter.setMaxListeners(0);

// Check current limit
console.log(emitter.getMaxListeners());
```

### Memory Leak Prevention

```javascript
const EventEmitter = require('events');

class ManagedEmitter extends EventEmitter {
  constructor() {
    super();
    this.subscriptions = [];
  }

  // Track subscriptions for cleanup
  subscribe(event, handler) {
    this.on(event, handler);
    this.subscriptions.push({ event, handler });

    // Return unsubscribe function
    return () => {
      this.off(event, handler);
      this.subscriptions = this.subscriptions.filter(
        (s) => s.handler !== handler
      );
    };
  }

  // Clean up all subscriptions
  cleanup() {
    for (const { event, handler } of this.subscriptions) {
      this.off(event, handler);
    }
    this.subscriptions = [];
  }
}

// Component that uses events
class DataComponent {
  constructor(emitter) {
    this.emitter = emitter;
    this.unsubscribers = [];
  }

  start() {
    // Store unsubscribe functions
    this.unsubscribers.push(
      this.emitter.subscribe('data', this.handleData.bind(this))
    );
    this.unsubscribers.push(
      this.emitter.subscribe('error', this.handleError.bind(this))
    );
  }

  handleData(data) {
    console.log('Data:', data);
  }

  handleError(error) {
    console.error('Error:', error);
  }

  // Clean up when component is destroyed
  destroy() {
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.unsubscribers = [];
  }
}

// Usage
const emitter = new ManagedEmitter();
const component = new DataComponent(emitter);

component.start();
emitter.emit('data', { value: 123 });

// Clean up when done
component.destroy();
```

### Listener Execution Order

Listeners execute synchronously in registration order. Be aware of blocking operations.

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

// Listeners run synchronously in order
emitter.on('process', () => {
  console.log('1. First listener');
});

emitter.on('process', () => {
  console.log('2. Second listener');
});

// prependListener adds to the beginning
emitter.prependListener('process', () => {
  console.log('0. Prepended listener');
});

emitter.emit('process');
// Output:
// 0. Prepended listener
// 1. First listener
// 2. Second listener

// For async listeners, emit returns before they complete
emitter.on('async-process', async () => {
  await new Promise((r) => setTimeout(r, 100));
  console.log('Async complete');
});

console.log('Before emit');
emitter.emit('async-process');
console.log('After emit');
// Output:
// Before emit
// After emit
// Async complete (100ms later)
```

## Testing Event-Driven Code

```javascript
const EventEmitter = require('events');
const assert = require('assert');

// System under test
class OrderService extends EventEmitter {
  async createOrder(orderData) {
    const order = { id: `order_${Date.now()}`, ...orderData };
    this.emit('order:created', order);
    return order;
  }
}

// Test utilities
function waitForEvent(emitter, event, timeout = 1000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${event}`));
    }, timeout);

    emitter.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

function collectEvents(emitter, event, count) {
  return new Promise((resolve) => {
    const events = [];
    const handler = (data) => {
      events.push(data);
      if (events.length >= count) {
        emitter.off(event, handler);
        resolve(events);
      }
    };
    emitter.on(event, handler);
  });
}

// Tests
async function runTests() {
  console.log('Running tests...\n');

  // Test 1: Event is emitted on order creation
  {
    const service = new OrderService();
    const eventPromise = waitForEvent(service, 'order:created');

    await service.createOrder({ item: 'Widget', quantity: 5 });

    const event = await eventPromise;
    assert(event.item === 'Widget', 'Event should contain order data');
    console.log('Test 1 passed: Event emitted on order creation');
  }

  // Test 2: Event contains correct data
  {
    const service = new OrderService();
    let receivedEvent = null;

    service.on('order:created', (event) => {
      receivedEvent = event;
    });

    await service.createOrder({ item: 'Gadget', quantity: 3 });

    assert(receivedEvent !== null, 'Event should be received');
    assert(receivedEvent.item === 'Gadget', 'Item should match');
    assert(receivedEvent.quantity === 3, 'Quantity should match');
    assert(receivedEvent.id.startsWith('order_'), 'ID should be generated');
    console.log('Test 2 passed: Event contains correct data');
  }

  // Test 3: Multiple events collected
  {
    const service = new OrderService();
    const eventsPromise = collectEvents(service, 'order:created', 3);

    await service.createOrder({ item: 'A' });
    await service.createOrder({ item: 'B' });
    await service.createOrder({ item: 'C' });

    const events = await eventsPromise;
    assert(events.length === 3, 'Should collect 3 events');
    assert(events[0].item === 'A', 'First event correct');
    assert(events[2].item === 'C', 'Last event correct');
    console.log('Test 3 passed: Multiple events collected');
  }

  console.log('\nAll tests passed!');
}

runTests().catch(console.error);
```

## Best Practices Summary

| Practice | Description |
|----------|-------------|
| **Always handle errors** | Register an 'error' listener to prevent crashes |
| **Document events** | List all events and their payload structures |
| **Use namespaced events** | Prefix events with module name (e.g., 'order:created') |
| **Clean up listeners** | Remove listeners when components are destroyed |
| **Set appropriate max listeners** | Adjust based on legitimate use cases |
| **Test event emissions** | Verify events are emitted with correct data |
| **Prefer once() for one-time events** | Prevents accidental duplicate handling |
| **Use async patterns carefully** | Remember emit() returns before async listeners complete |

Event-driven architecture with EventEmitter provides a powerful foundation for building decoupled, maintainable Node.js applications. By emitting events at key points in your application flow, you enable other components to react without tight coupling, making your system easier to extend, test, and maintain.

## Monitor Your Event-Driven Applications with OneUptime

Building event-driven systems is only half the battle. You need visibility into how your events flow through production. OneUptime provides comprehensive monitoring for Node.js applications:

- **Distributed Tracing**: Track events as they propagate through your microservices
- **Custom Metrics**: Monitor event throughput, processing times, and queue depths
- **Log Management**: Correlate event logs across services with full-text search
- **Alerting**: Get notified when event processing fails or slows down
- **Status Pages**: Keep users informed during incidents

OneUptime is open source and can be self-hosted or used as a managed service. Start monitoring your event-driven architecture today at [oneuptime.com](https://oneuptime.com).
