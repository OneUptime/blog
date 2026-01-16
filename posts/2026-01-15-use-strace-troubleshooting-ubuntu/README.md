# How to Use strace for Troubleshooting on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, strace, Debugging, System Calls, Troubleshooting, Tutorial

Description: Complete guide to using strace for debugging applications and system issues on Ubuntu.

---

When applications misbehave, crash unexpectedly, or perform poorly, understanding what's happening at the system level can be invaluable. **strace** is a powerful diagnostic tool that traces system calls and signals, giving you deep visibility into how processes interact with the Linux kernel. This comprehensive guide will teach you how to use strace effectively for troubleshooting on Ubuntu.

## Understanding System Calls

Before diving into strace, it's essential to understand what system calls are. System calls (syscalls) are the interface between user-space applications and the Linux kernel. When a program needs to perform operations like:

- Reading or writing files
- Creating network connections
- Allocating memory
- Spawning new processes
- Accessing hardware

It must request these services from the kernel through system calls. Common system calls include:

| System Call | Description |
|-------------|-------------|
| `open()` | Open a file |
| `read()` | Read data from a file descriptor |
| `write()` | Write data to a file descriptor |
| `close()` | Close a file descriptor |
| `stat()` | Get file status |
| `mmap()` | Map files or devices into memory |
| `fork()` | Create a new process |
| `execve()` | Execute a program |
| `socket()` | Create a network socket |
| `connect()` | Connect to a remote address |

strace intercepts and records all these system calls, showing you exactly what a process is doing at the kernel level.

## Installing strace on Ubuntu

strace is available in the default Ubuntu repositories. Install it using apt:

```bash
# Update package lists
sudo apt update

# Install strace
sudo apt install strace

# Verify installation
strace --version
```

You should see output similar to:

```
strace -- version 5.x
```

## Basic strace Usage

The simplest way to use strace is to prefix any command with `strace`:

```bash
# Trace all system calls made by the 'ls' command
strace ls

# The output shows each system call with its arguments and return value
# Format: syscall(arguments) = return_value
```

Here's what typical strace output looks like:

```bash
# Example output from 'strace ls'
execve("/usr/bin/ls", ["ls"], 0x7ffd12345678 /* 50 vars */) = 0
brk(NULL)                               = 0x55a123456000
access("/etc/ld.so.preload", R_OK)      = -1 ENOENT (No such file or directory)
openat(AT_FDCWD, "/etc/ld.so.cache", O_RDONLY|O_CLOEXEC) = 3
# ... more system calls
write(1, "file1.txt  file2.txt\n", 21)  = 21
close(1)                                = 0
exit_group(0)                           = ?
```

### Saving Output to a File

For complex traces, save output to a file for later analysis:

```bash
# Use -o to redirect strace output to a file
strace -o /tmp/trace.log ls /var/log

# View the trace file
less /tmp/trace.log
```

### Following Output in Real-Time

When tracing long-running processes, you might want to see output as it happens:

```bash
# Use -o with a file and tail -f for real-time viewing
strace -o /tmp/trace.log long_running_command &
tail -f /tmp/trace.log
```

## Attaching to Running Processes

One of strace's most powerful features is attaching to already-running processes using the `-p` flag:

```bash
# Find the process ID (PID) of the process you want to trace
pgrep -f nginx
# Output: 1234

# Attach strace to the running process
# Note: You need root privileges to trace processes you don't own
sudo strace -p 1234

# Attach to multiple processes simultaneously
sudo strace -p 1234 -p 1235 -p 1236
```

### Detaching from a Process

Press `Ctrl+C` to detach strace from a running process. The traced process will continue running normally.

```bash
# Attach to a process
sudo strace -p 1234
# Press Ctrl+C to detach
# The process (PID 1234) continues running unaffected
```

## Filtering System Calls with -e

The `-e` option lets you filter which system calls to trace, reducing noise and focusing on relevant operations:

```bash
# Trace only 'open' and 'openat' system calls
strace -e open,openat ls

# Trace only file-related calls using trace sets
strace -e trace=file ls

# Trace only network-related calls
strace -e trace=network curl https://example.com

# Trace only process-related calls
strace -e trace=process bash -c "ls"

# Trace only memory-related calls
strace -e trace=memory python3 -c "print('hello')"

# Trace only signal-related calls
strace -e trace=signal sleep 10 &
kill -USR1 $!
```

