# How to Call Functions with FCALL in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, FCALL, Function, Redis 7, Scripting, Lua

Description: Learn how to call Redis Function libraries using FCALL, pass keys and arguments correctly, handle errors, and use FCALL in different client libraries.

---

## FCALL Syntax

`FCALL` is the command used to invoke registered Redis Functions (introduced in Redis 7.0). The syntax mirrors `EVAL`:

```bash
FCALL function_name numkeys [key [key ...]] [arg [arg ...]]
```

- `function_name` - the name passed to `redis.register_function`
- `numkeys` - number of key arguments that follow
- `key ...` - key arguments, received as the first parameter (`keys[1]`, `keys[2]`, etc.) of the Lua callback
- `arg ...` - additional arguments, received as the second parameter (`args[1]`, `args[2]`, etc.) of the Lua callback

## Calling a Function from redis-cli

Given a function `greet` registered in library `mylib`:

```bash
redis-cli FCALL greet 0 "World"
# Returns: "Hello, World!"
```

A function that writes a key:

```bash
redis-cli FCALL setex_if_new 1 user:session:abc token123 3600
# numkeys=1, key=user:session:abc, args=token123 3600
```

## Calling FCALL from Python (redis-py)

```python
import redis

r = redis.Redis(host='localhost', port=6379)

# FCALL with 1 key and 2 args
result = r.fcall('setex_if_new', 1, 'user:session:abc', 'token123', '3600')
print(result)  # 1 (set) or 0 (already existed)

# FCALL with 0 keys
result = r.fcall('get_server_time', 0)
print(result)

# FCALL with multiple keys
result = r.fcall('atomic_swap', 2, 'key1', 'key2')
```

## Calling FCALL from Node.js (ioredis)

```javascript
const Redis = require('ioredis');
const client = new Redis({ host: 'localhost', port: 6379 });

// fcall(functionName, numkeys, ...args)
const result = await client.fcall('setex_if_new', 1, 'user:session:abc', 'token123', '3600');
console.log(result); // 1 or 0

// Zero keys example
const time = await client.fcall('get_server_time', 0);
console.log(time);
```

## Calling FCALL from Go (go-redis)

```go
package main

import (
    "context"
    "fmt"
    "github.com/redis/go-redis/v9"
)

func main() {
    ctx := context.Background()
    rdb := redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })

    // FCALL setex_if_new 1 mykey myvalue 3600
    result, err := rdb.FCall(ctx, "setex_if_new", []string{"mykey"}, "myvalue", "3600").Int()
    if err != nil {
        panic(err)
    }
    fmt.Printf("Result: %d\n", result)
}
```

## Error Handling

If the function name does not match any registered function:

```text
ERR Function not found
```

Handle in Python:

```python
from redis.exceptions import ResponseError

try:
    result = r.fcall('my_function', 1, 'key', 'arg1')
except ResponseError as e:
    if 'Function not found' in str(e):
        # Load the library and retry
        load_library(r)
        result = r.fcall('my_function', 1, 'key', 'arg1')
    else:
        raise
```

## FCALL in Redis Cluster

In Redis Cluster, `FCALL` must follow the same slot rules as regular commands. All keys must belong to the same hash slot. If your function uses multiple keys, use hash tags to co-locate them:

```bash
# Both keys in the same slot via hash tag {user:123}
FCALL transfer_points 2 "{user:123}:points" "{user:123}:history" 50
```

Functions are replicated from masters to their replicas automatically. However, in a Redis Cluster you must load the library on each master node separately - this is not handled automatically by the cluster.

## Passing Complex Arguments

FCALL arguments are always strings. For complex data, serialize to JSON in the client and deserialize in Lua:

```lua
-- In the function library
redis.register_function('batch_set', function(keys, args)
    -- args[1] is a JSON string of key-value pairs
    -- Redis includes cjson as a built-in Lua library
    local data = cjson.decode(args[1])
    local ttl = tonumber(args[2])

    for k, v in pairs(data) do
        redis.call('SET', k, v, 'EX', ttl)
    end
    return #data
end)
```

```python
import json

payload = json.dumps({'key1': 'val1', 'key2': 'val2'})
result = r.fcall('batch_set', 0, payload, '3600')
```

## Listing Available Functions

```bash
redis-cli FUNCTION LIST WITHCODE
```

To list only function names:

```python
libraries = r.function_list()
for lib in libraries:
    print(f"Library: {lib['library_name']}")
    for fn in lib['functions']:
        print(f"  - {fn['name']}: {fn.get('description', 'no description')}")
```

## Summary

`FCALL` is the standard way to invoke Redis Functions, with syntax similar to `EVAL` but using a function name instead of a script body. Keys and args are passed positionally and received as the two parameters (`keys` and `args`) of the Lua callback function. Unlike EVALSHA, functions require no SHA management or NOSCRIPT error handling - they are persistent and available after restart. In Redis Cluster, ensure all keys in a function use the same hash slot.
