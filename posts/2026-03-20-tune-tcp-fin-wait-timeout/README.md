# How to Tune TCP FIN_WAIT Timeout on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Linux, FIN_WAIT, Networking, Kernel, Performance

Description: Understand the FIN_WAIT states in TCP connection teardown and tune the fin_timeout kernel parameter to reduce resource consumption from long-lived half-closed connections.

## Introduction

After a TCP connection is closed by the active closer, it passes through FIN_WAIT1 and FIN_WAIT2 states before reaching TIME_WAIT. The `tcp_fin_timeout` parameter controls how long the kernel keeps a socket in FIN_WAIT2 before forcibly closing it. Reducing this timeout frees resources faster but must be done carefully to avoid breaking RFC-compliant connections.

## FIN_WAIT States Explained

```text
Active closer (sends first FIN):

ESTABLISHED → FIN_WAIT1 (FIN sent, waiting for ACK)
            → FIN_WAIT2 (ACK received, waiting for remote FIN)
            → TIME_WAIT (both FINs exchanged)
            → CLOSED

tcp_fin_timeout: maximum time in FIN_WAIT2
If remote never sends FIN, connection stays in FIN_WAIT2
```

## Viewing FIN_WAIT Connections

```bash
# Show FIN_WAIT1 connections

ss -tn state fin-wait-1

# Show FIN_WAIT2 connections
ss -tn state fin-wait-2

# Count both
ss -tn state fin-wait-1 | wc -l
ss -tn state fin-wait-2 | wc -l

# Show with timing information
ss -tn -o state fin-wait-2 | head -20
# Look for "timer:keepalive" with large timeout values (tcp_fin_timeout countdown)
```

## Configuring tcp_fin_timeout

```bash
# View current FIN_WAIT2 timeout (default: 60 seconds)
sysctl net.ipv4.tcp_fin_timeout

# Reduce to 30 seconds (saves resources, still RFC-compliant)
sysctl -w net.ipv4.tcp_fin_timeout=30

# For very high connection rate servers: 15 seconds
# (only appropriate if you control both endpoints)
sysctl -w net.ipv4.tcp_fin_timeout=15

# Persist
echo "net.ipv4.tcp_fin_timeout=30" >> /etc/sysctl.conf
sysctl -p
```

## When FIN_WAIT2 Connections Accumulate

```bash
# Large numbers of FIN_WAIT2 connections indicate:
# 1. Remote side received FIN but never responds with its own FIN
#    (remote app not properly calling close())
# 2. Network connectivity to remote is lost mid-close
# 3. Very slow remote applications

# Check if connections are all to the same remote host
ss -tn state fin-wait-2 | awk '{print $5}' | cut -d: -f1 | sort | uniq -c
# If one host dominates: that host has the slow-close bug

# Monitor how many resolve vs accumulate
watch -n 5 "ss -tn state fin-wait-2 | wc -l"
# Should be relatively stable, not constantly growing
```

## FIN_WAIT2 vs TIME_WAIT

```bash
# FIN_WAIT2: waiting for remote's FIN (only remote can move you out of this)
# TIME_WAIT: both FINs exchanged, waiting 2×MSL (60-120s timer)

# tcp_fin_timeout controls FIN_WAIT2 duration
# TIME_WAIT duration is fixed at 2×MSL (approximately 60s)

# Verify a socket is in which state
ss -tn -o | grep "10.20.0.5"
# timer:timewait,Xsec = in TIME_WAIT
# timer:keepalive,Xsec = in FIN_WAIT2 (orphaned; tcp_fin_timeout countdown)
```

## Graceful Shutdown Best Practice

```python
# Properly close connections to avoid leaving remote in FIN_WAIT
import socket

def close_connection(sock):
    """Gracefully close a TCP connection."""
    try:
        # Send FIN and wait for remote's FIN (half-close first)
        sock.shutdown(socket.SHUT_WR)  # Send FIN

        # Read any remaining data from remote
        while True:
            data = sock.recv(4096)
            if not data:
                break  # Remote's FIN received

    finally:
        sock.close()  # Final close, sends ACK for remote's FIN
```

## Conclusion

`tcp_fin_timeout` controls how long the kernel waits in FIN_WAIT2 for the remote side's FIN. Reducing it from 60 to 30 seconds is generally safe and reduces resource consumption under high connection churn. Very large FIN_WAIT2 counts usually indicate a remote application bug (not calling close properly) rather than a local configuration issue.
