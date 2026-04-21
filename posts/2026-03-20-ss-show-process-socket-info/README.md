# How to Show Process Information for Sockets with ss -p

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ss, Linux, Process, Socket, Networking, Diagnostic

Description: Use ss -p to display the process name, PID, and file descriptor associated with each network socket for tracking connections to their owning applications.

Knowing which process owns which socket is essential for debugging, security audits, and resolving port conflicts. The `-p` flag in `ss` shows process names and PIDs alongside each socket.

## Display Process Information

```bash
# Show all sockets with process info

sudo ss -ap

# Established TCP sockets with process info
sudo ss -tp

# Listening ports with process info
sudo ss -tlp

# Full useful command: TCP/UDP listening, numeric, with process
sudo ss -tulnp
```

## Understanding the Process Column

```bash
sudo ss -tnlp

# State  Local Address:Port   Process
# LISTEN 0.0.0.0:22           users:(("sshd",pid=1234,fd=3))
#                                      ^^^^        ^^^     ^^
#                                    command     PID    file descriptor

# Multiple processes can listen on same port (SO_REUSEPORT):
# LISTEN 0.0.0.0:80  users:(("nginx",pid=5678,fd=6),("nginx",pid=5679,fd=6))
# Both nginx worker processes share port 80
```

## Find Process Owning a Specific Port

```bash
# Find what's using port 3000
sudo ss -tlnp | grep ':3000 '

# Find all ports for a named process
sudo ss -tlnp | grep nginx

# Find what process has connections to a remote IP
sudo ss -tnp dst 8.8.8.8

# Find process making outbound HTTPS connections
sudo ss -tnp dport = :443
```

## Identify Processes Making Outbound Connections

```bash
# Show all established connections with their processes
sudo ss -tnp state established

# Find which process is connecting to a suspicious IP
sudo ss -tnp | grep '1.2.3.4'

# List all distinct processes with network connections
sudo ss -tnp state established | grep -oP 'users:\(\("\K[^"]+' | sort -u
```

## Trace a Port Conflict

```bash
# "Address already in use" error - find the culprit
PORT="8080"
sudo ss -tlnp | grep ":${PORT} "

# Output shows the PID:
# LISTEN 0.0.0.0:8080  users:(("java",pid=12345,fd=25))
#
# View process details
ps aux | grep 12345

# Kill if needed
sudo kill 12345
```

## Compare Without Root (Limited Info)

```bash
# Without root, you can only see your own processes
ss -tnp state established

# Sockets owned by other users show:
# ESTAB  192.0.2.10:22  203.0.113.5:54321  (no process info shown)

# With root, all processes are visible:
sudo ss -tnp state established
```

## Build a Process-to-Port Map

```bash
#!/bin/bash
# port-map.sh - Build a map of all listening processes and their ports

echo "=== Listening Services ==="
printf "%-20s %-10s %-20s\n" "Process" "PID" "Address:Port"
echo "---"

sudo ss -H -tlnp | awk '
/users:\(\("/ {
    line = $0
    while (match(line, /"[^"]+",pid=[0-9]+/)) {
        entry = substr(line, RSTART, RLENGTH)
        process = entry
        sub(/^"/, "", process)
        sub(/",pid=.*/, "", process)

        pid = entry
        sub(/^.*pid=/, "", pid)

        printf "%-20s %-10s %-20s\n", process, pid, $4

        line = substr(line, RSTART + RLENGTH)
    }
}'
```

Using `ss -p` to correlate sockets with processes is the fastest way to answer "what is listening on this port?" and "which process is responsible for this connection?"
