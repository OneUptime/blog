# How to Use CLIENT NO-EVICT in Redis to Protect Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Client, Memory Management, Command, Administration

Description: Learn how to use CLIENT NO-EVICT in Redis to protect specific client connections from being evicted when the server reaches maxmemory limits.

---

## What Is CLIENT NO-EVICT

When Redis runs out of memory (hits `maxmemory`) with a client eviction policy enabled, it may disconnect clients to free memory. `CLIENT NO-EVICT` marks the current client connection as exempt from client eviction, ensuring critical connections like monitoring agents, admin tools, or background jobs are never disconnected due to memory pressure.

```text
CLIENT NO-EVICT ON | OFF
```

- `ON` - protect this client from eviction
- `OFF` - remove protection (default state)

Returns `OK`.

## Background: Client Eviction Policy

Redis 7.0 introduced client eviction via the `maxmemory-clients` setting. When total client memory usage exceeds this limit, Redis evicts the clients using the most memory, except those protected with `CLIENT NO-EVICT ON`.

```bash
# Configure maximum memory for all clients combined
CONFIG SET maxmemory-clients 100mb

# Or as a percentage of maxmemory
# CONFIG SET maxmemory-clients 10%
```

## Basic Usage

```bash
# Mark the current connection as protected
CLIENT NO-EVICT ON
# OK

# Remove protection
CLIENT NO-EVICT OFF
# OK
```

## Verifying Protection Status

Check if a client has no-evict set via `CLIENT INFO` or `CLIENT LIST`:

```bash
CLIENT INFO
# ... flags=e ... (e indicates the client is excluded from eviction)

CLIENT LIST
# id=5 addr=127.0.0.1:54321 ... flags=e ...
```

## Practical Example in Python

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Protect this connection from memory-based eviction
client.client_no_evict('ON')
print("Client protected from eviction")

# Perform critical operations
client.set('critical:flag', 'active')
client.publish('alerts', 'system:health:ok')

# Later, remove protection when done
client.client_no_evict('OFF')
print("Client eviction protection removed")
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

const client = createClient();
await client.connect();

// Protect the monitoring connection
await client.clientNoEvict(true);
console.log('Client protected from eviction');

// This connection is now safe even under memory pressure
const info = await client.clientInfo();
console.log('Client info:', info);

// Remove protection
await client.clientNoEvict(false);
```

## Use Case: Monitoring Agent

A monitoring agent needs to continuously collect metrics even when Redis is under memory pressure:

```python
import redis
import time

class RedisMonitoringAgent:
    def __init__(self, host='localhost', port=6379):
        self.client = redis.Redis(host=host, port=port, decode_responses=True)
        # Protect this monitoring connection immediately
        self.client.client_no_evict('ON')
        print("Monitoring agent connected and protected from eviction")

    def collect_metrics(self):
        """Collect and store Redis metrics."""
        info = self.client.info()

        metrics = {
            'used_memory': info['used_memory'],
            'connected_clients': info['connected_clients'],
            'total_commands_processed': info['total_commands_processed'],
            'keyspace_hits': info['keyspace_hits'],
            'keyspace_misses': info['keyspace_misses'],
        }

        # Store metrics even under memory pressure
        for key, value in metrics.items():
            self.client.hset('metrics:latest', key, value)

        return metrics

    def run(self, interval=30):
        """Run the monitoring loop."""
        while True:
            metrics = self.collect_metrics()
            print(f"Metrics collected: {metrics}")
            time.sleep(interval)

agent = RedisMonitoringAgent()
# agent.run()  # Start the monitoring loop
```

## Use Case: Critical Background Worker

```python
import redis

class CriticalWorker:
    def __init__(self):
        self.redis = redis.Redis(host='localhost', port=6379, decode_responses=True)
        # This worker must never be disconnected
        self.redis.client_no_evict('ON')
        self.redis.client_setname('critical-worker')

    def process_queue(self):
        """Process items from a critical queue without interruption."""
        while True:
            item = self.redis.blpop('critical:queue', timeout=5)
            if item:
                _, task = item
                print(f"Processing critical task: {task}")
                self.handle_task(task)

    def handle_task(self, task):
        """Handle a critical task."""
        self.redis.hset('task:results', task, 'completed')

worker = CriticalWorker()
```

## Checking maxmemory-clients Setting

```bash
# View current client memory limits
CONFIG GET maxmemory-clients

# View memory usage breakdown
MEMORY DOCTOR

# View client memory usage
CLIENT INFO
```

## CLIENT NO-EVICT vs CLIENT NO-TOUCH

`CLIENT NO-EVICT` protects from client-level eviction policy. A related command is `CLIENT NO-TOUCH` which prevents a client's accesses from updating the LRU/LFU clock for keys:

```bash
# Prevent monitoring reads from affecting key eviction order
CLIENT NO-TOUCH ON
```

This is useful for monitoring connections that read many keys but should not affect which keys are considered "recently used" for LRU eviction.

## Memory Considerations

Protected clients still use memory. If too many clients are marked as no-evict:
- Redis cannot free memory through client eviction
- The server may hit `maxmemory` limits more aggressively
- Use `CLIENT NO-EVICT` only for genuinely critical connections

## Summary

`CLIENT NO-EVICT ON` marks the current Redis connection as exempt from client eviction when the server reaches memory limits configured via `maxmemory-clients`. Use it for monitoring agents, admin tools, and critical background workers that must remain connected even during high memory pressure, but apply it sparingly to avoid undermining Redis's ability to manage memory through client eviction.
