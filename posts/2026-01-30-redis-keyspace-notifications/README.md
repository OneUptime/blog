# How to Create Redis Keyspace Notifications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Redis, Events, Notifications, Real-time

Description: Use Redis keyspace notifications to react to key events like expiration, deletion, and modifications for event-driven architectures.

---

## Introduction

Redis keyspace notifications allow clients to subscribe to Pub/Sub channels and receive events when Redis keys are modified. This feature enables you to build event-driven systems that react to changes in your Redis data store without polling.

Common use cases include:

- Invalidating application caches when data changes
- Triggering workflows when keys expire
- Monitoring session timeouts
- Building real-time dashboards
- Implementing distributed locks with expiration callbacks

In this guide, you will learn how to enable keyspace notifications, understand the different event types, subscribe to events using various patterns, and implement practical solutions.

## Prerequisites

Before starting, ensure you have:

- Redis 2.8.0 or later installed
- Access to modify Redis configuration (or use CONFIG SET)
- A Redis client library for your programming language
- Basic familiarity with Redis commands and Pub/Sub

## Understanding Keyspace Notifications

Redis keyspace notifications use the Pub/Sub system to deliver events. When enabled, Redis publishes messages to specific channels whenever certain operations occur on keys.

There are two types of notification channels:

| Channel Type | Pattern | Message Content |
|-------------|---------|-----------------|
| Key-space | `__keyspace@<db>__:<key>` | The event type (e.g., "set", "expire") |
| Key-event | `__keyevent@<db>__:<event>` | The key name that triggered the event |

For example, if you run `SET mykey myvalue` on database 0:

- The key-space channel `__keyspace@0__:mykey` receives the message `set`
- The key-event channel `__keyevent@0__:set` receives the message `mykey`

This dual-channel approach gives you flexibility in how you subscribe to events. You can watch a specific key for any changes, or watch for a specific type of change across all keys.

## Enabling Keyspace Notifications

By default, keyspace notifications are disabled because they consume CPU resources. You must explicitly enable them using the `notify-keyspace-events` configuration parameter.

### Configuration Options

The parameter accepts a string of characters, where each character enables a specific class of events:

| Character | Event Class | Description |
|-----------|-------------|-------------|
| K | Keyspace | Enable keyspace notifications (prefix `__keyspace@<db>__`) |
| E | Keyevent | Enable keyevent notifications (prefix `__keyevent@<db>__`) |
| g | Generic | Non-type-specific commands: DEL, EXPIRE, RENAME, etc. |
| $ | String | String commands: SET, SETEX, APPEND, etc. |
| l | List | List commands: LPUSH, RPOP, LSET, etc. |
| s | Set | Set commands: SADD, SREM, SPOP, etc. |
| h | Hash | Hash commands: HSET, HDEL, HINCRBY, etc. |
| z | Sorted Set | Sorted set commands: ZADD, ZREM, ZINCRBY, etc. |
| x | Expired | Events generated when a key expires |
| e | Evicted | Events generated when a key is evicted (maxmemory policy) |
| n | New key | Events generated when a new key is created |
| t | Stream | Stream commands: XADD, XDEL, etc. |
| d | Module | Module-specific events |
| m | Miss | Events generated on key miss (key accessed but not found) |
| A | Alias | Alias for "g$lshzxetd", includes most events |

### Enabling via redis.conf

Add this line to your redis.conf file to enable all events on both channel types:

```
notify-keyspace-events KEA
```

After modifying redis.conf, restart Redis for the changes to take effect.

### Enabling at Runtime

You can enable notifications without restarting Redis using the CONFIG SET command:

```bash
# Enable keyspace and keyevent notifications for all events
redis-cli CONFIG SET notify-keyspace-events KEA
```

This change persists until Redis restarts, unless you also run CONFIG REWRITE.

### Common Configuration Patterns

Here are practical configurations for common scenarios:

