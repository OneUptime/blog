# How to Handle Client Disconnections in Redis Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pub/Sub, Disconnection, Reconnection, Reliability, Messaging

Description: Handle Redis Pub/Sub client disconnections gracefully with reconnection logic, message replay strategies, and health check patterns.

---

## The Disconnection Problem in Pub/Sub

Redis Pub/Sub is fire-and-forget with no persistence. When a subscriber disconnects - even briefly - all messages published during the outage are permanently lost. This is the fundamental trade-off of Pub/Sub vs. Streams.

Disconnections occur due to:

- Network interruptions
- Redis server restarts
- Client-side timeouts
- Idle connection closure by firewalls/load balancers
- Client buffer overflow

## Step 1 - Detect Disconnections

Most Redis client libraries emit an error or callback when the connection drops. In redis-py:

```python
import redis
import logging

r = redis.Redis(host='localhost', port=6379)
pubsub = r.pubsub()
pubsub.subscribe('mychannel')

try:
    for message in pubsub.listen():
        if message['type'] == 'message':
            process(message['data'])
except redis.exceptions.ConnectionError as e:
    logging.error(f"Disconnected from Redis: {e}")
```

If the connection drops during iteration, `pubsub.listen()` raises a `redis.exceptions.ConnectionError`.

## Step 2 - Implement Reconnection with Retry

```python
import redis
import time
import logging
from redis.exceptions import ConnectionError, TimeoutError

def subscribe_with_retry(channel, handler, max_retries=None):
    retries = 0
    while max_retries is None or retries < max_retries:
        try:
            r = redis.Redis(host='localhost', port=6379)
            pubsub = r.pubsub()
            pubsub.subscribe(channel)
            logging.info(f"Subscribed to {channel}")
            retries = 0  # Reset on successful connection

            for message in pubsub.listen():
                if message['type'] == 'message':
                    handler(message['data'])

        except (ConnectionError, TimeoutError) as e:
            retries += 1
            wait = min(2 ** retries, 30)  # Exponential backoff, max 30s
            logging.warning(f"Connection lost ({e}). Reconnecting in {wait}s...")
            time.sleep(wait)
        except Exception as e:
            logging.error(f"Unexpected error: {e}")
            raise

def handle_message(data):
    print(f"Received: {data}")

subscribe_with_retry('mychannel', handle_message)
```

## Step 3 - Use run_in_thread with Auto-Reconnect

redis-py's `run_in_thread` has a built-in reconnection mechanism:

```python
import redis

r = redis.Redis(host='localhost', port=6379)
pubsub = r.pubsub()

def message_handler(message):
    print(f"Received: {message['data']}")

def error_handler(e):
    print(f"Error: {e}")

pubsub.subscribe(**{'mychannel': message_handler})

# daemon=True means the thread stops when the main program exits
thread = pubsub.run_in_thread(
    sleep_time=0.001,
    daemon=True,
    exception_handler=error_handler
)
```

The thread automatically reconnects and re-subscribes on connection failures.

## Step 4 - ioredis Auto-Reconnect (Node.js)

ioredis reconnects automatically by default:

```javascript
const Redis = require('ioredis');

const subscriber = new Redis({
    host: 'localhost',
    port: 6379,
    retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        console.log(`Reconnecting in ${delay}ms...`);
        return delay;
    },
    maxRetriesPerRequest: null  // Unlimited retries for subscribe commands
});

subscriber.on('connect', () => {
    console.log('Connected to Redis');
    // Re-subscribe after reconnection
    subscriber.subscribe('mychannel');
});

subscriber.on('message', (channel, message) => {
    console.log(`${channel}: ${message}`);
});

subscriber.on('error', (err) => {
    console.error(`Redis error: ${err}`);
});
```

## Step 5 - Send Health Check Pings

Keep the connection alive by sending periodic pings. This prevents idle connection timeouts from firewalls:

```python
import redis
import threading
import time

r = redis.Redis(host='localhost', port=6379)
pubsub = r.pubsub()
pubsub.subscribe('mychannel')

def keepalive():
    while True:
        try:
            pubsub.ping()
        except Exception:
            pass
        time.sleep(30)

# Run keepalive in background
threading.Thread(target=keepalive, daemon=True).start()

for message in pubsub.listen():
    if message['type'] == 'message':
        process(message['data'])
```

## Step 6 - Log Missed Messages

Since Pub/Sub has no replay, track message timestamps in your application to detect gaps:

```python
last_message_time = time.time()

def handle_message(message):
    global last_message_time
    now = time.time()
    gap = now - last_message_time

    if gap > 60:  # If gap > 60 seconds, we may have missed messages
        logging.warning(f"Possible message gap: {gap:.1f}s since last message")

    last_message_time = now
    process(message['data'])
```

## Step 7 - Consider Redis Streams for Durability

If message loss during disconnections is unacceptable, migrate to Redis Streams which persist messages and allow replay from the last processed ID:

```python
# Streams remember where you left off
messages = r.xreadgroup(
    groupname='myservice',
    consumername='worker-1',
    streams={'mychannel': '>'},
    block=2000
)
```

## Summary

Redis Pub/Sub has no persistence, so messages sent during a subscriber's disconnection are lost. Implement exponential backoff reconnection loops, use `run_in_thread` with `exception_handler` for background subscription, and send periodic pings to prevent idle connection drops. If message loss is unacceptable for your use case, migrate to Redis Streams which provide replay capability and consumer group offset tracking.
