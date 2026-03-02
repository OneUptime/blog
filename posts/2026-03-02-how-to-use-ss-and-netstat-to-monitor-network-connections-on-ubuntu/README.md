# How to Use ss and netstat to Monitor Network Connections on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, ss, netstat, Monitoring

Description: Monitor and inspect network connections on Ubuntu using ss and netstat, with practical examples for finding listening ports, established connections, and connection statistics.

---

Monitoring network connections is a routine task for system administrators. Whether you are checking what ports are open, which processes are listening, or diagnosing a connection problem, `ss` and `netstat` are the primary tools for the job. On modern Ubuntu, `ss` is the preferred tool - it is faster and more feature-rich. `netstat` still works but comes from the deprecated `net-tools` package.

## Installing the Tools

`ss` is part of `iproute2` and is installed by default on Ubuntu:

```bash
ss --version
```

`netstat` requires installing `net-tools`:

```bash
sudo apt install net-tools
```

## The ss Command

`ss` (socket statistics) reads directly from the kernel's socket structures, making it faster and more accurate than `netstat`, which parsed `/proc/net/tcp` files.

### Basic Usage

```bash
# Show all connections
ss

# Show all listening and established connections
ss -a

# Show only listening sockets
ss -l

# Show all TCP connections
ss -t

# Show all UDP sockets
ss -u

# Show UNIX domain sockets
ss -x
```

### Show Listening Ports with Process Names

The most common use case - find what is listening on which ports:

```bash
# Show listening TCP ports with process information
# -t = TCP, -l = listening, -n = numeric (no DNS resolution), -p = process
sudo ss -tlnp
```

Output:

```
State   Recv-Q Send-Q Local Address:Port  Peer Address:Port  Process
LISTEN  0      128    0.0.0.0:22         0.0.0.0:*          users:(("sshd",pid=1234,fd=4))
LISTEN  0      511    0.0.0.0:80         0.0.0.0:*          users:(("nginx",pid=5678,fd=8))
LISTEN  0      511    0.0.0.0:443        0.0.0.0:*          users:(("nginx",pid=5678,fd=9))
LISTEN  0      128    127.0.0.1:5432     0.0.0.0:*          users:(("postgres",pid=9012,fd=7))
```

For UDP listening ports:

```bash
sudo ss -ulnp
```

For all listening ports (TCP + UDP):

```bash
sudo ss -tlnp; sudo ss -ulnp
# or combine with
sudo ss -lnp
```

### Show All Established Connections

```bash
# All established TCP connections with process info
sudo ss -tnp state established
```

Output shows the local and remote address:port for each connection, along with the process owning it.

### Filter by Port

```bash
# Show connections on port 80
ss -tnp '( dport = :80 or sport = :80 )'

# Show connections on port 443
ss -tnp 'dport = :443'

# Show connections to a specific remote port
ss -tnp 'dst :22'

# Connections from a specific source
ss -tnp 'src 192.168.1.100'
```

### Filter by State

```bash
# Only established connections
ss -tn state established

# Only connections in TIME-WAIT state (normal after connection close)
ss -tn state time-wait

# Count connections by state
ss -tan | awk 'NR>1 {print $1}' | sort | uniq -c | sort -rn
```

TCP states you will commonly see:
- `ESTABLISHED` - active connection
- `TIME-WAIT` - connection is closed, waiting for delayed packets
- `LISTEN` - waiting for incoming connections
- `CLOSE-WAIT` - remote end closed, local end waiting
- `FIN-WAIT-2` - local end sent FIN, waiting for remote
- `SYN-SENT` - client sent SYN, waiting for server response

### Connection Statistics

```bash
# Show summary statistics
ss -s
```

Output:

```
Total: 1234
TCP:   892 (estab 145, closed 723, orphaned 0, timewait 714)

Transport Total     IP        IPv6
RAW       2         1         1
UDP       8         4         4
TCP       169       128       41
INET      179       133       46
FRAG      0         0         0
```

### Socket Memory Usage

```bash
# Show memory usage per socket
ss -tm

# Show extended socket information
ss -te
```

### Watching Connections in Real Time

