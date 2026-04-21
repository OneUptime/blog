# How to Filter IPv4 Sockets with ss -4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ss, IPv4, Linux, Socket, Networking, Diagnostic

Description: Use ss -4 to filter socket output to IPv4 only, combined with other flags for targeted investigation of IPv4 connections and listening services.

On dual-stack systems, socket listings mix IPv4 and IPv6, making output harder to read. The `-4` flag restricts output to IPv4 sockets only, giving cleaner, more actionable views.

## Basic IPv4 Filtering

```bash
# All IPv4 sockets

ss -4a

# All IPv4 TCP sockets
ss -4ta

# All IPv4 UDP sockets
ss -4ua

# IPv4 listening TCP sockets
ss -4tl

# IPv4 listening TCP + UDP with process info
sudo ss -4tulnp
```

## Show All IPv4 TCP Connections

```bash
ss -4tn

# Output only shows IPv4:
# State  Recv-Q Send-Q Local Address:Port  Peer Address:Port
# ESTAB       0      0 192.168.1.100:22   203.0.113.5:54321
# ESTAB       0      0 192.168.1.100:443  10.0.0.5:32100

# No IPv6 ::1 or [::ffff:] addresses in output
```

## Find Listening IPv4 Services

```bash
# All IPv4 listening services with process info
sudo ss -4tlnp

# Output:
# State  Local Address:Port  Process
# LISTEN 0.0.0.0:22          users:(("sshd",pid=1234))
# LISTEN 0.0.0.0:80          users:(("nginx",pid=5678))
# LISTEN 0.0.0.0:443         users:(("nginx",pid=5678))

# Compare with IPv6 listening:
sudo ss -6tlnp
# LISTEN [::]:22              users:(("sshd",pid=1234))
```

## Filtering IPv4 by Address and Port

```bash
# All IPv4 connections to a specific destination IP
ss -4tn dst 8.8.8.8

# All IPv4 connections from a specific source port
ss -4tn sport = :443

# All IPv4 connections to port range 1024-65535
ss -4tn 'dport >= 1024'

# IPv4 connections from a subnet
ss -4tn src 192.168.1.0/24
```

## Count Active IPv4 Connections

```bash
# Count all active IPv4 TCP connections
ss -4Htn state established | wc -l

# Count IPv4 connections per remote IP
ss -4Htn state established | awk '{print $5}' \
  | cut -d: -f1 | sort | uniq -c | sort -rn | head -10

# Count IPv4 connections per destination port
ss -4Htn state established | awk '{print $5}' \
  | cut -d: -f2 | sort | uniq -c | sort -rn
```

## IPv4 vs IPv6 Socket Comparison

```bash
# Check if a service is listening on both IPv4 and IPv6
sudo ss -tlnp | grep nginx

# IPv4 only:
# LISTEN 0.0.0.0:80   0.0.0.0:*   users:(("nginx"))

# IPv6 (may also handle IPv4 on Linux when IPV6_V6ONLY is off):
# LISTEN [::]:80      [::]:*       users:(("nginx"))

# Both:
# LISTEN 0.0.0.0:80   -> explicit IPv4
# LISTEN [::]:80      -> IPv6 listener; IPv4 handling depends on IPV6_V6ONLY
```

## Monitor IPv4 Connection Counts Over Time

```bash
#!/bin/bash
# watch IPv4 connection count and distribution

while true; do
    echo "=== $(date '+%H:%M:%S') IPv4 TCP Connections ==="
    ss -4tn state established \
      | awk 'NR>1 {split($4,a,":"); split($5,b,":"); print b[1]}' \
      | sort | uniq -c | sort -rn | head -5
    echo "Total: $(ss -4tn state established | tail -n+2 | wc -l)"
    sleep 5
done
```

Using `-4` consistently in ss commands prevents confusion from IPv6 sockets appearing in IPv4 troubleshooting workflows, especially on systems that support both protocols.
