# How to Use strace to Debug Process System Calls on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Debugging, Linux, System Administration, Performance

Description: Learn how to use strace on Ubuntu to trace system calls made by processes, diagnose application failures, and understand program behavior at the kernel level.

---

`strace` is one of those tools that turns opaque application failures into understandable problems. When a program crashes with a cryptic error, or hangs silently, or performs worse than expected, `strace` shows you exactly what system calls it's making - every file it opens, every network connection it attempts, every memory allocation request.

## Installing strace

On most Ubuntu systems, `strace` is available from the default repositories:

```bash
sudo apt update
sudo apt install strace -y
```

Check the version:

```bash
strace --version
```

## Basic Usage

Trace a command from the start:

```bash
# Trace all system calls made by the ls command
strace ls /tmp
```

The output can be overwhelming at first. Each line shows a system call, its arguments, and its return value:

```text
openat(AT_FDCWD, "/tmp", O_RDONLY|O_NONBLOCK|O_CLOEXEC|O_DIRECTORY) = 3
getdents64(3, /* 12 entries */, 32768) = 376
close(3) = 0
```

## Attaching to a Running Process

You don't need to restart a process to trace it. Attach with `-p`:

```bash
# Attach to a running process by PID
sudo strace -p 1234
```

Detach with Ctrl+C - the process continues running normally after detach.

For a process you don't know the PID of:

```bash
# Find the PID first, then attach
sudo strace -p $(pgrep nginx | head -1)
```

## Filtering System Calls

The raw output includes hundreds of calls per second for busy processes. Filter to what matters:

```bash
# Only show file-related system calls
strace -e trace=file ls /tmp

# Only show network-related calls
strace -e trace=network curl https://example.com

# Only show process-related calls
strace -e trace=process bash -c "sleep 1"
```

You can also filter by specific call names:

```bash
# Only trace open, read, write, and close
strace -e trace=openat,read,write,close cat /etc/hostname

# Exclude a specific call from output
strace -e trace=\!futex,mmap myapp
```

## Saving Output to a File

strace output goes to stderr by default. Redirect it:

```bash
# Save strace output to a file
strace -o /tmp/strace_output.txt ls /tmp

# Trace a running process and save output
sudo strace -p 1234 -o /tmp/app_trace.txt
```

This is essential for analyzing long traces after the fact.

## Adding Timestamps

Timestamps are critical for understanding timing issues:

```bash
# Add absolute timestamps
strace -t ls /tmp

# Add timestamps with microsecond precision
strace -tt ls /tmp

# Add time elapsed since previous syscall (shows time spent between calls)
strace -r ls /tmp
```

The `-r` flag is particularly useful for finding where a program spends time waiting.

## Measuring Time Spent in Each System Call

The `-c` flag gives a summary of time spent in each syscall:

```bash
# Profile system call time
strace -c ls /var/log

# Profile a running process for 10 seconds
timeout 10 sudo strace -p 1234 -c
```

Example output:

```text
% time     seconds  usecs/call     calls    errors syscall
------ ----------- ----------- --------- --------- ----------------
 45.23    0.000892         89        10           openat
 22.11    0.000436         43        10           read
 18.44    0.000364         36        10           close
```

This immediately shows you which syscall category is consuming the most time.

## Following Child Processes

Applications that fork child processes can be traced comprehensively:

```bash
# Follow forked children
strace -f nginx -g "daemon off;"

# Follow children and save each process to a separate file
strace -ff -o /tmp/trace nginx -g "daemon off;"
```

With `-ff`, each process gets its own file named `trace.PID`. This is essential for tracing multi-process daemons like Apache or PostgreSQL.

## Diagnosing Common Problems

### File Not Found Errors

When an application fails to find a file, strace reveals exactly what paths it's trying:

```bash
strace -e trace=openat myapp 2>&1 | grep "ENOENT"
```

This shows every path the application attempted to open that didn't exist. You'll often find the app is looking in a different directory than you expected.

### Permission Denied Issues

```bash
strace -e trace=openat myapp 2>&1 | grep "EACCES\|EPERM"
```

### Network Connection Failures

```bash
# See what addresses the application connects to
strace -e trace=connect,socket myapp 2>&1
```

### Hanging Processes

Attach to a hung process and watch what system call it's blocked on:

```bash
sudo strace -p $(pgrep hung_process)
```

If the output shows the process is stuck on `futex(...)` it's waiting for a mutex. If it's stuck on `select(...)` or `epoll_wait(...)` it's waiting for I/O. This immediately tells you whether the problem is a deadlock or an unresponsive external dependency.

## Reading String Arguments

By default, strace truncates long strings. Increase the limit:

```bash
# Show strings up to 500 characters
strace -s 500 myapp

# Show complete strings (no limit)
strace -s 0 myapp
```

This is important when debugging configuration file parsing or HTTP requests.

## Tracing Multiple Processes

You can trace multiple PIDs simultaneously:

```bash
# Trace two processes at once
sudo strace -p 1234 -p 5678
```

## Practical Example: Debugging a Failing Service

Here's a real-world scenario. A service fails on startup with no useful log message:

```bash
# Trace the service startup and save to file
sudo strace -ff -e trace=file,network,process \
  -o /tmp/service_trace \
  systemctl start myservice

# After it fails, look for errors
grep -h "ENOENT\|EACCES\|ECONNREFUSED" /tmp/service_trace.*
```

This approach has saved hours of debugging time when config files are misplaced, certificates have wrong permissions, or services can't reach required dependencies.

## Kernel Call vs Library Call

One important thing to remember: `strace` shows kernel system calls, not library function calls. A call to `printf()` in your application shows up as `write()` in strace. A call to `malloc()` might show up as `brk()` or `mmap()`. This distinction matters when cross-referencing strace output with source code.

For library-level tracing, `ltrace` (a separate tool) is the complement to `strace`.

## Performance Impact

Attaching strace to a production process has overhead - typically 5-10x slowdown for CPU-intensive processes. For quick diagnostics this is acceptable, but don't leave it attached to a production database for hours. Use `-c` for summary statistics when you need longer-term data, as it has lower overhead than full call logging.

`strace` is an irreplaceable diagnostic tool. The ability to see exactly what a process is doing at the OS interface level cuts through layers of abstraction and gets you to the root cause of problems quickly.