```bash
# Track only key expirations (most common use case)
redis-cli CONFIG SET notify-keyspace-events Ex

# Track string operations and expirations
redis-cli CONFIG SET notify-keyspace-events KE$x

# Track all write operations
redis-cli CONFIG SET notify-keyspace-events KEg$lshzt

# Track new key creation and deletion
redis-cli CONFIG SET notify-keyspace-events KEgn

# Disable notifications entirely
redis-cli CONFIG SET notify-keyspace-events ""
```

### Verifying Configuration

Check the current configuration:

```bash
redis-cli CONFIG GET notify-keyspace-events
```

Example output when notifications are enabled:

```
1) "notify-keyspace-events"
2) "KEA"
```

## Subscribing to Keyspace Notifications

Once notifications are enabled, you can subscribe to events using standard Redis Pub/Sub commands.

### Using redis-cli

Open a terminal and subscribe to all keyspace events on database 0:

```bash
# Subscribe to all keyspace events for database 0
redis-cli PSUBSCRIBE '__keyspace@0__:*'
```

In another terminal, perform some operations:

```bash
redis-cli SET user:1001 "John Doe"
redis-cli EXPIRE user:1001 10
redis-cli DEL user:1001
```

You will see output similar to:

```
1) "pmessage"
2) "__keyspace@0__:*"
3) "__keyspace@0__:user:1001"
4) "set"

1) "pmessage"
2) "__keyspace@0__:*"
3) "__keyspace@0__:user:1001"
4) "expire"

1) "pmessage"
2) "__keyspace@0__:*"
3) "__keyspace@0__:user:1001"
4) "del"
```

### Subscribing to Key-Event Channels

To watch for specific event types across all keys:

```bash
# Watch for all expired keys
redis-cli PSUBSCRIBE '__keyevent@0__:expired'

# Watch for all deleted keys
redis-cli PSUBSCRIBE '__keyevent@0__:del'

# Watch for all SET operations
redis-cli PSUBSCRIBE '__keyevent@0__:set'
```

### Subscribing to Specific Keys

To watch a specific key for any changes:

```bash
# Watch a specific key
redis-cli SUBSCRIBE '__keyspace@0__:session:abc123'
```

### Pattern Subscriptions

Use PSUBSCRIBE for flexible pattern matching:

```bash
# Watch all session keys
redis-cli PSUBSCRIBE '__keyspace@0__:session:*'

# Watch all user-related keys
redis-cli PSUBSCRIBE '__keyspace@0__:user:*'

# Watch multiple event types
redis-cli PSUBSCRIBE '__keyevent@0__:expired' '__keyevent@0__:del'
```

## Event Types Reference

Here is a comprehensive list of events and the commands that trigger them:

| Event Name | Triggered By |
|------------|--------------|
| del | DEL, UNLINK |
| rename_from | RENAME, RENAMENX (source key) |
| rename_to | RENAME, RENAMENX (destination key) |
| move_from | MOVE (source database) |
| move_to | MOVE (destination database) |
| copy_to | COPY (destination key) |
| restore | RESTORE |
| expire | EXPIRE, PEXPIRE, EXPIREAT, PEXPIREAT, SET with EX/PX |
| expired | Key expired due to TTL |
| evicted | Key evicted due to maxmemory policy |
| set | SET, SETEX, SETNX, GETSET |
| setex | SETEX |
| setnx | SETNX |
| setrange | SETRANGE |
| incrby | INCR, INCRBY, INCRBYFLOAT, DECR, DECRBY |
| append | APPEND |
| lpush | LPUSH, LPUSHX |
| rpush | RPUSH, RPUSHX |
| lpop | LPOP, BLPOP |
| rpop | RPOP, BRPOP |
| lset | LSET |
| ltrim | LTRIM |
| linsert | LINSERT |
| lmove | LMOVE, BLMOVE |
| sadd | SADD |
| srem | SREM |
| spop | SPOP |
| smove | SMOVE |
| sinterstore | SINTERSTORE |
| sunionstore | SUNIONSTORE |
| sdiffstore | SDIFFSTORE |
| hset | HSET, HSETNX, HMSET |
| hdel | HDEL |
| hincrby | HINCRBY, HINCRBYFLOAT |
| zadd | ZADD |
| zrem | ZREM |
| zincrby | ZINCRBY |
| zmpop | ZMPOP, BZMPOP |
| zpopmin | ZPOPMIN, BZPOPMIN |
| zpopmax | ZPOPMAX, BZPOPMAX |
| zrangestore | ZRANGESTORE |
| zinterstore | ZINTERSTORE |
| zunionstore | ZUNIONSTORE |
| xadd | XADD |
| xdel | XDEL |
| xtrim | XTRIM |
| xsetid | XSETID |
| persist | PERSIST |
| new | Triggered when a new key is created |

