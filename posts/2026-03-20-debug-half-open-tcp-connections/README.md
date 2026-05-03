# How to Debug Half-Open TCP Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Linux, Networking, Half-Open, Troubleshooting, Keepalive

Description: Identify and resolve half-open TCP connections where one side believes the connection is established while the other has no record of it.

## Introduction

A half-open TCP connection exists when one endpoint believes a connection is ESTABLISHED while the other does not. This happens when one side crashes or loses its connection state (e.g., after a reboot or NAT table flush) without sending a FIN or RST. The surviving side holds the connection open, consuming resources and potentially causing application hangs.

## How Half-Open Connections Occur

```yaml
Normal scenario:
Client --- ESTABLISHED --- Server

After server crash/reboot:
Client --- ESTABLISHED --- [Server rebooted, no record of connection]

When client sends data:
Client sends data → Server receives it, has no connection state
Server sends RST → Client connection is finally torn down

But if NO data is sent:
Client holds the connection forever (unless keepalives are enabled)
```

## Detecting Half-Open Connections

```bash
# Connections stuck in ESTABLISHED for very long time with no traffic

# may be half-open
ss -tn state established | awk '{print $4, $5}'

# Check if keepalive timers are running (output shows "timer:(keepalive,...)")
ss -tnop | grep "timer:(keepalive"

# Connections without keepalive timers are at risk of being half-open
ss -tnop | grep -v "timer:"

# Check how long connections have been established
ss -tn -o state established
# Look for "timer:(keepalive,...)" with long expire time on idle connections
```

## Testing for Half-Open Connections

```bash
# Simulate a half-open condition (for testing):
# 1. Establish a TCP connection
# 2. Hard-remove the firewall NAT state or crash one side
# 3. Try to send data through the surviving connection
# 4. If data gets a RST back: server side is dead (half-open confirmed)

# Force server to RST without killing it:
# On server: delete the connection from conntrack
conntrack -D conntrack --proto tcp --orig-dst <client-ip>
# Now the surviving client connection is half-open
```

## Preventing Half-Open Connections with Keepalives

```bash
# Enable TCP keepalives to detect dead connections
sysctl -w net.ipv4.tcp_keepalive_time=30     # Probe after 30s idle
sysctl -w net.ipv4.tcp_keepalive_intvl=10    # Probe every 10s
sysctl -w net.ipv4.tcp_keepalive_probes=5    # 5 probes before declaring dead
# Result: half-open detected within 30 + (5×10) = 80 seconds

# In applications, enable SO_KEEPALIVE on each socket
import socket
s = socket.socket()
s.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
```

## Cleaning Up Half-Open Connections

```bash
# Kill a specific connection with ss
ss -K dst 10.20.0.5 dport = :8080

# Kill all connections in ESTABLISHED state from a specific host
ss -K state established src 10.20.0.5

# Use conntrack to remove all state for a host (forces RST)
conntrack -D --orig-src 10.20.0.5
```

## Application-Level Detection

```python
import socket
import errno

def send_with_half_open_detection(sock, data):
    """Send data and detect half-open connections."""
    try:
        sock.send(data)
        return True
    except BrokenPipeError:
        print("Half-open detected: remote side is gone")
        sock.close()
        return False
    except ConnectionResetError:
        print("Remote side RST the connection (was half-open)")
        sock.close()
        return False
```

## Conclusion

Half-open connections consume resources silently and cause mysterious application hangs when code tries to reuse them. TCP keepalives are the primary defense - they actively probe idle connections and detect dead ones within minutes. In environments with NAT or stateful firewalls, tune keepalive intervals to be shorter than the firewall's connection tracking timeout to prevent NAT entries from expiring silently.
