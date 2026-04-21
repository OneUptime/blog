# How to Use TCP Fast Open for Faster Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Linux, Performance, TCP Fast Open, Networking, Latency

Description: Enable TCP Fast Open to reduce connection establishment latency by sending application data in the SYN packet, eliminating one round-trip for repeat connections.

## Introduction

TCP Fast Open (TFO) allows application data to be sent in the initial SYN packet, eliminating the extra round-trip that normally occurs before data can flow. For short-lived connections (like HTTP requests), this can reduce latency by an entire RTT - significant for global services where round-trip times are 50-200ms.

## How TCP Fast Open Works

```text
Normal TCP:
Client → SYN                    (RTT 1: handshake)
Server → SYN-ACK
Client → ACK + Request data     (RTT 2: data)
Server → Response

TCP Fast Open (repeat connection):
Client → SYN + TFO Cookie + Request data   (RTT 1: handshake + data together)
Server → SYN-ACK (+ Response if ready)
Client → ACK
```

The TFO cookie is issued by the server on the first connection and cached by the client. Subsequent connections can include data immediately.

## Enabling TCP Fast Open on Linux

```bash
# Check current TFO bitmap (default: 1 = client support)

sysctl net.ipv4.tcp_fastopen

# Common values:
# 0 = disabled
# 1 = client support (outbound TFO)
# 2 = server support (inbound TFO)
# 3 = client + server support
# 0x400 = with server support, enable TFO on all listeners without TCP_FASTOPEN setsockopt()

# Enable basic TFO support for both client and server
sysctl -w net.ipv4.tcp_fastopen=3

# Persist
echo "net.ipv4.tcp_fastopen=3" >> /etc/sysctl.conf
sysctl -p
```

## Server-Side TFO Configuration

```python
# Python server: enable TFO by setting TCP_FASTOPEN socket option
import socket

TCP_FASTOPEN = 23  # Linux socket option for TFO

server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

# Enable TFO with queue depth of 10 (pending TFO connections)
server.setsockopt(socket.IPPROTO_TCP, TCP_FASTOPEN, 10)

server.bind(('0.0.0.0', 8080))
server.listen(100)
print("TFO-enabled server listening on port 8080")
```

## Client-Side TFO Usage

```python
# Python client: use MSG_FASTOPEN flag on sendto()
import socket

TCP_FASTOPEN = 23
MSG_FASTOPEN = 0x20000000

client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

# Send data with the SYN packet using MSG_FASTOPEN
# On first connection: kernel sends regular SYN and obtains TFO cookie
# On subsequent connections: data is sent in the SYN packet
try:
    client.sendto(
        b'GET / HTTP/1.0\r\nHost: server\r\n\r\n',
        MSG_FASTOPEN,
        ('10.20.0.5', 80)
    )
    response = client.recv(4096)
    print("Response:", response[:200])
finally:
    client.close()
```

## nginx TFO Configuration

```nginx
# /etc/nginx/nginx.conf
http {
    # Enable TFO on all listening sockets
    server {
        listen 80 fastopen=256;   # Queue 256 TFO connections
        listen 443 ssl fastopen=256;
    }
}
```

## Verifying TFO is Working

```bash
# Check TFO statistics (cookies requested, accepted, failed)
awk '/^TcpExt:/ {
  if (!header) {
    for (i = 2; i <= NF; i++) name[i] = $i
    header = 1
  } else {
    for (i = 2; i <= NF; i++) if (name[i] ~ /FastOpen/) print "TcpExt" name[i], $i
  }
}' /proc/net/netstat

# Or with nstat
nstat -az | grep -i FastOpen

# Key counters:
# TcpExtTCPFastOpenCookieReqd: TFO cookies requested by clients
# TcpExtTCPFastOpenActive: connections using TFO (data in SYN)
# TcpExtTCPFastOpenPassive: server accepted TFO connections

# Capture and verify data in SYN packet
tcpdump -i eth0 -n -v 'tcp[tcpflags] & tcp-syn != 0 and tcp port 80'
# Look for data in the SYN packet (length > 0)
```

## Conclusion

TCP Fast Open provides meaningful latency reduction for repeat connections - typically saving up to one full RTT per connection. Enable it only where the application can tolerate replay of data sent in the SYN packet. It is best for safe GET requests and similar read-only operations, and client support varies by browser and HTTP client.
