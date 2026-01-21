# How to Use Redis Functions (Redis 7.0+)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Functions, Lua, Redis 7.0, Scripting, Backend, Database

Description: A comprehensive guide to using Redis Functions introduced in Redis 7.0, covering function libraries, persistent server-side functions, and how they compare to traditional Lua scripts.

---

Redis 7.0 introduced Redis Functions, a new way to manage and execute server-side logic that addresses many limitations of traditional Lua scripts. This guide covers everything you need to know about Redis Functions, from basic concepts to advanced usage patterns.

## What Are Redis Functions?

Redis Functions are a new approach to server-side scripting that provides:

- **Named Functions**: Functions have names and are organized into libraries
- **Persistence**: Functions survive Redis restarts (stored in RDB/AOF)
- **Versioning**: Libraries have versions for tracking changes
- **Better Management**: Load once, call by name, easier updates
- **Cluster Support**: Functions replicate across cluster nodes

## Functions vs Traditional Lua Scripts

| Feature | Lua Scripts (EVAL) | Redis Functions |
|---------|-------------------|-----------------|
| Persistence | No | Yes (survives restart) |
| Naming | SHA1 hash only | Named functions |
| Organization | Individual scripts | Libraries |
| Versioning | Manual | Built-in |
| Loading | Every call or cache SHA | Load once |
| Cluster replication | Manual | Automatic |

## Getting Started

### Defining a Function Library

Functions are organized into libraries written in Lua:

```lua
#!lua name=mylib

-- Library-level code runs once when library is loaded

-- Define a helper function (internal, not callable directly)
local function validate_amount(amount)
    if not amount or amount <= 0 then
        return false, "Amount must be positive"
    end
    return true, nil
end

-- Register a function that clients can call
redis.register_function('increment_counter', function(keys, args)
    local key = keys[1]
    local amount = tonumber(args[1]) or 1

    local valid, err = validate_amount(amount)
    if not valid then
        return redis.error_reply(err)
    end

    local new_value = redis.call('INCRBY', key, amount)
    return new_value
end)

-- Another function in the same library
redis.register_function('decrement_counter', function(keys, args)
    local key = keys[1]
    local amount = tonumber(args[1]) or 1

    local valid, err = validate_amount(amount)
    if not valid then
        return redis.error_reply(err)
    end

    local current = tonumber(redis.call('GET', key) or 0)
    if current < amount then
        return redis.error_reply("Insufficient balance")
    end

    local new_value = redis.call('DECRBY', key, amount)
    return new_value
end)
```

### Loading the Library

```bash
# Load from a file
cat mylib.lua | redis-cli -x FUNCTION LOAD REPLACE

# Or load directly
redis-cli FUNCTION LOAD "#!lua name=mylib
redis.register_function('hello', function(keys, args)
    return 'Hello, ' .. (args[1] or 'World') .. '!'
end)"
```

### Calling Functions

```bash
# Call with FCALL
redis-cli FCALL increment_counter 1 my_counter 5

# FCALL_RO for read-only functions
redis-cli FCALL_RO get_counter 1 my_counter
```

## Python Integration

```python
import redis

class RedisFunctions:
    """Manage and call Redis Functions"""

    def __init__(self, redis_client):
        self.redis = redis_client

    def load_library(self, library_code, replace=True):
        """Load a function library"""
        try:
            if replace:
                return self.redis.function_load(library_code, replace=True)
            return self.redis.function_load(library_code)
        except redis.ResponseError as e:
            if "already exists" in str(e):
                raise ValueError("Library already exists. Use replace=True to overwrite.")
            raise

    def call(self, function_name, keys=None, args=None):
        """Call a Redis function"""
        keys = keys or []
        args = args or []
        return self.redis.fcall(function_name, len(keys), *keys, *args)

    def call_ro(self, function_name, keys=None, args=None):
        """Call a read-only Redis function"""
        keys = keys or []
        args = args or []
        return self.redis.fcall_ro(function_name, len(keys), *keys, *args)

    def list_functions(self, library_name=None):
        """List loaded functions"""
        if library_name:
            return self.redis.function_list(library_name)
        return self.redis.function_list()

    def delete_library(self, library_name):
        """Delete a function library"""
        return self.redis.function_delete(library_name)

    def flush_all(self):
        """Delete all function libraries"""
        return self.redis.function_flush()


# Usage
r = redis.Redis(decode_responses=True)
functions = RedisFunctions(r)

# Load a library
library_code = """#!lua name=myapp

redis.register_function('add_user', function(keys, args)
    local user_key = keys[1]
    local user_data = args[1]
    redis.call('SET', user_key, user_data)
    return 'OK'
end)

redis.register_function('get_user', function(keys, args)
    return redis.call('GET', keys[1])
end)
"""

functions.load_library(library_code)

# Call functions
functions.call('add_user', keys=['user:123'], args=['{"name": "John"}'])
user = functions.call_ro('get_user', keys=['user:123'])
print(f"User: {user}")
```

