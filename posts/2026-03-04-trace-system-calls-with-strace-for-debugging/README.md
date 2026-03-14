# How to Trace System Calls with strace for Debugging on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Strace, Debugging, Linux

Description: Learn how to trace System Calls with strace for Debugging on RHEL with step-by-step instructions, configuration examples, and best practices.

---

strace intercepts and records system calls made by a process, showing you exactly how a program interacts with the kernel. It is one of the most powerful debugging tools available on RHEL for diagnosing application failures, permission issues, and performance problems.

## Prerequisites

- RHEL with strace installed
- Root or sudo access (for tracing other users' processes)

## Step 1: Install strace

```bash
sudo dnf install -y strace
```

## Step 2: Trace a Command

```bash
strace ls /tmp
```

This prints every system call made by `ls`, including file opens, reads, and writes.

## Step 3: Trace a Running Process

```bash
strace -p $(pidof myapp)
```

Press `Ctrl+C` to stop tracing.

## Step 4: Filter by System Call Type

Trace only file-related calls:

```bash
strace -e trace=file ls /tmp
```

Trace only network calls:

```bash
strace -e trace=network curl http://example.com
```

Common trace filters:

| Filter | Description |
|--------|-------------|
| `file` | File operations (open, stat, unlink) |
| `network` | Network operations (socket, connect, send) |
| `process` | Process operations (fork, exec, wait) |
| `signal` | Signal operations |
| `memory` | Memory operations (mmap, brk) |
| `ipc` | IPC operations |

## Step 5: Show Timestamps

```bash
strace -t ls /tmp        # Wall clock time
strace -tt ls /tmp       # Microsecond timestamps
strace -r ls /tmp        # Relative timestamps between calls
```

## Step 6: Measure System Call Timing

```bash
strace -c ls /tmp
```

This produces a summary table showing how much time was spent in each system call.

```bash
% time     seconds  usecs/call     calls    errors syscall
------ ----------- ----------- --------- --------- --------
 45.00    0.000090          10         9           openat
 25.00    0.000050           7         7           fstat
```

## Step 7: Save Output to a File

```bash
strace -o /tmp/strace.log -f myapp
```

The `-f` flag follows child processes (forks).

## Step 8: Trace with String Length

By default strace truncates long strings. Increase the limit:

```bash
strace -s 1024 -e trace=write myapp
```

## Practical Examples

### Find why a program cannot open a file:

```bash
strace -e trace=openat myapp 2>&1 | grep -i "no such file"
```

### Identify slow system calls:

```bash
strace -T -e trace=read,write myapp
```

The `-T` flag shows time spent in each call.

## Conclusion

strace is an essential debugging tool on RHEL that reveals the exact system calls a process makes. Whether you are debugging permission errors, missing files, or network connectivity issues, strace shows you what the kernel sees.
