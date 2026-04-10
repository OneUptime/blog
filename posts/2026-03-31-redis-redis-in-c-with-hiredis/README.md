# How to Use Redis in C with hiredis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, C, hiredis, Systems Programming, Performance

Description: Learn how to use Redis in C with the hiredis library for synchronous and async Redis access, covering connections, commands, and pipelining.

---

hiredis is the official minimal C client for Redis. It provides synchronous and async APIs and is embedded in many other Redis client libraries across languages.

## Installing hiredis

```bash
# Ubuntu/Debian
sudo apt-get install libhiredis-dev

# From source
git clone https://github.com/redis/hiredis.git
cd hiredis && make && sudo make install
```

## Connecting and Running Commands

```c
#include <stdio.h>
#include <stdlib.h>
#include <hiredis/hiredis.h>

int main(void) {
    redisContext *c = redisConnect("127.0.0.1", 6379);
    if (c == NULL || c->err) {
        printf("Connection error: %s\n", c ? c->errstr : "out of memory");
        redisFree(c);
        return 1;
    }

    // SET
    redisReply *reply = redisCommand(c, "SET %s %s", "user:1:name", "Alice");
    printf("SET: %s\n", reply->str);
    freeReplyObject(reply);

    // GET
    reply = redisCommand(c, "GET %s", "user:1:name");
    if (reply->type == REDIS_REPLY_STRING) {
        printf("GET: %s\n", reply->str);
    }
    freeReplyObject(reply);

    // INCR
    reply = redisCommand(c, "INCR visits");
    printf("INCR: %lld\n", reply->integer);
    freeReplyObject(reply);

    redisFree(c);
    return 0;
}
```

Compile with:

```bash
gcc -o example example.c -lhiredis
```

## Error Handling

Always check both the context error and the reply type:

```c
redisReply *reply = redisCommand(c, "GET %s", key);
if (reply == NULL) {
    fprintf(stderr, "Error: %s\n", c->errstr);
    redisFree(c);
    exit(1);
}

switch (reply->type) {
    case REDIS_REPLY_STRING:
        printf("Value: %s\n", reply->str);
        break;
    case REDIS_REPLY_NIL:
        printf("Key not found\n");
        break;
    case REDIS_REPLY_ERROR:
        printf("Redis error: %s\n", reply->str);
        break;
    default:
        printf("Unexpected type: %d\n", reply->type);
}
freeReplyObject(reply);
```

## Pipelining

```c
// Queue commands without waiting for replies
redisAppendCommand(c, "SET key1 val1");
redisAppendCommand(c, "SET key2 val2");
redisAppendCommand(c, "GET key1");

// Read all replies
redisReply *r;
for (int i = 0; i < 3; i++) {
    redisGetReply(c, (void **)&r);
    if (r->type == REDIS_REPLY_STRING)
        printf("Reply %d: %s\n", i, r->str);
    freeReplyObject(r);
}
```

## Working with Redis Hashes

```c
// Store struct data as hash
void store_user(redisContext *c, int id, const char *name, int age) {
    redisReply *reply = redisCommand(c,
        "HSET user:%d name %s age %d",
        id, name, age
    );
    freeReplyObject(reply);
}

// Retrieve all hash fields
redisReply *all = redisCommand(c, "HGETALL user:1");
for (size_t i = 0; i + 1 < all->elements; i += 2) {
    printf("%s: %s\n", all->element[i]->str, all->element[i+1]->str);
}
freeReplyObject(all);
```

## Async API with libevent

For non-blocking usage, hiredis provides async callbacks via libevent, libev, or libuv adapters:

```c
#include <hiredis/hiredis.h>
#include <hiredis/async.h>
#include <hiredis/adapters/libevent.h>

void getCallback(redisAsyncContext *c, void *r, void *privdata) {
    redisReply *reply = r;
    if (reply && reply->type == REDIS_REPLY_STRING)
        printf("Got: %s\n", reply->str);
    redisAsyncDisconnect(c);
}
```

## Summary

hiredis provides a minimal but complete C API for Redis. Always free reply objects with `freeReplyObject()` and check `c->err` after connecting. Use `redisAppendCommand`/`redisGetReply` for pipelining. For async C applications, pair hiredis with libevent or libuv using the provided adapter headers.
