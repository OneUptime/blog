# How to Bind to IPv6 Wildcard Address (::) in Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Bind Address, Socket Programming, Networking, Wildcard, Dual-Stack

Description: Bind server applications to the IPv6 wildcard address (::) to listen on all IPv6 interfaces, with options for dual-stack operation that also accepts IPv4 connections.

## Introduction

The IPv6 wildcard address `::` is the equivalent of IPv4's `0.0.0.0` - it instructs the kernel to accept connections on all available network interfaces. Binding to `::` is the standard way to make an IPv6 server accessible from any interface, and with `IPV6_V6ONLY=0`, also from IPv4 clients through IPv4-mapped addresses on platforms that support dual-stack sockets.

## The IPv6 Wildcard Address

```text
::            = All zeros = 0:0:0:0:0:0:0:0
              = IPv6 equivalent of 0.0.0.0

Loopback:     ::1  (accept only from same host)
Link-local:   Needs scope ID (fe80::1%eth0)
```

## Binding in C

```c
#include <sys/socket.h>
#include <netinet/in.h>
#include <string.h>
#include <stdio.h>
#include <unistd.h>

int bind_ipv6_wildcard(int port, int dual_stack) {
    int sockfd = socket(AF_INET6, SOCK_STREAM, 0);
    if (sockfd < 0) { perror("socket"); return -1; }

    /* Allow address reuse */
    int reuse = 1;
    setsockopt(sockfd, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse));

    /* Dual-stack control:
     * IPV6_V6ONLY=0: Accept IPv4-mapped AND IPv6 connections (dual-stack)
     * IPV6_V6ONLY=1: Accept IPv6 ONLY
     */
    int v6only = dual_stack ? 0 : 1;
    setsockopt(sockfd, IPPROTO_IPV6, IPV6_V6ONLY, &v6only, sizeof(v6only));

    /* Bind to :: (wildcard - all IPv6 interfaces) */
    struct sockaddr_in6 addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin6_family = AF_INET6;
    addr.sin6_port   = htons(port);
    addr.sin6_addr   = in6addr_any;   /* :: - wildcard */
    /* addr.sin6_scope_id = 0 for global bind */

    if (bind(sockfd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        perror("bind");
        close(sockfd);
        return -1;
    }

    if (listen(sockfd, 5) < 0) {
        perror("listen");
        close(sockfd);
        return -1;
    }

    printf("Listening on [::]:%d (dual-stack=%s)\n", port,
           dual_stack ? "yes" : "no");
    return sockfd;
}

int main(void) {
    /* Dual-stack: one socket, accepts IPv4 and IPv6 */
    int dual = bind_ipv6_wildcard(8080, 1);

    /* IPv6-only: only accepts IPv6 */
    int v6only = bind_ipv6_wildcard(8081, 0);

    /* Accept loop */
    /* ... */

    if (dual >= 0) close(dual);
    if (v6only >= 0) close(v6only);
    return 0;
}
```

## Using in6addr_any vs IN6ADDR_ANY_INIT

```c
/* Four equivalent ways to set the wildcard address */

/* Method 1: in6addr_any (global constant, most common) */
addr.sin6_addr = in6addr_any;

/* Method 2: IN6ADDR_ANY_INIT (used in struct initialization) */
struct sockaddr_in6 addr = {
    .sin6_family = AF_INET6,
    .sin6_port = htons(8080),
    .sin6_addr = IN6ADDR_ANY_INIT,
};

/* Method 3: inet_pton */
inet_pton(AF_INET6, "::", &addr.sin6_addr);

/* Method 4: memset (all zeros = ::) */
memset(&addr.sin6_addr, 0, sizeof(addr.sin6_addr));
```

## Binding in Python

```python
import socket

def create_ipv6_server(port: int, dual_stack: bool = True) -> socket.socket:
    """Bind to IPv6 wildcard address."""
    sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    # IPV6_V6ONLY: 0 = dual-stack on platforms that support it, 1 = IPv6 only
    sock.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0 if dual_stack else 1)

    # '::'  is the IPv6 wildcard address
    sock.bind(('::', port, 0, 0))
    sock.listen(5)
    print(f"Listening on [::]:{port} (dual_stack={dual_stack})")
    return sock

server = create_ipv6_server(8080, dual_stack=True)
```

## Binding in Go

```go
package main

import (
    "fmt"
    "net"
)

func bindWildcard(port int) (net.Listener, error) {
    // "[::]:port" binds to IPv6 wildcard
    // Whether the listener also accepts IPv4 depends on the OS
    return net.Listen("tcp", fmt.Sprintf("[::]:%d", port))
}

func main() {
    l, err := bindWildcard(8080)
    if err != nil {
        panic(err)
    }
    defer l.Close()
    fmt.Println("Listening on", l.Addr())
}
```

## Verifying the Bind

```bash
# After starting your server, verify it's bound to :: (IPv6 wildcard)

ss -tlnp | grep ':8080'

# Expected output for dual-stack on Linux:
# LISTEN  0  128  *:8080  *:*  (single entry, handles both)

# Expected output for IPv6-only on Linux:
# LISTEN  0  128  [::]:8080  [::]:*

# On BSD/macOS, use the equivalent socket inspection tool for your OS;
# output formatting differs from ss.

# Test IPv6 connection
nc -6 ::1 8080

# Test IPv4 connection (only works if dual-stack)
nc -4 127.0.0.1 8080
```

## When to Bind to Specific Address Instead

```c
/* Instead of ::, bind to a specific IPv6 address when you want to:
 * 1. Only accept connections on one interface
 * 2. Control which source address is used (for clients)
 * 3. Security: isolate service to a specific network
 */
inet_pton(AF_INET6, "2001:db8::10", &addr.sin6_addr);
/* Now only accepts connections to 2001:db8::10 */
```

## Conclusion

Binding to `::` (`in6addr_any`) creates a server that listens on all IPv6 interfaces. With `IPV6_V6ONLY=0`, this becomes a single dual-stack socket that also accepts IPv4 via IPv4-mapped addresses on platforms that support dual-stack sockets. Set `IPV6_V6ONLY=1` explicitly when you need IPv6-only behavior. Always verify with `ss -tlnp` on Linux that the server is actually listening on `[::]:port` (IPv6-only) or as a single dual-stack `*:port` entry after starting.
