# How to Debug Redis Using strace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Debugging, Strace, Linux, System Call

Description: Use strace to trace Redis system calls and diagnose disk I/O bottlenecks, socket issues, file descriptor exhaustion, and unexpected blocking operations.

---

`strace` intercepts and records system calls made by the Redis server process. When Redis is slow and the cause is unclear from application logs or `INFO` output, `strace` shows exactly what the OS-level operations are - revealing disk syncs, socket reads, `fork()` calls, and file descriptor issues.

## Basic strace Attach

Find the Redis PID and attach strace:

```bash
# Find Redis PID
pgrep redis-server
# or
redis-cli INFO server | grep process_id

# Attach to the running process
sudo strace -p $(pgrep redis-server) -e trace=all -o /tmp/redis-strace.log &

# Let it run for 10-30 seconds during the problem, then stop
kill %1
```

## Tracing Only I/O Calls

Focus on file and network I/O to diagnose disk or socket bottlenecks:

```bash
sudo strace -p $(pgrep redis-server) \
  -e trace=read,write,pread64,pwrite64,fdatasync,fsync \
  -T -o /tmp/redis-io.log
```

The `-T` flag adds timing information per system call. Look for slow `fdatasync` or `fsync` calls:

```bash
grep "fdatasync\|fsync" /tmp/redis-io.log | awk -F'<' '{print $2}' | sort -n | tail -10
```

Output:

```text
0.023451>
0.034291>
0.041823>
```

These are AOF sync times in seconds. Values above 10ms indicate slow disk.

## Diagnosing AOF Write Latency

```bash
# Trace only AOF-related writes
sudo strace -p $(pgrep redis-server) \
  -e trace=write,fdatasync \
  -yT 2>&1 | grep -E "(fdatasync|write.*appendonly)"
```

If `fdatasync` takes > 20ms, consider:

```bash
redis-cli CONFIG SET appendfsync everysec  # Reduce sync frequency
redis-cli CONFIG SET no-appendfsync-on-rewrite yes
```

## Detecting Fork Latency

During `BGSAVE` or `BGREWRITEAOF`, Redis calls `fork()`. On large datasets this can take hundreds of milliseconds:

```bash
sudo strace -p $(pgrep redis-server) \
  -e trace=clone,fork,wait4 \
  -T 2>&1
```

Output:

```text
clone(child_stack=0, flags=CLONE_CHILD_CLEARTID|CLONE_CHILD_SETTID|SIGCHLD, ...) = 142857 <0.234512>
```

The value `0.234512` means the fork took 234ms - significant for a 2 GB dataset.

## Checking File Descriptor Usage

```bash
# Count open file descriptors
sudo strace -p $(pgrep redis-server) \
  -e trace=socket,accept,close \
  -c 2>&1 &

sleep 10
kill %1
```

Check file descriptor count directly:

```bash
ls /proc/$(pgrep redis-server)/fd | wc -l
cat /proc/$(pgrep redis-server)/limits | grep "open files"
```

If open FD count approaches the limit, you will see `EMFILE` errors in strace output:

```text
accept4(...) = -1 EMFILE (Too many open files)
```

Fix by raising the per-process file descriptor limit for Redis:

```bash
# If Redis is managed by systemd
sudo systemctl edit redis
# Add under [Service]:
# LimitNOFILE=1048576

# Or set in /etc/security/limits.conf
# redis soft nofile 1048576
# redis hard nofile 1048576
```

## Summarizing System Call Counts

Run strace in count mode to see a summary:

```bash
sudo strace -p $(pgrep redis-server) -c -e trace=all &
sleep 30
kill %1
```

Output:

```text
% time     seconds  usecs/call     calls    errors syscall
------ ----------- ----------- --------- --------- ----------------
 54.21    0.234512          12     19543           epoll_wait
 30.11    0.130211           8     15231           read
 12.45    0.053891           3     17890           write
  2.98    0.012904         156        83           fdatasync
```

High `fdatasync` usecs/call confirms disk is the bottleneck.

## Network Socket Tracing

```bash
sudo strace -p $(pgrep redis-server) \
  -e trace=socket,connect,accept,sendto,recvfrom \
  -T 2>&1 | head -50
```

## Summary

`strace` is the tool of last resort for Redis debugging when standard diagnostics do not reveal the cause of slowness. Trace file I/O calls to find slow AOF syncs or RDB saves, clone/fork calls to measure fork latency, and accept/close to detect file descriptor exhaustion. The `-T` flag timestamps each call, making it easy to identify which system call is the bottleneck in your specific workload.
