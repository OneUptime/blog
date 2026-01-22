# How to Use Event Emitters in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Events, EventEmitter, JavaScript, Patterns

Description: Learn how to use the EventEmitter class in Node.js to create custom events, handle asynchronous communication, and build loosely coupled applications.

---

Event emitters are central to Node.js architecture. They enable asynchronous communication between components without tight coupling. This guide covers everything from basics to advanced patterns.

## Basic EventEmitter Usage

```javascript
const EventEmitter = require('events');

// Create an emitter instance
const emitter = new EventEmitter();

// Register a listener
emitter.on('greeting', (name) => {
  console.log(`Hello, ${name}!`);
});

// Emit an event
emitter.emit('greeting', 'World');
// Output: Hello, World!
```

## Creating Custom Event Emitters

Extend the EventEmitter class:

```javascript
const EventEmitter = require('events');

class UserService extends EventEmitter {
  constructor() {
    super();
    this.users = [];
  }
  
  createUser(userData) {
    const user = {
      id: Date.now(),
      ...userData,
      createdAt: new Date(),
    };
    
    this.users.push(user);
    
    // Emit event when user is created
    this.emit('userCreated', user);
    
    return user;
  }
  
  deleteUser(userId) {
    const index = this.users.findIndex(u => u.id === userId);
    
    if (index === -1) {
      this.emit('error', new Error(`User ${userId} not found`));
      return false;
    }
    
    const [deletedUser] = this.users.splice(index, 1);
    this.emit('userDeleted', deletedUser);
    
    return true;
  }
}

// Usage
const userService = new UserService();

userService.on('userCreated', (user) => {
  console.log('New user created:', user.name);
});

userService.on('userDeleted', (user) => {
  console.log('User deleted:', user.name);
});

userService.on('error', (err) => {
  console.error('Error:', err.message);
});

const user = userService.createUser({ name: 'John', email: 'john@example.com' });
userService.deleteUser(user.id);
```

## Event Methods

### Registering Listeners

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

// on() - Add listener
emitter.on('event', () => console.log('Event fired'));

// addListener() - Same as on()
emitter.addListener('event', () => console.log('Also fired'));

// once() - Listener fires only once
emitter.once('init', () => console.log('Initialization complete'));
emitter.emit('init');  // Fires
emitter.emit('init');  // Does nothing

// prependListener() - Add to beginning of listener queue
emitter.prependListener('event', () => console.log('First!'));

// prependOnceListener() - Combine prepend and once
emitter.prependOnceListener('event', () => console.log('First, once!'));
```

### Removing Listeners

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

function handler() {
  console.log('Handled');
}

emitter.on('event', handler);

// Remove specific listener
emitter.off('event', handler);
// or
emitter.removeListener('event', handler);

// Remove all listeners for an event
emitter.removeAllListeners('event');

// Remove all listeners for all events
emitter.removeAllListeners();
```

### Event Information

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

emitter.on('event', () => {});
emitter.on('event', () => {});
emitter.on('other', () => {});

// Get event names with listeners
console.log(emitter.eventNames());
// ['event', 'other']

// Count listeners for an event
console.log(emitter.listenerCount('event'));
// 2

// Get listeners for an event
console.log(emitter.listeners('event'));
// [Function, Function]

// Get listeners including once wrappers
console.log(emitter.rawListeners('event'));
```

## Passing Multiple Arguments

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

emitter.on('order', (orderId, items, total) => {
  console.log(`Order ${orderId}: ${items.length} items, $${total}`);
});

emitter.emit('order', 123, ['apple', 'banana'], 15.99);
// Output: Order 123: 2 items, $15.99

// Or pass an object
emitter.on('orderObject', ({ id, items, total }) => {
  console.log(`Order ${id}: ${items.length} items, $${total}`);
});

emitter.emit('orderObject', {
  id: 123,
  items: ['apple', 'banana'],
  total: 15.99,
});
```

## Asynchronous Events

### With Async Listeners

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

// Async listener
emitter.on('save', async (data) => {
  await saveToDatabase(data);
  console.log('Saved to database');
});