## Practical Implementation Examples

### Python Example: Session Expiration Handler

This example demonstrates how to handle session expirations in a Python application using redis-py.

First, install the required package:

```bash
pip install redis
```

Create a session expiration handler:

```python
import redis
import threading
import json
from datetime import datetime

class SessionExpirationHandler:
    """
    Handles session expiration events from Redis keyspace notifications.
    Useful for cleanup tasks, analytics, or notifying other services.
    """

    def __init__(self, redis_host='localhost', redis_port=6379, redis_db=0):
        # Create two connections: one for Pub/Sub, one for commands
        # Pub/Sub connections cannot execute regular commands
        self.pubsub_client = redis.Redis(
            host=redis_host,
            port=redis_port,
            db=redis_db,
            decode_responses=True
        )
        self.command_client = redis.Redis(
            host=redis_host,
            port=redis_port,
            db=redis_db,
            decode_responses=True
        )
        self.pubsub = self.pubsub_client.pubsub()
        self.running = False

    def enable_notifications(self):
        """Enable keyspace notifications for expired events."""
        # Enable keyevent notifications for expiration events
        self.command_client.config_set('notify-keyspace-events', 'Ex')
        print("Keyspace notifications enabled for expiration events")

    def handle_expiration(self, message):
        """
        Process an expired key event.

        Args:
            message: The Pub/Sub message containing the expired key name
        """
        if message['type'] != 'pmessage':
            return

        expired_key = message['data']

        # Check if this is a session key we care about
        if expired_key.startswith('session:'):
            session_id = expired_key.split(':', 1)[1]
            self.on_session_expired(session_id)

    def on_session_expired(self, session_id):
        """
        Called when a session expires. Override this method for custom logic.

        Args:
            session_id: The ID of the expired session
        """
        print(f"[{datetime.now()}] Session expired: {session_id}")

        # Example: Log to analytics, notify user service, clean up related data
        # self.analytics_client.track('session_expired', {'session_id': session_id})
        # self.user_service.notify_logout(session_id)

    def start(self):
        """Start listening for expiration events in a background thread."""
        self.enable_notifications()

        # Subscribe to expired events on database 0
        # The pattern matches the keyevent channel for expired events
        self.pubsub.psubscribe(**{'__keyevent@0__:expired': self.handle_expiration})

        self.running = True
        self.thread = threading.Thread(target=self._listen, daemon=True)
        self.thread.start()
        print("Session expiration handler started")

    def _listen(self):
        """Internal method to continuously listen for messages."""
        while self.running:
            # get_message returns None if no message is available
            # timeout prevents blocking indefinitely
            message = self.pubsub.get_message(timeout=1.0)
            if message:
                self.handle_expiration(message)

    def stop(self):
        """Stop the expiration handler."""
        self.running = False
        self.pubsub.punsubscribe()
        self.pubsub.close()
        print("Session expiration handler stopped")


# Usage example
if __name__ == '__main__':
    handler = SessionExpirationHandler()
    handler.start()

    # Create a test session that expires in 5 seconds
    client = redis.Redis(decode_responses=True)
    client.setex('session:user123', 5, json.dumps({
        'user_id': 'user123',
        'created_at': datetime.now().isoformat()
    }))
    print("Created test session, will expire in 5 seconds...")

    # Keep the main thread alive
    import time
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        handler.stop()
```

