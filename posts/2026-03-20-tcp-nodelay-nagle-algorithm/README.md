# How to Set TCP_NODELAY to Disable Nagle's Algorithm in Socket Code

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, TCP, TCP_NODELAY, Nagle, Latency, Socket, Networking

Description: Learn how to disable Nagle's algorithm by setting TCP_NODELAY on IPv4 sockets in C, Python, Go, and Node.js to reduce latency for interactive and real-time network applications.

## What Is Nagle's Algorithm?

Nagle's algorithm (RFC 896) coalesces small TCP segments to reduce network overhead. When there is already unacknowledged data on the connection, the kernel holds additional small writes in the send buffer until one of these conditions is met:

1. The accumulated data reaches the MSS (Maximum Segment Size, typically 1460 bytes).
2. An ACK arrives for previously sent unacknowledged data.

Combined with delayed ACKs, this can add tens of milliseconds of artificial delay to small sends - unacceptable for interactive protocols (SSH, gaming, telemetry, RPC).

## Disabling Nagle's Algorithm in C

```c
#include <arpa/inet.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <stdint.h>
#include <stdio.h>
#include <sys/socket.h>

/* Disable Nagle on an existing socket - do this before first send() */
int disable_nagle(int fd) {
    int opt = 1;
    return setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, &opt, sizeof(opt));
}

/* At socket creation time for a client */
int create_low_latency_socket(const char *ip, uint16_t port) {
    int fd = socket(AF_INET, SOCK_STREAM, 0);

    /* Set TCP_NODELAY immediately - before connect() */
    int opt = 1;
    setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, &opt, sizeof(opt));

    struct sockaddr_in addr = {0};
    addr.sin_family = AF_INET;
    addr.sin_port   = htons(port);
    inet_pton(AF_INET, ip, &addr.sin_addr);
    connect(fd, (struct sockaddr *)&addr, sizeof(addr));

    return fd;
}

/* Verify the current setting */
void check_nodelay(int fd) {
    int opt;
    socklen_t len = sizeof(opt);
    getsockopt(fd, IPPROTO_TCP, TCP_NODELAY, &opt, &len);
    printf("TCP_NODELAY: %s\n", opt ? "enabled (Nagle off)" : "disabled (Nagle on)");
}
```

## Disabling Nagle in Python

```python
import socket

# Create a TCP socket and disable Nagle's algorithm

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
# TCP_NODELAY = 1 disables Nagle; set before connect() for best results
sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
sock.connect(("127.0.0.1", 9000))

# Verify
val = sock.getsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY)
print(f"TCP_NODELAY: {val}")  # 1 = Nagle disabled
```

## Disabling Nagle in Go

```go
package main

import (
    "fmt"
    "net"
)

func main() {
    conn, err := net.Dial("tcp4", "127.0.0.1:9000")
    if err != nil {
        panic(err)
    }
    defer conn.Close()

    // Assert *net.TCPConn to access SetNoDelay
    tcpConn, ok := conn.(*net.TCPConn)
    if !ok {
        panic("not a TCP connection")
    }

    // Go TCP connections default to no delay; this makes it explicit
    if err := tcpConn.SetNoDelay(true); err != nil {
        panic(err)
    }
    fmt.Println("Nagle disabled")
}
```

## Disabling Nagle in Node.js

```javascript
const net = require('net');

// Server-side: disable Nagle on each accepted connection
const server = net.createServer((socket) => {
    socket.setNoDelay(true);
    socket.on('data', (data) => {
        socket.write(data); // echo
    });
});

server.listen(9000, () => {
    const client = new net.Socket();

    client.connect(9000, '127.0.0.1', () => {
        // setNoDelay(true) disables Nagle's algorithm
        client.setNoDelay(true);
        console.log('Connected with TCP_NODELAY enabled');
        client.write('Hello');
    });
});
```

## When to Use TCP_NODELAY

| Use case | Nagle on? | Reason |
|----------|-----------|--------|
| Interactive SSH / telnet | OFF | Each keystroke must be sent immediately |
| HTTP/1.1 request-response | OFF | Avoids Nagle/delayed-ACK stalls on small chunks |
| Bulk file transfer | ON | Fewer, larger segments are more efficient |
| Game state updates | OFF | Minimizes round-trip latency |
| Database wire protocols | OFF | Small request packets must not be delayed |

## TCP_CORK vs TCP_NODELAY

```c
/* TCP_CORK (Linux): accumulate data until uncorked or MSS reached.
   Useful for sendfile() + headers; clearing TCP_CORK flushes pending output. */
int cork = 1;
setsockopt(fd, IPPROTO_TCP, TCP_CORK, &cork, sizeof(cork));
/* ... send headers ... */
/* ... sendfile() ... */
cork = 0;
setsockopt(fd, IPPROTO_TCP, TCP_CORK, &cork, sizeof(cork)); /* flushes */
```

## Conclusion

`TCP_NODELAY` disables Nagle's algorithm so small writes can be sent without waiting for an ACK or a full segment. Set it before the first `send()` - or before `connect()` when your socket API allows it - to avoid initial Nagle/delayed-ACK coalescing delays. Use it for interactive protocols (SSH, gaming, RPC, telemetry) where small messages must traverse the network immediately. For bulk transfer, leave Nagle enabled to reduce packet count and improve throughput. In Go, use `(*net.TCPConn).SetNoDelay(true)`; in Python, `setsockopt(IPPROTO_TCP, TCP_NODELAY, 1)`; in Node.js, `socket.setNoDelay(true)`.
