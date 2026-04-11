# How Redis Event Loop Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Internal, Event Loop, Performance, Architecture

Description: Explore how the Redis event loop processes commands, manages timers, and handles IO events in a single-threaded loop without blocking.

---

The Redis event loop is the engine behind everything Redis does: accepting connections, reading commands, executing them, and sending responses. Understanding it helps you reason about latency, blocking commands, and why certain operations can freeze Redis.

## The Two Types of Events

Redis processes two kinds of events in its loop:

1. **File events** - IO on sockets (read from client, write to client, accept new connection)
2. **Time events** - Periodic tasks (key expiry, replication heartbeats, stats collection)

## Event Loop Lifecycle

```text
startup
  |
  v
aeCreateEventLoop()  <-- allocate event loop struct
  |
  v
aeCreateFileEvent()  <-- register server socket for ACCEPT
  |
  v
aeSetBeforeSleepProc() <-- register pre-sleep hook
  |
  v
aeMain()  <-- enter infinite loop
```

Inside `aeMain`, every iteration follows this sequence:

```text
1. beforeSleep()    -- flush pending writes, handle lazy expiry
2. epoll_wait()     -- block until events arrive (or timeout)
3. processFileEvents() -- handle each ready socket
4. processTimeEvents() -- run overdue timers
```

## File Event Handlers

When a client connects, Redis registers two handlers for that socket:

- **Read handler**: called when client data is available - reads command bytes into an input buffer
- **Write handler**: registered after a command is processed - sends the response back

```bash
# See active clients and their state
redis-cli CLIENT LIST
# id=42 addr=127.0.0.1:54321 fd=18 name= age=0 idle=0 flags=N db=0 ...
```

## Time Events

Time events are stored in an unsorted linked list. Each iteration, the loop scans the entire list to find and run overdue timers. This is O(N) but acceptable because there are typically very few time events (often just `serverCron`):

```text
Timer: serverCron (every 100ms by default)
  - sample LRU clock
  - update memory stats
  - run key expiry cycle
  - send replication heartbeat
  - close timed-out clients
```

You can see `hz` in redis.conf which controls `serverCron` frequency:

```text
# redis.conf
hz 10        # serverCron fires 10x per second
dynamic-hz yes  # auto-increase under load
```

## Why Blocking Commands Freeze Redis

Because the event loop is single-threaded, any command that runs for a long time (like `KEYS *` on a large database, `SORT` on a huge list, or a slow Lua script) prevents the loop from processing other clients. Note that blocking commands like `BLPOP` do not actually freeze the event loop - they only suspend the individual client connection while Redis continues serving others.

```bash
# Find slow commands in the slow log
redis-cli SLOWLOG GET 10
```

Set the threshold (in microseconds):

```text
# redis.conf
slowlog-log-slower-than 10000   # log commands >10ms
slowlog-max-len 128
```

## Measuring Loop Iteration Time

Redis exposes event loop cycle statistics:

```bash
redis-cli INFO stats | grep -E "eventloop|cycle"
# eventloop_cycles:1482930
# eventloop_duration_sum:3849201
# eventloop_duration_cmd_sum:1203482
```

`eventloop_duration_sum / eventloop_cycles` gives average microseconds per loop iteration.

## The beforeSleep Hook

Before calling `epoll_wait`, Redis runs `beforeSleep`, which:
- Flushes pending write replies to clients
- Runs a fast active key expiry sampling cycle
- Writes the AOF buffer and schedules a background fsync if configured for `everysec`

This hook is critical for latency - expensive work here adds to every client's perceived response time.

## Summary

The Redis event loop is a tight cycle of: prepare, wait for IO events, dispatch file handlers, run timers. Its single-threaded nature keeps data-structure access race-free and eliminates locking overhead. The trade-off is that one slow command blocks all others, which is why Redis exposes slowlog and encourages short-running commands.