### Available Trace Sets

| Trace Set | Description |
|-----------|-------------|
| `file` | File operations (open, stat, chmod, etc.) |
| `process` | Process management (fork, exec, exit, etc.) |
| `network` | Network operations (socket, connect, etc.) |
| `signal` | Signal-related calls |
| `ipc` | Inter-process communication |
| `desc` | File descriptor operations |
| `memory` | Memory mapping operations |

### Negating Filters

You can exclude specific system calls using the `!` operator:

```bash
# Trace everything EXCEPT mmap and mprotect calls
strace -e '!mmap,mprotect' ls

# Exclude all memory-related calls
strace -e 'trace=!memory' python3 script.py
```

## Following Child Processes with -f

When a process spawns child processes, use `-f` to trace them all:

```bash
# Trace the parent process and all child processes
strace -f bash -c "ls && pwd"

# The output will show PIDs to distinguish between processes
# [pid 12345] execve("/usr/bin/ls", ...) = 0
# [pid 12346] execve("/usr/bin/pwd", ...) = 0

# Combine with -o to save output
strace -f -o /tmp/fork_trace.log ./my_script.sh
```

### Tracing Forking Servers

This is particularly useful for debugging servers that fork worker processes:

```bash
# Trace Apache and all its worker processes
sudo strace -f -p $(pgrep -o apache2) -o /tmp/apache_trace.log

# Trace a Node.js cluster application
sudo strace -f -p $(pgrep -o node) -o /tmp/node_trace.log
```

## Timing Analysis with -T and -t

Understanding timing can help identify performance bottlenecks:

### Show Time Spent in Each System Call (-T)

```bash
# Add time spent in each system call (in angle brackets)
strace -T ls

# Output example:
# openat(AT_FDCWD, "/etc/ld.so.cache", O_RDONLY|O_CLOEXEC) = 3 <0.000015>
# read(3, "\177ELF\2\1\1\3\0\0\0\0\0\0\0\0..."..., 832) = 832 <0.000012>
# The number in <> shows seconds spent in that syscall
```

### Add Timestamps (-t, -tt, -ttt)

```bash
# Add time of day to each line (HH:MM:SS)
strace -t ls

# Add time of day with microseconds (HH:MM:SS.microseconds)
strace -tt ls

# Add Unix epoch timestamp with microseconds
strace -ttt ls

# Combine timestamp and duration for complete timing analysis
strace -tt -T ls
```

### Relative Timestamps (-r)

```bash
# Show time elapsed since the previous system call
strace -r ls

# Output shows relative time in seconds:
#      0.000000 execve("/usr/bin/ls", ["ls"], ...) = 0
#      0.000456 brk(NULL)                          = 0x55a123456000
#      0.000023 access("/etc/ld.so.preload", R_OK) = -1 ENOENT
```

## Output Formatting Options

strace provides several options to improve output readability:

### String Length (-s)

```bash
# By default, strings are truncated at 32 characters
strace ls

# Increase string length to see more content
strace -s 1000 cat /etc/passwd

# This is useful when debugging configuration file reads
strace -s 500 nginx -t 2>&1 | head -50
```

### Verbose Output (-v)

```bash
# Show unabbreviated versions of environment, stat, etc. calls
strace -v ls

# Useful for seeing full structure contents
strace -v stat /etc/passwd
```

### Print Paths for File Descriptors (-y)

```bash
# Show paths associated with file descriptors
strace -y cat /etc/passwd

# Output shows actual paths instead of just numbers:
# read(3</etc/passwd>, "root:x:0:0:root..."..., 4096) = 2345
```

### Print IP Addresses (-yy)

```bash
# Show IP addresses for socket file descriptors
strace -yy curl https://example.com 2>&1 | grep -E 'connect|sendto|recvfrom'
```

## Finding File Access Issues

One of the most common uses of strace is debugging file access problems:

### Tracing File Operations

```bash
# Trace all file-related system calls
strace -e trace=file ./my_application

# Common file-related syscalls to look for:
# open/openat - Opening files
# stat/lstat/fstat - Getting file information
# access - Checking file permissions
# read/write - Reading/writing file contents
```

