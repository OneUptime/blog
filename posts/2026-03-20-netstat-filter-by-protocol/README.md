# How to Filter Netstat Output by Protocol (TCP, UDP)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: netstat, Linux, TCP, UDP, Networking, Diagnostic

Description: Filter netstat output to show only TCP or UDP connections, combine flags to create targeted views of network socket activity on Linux.

Netstat without filtering produces noisy output mixing TCP, UDP, and Unix sockets. Using protocol-specific flags creates focused views of exactly the connections you need.

## Filter by TCP

```bash
# Show only TCP connections

netstat -t

# TCP + numeric (no DNS lookups)
netstat -tn

# TCP + listening sockets
netstat -tl

# TCP + listening + numeric + process info
sudo netstat -tlnp

# TCP + all (established + listening)
netstat -ta
```

## Filter by UDP

```bash
# Show only UDP sockets
netstat -u

# UDP + numeric
netstat -un

# UDP listening sockets
netstat -ul

# UDP + listening + numeric + process info
sudo netstat -ulnp
```

## Filter by Both TCP and UDP

```bash
# Both TCP and UDP, listening only, numeric
sudo netstat -tulnp

# This is the most common command for "what's running on this machine":
# Proto  Recv-Q Send-Q Local Address    Foreign Address  State   PID/Program
# tcp         0      0 0.0.0.0:22       0.0.0.0:*        LISTEN  1234/sshd
# tcp         0      0 0.0.0.0:80       0.0.0.0:*        LISTEN  5678/nginx
# udp         0      0 0.0.0.0:53       0.0.0.0:*        -       1100/resolved
```

## Filter IPv4 vs IPv6

```bash
# IPv4 only
netstat -4

# IPv6 only
netstat -6

# IPv4 TCP only
netstat -4t

# IPv4 UDP only
netstat -4u

# IPv4 TCP listening with process info
sudo netstat -4tlnp
```

## Filter with grep for Specific Ports

```bash
# Find all connections to/from port 443
netstat -tn | grep ':443 '

# Find all connections in ESTABLISHED state
netstat -tn | grep ESTABLISHED

# Count TCP connections in each state
netstat -tn | awk 'NR>2 {print $6}' | sort | uniq -c

# Find connections to a specific remote IP
netstat -tn | grep '8.8.8.8'

# Find connections from a specific local port
netstat -tn | grep ':22 '
```

## Show All Connection States

```bash
# All TCP sockets in all states
netstat -tan

# States you'll see:
# LISTEN       - Waiting for incoming connections
# ESTABLISHED  - Active connection
# TIME_WAIT    - Connection closed, waiting for timeout
# CLOSE_WAIT   - Remote closed, waiting for local close
# SYN_SENT     - Sent SYN, waiting for SYN-ACK
# SYN_RECV     - Received SYN, sent SYN-ACK
# FIN_WAIT1    - Sent FIN, waiting for ACK
# FIN_WAIT2    - Received ACK of FIN
# CLOSING      - Both sides closing simultaneously
# CLOSED       - No connection
```

## Practical Monitoring Commands

```bash
# Monitor established connections in real time
watch -n 2 'netstat -tn | grep ESTABLISHED | wc -l'

# Show all connections to your web server port
watch -n 5 'netstat -tn | grep ":80 \|:443 " | head -20'

# Check for too many TIME_WAIT (possible connection exhaustion)
netstat -tn | grep TIME_WAIT | wc -l
# If > 5000: consider tcp_tw_reuse or increasing ephemeral port range
```

Filtering netstat by protocol focuses your attention on relevant connections - combine `-t` or `-u` with `-n`, `-l`, and `-p` for the most useful views.
