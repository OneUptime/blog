# How to Build Type-Safe Event Emitters in TypeScript

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: TypeScript, Events, Type Safety, Patterns

Description: Learn how to create type-safe event emitters in TypeScript with strongly typed event names and payloads.

---

Event emitters are a fundamental pattern in JavaScript and TypeScript applications. They enable loose coupling between components by allowing parts of your application to communicate through events. However, the standard Node.js EventEmitter lacks type safety, making it easy to emit events with incorrect payloads or subscribe to misspelled event names. In this post, we will build a fully type-safe event emitter that catches these errors at compile time.

## The Problem with Traditional Event Emitters

Consider the standard Node.js EventEmitter:

```typescript
import { EventEmitter } from 'events';

const emitter = new EventEmitter();

// No type checking on event names or payloads
emitter.on('userLoggedIn', (user) => {
  console.log(user.name); // user is 'any'
});

emitter.emit('userLoggedIn', { name: 'Alice' });
emitter.emit('userLoggedin', { name: 'Bob' }); // Typo - no error!
```

This code compiles without errors, but the typo in the second emit call means the listener will never receive that event.

## Defining a Generic Event Map Type

The foundation of type-safe events is a generic event map that describes all possible events and their payloads:

```typescript
// Define your event map as an interface
interface UserEvents {
  userLoggedIn: { userId: string; timestamp: Date };
  userLoggedOut: { userId: string };
  profileUpdated: { userId: string; changes: Record<string, unknown> };
}
```

This interface serves as the contract for all events in your system. Each key is an event name, and each value is the payload type for that event.

## Building the Typed Event Emitter

Now let us create a type-safe wrapper around the event emitter pattern:

```typescript
type EventCallback<T> = (payload: T) => void;

class TypedEventEmitter<TEvents extends Record<string, unknown>> {
  private listeners: {
    [K in keyof TEvents]?: EventCallback<TEvents[K]>[];
  } = {};

  on<K extends keyof TEvents>(
    event: K,
    callback: EventCallback<TEvents[K]>
  ): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(callback);
  }

  off<K extends keyof TEvents>(
    event: K,
    callback: EventCallback<TEvents[K]>
  ): void {
    const callbacks = this.listeners[event];
    if (callbacks) {
      this.listeners[event] = callbacks.filter((cb) => cb !== callback);
    }
  }

  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
    const callbacks = this.listeners[event];
    if (callbacks) {
      callbacks.forEach((callback) => callback(payload));
    }
  }

  once<K extends keyof TEvents>(
    event: K,
    callback: EventCallback<TEvents[K]>
  ): void {
    const wrapper: EventCallback<TEvents[K]> = (payload) => {
      this.off(event, wrapper);
      callback(payload);
    };
    this.on(event, wrapper);
  }
}
```

The key insight here is using generics with `keyof` constraints. The type parameter `K extends keyof TEvents` ensures that only valid event names can be used, and TypeScript automatically infers the correct payload type for each event.

## Callback Type Inference in Action

With our typed emitter, TypeScript provides full IntelliSense and type checking:

```typescript
const userEmitter = new TypedEventEmitter<UserEvents>();

// TypeScript knows the payload type
userEmitter.on('userLoggedIn', (payload) => {
  console.log(payload.userId);    // string - correctly typed
  console.log(payload.timestamp); // Date - correctly typed
});

// Compile-time error: 'userLogged' is not a valid event
userEmitter.on('userLogged', () => {}); // Error!

// Compile-time error: missing 'timestamp' property
userEmitter.emit('userLoggedIn', { userId: '123' }); // Error!

// Correct usage
userEmitter.emit('userLoggedIn', {
  userId: '123',
  timestamp: new Date()
});
```

## Wrapping Node.js EventEmitter

If you need to integrate with existing code that expects a Node.js EventEmitter, you can create a wrapper:

```typescript
import { EventEmitter } from 'events';

class TypedNodeEventEmitter<
  TEvents extends Record<string, unknown>
> extends EventEmitter {
  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): boolean {
    return super.emit(event as string, payload);
  }

  on<K extends keyof TEvents>(
    event: K,
    listener: (payload: TEvents[K]) => void
  ): this {
    return super.on(event as string, listener);
  }

  once<K extends keyof TEvents>(
    event: K,
    listener: (payload: TEvents[K]) => void
  ): this {
    return super.once(event as string, listener);
  }
}
```

## Real-World Example: Application Events

Here is a practical example showing how to use typed events in an application:

```typescript
interface AppEvents {
  'app:ready': { version: string };
  'user:login': { userId: string; email: string };
  'user:logout': { userId: string };
  'error': { code: number; message: string };
  'data:sync': { source: string; recordCount: number };
}

class Application {
  public events = new TypedEventEmitter<AppEvents>();

  async initialize(): Promise<void> {
    // Setup logic here
    this.events.emit('app:ready', { version: '1.0.0' });
  }

  async login(email: string, password: string): Promise<void> {
    // Authentication logic
    const userId = 'user-123';
    this.events.emit('user:login', { userId, email });
  }
}

// Usage
const app = new Application();

app.events.on('user:login', ({ userId, email }) => {
  console.log(`User ${email} logged in with ID ${userId}`);
});

app.events.on('error', ({ code, message }) => {
  console.error(`Error ${code}: ${message}`);
});
```

## Conclusion

Type-safe event emitters eliminate an entire class of runtime bugs by catching event name typos and payload mismatches at compile time. The generic event map pattern is flexible enough to describe complex event systems while providing excellent developer experience through IntelliSense autocomplete and inline type hints.

By investing a small amount of effort upfront to define your event types, you gain confidence that your event-driven code will work correctly. This pattern scales well from simple applications to complex systems with dozens of event types, making it an essential tool in any TypeScript developer's toolkit.
