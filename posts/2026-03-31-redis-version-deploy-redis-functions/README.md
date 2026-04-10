# How to Version and Deploy Redis Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Function, Deployment, Versioning, Library

Description: Learn how to version, package, and deploy Redis Functions using FUNCTION LOAD, library management, and safe rollout strategies for production systems.

---

Redis Functions, introduced in Redis 7.0, allow you to store server-side logic as named libraries. Unlike Lua scripts which are ephemeral, functions persist across restarts and support proper versioning workflows.

## Creating a Versioned Library

Each Redis Functions library has a name and an engine type. Use the `#!lua name=mylib` header to declare your library:

```lua
#!lua name=payment_v2

local function process_payment(keys, args)
  local account = keys[1]
  local amount = tonumber(args[1])
  local balance = tonumber(redis.call('GET', account) or 0)
  if balance < amount then
    return redis.error_reply('INSUFFICIENT_FUNDS')
  end
  redis.call('DECRBY', account, amount)
  return balance - amount
end

redis.register_function('process_payment', process_payment)
```

## Loading Functions with FUNCTION LOAD

Use `FUNCTION LOAD` to register a library. By default, it fails if the library already exists:

```bash
redis-cli FUNCTION LOAD "#!lua name=payment_v2\n..."
```

To replace an existing library during a deployment, use the `REPLACE` flag:

```bash
redis-cli FUNCTION LOAD REPLACE "$(cat payment_v2.lua)"
```

This is an atomic operation - clients either use the old or new version, never a partial state.

## Deploying from a File

A typical deployment script reads the function file and loads it:

```bash
#!/bin/bash
LIBRARY_FILE="./functions/payment_v2.lua"
REDIS_HOST="redis://localhost:6379"

# Load with replace for zero-downtime update
redis-cli -u "$REDIS_HOST" FUNCTION LOAD REPLACE "$(cat $LIBRARY_FILE)"

# Verify deployment
redis-cli -u "$REDIS_HOST" FUNCTION LIST LIBRARYNAME payment_v2
```

## Versioning Strategy

Embed the version in the library name to support blue-green deployments:

```bash
# Deploy new version alongside old
redis-cli FUNCTION LOAD "$(cat payment_v3.lua)"

# Test new version
redis-cli FCALL process_payment_v3 1 account:123 50

# After validation, delete old version
redis-cli FUNCTION DELETE payment_v2
```

## Backup and Restore

Dump all functions before a deployment for rollback capability:

```bash
# Backup current functions (--raw outputs the binary payload)
redis-cli --raw FUNCTION DUMP > functions_backup.bin

# Restore if needed (-x reads the last argument from stdin)
redis-cli -x FUNCTION RESTORE REPLACE < functions_backup.bin
```

## Listing and Inspecting Deployed Functions

```bash
# List all libraries
redis-cli FUNCTION LIST

# Show functions with code
redis-cli FUNCTION LIST WITHCODE

# Get stats
redis-cli FUNCTION STATS
```

## Production Checklist

Before deploying Redis Functions to production:

1. Test with `FUNCTION LOAD` against a staging Redis instance
2. Verify all registered function names with `FUNCTION LIST`
3. Use `REPLACE` only after validating the new library
4. Store function source files in version control alongside application code
5. Automate deployment via CI/CD, treating function files as deployable artifacts

## Summary

Redis Functions support atomic load-and-replace deployments using `FUNCTION LOAD REPLACE`. By naming libraries with version suffixes and scripting the load process, you can implement zero-downtime updates with rollback capability. Always back up existing functions before deploying new versions in production.
