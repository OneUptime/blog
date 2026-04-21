# How to Use ss as a Replacement for netstat to View IPv4 Sockets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, ss, netstat, Socket, IPv4, Networking, Diagnostic

Description: Use the ss command as a modern, faster replacement for netstat to inspect IPv4 TCP and UDP sockets, listening ports, and connection states.

## Introduction

`ss` (socket statistics) is the modern replacement for the deprecated `netstat`. It queries the kernel's socket information directly and is significantly faster than `netstat` on systems with many connections. The `-4` flag limits output to IPv4 sockets.

## Show All IPv4 Sockets

```bash
# Show all IPv4 TCP, UDP, and raw sockets

ss -4tuwa

# More useful: show all IPv4 TCP, UDP, and raw sockets with numeric ports and addresses
ss -4tuwna
```

## Show IPv4 TCP Connections

```bash
# Show TCP connections
ss -4t

# Show TCP connections with numeric addresses and ports
ss -4tn

# Show all TCP sockets, including listening sockets, with numeric addresses and ports
ss -4tna
```

## Show IPv4 Listening Ports

```bash
# Show only listening TCP sockets on IPv4
ss -4tln

# Show listening UDP sockets
ss -4uln

# Show all listening TCP and UDP sockets
ss -4tuln
```

## Show Process Information

```bash
# Include process name and PID for listening TCP and UDP sockets where permitted
ss -4tulnp

# Example output:
# State   Recv-Q  Send-Q   Local Address:Port   Peer Address:Port   Process
# LISTEN  0       128      0.0.0.0:22           0.0.0.0:*           users:(("sshd",pid=1234,fd=3))
```

## Show Established Connections Only

```bash
# IPv4 TCP established connections
ss -4t state established

# Show numeric endpoints for all established TCP connections
ss -4tn state established
```

## Filter by Port

```bash
# Show connections to/from port 80
ss -4tn '( dport = :80 or sport = :80 )'

# Show connections to port 443
ss -4tn 'dport = :443'

# Show connections from a specific port
ss -4tn 'sport = :22'
```

## Filter by IP Address

```bash
# Show connections to a specific IP
ss -4tn dst 192.168.1.50

# Show connections from a specific IP
ss -4tn src 192.168.1.100
```

## Summary Statistics

```bash
# Show socket summary counts
ss -s

# Example output:
# Total: 150
# TCP:   45 (estab 20, closed 5, orphaned 0, timewait 0)
```

## ss vs netstat Equivalents

| netstat command | ss equivalent |
|---|---|
| `netstat -an` | `ss -an` |
| `netstat -tnp` | `ss -tnp` |
| `netstat -tlnp` | `ss -tlnp` |
| `netstat -4` | `ss -4` |

## Conclusion

`ss -4tulnp` shows IPv4 listening TCP and UDP sockets with process information where permitted - the most common diagnostic command. Use `ss -4tn state established` for active connections. `ss` is faster than `netstat` especially on busy systems with thousands of connections. The `-4` flag restricts output to IPv4 only.
