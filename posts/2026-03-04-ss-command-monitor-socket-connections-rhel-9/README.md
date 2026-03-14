# How to Use the ss Command to Monitor Socket Connections on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ss, Sockets, Networking, Linux

Description: A comprehensive guide to using the ss command on RHEL for monitoring TCP/UDP sockets, investigating connection states, finding listening services, and diagnosing networking issues.

---

The `ss` command replaced `netstat` as the standard socket investigation tool on modern Linux. It's faster, more feature-rich, and reads directly from kernel data structures. If you're still using `netstat` out of habit, it's time to switch. On RHEL, `netstat` isn't even installed by default.

## Basic Usage

```bash
# Show all connections
ss

# Show all TCP connections
ss -t

# Show all UDP sockets
ss -u

# Show listening sockets only
ss -l

# Show listening TCP sockets
ss -lt

# Show listening UDP sockets
ss -lu
```

## Essential Flags

```bash
# Show numeric addresses (don't resolve hostnames)
ss -n

# Show process information
ss -p

# The most common combination: listening TCP with process info, numeric
ss -tlnp

# Everything: all sockets, numeric, with processes
ss -anp
```

## Finding Listening Services

This is probably the most common use case. What's listening on which port?

```bash
# Show all listening TCP and UDP sockets with process names
sudo ss -tulnp

# Find what's listening on port 80
sudo ss -tlnp | grep :80

# Find what's listening on port 443
sudo ss -tlnp | grep :443

# Find all ports a specific process is using
sudo ss -tlnp | grep nginx
```

## Investigating Connection States

TCP connections go through various states. Tracking these helps diagnose problems.

```bash
# Show connections in ESTABLISHED state
ss -t state established

# Show connections in TIME-WAIT
ss -t state time-wait

# Show connections in CLOSE-WAIT (potential resource leak)
ss -t state close-wait

# Show SYN-RECEIVED (potential SYN flood)
ss -t state syn-recv

# Count connections by state
ss -t -a | awk '{print $1}' | sort | uniq -c | sort -rn
```

## Filtering by Address and Port

ss has a powerful filtering syntax.

```bash
# Connections to a specific destination
ss -tn dst 192.168.1.100

# Connections from a specific source
ss -tn src 10.0.0.5

# Connections to a specific port
ss -tn dport = :443

# Connections from a specific port
ss -tn sport = :22

# Connections to a port range
ss -tn dport ge :8000 and dport le :9000
```

## Combining Filters

```bash
# Established connections to port 443
ss -tn state established dport = :443

# Connections from a subnet
ss -tn src 192.168.1.0/24

# Everything except SSH
ss -tn 'not dport = :22 and not sport = :22'
```

## Showing Socket Statistics

```bash
# Summary statistics
ss -s

# This shows counts of TCP, UDP, RAW sockets in various states
# Very useful for a quick health check
```

Example output:

```bash
Total: 156
TCP:   45 (estab 12, closed 8, orphaned 0, timewait 8)
Transport   Total   IP    IPv6
RAW         2       0     2
UDP         8       5     3
TCP         37      25    12
INET        47      30    17
FRAG        0       0     0
```

## Showing Timer Information

```bash
# Show timer information (retransmit, keepalive, etc.)
ss -to

# Useful for diagnosing connection stalls
ss -to state established
```

## Showing Detailed Socket Information

```bash
# Extended information including congestion control
ss -ti

# Memory usage information
ss -tm

# All the details
ss -temi
```

## Real-World Troubleshooting Scenarios

**Finding connections from a suspicious IP:**

```bash
# All connections from a specific IP
sudo ss -tnp src 203.0.113.50

# Count connections per source IP (find heavy hitters)
ss -tn state established | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -rn | head -20
```

**Checking for port exhaustion:**

```bash
# Count TIME-WAIT connections (high numbers indicate port exhaustion risk)
ss -t state time-wait | wc -l

# Count all connections per state
ss -tan | awk '{print $1}' | sort | uniq -c | sort -rn
```

**Finding which process has a port open:**

```bash
# Find the process using port 8080
sudo ss -tlnp | grep :8080
```

**Monitoring connection counts in real time:**

```bash
# Watch connection counts update every 2 seconds
watch -n 2 'ss -s'

# Watch established connection count
watch -n 2 'ss -t state established | wc -l'
```

## ss vs netstat Comparison

| Task | netstat | ss |
|------|---------|------|
| Listening TCP | `netstat -tlnp` | `ss -tlnp` |
| All connections | `netstat -an` | `ss -an` |
| Statistics | `netstat -s` | `ss -s` |
| By state | N/A | `ss state established` |
| Filter by port | `netstat -an \| grep :80` | `ss dport = :80` |

## Using ss with Other Tools

```bash
# Count connections per port
sudo ss -tlnp | awk '{print $4}' | rev | cut -d: -f1 | rev | sort | uniq -c | sort -rn

# Export to a file for analysis
ss -tnp > /tmp/connections_$(date +%Y%m%d_%H%M%S).txt

# Combine with watch for monitoring
watch -n 5 'ss -t state established | wc -l'
```

## Wrapping Up

The `ss` command is essential for any sysadmin working on RHEL. It's faster than `netstat`, has better filtering, and gives you more detail. The three combinations you'll use most are `ss -tlnp` (what's listening), `ss -tnp` (what's connected), and `ss -s` (overall statistics). Learn the state filters and address filters, and you'll be able to investigate any socket-related issue quickly.