## Function Flags

Functions can declare flags to indicate their behavior:

```lua
#!lua name=mylib

-- Read-only function
redis.register_function{
    function_name = 'get_value',
    callback = function(keys, args)
        return redis.call('GET', keys[1])
    end,
    flags = {'no-writes'}
}

-- Function that allows OOM situations
redis.register_function{
    function_name = 'important_write',
    callback = function(keys, args)
        return redis.call('SET', keys[1], args[1])
    end,
    flags = {'allow-oom'}
}

-- Function that doesn't access keys (deterministic)
redis.register_function{
    function_name = 'calculate',
    callback = function(keys, args)
        local a = tonumber(args[1])
        local b = tonumber(args[2])
        return a + b
    end,
    flags = {'no-writes', 'no-cluster'}
}
```

Available flags:

| Flag | Description |
|------|-------------|
| `no-writes` | Function performs no writes |
| `allow-oom` | Allow execution even in OOM situations |
| `allow-stale` | Allow on replica even if stale |
| `no-cluster` | Function doesn't access cluster-specific data |

## Practical Examples

### Rate Limiter Function

```lua
#!lua name=ratelimiter

-- Token bucket rate limiter
redis.register_function{
    function_name = 'check_rate_limit',
    callback = function(keys, args)
        local key = keys[1]
        local max_tokens = tonumber(args[1])
        local refill_rate = tonumber(args[2])  -- tokens per second
        local requested = tonumber(args[3]) or 1

        local now = redis.call('TIME')
        local now_ms = now[1] * 1000 + math.floor(now[2] / 1000)

        local bucket = redis.call('HMGET', key, 'tokens', 'last_update')
        local tokens = tonumber(bucket[1]) or max_tokens
        local last_update = tonumber(bucket[2]) or now_ms

        -- Calculate tokens to add
        local elapsed_seconds = (now_ms - last_update) / 1000
        local tokens_to_add = elapsed_seconds * refill_rate
        tokens = math.min(max_tokens, tokens + tokens_to_add)

        local allowed = 0
        local remaining = tokens

        if tokens >= requested then
            tokens = tokens - requested
            remaining = tokens
            allowed = 1
        end

        redis.call('HMSET', key, 'tokens', tokens, 'last_update', now_ms)
        redis.call('EXPIRE', key, 3600)

        return {allowed, math.floor(remaining)}
    end,
    flags = {}
}

-- Read-only function to check remaining tokens
redis.register_function{
    function_name = 'get_rate_limit_status',
    callback = function(keys, args)
        local key = keys[1]
        local bucket = redis.call('HMGET', key, 'tokens', 'last_update')
        return {
            tokens = tonumber(bucket[1]) or 0,
            last_update = tonumber(bucket[2]) or 0
        }
    end,
    flags = {'no-writes'}
}
```

Python usage:

```python
class RateLimiter:
    """Rate limiter using Redis Functions"""

    def __init__(self, redis_client, max_tokens=100, refill_rate=10):
        self.redis = redis_client
        self.max_tokens = max_tokens
        self.refill_rate = refill_rate

    def is_allowed(self, identifier, tokens=1):
        """Check if request is allowed"""
        key = f"ratelimit:{identifier}"
        result = self.redis.fcall(
            'check_rate_limit',
            1, key,
            self.max_tokens,
            self.refill_rate,
            tokens
        )
        allowed, remaining = result
        return bool(allowed), remaining


# Usage
r = redis.Redis()
limiter = RateLimiter(r, max_tokens=100, refill_rate=10)

allowed, remaining = limiter.is_allowed('user:123')
print(f"Allowed: {allowed}, Remaining: {remaining}")
```