### Node.js Example: Cache Invalidation System

This example shows how to build a cache invalidation system using Node.js and ioredis.

First, install the required package:

```bash
npm install ioredis
```

Create the cache invalidation handler:

```javascript
const Redis = require('ioredis');

/**
 * CacheInvalidationHandler monitors Redis key changes and triggers
 * callbacks when specific keys or patterns are modified.
 */
class CacheInvalidationHandler {
    constructor(options = {}) {
        this.redisHost = options.host || 'localhost';
        this.redisPort = options.port || 6379;
        this.redisDb = options.db || 0;

        // Separate connections for Pub/Sub and commands
        this.subscriber = null;
        this.publisher = null;

        // Store callbacks for different key patterns
        this.callbacks = new Map();
    }

    /**
     * Connect to Redis and enable keyspace notifications
     */
    async connect() {
        // Create subscriber connection for Pub/Sub
        this.subscriber = new Redis({
            host: this.redisHost,
            port: this.redisPort,
            db: this.redisDb
        });

        // Create publisher connection for regular commands
        this.publisher = new Redis({
            host: this.redisHost,
            port: this.redisPort,
            db: this.redisDb
        });

        // Enable notifications for string commands, generic commands, and expirations
        await this.publisher.config('SET', 'notify-keyspace-events', 'KEg$x');

        console.log('Connected to Redis and enabled keyspace notifications');
    }

    /**
     * Register a callback for a specific key pattern
     * @param {string} pattern - The key pattern to watch (supports wildcards)
     * @param {function} callback - Function to call when matching keys change
     */
    watch(pattern, callback) {
        const channel = `__keyspace@${this.redisDb}__:${pattern}`;

        if (!this.callbacks.has(channel)) {
            this.callbacks.set(channel, []);
        }

        this.callbacks.get(channel).push(callback);

        // Subscribe to the pattern
        this.subscriber.psubscribe(channel);
        console.log(`Watching pattern: ${pattern}`);
    }

    /**
     * Start listening for events
     */
    start() {
        this.subscriber.on('pmessage', (pattern, channel, event) => {
            // Extract the key name from the channel
            const keyMatch = channel.match(/__keyspace@\d+__:(.+)/);
            if (!keyMatch) return;

            const key = keyMatch[1];

            // Find matching callbacks
            for (const [subscribedPattern, callbackList] of this.callbacks) {
                if (this.matchPattern(channel, subscribedPattern)) {
                    callbackList.forEach(callback => {
                        callback({
                            key: key,
                            event: event,
                            channel: channel,
                            timestamp: Date.now()
                        });
                    });
                }
            }
        });

        console.log('Cache invalidation handler started');
    }

    /**
     * Check if a channel matches a subscribed pattern
     */
    matchPattern(channel, pattern) {
        // Convert Redis pattern to regex
        const regexPattern = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');

        return new RegExp(`^${regexPattern}$`).test(channel);
    }

    /**
     * Disconnect from Redis
     */
    async disconnect() {
        await this.subscriber.quit();
        await this.publisher.quit();
        console.log('Disconnected from Redis');
    }
}

// Usage example
async function main() {
    const handler = new CacheInvalidationHandler();
    await handler.connect();

    // Watch for changes to product keys
    handler.watch('product:*', (event) => {
        console.log(`Product cache invalidated: ${event.key}`);
        console.log(`  Event type: ${event.event}`);
        console.log(`  Timestamp: ${new Date(event.timestamp).toISOString()}`);

        // Example: Clear local cache, notify other services, etc.
        // localCache.delete(event.key);
        // messageQueue.publish('cache-invalidation', event);
    });

    // Watch for user session changes
    handler.watch('session:*', (event) => {
        if (event.event === 'expired' || event.event === 'del') {
            console.log(`Session ended: ${event.key}`);
        }
    });

    // Watch for configuration changes
    handler.watch('config:*', (event) => {
        console.log(`Configuration changed: ${event.key}`);
        // Reload configuration
    });

    handler.start();

    // Simulate some Redis operations
    const client = new Redis();

    setTimeout(async () => {
        await client.set('product:1001', JSON.stringify({ name: 'Widget', price: 9.99 }));
        await client.set('product:1002', JSON.stringify({ name: 'Gadget', price: 19.99 }));
        await client.setex('session:abc123', 3, 'user-data');
        await client.set('config:feature-flags', JSON.stringify({ newFeature: true }));
    }, 1000);

    // Keep the process running
    process.on('SIGINT', async () => {
        await handler.disconnect();
        await client.quit();
        process.exit(0);
    });
}

main().catch(console.error);
```

