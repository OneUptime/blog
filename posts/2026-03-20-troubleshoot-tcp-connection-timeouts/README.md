# How to Troubleshoot TCP Connection Timeouts Between Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Networking, Troubleshooting, Timeout, Linux, Microservice

Description: Systematically diagnose TCP connection timeouts between services by checking routing, firewall rules, socket backlogs, and application-level configuration.

## Introduction

A TCP connection timeout means a client sent a SYN but never received a SYN-ACK. The connection attempt silently fails after the kernel exhausts its SYN retransmission attempts (about 127 seconds by default with `tcp_syn_retries=6`). Timeouts are distinct from "connection refused" (which gets an immediate RST) and often indicate a firewall drop, routing failure, or overloaded server.

## Step 1: Verify Network Reachability

```bash
# First confirm L3 connectivity

ping -c 4 10.20.0.5

# Then confirm the port responds at all
nc -zv 10.20.0.5 8080
# "succeeded" = port open
# "timed out" = SYN dropped or filtered
# "refused" = RST received (port closed)

# Timeout indicates: firewall dropping SYN, server overloaded, or routing issue
```

## Step 2: Capture the SYN Exchange

```bash
# On the CLIENT: verify the SYN is being sent
tcpdump -i eth0 -n 'tcp and host 10.20.0.5 and port 8080'

# On the SERVER: check if SYN is arriving
tcpdump -i eth0 -n 'tcp and port 8080'

# If SYN visible on client but not on server: firewall or routing issue in between
# If SYN visible on both: server is not responding (overloaded or misconfigured)
```

## Step 3: Check Server-Side Accept Queue

```bash
# If SYN arrives but server doesn't respond: accept queue may be full
ss -tlnp | grep ":8080"
# Output: Recv-Q = number of pending connections in accept queue
# If Recv-Q >= backlog size: application is not accepting fast enough

# Check kernel listen backlog
ss -tlnp
# tcp LISTEN 0 128 0.0.0.0:8080
#            ^ ^  ^ Recv-Q  ^ Send-Q = backlog size
# If Recv-Q is close to 128: increase backlog

# Increase system-wide maximum backlog
sysctl -w net.core.somaxconn=1024

# Application must also call listen() with higher backlog
# Python: socket.listen(1024)
```

## Step 4: Check Firewall Rules

```bash
# Check iptables for rules that DROP (not REJECT) on the target port
iptables -L INPUT -n -v | grep "8080"
iptables -L FORWARD -n -v | grep "8080"

# DROP rules cause timeouts; REJECT rules cause "Connection refused"
# If DROP rule exists:
iptables -D INPUT -p tcp --dport 8080 -j DROP
iptables -I INPUT -p tcp --dport 8080 -j ACCEPT
```

## Step 5: Check for SYN Flood Protection

```bash
# If SYN flood protection is too aggressive, legitimate SYNs get dropped
dmesg | grep "SYN flooding"

# Check SYN backlog and cookies
sysctl net.ipv4.tcp_max_syn_backlog
sysctl net.ipv4.tcp_syncookies

# If max_syn_backlog is too small:
sysctl -w net.ipv4.tcp_max_syn_backlog=4096
```

## Step 6: Application-Level Timeout Configuration

```python
import httpx
import socket

# Set connection timeout in httpx (Python)
client = httpx.Client(timeout=httpx.Timeout(
    connect=5.0,     # Fail if SYN-ACK not received in 5 seconds
    read=30.0,       # Fail if no data received in 30 seconds
    write=10.0,
    pool=5.0         # Fail if no connection available from pool in 5 seconds
))

# Standard socket
s = socket.socket()
s.settimeout(5)   # Timeout for connect(), recv(), send()
try:
    s.connect(('10.20.0.5', 8080))
except TimeoutError:
    print("No SYN-ACK received within 5 seconds")
```

## Conclusion

TCP connection timeouts follow a clear diagnostic path: confirm reachability with ping, capture SYN traffic on both ends to locate the drop point, check accept queue depth for server-side issues, and verify firewall rules for DROP policies. Setting application-level timeouts much lower than the kernel default (~127s) prevents cascading failures when downstream services are slow to respond.
