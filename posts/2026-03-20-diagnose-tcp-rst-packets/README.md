# How to Diagnose TCP RST (Reset) Packets in Your Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Networking, RST, Wireshark, Troubleshooting, tcpdump

Description: Identify the sources and causes of TCP RST packets that terminate connections unexpectedly, from firewalls and load balancers to application bugs and idle timeouts.

## Introduction

A TCP RST (Reset) packet immediately terminates a connection, with no graceful shutdown. The receiving end sees an error like "Connection reset by peer" or "Connection reset." RSTs can come from the remote application, an intermediate device like a firewall or load balancer, or even from the local kernel. Identifying the RST source is the key to fixing the problem.

## Capturing RST Packets

```bash
# Capture all RST packets

tcpdump -i eth0 -n 'tcp[tcpflags] & tcp-rst != 0'

# Capture RSTs for a specific destination
tcpdump -i eth0 -n 'tcp[tcpflags] & tcp-rst != 0 and dst host 10.20.0.5'

# Save to file for Wireshark analysis
tcpdump -i eth0 -w /tmp/resets.pcap 'tcp[tcpflags] & tcp-rst != 0'
```

## Identifying the RST Source

```bash
# The SOURCE IP of the RST packet usually tells you who is resetting the connection
# Source = remote server IP: server/app is resetting
# Source = your IP: local kernel or firewall is resetting
# Source = an intermediate IP (router, LB): middlebox is resetting

tcpdump -i eth0 -n -v 'tcp[tcpflags] & tcp-rst != 0' | head -30
# Look at: src IP, dst IP, and the TCP sequence number context
```

## Common RST Causes

### Cause 1: Connection to Closed Port

```bash
# Server sends RST when SYN arrives for a closed port
# Packet capture shows: SYN → RST immediately
tcpdump -n 'tcp and host 10.20.0.5 and port 8080'
# Check if service is running:
ss -tlnp | grep ":8080"
```

### Cause 2: Firewall Stateful Table Timeout

```bash
# Firewall/NAT forgets connection state; a later packet may be rejected, often as a RST
# Symptom: connection works for a while, then resets or fails with no apparent cause

# Check connection tracking timeout values
sysctl net.netfilter.nf_conntrack_tcp_timeout_established
# Default: 432000 (5 days) - if lower, connections may be timing out

# Adjust if too low
sysctl -w net.netfilter.nf_conntrack_tcp_timeout_established=86400
```

### Cause 3: Load Balancer or Proxy Timeout

```bash
# Load balancers and proxies have their own idle timeouts
# If a reused connection is idle past that timeout, the device may close it and the next packet may show up as a reset

# Check your LB/proxy timeout configuration
# AWS ALB: 60 seconds idle timeout by default
# nginx proxy_read_timeout default: 60 seconds
# HAProxy: check timeout client/server/tunnel in your config; there is no single 50-second default

# Fix: increase LB timeout or enable TCP keepalives on the sockets that need them
sysctl -w net.ipv4.tcp_keepalive_time=60      # Start keepalives after 60s idle
sysctl -w net.ipv4.tcp_keepalive_intvl=10     # Send keepalive every 10s
sysctl -w net.ipv4.tcp_keepalive_probes=6     # Give up after 6 failures
```

### Cause 4: Application RST (Intentional)

```python
# Application calls close() with SO_LINGER set to 0 (abortive close)
# Sends RST instead of FIN - intentional but may confuse other end

# In Python:
import socket
import struct
s = socket.socket()
s.setsockopt(socket.SOL_SOCKET, socket.SO_LINGER,
             struct.pack('ii', 1, 0))  # linger=1, timeout=0 → abortive close
s.close()  # Peer typically sees a reset
```

## Analyzing RST Context in Wireshark

When examining a pcap in Wireshark:
1. Filter: `tcp.flags.reset == 1`
2. Look at the packet BEFORE the RST - what was the last normal packet?
3. Check if the RST sequence number is valid for the flow state (legitimate RST)
4. A RST with seq=0 can still be valid, for example when replying to a SYN for a closed port

## Conclusion

TCP RSTs terminate connections abruptly and the source IP usually tells you who is responsible. RSTs from the server indicate application rejection or port closure. RSTs from intermediate devices (firewall, LB, NAT) often indicate idle timeouts or policy drops. RSTs from your own host indicate local kernel or application issues. Packet captures are essential - RSTs are not logged by default.
