# What Does 'ERR syntax error' Mean in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Error, Syntax Error, Command, Debugging, Troubleshooting

Description: Learn when Redis returns 'ERR syntax error', which command patterns trigger it, and how to identify and fix malformed Redis commands in your code.

---

## What Is the "ERR syntax error" Error

When Redis receives a command that it can partially recognize but the arguments are in an unexpected order, contain unrecognized options, or violate the command's syntax rules, it returns:

```text
(error) ERR syntax error
```

This is different from `ERR wrong number of arguments` (which means too few or too many arguments). A syntax error usually means the arguments are present but in the wrong format or order.

## Commands That Commonly Produce Syntax Errors

### SET Command Options

```bash
# Wrong - EX value must be a positive integer
redis-cli SET mykey value EX -1
# (error) ERR invalid expire time in 'set' command

# Wrong - unrecognized option
redis-cli SET mykey value EXPIRES 100
# (error) ERR syntax error

# Wrong - NX and XX are mutually exclusive
redis-cli SET mykey value NX XX
# (error) ERR syntax error

# Correct usage
redis-cli SET mykey value EX 100 NX
```

### ZADD Options

```bash
# Wrong - NX and XX are mutually exclusive
redis-cli ZADD myzset NX XX 1.0 member
# (error) ERR syntax error

# Wrong - GT and LT are mutually exclusive
redis-cli ZADD myzset GT LT 1.0 member
# (error) ERR syntax error

# Correct
redis-cli ZADD myzset NX 1.0 member
redis-cli ZADD myzset GT CH 1.0 member
```

### EXPIRE Options

```bash
# Wrong - NX, XX, GT, LT are mutually exclusive
redis-cli EXPIRE mykey 100 NX GT
# (error) ERR syntax error

# Correct
redis-cli EXPIRE mykey 100 NX   # Set only if no expiry exists
redis-cli EXPIRE mykey 100 XX   # Set only if expiry already exists
redis-cli EXPIRE mykey 100 GT   # Set only if new > current expiry
redis-cli EXPIRE mykey 100 LT   # Set only if new < current expiry
```

### OBJECT Command

```bash
# Wrong subcommand
redis-cli OBJECT UNKNOWNSUBCOMMAND mykey
# (error) ERR syntax error
# Or: (error) ERR unknown subcommand or wrong number of arguments

# Correct subcommands
redis-cli OBJECT ENCODING mykey
redis-cli OBJECT IDLETIME mykey
redis-cli OBJECT REFCOUNT mykey
redis-cli OBJECT FREQ mykey
redis-cli OBJECT HELP
```

### SORT Command

```bash
# Wrong - invalid option
redis-cli RPUSH mylist 3 1 2
redis-cli SORT mylist DESCENDNG  # Typo - should be DESC
# (error) ERR syntax error

# Correct
redis-cli SORT mylist DESC
redis-cli SORT mylist ALPHA LIMIT 0 10
```

### CLIENT Command

```bash
# Wrong - invalid CLIENT subcommand
redis-cli CLIENT UNKNOWNOPTION
# (error) ERR unknown subcommand or wrong number of arguments
# Older Redis versions may return: (error) ERR syntax error

# Correct
redis-cli CLIENT LIST
redis-cli CLIENT SETNAME myconnection
redis-cli CLIENT GETNAME
redis-cli CLIENT ID
```

## How to Diagnose

### Check Command Documentation

Use the `help` built-in inside the interactive redis-cli shell:

```bash
redis-cli
127.0.0.1:6379> help SET
127.0.0.1:6379> help ZADD
127.0.0.1:6379> help EXPIRE
```

### Test in redis-cli Interactively

Reproduce the command manually to see the exact error:

```bash
redis-cli -h localhost -p 6379
127.0.0.1:6379> SET mykey value EX 100 NX
OK
127.0.0.1:6379> SET mykey value NX XX
(error) ERR syntax error
```

### Check Redis Version Compatibility

Some options were added in specific Redis versions. For example:
- `SET ... GET` (returns old value) requires Redis 6.2+
- `EXPIRE ... NX/XX/GT/LT` requires Redis 7.0+
- `ZADD ... GT/LT` requires Redis 6.2+

```bash
redis-cli INFO server | grep redis_version
```

## Fixing Syntax Errors in Application Code

### Python (redis-py)

```python
import redis

r = redis.Redis()

# Wrong - NX and XX are mutually exclusive
try:
    r.set('key', 'value', nx=True, xx=True)
except redis.exceptions.ResponseError as e:
    print(f"Syntax error: {e}")

# Correct - use only one condition
r.set('key', 'value', nx=True)       # Set only if not exists
r.set('key', 'value', xx=True)       # Set only if exists
r.set('key', 'value', ex=100, nx=True)  # Set with expiry if not exists
```

### Node.js (ioredis)

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// Correct SET with options
await redis.set('key', 'value', 'EX', 100, 'NX');

// ZADD with options
await redis.zadd('myzset', 'NX', 1.0, 'member1');
await redis.zadd('myzset', 'GT', 'CH', 2.0, 'member1');

// EXPIRE with condition (Redis 7.0+)
await redis.expire('mykey', 100, 'NX');
```

## Common Syntax Mistakes Reference

| Command | Wrong | Correct |
|---------|-------|---------|
| SET | `SET k v NX XX` | `SET k v NX` or `SET k v XX` |
| ZADD | `ZADD z NX XX 1 m` | `ZADD z NX 1 m` |
| ZADD | `ZADD z GT LT 1 m` | `ZADD z GT 1 m` |
| EXPIRE | `EXPIRE k 100 NX GT` | `EXPIRE k 100 NX` |
| SORT | `SORT list DESCENDNG` | `SORT list DESC` |
| OBJECT | `OBJECT ENCODEING k` | `OBJECT ENCODING k` |

## Summary

The "ERR syntax error" in Redis typically means command options are conflicting (like NX and XX together), an option name is misspelled, or a subcommand is invalid. Debug by running the command in `redis-cli` interactively, checking command documentation with `HELP`, and verifying your Redis version supports the options being used. In application code, catch ResponseError and check for "syntax error" to provide clearer debugging messages.
