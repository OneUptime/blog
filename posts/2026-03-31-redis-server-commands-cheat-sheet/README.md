# Redis Server Commands Cheat Sheet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Server, Command, Cheat Sheet, Administration

Description: Complete Redis server commands reference covering INFO, CONFIG, DEBUG, MONITOR, SAVE, BGSAVE, FLUSHDB, and administrative operations.

---

Redis server commands manage the running instance - from configuration to persistence to diagnostics. Here is the complete reference for server-level operations.

## Server Information

```bash
# Full server info
INFO

# Specific section
INFO server        # version, OS, uptime
INFO clients       # connected clients, blocked clients
INFO memory        # memory usage, fragmentation
INFO stats         # commands processed, keyspace hits/misses
INFO replication   # role, connected replicas, replication offset
INFO cpu           # CPU usage
INFO keyspace      # per-database key counts and TTL stats
INFO latencystats  # latency percentiles (Redis 7.0+)
INFO commandstats  # per-command call count, duration
INFO all           # all sections
INFO everything    # all + hidden sections

# Server time
TIME               # returns [unix_seconds, microseconds]

# Count connected clients
CLIENT LIST
```

## Configuration

```bash
# Get configuration parameters
CONFIG GET maxmemory
CONFIG GET *                   # all parameters
CONFIG GET maxmemory-policy

# Set configuration at runtime (no restart required)
CONFIG SET maxmemory 2gb
CONFIG SET maxmemory-policy allkeys-lru
CONFIG SET save "900 1 300 10 60 10000"

# Rewrite redis.conf with current settings
CONFIG REWRITE

# Reset stats counters
CONFIG RESETSTAT
```

## Database Management

```bash
# Delete all keys in current database
FLUSHDB
FLUSHDB ASYNC   # non-blocking

# Delete all keys in ALL databases
FLUSHALL
FLUSHALL ASYNC

# Select database (0-15)
SELECT 0

# Get database size (key count)
DBSIZE

# Swap two databases atomically (Redis 4.0+)
SWAPDB 0 1
```

## Persistence

```bash
# Trigger RDB snapshot (blocking)
SAVE

# Trigger RDB snapshot (background, non-blocking)
BGSAVE
BGSAVE SCHEDULE   # schedule if another BGSAVE or AOF rewrite is in progress

# Rewrite AOF file (background)
BGREWRITEAOF

# Get last SAVE timestamp
LASTSAVE

# Check persistence status
INFO persistence
```

## Replication

```bash
# Make this instance a replica of another
REPLICAOF 192.168.1.100 6379

# Stop replication (become primary)
REPLICAOF NO ONE

# Wait for replicas to acknowledge writes
WAIT 1 1000    # wait for 1 replica, max 1000ms

# Check replication info
INFO replication
```

## Slow Log

```bash
# Get slow commands log
SLOWLOG GET
SLOWLOG GET 10   # last 10 entries

# Count slow log entries
SLOWLOG LEN

# Clear slow log
SLOWLOG RESET

# Configure slow log threshold
CONFIG SET slowlog-log-slower-than 10000   # microseconds
CONFIG SET slowlog-max-len 128
```

## Monitoring

```bash
# Stream all commands in real time (use carefully in production)
MONITOR

# Latency history for specific event
LATENCY HISTORY fork

# Latest latency measurements
LATENCY LATEST

# Reset latency stats
LATENCY RESET

# Memory diagnostics
MEMORY DOCTOR
MEMORY MALLOC-STATS
MEMORY PURGE       # release memory back to OS (jemalloc)
MEMORY STATS
```

## Shutdown

```bash
# Graceful shutdown with persistence
SHUTDOWN SAVE

# Shutdown without saving
SHUTDOWN NOSAVE

# Shutdown with SIGTERM-like behavior
SHUTDOWN
```

## Summary

Redis server commands span configuration (CONFIG GET/SET), persistence triggers (BGSAVE, BGREWRITEAOF), diagnostics (INFO, SLOWLOG, LATENCY), and database management (FLUSHDB, DBSIZE). Always use FLUSHDB ASYNC or FLUSHALL ASYNC in production to avoid blocking the event loop during large deletions.