### Finding Missing Files

```bash
# Look for ENOENT (No such file or directory) errors
strace -e trace=file ./my_app 2>&1 | grep ENOENT

# Example output showing a missing configuration file:
# openat(AT_FDCWD, "/etc/myapp/config.yaml", O_RDONLY) = -1 ENOENT (No such file or directory)

# Find all files the application tries to open
strace -e openat ./my_app 2>&1 | grep -v "= -1"
```

### Finding Configuration File Locations

```bash
# Discover where an application looks for its configuration
strace -e trace=file -s 200 nginx -t 2>&1 | grep -E "(open|access)"

# Example: Find where Python looks for modules
strace -e trace=file python3 -c "import requests" 2>&1 | grep "\.py"
```

## Debugging Permission Problems

Permission issues often manifest as `EACCES` or `EPERM` errors:

```bash
# Look for permission denied errors
strace -e trace=file ./my_app 2>&1 | grep -E "(EACCES|EPERM)"

# Example output:
# openat(AT_FDCWD, "/var/log/myapp.log", O_WRONLY|O_CREAT) = -1 EACCES (Permission denied)

# Trace a specific application with permission issues
strace -e trace=file,desc -s 200 sudo -u www-data ./my_web_app 2>&1 | grep -E "(EACCES|EPERM)"
```

### Common Permission Scenarios

```bash
# Debug a web server permission issue
sudo strace -f -e trace=file -p $(pgrep nginx) 2>&1 | grep -E "(EACCES|EPERM)"

# Debug a database permission issue
sudo strace -e trace=file -p $(pgrep postgres) 2>&1 | grep -E "(open|EACCES)"

# Check what user/group the process is running as
strace -e trace=process id
# Look for setuid, setgid, setgroups calls
```

## Network Connection Debugging

strace is invaluable for debugging network issues:

### Tracing Network Calls

```bash
# Trace all network-related system calls
strace -e trace=network curl https://api.example.com

# Key network syscalls to watch:
# socket() - Creating a socket
# connect() - Connecting to a remote host
# bind() - Binding to a local address
# listen() - Listening for connections
# accept() - Accepting incoming connections
# send/recv - Sending/receiving data
# sendto/recvfrom - UDP operations
```

### Debugging Connection Failures

```bash
# Look for connection errors
strace -e trace=network ./my_client 2>&1 | grep -E "(connect|ECONNREFUSED|ETIMEDOUT)"

# Example output for connection refused:
# connect(3, {sa_family=AF_INET, sin_port=htons(5432), sin_addr=inet_addr("127.0.0.1")}, 16) = -1 ECONNREFUSED

# Debug DNS resolution issues
strace -e trace=network,file getent hosts example.com 2>&1 | grep -E "(open|connect|sendto|recvfrom)"
```

### Tracing Network Traffic with Content

```bash
# Show network data being sent/received (increase string size)
strace -s 1000 -e trace=network,read,write curl https://api.example.com 2>&1 | less

# Trace a specific process's network activity
sudo strace -f -e trace=network -p $(pgrep -f "python.*server") 2>&1 | tee /tmp/network_trace.log
```

## Performance Analysis

strace can help identify performance bottlenecks:

### Summary Statistics (-c)

```bash
# Get a summary of system call counts and timing
strace -c ls -la /usr/bin

# Example output:
# % time     seconds  usecs/call     calls    errors syscall
# ------ ----------- ----------- --------- --------- ----------------
#  45.23    0.001234          12       103           getdents64
#  23.12    0.000631           2       315           lstat
#  15.67    0.000428           4       107           fstat
#   8.45    0.000231           2       115           write
# ... more syscalls
# 100.00    0.002730                   847        12 total
```

### Combining Summary with Trace (-C)

```bash
# Show both the trace output AND the summary at the end
strace -C ls -la /usr/bin
```

### Finding Slow System Calls

```bash
# Sort by time spent to find slowest calls
strace -c -S time ./my_slow_application

# Trace with timing to find specific slow calls
strace -T ./my_application 2>&1 | awk -F'<|>' '$2 > 0.01 {print}'

# Find syscalls taking more than 100ms
strace -T ./my_application 2>&1 | grep -E '<0\.[1-9]|<[1-9]'
```

