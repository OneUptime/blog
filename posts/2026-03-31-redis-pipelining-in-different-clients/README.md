# How to Implement Pipelining in Different Redis Clients

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pipeline, Client, Performance

Description: Implement Redis pipelining in Python, Node.js, Go, and Java clients with working examples and notes on client-specific behavior differences.

---

Redis pipelining sends multiple commands in a single network round trip without waiting for individual responses. Most Redis clients implement pipelining differently - here is how to use it in the most common ones.

## Python - redis-py

```python
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# Create a pipeline (transaction=True by default, disabled here)
pipe = r.pipeline(transaction=False)

for i in range(1000):
    pipe.set(f"key:{i}", f"value:{i}")

# All 1000 SET commands sent in batched network writes
results = pipe.execute()
print(f"All succeeded: {all(r == True for r in results)}")

# Chaining syntax
result = (
    r.pipeline(transaction=False)
    .set("a", 1)
    .set("b", 2)
    .get("a")
    .execute()
)
print(result)  # [True, True, "1"]
```

## Node.js - ioredis

```javascript
const Redis = require("ioredis");
const client = new Redis();

// Manual pipeline
const pipeline = client.pipeline();
for (let i = 0; i < 1000; i++) {
  pipeline.set(`key:${i}`, `value:${i}`);
}
const results = await pipeline.exec();
// results: [[null, "OK"], [null, "OK"], ...]

// Auto-pipelining (ioredis specific, must opt in)
const autoClient = new Redis({ enableAutoPipelining: true });
// Commands issued in the same event loop tick are auto-batched
const [r1, r2] = await Promise.all([
  autoClient.set("foo", "1"),
  autoClient.set("bar", "2"),
]);
```

## Node.js - node-redis (v4+)

```javascript
import { createClient } from "redis";
const client = await createClient().connect();

// Pipeline without MULTI/EXEC using execAsPipeline()
const results = await client
  .multi()
  .set("key1", "val1")
  .set("key2", "val2")
  .get("key1")
  .execAsPipeline();

console.log(results); // ["OK", "OK", "val1"]
```

## Go - go-redis

```go
package main

import (
    "context"
    "fmt"
    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

    pipe := rdb.Pipeline()
    for i := 0; i < 1000; i++ {
        pipe.Set(ctx, fmt.Sprintf("key:%d", i), fmt.Sprintf("value:%d", i), 0)
    }
    _, err := pipe.Exec(ctx)
    if err != nil {
        panic(err)
    }

    // Pipelined helper
    _, err = rdb.Pipelined(ctx, func(p redis.Pipeliner) error {
        p.Get(ctx, "key:0")
        p.Get(ctx, "key:1")
        return nil
    })
}
```

## Java - Jedis

```java
import redis.clients.jedis.Jedis;
import redis.clients.jedis.Pipeline;

Jedis jedis = new Jedis("localhost", 6379);
Pipeline pipeline = jedis.pipelined();

for (int i = 0; i < 1000; i++) {
    pipeline.set("key:" + i, "value:" + i);
}

// syncAndReturnAll() flushes and reads all responses
java.util.List<Object> responses = pipeline.syncAndReturnAll();
System.out.println("Total responses: " + responses.size());
jedis.close();
```

## Java - Lettuce

```java
import io.lettuce.core.RedisClient;
import io.lettuce.core.api.async.RedisAsyncCommands;

RedisClient client = RedisClient.create("redis://localhost");
var conn = client.connect();
RedisAsyncCommands<String, String> async = conn.async();
conn.setAutoFlushCommands(false);  // manual flush mode

for (int i = 0; i < 1000; i++) {
    async.set("key:" + i, "value:" + i);
}
conn.flushCommands();  // send all buffered commands
```

## Client Behavior Differences

```text
Client       Auto-pipeline   Batch size   Transaction default
redis-py     No              Unlimited    Yes (default)
ioredis      Yes (opt-in)    Event tick   No
node-redis   No              Unlimited    No (execAsPipeline)
go-redis     No              Unlimited    No
Jedis        No              Unlimited    No
Lettuce      No (manual)     Manual       No
```

## Summary

All major Redis clients support pipelining, but the API differs. redis-py and go-redis use explicit pipeline objects, ioredis can auto-pipeline commands issued in the same event loop tick, and Lettuce requires manual flush control. In all cases, disable per-command flushing and batch at least 50-100 commands together to see meaningful throughput gains.