### Shopping Cart Functions

```lua
#!lua name=cart

-- Add item to cart
redis.register_function{
    function_name = 'cart_add',
    callback = function(keys, args)
        local cart_key = keys[1]
        local inventory_key = keys[2]
        local product_id = args[1]
        local quantity = tonumber(args[2]) or 1

        -- Check inventory
        local available = tonumber(redis.call('HGET', inventory_key, product_id) or 0)
        local in_cart = tonumber(redis.call('HGET', cart_key, product_id) or 0)

        if available < in_cart + quantity then
            return {err = 'INSUFFICIENT_STOCK', available = available}
        end

        local new_qty = redis.call('HINCRBY', cart_key, product_id, quantity)
        redis.call('EXPIRE', cart_key, 86400)  -- 24 hour expiry

        return {ok = true, quantity = new_qty}
    end,
    flags = {}
}

-- Remove item from cart
redis.register_function{
    function_name = 'cart_remove',
    callback = function(keys, args)
        local cart_key = keys[1]
        local product_id = args[1]
        local quantity = tonumber(args[2])

        local current = tonumber(redis.call('HGET', cart_key, product_id) or 0)

        if not quantity or quantity >= current then
            redis.call('HDEL', cart_key, product_id)
            return {ok = true, quantity = 0}
        end

        local new_qty = redis.call('HINCRBY', cart_key, product_id, -quantity)
        return {ok = true, quantity = new_qty}
    end,
    flags = {}
}

-- Get cart contents
redis.register_function{
    function_name = 'cart_get',
    callback = function(keys, args)
        local cart_key = keys[1]
        local prices_key = keys[2]

        local cart = redis.call('HGETALL', cart_key)
        local items = {}
        local total = 0

        for i = 1, #cart, 2 do
            local product_id = cart[i]
            local quantity = tonumber(cart[i + 1])
            local price = tonumber(redis.call('HGET', prices_key, product_id) or 0)
            local subtotal = price * quantity

            table.insert(items, {
                product_id = product_id,
                quantity = quantity,
                price = price,
                subtotal = subtotal
            })
            total = total + subtotal
        end

        return {items = items, total = total}
    end,
    flags = {'no-writes'}
}

-- Clear cart
redis.register_function{
    function_name = 'cart_clear',
    callback = function(keys, args)
        local cart_key = keys[1]
        redis.call('DEL', cart_key)
        return {ok = true}
    end,
    flags = {}
}
```

### Session Management Functions

```lua
#!lua name=sessions

local function generate_session_id()
    -- Simple session ID generation
    local chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    local id = ''
    for i = 1, 32 do
        local rand = math.random(1, #chars)
        id = id .. chars:sub(rand, rand)
    end
    return id
end

-- Create session
redis.register_function{
    function_name = 'session_create',
    callback = function(keys, args)
        local sessions_prefix = args[1] or 'session:'
        local user_id = args[2]
        local session_data = args[3] or '{}'
        local ttl = tonumber(args[4]) or 3600

        local session_id = generate_session_id()
        local session_key = sessions_prefix .. session_id

        redis.call('HMSET', session_key,
            'user_id', user_id,
            'data', session_data,
            'created_at', redis.call('TIME')[1],
            'last_activity', redis.call('TIME')[1]
        )
        redis.call('EXPIRE', session_key, ttl)

        -- Track user's sessions
        redis.call('SADD', 'user_sessions:' .. user_id, session_id)

        return session_id
    end,
    flags = {}
}

-- Get session
redis.register_function{
    function_name = 'session_get',
    callback = function(keys, args)
        local session_key = keys[1]
        local extend_ttl = tonumber(args[1]) or 3600

        local session = redis.call('HGETALL', session_key)
        if #session == 0 then
            return nil
        end

        -- Update last activity and extend TTL
        redis.call('HSET', session_key, 'last_activity', redis.call('TIME')[1])
        redis.call('EXPIRE', session_key, extend_ttl)

        -- Convert to table
        local result = {}
        for i = 1, #session, 2 do
            result[session[i]] = session[i + 1]
        end
        return cjson.encode(result)
    end,
    flags = {}
}

-- Destroy session
redis.register_function{
    function_name = 'session_destroy',
    callback = function(keys, args)
        local session_key = keys[1]

        local user_id = redis.call('HGET', session_key, 'user_id')
        if user_id then
            local session_id = session_key:match('session:(.+)')
            redis.call('SREM', 'user_sessions:' .. user_id, session_id)
        end

        redis.call('DEL', session_key)
        return {ok = true}
    end,
    flags = {}
}

-- Destroy all sessions for user
redis.register_function{
    function_name = 'session_destroy_all',
    callback = function(keys, args)
        local user_id = args[1]
        local sessions_prefix = args[2] or 'session:'

        local sessions = redis.call('SMEMBERS', 'user_sessions:' .. user_id)
        local count = 0

        for _, session_id in ipairs(sessions) do
            redis.call('DEL', sessions_prefix .. session_id)
            count = count + 1
        end

        redis.call('DEL', 'user_sessions:' .. user_id)
        return count
    end,
    flags = {}
}
```