### Identifying I/O Bottlenecks

```bash
# Trace read/write operations with timing
strace -T -e trace=read,write dd if=/dev/zero of=/tmp/testfile bs=1M count=100

# Analyze file I/O patterns
strace -c -e trace=read,write,pread64,pwrite64 ./database_app
```

## Common Troubleshooting Patterns

### Pattern 1: Application Won't Start

```bash
# Full trace of startup to find the failure point
strace -f -o /tmp/startup_trace.log ./my_application

# Look for the last successful and first failed calls
grep -E "(= -1|= 0)" /tmp/startup_trace.log | tail -50

# Check for missing libraries
strace ./my_application 2>&1 | grep -E "(open|access).*\.so" | grep ENOENT
```

### Pattern 2: Application Hangs

```bash
# Attach to the hanging process
sudo strace -p $(pgrep -f my_hanging_app)

# If nothing appears, the process might be waiting
# Look for what it's blocked on:
sudo cat /proc/$(pgrep -f my_hanging_app)/wchan

# Trace with follow-forks to catch all threads
sudo strace -f -p $(pgrep -f my_hanging_app)
```

### Pattern 3: Application Crashes

```bash
# Run with full trace and save output
strace -f -o /tmp/crash_trace.log ./crashing_application

# Look at the end of the trace for the crash point
tail -100 /tmp/crash_trace.log

# Check for signals
grep -E "(SIGSEGV|SIGABRT|SIGKILL)" /tmp/crash_trace.log
```

### Pattern 4: Slow Application

```bash
# Get timing summary
strace -c -f ./slow_application

# Find specific slow operations (taking > 10ms)
strace -T -f ./slow_application 2>&1 | awk -F'[<>]' '{if ($2 > 0.01) print}'

# Focus on I/O operations
strace -T -e trace=read,write,pread64,pwrite64 ./slow_application 2>&1 | head -100
```

### Pattern 5: Configuration Issues

```bash
# Find all files the application reads during startup
strace -e trace=openat -s 200 ./my_application 2>&1 | grep -v ENOENT | head -50

# Find which config file is being used
strace -e trace=openat -s 200 ./my_application 2>&1 | grep -E "\.(conf|cfg|yaml|json|ini)"

# See what environment variables are accessed
strace -v -e trace=execve ./my_application 2>&1 | head -20
```

## Real-World Examples

### Example 1: Debugging a Web Server 502 Error

```bash
#!/bin/bash
# debug_502.sh - Debug a 502 Bad Gateway error

# Find the backend process
BACKEND_PID=$(pgrep -f "gunicorn.*myapp")

# Trace network and file operations
sudo strace -f -e trace=network,file -p $BACKEND_PID -o /tmp/backend_trace.log &
STRACE_PID=$!

# Make a request that causes 502
curl http://localhost/api/endpoint

# Stop tracing
kill $STRACE_PID

# Analyze the trace
echo "=== Connection attempts ==="
grep -E "connect\(" /tmp/backend_trace.log

echo "=== Errors ==="
grep -E "= -1" /tmp/backend_trace.log | tail -20
```

### Example 2: Finding Memory-Mapped File Issues

```bash
#!/bin/bash
# debug_mmap.sh - Debug memory mapping issues

# Trace memory-related calls
strace -e trace=mmap,mprotect,munmap,brk -o /tmp/mmap_trace.log ./my_application

# Look for failed mappings
echo "=== Failed memory operations ==="
grep "= -1" /tmp/mmap_trace.log

# Check for specific error patterns
echo "=== Memory permission issues ==="
grep -E "(ENOMEM|EPERM)" /tmp/mmap_trace.log
```

### Example 3: Debugging a Systemd Service

