# How to Analyze Redis Core Dumps for Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Debugging, Core Dump

Description: Learn how to generate, capture, and analyze Redis core dump files using GDB and crash log analysis to diagnose crashes and memory corruption in production.

---

When Redis crashes unexpectedly, a core dump is the most detailed source of information about the state of the process at the time of the crash. Combined with Redis's built-in crash log, core dumps let you identify segfaults, memory corruption, and assertion failures.

## Enable Core Dumps

By default, Linux limits core dump sizes to 0. Enable them:

```bash
# Check current limit
ulimit -c

# Enable unlimited core dumps for the current session
ulimit -c unlimited

# Make persistent in /etc/security/limits.conf
echo "redis soft core unlimited" | sudo tee -a /etc/security/limits.conf
echo "redis hard core unlimited" | sudo tee -a /etc/security/limits.conf

# Set core dump path
echo '/tmp/core-%e-%p-%t' | sudo tee /proc/sys/kernel/core_pattern
```

## Configure Redis to Crash Safely

```text
# redis.conf
crash-log-enabled yes
crash-memcheck-enabled yes
use-exit-on-panic no
disable-thp yes
```

## Simulate a Crash (Test Environment Only)

```bash
# Send SIGSEGV to Redis for testing
kill -SIGSEGV $(pgrep redis-server)

# Check if core was created
ls -lh /tmp/core-redis*
```

## Read the Redis Crash Log

Redis writes its own crash log before dying:

```bash
tail -100 /var/log/redis/redis.log | grep -A 50 "crashed"
```

The crash log includes:

```text
=== REDIS BUG REPORT START: Cut & paste starting from here ===
...
Signal: Segmentation fault (11)
signal (11) caught. stack trace:
#0  dictFind (d=0x..., key=0x...) at dict.c:452
#1  lookupKeyRead ...
...
```

## Install Debug Symbols

```bash
# Ubuntu
sudo apt install redis-server-dbg gdb

# Or compile from source with debug info
git clone https://github.com/redis/redis.git
cd redis
make CFLAGS="-g -O0" LDFLAGS="-rdynamic"
```

## Analyze Core Dump with GDB

```bash
# Load Redis binary with the core dump
gdb /usr/bin/redis-server /tmp/core-redis-server-12345-1700000000

# Inside GDB
(gdb) bt
# Prints the full backtrace

(gdb) bt full
# Includes local variables in each frame

(gdb) info threads
# List all threads

(gdb) thread 1
(gdb) bt
# Backtrace for thread 1
```

## Inspect Memory in GDB

```bash
(gdb) frame 2
# Switch to stack frame 2

(gdb) info locals
# Print local variables

(gdb) p *key
# Print the value of the 'key' pointer

(gdb) x/16xb 0xdeadbeef
# Examine 16 bytes at address in hex
```

## Detect Memory Corruption with AddressSanitizer

For pre-production debugging, compile with ASAN:

```bash
cd redis
make CFLAGS="-fsanitize=address -g" LDFLAGS="-fsanitize=address"
./src/redis-server

# ASAN will print a report on heap corruption or use-after-free
```

## Common Crash Patterns

```text
# Null pointer dereference
frame: addReplyBulkLen at networking.c:210
# Often caused by a freed client being accessed

# Stack overflow
signal: SIGSEGV in memmove
# Usually caused by deep recursion in Lua scripts or LPOS on huge lists

# Assertion failure
redis/src/dict.c:123: dictDelete: Assertion 'de != NULL' failed.
# Data structure inconsistency - often caused by a Redis bug or memory issue
```

## Summary

Analyzing Redis core dumps requires enabling core generation in the OS, reading the built-in crash log for a quick diagnosis, then using GDB with debug symbols for deep inspection. For memory corruption issues, compiling Redis with AddressSanitizer provides detailed reports. Always reproduce crashes in a staging environment before investigating production dumps.
