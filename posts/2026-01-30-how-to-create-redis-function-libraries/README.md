# How to Create Redis Function Libraries

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Redis, Functions, Lua, Performance

Description: Learn how to create Redis Function libraries for server-side scripting with improved performance and atomic operations.

---

Redis Functions, introduced in Redis 7.0, represent a significant evolution from traditional Lua scripts. They provide a more structured approach to server-side scripting with improved management, persistence, and reusability. In this guide, we will explore how to create Redis Function libraries and leverage their capabilities for building high-performance applications.

## Redis Functions vs Lua Scripts

Traditional Lua scripts in Redis using `EVAL` have served developers well, but they come with limitations. Scripts must be loaded on every connection, lack persistence across restarts, and can be difficult to manage at scale.

Redis Functions address these issues by introducing:

- **Persistence**: Functions survive server restarts
- **Named references**: Call functions by name instead of SHA1 hashes
- **Library organization**: Group related functions together
- **Better error handling**: Improved debugging capabilities
- **Flag support**: Declare function behavior (read-only, allow-stale, etc.)

## Library Structure

A Redis Function library is defined using Lua code with a specific structure. Here is a basic example:

```lua
#!lua name=mylib

local function my_set(keys, args)
    local key = keys[1]
    local value = args[1]
    return redis.call('SET', key, value)
end

local function my_get(keys, args)
    local key = keys[1]
    return redis.call('GET', key)
end

redis.register_function('my_set', my_set)
redis.register_function('my_get', my_get)
```

The first line declares the library name with `#!lua name=mylib`. Functions are defined as local Lua functions and then registered using `redis.register_function()`.

## Loading Functions with FUNCTION LOAD

To load your library into Redis, use the `FUNCTION LOAD` command:

```bash
redis-cli FUNCTION LOAD "#!lua name=mylib\n\nlocal function my_set(keys, args)\n    return redis.call('SET', keys[1], args[1])\nend\n\nredis.register_function('my_set', my_set)"
```

For larger libraries, it is more practical to load from a file:

```bash
cat mylib.lua | redis-cli -x FUNCTION LOAD REPLACE
```

The `REPLACE` flag allows you to update an existing library without errors.

## Calling Functions

Once loaded, call your functions using `FCALL`:

```bash
redis-cli FCALL my_set 1 user:1 "John Doe"
redis-cli FCALL my_get 1 user:1
```

The syntax is `FCALL <function_name> <numkeys> <key1> ... <keyN> <arg1> ... <argN>`. This follows the same pattern as `EVAL` for key and argument separation.

## Building a Rate Limiter with Atomic Operations

Here is a practical example that demonstrates the power of atomic operations in Redis Functions:

```lua
#!lua name=ratelimit

local function check_rate_limit(keys, args)
    local key = keys[1]
    local limit = tonumber(args[1])
    local window = tonumber(args[2])

    local current = redis.call('GET', key)

    if current == false then
        redis.call('SET', key, 1, 'EX', window)
        return 1
    end

    current = tonumber(current)

    if current >= limit then
        return 0
    end

    redis.call('INCR', key)
    return 1
end

redis.register_function{
    function_name = 'check_rate_limit',
    callback = check_rate_limit,
    flags = { 'no-writes' }
}
```

This rate limiter atomically checks and updates the counter, preventing race conditions that could occur with separate GET and SET operations from the client.

## Function Flags for Better Control

Redis Functions support flags that declare their behavior:

```lua
redis.register_function{
    function_name = 'readonly_func',
    callback = my_readonly_function,
    flags = { 'no-writes', 'allow-stale' }
}
```

Available flags include:
- `no-writes`: Function only reads data
- `allow-stale`: Can run on replicas even with stale data
- `no-cluster`: Not compatible with Redis Cluster

## Debugging Functions

When developing functions, use `redis.log()` for debugging:

```lua
local function debug_example(keys, args)
    redis.log(redis.LOG_WARNING, "Processing key: " .. keys[1])
    return redis.call('GET', keys[1])
end
```

View logs in the Redis server output or log file. For development, run Redis with `--loglevel verbose`.

You can also list loaded functions:

```bash
redis-cli FUNCTION LIST
redis-cli FUNCTION LIST LIBRARYNAME mylib
```

## Persistence and Replication

Redis Functions persist automatically when using RDB or AOF persistence. They also replicate to replica nodes, ensuring consistency across your cluster.

To dump and restore functions:

```bash
redis-cli FUNCTION DUMP > functions.dump
redis-cli FUNCTION RESTORE < functions.dump
```

## Best Practices

1. **Keep functions focused**: Each function should do one thing well
2. **Use meaningful names**: Function names should describe their purpose
3. **Handle errors gracefully**: Check for nil values and invalid inputs
4. **Minimize key access**: Reduce the number of Redis calls within functions
5. **Test thoroughly**: Use `FUNCTION LOAD REPLACE` during development
6. **Document your libraries**: Include comments explaining complex logic

## Conclusion

Redis Function libraries provide a robust foundation for server-side scripting with improved organization, persistence, and performance. By moving complex logic to the server, you reduce network round trips and ensure atomic execution of multi-step operations. Whether building rate limiters, complex data transformations, or custom commands, Redis Functions offer a powerful tool for your application architecture.
