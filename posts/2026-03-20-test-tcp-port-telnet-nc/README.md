# How to Test TCP Port Connectivity with telnet and nc

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Telnet, netcat, TCP, Linux, Networking, Connectivity Testing

Description: Use telnet and netcat (nc) to test TCP port connectivity without a full application client, verifying that a specific port is open and reachable from your host.

When you need to verify that port 3306 is reachable from your app server before setting up MySQL, or confirm that port 443 is open on a new server, telnet and nc are the fastest tools available.

## Testing with telnet

```bash
# Basic TCP connectivity test: telnet <host> <port>

telnet 192.168.1.100 22

# Success output:
# Trying 192.168.1.100...
# Connected to 192.168.1.100.
# Escape character is '^]'.
# SSH-2.0-OpenSSH_8.2p1 Ubuntu   ← banner from SSH server
# (Press Ctrl+] then quit to exit)

# Failure outputs:
# "Connection refused" → host responded, but port is closed/service not running
# "No route to host"   → routing problem
# (hangs)              → firewall, host, or network silently dropping packets (timeout)
```

## Testing with nc (netcat)

nc is more scriptable than telnet and available when telnet isn't:

```bash
# Basic TCP test: nc -zv <host> <port>
# -z = don't send data, just check if port is open
# -v = verbose output
nc -zv 192.168.1.100 22

# Success:
# Connection to 192.168.1.100 22 port [tcp/ssh] succeeded!

# Failure:
# nc: connect to 192.168.1.100 port 22 (tcp) failed: Connection refused

# Test multiple ports
nc -zv 192.168.1.100 22 80 443

# Set timeout (default is no nc timeout)
nc -zv -w 5 192.168.1.100 3306
# -w 5: timeout after 5 seconds
```

## Test in a Script

```bash
#!/bin/bash
# check-connectivity.sh - Test connectivity to required services

check_port() {
    HOST="$1"
    PORT="$2"
    NAME="${3:-$HOST:$PORT}"

    if nc -zv -w 3 "$HOST" "$PORT" > /dev/null 2>&1; then
        echo "OK: $NAME ($HOST:$PORT) is reachable"
    else
        echo "FAIL: $NAME ($HOST:$PORT) is NOT reachable"
    fi
}

check_port "db.example.com" 5432 "PostgreSQL"
check_port "cache.example.com" 6379 "Redis"
check_port "api.example.com" 443 "API HTTPS"
check_port "10.0.0.50" 22 "SSH server"
```

## Send Data with nc

nc can also send test data to verify application protocols:

```bash
# Send an HTTP request manually
printf "GET / HTTP/1.0\r\nHost: example.com\r\n\r\n" | nc example.com 80
# Returns HTTP response headers and body

# Test SMTP greeting
nc -v smtp.example.com 25
# Should see: 220 smtp.example.com ESMTP Postfix

# Test Redis
printf "PING\r\n" | nc -v 127.0.0.1 6379
# Should see: +PONG
```

## Testing UDP Ports

```bash
# UDP connectivity test
nc -uzv 192.168.1.100 53    # Test DNS UDP port

# Note: UDP testing is unreliable (no connection concept)
# Some nc versions report success for -uz regardless of target state
# Success does not confirm receipt unless you also observe a response or packet capture
```

## Diagnose Firewall vs Service Down

```bash
# Port closed (service not running):
nc -zv 192.168.1.100 3306
# nc: connect to ... port 3306 (tcp) failed: Connection refused
# → TCP RST received = host responded, but nothing accepted the connection

# Port firewalled:
nc -zv -w 5 192.168.1.100 3306
# (no output for 5 seconds, then timeout)
# → No response before timeout = packets may be dropped by a firewall,
#   the host may be down, or routing may be broken

# Difference:
# "Connection refused" = fast response → usually service/port issue or active reject
# Timeout            = slow response  → often firewall drop, host down, or routing issue
```

telnet and nc are the "is the door open?" tools of networking - before spending time debugging application configuration, always confirm the basic TCP connection works.