### Go Example: Distributed Lock Monitor

This example demonstrates monitoring distributed lock acquisitions and releases in Go.

```go
package main

import (
    "context"
    "fmt"
    "log"
    "os"
    "os/signal"
    "strings"
    "syscall"
    "time"

    "github.com/redis/go-redis/v9"
)

// LockMonitor watches for distributed lock events in Redis
type LockMonitor struct {
    client    *redis.Client
    pubsub    *redis.PubSub
    ctx       context.Context
    cancel    context.CancelFunc
    lockPrefix string
}

// LockEvent represents a lock-related event
type LockEvent struct {
    LockName  string
    EventType string
    Timestamp time.Time
}

// NewLockMonitor creates a new lock monitor instance
func NewLockMonitor(redisAddr string, lockPrefix string) *LockMonitor {
    client := redis.NewClient(&redis.Options{
        Addr: redisAddr,
        DB:   0,
    })

    ctx, cancel := context.WithCancel(context.Background())

    return &LockMonitor{
        client:     client,
        ctx:        ctx,
        cancel:     cancel,
        lockPrefix: lockPrefix,
    }
}

// EnableNotifications configures Redis for keyspace notifications
func (lm *LockMonitor) EnableNotifications() error {
    // Enable notifications for SET, DEL, and EXPIRE events
    _, err := lm.client.ConfigSet(lm.ctx, "notify-keyspace-events", "KEg$x").Result()
    if err != nil {
        return fmt.Errorf("failed to enable notifications: %w", err)
    }
    log.Println("Keyspace notifications enabled")
    return nil
}

// Start begins monitoring lock events
func (lm *LockMonitor) Start(eventChan chan<- LockEvent) error {
    if err := lm.EnableNotifications(); err != nil {
        return err
    }

    // Subscribe to keyspace events for lock keys
    pattern := fmt.Sprintf("__keyspace@0__:%s*", lm.lockPrefix)
    lm.pubsub = lm.client.PSubscribe(lm.ctx, pattern)

    // Wait for subscription confirmation
    _, err := lm.pubsub.Receive(lm.ctx)
    if err != nil {
        return fmt.Errorf("failed to subscribe: %w", err)
    }

    log.Printf("Monitoring locks with pattern: %s*", lm.lockPrefix)

    // Start listening for events in a goroutine
    go lm.listen(eventChan)

    return nil
}

// listen processes incoming Pub/Sub messages
func (lm *LockMonitor) listen(eventChan chan<- LockEvent) {
    ch := lm.pubsub.Channel()

    for {
        select {
        case <-lm.ctx.Done():
            return
        case msg := <-ch:
            if msg == nil {
                continue
            }

            // Extract lock name from channel
            // Channel format: __keyspace@0__:lock:resource-name
            parts := strings.SplitN(msg.Channel, ":", 2)
            if len(parts) < 2 {
                continue
            }

            lockName := parts[1]
            eventType := msg.Payload

            event := LockEvent{
                LockName:  lockName,
                EventType: eventType,
                Timestamp: time.Now(),
            }

            select {
            case eventChan <- event:
            default:
                log.Println("Event channel full, dropping event")
            }
        }
    }
}

// Stop shuts down the monitor
func (lm *LockMonitor) Stop() {
    lm.cancel()
    if lm.pubsub != nil {
        lm.pubsub.Close()
    }
    lm.client.Close()
    log.Println("Lock monitor stopped")
}

// AcquireLock attempts to acquire a distributed lock
func (lm *LockMonitor) AcquireLock(name string, ttl time.Duration) (bool, error) {
    key := lm.lockPrefix + name

    // Use SET NX EX for atomic lock acquisition
    result, err := lm.client.SetNX(lm.ctx, key, "locked", ttl).Result()
    if err != nil {
        return false, err
    }
    return result, nil
}

// ReleaseLock releases a distributed lock
func (lm *LockMonitor) ReleaseLock(name string) error {
    key := lm.lockPrefix + name
    return lm.client.Del(lm.ctx, key).Err()
}

func main() {
    monitor := NewLockMonitor("localhost:6379", "lock:")

    // Create a channel to receive lock events
    eventChan := make(chan LockEvent, 100)

    // Start the monitor
    if err := monitor.Start(eventChan); err != nil {
        log.Fatalf("Failed to start monitor: %v", err)
    }

    // Handle events in a separate goroutine
    go func() {
        for event := range eventChan {
            switch event.EventType {
            case "set":
                log.Printf("Lock ACQUIRED: %s at %s", event.LockName, event.Timestamp.Format(time.RFC3339))
            case "del":
                log.Printf("Lock RELEASED: %s at %s", event.LockName, event.Timestamp.Format(time.RFC3339))
            case "expired":
                log.Printf("Lock EXPIRED: %s at %s", event.LockName, event.Timestamp.Format(time.RFC3339))
            default:
                log.Printf("Lock event %s: %s", event.EventType, event.LockName)
            }
        }
    }()

    // Simulate lock operations
    go func() {
        time.Sleep(2 * time.Second)

        // Acquire a lock
        acquired, err := monitor.AcquireLock("resource-1", 5*time.Second)
        if err != nil {
            log.Printf("Error acquiring lock: %v", err)
            return
        }
        if acquired {
            log.Println("Successfully acquired lock:resource-1")
        }

        // Wait and release
        time.Sleep(2 * time.Second)
        monitor.ReleaseLock("resource-1")

        // Acquire another lock that will expire
        monitor.AcquireLock("resource-2", 3*time.Second)
        log.Println("Acquired lock:resource-2 with 3 second TTL")
    }()

    // Wait for shutdown signal
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
    <-sigChan

    monitor.Stop()
}
```

