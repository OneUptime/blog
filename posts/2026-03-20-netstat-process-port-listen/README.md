# How to Find Which Process Is Listening on a Specific Port with Netstat

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: netstat, Linux, Process, Port, Diagnostic, TCP

Description: Use netstat with the -p flag to identify which process owns a listening port, combine with grep to quickly find specific services and PIDs.

When "port already in use" errors appear or you need to know what's running on a specific port, netstat with process information shows you the process name and PID immediately.

## Show All Listening Ports with Process Names

```bash
# List all listening ports with process info (requires root for all processes)

sudo netstat -tlnp

# Or include UDP as well
sudo netstat -tulnp

# Example output:
# Proto  Local Address    State   PID/Program name
# tcp    0.0.0.0:22       LISTEN  1234/sshd
# tcp    0.0.0.0:80       LISTEN  5678/nginx
# tcp    0.0.0.0:443      LISTEN  5678/nginx
# tcp    127.0.0.1:5432   LISTEN  9012/postgres
# udp    0.0.0.0:53       -       1100/systemd-resolved
```

## Find the Process on a Specific Port

```bash
# Find what's listening on port 80
sudo netstat -tlnp | grep ':80 '

# Find what's on port 443
sudo netstat -tlnp | grep ':443 '

# Find what's using a specific port (either side of connection)
sudo netstat -tnp | grep ':8080'
```

## Identify All Ports for a Specific Process

```bash
# Find all ports for nginx
sudo netstat -tlnp | grep nginx

# Find by PID number (if you know the PID)
sudo netstat -tlnp | grep "5678/"

# Get PID first, then list all its connections
PID=$(pgrep -n nginx)
sudo netstat -tnp | grep "$PID/"
```

## "Port Already in Use" Troubleshooting

```bash
# Error: "bind: address already in use" on port 8080
# Find the culprit:
sudo netstat -tlnp | grep ':8080 '

# Kill the process:
PID=$(sudo netstat -tlnp | grep ':8080 ' | awk '{print $7}' | cut -d/ -f1)
echo "Process $PID is using port 8080"
kill $PID

# Alternative: use fuser
sudo fuser 8080/tcp       # Show PID
sudo fuser -k 8080/tcp    # Kill the process
```

## Cross-Check with ss and lsof

When netstat doesn't show process info (non-root), use alternatives:

```bash
# ss with process info (modern alternative)
sudo ss -tlnp | grep ':80 '

# lsof for detailed file/port info
sudo lsof -i :80     # Show all processes using port 80
sudo lsof -i TCP:22  # Specific protocol and port

# Example lsof output:
# COMMAND   PID  USER  FD  TYPE  DEVICE  SIZE/OFF  NODE  NAME
# sshd     1234  root  3u  IPv4   12345       0t0   TCP  *:ssh (LISTEN)
```

## Check if a Port is Open Before Starting a Service

```bash
#!/bin/bash
# check-port.sh - Check if a port is available

PORT="$1"
if sudo netstat -tlnp | grep -q ":${PORT} "; then
    PROC=$(sudo netstat -tlnp | grep ":${PORT} " | awk '{print $7}')
    echo "Port $PORT is in use by: $PROC"
    exit 1
else
    echo "Port $PORT is free"
    exit 0
fi
```

## Persistent Service Identification

```bash
# Without root privileges, the PID/Program name column shows "-"
# for sockets you don't own (per the netstat man page).
# Always run with sudo for complete process information.

# If the PID/Program column shows "-":
# 1. You need root to see the owning process, or
# 2. The socket belongs to the kernel (e.g. a kernel service,
#    or the process has exited but the socket hasn't finished closing)
# 3. Use ss -tlnp with root for more reliable output
sudo ss -tlnp
```

Identifying process-to-port mappings is a fundamental operational skill - it's the fastest way to resolve port conflicts and understand what services are running on a system.
