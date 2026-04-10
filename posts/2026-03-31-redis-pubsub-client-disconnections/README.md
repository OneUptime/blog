# How to Handle Pub/Sub Client Disconnections in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pub/Sub, Reconnection, Resilience, Error Handling, Client, Reliability

Description: Implement robust reconnection logic for Redis Pub/Sub subscribers to survive network interruptions, server restarts, and connection timeouts without missing messages.

---

Redis Pub/Sub is fire-and-forget: messages published while a subscriber is disconnected are permanently lost. This makes reconnection handling critical for any production subscriber. Clients must detect disconnections quickly, reconnect with backoff, and re-subscribe to all channels and patterns to resume receiving messages.

## Why Disconnections Happen

- Redis server restart or failover (Sentinel/Cluster promotion)
- Network partition or load balancer timeout
- Redis server closing idle connections (`timeout` config option)
- Client-side OS TCP keepalive expiry

## Basic Reconnect Loop in Python

```python
import redis
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CHANNELS = ['events:orders', 'events:inventory']
PATTERNS = ['notifications:*']

def handle_message(message):
    logger.info("Received: %s", message)

def subscribe_with_retry(host='localhost', port=6379, max_backoff=60):
    backoff = 1
    while True:
        try:
            r = redis.Redis(host=host, port=port, socket_timeout=5,
                            socket_connect_timeout=5, decode_responses=True)
            pubsub = r.pubsub(ignore_subscribe_messages=True)

            pubsub.subscribe(*CHANNELS)
            pubsub.psubscribe(*PATTERNS)
            logger.info("Subscribed to %s channels, %s patterns", CHANNELS, PATTERNS)
            backoff = 1  # reset on successful connect

            for message in pubsub.listen():
                if message is None:
                    continue
                handle_message(message)

        except redis.ConnectionError as e:
            logger.warning("Connection lost: %s. Retrying in %ds...", e, backoff)
            time.sleep(backoff)
            backoff = min(backoff * 2, max_backoff)
        except Exception as e:
            logger.error("Unexpected error: %s. Retrying in %ds...", e, backoff)
            time.sleep(backoff)
            backoff = min(backoff * 2, max_backoff)

subscribe_with_retry()
```

## Reconnect with Health Check Thread

Use a separate thread to detect stale connections before they cause a long delay:

```python
import redis
import socket
import threading
import time

class ResilientSubscriber:
    def __init__(self, host, port, channels, patterns=None):
        self.host = host
        self.port = port
        self.channels = channels
        self.patterns = patterns or []
        self._lock = threading.Lock()
        self._running = True

    def _connect(self):
        r = redis.Redis(host=self.host, port=self.port,
                        socket_timeout=10, socket_keepalive=True,
                        socket_keepalive_options={
                            socket.TCP_KEEPIDLE: 30,
                            socket.TCP_KEEPINTVL: 10,
                            socket.TCP_KEEPCNT: 3,
                        },
                        decode_responses=True)
        pubsub = r.pubsub(ignore_subscribe_messages=True)
        if self.channels:
            pubsub.subscribe(*self.channels)
        if self.patterns:
            pubsub.psubscribe(*self.patterns)
        return r, pubsub

    def run(self, on_message):
        backoff = 1
        while self._running:
            try:
                r, pubsub = self._connect()
                backoff = 1
                while self._running:
                    message = pubsub.get_message(timeout=1.0)
                    if message:
                        on_message(message)
            except (redis.ConnectionError, redis.TimeoutError) as e:
                print(f"Reconnecting after error: {e}. Backoff: {backoff}s")
                time.sleep(backoff)
                backoff = min(backoff * 2, 60)

    def stop(self):
        self._running = False

sub = ResilientSubscriber('localhost', 6379, ['events:orders'])
threading.Thread(target=sub.run, args=(print,), daemon=True).start()
```

## Node.js: ioredis Auto-Reconnect

`ioredis` reconnects automatically and re-subscribes after reconnection:

```javascript
const Redis = require('ioredis');

const subscriber = new Redis({
  host: 'localhost',
  port: 6379,
  retryStrategy(times) {
    const delay = Math.min(1000 * 2 ** times, 60000);
    console.log(`Reconnecting in ${delay}ms (attempt ${times})`);
    return delay;
  },
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

subscriber.on('connect', () => console.log('Connected to Redis'));
subscriber.on('error', (err) => console.error('Redis error:', err));

subscriber.subscribe('events:orders', 'events:inventory', (err, count) => {
  if (err) console.error('Subscribe failed:', err);
  else console.log(`Subscribed to ${count} channels`);
});

subscriber.on('message', (channel, message) => {
  console.log(`[${channel}] ${message}`);
});
```

## Configure Redis to Detect Dead Connections

```bash
# In redis.conf or via CONFIG SET
redis-cli CONFIG SET tcp-keepalive 60
redis-cli CONFIG SET timeout 0        # don't close idle subscriber connections
```

## Summary

Redis Pub/Sub subscribers must implement reconnection logic because the server does not buffer messages for disconnected clients. Use exponential backoff (capped at 60 seconds), re-subscribe to all channels and patterns on reconnect, and enable TCP keepalive on the connection to detect dead connections quickly. Libraries like `ioredis` handle reconnection automatically; for `redis-py`, implement the retry loop explicitly or use a higher-level wrapper.
