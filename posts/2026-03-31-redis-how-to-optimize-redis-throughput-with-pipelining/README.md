# How to Optimize Redis Throughput with Pipelining

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Performance, Pipelining, Throughput, Optimization

Description: Learn how Redis pipelining batches commands to eliminate round-trip overhead, dramatically improving throughput for write-heavy and bulk-operation workloads.

---

## The Round-Trip Problem

Every Redis command normally requires a full network round trip: the client sends a command, waits for the server response, then sends the next command. On a LAN with 0.5ms round-trip time, sending 1,000 commands sequentially takes at least 500ms just in network overhead - even if each command executes in 10 microseconds.

Pipelining solves this by sending multiple commands without waiting for intermediate responses, then reading all responses at once.

## How Pipelining Works

Without pipelining (sequential):
```text
Client -> SET key1 value1 -> Server
Client <- OK               <- Server
Client -> SET key2 value2 -> Server
Client <- OK               <- Server
... (N round trips)
```

With pipelining:
```text
Client -> SET key1 value1
         SET key2 value2
         SET key3 value3  -> Server (1 write syscall)
Client <-  OK
           OK
           OK             <- Server (1 read syscall)
```

## Pipelining with redis-cli

```bash
# Pipe commands from a file
redis-cli --pipe < commands.txt

# Generate and pipe commands inline
(for i in $(seq 1 10000); do echo "SET key:$i value:$i"; done) | redis-cli --pipe
```

Output:
```text
All data transferred. Waiting for the last reply...
Last reply received from server.
errors: 0, replies: 10000
```

## Pipelining in Python with redis-py

```python
import redis
import time

r = redis.StrictRedis(host='localhost', port=6379, decode_responses=True)

# Without pipelining
start = time.time()
for i in range(10000):
    r.set(f'key:{i}', f'value:{i}')
print(f"Sequential: {time.time() - start:.3f}s")

# With pipelining
start = time.time()
pipe = r.pipeline(transaction=False)
for i in range(10000):
    pipe.set(f'key:{i}', f'value:{i}')
pipe.execute()
print(f"Pipelined: {time.time() - start:.3f}s")
```

Typical results:
```text
Sequential: 2.847s
Pipelined: 0.156s
```

## Batching Large Pipelines

For very large datasets, break pipelines into manageable batches to avoid buffering too much data in memory:
```python
import redis

r = redis.StrictRedis(host='localhost', port=6379, decode_responses=True)

def bulk_insert(data: dict, batch_size: int = 1000):
    items = list(data.items())
    total = 0
    for i in range(0, len(items), batch_size):
        pipe = r.pipeline(transaction=False)
        for key, value in items[i:i + batch_size]:
            pipe.set(key, value, ex=3600)
        results = pipe.execute()
        total += len(results)
    return total

# Insert 100,000 items in batches of 1,000
data = {f'user:{i}': f'{{"id":{i},"name":"User{i}"}}' for i in range(100000)}
inserted = bulk_insert(data, batch_size=1000)
print(f"Inserted {inserted} keys")
```

## Pipelining in Node.js with ioredis

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function benchmarkPipelining() {
  const N = 10000;

  // Sequential
  let start = Date.now();
  for (let i = 0; i < N; i++) {
    await redis.set(`key:${i}`, `value:${i}`);
  }
  console.log(`Sequential: ${Date.now() - start}ms`);

  // Pipelined
  start = Date.now();
  const pipeline = redis.pipeline();
  for (let i = 0; i < N; i++) {
    pipeline.set(`key:${i}`, `value:${i}`);
  }
  await pipeline.exec();
  console.log(`Pipelined: ${Date.now() - start}ms`);
}

benchmarkPipelining().then(() => redis.quit());
```

## Pipelining in Go with go-redis

```go
package main

import (
    "context"
    "fmt"
    "time"
    "github.com/redis/go-redis/v9"
)

func main() {
    rdb := redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })
    ctx := context.Background()

    // Pipelined writes
    start := time.Now()
    pipe := rdb.Pipeline()
    for i := 0; i < 10000; i++ {
        pipe.Set(ctx, fmt.Sprintf("key:%d", i), fmt.Sprintf("value:%d", i), 0)
    }
    _, err := pipe.Exec(ctx)
    if err != nil {
        panic(err)
    }
    fmt.Printf("Pipelined 10000 writes: %v\n", time.Since(start))
}
```

## Pipelining vs Transactions (MULTI/EXEC)

| Feature | Pipeline | MULTI/EXEC |
|---------|----------|------------|
| Atomicity | No | Yes |
| Error handling | Per-command errors | Per-command errors (no rollback) |
| RTT reduction | Yes | Yes (1 RTT) |
| Watch support | No | Yes (WATCH) |

Use pipelining when you need throughput and don't need atomicity. Use MULTI/EXEC when you need atomic execution (all commands run sequentially without interleaving). Note that MULTI/EXEC does not provide rollback - if a command fails at runtime, the other commands still execute.

## Combining Pipelining with Read Operations

Pipelines can mix reads and writes - results come back in order:
```python
import redis

r = redis.StrictRedis(host='localhost', port=6379, decode_responses=True)

# Set some initial data
r.mset({'user:1': 'Alice', 'user:2': 'Bob', 'user:3': 'Charlie'})

# Pipeline mixed reads and writes
pipe = r.pipeline(transaction=False)
pipe.get('user:1')
pipe.set('user:4', 'Dave')
pipe.get('user:2')
pipe.incr('counter')
results = pipe.execute()

# Results in order: [value_of_user1, True, value_of_user2, new_counter_value]
print(results)  # ['Alice', True, 'Bob', 1]
```

## Summary

Redis pipelining reduces the round-trip cost of bulk operations from O(N) network round trips to O(1), delivering 10x-50x throughput improvements for write-heavy workloads. Use it for bulk inserts, cache warming, and any scenario where you need to send many commands in sequence. Batch large pipelines into chunks of 500-2000 commands to keep memory usage manageable.
