# How to Profile Docker Container System Calls with strace

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Performance, strace, Debugging, Linux, System Calls, Profiling, DevOps

Description: Learn how to use strace to trace and profile system calls inside Docker containers for debugging performance issues and understanding application behavior.

---

When a Docker container misbehaves - slow responses, high CPU usage, mysterious hangs - the application logs often tell you what went wrong but not why. System call tracing with strace reveals what the application is actually doing at the kernel level. Every file read, network connection, memory allocation, and signal passes through system calls, and strace captures all of them.

## What Is strace?

strace intercepts and records the system calls made by a process and the signals received by it. Each line of strace output shows the syscall name, its arguments, and the return value. For Docker debugging, this means you can see exactly which files a container reads, which network connections it opens, where it spends time waiting, and what fails.

## Running strace Inside a Container

### Method 1: strace Inside the Container Image

The simplest approach installs strace in the container:

```bash
# Run a container with strace installed
docker run --rm -it --cap-add SYS_PTRACE alpine sh -c "
    apk add --no-cache strace
    strace -c ls /
"
```

The `--cap-add SYS_PTRACE` flag is required. Docker's default seccomp profile blocks the ptrace syscall that strace needs.

### Method 2: strace from the Host

If you cannot modify the container image, trace from the host. Find the container's PID and attach strace:

```bash
# Start a container
docker run -d --name myapp nginx:latest

# Get the container's main process PID on the host
PID=$(docker inspect --format '{{.State.Pid}}' myapp)

# Attach strace to the running process
sudo strace -p $PID -f -e trace=network
```

### Method 3: Using nsenter

For more control, enter the container's namespaces:

```bash
# Get the container PID
PID=$(docker inspect --format '{{.State.Pid}}' myapp)

# Enter the container's namespaces and run strace
sudo nsenter -t $PID -p -n -m -- strace -p 1 -f
```

## Essential strace Flags

Here are the flags you will use most often when profiling containers:

```bash
# -f: Follow child processes (important for multi-threaded apps)
strace -f -p $PID

# -c: Summary mode - shows syscall count, time, and errors
strace -c -f -p $PID

# -e: Filter to specific syscall categories
strace -e trace=network -p $PID     # Network calls only
strace -e trace=file -p $PID        # File operations only
strace -e trace=memory -p $PID      # Memory operations
strace -e trace=process -p $PID     # Process management
strace -e trace=signal -p $PID      # Signal handling

# -t / -tt: Add timestamps
strace -tt -p $PID                  # Microsecond timestamps

# -T: Show time spent in each syscall
strace -T -p $PID

# -o: Write output to a file instead of stderr
strace -o /tmp/trace.log -f -p $PID

# Combine flags for comprehensive profiling
strace -f -tt -T -e trace=network,file -o /tmp/trace.log -p $PID
```

## Profiling Slow Container Startup

A container takes 30 seconds to become healthy. Where is the time going?

```bash
# Trace the container startup and show timing for each syscall
docker run --rm --cap-add SYS_PTRACE myapp:latest sh -c "
    apk add --no-cache strace 2>/dev/null
    strace -f -tt -T -o /tmp/startup-trace.log /app/entrypoint.sh &
    wait
    # Show the slowest syscalls
    echo '=== Slowest Operations ==='
    sort -t'<' -k2 -n /tmp/startup-trace.log | tail -20
"
```

Common findings:
- DNS resolution taking seconds (look for slow `connect` calls to port 53)
- File reads taking too long (look for slow `read` calls on specific files)
- Waiting for other services (look for `connect` calls that block)

## Profiling Network Issues

When a container has high latency or failed connections:

```bash
# Trace only network-related syscalls
PID=$(docker inspect --format '{{.State.Pid}}' myapp)
sudo strace -f -tt -T -e trace=network -p $PID 2>&1 | head -100
```

Example output for a slow DNS lookup:

```
10:23:45.123456 socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP) = 5 <0.000012>
10:23:45.123500 connect(5, {sa_family=AF_INET, sin_port=htons(53), sin_addr=inet_addr("10.0.0.2")}, 16) = 0 <0.000008>
10:23:45.123550 sendto(5, "...", 32, 0, NULL, 0) = 32 <0.000015>
10:23:47.234567 recvfrom(5, "...", 512, 0, NULL, NULL) = 64 <2.111017>
```

That `recvfrom` took 2.1 seconds, revealing a DNS resolution delay.

## Profiling File I/O

For containers that seem I/O bound:

```bash
# Trace file operations with timing
PID=$(docker inspect --format '{{.State.Pid}}' myapp)
sudo strace -f -tt -T -e trace=file,read,write -p $PID 2>&1 | \
  grep -E "(openat|read|write)" | head -50
```

Look for patterns like:
- Many small reads instead of buffered reads
- Opening the same file repeatedly
- Writes without proper buffering

