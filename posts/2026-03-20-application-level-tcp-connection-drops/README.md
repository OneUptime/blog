# How to Troubleshoot Application-Level TCP Connection Drops

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Networking, Application, Connection Drops, Troubleshooting, Linux

Description: Diagnose TCP connection drops that occur after successful establishment, examining application code, middleware timeouts, and system resource limits as causes.

## Introduction

Application-level TCP connection drops occur after the three-way handshake succeeds - the connection is established, but then unexpectedly terminates. These are harder to diagnose than connection failures because the network is working. The cause is usually application timeout logic, resource exhaustion, or middleware (load balancer, proxy) terminating idle connections.

## Identifying Application-Level Drops

```bash
# Signs of application-level drops:

# 1. "Connection reset by peer" errors in application logs
# 2. "Broken pipe" errors when writing to a socket
# 3. Connections that work sometimes but fail others
# 4. Failures correlated with specific data sizes or durations

# Capture to confirm RST packets are being sent
tcpdump -i eth0 -n 'tcp and (tcp[tcpflags] & tcp-rst != 0)' | head -20
# Source of RST tells you who is resetting: server app, client, or middlebox
```

## Common Causes and Diagnosis

### Cause 1: Application Timeout

```bash
# Application has a request timeout shorter than the actual operation
# Check application logs for timeout messages
journalctl -u myapp | grep -i "timeout\|deadline\|cancel" | tail -20

# Check if the timeout is configurable
# Python example:
# requests.get(url, timeout=5)  ← 5 second connect/read timeout
# If the server sends no bytes for >5 seconds: the request times out and closes
```

### Cause 2: Load Balancer Idle Timeout

```bash
# Load balancers and proxies drop connections idle > their configured timeout
# AWS ALB idle timeout: 60 seconds default
# nginx proxy_read_timeout: 60 seconds default between successive reads
# HAProxy: no built-in 50 second default; timeout client/server/tunnel must be configured explicitly

# Verify by testing with explicit timing:
time curl -v http://myservice/slow-endpoint -o /dev/null

# If failure occurs at ~60 seconds of no traffic: proxy/LB idle timeout
# Fix: increase the proxy/LB timeout or send application data/heartbeats before it expires
# TCP keepalives only help if the application enables SO_KEEPALIVE and the intermediary treats probes as activity
sysctl -w net.ipv4.tcp_keepalive_time=30
sysctl -w net.ipv4.tcp_keepalive_intvl=10
```

### Cause 3: File Descriptor Exhaustion

```bash
# When FD limit is reached, the application cannot accept or open more sockets

# Check current FD usage and limits for the process
ls /proc/$(pgrep myapp)/fd | wc -l
cat /proc/$(pgrep myapp)/limits | grep "Max open files"
ulimit -n   # current shell/session soft limit

# Check for FD exhaustion errors in logs
journalctl -u myapp | grep -i "too many open files\|EMFILE"

# Increase FD limit in the current shell/session
ulimit -n 65536

# For a systemd service, set a persistent limit in the unit
systemctl edit myapp
# Add:
# [Service]
# LimitNOFILE=65536
```

### Cause 4: Application Thread/Goroutine Exhaustion

```bash
# Application runs out of threads to handle new connections
# New connections may queue, time out, or be reset once work cannot be scheduled

# Check thread count for the process
cat /proc/$(pgrep myapp)/status | grep Threads

# For Java: thread pool exhaustion
# Check thread pool metrics via JMX or application metrics

# For Python: check if using asyncio properly
# Blocking calls in async code stall the event loop and delay socket handling
```

### Cause 5: Connection Pool Overflow

```python
# Applications with connection pools drop connections when pool is full
# Example: database connection pool exhausted

# Python with SQLAlchemy
from sqlalchemy import create_engine
engine = create_engine(
    'postgresql://user:pass@host/db',
    pool_size=10,          # Maximum connections
    max_overflow=5,        # Extra connections under load
    pool_timeout=30,       # Wait 30s for available connection
    pool_recycle=3600      # Recycle connections after 1 hour
)
# If all 15 connections busy: next request waits 30s then fails
# Fix: increase pool_size or diagnose why connections aren't being returned
```

## Systematic Diagnosis

```bash
# 1. When does it fail? (timing pattern)
# 2. What does the RST look like? (source IP, sequence context)
tcpdump -i eth0 -n -v 'tcp[tcpflags] & tcp-rst != 0' -c 10

# 3. Check application metrics
# - Active connection count
# - Error rate
# - Response time distribution

# 4. Check system resource limits
ulimit -a
ss -Htn | wc -l               # Current TCP connection count
cat /proc/sys/fs/file-nr      # System-wide FD usage
```

## Conclusion

Application-level TCP drops require investigating beyond the network layer. When the failure is a reset, the RST source identifies the culprit: application RST indicates timeout or resource exhaustion in the app; middlebox RST indicates proxy/LB timeout. If an intermediary enforces idle timeouts, increase that timeout or ensure the application sends traffic or heartbeats before it expires; TCP keepalives only help when the application enables them and the intermediary treats them as activity. Check resource limits (FDs, threads, connection pools), and correlate failure timing with configured timeout values.
