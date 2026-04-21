# How to Investigate TCP Connections Stuck in CLOSE_WAIT

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Linux, CLOSE_WAIT, Networking, Debugging, Application

Description: Diagnose why TCP connections remain stuck in CLOSE_WAIT state and fix the underlying application bug where code fails to close connections after the remote end has disconnected.

## Introduction

CLOSE_WAIT means the remote side has closed the connection (sent FIN) and the local side has acknowledged it, but the local application has not yet called `close()` on the socket. This is almost always an application bug - the code is holding onto connections it should have released. Unlike TIME_WAIT (which is normal), CLOSE_WAIT indicates a resource leak.

## Understanding CLOSE_WAIT

```text
Normal CLOSE_WAIT flow:
1. Remote sends FIN → Local ACKs it → Connection enters CLOSE_WAIT
2. Local application notices remote closed → calls close()
3. Connection moves to LAST_ACK → then CLOSED

Stuck CLOSE_WAIT:
1. Remote sends FIN → Local ACKs it → Connection enters CLOSE_WAIT
2. Local application NEVER calls close() → socket stays open forever
3. File descriptors leak, memory accumulates
```

## Detecting CLOSE_WAIT

```bash
# Count CLOSE_WAIT connections

ss -Htn state close-wait | wc -l

# Show CLOSE_WAIT connections with process information
ss -tnp state close-wait

# Watch if the count grows over time (indicates a leak)
watch -n 5 "ss -Htn state close-wait | wc -l"

# Identify which process is responsible
ss -tnp state close-wait | grep -oP 'pid=\K\d+'
# Then check the process
ls -la /proc/<pid>/fd | grep socket
```

## Checking File Descriptor Limits

```bash
# Too many CLOSE_WAIT sockets may exhaust file descriptors
# Check FD limits and current FD usage for the offending process
grep "Max open files" /proc/<pid>/limits
ls -1 /proc/<pid>/fd | wc -l

# Process and system-wide FD limits
ulimit -n              # Current shell's per-process limit
cat /proc/sys/fs/file-max  # System total limit

# If FDs exhausted, application will fail to open new sockets
lsof -p <pid>
```

## Tracing the Application Bug

```bash
# Trace close() calls to see if socket is ever closed
strace -e trace=close -p <pid> 2>&1 | head -50

# Trace the entire socket lifecycle
strace -e trace=socket,connect,accept,close,shutdown -p <pid> 2>&1

# For Java applications: thread dump to find threads holding sockets
kill -3 <java-pid>   # or jstack <pid>
# Look for threads blocked on socket operations
```

## Common CLOSE_WAIT Bugs and Fixes

### Bug 1: Not Closing on Exception

```python
# BAD: exception prevents close()
def handle_request():
    conn = get_db_connection()
    result = conn.execute("SELECT ...")   # Exception here?
    conn.close()   # Never reached if exception

# GOOD: always close
def handle_request():
    conn = get_db_connection()
    try:
        result = conn.execute("SELECT ...")
    finally:
        conn.close()   # Always closes, even on exception

# BETTER: use a context manager that closes on exit
with get_db_connection() as conn:
    result = conn.execute("SELECT ...")
# Cleanup runs automatically on exit
```

### Bug 2: Not Responding to EOF

```python
# BAD: ignores EOF from remote, keeps socket open
while True:
    data = sock.recv(4096)
    if data:
        process(data)
    # Missing: if not data: break  ← EOF means remote closed

# GOOD: handle EOF by closing socket
while True:
    data = sock.recv(4096)
    if not data:  # EOF received
        sock.close()
        break
    process(data)
```

## Forcing Cleanup (Emergency)

```bash
# Force-close all CLOSE_WAIT connections to a specific host
ss -K state close-wait dst 10.20.0.5

# Force-close all CLOSE_WAIT for a specific port
ss -K state close-wait "( dport = :5432 or sport = :5432 )"
```

## Conclusion

CLOSE_WAIT connections are application-layer bugs, not kernel or network issues. They appear when code fails to call `close()` after detecting that the remote side has disconnected. The fix is always in the application: use context managers, handle EOF properly, and ensure close() is called in finally blocks. Monitor CLOSE_WAIT counts in production - a steadily increasing count signals a connection leak that will eventually exhaust file descriptors.
