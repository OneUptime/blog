# How to Diagnose and Fix TCP Connection Resets Across Firewalls

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP RST, Firewall, Connection Reset, tcpdump, Troubleshooting, Conntrack, IPv4

Description: Learn how to diagnose TCP connection resets (RST) that are injected by firewalls, load balancers, or idle connection timeouts, and how to fix them in production environments.

---

TCP RST packets abruptly terminate connections. When RSTs appear between a client and server and packet captures on both endpoints show neither side sent them, a middlebox (firewall, load balancer, NAT device) or traffic injection is the likely culprit.

## Capturing RST Packets

```bash
# Capture all TCP RSTs

tcpdump -i eth0 -nn "tcp[tcpflags] & tcp-rst != 0"

# Capture RSTs on a specific port
tcpdump -i eth0 -nn "tcp[tcpflags] & tcp-rst != 0 and port 443"

# Write to file for analysis
tcpdump -i eth0 -w /tmp/resets.pcap "tcp[tcpflags] & tcp-rst != 0"
```

## Identifying the Source of RSTs

```bash
# In tcpdump output, check the source IP of RST packets, then verify with captures
# on both endpoints because middleboxes can generate RSTs using endpoint IPs.
# RST from server IP → usually server is actively rejecting (port closed, state mismatch)
# RST from firewall IP → firewall timeout or policy
# RST from unexpected IP → TCP RST injection (IDS/IPS or firewall)

# Check if connection tracking has the flow
conntrack -L | grep "192.168.1.100"
```

## Common Causes and Fixes

### 1. Firewall Idle Timeout

```bash
# Linux conntrack: check TCP established timeout
sysctl net.netfilter.nf_conntrack_tcp_timeout_established
# Default: 432000 (5 days)

# Adjust to match application and firewall expectations
sysctl -w net.netfilter.nf_conntrack_tcp_timeout_established=3600

# Configure TCP keepalive timers; applications/services must enable SO_KEEPALIVE
# Send keepalives more frequently to keep connections alive through firewall
sysctl -w net.ipv4.tcp_keepalive_time=60
sysctl -w net.ipv4.tcp_keepalive_intvl=10
sysctl -w net.ipv4.tcp_keepalive_probes=5
```

### 2. AWS NAT Gateway Idle Timeout

```text
Symptom: RST when a connection is reused after 350+ seconds idle
Cause: AWS NAT gateway idle timeout is 350 seconds
Fix: Enable TCP keepalive on the instance/application with idle time < 350 seconds
```

### 3. iptables Rejecting INVALID Packets With RST

```bash
# iptables: drop INVALID packets so they are not rejected with TCP RST
iptables -I FORWARD -m conntrack --ctstate INVALID -j DROP

# Log INVALID packets before dropping
iptables -I FORWARD -m conntrack --ctstate INVALID -j LOG --log-prefix "INVALID: "
```

### 4. Half-Open Connections After Server Restart

```bash
# After server restart, firewall still has old connection state
# Fix: drain or close connections before server shutdown so peers see FIN/RST
# Or clear conntrack table
conntrack -F

# Check for SYN_SENT connections with no response
ss -tan state syn-sent
```

## Differentiating RST Sources

```bash
# Use ttl to identify RST source
tcpdump -i eth0 -l -v "tcp[tcpflags] & tcp-rst != 0" | grep "ttl"
# Compare TTLs with packets known to come from the real endpoint
# A middlebox-generated RST often has a different remaining TTL/hop count
# A close firewall usually shows fewer TTL decrements than a distant server
```

## Key Takeaways

- Capture RSTs with `tcpdump "tcp[tcpflags] & tcp-rst != 0"` and verify the source with endpoint captures, TTL, and path context.
- Enable TCP keepalive with intervals shorter than the firewall's idle timeout to prevent state expiry.
- `INVALID` conntrack state packets (out-of-state) should be dropped, not RST'd, to prevent RST injection.
- AWS NAT gateway has a 350-second idle timeout; enable application/socket keepalive below this threshold.
