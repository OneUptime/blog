# How to Analyze Network Performance with ss, netstat, and nload on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Networking, Performance, Ss, Netstat, Monitoring

Description: Use ss, netstat, and nload on RHEL to analyze network connections, identify bottlenecks, and monitor bandwidth usage in real time.

---

Troubleshooting network performance on RHEL requires the right tools. The `ss` command is the modern replacement for `netstat`, while `nload` provides real-time bandwidth monitoring.

## Using ss (Socket Statistics)

`ss` is faster than `netstat` and installed by default on RHEL.

```bash
# Show all TCP connections
ss -t -a

# Show listening TCP sockets with process info
ss -tlnp

# Show established connections only
ss -t state established

# Show connections to a specific port
ss -t dst :443

# Show socket memory usage
ss -tm

# Count connections by state
ss -s
```

Interpreting the output:

```bash
# Show detailed TCP info including congestion window
ss -ti dst :80

# Filter by source IP
ss -t src 192.168.1.100

# Show connections with timer information
ss -to state established
```

## Using netstat (Legacy)

`netstat` is part of the `net-tools` package:

```bash
# Install net-tools if needed
sudo dnf install -y net-tools

# Show all listening ports
netstat -tlnp

# Show network statistics
netstat -s

# Show interface statistics
netstat -i

# Show the routing table
netstat -rn
```

## Real-Time Bandwidth Monitoring with nload

```bash
# Install nload from EPEL
sudo dnf install -y nload

# Monitor all interfaces in real time
nload

# Monitor a specific interface
nload ens192

# Use -m flag to show multiple interfaces at once
nload -m
```

nload shows incoming and outgoing traffic with current, average, min, and max bandwidth.

## Advanced Analysis

```bash
# Find the top connections by data transfer
ss -tn | awk '{print $5}' | sort | uniq -c | sort -rn | head -10

# Check for connections in TIME_WAIT state (potential issue)
ss -t state time-wait | wc -l

# Check for SYN_RECV (potential SYN flood)
ss -t state syn-recv | wc -l

# Monitor per-interface packet counts and errors
ip -s link show ens192
```

## Quick Network Health Check Script

```bash
#!/bin/bash
# network-health.sh - Quick network health snapshot
echo "=== Connection Summary ==="
ss -s
echo ""
echo "=== Listening Services ==="
ss -tlnp
echo ""
echo "=== Interface Errors ==="
ip -s link show | grep -E "link|errors"
echo ""
echo "=== TIME_WAIT Count ==="
ss -t state time-wait | wc -l
```

Use `ss` for quick connection analysis and `nload` for ongoing bandwidth monitoring. For deeper packet-level analysis, use `tcpdump`.