```bash
# Get a summary of file-related syscall times
sudo strace -f -c -e trace=file -p $PID
# Run for 30 seconds, then press Ctrl+C

# Output:
# % time     seconds  usecs/call     calls    errors syscall
# ------ ----------- ----------- --------- --------- --------
#  45.23    0.123456          12     10284           openat
#  32.11    0.087654           3     29234           fstat
#  15.44    0.042123           8      5267           read
```

## Generating System Call Profiles for Seccomp

strace output is invaluable for creating seccomp profiles. Run the application through its full lifecycle and capture every syscall:

```bash
#!/bin/bash
# generate-syscall-profile.sh
# Captures all syscalls made during a container's operation

IMAGE=$1
DURATION=${2:-60}

echo "Tracing syscalls for $IMAGE over $DURATION seconds..."

# Run the container with strace
docker run --rm --cap-add SYS_PTRACE "$IMAGE" sh -c "
    apk add --no-cache strace 2>/dev/null || apt-get install -y strace 2>/dev/null
    strace -f -c -S calls /app/entrypoint.sh &
    STRACE_PID=\$!
    sleep $DURATION
    kill -INT \$STRACE_PID
    wait \$STRACE_PID 2>/dev/null
" 2>&1 | grep -E '^\s+[0-9]' | awk '{print $NF}' | sort -u
```

## Comparing Before and After Optimization

Use strace summaries to measure the impact of code changes:

```bash
#!/bin/bash
# compare-syscalls.sh
# Compares syscall profiles between two image versions

IMAGE_OLD=$1
IMAGE_NEW=$2

echo "=== Old Version ==="
docker run --rm --cap-add SYS_PTRACE "$IMAGE_OLD" sh -c "
    strace -f -c /app/entrypoint.sh 2>&1 | tail -20
"

echo ""
echo "=== New Version ==="
docker run --rm --cap-add SYS_PTRACE "$IMAGE_NEW" sh -c "
    strace -f -c /app/entrypoint.sh 2>&1 | tail -20
"
```

## Tracing Specific Issues

### Finding File Descriptor Leaks

```bash
# Watch for file descriptors that are opened but never closed
PID=$(docker inspect --format '{{.State.Pid}}' myapp)
sudo strace -f -e trace=open,openat,close -p $PID 2>&1 | \
  awk '/openat.*=/ {fd=$NF; files[fd]=$0} /close\(/ {gsub(/[^0-9]/,"",$2); delete files[$2]} END {for(fd in files) print files[fd]}'
```

### Finding Excessive Polling

```bash
# Look for tight polling loops (repeated calls with short intervals)
PID=$(docker inspect --format '{{.State.Pid}}' myapp)
sudo strace -f -tt -e trace=poll,epoll_wait,select -p $PID 2>&1 | head -50
```

### Finding Failed Operations

```bash
# Show only failed syscalls (returned -1)
PID=$(docker inspect --format '{{.State.Pid}}' myapp)
sudo strace -f -Z -p $PID 2>&1 | head -50
# -Z flag shows only failing calls
```

## Practical Docker Compose Debug Setup

```yaml
# docker-compose.debug.yml
# Override file for debugging with strace
services:
  app:
    cap_add:
      - SYS_PTRACE
    security_opt:
      - seccomp:unconfined
    entrypoint: ["strace", "-f", "-tt", "-T", "-o", "/tmp/trace.log"]
    command: ["/app/entrypoint.sh"]
    volumes:
      - ./debug-output:/tmp
```

```bash
# Run with the debug override
docker compose -f docker-compose.yml -f docker-compose.debug.yml up

# The trace log will be in ./debug-output/trace.log
```

## Performance Impact of strace

strace itself adds overhead. Each traced syscall is intercepted by ptrace, adding 10-100 microseconds per call. For production debugging:

```bash
# Use -c for summary mode (lower overhead than full tracing)
sudo strace -c -f -p $PID

# Trace only specific syscalls to reduce overhead
sudo strace -f -e trace=network -p $PID

# Use a time limit
timeout 30 sudo strace -f -c -p $PID
```

For truly minimal-overhead tracing in production, consider eBPF-based tools like `bpftrace` instead of strace:

```bash
# bpftrace alternative - lower overhead
PID=$(docker inspect --format '{{.State.Pid}}' myapp)
sudo bpftrace -e "tracepoint:syscalls:sys_enter_* /pid == $PID/ { @[probe] = count(); }" -c "sleep 30"
```

## Wrapping Up

strace is the most direct way to understand what a Docker container is doing at the kernel level. For slow startups, trace the initialization to find blocking operations. For high latency, trace network calls to find slow connections or DNS issues. For I/O problems, trace file operations to find excessive reads or writes. The output is verbose, but once you learn to read it, no container behavior is mysterious.
