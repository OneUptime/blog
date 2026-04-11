# How to Use Read-Only Functions with FCALL_RO in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, FCALL_RO, Function, Read-Only, Replica, Redis 7

Description: Use FCALL_RO to execute read-only Redis Functions on replicas and read-only nodes, improving scalability without risking accidental writes.

---

## What is FCALL_RO

`FCALL_RO` is a variant of `FCALL` that executes a Redis Function in read-only mode. It is designed for:

- Routing read-only function calls to replicas to distribute load
- Preventing accidental writes from functions that should only read
- Running functions on nodes with `replica-read-only yes`

If a function called via `FCALL_RO` attempts any write command (`SET`, `DEL`, `INCR`, etc.), Redis returns an error:

```text
ERR Write commands are not allowed from read-only scripts.
```

## Step 1 - Register a Read-Only Function

Mark a function as read-only using the `no-writes` flag:

```lua
#!lua name=readlib

redis.register_function{
    function_name = 'get_user_summary',
    callback = function(keys, args)
        local user_key = keys[1]
        local name = redis.call('HGET', user_key, 'name')
        local score = redis.call('HGET', user_key, 'score')
        local rank = redis.call('ZRANK', 'leaderboard', user_key)
        return {name, score, rank}
    end,
    description = 'Get a user summary including name, score, and rank',
    flags = { 'no-writes' }
}

redis.register_function{
    function_name = 'search_keys',
    callback = function(keys, args)
        local pattern = args[1]
        local limit = tonumber(args[2]) or 100
        local results = {}
        local cursor = 0
        local count = 0

        repeat
            local res = redis.call('SCAN', cursor, 'MATCH', pattern, 'COUNT', 50)
            cursor = tonumber(res[1])
            for _, key in ipairs(res[2]) do
                if count < limit then
                    table.insert(results, key)
                    count = count + 1
                end
            end
        until cursor == 0 or count >= limit

        return results
    end,
    flags = { 'no-writes' }
}
```

Load the library:

```bash
cat readlib.lua | redis-cli -x FUNCTION LOAD
```

## Step 2 - Call with FCALL_RO

```bash
# Call read-only function on a replica
redis-cli -h replica-host -p 6379 FCALL_RO get_user_summary 1 user:123
```

On a replica with `replica-read-only yes`, `FCALL` is rejected because Redis classifies it as a write command, regardless of what the function actually does. `FCALL_RO` is the read-only variant that is allowed on replicas, provided the function has the `no-writes` flag.

## Step 3 - Using FCALL_RO from Python

```python
import redis

primary = redis.Redis(host='redis-primary', port=6379)
replica = redis.Redis(host='redis-replica', port=6379)

# Read-only call on replica for scalability
user_data = replica.fcall_ro('get_user_summary', 1, 'user:123')
name, score, rank = user_data
print(f"User: {name}, Score: {score}, Rank: {rank}")

# Write operations still go to primary
primary.hset('user:123', mapping={'name': 'Alice', 'score': '1500'})
primary.zadd('leaderboard', {'user:123': 1500})
```

## Step 4 - Using FCALL_RO from Node.js

```javascript
const Redis = require('ioredis');

const primary = new Redis({ host: 'redis-primary', port: 6379 });
const replica = new Redis({ host: 'redis-replica', port: 6379 });

// Route read-only calls to replica
async function getUserSummary(userId) {
    const result = await replica.fcall_ro('get_user_summary', 1, `user:${userId}`);
    return {
        name: result[0],
        score: result[1],
        rank: result[2]
    };
}

const summary = await getUserSummary('123');
console.log(summary);
```

## Step 5 - FCALL_RO in Redis Cluster

In Redis Cluster, `FCALL_RO` respects the `READONLY` mode for replica nodes. To use `FCALL_RO` on cluster replica nodes, enable replica reads in your client:

```python
from redis.cluster import RedisCluster

rc = RedisCluster(
    host='redis-node1',
    port=6379,
    read_from_replicas=True
)

# FCALL_RO will be routed to replica nodes
result = rc.fcall_ro('get_user_summary', 1, 'user:123')
```

## Step 6 - Verify a Function is Read-Only

```bash
redis-cli FUNCTION LIST
```

Check the `flags` field in the output:

```text
5) "flags"
6) 1) "no-writes"
```

If `no-writes` is present, the function can be called with `FCALL_RO`.

## Step 7 - What Happens if a no-writes Function Tries to Write

If a function with `no-writes` flag tries to write anyway:

```lua
redis.register_function{
    function_name = 'bad_readonly',
    callback = function(keys, args)
        -- This will fail when called via FCALL_RO
        redis.call('SET', keys[1], args[1])
        return 1
    end,
    flags = { 'no-writes' }
}
```

```bash
redis-cli FCALL_RO bad_readonly 1 mykey myvalue
# Error: ERR Write commands are not allowed from read-only scripts.
```

The `no-writes` flag is enforced at execution time regardless of whether you use FCALL or FCALL_RO.

## Summary

`FCALL_RO` enables Redis Functions to be called on replica nodes and read-only connections by restricting execution to functions marked with the `no-writes` flag. Register read-only functions with `flags = { 'no-writes' }`, then use `FCALL_RO` in read paths to distribute read load across replicas without risking accidental writes. In Redis Cluster, combine `FCALL_RO` with `read_from_replicas=True` for seamless replica routing.