```bash
# Watch new connections appear (run ss every second)
watch -n 1 'ss -tnp state established'

# Monitor connection count to a specific port
watch -n 1 'ss -tn state established | grep ":443" | wc -l'
```

## The netstat Command

`netstat` works similarly to `ss` but is older and slower. Its main advantage is familiarity - many administrators have used it for decades.

### Common netstat Commands

```bash
# Show all connections with numeric output and process info
sudo netstat -tunap

# Show only listening ports
sudo netstat -tlnp    # TCP
sudo netstat -ulnp    # UDP

# Show all active connections
sudo netstat -tan

# Show route table (like ip route show)
netstat -rn

# Show interface statistics
netstat -i

# Show per-protocol statistics
netstat -s
```

### netstat Output Format

```
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      1234/sshd: /usr/sbi
tcp        0      0 192.168.1.100:22        192.168.1.50:54321      ESTABLISHED 5678/sshd: user@pts
tcp6       0      0 :::80                   :::*                    LISTEN      9012/nginx: master
```

## Practical Use Cases

### Find What Process is Using a Port

```bash
# Using ss
sudo ss -tlnp | grep ':8080'

# Using netstat
sudo netstat -tlnp | grep ':8080'

# If you only have the port number and want the process
sudo fuser 8080/tcp
```

### Count Active Connections to a Service

```bash
# Count connections to port 443 (HTTPS)
ss -tn state established '( dport = :443 or sport = :443 )' | wc -l

# Count by remote IP (useful for detecting DoS)
ss -tn state established '( sport = :80 )' | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -rn | head -20
```

### Check for Connections to a Specific Host

```bash
# Connections to or from a specific IP
ss -tn 'dst 203.0.113.1 or src 203.0.113.1'

# All connections from the local machine to external hosts on port 443
ss -tn state established 'dport = :443'
```

### Monitor SYN Flood Attempts

```bash
# Count SYN connections (connection attempts without completing handshake)
ss -tn state syn-recv | wc -l

# Show all half-open connections
ss -tn state syn-recv
```

A large number of SYN-RECV connections may indicate a SYN flood attack.

### Check for TIME-WAIT Accumulation

```bash
# Count TIME-WAIT connections (normal to have some, but too many can cause issues)
ss -tn state time-wait | wc -l

# If too many TIME-WAIT, show which ports they are on
ss -tn state time-wait | awk '{print $4}' | rev | cut -d: -f1 | rev | sort | uniq -c | sort -rn
```

### Investigating Connection Problems

```bash
# Check if a specific service is actually listening
sudo ss -tlnp | grep ':5432'    # Check if PostgreSQL is listening

# Check if a connection is being established at all
# On server: watch for new connections
watch -n 1 'ss -tn state established | grep ":5432"'

# On client: check the connection state
ss -tnp 'dst 192.168.1.100:5432'
```

## Quick Reference Cheat Sheet

| Task | ss Command | netstat Command |
|------|------------|-----------------|
| Listening TCP ports | `ss -tlnp` | `netstat -tlnp` |
| Listening UDP ports | `ss -ulnp` | `netstat -ulnp` |
| All connections | `ss -tan` | `netstat -tan` |
| With process info | `ss -tnp` | `netstat -tnp` |
| Connection summary | `ss -s` | `netstat -s` |
| Routing table | `ip route` | `netstat -rn` |
| Interface stats | `ip -s link` | `netstat -i` |

## Scripting Network Monitoring

```bash
#!/bin/bash
# Simple connection monitoring script

echo "=== Connection Summary ==="
ss -s | head -6

echo ""
echo "=== Listening Services ==="
sudo ss -tlnp | grep LISTEN

echo ""
echo "=== Top Connection Sources (port 80) ==="
ss -tn state established 'sport = :80' \
  | awk 'NR>1 {print $5}' \
  | cut -d: -f1 \
  | sort | uniq -c | sort -rn \
  | head -10
```

`ss` is the right tool for modern Ubuntu systems. It provides the same information as `netstat` but queries the kernel more efficiently and handles IPv6 better. For any new scripts or automation, `ss` is the tool to use.
