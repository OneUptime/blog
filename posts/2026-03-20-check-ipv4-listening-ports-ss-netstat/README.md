# How to Use ss and netstat to Check IPv4 Listening Ports on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, ss, netstat, IPv4, Port, Network Diagnostics

Description: List IPv4 listening ports and established connections on Linux using ss and netstat, filter by protocol and port, and identify which process owns each socket.

## Introduction

Knowing which services are listening on which ports is essential for security audits, troubleshooting connection failures, and service deployment. `ss` (socket statistics) is the modern replacement for `netstat`, while `netstat` is still widely available.

## List All IPv4 Listening Ports with ss

```bash
# Show all IPv4 TCP listening ports

ss -4 -t -l -n

# Show all IPv4 UDP listening ports
ss -4 -u -l -n

# Show both TCP and UDP listening ports
ss -4 -t -u -l -n
```

Flag reference:
- `-4`: IPv4 only
- `-t`: TCP
- `-u`: UDP
- `-l`: listening sockets only
- `-n`: numeric (no DNS/service name lookup)
- `-p`: show the process name and PID

## Show Port and Process Together

```bash
# Show listening ports with process names (requires root for full info)
sudo ss -4 -t -l -n -p

# Example output:
# State  Recv-Q Send-Q  Local Address:Port   Peer Address:Port  Process
# LISTEN 0      128     0.0.0.0:22           0.0.0.0:*          users:(("sshd",pid=1234,fd=3))
# LISTEN 0      5       127.0.0.1:5432       0.0.0.0:*          users:(("postgres",pid=5678,fd=5))
```

## Filter by Port Number

```bash
# Check if something is listening on port 80
ss -4 -H -t -l -n sport = :80

# Or show the matching socket with process info
sudo ss -4 -t -l -n -p sport = :80
```

## Show All Established Connections

```bash
# Show all active IPv4 TCP connections
ss -4 -t -n state established

# With process info
sudo ss -4 -t -n -p state established
```

## Check a Specific Destination Port

```bash
# Show connections to a specific destination port (e.g., database)
ss -4 -t -n dport = :5432
```

## Using netstat (Legacy)

```bash
# List all IPv4 listening ports
netstat -4 -t -l -n
netstat -4 -u -l -n

# With process IDs (requires root)
sudo netstat -4 -t -l -n -p

# Show all TCP sockets, including listening and non-listening
sudo netstat -4 -t -n -p -a
```

## Checking if a Specific Port Is Open

```bash
# Quick one-liner to check if port 443 is listening
ss -4 -H -t -l -n sport = :443 | grep -q . && echo "Port 443 is OPEN" || echo "Port 443 is CLOSED"
```

## Summary of Common ss Flags

| Command | Shows |
|---|---|
| `ss -4tlnp` | IPv4 TCP listening with process |
| `ss -4ulnp` | IPv4 UDP listening with process |
| `ss -4tn state established` | Active TCP connections |
| `ss -s` | Socket statistics summary |

## Conclusion

`ss -4tlnp` is the single most useful command for auditing listening ports - it shows protocol, address, port, and the owning process in one view. Use `sport = :port` filters to narrow the output, and run with `sudo` to see process names for all services.