## Key-Space vs Key-Event Channels

Understanding when to use each channel type is important for building efficient notification handlers.

### Key-Space Channels (`__keyspace@<db>__:<key>`)

Use key-space channels when you want to:

- Monitor a specific key or set of keys for any changes
- Track the lifecycle of particular objects
- Debug what operations are happening to specific data

Example scenarios:

```bash
# Monitor a specific user's data
redis-cli SUBSCRIBE '__keyspace@0__:user:12345'

# Monitor all session keys
redis-cli PSUBSCRIBE '__keyspace@0__:session:*'

# Monitor configuration keys
redis-cli PSUBSCRIBE '__keyspace@0__:config:*'
```

The message payload contains the event type (set, del, expire, etc.).

### Key-Event Channels (`__keyevent@<db>__:<event>`)

Use key-event channels when you want to:

- React to a specific type of operation across all keys
- Build event-driven workflows based on operations
- Aggregate statistics about specific events

Example scenarios:

```bash
# React to all key expirations
redis-cli PSUBSCRIBE '__keyevent@0__:expired'

# Track all delete operations
redis-cli PSUBSCRIBE '__keyevent@0__:del'

# Monitor all new key creations
redis-cli PSUBSCRIBE '__keyevent@0__:set'
```

The message payload contains the key name that triggered the event.

### Comparison Table

| Aspect | Key-Space | Key-Event |
|--------|-----------|-----------|
| Best for | Watching specific keys | Watching specific operations |
| Message content | Event type | Key name |
| Pattern example | `__keyspace@0__:user:*` | `__keyevent@0__:expired` |
| Use case | Track user:123 changes | Track all expirations |
| Filtering | Filter by key name | Filter by event type |

