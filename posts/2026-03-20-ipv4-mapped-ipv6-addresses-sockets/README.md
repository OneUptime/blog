# How to Understand IPv4-Mapped IPv6 Addresses in Sockets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPv4-Mapped, Dual-Stack, Socket Programming, Networking, C

Description: Understand IPv4-mapped IPv6 addresses in dual-stack socket programming, how to detect them, extract the embedded IPv4 address, and handle them correctly in applications.

## Introduction

IPv4-mapped IPv6 addresses (`::ffff:x.x.x.x`) are used by dual-stack sockets to represent IPv4 connections on an IPv6 socket. When a dual-stack server (with `IPV6_V6ONLY=0`) accepts an IPv4 connection, the kernel presents the remote address as an IPv4-mapped IPv6 address. Applications must handle these to correctly identify IPv4 clients.

## IPv4-Mapped Address Format

```text
::ffff:0:0/96      (IANA prefix for IPv4-mapped)
::ffff:192.168.1.1 (IPv4 192.168.1.1 mapped to IPv6)
::ffff:c0a8:0101   (same, in hex notation)
```

The mapping is simple:
```text
IPv4: w.x.y.z
IPv6: ::ffff:w.x.y.z
Binary: 80 zeros + 16 ones + 32-bit IPv4 address
```

## Detecting IPv4-Mapped Addresses in C

```c
#include <netinet/in.h>
#include <arpa/inet.h>
#include <string.h>
#include <stdio.h>

/* Extract IPv4 from IPv4-mapped IPv6 address */
int extract_ipv4_from_mapped(const struct in6_addr *ipv6,
                              struct in_addr *ipv4_out) {
    /* Check for ::ffff:0:0/96 prefix */
    if (!IN6_IS_ADDR_V4MAPPED(ipv6)) {
        return -1;  /* Not an IPv4-mapped address */
    }

    /* The IPv4 address is in the last 4 bytes of the 16-byte IPv6 address */
    memcpy(ipv4_out, &ipv6->s6_addr[12], sizeof(struct in_addr));
    return 0;
}

void classify_address(const struct sockaddr_in6 *addr6) {
    char ip_str[INET6_ADDRSTRLEN];
    inet_ntop(AF_INET6, &addr6->sin6_addr, ip_str, sizeof(ip_str));

    if (IN6_IS_ADDR_V4MAPPED(&addr6->sin6_addr)) {
        /* Extract and print the IPv4 address */
        struct in_addr ipv4;
        extract_ipv4_from_mapped(&addr6->sin6_addr, &ipv4);

        char ipv4_str[INET_ADDRSTRLEN];
        inet_ntop(AF_INET, &ipv4, ipv4_str, sizeof(ipv4_str));

        printf("IPv4-mapped: %s (real IPv4: %s)\n", ip_str, ipv4_str);

    } else if (IN6_IS_ADDR_LOOPBACK(&addr6->sin6_addr)) {
        printf("IPv6 loopback: ::1\n");

    } else if (IN6_IS_ADDR_LINKLOCAL(&addr6->sin6_addr)) {
        printf("Link-local: %s\n", ip_str);

    } else {
        printf("Other IPv6: %s\n", ip_str);
    }
}
```

## Handling IPv4-Mapped in Accept Loop

```c
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

int main(void) {
    int server = socket(AF_INET6, SOCK_STREAM, 0);

    /* Enable dual-stack */
    int v6only = 0;
    setsockopt(server, IPPROTO_IPV6, IPV6_V6ONLY, &v6only, sizeof(v6only));

    int reuse = 1;
    setsockopt(server, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse));

    struct sockaddr_in6 addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin6_family = AF_INET6;
    addr.sin6_port   = htons(8080);
    addr.sin6_addr   = in6addr_any;

    bind(server, (struct sockaddr *)&addr, sizeof(addr));
    listen(server, 5);
    printf("Dual-stack server on [::]:8080\n");

    while (1) {
        struct sockaddr_in6 client_addr;
        socklen_t client_len = sizeof(client_addr);
        int client = accept(server, (struct sockaddr *)&client_addr, &client_len);
        if (client < 0) continue;

        /* Determine actual client IP type */
        if (IN6_IS_ADDR_V4MAPPED(&client_addr.sin6_addr)) {
            /* IPv4 client came in through dual-stack socket */
            struct in_addr ipv4;
            memcpy(&ipv4, &client_addr.sin6_addr.s6_addr[12], 4);

            char ipv4_str[INET_ADDRSTRLEN];
            inet_ntop(AF_INET, &ipv4, ipv4_str, sizeof(ipv4_str));
            printf("IPv4 client: %s:%d\n", ipv4_str, ntohs(client_addr.sin6_port));
        } else {
            char ipv6_str[INET6_ADDRSTRLEN];
            inet_ntop(AF_INET6, &client_addr.sin6_addr, ipv6_str, sizeof(ipv6_str));
            printf("IPv6 client: [%s]:%d\n", ipv6_str, ntohs(client_addr.sin6_port));
        }

        write(client, "Hello!\n", 7);
        close(client);
    }
}
```

## Python: Handling IPv4-Mapped Addresses

```python
import socket
import ipaddress

def normalize_client_address(raw_ip: str) -> str:
    """
    Normalize a client IP address from a dual-stack socket.
    Converts IPv4-mapped IPv6 (::ffff:x.x.x.x) to plain IPv4.
    """
    try:
        addr = ipaddress.ip_address(raw_ip)
        if isinstance(addr, ipaddress.IPv6Address):
            # Check for IPv4-mapped
            if addr.ipv4_mapped:
                return str(addr.ipv4_mapped)  # Return as IPv4
        return str(addr)
    except ValueError:
        return raw_ip

# Usage with socket accept

server = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
server.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
server.bind(('::', 8080, 0, 0))
server.listen(5)

conn, addr = server.accept()
raw_ip = addr[0]  # May be ::ffff:192.168.1.5

# Normalize to get real client IP
real_ip = normalize_client_address(raw_ip)
print(f"Client: {real_ip}")  # Shows 192.168.1.5 not ::ffff:192.168.1.5
```

## IPv4-Mapped in WSGI Environ

```python
# In WSGI apps, REMOTE_ADDR may be an IPv4-mapped IPv6 address
import ipaddress

def get_client_ip(environ: dict) -> str:
    """Get client IP from WSGI environ, normalizing IPv4-mapped IPv6."""
    ip = environ.get('REMOTE_ADDR', '')
    try:
        addr = ipaddress.ip_address(ip)
        if isinstance(addr, ipaddress.IPv6Address) and addr.ipv4_mapped:
            return str(addr.ipv4_mapped)
        return str(addr)
    except ValueError:
        return ip
```

## Conclusion

IPv4-mapped IPv6 addresses appear in dual-stack sockets when IPv4 clients connect to an `AF_INET6` socket with `IPV6_V6ONLY=0`. Use `IN6_IS_ADDR_V4MAPPED()` in C or `addr.ipv4_mapped` in Python to detect them. Extract the real IPv4 address from bytes 12–15 of the 16-byte `in6_addr` for proper logging, rate limiting, and access control.
