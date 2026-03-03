# How to Use strace for Network Debugging on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, strace, Network Debugging, System Calls, Troubleshooting

Description: Learn how to use strace on Ubuntu to trace network-related system calls, diagnose connectivity problems, and debug applications making unexpected network connections.

---

`strace` is a diagnostic tool that shows you every system call a process makes, including all the calls related to network activity: `socket`, `connect`, `bind`, `sendto`, `recvfrom`, `getaddrinfo`, and others. When a network connection fails and you cannot figure out why from logs alone, `strace` shows you exactly what the process is attempting at the system call level. It is particularly useful when you have an application that fails silently, makes unexpected connections, or behaves differently than expected.

## Prerequisites

- Ubuntu 22.04 or newer
- Root or sudo access (required for attaching to existing processes)
- Basic understanding of TCP/IP networking

## Installing strace

```bash
# Install strace
sudo apt update
sudo apt install -y strace

# Verify
strace --version
```

## Basic Usage

```bash
# Trace a new process
strace command

# Trace an existing process by PID
sudo strace -p <PID>

# Trace all threads of a process
sudo strace -p <PID> -f

# Trace with timestamps
strace -t command

# Trace with relative timestamps (time since last system call)
strace -r command
```

## Filtering for Network System Calls

The key to using strace for network debugging is filtering to show only the relevant calls. Network operations use these system calls:

```text
socket      - Create a socket
bind        - Bind to an address/port
listen      - Mark socket as passive (server)
accept      - Accept incoming connections
connect     - Initiate a connection
send/sendto/sendmsg    - Send data
recv/recvfrom/recvmsg  - Receive data
close       - Close file descriptor (including sockets)
getsockopt/setsockopt  - Get/set socket options
getaddrinfo - DNS resolution wrapper (glibc)
```

Filter with the `-e` flag:

```bash
# Show only network-relevant system calls
strace -e trace=network curl https://example.com

# Show specific calls
strace -e trace=connect,sendto,recvfrom curl https://example.com

# Show network calls AND file calls (useful for cert verification failures)
strace -e trace=network,file curl https://example.com

# Trace DNS resolution (includes open, read for /etc/resolv.conf and /etc/hosts)
strace -e trace=network,read,open curl https://example.com 2>&1 | head -100
```

## Practical Examples

### Diagnosing a Connection Refused Error

When you get "Connection refused" and want to see what address/port the application is targeting:

```bash
# Run the failing application under strace
strace -e trace=connect,socket -f your-application 2>&1 | grep -E "connect|socket|ECONNREFUSED"

# Example output for a connection refused:
# [pid 1234] connect(5, {sa_family=AF_INET, sin_port=htons(5432), sin_addr=inet_addr("127.0.0.1")}, 16) = -1 ECONNREFUSED (Connection refused)

# This tells you:
# - File descriptor 5 is the socket
# - Trying to connect to 127.0.0.1:5432 (PostgreSQL)
# - Got ECONNREFUSED
```

### Tracing DNS Resolution

Many network issues are actually DNS failures. Trace how an application resolves names:

```bash
# Trace DNS resolution and connection attempts
strace -f -e trace=connect,network \
  -e trace=getaddrinfo,getsockopt \
  curl https://example.com 2>&1

# Alternative: trace all socket and connect calls more broadly
strace -f -e trace=%network curl https://example.com 2>&1 | \
  grep -E "socket|connect|bind|send|recv"

# Trace the actual file reads that implement DNS (/etc/resolv.conf, /etc/hosts)
strace -e trace=openat,read curl https://api.internal.example.com 2>&1 | \
  grep -E "resolv|hosts|nsswitch"
```

### Debugging TLS Certificate Issues

TLS failures often involve reading certificate files. Find out which certificate files an application is trying to read:

```bash
# Trace file opens during HTTPS connection
strace -f -e trace=openat,read \
  curl https://internal.example.com 2>&1 | \
  grep -E "\.pem|\.crt|\.key|\.csr|ssl|tls|cert|ENOENT"

# Common output showing certificate path problems:
# openat(AT_FDCWD, "/etc/ssl/certs/ca-certificates.crt", O_RDONLY) = 4
# openat(AT_FDCWD, "/usr/share/ca-certificates/...", O_RDONLY) = -1 ENOENT (No such file or directory)
```

### Attaching to a Running Process

For long-running services, attach to them without restarting:

```bash
# Find the PID of the process
pidof nginx
# or
pgrep -x nginx

# Attach to all nginx worker processes
sudo strace -f -p $(pgrep -x nginx | tr '\n' ',') \
  -e trace=network \
  -o /tmp/nginx-trace.txt &

# Generate some traffic, then kill strace
kill %1

# Analyze the trace
cat /tmp/nginx-trace.txt | grep -E "connect|bind|accept|ECONNREFUSED|ETIMEDOUT"
```