## Managing Function Libraries

### Listing Functions

```bash
# List all libraries and functions
redis-cli FUNCTION LIST

# List specific library
redis-cli FUNCTION LIST LIBRARYNAME mylib

# With code
redis-cli FUNCTION LIST WITHCODE
```

### Backup and Restore

```bash
# Dump all functions
redis-cli FUNCTION DUMP > functions.dump

# Restore functions
cat functions.dump | redis-cli -x FUNCTION RESTORE

# Restore with replace
cat functions.dump | redis-cli -x FUNCTION RESTORE REPLACE
```

### Deleting Functions

```bash
# Delete a specific library
redis-cli FUNCTION DELETE mylib

# Delete all functions
redis-cli FUNCTION FLUSH
```

## Debugging Functions

### Debug Mode

```bash
# Start debug session
redis-cli --ldb --eval mylib.lua key1 key2 , arg1 arg2

# Debug commands:
# s - step
# n - next
# c - continue
# p var - print variable
# b line - breakpoint
```

### Logging in Functions

```lua
redis.register_function{
    function_name = 'debug_function',
    callback = function(keys, args)
        -- Use redis.log for debugging
        redis.log(redis.LOG_DEBUG, 'Processing key: ' .. keys[1])
        redis.log(redis.LOG_WARNING, 'Important: ' .. args[1])

        local result = redis.call('GET', keys[1])
        redis.log(redis.LOG_DEBUG, 'Result: ' .. tostring(result))

        return result
    end,
    flags = {}
}
```

## Migration from EVAL to Functions

### Before (EVAL)

```python
# Old approach with EVAL
RATE_LIMIT_SCRIPT = """
local key = KEYS[1]
local limit = tonumber(ARGV[1])
-- ... script logic
"""

# Have to manage SHA caching
sha = redis_client.script_load(RATE_LIMIT_SCRIPT)
result = redis_client.evalsha(sha, 1, key, limit)
```

### After (Functions)

```python
# New approach with Functions

# Load once (survives restart)
RATE_LIMIT_LIBRARY = """#!lua name=ratelimit
redis.register_function('check_limit', function(keys, args)
    local key = keys[1]
    local limit = tonumber(args[1])
    -- ... function logic
end)
"""

redis_client.function_load(RATE_LIMIT_LIBRARY, replace=True)

# Call by name - no SHA management needed
result = redis_client.fcall('check_limit', 1, key, limit)
```

## Best Practices

1. **Organize related functions into libraries**
2. **Use descriptive function names**
3. **Set appropriate flags for each function**
4. **Version your libraries** in source control
5. **Test functions thoroughly** before deployment
6. **Use FCALL_RO for read-only operations**
7. **Handle errors gracefully** with error_reply
8. **Document your functions** with comments

## Conclusion

Redis Functions in Redis 7.0+ provide a significant improvement over traditional Lua scripts for server-side logic. Key benefits include:

- Named functions that are easier to manage
- Persistence across restarts
- Better organization through libraries
- Automatic cluster replication
- Improved debugging capabilities

By adopting Redis Functions, you can build more maintainable and robust server-side logic while retaining all the benefits of atomic execution that Lua scripts provide.
