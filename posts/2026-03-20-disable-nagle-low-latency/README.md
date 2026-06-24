# How to Disable Nagle's Algorithm for Low-Latency Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Nagle Algorithm, TCP_NODELAY, Low Latency, Linux, Performance

Description: Disable Nagle's algorithm using TCP_NODELAY in various programming languages and server configurations to eliminate 40ms packet coalescing delays for interactive applications.

## Introduction

Disabling Nagle's algorithm (setting TCP_NODELAY) tells the TCP stack not to delay small writes in hopes of sending fewer packets. This is a common configuration for interactive or latency-sensitive applications. The trade-off is more small packets on the network, but for applications that send small messages and wait for responses, the latency savings can be significant.

## Disabling in Python

```python
import socket

# Method 1: Direct socket

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)  # Disable Nagle
s.connect(('10.20.0.5', 8080))

# Verify it's set
nodelay = s.getsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY)
print(f"TCP_NODELAY = {nodelay}")  # Should print 1

# Method 2: In a server with accepted connections
def handle_connection(conn):
    try:
        # Application logic goes here
        pass
    finally:
        conn.close()

server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server.bind(('0.0.0.0', 8080))
server.listen(100)

while True:
    conn, addr = server.accept()
    conn.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)  # Set on each new connection
    handle_connection(conn)
```

## Disabling in Node.js

```javascript
const net = require('net');

// Server: disable Nagle on accepted connections
const server = net.createServer((socket) => {
    socket.setNoDelay(true);  // Equivalent to TCP_NODELAY = 1
    console.log('Client connected, Nagle disabled');

    socket.on('data', (data) => {
        socket.write(data);  // Echo: write with Nagle disabled
    });
});

server.listen(8080);

// Client: disable Nagle
const client = net.createConnection({ host: '10.20.0.5', port: 8080 }, () => {
    client.setNoDelay(true);
    client.write('Hello');  // Write with Nagle disabled
});
```

## Disabling in Go

```go
package main

import (
    "fmt"
    "net"
)

func main() {
    // Go already defaults to TCP_NODELAY on *net.TCPConn,
    // but you can set it explicitly.
    conn, err := net.Dial("tcp", "10.20.0.5:8080")
    if err != nil {
        panic(err)
    }
    defer conn.Close()

    // Type assertion to access SetNoDelay
    tcpConn, ok := conn.(*net.TCPConn)
    if ok {
        if err := tcpConn.SetNoDelay(true); err != nil {
            panic(err)
        }
        fmt.Println("TCP_NODELAY enabled")
    }
}
```

## Disabling in Server Configuration

```nginx
# nginx: enable TCP_NODELAY where nginx supports it
tcp_nodelay on;
# proxy_socket_keepalive controls SO_KEEPALIVE, not Nagle's algorithm
```

```ini
# PostgreSQL does not expose a postgresql.conf setting for TCP_NODELAY.
# tcp_keepalives_idle tunes TCP keepalive and is unrelated to Nagle's algorithm.
tcp_keepalives_idle = 60
# PostgreSQL itself sets TCP_NODELAY on its TCP sockets in code.
```

## Redis and Databases

```bash
# Redis sets TCP_NODELAY on accepted client connections by default.
# There is no redis.conf setting to toggle TCP_NODELAY.
# tcp-keepalive configures SO_KEEPALIVE, which is a different socket option.
redis-cli CONFIG GET tcp-keepalive
```

## System-Wide Approach

There is no supported system-wide switch to disable Nagle for every application socket - TCP_NODELAY is a per-socket option. If you need it, set it in application code or in a library/framework that owns the socket.

```bash
# No global sysctl flips TCP_NODELAY on for every TCP socket.
# Set it in the application, client library, or server handling the connection.
```

## Conclusion

Disabling Nagle's algorithm for interactive applications is straightforward - set TCP_NODELAY on each connected socket that needs low-latency writes. For client code, set it after creating the socket and before sending latency-sensitive data. For server code, set it on each accepted connection. Every major language's networking library provides a direct method for this, although some runtimes such as Go already default TCP connections to no delay. The latency improvement can be measurable for small request-response exchanges, but the exact gain depends on the TCP stack, delayed ACK behavior, and traffic pattern.
