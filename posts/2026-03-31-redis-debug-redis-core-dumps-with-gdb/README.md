# How to Debug Redis Core Dumps with gdb

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Debugging, GDB

Description: Learn how to analyze Redis core dump files using gdb to diagnose crashes, identify root causes, and resolve production incidents fast.

---

When Redis crashes unexpectedly, it often produces a core dump file. This file is a snapshot of the process memory at the time of the crash. With `gdb`, you can inspect the crash stack trace, identify the failing function, and trace back the root cause.

## Prerequisites

Before debugging, ensure you have the Redis binary with debug symbols and `gdb` installed:

```bash
sudo apt-get install gdb
# Build Redis with debug symbols
make noopt
```

Enable core dumps on your system:

```bash
ulimit -c unlimited
echo "/tmp/core-%e-%p" | sudo tee /proc/sys/kernel/core_pattern
```

## Loading the Core Dump

Once a core file exists at `/tmp/core-redis-server-12345`, load it with gdb:

```bash
gdb /usr/local/bin/redis-server /tmp/core-redis-server-12345
```

## Inspecting the Stack Trace

Inside gdb, run the backtrace command to see the call stack at crash time:

```text
(gdb) bt
#0  0x00007f3a2b1c4e10 in __memcpy_avx_unaligned ()
#1  0x000000000043f2a0 in rdbSaveLen (rdb=0x7f3a20015b20, len=128)
#2  0x000000000043f5c0 in rdbSaveObject (rdb=0x7f3a20015b20, o=0x7f3a20003210, key=0x7f3a200044f0)
#3  0x0000000000441220 in rdbSaveRio (rdb=0x7f3a20015b20, error=0x7ffe234a4504, flags=0)
```

## Inspecting Local Variables

Switch to a specific frame and inspect variables:

```text
(gdb) frame 2
(gdb) info locals
(gdb) print *o
```

## Checking Thread State

If Redis was using multiple threads (e.g., I/O threads), inspect all threads:

```text
(gdb) info threads
(gdb) thread 3
(gdb) bt
```

## Checking for Memory Corruption

Use gdb's memory inspection commands to check for corruption near the crash:

```text
(gdb) x/20xg 0x7f3a20003210
```

## Using Redis Debug Hints

Redis logs a crash report to its log file when it crashes. Always check it first:

```bash
grep -A 50 "=== REDIS BUG REPORT" /var/log/redis/redis-server.log
```

The report includes the Redis version, OS info, and a partial stack trace that matches what gdb shows.

## Enabling Crash Logs Automatically

Configure Redis to write crash reports to a dedicated file:

```bash
# redis.conf
logfile /var/log/redis/redis.log
crash-log-enabled yes
crash-memlog-enabled yes
```

## Practical Tips

- Always keep a debug-symbol build of Redis matching your production version for post-mortem analysis.
- Use `gdb`'s `thread apply all bt` to dump backtraces for all threads at once.
- Check if the crash relates to a recent `BGSAVE` or `BGREWRITEAOF` call - fork-related crashes are common under memory pressure.

## Summary

Debugging Redis core dumps with gdb involves loading the core file alongside the Redis binary, inspecting the stack trace, and examining local variables to pinpoint the crash location. Combining gdb analysis with Redis crash log output speeds up root cause identification significantly.
