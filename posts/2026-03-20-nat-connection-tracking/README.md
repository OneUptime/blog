# How to Troubleshoot NAT with Connection Tracking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, NAT, Linux, Conntrack, Troubleshooting

Description: Learn how to use Linux connection tracking (conntrack) to diagnose NAT issues, inspect session state, and resolve common problems.

## What Is Connection Tracking?

Linux connection tracking (conntrack) maintains a state table of all active network connections. NAT relies on conntrack to associate incoming packets with the correct NAT translation.

```bash
# Install conntrack-tools

apt install conntrack     # Debian/Ubuntu
yum install conntrack-tools  # RHEL/CentOS
```

## Viewing the Connection Tracking Table

```bash
# Show all tracked connections
conntrack -L

# Show only established connections
conntrack -L | grep ESTABLISHED

# Show only NAT'd connections
conntrack -L --src-nat
conntrack -L --dst-nat

# Count active connections
conntrack -L | wc -l
```

Sample output:

```text
tcp  6  432000  ESTABLISHED  src=192.168.1.10 dst=8.8.8.8 sport=54321 dport=80 
     src=8.8.8.8 dst=203.0.113.1 sport=80 dport=54321 [ASSURED] mark=0 use=1
```

The two tuples represent:
- **Forward**: internal client → destination (pre-NAT view)
- **Reverse**: destination → NATted IP (how reply arrives)

## Real-Time Connection Monitoring

```bash
# Watch new connections as they appear
conntrack -E

# Watch only new TCP connections
conntrack -E -e NEW -p tcp

# Watch for connections to a specific host
conntrack -E | grep 192.168.1.10
```

## Checking conntrack Table Limits

```bash
# Current count vs maximum
cat /proc/sys/net/netfilter/nf_conntrack_count
cat /proc/sys/net/netfilter/nf_conntrack_max

# If count is near max, connections will be dropped
# Increase the limit
sysctl -w net.netfilter.nf_conntrack_max=262144
echo "net.netfilter.nf_conntrack_max = 262144" >> /etc/sysctl.conf
```

## Diagnosing Specific NAT Issues

### Port Forwarding Not Working

```bash
# 1. Confirm DNAT rule exists
iptables -t nat -L PREROUTING -n -v | grep dpt:80

# 2. Check if conntrack is seeing the connection
conntrack -E | grep "dport=80"

# 3. If conntrack shows the connection but it fails, check FORWARD rule
iptables -L FORWARD -n -v | grep "192.168.1.10"
```

### Stale Connections After NAT Change

```bash
# Delete stale/outdated connections
conntrack -D -p tcp --dport 80

# Delete all connections for a specific host
conntrack -D --src 192.168.1.10

# Delete all connections from a source subnet (e.g., LAN clients)
conntrack -D -s 192.168.1.0/24

# Flush all tracked connections
conntrack -F
```

### Connections Being Dropped (Table Full)

```bash
# Check kernel messages for drops
dmesg | grep "nf_conntrack: table full"

# Check current count
cat /proc/sys/net/netfilter/nf_conntrack_count

# Increase limit
sysctl -w net.netfilter.nf_conntrack_max=524288
```

## conntrack Statistics per CPU

```bash
# Show per-CPU conntrack statistics
conntrack -S

# Shows found, invalid, ignore, insert, insert_failed, drop, early_drop, error
```

## Conntrack Timeout Tuning

```bash
# View TCP timeouts
sysctl -a | grep conntrack_tcp

# Common timeouts to tune for busy NAT gateways:
sysctl -w net.netfilter.nf_conntrack_tcp_timeout_established=1800   # 30 min (default 5 days)
sysctl -w net.netfilter.nf_conntrack_tcp_timeout_time_wait=60       # 1 min
sysctl -w net.netfilter.nf_conntrack_tcp_timeout_close_wait=30      # 30 sec
```

## Key Takeaways

- `conntrack -L` shows all active NAT sessions with source, destination, and translated addresses.
- `conntrack -E` monitors new/destroyed connections in real time.
- Table full errors (`nf_conntrack_max`) cause silent connection drops - increase the limit.
- Tuning TCP timeouts (`nf_conntrack_tcp_timeout_established`) frees up table entries faster.

**Related Reading:**

- [How to View the NAT Translation Table on Linux](https://oneuptime.com/blog/post/2026-03-20-view-nat-translation-table-linux/view)
- [How to Troubleshoot NAT Translation Issues](https://oneuptime.com/blog/post/2026-03-20-troubleshoot-nat-translation/view)
- [How to Debug NAT Issues with Packet Captures](https://oneuptime.com/blog/post/2026-03-20-debug-nat-packet-captures/view)
