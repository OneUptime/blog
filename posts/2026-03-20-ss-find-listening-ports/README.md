# How to Find All Listening Ports with ss -l

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ss, Linux, Port, Listening, Security, Diagnostic

Description: Use ss -l to enumerate all listening TCP and UDP ports on a Linux system, with filtering by protocol, process name, and address family for security audits.

Listing all listening ports reveals what services are exposed on your server. This is critical for security audits (are unexpected services running?), firewall rule verification, and service discovery.

## Basic Listening Port Discovery

```bash
# All listening TCP sockets

ss -tl

# All listening UDP sockets
ss -ul

# Both TCP and UDP listening
ss -tul

# With port numbers (no service name resolution)
ss -tln

# The complete useful command: all listening TCP/UDP, numeric, with processes
sudo ss -tulnp
```

## Reading ss -tulnp Output

```bash
sudo ss -tulnp

# Output:
# Netid State  Recv-Q Send-Q  Local Address:Port  Peer Address:Port  Process
# tcp   LISTEN     0    128   0.0.0.0:22          0.0.0.0:*          users:(("sshd",pid=1234))
# tcp   LISTEN     0    511   0.0.0.0:80          0.0.0.0:*          users:(("nginx",pid=5678))
# tcp   LISTEN     0    511   0.0.0.0:443         0.0.0.0:*          users:(("nginx",pid=5678))
# tcp   LISTEN     0    100   127.0.0.1:5432      0.0.0.0:*          users:(("postgres",pid=9012))
# udp   UNCONN     0      0   0.0.0.0:53          0.0.0.0:*          users:(("named",pid=1100))

# Local Address:
#   0.0.0.0:port  = listening on all IPv4 addresses (potentially reachable externally if firewall/routing allows)
#   127.0.0.1:port = listening on loopback only (not externally accessible)
#   10.0.0.1:port  = listening on that specific local IPv4 address
```

## Security Audit: Find Unexpected Open Ports

```bash
# List TCP/UDP sockets bound to the IPv4 wildcard address (0.0.0.0)
sudo ss -tulnp | awk '$5 ~ /^0\.0\.0\.0:/'

# Should only see ports you intentionally opened
# Unexpected entries could be:
# - Misconfigured services
# - Malware
# - Development servers left running

# Compare current ports to known-good baseline
sudo ss -H -tulnp | awk '{print $5}' | sort > /tmp/current-ports.txt
diff /tmp/baseline-ports.txt /tmp/current-ports.txt
```

## Filter by Port Range

```bash
# Find services on ports < 1024 (privileged ports)
sudo ss -tulnp 'sport < :1024'

# Find services on non-standard ports
sudo ss -H -tulnp | grep -v -E ':(22|80|443|25|53|3306|5432)\b'
```

## Verify Service Is Listening Before Connecting

```bash
#!/bin/bash
# wait-for-port.sh - Wait until a service starts listening

HOST="localhost"
PORT="8080"
TIMEOUT=30

echo "Waiting for $HOST:$PORT..."

for i in $(seq 1 $TIMEOUT); do
    if ss -H -tnl "( src ${HOST}:${PORT} or src 0.0.0.0:${PORT} or src [::]:${PORT} )" | grep -q .; then
        echo "Service is listening on port $PORT"
        exit 0
    fi
    sleep 1
done

echo "Timeout: $HOST:$PORT not listening after ${TIMEOUT}s"
exit 1
```

## Check if IPv4 and IPv6 Are Both Listening

```bash
# Check if a service listens on both IPv4 and IPv6
sudo ss -tlnp 'sport = :80'

# IPv4 only: 0.0.0.0:80
# IPv6 wildcard: [::]:80 (may also accept IPv4-mapped connections if IPV6_V6ONLY is off)
# Both: two lines

# For nginx: to listen on both, use two listen directives:
# listen 80;          → IPv4
# listen [::]:80;     → IPv6
```

Regularly auditing listening ports with `ss -tulnp` is a fundamental security practice - every unexpected open port is a potential attack vector that should be investigated and closed.