### Finding Unexpected Outbound Connections

Use strace to catch an application making unexpected network connections:

```bash
# Trace all connect() calls made by a process
sudo strace -f -e trace=connect \
  -p <PID> 2>&1 | \
  grep "connect(" | \
  grep -v "AF_UNIX"  # Filter out Unix domain sockets

# Show only successful IPv4 connections
sudo strace -f -e trace=connect \
  -p <PID> 2>&1 | \
  grep "AF_INET"

# Example suspicious output:
# connect(8, {sa_family=AF_INET, sin_port=htons(443), sin_addr=inet_addr("203.0.113.50")}, 16) = 0
# The application is connecting to 203.0.113.50:443 - is that expected?
```

## Saving and Analyzing Trace Output

```bash
# Save trace to a file (strace output goes to stderr by default)
strace -e trace=network -o /tmp/trace.log curl https://example.com

# Trace with full timestamps and save
strace -tt -e trace=network -o /tmp/trace-timestamps.log \
  python3 my_script.py

# Count system call frequency
strace -c curl https://example.com

# Example statistics output:
# % time     seconds  usecs/call     calls    errors syscall
# ----------------------
#  23.45    0.001234         308         4         0 connect
#  15.23    0.000801          25        32         0 recvfrom
#  ...
```

## Tracing Child Processes

Applications often fork or spawn subprocesses for network operations. Use `-f` to follow forks:

```bash
# Follow all child processes
sudo strace -f -e trace=network -p <PID>

# Limit output to specific PIDs after they fork
sudo strace -f -e trace=connect \
  /usr/bin/python3 -c "import subprocess; subprocess.run(['curl', 'https://example.com'])"

# The -f flag traces all children
# PID appears in brackets: [pid 1235] connect(...)
```

## Understanding strace Network Output

Sample annotated strace output for an HTTP request:

```text
# Create a TCP socket (AF_INET=IPv4, SOCK_STREAM=TCP)
socket(AF_INET, SOCK_STREAM, IPPROTO_TCP) = 3

# Set socket options (non-blocking, etc.)
setsockopt(3, SOL_SOCKET, SO_REUSEADDR, [1], 4) = 0

# DNS lookup result already resolved, now connecting
# sin_port=htons(80) = port 80
# sin_addr=93.184.216.34 = the IP of example.com
connect(3, {sa_family=AF_INET, sin_port=htons(80),
  sin_addr=inet_addr("93.184.216.34")}, 16) = 0

# Send the HTTP request
sendto(3, "GET / HTTP/1.1\r\nHost: example.com\r\n"..., 78, MSG_NOSIGNAL, NULL, 0) = 78

# Receive the response
recvfrom(3, "HTTP/1.1 200 OK\r\nContent-Type: t"..., 16384, 0, NULL, NULL) = 1448
```

## Filtering by Return Value

Find calls that fail:

```bash
# Show only failed system calls (return value = -1)
strace -e trace=network -Z curl https://failing-endpoint.example.com 2>&1

# Show calls that return a specific error
strace -e trace=connect curl https://example.com 2>&1 | grep "ETIMEDOUT\|ECONNREFUSED\|EHOSTUNREACH"
```

## Practical Troubleshooting Script

```bash
#!/bin/bash
# network-debug.sh - Capture network activity for a command

COMMAND="$@"
TRACE_FILE="/tmp/network-trace-$(date +%s).log"

echo "Tracing network activity for: $COMMAND"
echo "Output: $TRACE_FILE"

strace -f \
  -e trace=socket,connect,bind,listen,accept,sendto,recvfrom,close \
  -T \
  -tt \
  -o "$TRACE_FILE" \
  $COMMAND

echo ""
echo "=== Summary of connections ==="
grep "connect(" "$TRACE_FILE" | grep -v "= -1" | \
  grep -oP 'sin_addr=inet_addr\("\K[^"]+' | \
  sort | uniq -c | sort -rn

echo ""
echo "=== Failed calls ==="
grep "= -1" "$TRACE_FILE" | grep -v "EAGAIN\|EINPROGRESS" | tail -20
```

```bash
chmod +x network-debug.sh
./network-debug.sh curl https://example.com
```

strace is one of those tools that becomes indispensable once you learn it. For network debugging, the combination of `trace=network` filtering, `-f` for child processes, and output saved to a file gives you a complete picture of what a process is actually doing on the network - without needing any cooperation from the application itself.
