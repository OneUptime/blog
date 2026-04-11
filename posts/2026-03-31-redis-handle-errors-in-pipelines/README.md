# How to Handle Errors in Redis Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Pipeline, Error Handling, Reliability

Description: Handle per-command errors in Redis pipelines correctly, distinguishing between command-level failures and connection errors that abort the entire batch.

---

Redis pipelines return one response per command. When a command fails inside a pipeline, it does not abort the other commands - you must inspect each response individually. Note that Redis MULTI/EXEC transactions behave the same way for runtime errors (like WRONGTYPE) - they also do not roll back. The difference is that syntax errors detected during the queuing phase will cause a transaction to be discarded entirely, while pipelines have no such queuing phase.

## How Pipeline Errors Work

In a pipeline, each command executes independently. A type error on one command does not prevent others from running:

```bash
# In a pipeline:
SET mystring "hello"   -> OK
INCR mystring          -> ERROR: WRONGTYPE
SET anotherkey "world" -> OK
```

All three responses are returned. The `INCR` error is returned as an error object in the results array, not raised as an exception at execute time.

## Python - redis-py Error Handling

```python
import redis

r = redis.Redis(decode_responses=True)
pipe = r.pipeline(transaction=False)

pipe.set("name", "Alice")
pipe.incr("name")       # This will fail (name is a string)
pipe.set("count", "1")

results = pipe.execute(raise_on_error=False)
# [True, ResponseError("WRONGTYPE..."), True]

for i, result in enumerate(results):
    if isinstance(result, redis.ResponseError):
        print(f"Command {i} failed: {result}")
    else:
        print(f"Command {i} succeeded: {result}")
```

With `raise_on_error=True` (the default):

```python
try:
    results = pipe.execute()  # raises on first error
except redis.ResponseError as e:
    print(f"Pipeline error: {e}")
    # But you do NOT know which command failed or whether others succeeded
```

Always use `raise_on_error=False` when you need to process partial results.

## Go - go-redis Error Handling

```go
ctx := context.Background()
rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})

pipe := rdb.Pipeline()
setCmd := pipe.Set(ctx, "name", "Alice", 0)
incrCmd := pipe.Incr(ctx, "name")  // will fail
setCmd2 := pipe.Set(ctx, "count", 1, 0)

_, _ = pipe.Exec(ctx)  // Exec returns first error, but all commands ran

if err := setCmd.Err(); err != nil {
    fmt.Println("set failed:", err)
}
if err := incrCmd.Err(); err != nil {
    fmt.Println("incr failed:", err)  // prints WRONGTYPE error
}
if err := setCmd2.Err(); err != nil {
    fmt.Println("set2 failed:", err)
}
fmt.Println("set2 val:", setCmd2.Val()) // "OK"
```

## Node.js - ioredis Error Handling

```javascript
const pipeline = client.pipeline();
pipeline.set("name", "Alice");
pipeline.incr("name");         // will fail
pipeline.set("count", "1");

const results = await pipeline.exec();
// results: [[null, "OK"], [Error("WRONGTYPE..."), null], [null, "OK"]]

results.forEach(([err, result], i) => {
  if (err) {
    console.error(`Command ${i} failed: ${err.message}`);
  } else {
    console.log(`Command ${i} succeeded: ${result}`);
  }
});
```

## Java - Jedis Error Handling

```java
Pipeline pipeline = jedis.pipelined();
pipeline.set("name", "Alice");
pipeline.incr("name");  // will fail
pipeline.set("count", "1");

List<Object> responses = pipeline.syncAndReturnAll();
for (int i = 0; i < responses.size(); i++) {
    Object resp = responses.get(i);
    if (resp instanceof JedisDataException) {
        System.out.println("Command " + i + " failed: " + resp);
    } else {
        System.out.println("Command " + i + " succeeded: " + resp);
    }
}
```

## Connection Errors vs Command Errors

Command errors are per-response. Connection errors abort the entire pipeline:

```python
import redis

r = redis.Redis(host="localhost", port=6379)
pipe = r.pipeline(transaction=False)

for i in range(100):
    pipe.set(f"key:{i}", i)

try:
    results = pipe.execute(raise_on_error=False)
except redis.ConnectionError as e:
    # Entire batch failed - none or only partial commands were sent
    print(f"Connection lost: {e}. Retry entire batch.")
except redis.TimeoutError as e:
    print(f"Timeout: {e}. Some commands may have executed.")
```

## Building a Safe Pipeline Executor

```python
def safe_pipeline_execute(r, commands):
    """
    Execute pipeline commands and return (successes, failures).
    commands: list of (method_name, *args) tuples
    """
    pipe = r.pipeline(transaction=False)
    for method, *args in commands:
        getattr(pipe, method)(*args)

    try:
        results = pipe.execute(raise_on_error=False)
    except redis.ConnectionError as e:
        return [], [(i, e) for i in range(len(commands))]  # all failed

    successes = []
    failures = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            failures.append((i, result))
        else:
            successes.append((i, result))
    return successes, failures
```

## Summary

Redis pipeline errors are per-command - a failed command does not cancel others. Always use `raise_on_error=False` (Python) or inspect each response individually (Go, Node.js, Java) to handle partial failures correctly. Distinguish between per-command `ResponseError` objects and connection-level errors that abort the entire batch, and build retry logic accordingly.