## Handling Expiration Events

Key expiration events deserve special attention because of their behavior:

### How Expiration Works

Redis keys can expire in two ways:

1. **Active expiration**: Redis periodically tests random keys with TTL and deletes expired ones
2. **Lazy expiration**: A key is checked and deleted when accessed after expiration

The `expired` event is generated when Redis actually deletes the key, not at the exact moment the TTL reaches zero. This means there can be a small delay between when a key "should" expire and when you receive the notification.

### Important Considerations

```bash
# Enable expiration events
redis-cli CONFIG SET notify-keyspace-events Ex
```

```python
# Python example showing expiration handling
import redis
import time

client = redis.Redis(decode_responses=True)
pubsub = client.pubsub()

# Subscribe to expired events
pubsub.psubscribe('__keyevent@0__:expired')

# Create a key that expires in 5 seconds
client.setex('temp:data', 5, 'some value')

# Note: You cannot retrieve the value of an expired key
# The notification only contains the key name
for message in pubsub.listen():
    if message['type'] == 'pmessage':
        expired_key = message['data']
        print(f"Key expired: {expired_key}")

        # The key no longer exists, so this returns None
        value = client.get(expired_key)
        print(f"Value after expiration: {value}")  # None
```

### Preserving Data Before Expiration

If you need access to the data when a key expires, consider these patterns:

```python
# Pattern 1: Store data in a shadow key
def set_with_shadow(client, key, value, ttl):
    """Store value with a shadow copy that persists after expiration."""
    # Main key with TTL
    client.setex(key, ttl, value)
    # Shadow key without TTL (clean up separately)
    client.set(f"shadow:{key}", value)

# Pattern 2: Use a sorted set for scheduled cleanup
def set_with_scheduled_cleanup(client, key, value, ttl):
    """Store value and schedule for cleanup."""
    expire_at = time.time() + ttl
    client.set(key, value)
    client.expireat(key, int(expire_at))
    # Add to cleanup schedule
    client.zadd('cleanup:schedule', {key: expire_at})

# Pattern 3: Store metadata separately
def set_with_metadata(client, key, value, ttl, metadata):
    """Store value with separate metadata that persists."""
    client.setex(key, ttl, value)
    client.hset(f"meta:{key}", mapping=metadata)
```

## Limitations and Considerations

Before implementing keyspace notifications in production, understand these limitations:

### No Delivery Guarantee

Keyspace notifications use Redis Pub/Sub, which has fire-and-forget semantics:

- If a client is disconnected when an event occurs, the event is lost
- There is no message persistence or replay capability
- No acknowledgment mechanism exists

For critical events, consider these alternatives:

```python
# Use Redis Streams for reliable event delivery
def reliable_key_change(client, key, value, operation):
    """Record key changes to a stream for reliable processing."""
    # Perform the operation
    if operation == 'set':
        client.set(key, value)
    elif operation == 'del':
        client.delete(key)

    # Record to stream for reliable processing
    client.xadd('key-changes', {
        'key': key,
        'operation': operation,
        'timestamp': str(time.time())
    })
```

### Performance Impact

Enabling notifications adds CPU overhead:

- Each notifiable operation generates additional work
- More event types enabled means more overhead
- High-throughput systems should benchmark carefully

Recommendations:

```bash
# Only enable what you need
# Bad: Enable everything
redis-cli CONFIG SET notify-keyspace-events KEA

# Good: Enable only what you actually use
redis-cli CONFIG SET notify-keyspace-events Ex  # Only expirations
```

### Cluster Considerations

In Redis Cluster:

- Notifications are local to each node
- Clients must subscribe to all master nodes
- Key migrations between nodes may produce unexpected events

