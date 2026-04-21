# How to Understand struct sockaddr_in6 in C

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: C, IPv6, Sockaddr_in6, Socket Programming, POSIX, Systems Programming, Networking

Description: Understand the struct sockaddr_in6 data structure used in C IPv6 socket programming, including all fields, byte ordering, and practical usage patterns.

## Introduction

`struct sockaddr_in6` is the IPv6 equivalent of `struct sockaddr_in` and is the primary data structure for specifying IPv6 addresses in POSIX socket calls. Understanding each field and how to initialize it correctly is fundamental to IPv6 socket programming in C.

## The Structure Definition

```c
#include <netinet/in.h>

/* IPv6 socket address structure (RFC 3493) */
struct sockaddr_in6 {
    sa_family_t     sin6_family;    /* Address family: AF_INET6 */
    in_port_t       sin6_port;      /* 16-bit port in network byte order */
    uint32_t        sin6_flowinfo;  /* IPv6 flow information (4 bytes) */
    struct in6_addr sin6_addr;      /* IPv6 address - 128 bits (16 bytes) */
    uint32_t        sin6_scope_id;  /* Scope ID for scoped addresses (4 bytes) */
};
/* Common size: 28 bytes, but use sizeof(addr) for portability. */

/* The 128-bit IPv6 address (portable POSIX member) */
struct in6_addr {
    uint8_t s6_addr[16];            /* IPv6 address in network byte order */
};
```

## Field-by-Field Explanation

### sin6_family

Must always be `AF_INET6`. This is checked by the kernel to determine the address family:

```c
struct sockaddr_in6 addr;
addr.sin6_family = AF_INET6;  /* Required: identifies this as IPv6 */
```

### sin6_port

Port number in **network byte order** (big-endian). Always use `htons()`:

```c
addr.sin6_port = htons(8080);   /* Port 8080 → network byte order */
addr.sin6_port = htons(443);    /* HTTPS port */
addr.sin6_port = htons(0);      /* Let OS assign an ephemeral port */

/* Read back with ntohs() */
uint16_t local_port = ntohs(addr.sin6_port);
```

### sin6_flowinfo

IPv6 flow label (20 bits) and traffic class (8 bits). Set to 0 for most applications:

```c
addr.sin6_flowinfo = 0;         /* No flow label (most applications) */
/* Platform-specific QoS example:
   EF (DSCP 46, ECN 0) is traffic class 0xb8.
   addr.sin6_flowinfo = htonl(0xb8u << 20);
*/
```

### sin6_addr

The 128-bit IPv6 address. Initialized in several ways:

```c
#include <netinet/in.h>
#include <arpa/inet.h>
#include <string.h>

/* Method 1: All-zeros wildcard (::) */
addr.sin6_addr = in6addr_any;

/* Method 2: Loopback (::1) */
addr.sin6_addr = in6addr_loopback;

/* Method 3: Parse from string */
inet_pton(AF_INET6, "2001:db8::1", &addr.sin6_addr);

/* Method 4: Static initializer at declaration */
struct in6_addr any_addr = IN6ADDR_ANY_INIT;
addr.sin6_addr = any_addr;

/* Method 5: Manually set bytes */
uint8_t bytes[16] = {
    0x20, 0x01, 0x0d, 0xb8,  /* 2001:0db8 */
    0x00, 0x00, 0x00, 0x00,  /* 0000:0000 */
    0x00, 0x00, 0x00, 0x00,  /* 0000:0000 */
    0x00, 0x00, 0x00, 0x01   /* 0000:0001 */
};
memcpy(addr.sin6_addr.s6_addr, bytes, sizeof addr.sin6_addr.s6_addr);
```

### sin6_scope_id

Used for scoped addresses, primarily link-local (`fe80::/10`). For global addresses, set to 0:

```c
#include <net/if.h>    /* For if_nametoindex() */

/* For global unicast addresses */
addr.sin6_scope_id = 0;

/* For link-local addresses: interface index */
addr.sin6_scope_id = if_nametoindex("eth0");

/* Get interface index from name */
unsigned int idx = if_nametoindex("eth0");
```

## Complete Usage Example

```c
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <net/if.h>
#include <string.h>
#include <stdio.h>

void print_sockaddr_in6(const struct sockaddr_in6 *addr) {
    char ip_str[INET6_ADDRSTRLEN];
    inet_ntop(AF_INET6, &addr->sin6_addr, ip_str, sizeof(ip_str));

    printf("Family:    AF_INET6 (%d)\n", addr->sin6_family);
    printf("Port:      %d\n", ntohs(addr->sin6_port));
    printf("Flowinfo:  0x%08x\n", ntohl(addr->sin6_flowinfo));
    printf("Address:   %s\n", ip_str);
    printf("Scope ID:  %u\n", addr->sin6_scope_id);
}

int main(void) {
    struct sockaddr_in6 addr;
    memset(&addr, 0, sizeof(addr));   /* Zero all fields first */

    /* Fill in the structure */
    addr.sin6_family   = AF_INET6;
    addr.sin6_port     = htons(8080);
    addr.sin6_flowinfo = 0;
    addr.sin6_scope_id = 0;

    /* Parse address string */
    if (inet_pton(AF_INET6, "2001:db8::1", &addr.sin6_addr) != 1) {
        perror("inet_pton");
        return 1;
    }

    print_sockaddr_in6(&addr);

    /* Link-local example */
    struct sockaddr_in6 ll_addr;
    memset(&ll_addr, 0, sizeof(ll_addr));
    ll_addr.sin6_family   = AF_INET6;
    ll_addr.sin6_port     = htons(80);
    ll_addr.sin6_scope_id = if_nametoindex("eth0");  /* Required for link-local */
    inet_pton(AF_INET6, "fe80::1", &ll_addr.sin6_addr);

    printf("\nLink-local:\n");
    print_sockaddr_in6(&ll_addr);

    return 0;
}
```

## Casting to sockaddr

Socket functions take `struct sockaddr *`. Cast explicitly:

```c
/* Always cast when passing to bind/connect/accept */
struct sockaddr_in6 addr6;
/* ... fill addr6 ... */

bind(sockfd, (struct sockaddr *)&addr6, sizeof(addr6));
connect(sockfd, (struct sockaddr *)&addr6, sizeof(addr6));
```

## Comparing sockaddr_in6 vs sockaddr_in

| Field | sockaddr_in (IPv4) | sockaddr_in6 (IPv6) |
|-------|--------------------|---------------------|
| Typical size | 16 bytes | 28 bytes (use `sizeof`) |
| Address | 4 bytes (in_addr) | 16 bytes (in6_addr) |
| Extra fields | None required by POSIX | flowinfo, scope_id |
| Wildcard | INADDR_ANY | in6addr_any |
| Loopback | INADDR_LOOPBACK (common extension) | in6addr_loopback |

## Conclusion

`struct sockaddr_in6` is the IPv6 socket address structure with five fields: `sin6_family` (always `AF_INET6`), `sin6_port` (use `htons()`), `sin6_flowinfo` (typically 0), `sin6_addr` (128-bit address), and `sin6_scope_id` (interface index for link-local). Always initialize with `memset(&addr, 0, sizeof(addr))` before setting individual fields to avoid uninitialized memory issues.
