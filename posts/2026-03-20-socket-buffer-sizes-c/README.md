# How to Set Socket Buffer Sizes for High-Performance IPv4 Applications in C

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: C, IPv4, Socket, Performance, SO_SNDBUF, SO_RCVBUF, Networking

Description: Learn how to tune IPv4 socket send and receive buffer sizes in C using SO_SNDBUF and SO_RCVBUF to maximize throughput for high-performance network applications.

## Why Buffer Sizes Matter

The kernel maintains a send buffer (holds data queued by `send()` until it is transmitted and acknowledged) and a receive buffer (holds data received from the network but not yet read by `recv()`). Undersized buffers cause the TCP window to shrink, limiting throughput. Oversized buffers waste memory.

## Setting and Reading Buffer Sizes

```c
#include <sys/socket.h>
#include <stdio.h>
#include <unistd.h>

/* Set send and receive buffer sizes on fd.
   On Linux, the kernel doubles the value (for overhead).
   Always read back the actual value with getsockopt. */
void tune_buffers(int fd, int sndbuf_bytes, int rcvbuf_bytes) {
    /* Request the desired sizes */
    setsockopt(fd, SOL_SOCKET, SO_SNDBUF, &sndbuf_bytes, sizeof(sndbuf_bytes));
    setsockopt(fd, SOL_SOCKET, SO_RCVBUF, &rcvbuf_bytes, sizeof(rcvbuf_bytes));

    /* Read back actual values allocated by the kernel */
    int actual;
    socklen_t len = sizeof(actual);

    getsockopt(fd, SOL_SOCKET, SO_SNDBUF, &actual, &len);
    printf("SO_SNDBUF: requested=%d  actual=%d\n", sndbuf_bytes, actual);

    getsockopt(fd, SOL_SOCKET, SO_RCVBUF, &actual, &len);
    printf("SO_RCVBUF: requested=%d  actual=%d\n", rcvbuf_bytes, actual);
}
```

## High-Throughput Server Example

```c
#include <sys/socket.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <arpa/inet.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

#define PORT          9000
#define BUFSIZE       (4 * 1024 * 1024)   /* 4 MB buffers */
#define CHUNK         (128 * 1024)         /* 128 KB per recv() call */

int main(void) {
    int fd = socket(AF_INET, SOCK_STREAM, 0);

    int opt = 1;
    setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    /* Disable Nagle - send small writes immediately */
    setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, &opt, sizeof(opt));

    /* Large buffers for high-bandwidth transfers */
    int bufsize = BUFSIZE;
    setsockopt(fd, SOL_SOCKET, SO_SNDBUF, &bufsize, sizeof(bufsize));
    setsockopt(fd, SOL_SOCKET, SO_RCVBUF, &bufsize, sizeof(bufsize));

    struct sockaddr_in addr = {0};
    addr.sin_family      = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port        = htons(PORT);
    bind(fd, (struct sockaddr *)&addr, sizeof(addr));
    listen(fd, SOMAXCONN);

    printf("High-throughput server on port %d\n", PORT);

    int cfd = accept(fd, NULL, NULL);

    /* Apply same tuning to accepted connection */
    setsockopt(cfd, IPPROTO_TCP, TCP_NODELAY, &opt, sizeof(opt));
    setsockopt(cfd, SOL_SOCKET, SO_SNDBUF, &bufsize, sizeof(bufsize));
    setsockopt(cfd, SOL_SOCKET, SO_RCVBUF, &bufsize, sizeof(bufsize));

    char *buf = malloc(CHUNK);
    ssize_t total = 0;
    ssize_t n;
    while ((n = recv(cfd, buf, CHUNK, 0)) > 0) {
        total += n;
    }
    printf("Received %zd bytes\n", total);

    free(buf);
    close(cfd);
    close(fd);
    return 0;
}
```

## System-Wide Buffer Limits (Linux)

```bash
# View current kernel limits for socket buffers

sysctl net.core.rmem_max    # max receive buffer per socket
sysctl net.core.wmem_max    # max send buffer per socket
sysctl net.core.rmem_default
sysctl net.core.wmem_default

# Increase limits for high-performance applications (requires root)
sysctl -w net.core.rmem_max=16777216
sysctl -w net.core.wmem_max=16777216

# TCP-specific auto-tuning limits: min / default / max
sysctl net.ipv4.tcp_rmem    # e.g. "4096 131072 6291456"
sysctl net.ipv4.tcp_wmem    # e.g. "4096 16384 4194304"
```

## Calculating Optimal Buffer Size

A useful starting point for high-throughput transfers is the bandwidth-delay product (BDP):

```text
BDP = Bandwidth (bytes/sec) × RTT (sec)

Example: 1 Gbps link with 10ms RTT
  BDP = (1,000,000,000 / 8) × 0.010 = 1,250,000 bytes ≈ 1.25 MB
```

Set both `SO_SNDBUF` and `SO_RCVBUF` to at least the BDP to keep the pipe full.

## Buffer Size Reference

| Scenario | Recommended buffer |
|----------|-------------------|
| LAN bulk transfer (1 Gbps, 1ms RTT) | 128 KB |
| WAN bulk transfer (100 Mbps, 50ms RTT) | 625 KB |
| High-latency link (10 Mbps, 200ms RTT) | 250 KB |
| Low-latency interactive (any) | Default / auto-tuned |

## Conclusion

Set `SO_SNDBUF` and `SO_RCVBUF` before calling `connect()` or `listen()` - applying them to the server socket propagates default sizes to accepted connections, but tuning each accepted socket individually is more reliable. On Linux, the kernel doubles your requested value (one copy for overhead), so always read back the actual value with `getsockopt`. Size buffers to at least the bandwidth-delay product of your network path to keep the TCP window large enough to saturate the link. For very high-throughput workloads, also raise `net.core.rmem_max` and `net.core.wmem_max` system-wide - `SO_SNDBUF` and `SO_RCVBUF` cannot exceed these kernel ceilings.
