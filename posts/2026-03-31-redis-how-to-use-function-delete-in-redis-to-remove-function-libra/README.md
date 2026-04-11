# How to Use FUNCTION DELETE in Redis to Remove Function Libraries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Function, Lua, Redis 7, Administration

Description: Learn how to use FUNCTION DELETE in Redis 7.0+ to remove named function libraries from the server, and best practices for safe library lifecycle management.

---

## What Is FUNCTION DELETE

`FUNCTION DELETE` removes a named function library from Redis. Once deleted, any `FCALL` calls referencing functions from that library will return an error. This is how you cleanly remove outdated or deprecated function libraries.

```text
FUNCTION DELETE library-name
```

Returns `OK` on success, or an error if the library does not exist.

## Basic Usage

```bash
# First, load a library to delete
FUNCTION LOAD "#!lua name=mylib\n
local function greet(keys, args) return 'hello' end
redis.register_function('greet', greet)
"
# Returns: "mylib"

# Delete the library
FUNCTION DELETE mylib
# OK

# Verify it's gone
FUNCTION LIST LIBRARYNAME mylib
# (empty array)
```

## What Happens After Deletion

```bash
# After deleting the library containing 'greet'
FCALL greet 0
# ERR Function not found
```

## Practical Example in Python

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Load a library
client.function_load("""#!lua name=temp_utils
local function add(keys, args)
  return tonumber(args[1]) + tonumber(args[2])
end
redis.register_function('add', add)
""")

# Verify it's loaded
libs = client.function_list(library='temp_utils')
print(f"Libraries found: {len(libs)}")

# Use it
result = client.fcall('add', 0, 3, 5)
print(f"3 + 5 = {result}")

# Delete the library
client.function_delete('temp_utils')
print("Library deleted")

# Verify deletion
libs = client.function_list(library='temp_utils')
print(f"Libraries after deletion: {len(libs)}")

# Calling deleted function raises an error
try:
    client.fcall('add', 0, 1, 2)
except redis.ResponseError as e:
    print(f"Expected error: {e}")
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

const client = createClient();
await client.connect();

// Load a library
await client.functionLoad(`#!lua name=deprecated_lib
local function old_function(keys, args)
  return 'old behavior'
end
redis.register_function('old_function', old_function)
`);

console.log('Library loaded');

// Delete it
await client.functionDelete('deprecated_lib');
console.log('Library deleted');

// Confirm gone
const remaining = await client.functionList({ LIBRARYNAME: 'deprecated_lib' });
console.log(`Remaining: ${remaining.length}`); // 0
```

## Safe Deletion Pattern

Always check if a library exists before deleting, especially in automated scripts:

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def safe_delete_library(library_name):
    libs = client.function_list(library=library_name)
    if not libs:
        print(f"Library '{library_name}' does not exist, nothing to delete")
        return False

    client.function_delete(library_name)
    print(f"Library '{library_name}' deleted successfully")
    return True

safe_delete_library('old_utils')
safe_delete_library('nonexistent')
```

## Deployment - Replace vs Delete and Reload

When updating a library, prefer `FUNCTION LOAD REPLACE` over delete-then-reload. This avoids a brief window where functions are unavailable:

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

NEW_CODE = """#!lua name=mylib
local function greet(keys, args)
  return 'Hello v2, ' .. args[1]
end
redis.register_function('greet', greet)
"""

# Preferred: atomic replace - no downtime
client.function_load(NEW_CODE, replace=True)
print("Library updated atomically")

# Avoid: delete then reload - creates a gap
# client.function_delete('mylib')
# client.function_load(NEW_CODE)
```

## Removing All Libraries - FUNCTION FLUSH

To remove all function libraries at once, use `FUNCTION FLUSH`:

```bash
# Remove all function libraries
FUNCTION FLUSH

# Async variant
FUNCTION FLUSH ASYNC
```

```python
# Python
client.function_flush()
print("All function libraries removed")
```

## FUNCTION DELETE in Cluster Mode

In Redis Cluster, `FUNCTION DELETE` does not automatically propagate across shards. You need to execute the command on each shard's primary node. Each primary will then replicate the deletion to its own replicas. Client libraries like redis-py's `RedisCluster` and node-redis's cluster client typically handle this by broadcasting the command to all primary nodes on your behalf.

## Lifecycle Management Script

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

CURRENT_LIBRARIES = ['session_manager', 'rate_limiter', 'cache_utils']
DEPRECATED_LIBRARIES = ['old_auth', 'legacy_counter']

def cleanup_deprecated_libraries():
    for lib_name in DEPRECATED_LIBRARIES:
        libs = client.function_list(library=lib_name)
        if libs:
            client.function_delete(lib_name)
            print(f"Removed deprecated library: {lib_name}")

def list_current_libraries():
    all_libs = client.function_list()
    print("Currently loaded libraries:")
    for lib in all_libs:
        print(f"  - {lib['library_name']}")

cleanup_deprecated_libraries()
list_current_libraries()
```

## Summary

`FUNCTION DELETE` removes a named function library from Redis 7.0+, making all functions in that library unavailable for future `FCALL` calls. For zero-downtime updates, prefer `FUNCTION LOAD REPLACE` over deleting and reloading. Use `FUNCTION FLUSH` to remove all libraries at once during major resets or environment teardowns.
