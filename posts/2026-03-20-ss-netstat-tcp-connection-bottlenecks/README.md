# How to Use ss and netstat to Identify TCP Connection Bottlenecks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ss, netstat, TCP, Linux, Troubleshooting, Connection States, Network Monitoring

Description: Learn how to use the ss and netstat commands to identify TCP connection bottlenecks, including connection state counts, socket queues, retransmits, and port exhaustion.

---

`ss` (socket statistics) is the modern replacement for `netstat`, offering faster output and more detail. Both tools are essential for diagnosing TCP connection bottlenecks.

## Basic Connection Overview

```bash
# Summary of all socket states

ss -s

# Output:
# Total: 1234
# TCP:   456 (estab 200, closed 10, orphaned 2, timewait 244)
#
# Transport  Total  IP   IPv6
# RAW        0      0    0
# UDP        12     8    4
# TCP        456    400  56

# Related netstat TCP counters (not a socket-state summary)
netstat -s | grep -E "connections|failed|reset"
```

## Counting Connections by State

```bash
# Count TCP connections by state
ss -Htan | awk '{print $1}' | sort | uniq -c | sort -rn

# Output:
#  244 TIME-WAIT
#  200 ESTAB
#   10 CLOSE-WAIT
#    5 SYN-SENT

# netstat equivalent
netstat -tan | awk 'NR>2 {print $6}' | sort | uniq -c | sort -rn
```

## Identifying Listen Queue Backlog

```bash
# Show listen queue: Recv-Q is queued but not accepted; Send-Q is the backlog limit
ss -tlnp

# Output columns: State, Recv-Q, Send-Q, Local Address, Peer Address, Process
# LISTEN  0  128  0.0.0.0:80  0.0.0.0:*  users:(("nginx",pid=1234,fd=6))

# Recv-Q approaching the Send-Q backlog limit (128) indicates accept() bottleneck
# Raise the kernel cap and ensure the app's listen() backlog is high enough:
# sysctl -w net.core.somaxconn=65535
```

## Finding Connections with Large Send/Receive Queues

```bash
# For established TCP sockets, Recv-Q is bytes not read by the application;
# Send-Q is bytes sent or queued locally but not yet acknowledged.
ss -Htn | awk '$2>0' | head    # Non-zero Recv-Q
ss -Htn | awk '$3>0' | head    # Non-zero Send-Q

# Sort by send queue size
ss -Htn | sort -k3 -rn | head -20
```

## Viewing Per-Connection Details (Retransmits, RTT)

```bash
# Show extended info: retransmits, RTT, congestion window
ss -tni | grep -A1 ESTAB | grep -v ESTAB | head -40

# Example output:
# cubic rto:204 rtt:0.5/0.25 ato:40 mss:1460 pmtu:1500 rcvmss:1460 \
#   advmss:1460 cwnd:10 bytes_acked:12345 retrans:0/0 ...
```

## Detecting Port Exhaustion

```bash
# Check ephemeral port range
sysctl net.ipv4.ip_local_port_range
# Common default: 32768 60999  (28232 ports)

# Count TIME_WAIT sockets. A high count matters most when many are for the same remote endpoint.
ss -Htan state time-wait | wc -l

# If many short-lived connections to the same endpoint approach the available range,
# you're approaching ephemeral port exhaustion.
# Mitigate by widening the range; enable global tcp_tw_reuse only after testing.
sysctl -w net.ipv4.ip_local_port_range="20000 65535"
sysctl -w net.ipv4.tcp_tw_reuse=1
```

## Identifying Connections by Process

```bash
# Show which process owns each connection (requires root for sockets you do not own)
ss -tnp | grep :80

# Output:
# ESTAB 0 0 10.0.0.1:80 10.0.0.50:45678 users:(("nginx",pid=1234,fd=12))

# netstat equivalent
netstat -tnp | grep :80
```

## Quick Bottleneck Diagnostic Script

```bash
#!/bin/bash
echo "=== Socket Summary ==="
ss -s

echo ""
echo "=== TCP States ==="
ss -Htan | awk '{print $1}' | sort | uniq -c | sort -rn

echo ""
echo "=== Listen Backlogs (Recv-Q > 0) ==="
ss -Htlnp | awk '$2>0'

echo ""
echo "=== High Send-Q Connections ==="
ss -Htn | awk '$3>10000' | head -10
```

## Key Takeaways

- Use `ss -s` for a quick overview; use state counts to find high TIME-WAIT or CLOSE-WAIT counts.
- A high Recv-Q on a LISTEN socket indicates the application is not accepting connections fast enough.
- Use `ss -tni` to see per-connection retransmit counts and RTT - high retransmits can indicate packet loss.
- Ephemeral port exhaustion can cause `connect: Cannot assign requested address`; mitigate with wider port ranges and carefully tested `tcp_tw_reuse` settings.
