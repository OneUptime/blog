# How to Fix TCP Connection Reset by Peer Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, RST, Reset, Connection, Debugging, Linux, Networking

Description: Diagnose and fix TCP 'connection reset by peer' errors by identifying whether the RST originates from the application, a proxy, a firewall, or the kernel.

## Introduction

"Connection reset by peer" means a TCP RST segment was received mid-connection. Unlike a graceful FIN (which is normal connection close), a RST abruptly terminates the connection discarding any data in flight. RSTs come from several sources: the peer application aborting the connection or explicitly calling SO_LINGER with linger=0, a proxy or load balancer with a shorter idle timeout, a firewall rule, or the Linux kernel's RST generation for packets that no longer match a live connection.

## Identify the RST Source

```bash
# Capture on the interface to see who sends the RST

tcpdump -i eth0 -n 'tcp[tcpflags] & tcp-rst != 0' -w /tmp/rst.pcap

# Analyze: who is the source address of the RST?
tcpdump -r /tmp/rst.pcap -n 'tcp[tcpflags] & tcp-rst != 0' | \
  awk '{print $3}' | sort | uniq -c | sort -rn
# Source address of RST = entity sending the reset as seen at the capture point
```

## RST Sources and Fixes

### 1. Application Aborts the Connection or Closes with Unread Data

```bash
# The remote app aborted the connection or closed while unread data was still pending
# RST comes from the remote host after its TCP stack discards the connection

# Check if the remote service is stable:
systemctl status remote-service
journalctl -u remote-service --since "5 minutes ago" | tail -20

# Fix: Ensure the application drains pending inbound data and closes cleanly
# In Python: avoid abortive close; if you need a half-close, use socket.shutdown(socket.SHUT_WR) and keep reading until EOF before close()
# In Java: if you need a half-close, use socket.shutdownOutput(), then socket.close() after reading EOF
```

### 2. Proxy or Load Balancer Idle Timeout

```bash
# Proxy or load balancer may close idle connections; some devices do this with RST
# Symptom: RST appears after exact idle period (e.g., 60 seconds)

# Check proxy timeout config (nginx example):
grep -R -E "keepalive_timeout|proxy_read_timeout|proxy_connect_timeout" /etc/nginx

# Fix options:
# 1. Enable TCP keepalives on sockets used by your application
sysctl -w net.ipv4.tcp_keepalive_time=30    # Start keepalives after 30s idle
sysctl -w net.ipv4.tcp_keepalive_intvl=10   # Probe every 10s
sysctl -w net.ipv4.tcp_keepalive_probes=3   # 3 probes before drop

# 2. Increase proxy idle timeout to match your application's idle pattern
# 3. Implement connection pool keepalive in application code
```

### 3. Firewall Stateful Table Expiry

```bash
# Stateful firewall drops connection from its table (memory pressure or timeout)
# Later packets may be treated as INVALID and then dropped or rejected by policy

# Check conntrack table size:
sysctl net.netfilter.nf_conntrack_count
sysctl net.netfilter.nf_conntrack_max

# If count is close to max: table exhausted
# Fix: increase max or reduce timeout values
sysctl -w net.netfilter.nf_conntrack_max=262144
sysctl -w net.netfilter.nf_conntrack_tcp_timeout_established=600  # 10 minutes

# Check for TCP resets explicitly configured by the firewall:
iptables -S | grep -- '--reject-with tcp-reset'
# REJECT returns ICMP by default; --reject-with tcp-reset sends a TCP RST for TCP traffic
# If the peer receives a RST from your firewall, the reset is originating from the firewall
```

### 4. SO_LINGER with Linger=0

```bash
# Some applications set SO_LINGER with l_linger=0
# This causes immediate RST on socket close (no graceful FIN)
# Common in web servers to quickly reclaim resources

# Check if application uses SO_LINGER:
strace -e trace=setsockopt -p "$(pgrep myapp)" 2>&1 | grep LINGER

# In application code (Python fix):
# Remove: s.setsockopt(socket.SOL_SOCKET, socket.SO_LINGER, struct.pack('ii', 1, 0))
# Use graceful close instead
```

### 5. Packet Arrives for a Closed Connection

```bash
# Linux sends RST when it receives a segment for a connection that no longer exists locally
# Causes: peer reboot, application restart that lost the socket, late packets after close

# Compare the 4-tuple from tcpdump with local socket state on the RST-sending host:
ss -tan
# If there is no matching ESTABLISHED socket for that 4-tuple, the host no longer has connection state

# Fix: ensure proper connection close before reuse
# For persistent connections: validate connection is alive before reuse
# Use connection health checks in connection pools
```

## Application-Level Fixes

```bash
# 1. Handle reset errors gracefully (retry logic)
# In any language: catch ECONNRESET and retry only idempotent operations with exponential backoff

# 2. Enable TCP keepalives at application level (most robust fix)
# Python example:
# import socket
# sock.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
# sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPIDLE, 30)
# sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPINTVL, 10)
# sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_KEEPCNT, 3)
```

## Conclusion

TCP connection resets always have a sender. Use tcpdump to identify the RST source address - that tells you which component is sending it. Application abortive closes or closes with unread data cause RSTs from the remote host. Proxy/firewall timeouts may show up after an idle period from the proxy/firewall IP. Kernel RSTs commonly come from hosts that no longer have connection state for that 4-tuple, or from sockets configured for abortive close via linger settings. Fix at the source: configure keepalives for timeout-related resets, fix application shutdown for abortive closes, and tune firewall tables for conntrack exhaustion.
