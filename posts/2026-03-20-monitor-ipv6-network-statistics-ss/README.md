# How to Monitor IPv6 Network Statistics on Linux with ss

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Linux, Ss command, Network Statistics, Monitoring

Description: A guide to using the `ss` command to monitor IPv6 network connections, sockets, and statistics on Linux, replacing the deprecated `netstat` tool.

## Basic IPv6 Socket Listing

```bash
# Show all IPv6 TCP connections

ss -6 -t

# Show all IPv6 UDP sockets
ss -6 -u

# Show all IPv6 listening sockets
ss -6 -l

# Show all IPv6 connections (TCP + UDP + listening)
ss -6 -a

# Show with numeric addresses and ports (no DNS resolution)
ss -6 -tn
ss -6 -un
```

## Understanding ss Output

```bash
$ ss -6 -tn

State   Recv-Q  Send-Q  Local Address:Port   Peer Address:Port  Process
ESTAB   0       0       [2001:db8::10]:443   [2001:db8::20]:51234
ESTAB   0       0       [2001:db8::10]:22    [2001:db8::30]:44512
LISTEN  0       128     [::]:80              [::]:*
LISTEN  0       128     [::]:443             [::]:*
```

Fields:
- `Local Address:Port` - IPv6 address in brackets with port
- `[::]:*` - Listening on all IPv6 addresses
- `ESTAB` - Established connection
- `LISTEN` - Waiting for connections

## Filtering IPv6 Connections

```bash
# Show only established IPv6 TCP connections
ss -6 -t state established

# Show only listening IPv6 TCP sockets
ss -6 -t state listening

# Show connections to a specific remote address
ss -6 dst '[2001:4860:4860::8888]'

# Show connections from a specific local address
ss -6 src '[2001:db8::10]'

# Show connections on a specific port
ss -6 -t sport = :443
ss -6 -t dport = :80

# Combine filters
ss -6 -t state established '( dport = :443 or dport = :80 )'
```

## Show Process Information

```bash
# Show which process owns each socket
ss -6 -tlnp

# Example output:
# LISTEN  0  128  [::]:22   [::]:*  users:(("sshd",pid=1234,fd=4))
# LISTEN  0  128  [::]:80   [::]:*  users:(("nginx",pid=5678,fd=6))

# Show extended process info
ss -6 -tlnpe
```

## IPv6 Statistics Summary

```bash
# Show IPv6 socket statistics
ss -6 -s

# Output includes:
# Total: 42
# TCP:   15 (estab 8, closed 2, orphaned 0, timewait 2)
# Transport  Total  IP  IPv6
# RAW        1      0   1
# UDP        5      2   3
# TCP        13     5   8

# Detailed TCP state breakdown
ss -6 -t | awk 'NR>1 {counts[$1]++} END {for(s in counts) print s, counts[s]}'
```

## Monitoring Active Connections

```bash
# Watch IPv6 connections in real time
watch -n 1 'ss -6 -tn'

# Count current IPv6 connections
ss -6 -t state established | wc -l

# Show connections per remote address
ss -6 -tn state established | awk 'NR>1 {print $5}' | sed 's/]:[0-9]*$/]/' | sort | uniq -c | sort -rn | head -20

# Monitor for new IPv6 connections (using watch with diff-like approach)
watch -n 2 'ss -6 -tn state established | wc -l'
```

## IPv6 UDP Statistics

```bash
# Show IPv6 UDP sockets
ss -6 -uln

# Show UDP with extended info (uid, inode, socket cookie)
ss -6 -une

# Show mDNS/multicast UDP sockets
ss -6 -un | grep '%'   # Link-local with zone ID
```

## Comparing with netstat

```bash
# Legacy netstat (deprecated) → ss equivalent
netstat -6 -tn        →  ss -6 -tn
netstat -6 -ln        →  ss -6 -ln
netstat -6 -tlnp      →  ss -6 -tlnp
netstat -6 -s         →  ss -6 -s   (partial)
```

## Summary

Use `ss -6` to monitor IPv6 network connections on Linux. Key flags: `-t` (TCP), `-u` (UDP), `-l` (listening), `-n` (numeric), `-p` (process). Filter with `state established`, `dst <addr>`, `sport = :443`. Use `ss -6 -s` for a statistics summary. `ss` is the modern replacement for `netstat` and is faster on systems with many connections.
