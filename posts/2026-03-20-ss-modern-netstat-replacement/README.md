# How to Use the ss Command as a Modern Netstat Replacement

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ss, netstat, Linux, Networking, Socket, Diagnostic

Description: Use the ss command as a faster, more powerful replacement for netstat to investigate socket connections, listening ports, and TCP internals on modern Linux systems.

`ss` (socket statistics) queries the kernel directly via netlink, making it significantly faster than netstat (which reads /proc). It covers the common socket-inspection parts of netstat plus deeper inspection of TCP internals like congestion window and RTT.

## Why ss Over netstat?

```text
Feature            netstat                 ss
-----------------  ----------------------  ---------------------
Speed              Slow (/proc)            Fast (netlink)
TCP internals      No                      Yes (-i flag)
Still maintained?  Mostly obsolete         Yes
Memory efficient?  No                      Yes (for huge tables)
Available?         net-tools package       iproute2 package
```

## Basic Equivalents to netstat

```bash
# Show all sockets (netstat equivalent)

ss -a

# Show TCP sockets (netstat -t)
ss -t

# Show UDP sockets (netstat -u)
ss -u

# Show listening only (netstat -l)
ss -l

# Show with process info (netstat -p)
sudo ss -p

# Show numeric (netstat -n)
ss -n

# The classic combo: all listening TCP/UDP with PID
sudo ss -tulnp
```

## Show All Active TCP Connections

```bash
# All established TCP connections
ss -tn state established

# All TCP in any state
ss -ta

# With source/destination info, numeric
ss -tn
# Output:
# State  Recv-Q Send-Q Local Address:Port  Peer Address:Port
# ESTAB       0      0 192.168.1.100:22   203.0.113.5:54321
# ESTAB       0      0 192.168.1.100:443  10.0.0.5:32100
```

## Filtering by State

```bash
# Show only established connections
ss -t state established

# Show only listening sockets
ss -t state listening

# Show TIME_WAIT sockets (may indicate high traffic or connection churn)
ss -t state time-wait

# Count connections in each state
ss -ta | awk 'NR>1 {print $1}' | sort | uniq -c | sort -rn
```

## Filter by Port

```bash
# All TCP/UDP sockets on port 80
ss -tuna '( dport = :80 or sport = :80 )'

# TCP/UDP sockets TO port 443
ss -tun dport = :443

# TCP/UDP sockets with source port 22
ss -tun sport = :22

# TCP/UDP sockets to a specific IP
ss -tun dst 8.8.8.8
```

## Show with Process Information

```bash
# Show which process owns each socket (requires root for others' sockets)
sudo ss -tlnp

# Example output:
# State  Local Address:Port   Process
# LISTEN 0.0.0.0:22           users:(("sshd",pid=1234,fd=3))
# LISTEN 0.0.0.0:80           users:(("nginx",pid=5678,fd=6))
# LISTEN 127.0.0.1:5432       users:(("postgres",pid=9012,fd=5))

# Find process by port
sudo ss -tlnp | grep ':80 '
```

## Viewing TCP Internal Statistics

One of ss's key advantages over netstat:

```bash
# Show TCP internal info (congestion window, RTT, etc.)
ss -ti

# Per-connection:
sudo ss -tin dst 8.8.8.8

# Output includes:
# cubic wscale:7,7 rto:220 rtt:12.4/3.1 ato:40 mss:1460
# rcvmss:1460 advmss:1460 cwnd:10 bytes_sent:1234 bytes_retrans:0
# segs_out:10 segs_in:8 send 11.8Mbps lastsnd:100 lastrcv:100

# Key fields:
# rtt:     Round-trip time / variance
# cwnd:    Congestion window (higher = more throughput potential)
# bytes_retrans: Retransmissions (may indicate packet loss or reordering)
```

`ss` is the preferred tool on all modern Linux systems - use it instead of netstat for faster results, richer TCP debugging, and future compatibility as netstat continues to age out.