```bash
#!/bin/bash
# debug_service.sh - Debug a failing systemd service

SERVICE_NAME="myservice"

# Get the main PID
MAIN_PID=$(systemctl show -p MainPID $SERVICE_NAME | cut -d= -f2)

if [ "$MAIN_PID" == "0" ]; then
    echo "Service not running. Starting with strace..."

    # Modify the service to run under strace temporarily
    sudo systemctl stop $SERVICE_NAME

    # Get the ExecStart command
    EXEC_CMD=$(systemctl show -p ExecStart $SERVICE_NAME | sed 's/ExecStart=//')

    # Run manually with strace
    sudo strace -f -o /tmp/service_trace.log $EXEC_CMD &
    sleep 10

    echo "Check /tmp/service_trace.log for issues"
else
    echo "Attaching to running service PID: $MAIN_PID"
    sudo strace -f -p $MAIN_PID -o /tmp/service_trace.log
fi
```

### Example 4: Database Connection Debugging

```bash
#!/bin/bash
# debug_db_connection.sh - Debug database connection issues

APP_NAME="myapp"

# Trace the application focusing on network calls
strace -f -e trace=network -s 500 -o /tmp/db_trace.log ./my_application &
APP_PID=$!

# Wait for the application to attempt connection
sleep 5

# Kill the application
kill $APP_PID 2>/dev/null

# Analyze database connection attempts
echo "=== Socket creation ==="
grep "socket(" /tmp/db_trace.log

echo "=== Connection attempts ==="
grep "connect(" /tmp/db_trace.log

echo "=== Failed connections ==="
grep -E "connect.*= -1" /tmp/db_trace.log
```

## Best Practices and Tips

### 1. Reduce Noise

```bash
# Filter to only relevant syscalls
strace -e trace=file,network ./my_app

# Exclude common noisy calls
strace -e '!mmap,mprotect,munmap,brk' ./my_app
```

### 2. Use Appropriate String Lengths

```bash
# Increase for debugging configuration/data issues
strace -s 1000 ./my_app

# Keep short for performance analysis
strace -s 32 -c ./my_app
```

### 3. Save Traces for Later Analysis

```bash
# Always save complex traces to files
strace -f -o /tmp/trace_$(date +%Y%m%d_%H%M%S).log ./my_app
```

### 4. Use Process-Specific Traces

```bash
# Trace only specific processes in a multi-process application
strace -p $(pgrep -f "worker.*1") -o /tmp/worker1.log &
strace -p $(pgrep -f "worker.*2") -o /tmp/worker2.log &
```

### 5. Combine with Other Tools

```bash
# Use with grep for pattern matching
strace ./my_app 2>&1 | grep -E "(ENOENT|EACCES)"

# Use with awk for timing analysis
strace -T ./my_app 2>&1 | awk -F'<|>' '$2 > 0.001 {print}'
```

## Security Considerations

When using strace, keep these security aspects in mind:

```bash
# strace requires appropriate permissions
# For your own processes: no special permissions needed
strace ls

# For other users' processes: root required
sudo strace -p 1234

# strace output may contain sensitive data
# - Passwords passed to processes
# - API keys and tokens
# - Database credentials

# Secure your trace files
strace -o /tmp/trace.log ./my_app
chmod 600 /tmp/trace.log

# Remove trace files after analysis
rm -f /tmp/trace.log
```

## Conclusion

strace is an indispensable tool for troubleshooting Linux applications. By understanding system calls and using strace's powerful filtering and timing options, you can quickly diagnose:

- Missing file and configuration issues
- Permission problems
- Network connection failures
- Performance bottlenecks
- Application crashes and hangs

The key to effective strace usage is knowing which system calls to focus on and how to interpret the output. Start with broad traces and narrow down using filters until you find the root cause.

## Monitor Your Applications with OneUptime

While strace is excellent for debugging specific issues, proactive monitoring can help you catch problems before they impact users. **OneUptime** provides comprehensive monitoring solutions including:

- **Application Performance Monitoring (APM)**: Track response times, error rates, and throughput in real-time
- **Infrastructure Monitoring**: Monitor CPU, memory, disk, and network metrics across your servers
- **Log Management**: Centralize and analyze logs to identify issues quickly
- **Alerting**: Get notified immediately when problems occur via email, SMS, Slack, and more
- **Status Pages**: Keep your users informed about service status
- **Incident Management**: Coordinate response efforts when issues arise

Combine the deep debugging capabilities of strace with OneUptime's proactive monitoring to ensure your Ubuntu systems run smoothly and reliably. Visit [OneUptime](https://oneuptime.com) to learn more about keeping your applications healthy and performant.
