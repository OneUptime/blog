# How to Extend Redis with Custom Commands via Modules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Module, Custom Commands, Redis API, Extension, C

Description: Learn how to add custom Redis commands through the module system, covering command registration, argument handling, and reply types.

---

## Why Extend Redis with Custom Commands

Custom Redis commands let you move complex, multi-step operations atomically into the Redis process, eliminating round-trips. Instead of doing a read-modify-write in three commands from your app, a custom command can do it in one atomic operation with no race conditions.

## Command Registration

Every custom command is registered in `RedisModule_OnLoad` using `RedisModule_CreateCommand`:

```c
#include "redismodule.h"

int RedisModule_OnLoad(RedisModuleCtx *ctx, RedisModuleString **argv, int argc) {
    if (RedisModule_Init(ctx, "commands", 1, REDISMODULE_APIVER_1) == REDISMODULE_ERR) {
        return REDISMODULE_ERR;
    }

    // Signature: ctx, name, handler, flags, first_key, last_key, key_step
    RedisModule_CreateCommand(ctx, "cmd.get",    GetCmd,    "readonly", 1, 1, 1);
    RedisModule_CreateCommand(ctx, "cmd.set",    SetCmd,    "write",    1, 1, 1);
    RedisModule_CreateCommand(ctx, "cmd.delete", DeleteCmd, "write",    1, 1, 1);
    RedisModule_CreateCommand(ctx, "cmd.info",   InfoCmd,   "fast",     0, 0, 0);

    return REDISMODULE_OK;
}
```

Command flags:
- `readonly` - does not modify data, can run on replicas
- `write` - modifies data
- `fast` - runs in O(1) time
- `admin` - administrative command

## Handling Arguments

```c
int MultiplyCommand(RedisModuleCtx *ctx, RedisModuleString **argv, int argc) {
    // argv[0] = command name, argv[1..] = arguments
    if (argc != 3) {
        return RedisModule_WrongArity(ctx);
    }

    // Parse integer argument
    long long a, b;
    if (RedisModule_StringToLongLong(argv[1], &a) == REDISMODULE_ERR) {
        return RedisModule_ReplyWithError(ctx, "ERR first argument must be integer");
    }
    if (RedisModule_StringToLongLong(argv[2], &b) == REDISMODULE_ERR) {
        return RedisModule_ReplyWithError(ctx, "ERR second argument must be integer");
    }

    return RedisModule_ReplyWithLongLong(ctx, a * b);
}
```

```bash
# Usage
CMD.MULTIPLY 6 7
# (integer) 42
```

## Reply Types

```c
// Integer reply
RedisModule_ReplyWithLongLong(ctx, 42);

// String reply (bulk string)
RedisModule_ReplyWithCString(ctx, "hello world");

// Simple string (status reply like OK)
RedisModule_ReplyWithSimpleString(ctx, "OK");

// Null reply
RedisModule_ReplyWithNull(ctx);

// Error reply
RedisModule_ReplyWithError(ctx, "ERR something went wrong");

// Array reply
RedisModule_ReplyWithArray(ctx, 3);
RedisModule_ReplyWithLongLong(ctx, 1);
RedisModule_ReplyWithCString(ctx, "two");
RedisModule_ReplyWithLongLong(ctx, 3);

// Double reply
RedisModule_ReplyWithDouble(ctx, 3.14159);
```

## Reading and Writing Keys

```c
int UpsertCommand(RedisModuleCtx *ctx, RedisModuleString **argv, int argc) {
    if (argc != 3) return RedisModule_WrongArity(ctx);

    // Open key for read+write
    RedisModuleKey *key = RedisModule_OpenKey(ctx, argv[1],
                                               REDISMODULE_READ | REDISMODULE_WRITE);

    int key_type = RedisModule_KeyType(key);

    if (key_type == REDISMODULE_KEYTYPE_EMPTY) {
        // Key does not exist - create it
        RedisModule_StringSet(key, argv[2]);
        RedisModule_ReplyWithSimpleString(ctx, "CREATED");
    } else if (key_type == REDISMODULE_KEYTYPE_STRING) {
        // Key exists - update it
        RedisModule_StringSet(key, argv[2]);
        RedisModule_ReplyWithSimpleString(ctx, "UPDATED");
    } else {
        RedisModule_CloseKey(key);
        return RedisModule_ReplyWithError(ctx, "WRONGTYPE key exists with wrong type");
    }

    RedisModule_CloseKey(key);
    return REDISMODULE_OK;
}
```

## A Practical Example: Atomic Counter with Threshold

This command increments a counter and returns whether it crossed a threshold in a single atomic operation:

```c
// THRESHOLD.INCR key increment threshold
// Returns: 0 if below threshold, 1 if threshold crossed
int ThresholdIncrCommand(RedisModuleCtx *ctx, RedisModuleString **argv, int argc) {
    if (argc != 4) return RedisModule_WrongArity(ctx);

    long long increment, threshold;
    if (RedisModule_StringToLongLong(argv[2], &increment) == REDISMODULE_ERR ||
        RedisModule_StringToLongLong(argv[3], &threshold) == REDISMODULE_ERR) {
        return RedisModule_ReplyWithError(ctx, "ERR arguments must be integers");
    }

    RedisModuleKey *key = RedisModule_OpenKey(ctx, argv[1],
                                               REDISMODULE_READ | REDISMODULE_WRITE);

    long long current = 0;
    if (RedisModule_KeyType(key) == REDISMODULE_KEYTYPE_STRING) {
        size_t len;
        char *str = RedisModule_StringDMA(key, &len, REDISMODULE_READ);
        RedisModuleString *val = RedisModule_CreateString(ctx, str, len);
        RedisModule_StringToLongLong(val, &current);
        RedisModule_FreeString(ctx, val);
    }

    long long new_val = current + increment;
    RedisModuleString *new_str = RedisModule_CreateStringFromLongLong(ctx, new_val);
    RedisModule_StringSet(key, new_str);
    RedisModule_FreeString(ctx, new_str);
    RedisModule_CloseKey(key);

    // Reply array: [new_value, crossed_threshold]
    RedisModule_ReplyWithArray(ctx, 2);
    RedisModule_ReplyWithLongLong(ctx, new_val);
    RedisModule_ReplyWithLongLong(ctx, (new_val >= threshold && current < threshold) ? 1 : 0);

    return REDISMODULE_OK;
}
```

```bash
# Increment API call counter, alert when it crosses 1000
THRESHOLD.INCR api:calls:user:42 1 1000
# 1) (integer) 999   <- new value
# 2) (integer) 0     <- not crossed yet

THRESHOLD.INCR api:calls:user:42 1 1000
# 1) (integer) 1000
# 2) (integer) 1     <- threshold crossed!
```

## Accessing Redis Call Within a Module

You can call existing Redis commands from within a module command:

```c
// Call EXPIRE from within a module command
RedisModuleCallReply *reply = RedisModule_Call(ctx, "EXPIRE", "sl", argv[1], 3600LL);
if (RedisModule_CallReplyType(reply) == REDISMODULE_REPLY_INTEGER) {
    long long result = RedisModule_CallReplyInteger(reply);
}
RedisModule_FreeCallReply(reply);
```

## Summary

Custom Redis commands via modules allow you to extend Redis with atomic, domain-specific operations that run directly in the Redis process. Command registration, argument parsing, key access, and reply formatting are all handled through the Redis Module API. For common patterns like atomic counters with side effects, conditional updates, or multi-key transactions, custom module commands eliminate client-side race conditions and reduce network round-trips compared to Lua scripts.
