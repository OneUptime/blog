# How to Use Redis CLI Interactive Mode Effectively

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Redis Cli, Command Line, Developer Tool, Productivity

Description: Master Redis CLI interactive mode with keyboard shortcuts, command history, tab completion, pipelining, and useful flags for efficient day-to-day Redis administration.

---

## Starting Interactive Mode

Launch `redis-cli` without arguments or with connection flags to enter interactive mode:

```bash
# Connect to local Redis
redis-cli

# Connect to remote Redis
redis-cli -h redis.example.com -p 6379

# Connect with authentication
redis-cli -h redis.example.com -p 6379 -a yourpassword

# Connect to a specific database
redis-cli -n 2

# Connect with TLS
redis-cli --tls -h redis.example.com -p 6380
```

## Tab Completion

Redis CLI supports tab completion for commands and subcommands:

```bash
# In interactive mode, press Tab after typing the beginning of a command:
127.0.0.1:6379> cl<TAB>
CLIENT   CLUSTER

127.0.0.1:6379> CLIENT <TAB>
CLIENT CACHING       CLIENT GETNAME    CLIENT INFO
CLIENT ID            CLIENT KILL       CLIENT LIST
CLIENT NO-EVICT      CLIENT NO-TOUCH   CLIENT PAUSE
CLIENT REPLY         CLIENT SETNAME    CLIENT TRACKINGINFO
CLIENT UNPAUSE
```

## Command History

Redis CLI remembers command history across sessions:

```bash
# Navigate history with Up/Down arrows
# Search history with Ctrl+R (reverse incremental search)
# History is stored in ~/.rediscli_history

# Clear history file if needed
> rm ~/.rediscli_history
```

## Useful Interactive Commands

```bash
# Switch databases without reconnecting
127.0.0.1:6379> SELECT 1
OK
127.0.0.1:6379[1]>

# Clear screen
127.0.0.1:6379> CLEAR

# Check Redis server info
127.0.0.1:6379> INFO server
127.0.0.1:6379> INFO memory
127.0.0.1:6379> INFO replication
127.0.0.1:6379> INFO all

# Monitor commands in real time (use Ctrl+C to stop)
127.0.0.1:6379> MONITOR

# Debug latency
127.0.0.1:6379> DEBUG SLEEP 0
127.0.0.1:6379> LATENCY RESET
127.0.0.1:6379> LATENCY HISTORY event
```

## Pipe Mode for Bulk Operations

```bash
# Execute commands from a file
cat commands.txt | redis-cli --pipe

# commands.txt format (inline commands):
SET key1 value1
SET key2 value2
HSET user:1 name Alice age 30
```

## The --no-auth-warning Flag

```bash
# Suppress the password warning when using -a
redis-cli -h localhost -a mypassword --no-auth-warning ping
```

## RESP3 Output Formatting

```bash
# Enable RESP3 for richer output (Redis 6.0+)
redis-cli -3

# Pretty-print output
redis-cli -3 HGETALL mykey
```

## Useful One-Liner Commands

```bash
# Count keys matching a pattern (safe, uses SCAN internally)
redis-cli --scan --pattern "session:*" | wc -l

# Delete keys matching a pattern (safe, uses SCAN)
redis-cli --scan --pattern "temp:*" | xargs redis-cli DEL

# Get all fields of a hash
redis-cli HGETALL user:1

# Test system intrinsic latency for 10 seconds (run on Redis host)
redis-cli --intrinsic-latency 10

# Run a command repeatedly every 1 second (-r -1 means infinite repeats)
redis-cli -r -1 -i 1 INFO memory | grep used_memory_human
```

## Formatting Output

```bash
# Raw output (useful for scripting)
redis-cli --raw GET mykey

# Raw output for lists (useful for scripting)
redis-cli --raw LRANGE mylist 0 -1

# CSV output
redis-cli --csv SMEMBERS myset

# JSON output with quoted strings (Redis 7.0+)
redis-cli --quoted-json GET mykey
```

## Working with Binary Data

```bash
# Set a key with binary content
redis-cli SET mykey $'\x00\x01\x02binary\xff'

# Read with hex output (pipe through xxd)
redis-cli --raw GET mykey | xxd

# Use quoted input for special characters
redis-cli SET "key with spaces" "value with spaces"
```

## Interactive Scripting with Lua

```bash
# Evaluate a Lua script inline
redis-cli EVAL "return redis.call('GET', KEYS[1])" 1 mykey

# Load a Lua script file
redis-cli SCRIPT LOAD "$(cat myscript.lua)"

# Call a cached script by SHA
redis-cli EVALSHA <sha1> 1 mykey
```

## Connection Diagnostics

```bash
# Check connection latency
redis-cli --latency

# Run intrinsic latency test (bypasses Redis, tests system latency)
redis-cli --intrinsic-latency 30

# Check ping round-trip time
redis-cli PING
redis-cli --latency-history -i 5
```

## Summary

Redis CLI interactive mode is a powerful tool for day-to-day Redis operations. Use tab completion to explore commands, Ctrl+R for history search, and `--raw` or `--csv` flags in scripting contexts. For bulk operations, pipe formatted commands through `--pipe` mode which is significantly faster than sending commands one at a time.
