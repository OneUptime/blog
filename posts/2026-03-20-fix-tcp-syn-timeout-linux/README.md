# How to Fix TCP SYN Timeout Issues on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Linux, Networking, SYN, Timeout, Kernel

Description: Diagnose and fix TCP SYN timeout problems on Linux by tuning kernel retransmission parameters, SYN backlog queues, and SYN cookie protection.

## Introduction

A TCP SYN timeout occurs when a client sends a SYN packet but never receives a SYN-ACK, causing the connection attempt to fail after multiple retransmissions. On Linux, the kernel controls how many times it retransmits SYN before giving up, and how long it waits between retries. Tuning these parameters balances connection reliability against resource usage.

## Understanding SYN Retransmission

Linux retransmits SYN packets using backoff, but the exact timing depends on kernel version and `net.ipv4.tcp_syn_linear_timeouts`:

```text
Current Linux defaults:
tcp_syn_retries = 6
tcp_syn_linear_timeouts = 4
Active connect() timeout: ~131 seconds before "Connection timed out"
```

## Viewing and Adjusting SYN Retry Count

```bash
# View current SYN retry count (default: 6)

sysctl net.ipv4.tcp_syn_retries
# net.ipv4.tcp_syn_retries = 6

# Reduce retries to fail faster (useful for services that quickly need to know)
# Exact timeout also depends on net.ipv4.tcp_syn_linear_timeouts
sysctl -w net.ipv4.tcp_syn_retries=3

# For servers responding to inbound SYNs (SYN-ACK retries)
sysctl net.ipv4.tcp_synack_retries
# Default: 5

# Reduce SYN-ACK retries to free resources faster during SYN floods
sysctl -w net.ipv4.tcp_synack_retries=3
```

## SYN Backlog Queue Configuration

The SYN backlog queue holds half-open connections waiting for the final ACK. This is separate from the `listen()` backlog, which controls completed connections waiting to be accepted:

```bash
# View current SYN backlog size
sysctl net.ipv4.tcp_max_syn_backlog
# Default varies by kernel and available memory

# Increase for high-traffic services
sysctl -w net.ipv4.tcp_max_syn_backlog=4096

# Application-level accept queue backlog (backlog argument to listen())
# Python example:
# socket.listen(1024)  # Capped by net.core.somaxconn
```

## SYN Cookies (Protection Against SYN Floods)

SYN cookies allow the server to avoid allocating state for each SYN when the queue overflows, helping mitigate SYN flood attacks:

```bash
# Check if SYN cookies are enabled
sysctl net.ipv4.tcp_syncookies
# 1 = enabled when queue overflows (default)
# 2 = always enabled for testing

# Keep SYN cookies enabled for overflow protection
sysctl -w net.ipv4.tcp_syncookies=1
echo "net.ipv4.tcp_syncookies=1" >> /etc/sysctl.conf
```

## Diagnosing SYN Timeouts

```bash
# Check listen queue overflow / SYN-cookie counters
nstat -az TcpExtListenDrops TcpExtListenOverflows \
  TcpExtTCPReqQFullDrop TcpExtTCPReqQFullDoCookies TcpExtSyncookiesSent

# Check kernel messages for SYN flood warnings
dmesg | grep "SYN flooding"
# "Possible SYN flooding on port 80. Sending cookies."

# Watch active SYN_SENT connections
watch -n 1 "ss -Htn state syn-sent | wc -l"

# Capture repeated client SYNs
tcpdump -i eth0 -n 'tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn' | \
  awk '{count[$3]++; if (count[$3]>2) print "Multiple SYNs from: "$3}'
```

## Application-Level SYN Timeout Configuration

```python
import socket

# Set a 5-second timeout for connect()
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(5)  # May raise socket.timeout before the kernel's own timeout

try:
    s.connect(('10.20.0.5', 8080))
except socket.timeout:
    print("Connection attempt timed out after 5 seconds")
except ConnectionRefusedError:
    print("Connection refused - RST received")
```

## Conclusion

TCP SYN timeouts are controlled by kernel parameters that balance reliability with resource efficiency. Reduce `tcp_syn_retries` to fail faster in environments where quick failure detection matters. Increase `tcp_max_syn_backlog` for high-traffic servers. Leave `tcp_syncookies=1` as overflow protection, but do not rely on SYN cookies as a scaling mechanism for overloaded servers. Application-level timeouts should usually be much shorter than the kernel's default active-connect timeout.
