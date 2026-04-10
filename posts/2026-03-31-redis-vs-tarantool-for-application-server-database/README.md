# Redis vs Tarantool for Application Server and Database

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Tarantool, In-Memory Database, Comparison, Application Server, Lua

Description: Compare Redis and Tarantool for use as a combined application server and in-memory database - covering Lua stored procedures, secondary indexes, and ACID transactions.

---

Tarantool is a unique system that combines an in-memory database with a Lua application server in a single process. Redis is a well-established in-memory data store. When you need stored procedures, secondary indexes, or ACID transactions alongside a cache, Tarantool deserves a look.

## Redis: Data Store with Scripting

Redis is a data store first. Lua scripting is available via EVAL but is intentionally limited - scripts run atomically and block the server:

```lua
-- Redis Lua script: atomic get-and-update
local val = redis.call('GET', KEYS[1])
if val then
    redis.call('INCR', KEYS[1] .. ':hits')
    return val
else
    redis.call('SET', KEYS[1], ARGV[1])
    return ARGV[1]
end
```

```bash
redis-cli EVAL "$(cat script.lua)" 1 "cache:key" "default-value"
```

Redis does not support secondary indexes natively - you maintain them manually with sorted sets or sets as indexes.

## Tarantool: Application Server + Database

Tarantool runs Lua business logic in the same process as the data engine. Stored procedures are first-class citizens:

```lua
-- app.lua
box.cfg{ listen = 3301 }

-- Define a space (table)
local users = box.schema.space.create('users', { if_not_exists = true })
users:format({
    { name = 'id',    type = 'unsigned' },
    { name = 'email', type = 'string'   },
    { name = 'score', type = 'number'   },
})

-- Primary index
users:create_index('primary', { parts = {'id'}, if_not_exists = true })

-- Secondary index for email lookup
users:create_index('email_idx', { parts = {'email'}, if_not_exists = true })

-- Stored procedure
box.schema.func.create('get_or_create_user', { if_not_exists = true })
function get_or_create_user(id, email)
    local existing = box.space.users:get(id)
    if existing then
        return existing
    end
    return box.space.users:insert({ id, email, 0 })
end
```

Calling from a client:

```python
import tarantool

conn = tarantool.connect("localhost", 3301)

# Call a stored procedure
result = conn.call("get_or_create_user", 42, "alice@example.com")
print(result)

# Direct space operations
conn.insert("users", [43, "bob@example.com", 100])
results = conn.select("users", "bob@example.com", index="email_idx")
```

## ACID Transactions

Tarantool supports multi-statement ACID transactions:

```lua
box.begin()
local ok, err = pcall(function()
    box.space.accounts:update(1, {{'-', 'balance', 100}})
    box.space.accounts:update(2, {{'+', 'balance', 100}})
end)
if ok then
    box.commit()
else
    box.rollback()
    error(err)
end
```

Redis's MULTI/EXEC batches commands atomically but provides no rollback on individual command failure:

```bash
MULTI
DECRBY account:1 100
INCRBY account:2 100
EXEC
```

If `DECRBY` fails due to wrong type, `INCRBY` still runs - there is no atomicity across errors.

## Comparison Table

| Feature | Redis | Tarantool |
|---------|-------|-----------|
| Application server | No (external) | Yes (embedded Lua) |
| Secondary indexes | Manual (sorted sets) | Built-in |
| ACID transactions | MULTI/EXEC (no rollback) | Full ACID |
| Stored procedures | Limited Lua (EVAL) | Full Lua co-routines |
| Query language | Commands only | Lua API + SQL (native) |
| Replication | Master-replica, Cluster | Async + synchronous |
| Ecosystem | Very large | Smaller (Russia-origin) |
| Ops complexity | Low | Medium |
| Best for | Cache, queues, sessions | Stateful app logic + data |

## When to Use Redis

- Caching, session storage, rate limiting, pub/sub.
- Your business logic lives in application code (Go, Python, Node.js).
- You need a large ecosystem of client libraries and managed services.

## When to Use Tarantool

- You want to co-locate data and business logic in Lua for minimum latency.
- Your workload requires secondary indexes and ACID transactions without external middleware.
- Low-latency financial transactions or game servers where round-trip cost matters.

## Summary

Redis excels as an external in-memory data store that any language can use. Tarantool is for teams that want to push business logic into the data layer using Lua stored procedures, benefit from native secondary indexes, and need real ACID transactions - at the cost of a smaller ecosystem and a Lua-centric programming model.
