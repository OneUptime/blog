# How to Use Dual-Stack Sockets with IPV6_V6ONLY

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Dual-Stack, IPV6_V6ONLY, Socket Programming, C, Linux, Networking

Description: Configure dual-stack sockets using the IPV6_V6ONLY socket option to control whether an IPv6 socket also accepts IPv4 connections through IPv4-mapped addresses.

## Introduction

The `IPV6_V6ONLY` socket option controls whether an IPv6 socket also accepts IPv4 connections via IPv4-mapped IPv6 addresses (e.g., `::ffff:192.168.1.1`). When set to 0, a single IPv6 socket can serve both IPv4 and IPv6 clients. When set to 1, only IPv6 connections are accepted. RFC 3493 specifies a default of 0, but the actual default varies by operating system.

## OS Default Behavior

| OS | Default IPV6_V6ONLY |
|----|---------------------|
| Linux | 0 by default (dual-stack; controlled by `/proc/sys/net/ipv6/bindv6only`) |
| Windows (Vista and later) | 1 (IPv6-only by default) |
| FreeBSD/OpenBSD | 1 (IPv6-only by default) |

## Checking and Setting IPV6_V6ONLY in C

```c
#include <sys/socket.h>
#include <netinet/in.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>

int create_ipv6_socket(int port, int v6only) {
    int sockfd = socket(AF_INET6, SOCK_STREAM, 0);
    if (sockfd < 0) { perror("socket"); return -1; }

    /* Read current IPV6_V6ONLY value */
    int current_v6only;
    socklen_t optlen = sizeof(current_v6only);
    if (getsockopt(sockfd, IPPROTO_IPV6, IPV6_V6ONLY,
                   &current_v6only, &optlen) < 0) {
        perror("getsockopt IPV6_V6ONLY");
        close(sockfd);
        return -1;
    }
    printf("Current IPV6_V6ONLY: %d\n", current_v6only);

    /* Set IPV6_V6ONLY:
     * v6only = 1: IPv6 only (reject IPv4-mapped connections)
     * v6only = 0: Dual-stack (accept IPv4 via IPv4-mapped addresses)
     */
    if (setsockopt(sockfd, IPPROTO_IPV6, IPV6_V6ONLY,
                   &v6only, sizeof(v6only)) < 0) {
        perror("setsockopt IPV6_V6ONLY");
        close(sockfd);
        return -1;
    }

    /* Bind and listen */
    int reuse = 1;
    if (setsockopt(sockfd, SOL_SOCKET, SO_REUSEADDR,
                   &reuse, sizeof(reuse)) < 0) {
        perror("setsockopt SO_REUSEADDR");
        close(sockfd);
        return -1;
    }

    struct sockaddr_in6 addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin6_family = AF_INET6;
    addr.sin6_port   = htons(port);
    addr.sin6_addr   = in6addr_any;

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

    printf("Server created with IPV6_V6ONLY=%d on port %d\n", v6only, port);
    return sockfd;
}

int main(void) {
    /* Dual-stack: accepts both IPv4 and IPv6 clients */
    int dual_stack_server = create_ipv6_socket(8080, 0);

    /* IPv6-only: rejects IPv4 clients */
    int ipv6_only_server = create_ipv6_socket(8081, 1);

    /* Accept loop would go here */
    if (dual_stack_server >= 0) close(dual_stack_server);
    if (ipv6_only_server >= 0) close(ipv6_only_server);
    return 0;
}
```

## How IPv4-Mapped Addresses Work

When `IPV6_V6ONLY=0`, an IPv4 client connecting to an IPv6 socket gets mapped:

```text
IPv4 client:  192.168.1.5:12345
  ↓ (mapped by OS)
IPv6 socket sees: ::ffff:192.168.1.5
```

```c
#include <arpa/inet.h>

/* When accepting, check if client is IPv4-mapped */
struct sockaddr_in6 client_addr;
socklen_t len = sizeof(client_addr);
int client = accept(server, (struct sockaddr *)&client_addr, &len);

char ip_str[INET6_ADDRSTRLEN];
inet_ntop(AF_INET6, &client_addr.sin6_addr, ip_str, sizeof(ip_str));

/* Check if it's an IPv4-mapped address */
if (IN6_IS_ADDR_V4MAPPED(&client_addr.sin6_addr)) {
    /* Extract the embedded IPv4 address */
    struct in_addr ipv4_addr;
    memcpy(&ipv4_addr, &client_addr.sin6_addr.s6_addr[12], 4);
    char ipv4_str[INET_ADDRSTRLEN];
    inet_ntop(AF_INET, &ipv4_addr, ipv4_str, sizeof(ipv4_str));
    printf("IPv4 client (mapped): %s\n", ipv4_str);
} else {
    printf("IPv6 client: %s\n", ip_str);
}
```

## Dual-Stack Configuration in Python

```python
import socket

def create_dual_stack_server(port: int) -> socket.socket:
    """Create a server that accepts both IPv4 and IPv6."""
    sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)

    # Disable IPV6_V6ONLY to allow IPv4 connections via mapped addresses
    sock.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    sock.bind(('::', port, 0, 0))
    sock.listen(5)
    return sock

def create_ipv6_only_server(port: int) -> socket.socket:
    """Create a server that only accepts IPv6 clients."""
    sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)

    # Enable IPV6_V6ONLY to reject IPv4 clients
    sock.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 1)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    sock.bind(('::', port, 0, 0))
    sock.listen(5)
    return sock

# Check system default

test_sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
v6only = test_sock.getsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY)
print(f"System default IPV6_V6ONLY: {v6only}")
test_sock.close()
```

## Best Practices

**For public-facing servers**: Dual-stack (`IPV6_V6ONLY=0`) can simplify deployment with a single listening socket, but separate IPv4 and IPv6 sockets are often used for maximum portability and clearer policy control.

**For IPv6-only deployments**: Explicitly set `IPV6_V6ONLY=1` to avoid ambiguity and ensure no IPv4 fallback.

**For portability**: Explicitly set `IPV6_V6ONLY` in your code rather than relying on OS defaults, since defaults differ between Linux (0) and platforms such as Windows, FreeBSD, and OpenBSD (1).

```c
/* Explicitly set for portability - don't rely on OS default */
int v6only = 0;  /* 0 = dual-stack */
setsockopt(sockfd, IPPROTO_IPV6, IPV6_V6ONLY, &v6only, sizeof(v6only));
```

## Linux Kernel Default Configuration

```bash
# Check and set system-wide default for IPV6_V6ONLY
cat /proc/sys/net/ipv6/bindv6only
# 0 = dual-stack by default

# Change to IPv6-only by default
sudo sysctl -w net.ipv6.bindv6only=1

# Make permanent
echo "net.ipv6.bindv6only=1" | sudo tee -a /etc/sysctl.d/99-ipv6.conf
sudo sysctl -p /etc/sysctl.d/99-ipv6.conf
```

## Conclusion

`IPV6_V6ONLY` is a critical socket option for dual-stack deployments. Set it to `0` for a single socket that handles both IPv4 and IPv6 clients through IPv4-mapped addresses. Set it to `1` for pure IPv6-only sockets. Always set this option explicitly in code rather than relying on OS defaults, which differ between platforms.