```python
# Subscribing to all nodes in a cluster
from redis.cluster import RedisCluster

cluster = RedisCluster(host='localhost', port=7000)

# Get all master nodes
for node in cluster.get_primaries():
    # Create a subscriber for each node
    client = redis.Redis(host=node['host'], port=node['port'])
    pubsub = client.pubsub()
    pubsub.psubscribe('__keyevent@0__:expired')
```

### Memory Considerations

Pub/Sub subscribers consume memory for:

- Output buffer for pending messages
- Pattern matching state for PSUBSCRIBE

Monitor client output buffers:

```bash
redis-cli CLIENT LIST
```

Configure buffer limits in redis.conf:

```
client-output-buffer-limit pubsub 32mb 8mb 60
```

### Timing Accuracy

As mentioned earlier:

- Expiration events may be delayed
- Events are generated when the operation completes, not when it's requested
- Network latency adds additional delay

Do not use keyspace notifications for time-critical operations requiring millisecond precision.

## Best Practices

### 1. Use Separate Connections

Always use dedicated connections for Pub/Sub:

```python
# Good: Separate connections
command_client = redis.Redis()  # For commands
pubsub_client = redis.Redis()   # For subscriptions
pubsub = pubsub_client.pubsub()

# Bad: Sharing connection
client = redis.Redis()
pubsub = client.pubsub()  # This blocks the connection
```

### 2. Handle Reconnection

Implement robust reconnection logic:

```python
import time

def subscribe_with_retry(redis_url, pattern, handler, max_retries=5):
    """Subscribe with automatic reconnection."""
    retries = 0

    while retries < max_retries:
        try:
            client = redis.from_url(redis_url)
            pubsub = client.pubsub()
            pubsub.psubscribe(**{pattern: handler})

            # Reset retry counter on successful connection
            retries = 0

            for message in pubsub.listen():
                handler(message)

        except redis.ConnectionError as e:
            retries += 1
            wait_time = min(2 ** retries, 30)  # Exponential backoff
            print(f"Connection lost, retrying in {wait_time}s...")
            time.sleep(wait_time)
        except Exception as e:
            print(f"Unexpected error: {e}")
            raise

    raise Exception("Max retries exceeded")
```

### 3. Filter Events Early

Process only the events you need:

```python
def handle_event(message):
    """Filter events at the handler level."""
    if message['type'] != 'pmessage':
        return

    event = message['data']

    # Only process specific events
    if event not in ('set', 'del', 'expired'):
        return

    # Process the event
    process_key_change(message['channel'], event)
```

### 4. Use Appropriate Patterns

Be specific with subscription patterns to reduce noise:

```bash
# Too broad - receives all events
PSUBSCRIBE '__keyspace@0__:*'

# Better - only user-related keys
PSUBSCRIBE '__keyspace@0__:user:*'

# Best - specific key types
PSUBSCRIBE '__keyspace@0__:user:session:*'
```

### 5. Monitor Subscription Health

Track subscription metrics:

```python
class MonitoredSubscriber:
    def __init__(self):
        self.events_received = 0
        self.last_event_time = None
        self.errors = 0

    def handle_event(self, message):
        self.events_received += 1
        self.last_event_time = time.time()

        try:
            self.process_event(message)
        except Exception as e:
            self.errors += 1
            logging.error(f"Error processing event: {e}")

    def health_check(self):
        return {
            'events_received': self.events_received,
            'last_event_age': time.time() - (self.last_event_time or 0),
            'error_count': self.errors
        }
```

## Conclusion

Redis keyspace notifications provide a powerful mechanism for building event-driven architectures on top of Redis. By subscribing to key-space or key-event channels, you can react to data changes in real-time without polling.

Key takeaways:

- Enable only the notification types you need to minimize overhead
- Use key-space channels to watch specific keys, key-event channels to watch specific operations
- Handle reconnection gracefully since Pub/Sub has no delivery guarantees
- Consider Redis Streams for reliable event delivery in critical scenarios
- Test expiration timing in your environment before relying on it for time-sensitive operations

With proper implementation, keyspace notifications enable powerful patterns like cache invalidation, session management, distributed coordination, and real-time monitoring.
