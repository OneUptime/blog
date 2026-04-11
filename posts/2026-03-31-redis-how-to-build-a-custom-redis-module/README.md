# How to Build a Custom Redis Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Module, C, Custom Commands, Extension, Advanced

Description: Learn how to build a custom Redis module in C that adds new data types and commands to Redis, extending its capabilities beyond built-in functionality.

---

## What Are Redis Modules?

Redis modules are shared libraries (.so files) that extend Redis with new commands and data types. Official modules include RediSearch (search), RedisJSON (JSON), and RedisTimeSeries. You can also build your own.

Modules are written in C using the Redis Module API.

## Prerequisites

```bash
# Install build tools
sudo apt-get install build-essential

# Clone Redis for header files
git clone https://github.com/redis/redis.git
cd redis
make
```

## Your First Module: A Simple Counter

Let's build a module that adds a `COUNTER.INCRBY` command with a maximum cap.

## Project Structure

```text
mymodule/
  module.c      - Module source code
  Makefile      - Build configuration
  README.md     - Documentation
```

## Writing the Module (module.c)

```c
#include "redismodule.h"
#include <string.h>
#include <stdlib.h>
#include <limits.h>

/*
 * COUNTER.INCRBY key increment [MAX max_value]
 * Increment a counter by a value, optionally capping at a maximum.
 * Returns the new value, or an error if max would be exceeded.
 */
int CounterIncrBy_RedisCommand(RedisModuleCtx *ctx, RedisModuleString **argv, int argc) {
    /* We need at least 3 arguments: command, key, increment */
    if (argc < 3) {
        return RedisModule_WrongArity(ctx);
    }

    RedisModule_AutoMemory(ctx);

    /* Open the key for reading and writing */
    RedisModuleKey *key = RedisModule_OpenKey(ctx, argv[1],
                                               REDISMODULE_READ | REDISMODULE_WRITE);

    /* Check key type - must be empty or string */
    int type = RedisModule_KeyType(key);
    if (type != REDISMODULE_KEYTYPE_EMPTY &&
        type != REDISMODULE_KEYTYPE_STRING) {
        return RedisModule_ReplyWithError(ctx, REDISMODULE_ERRORMSG_WRONGTYPE);
    }

    /* Parse increment argument */
    long long increment;
    if (RedisModule_StringToLongLong(argv[2], &increment) != REDISMODULE_OK) {
        return RedisModule_ReplyWithError(ctx, "ERR invalid increment");
    }

    /* Parse optional MAX argument */
    long long max_value = LLONG_MAX;
    if (argc >= 5) {
        RedisModuleString *opt = argv[3];
        const char *opt_str = RedisModule_StringPtrLen(opt, NULL);
        if (strcasecmp(opt_str, "MAX") == 0) {
            if (RedisModule_StringToLongLong(argv[4], &max_value) != REDISMODULE_OK) {
                return RedisModule_ReplyWithError(ctx, "ERR invalid MAX value");
            }
        }
    }

    /* Get current value */
    long long current = 0;
    if (type == REDISMODULE_KEYTYPE_STRING) {
        RedisModuleCallReply *reply = RedisModule_Call(ctx, "GET", "s", argv[1]);
        if (RedisModule_CallReplyType(reply) == REDISMODULE_REPLY_STRING) {
            RedisModuleString *val = RedisModule_CreateStringFromCallReply(reply);
            RedisModule_StringToLongLong(val, &current);
        }
    }

    /* Check if increment would exceed max */
    long long new_value = current + increment;
    if (new_value > max_value) {
        return RedisModule_ReplyWithError(ctx, "ERR value would exceed maximum");
    }

    /* Store new value */
    RedisModuleString *new_str = RedisModule_CreateStringFromLongLong(ctx, new_value);
    RedisModule_Call(ctx, "SET", "ss", argv[1], new_str);

    return RedisModule_ReplyWithLongLong(ctx, new_value);
}

/* Module entry point */
int RedisModule_OnLoad(RedisModuleCtx *ctx, RedisModuleString **argv, int argc) {
    /* Initialize module */
    if (RedisModule_Init(ctx, "counter", 1, REDISMODULE_APIVER_1) == REDISMODULE_ERR) {
        return REDISMODULE_ERR;
    }

    /* Register the COUNTER.INCRBY command */
    if (RedisModule_CreateCommand(ctx,
                                   "counter.incrby",
                                   CounterIncrBy_RedisCommand,
                                   "write fast",  /* flags */
                                   1,             /* first key argument */
                                   1,             /* last key argument */
                                   1              /* key step */
                                   ) == REDISMODULE_ERR) {
        return REDISMODULE_ERR;
    }

    return REDISMODULE_OK;
}
```

## Makefile

```makefile
# Makefile
REDIS_SRC ?= /path/to/redis/src

CC=gcc
CFLAGS=-Wall -fPIC -std=c99 -I$(REDIS_SRC)
LDFLAGS=-shared

TARGET=module.so

all: $(TARGET)

$(TARGET): module.c
	$(CC) $(CFLAGS) $(LDFLAGS) -o $@ $<

clean:
	rm -f $(TARGET)
```

## Building the Module

```bash
# Set the Redis source path
export REDIS_SRC=/path/to/redis/src

# Build
make

# You should now have module.so
ls -la module.so
```

## Loading the Module

```bash
# Load at runtime
redis-cli MODULE LOAD /path/to/mymodule/module.so

# Or add to redis.conf for auto-load on startup
# loadmodule /path/to/mymodule/module.so

# Verify it loaded
redis-cli MODULE LIST
```

## Testing the Module

```bash
# Test basic increment
redis-cli COUNTER.INCRBY mycounter 5
# (integer) 5

redis-cli COUNTER.INCRBY mycounter 3
# (integer) 8

# Test with MAX cap
redis-cli COUNTER.INCRBY mycounter 100 MAX 10
# (error) ERR value would exceed maximum

# Current value unchanged
redis-cli GET mycounter
# "8"
```

## Simplified Python Example of Module Logic

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Using the module command from Python
def counter_incrby(key: str, increment: int, max_value: int = None):
    if max_value is not None:
        return r.execute_command('COUNTER.INCRBY', key, increment, 'MAX', max_value)
    return r.execute_command('COUNTER.INCRBY', key, increment)

# Usage
counter_incrby('api:rate-limit:user-42', 1, max_value=100)
```

## Module Development Tips

```text
1. Always call RedisModule_AutoMemory to avoid memory leaks
2. Check argument count with RedisModule_WrongArity for proper error messages
3. Use "write fast" flag for write commands that complete quickly
4. Register commands with correct key position arguments for clustering
5. Test with Redis Cluster if you plan to use cluster mode
```

## Unloading a Module

```bash
# List modules to get the module name
redis-cli MODULE LIST

# Unload (replaces with new version if needed)
redis-cli MODULE UNLOAD counter
```

## Summary

Redis modules extend Redis with new commands and data types implemented in C using the Redis Module API. A module is a shared library that registers commands in its RedisModule_OnLoad function. The module system allows you to add domain-specific operations directly in Redis, reducing round trips and enabling new data patterns. For production use, consider using existing modules (RediSearch, RedisJSON) before building custom ones.