// Note: emit() does not wait for async listeners
emitter.emit('save', { name: 'John' });
console.log('This logs before "Saved to database"');
```

### Waiting for Async Listeners

```javascript
const EventEmitter = require('events');
const { once } = require('events');

async function waitForEvent() {
  const emitter = new EventEmitter();
  
  // Set up something that emits later
  setTimeout(() => {
    emitter.emit('ready', { status: 'ok' });
  }, 1000);
  
  // Wait for the event
  const [result] = await once(emitter, 'ready');
  console.log('Ready with:', result);
}
```

### AsyncIterator for Events

```javascript
const { EventEmitter, on } = require('events');

async function processEvents() {
  const emitter = new EventEmitter();
  
  // Emit events over time
  let count = 0;
  const interval = setInterval(() => {
    emitter.emit('data', { count: ++count });
    if (count >= 5) {
      clearInterval(interval);
      emitter.emit('end');
    }
  }, 100);
  
  // Iterate over events
  for await (const [event] of on(emitter, 'data')) {
    console.log('Received:', event);
    if (event.count >= 5) break;
  }
  
  console.log('Done processing');
}

processEvents();
```

## Error Handling

### Default Error Behavior

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

// Without error listener, error event throws
emitter.emit('error', new Error('Something went wrong'));
// Throws: Error: Something went wrong

// With error listener, error is handled
emitter.on('error', (err) => {
  console.error('Caught error:', err.message);
});

emitter.emit('error', new Error('Something went wrong'));
// Output: Caught error: Something went wrong
```

### Using captureRejections

Handle promise rejections in listeners:

```javascript
const EventEmitter = require('events');

const emitter = new EventEmitter({ captureRejections: true });

emitter.on('process', async () => {
  throw new Error('Async error');
});

// Captured rejections emit 'error' event
emitter.on('error', (err) => {
  console.error('Caught async error:', err.message);
});

emitter.emit('process');
```

### Custom Error Handler

```javascript
const EventEmitter = require('events');

class SafeEmitter extends EventEmitter {
  emit(event, ...args) {
    try {
      return super.emit(event, ...args);
    } catch (error) {
      this.emit('error', error);
      return false;
    }
  }
}
```

## Memory and Performance

### Max Listeners Warning

```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

// Default max is 10 listeners per event
for (let i = 0; i < 15; i++) {
  emitter.on('event', () => {});
}
// Warning: Possible EventEmitter memory leak detected

// Increase limit for specific emitter
emitter.setMaxListeners(20);

// Or set default for all emitters
EventEmitter.defaultMaxListeners = 20;

// Remove limit (use carefully)
emitter.setMaxListeners(0);
```

### Cleaning Up Listeners

```javascript
const EventEmitter = require('events');

class Component extends EventEmitter {
  constructor(parentEmitter) {
    super();
    this.parentEmitter = parentEmitter;
    this.handlers = [];
    
    // Track handlers for cleanup
    this.addHandler('data', this.handleData.bind(this));
    this.addHandler('error', this.handleError.bind(this));
  }
  
  addHandler(event, handler) {
    this.parentEmitter.on(event, handler);
    this.handlers.push({ event, handler });
  }
  
  handleData(data) {
    console.log('Data:', data);
  }
  
  handleError(err) {
    console.error('Error:', err);
  }
  
  destroy() {
    // Remove all handlers
    for (const { event, handler } of this.handlers) {
      this.parentEmitter.off(event, handler);
    }
    this.handlers = [];
    this.removeAllListeners();
  }
}
```

## Real-World Patterns

### PubSub Pattern

```javascript
const EventEmitter = require('events');

class PubSub extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(0);  // No limit
  }
  
  publish(topic, data) {
    this.emit(topic, data);
  }
  
  subscribe(topic, handler) {
    this.on(topic, handler);
    // Return unsubscribe function
    return () => this.off(topic, handler);
  }
  
  subscribeOnce(topic, handler) {
    this.once(topic, handler);
  }
}

// Global singleton
const pubsub = new PubSub();

// Module A
const unsubscribe = pubsub.subscribe('user:login', (user) => {
  console.log('User logged in:', user.name);
});

// Module B
pubsub.publish('user:login', { name: 'John' });

// Later
unsubscribe();
```

