# How to Use FUNCTION LIST in Redis to List Loaded Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Function, Lua, Redis 7, Administration

Description: Learn how to use FUNCTION LIST in Redis 7.0+ to inspect loaded function libraries, view registered functions, and audit the current function registry.

---

## What Is FUNCTION LIST

`FUNCTION LIST` returns information about all function libraries loaded in Redis using `FUNCTION LOAD`. It shows library names, the engine used, and optionally the source code and registered functions within each library.

```text
FUNCTION LIST [LIBRARYNAME library-name-pattern] [WITHCODE]
```

- `LIBRARYNAME` - filter libraries by name pattern (glob-style)
- `WITHCODE` - include the library source code in the response

## Basic Usage

```bash
FUNCTION LIST
```

Returns a list of library descriptors:

```text
1) 1) "library_name"
   2) "mylib"
   3) "engine"
   4) "LUA"
   5) "functions"
   6) 1) 1) "name"
         2) "greet"
         3) "description"
         4) (nil)
         5) "flags"
         6) (empty array)
```

## Listing with Source Code

```bash
FUNCTION LIST WITHCODE
```

Includes the full library source code in the response - useful for auditing and debugging.

## Filtering by Library Name

```bash
# List a specific library
FUNCTION LIST LIBRARYNAME mylib

# List libraries matching a pattern
FUNCTION LIST LIBRARYNAME cache*
```

## Practical Example in Python

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Load some libraries first
client.function_load("""#!lua name=utils
local function ping(keys, args) return 'pong' end
redis.register_function('ping', ping)
""", replace=True)

client.function_load("""#!lua name=cache
local function get_cached(keys, args)
  return redis.call('GET', keys[1])
end
redis.register_function('get_cached', get_cached)
""", replace=True)

# List all libraries
libraries = client.function_list()
print("Loaded libraries:")
for lib in libraries:
    print(f"  Name: {lib['library_name']}")
    print(f"  Engine: {lib['engine']}")
    print(f"  Functions: {[f['name'] for f in lib['functions']]}")
    print()

# Filter by name
specific = client.function_list(library='cache')
print(f"Found: {len(specific)} library/libraries named 'cache'")
```

## Practical Example in Node.js

```javascript
const { createClient } = require('redis');

const client = createClient();
await client.connect();

// Load a test library
await client.functionLoad(`#!lua name=helpers
local function double(keys, args)
  return tonumber(args[1]) * 2
end
redis.register_function('double', double)
`, { REPLACE: true });

// List all functions
const libraries = await client.functionList();
console.log('Libraries:');
for (const lib of libraries) {
  console.log(`  ${lib.library_name} (${lib.engine})`);
  for (const fn of lib.functions) {
    console.log(`    - ${fn.name}`);
  }
}

// List with source code
const withCode = await client.functionListWithCode();
for (const lib of withCode) {
  console.log(`\nLibrary: ${lib.library_name}`);
  console.log(`Code:\n${lib.library_code}`);
}
```

## Practical Example in Go

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

    libraries, err := rdb.FunctionList(ctx, redis.FunctionListQuery{}).Result()
    if err != nil {
        panic(err)
    }

    for _, lib := range libraries {
        fmt.Printf("Library: %s (Engine: %s)\n", lib.Name, lib.Engine)
        for _, fn := range lib.Functions {
            fmt.Printf("  Function: %s\n", fn.Name)
        }
    }
}
```

## Auditing Function Registry

Use `FUNCTION LIST WITHCODE` to audit the functions running in production:

```python
import redis
import json

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def audit_functions():
    libraries = client.function_list(withcode=True)

    report = []
    for lib in libraries:
        report.append({
            'library': lib['library_name'],
            'engine': lib['engine'],
            'functions': [f['name'] for f in lib['functions']],
            'code_length': len(lib.get('library_code', '')),
        })

    print(json.dumps(report, indent=2))
    return report

audit_functions()
```

## Checking If a Specific Function Exists

```python
import redis

client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def function_exists(library_name, function_name):
    try:
        libs = client.function_list(library=library_name)
        for lib in libs:
            for fn in lib['functions']:
                if fn['name'] == function_name:
                    return True
    except Exception:
        pass
    return False

if function_exists('utils', 'ping'):
    result = client.fcall('ping', 0)
    print(f"Ping result: {result}")
else:
    print("Function not loaded - loading now...")
    client.function_load("""#!lua name=utils
local function ping(keys, args) return 'pong' end
redis.register_function('ping', ping)
""")
```

## FUNCTION STATS for Summary

For a quick overview without full details, use `FUNCTION STATS`:

```bash
FUNCTION STATS
# Shows running function info and library counts
```

## Summary

`FUNCTION LIST` gives you visibility into all registered function libraries in Redis 7.0+, showing library names, engines, and registered function names. Use `WITHCODE` to retrieve source code for auditing and `LIBRARYNAME` to filter specific libraries. This command is essential for managing function deployments and debugging in production Redis environments.
