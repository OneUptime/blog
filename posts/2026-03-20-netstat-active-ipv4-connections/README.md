# How to Use Netstat to List All Active IPv4 Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: netstat, Linux, Networking, TCP, UDP, Diagnostic

Description: Use the netstat command to list all active IPv4 TCP and UDP connections, view listening ports, and understand socket states on Linux.

Netstat displays current network connections, routing tables, and interface statistics. While `ss` is the modern replacement, netstat remains widely available and familiar to most administrators.

## Basic Connection Listing

```bash
# Show all active connections (TCP + UDP)

netstat -a

# Show only IPv4 connections
netstat -4

# Show TCP connections
netstat -t

# Show UDP connections
netstat -u

# Show listening sockets only
netstat -l

# Combine: all IPv4 TCP connections (active + listening)
netstat -4ta
```

## Show Connections Without DNS Resolution

DNS lookups slow output considerably. Disable them with `-n`:

```bash
# Numeric output (IP addresses and port numbers, no DNS/service names)
netstat -n

# All IPv4 TCP connections, numeric
netstat -4tn

# All listening TCP sockets, numeric
netstat -4tnl
```

## Reading Netstat Output

```bash
netstat -4tn

# Active Internet connections (w/o servers)
# Proto Recv-Q Send-Q Local Address      Foreign Address   State
# tcp        0      0 192.168.1.100:22   203.0.113.5:54321 ESTABLISHED
# tcp        0      0 192.168.1.100:443  10.0.0.5:32100    ESTABLISHED
# tcp        0      0 127.0.0.1:5432     127.0.0.1:54322   ESTABLISHED

# Proto:           Protocol (tcp, tcp6, udp, udp6)
# Recv-Q:          Bytes in receive buffer (should be 0)
# Send-Q:          Bytes in send buffer (should be 0)
# Local Address:   Local IP:port
# Foreign Address: Remote IP:port
# State:           TCP state (ESTABLISHED, LISTEN, TIME_WAIT, etc.)
```

## Show All Listening Ports

```bash
# All listening services with numeric output
netstat -4tnl

# With process information (requires root)
sudo netstat -4tnlp

# Example output:
# Proto Recv-Q Send-Q Local Address  Foreign Address  State   PID/Program
# tcp        0      0 0.0.0.0:22     0.0.0.0:*        LISTEN  1234/sshd
# tcp        0      0 0.0.0.0:80     0.0.0.0:*        LISTEN  5678/nginx
# tcp        0      0 127.0.0.1:5432 0.0.0.0:*        LISTEN  9012/postgres
```

## Show Connection Counts by State

```bash
# Count TCP connections by state
netstat -4tna | awk 'NR>2 {print $6}' | sort | uniq -c | sort -rn

# Expected output:
#  45 ESTABLISHED
#  12 TIME_WAIT
#   3 CLOSE_WAIT
#   1 LISTEN

# High TIME_WAIT: normal during high web traffic
# High CLOSE_WAIT: application not closing connections (potential leak)
# High ESTABLISHED: many active connections
```

## Show Per-Interface Statistics

```bash
# Interface statistics (packets, errors, drops)
netstat -i

# Verbose interface stats
netstat -ie

# Example output:
# Iface    MTU Met  RX-OK  RX-ERR RX-DRP RX-OVR TX-OK  TX-ERR TX-DRP
# eth0    1500   0  12345      0      0      0   8765      0      0

# RX-ERR/TX-ERR > 0 = physical layer problem
# RX-DRP/TX-DRP > 0 = buffer overflow (overloaded interface)
```

## Show Statistics by Protocol

```bash
# IP/TCP/UDP/ICMP statistics
netstat -s

# Filter for specific protocol
netstat -s | grep -A 10 "Tcp:"

# Useful counters:
# "segments retransmitted" - high value = packet loss/congestion
# "connection resets" - unexpected RSTs (application or network issues)
# "failed connection attempts" - firewall blocks or refused connections
```

Note: On modern systems, `ss` is preferred over `netstat` for performance and richer output, but netstat remains useful for its familiar output format and broad availability.