### Job Queue

```javascript
const EventEmitter = require('events');

class JobQueue extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.processing = false;
  }
  
  add(job) {
    this.queue.push(job);
    this.emit('jobAdded', job);
    this.process();
  }
  
  async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      this.emit('jobStarted', job);
      
      try {
        const result = await job.execute();
        this.emit('jobCompleted', job, result);
      } catch (error) {
        this.emit('jobFailed', job, error);
      }
    }
    
    this.processing = false;
    this.emit('queueEmpty');
  }
}

// Usage
const queue = new JobQueue();

queue.on('jobStarted', (job) => console.log('Starting:', job.name));
queue.on('jobCompleted', (job, result) => console.log('Completed:', job.name));
queue.on('jobFailed', (job, err) => console.log('Failed:', job.name, err.message));
queue.on('queueEmpty', () => console.log('All jobs done'));

queue.add({
  name: 'Send email',
  execute: async () => {
    await new Promise(r => setTimeout(r, 100));
    return 'sent';
  },
});
```

### Database Connection Events

```javascript
const EventEmitter = require('events');

class Database extends EventEmitter {
  constructor(connectionString) {
    super();
    this.connectionString = connectionString;
    this.isConnected = false;
  }
  
  async connect() {
    this.emit('connecting');
    
    try {
      // Simulate connection
      await new Promise(r => setTimeout(r, 500));
      this.isConnected = true;
      this.emit('connected');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
  
  async disconnect() {
    this.emit('disconnecting');
    await new Promise(r => setTimeout(r, 100));
    this.isConnected = false;
    this.emit('disconnected');
  }
  
  async query(sql) {
    if (!this.isConnected) {
      throw new Error('Not connected');
    }
    
    this.emit('query', sql);
    const result = await this.executeQuery(sql);
    this.emit('queryComplete', sql, result);
    
    return result;
  }
  
  async executeQuery(sql) {
    // Simulate query
    return { rows: [] };
  }
}

// Usage
const db = new Database('postgresql://localhost/mydb');

db.on('connecting', () => console.log('Connecting to database...'));
db.on('connected', () => console.log('Database connected'));
db.on('query', (sql) => console.log('Executing:', sql));
db.on('error', (err) => console.error('Database error:', err));

await db.connect();
await db.query('SELECT * FROM users');
```

## TypeScript Support

```typescript
import { EventEmitter } from 'events';

// Define event types
interface UserEvents {
  created: (user: User) => void;
  deleted: (userId: string) => void;
  error: (error: Error) => void;
}

interface User {
  id: string;
  name: string;
}

// Type-safe emitter
class TypedEmitter<T extends Record<string, (...args: any[]) => void>> {
  private emitter = new EventEmitter();
  
  on<K extends keyof T>(event: K, listener: T[K]): this {
    this.emitter.on(event as string, listener);
    return this;
  }
  
  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): boolean {
    return this.emitter.emit(event as string, ...args);
  }
  
  off<K extends keyof T>(event: K, listener: T[K]): this {
    this.emitter.off(event as string, listener);
    return this;
  }
}

// Usage
const userEmitter = new TypedEmitter<UserEvents>();

userEmitter.on('created', (user) => {
  // user is typed as User
  console.log(user.name);
});

userEmitter.emit('created', { id: '1', name: 'John' });
```

## Summary

| Method | Purpose |
|--------|---------|
| `on(event, fn)` | Add listener |
| `once(event, fn)` | Add one-time listener |
| `off(event, fn)` | Remove listener |
| `emit(event, ...args)` | Trigger event |
| `removeAllListeners()` | Remove all listeners |
| `setMaxListeners(n)` | Set listener limit |
| `eventNames()` | Get registered events |
| `listenerCount(event)` | Count listeners |

Best practices:
- Always handle the 'error' event
- Clean up listeners when components are destroyed
- Use `once()` for initialization events
- Be careful with async listeners
- Set appropriate max listeners for your use case
- Use typed events in TypeScript
