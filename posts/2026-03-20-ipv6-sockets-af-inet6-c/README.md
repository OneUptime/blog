# How to Create IPv6 Sockets with AF_INET6 in C

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: C, IPv6, AF_INET6, Socket Programming, POSIX, Systems Programming, Networking

Description: Create and use IPv6 sockets in C using AF_INET6, configure dual-stack behavior with IPV6_V6ONLY, and implement both TCP and UDP IPv6 servers and clients.

## Introduction

IPv6 sockets in C use the `AF_INET6` address family with `struct sockaddr_in6` for address storage. Unlike IPv4 sockets, IPv6 introduces additional fields like flow information and scope IDs, and whether an `AF_INET6` socket also accepts IPv4-mapped connections depends on platform defaults unless you set `IPV6_V6ONLY` explicitly. This guide covers creating, binding, and using IPv6 sockets for both TCP and UDP.

## Required Headers

```c
#include <sys/socket.h>      /* socket(), bind(), connect(), accept() */
#include <netinet/in.h>      /* struct sockaddr_in6, in6addr_any */
#include <arpa/inet.h>       /* inet_pton(), inet_ntop() */
#include <netdb.h>           /* getaddrinfo() */
#include <stdint.h>          /* uint16_t */
#include <unistd.h>          /* close() */
#include <string.h>          /* memset() */
#include <stdio.h>
#include <stdlib.h>
```

## Creating an IPv6 TCP Socket

```c
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <string.h>
#include <stdio.h>

int main(void) {
    /* Step 1: Create the socket
     * AF_INET6 = IPv6
     * SOCK_STREAM = TCP (reliable, connection-oriented)
     * 0 = default protocol (TCP for SOCK_STREAM)
     */
    int sockfd = socket(AF_INET6, SOCK_STREAM, 0);
    if (sockfd < 0) {
        perror("socket(AF_INET6, SOCK_STREAM, 0)");
        return 1;
    }

    /* Step 2: Set socket options */
    int reuse = 1;
    setsockopt(sockfd, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse));

    /* 1 = IPv6 only, 0 = allow IPv4-mapped addresses if the platform supports it */
    int v6only = 1;
    setsockopt(sockfd, IPPROTO_IPV6, IPV6_V6ONLY, &v6only, sizeof(v6only));

    /* Step 3: Configure the address structure */
    struct sockaddr_in6 addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin6_family   = AF_INET6;           /* IPv6 */
    addr.sin6_port     = htons(8080);        /* Port in network byte order */
    addr.sin6_addr     = in6addr_any;        /* :: (all interfaces) */
    addr.sin6_flowinfo = 0;                  /* Flow info (usually 0) */
    addr.sin6_scope_id = 0;                  /* Scope ID (0 when not using a scoped address) */

    /* Step 4: Bind to the address */
    if (bind(sockfd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        perror("bind");
        close(sockfd);
        return 1;
    }

    /* Step 5: Listen for connections */
    if (listen(sockfd, 5) < 0) {
        perror("listen");
        close(sockfd);
        return 1;
    }

    printf("IPv6 TCP server listening on [::]:8080\n");

    /* Step 6: Accept connections */
    struct sockaddr_in6 client_addr;
    socklen_t client_len = sizeof(client_addr);

    int client = accept(sockfd, (struct sockaddr *)&client_addr, &client_len);
    if (client >= 0) {
        char client_ip[INET6_ADDRSTRLEN];
        inet_ntop(AF_INET6, &client_addr.sin6_addr, client_ip, sizeof(client_ip));
        printf("Client connected: [%s]:%d\n",
               client_ip, ntohs(client_addr.sin6_port));

        write(client, "Hello IPv6 client!\n", 19);
        close(client);
    }

    close(sockfd);
    return 0;
}
```

## Creating an IPv6 UDP Socket

```c
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

int main(void) {
    /* UDP socket: SOCK_DGRAM instead of SOCK_STREAM */
    int sockfd = socket(AF_INET6, SOCK_DGRAM, 0);
    if (sockfd < 0) { perror("socket"); return 1; }

    struct sockaddr_in6 addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin6_family = AF_INET6;
    addr.sin6_port   = htons(9090);      /* Example unprivileged port */
    addr.sin6_addr   = in6addr_any;

    if (bind(sockfd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        perror("bind");
        close(sockfd);
        return 1;
    }

    printf("UDP server listening on [::]:9090\n");

    /* Receive a UDP datagram */
    char buf[4096];
    struct sockaddr_in6 sender;
    socklen_t sender_len = sizeof(sender);

    ssize_t n = recvfrom(sockfd, buf, sizeof(buf)-1, 0,
                         (struct sockaddr *)&sender, &sender_len);
    if (n > 0) {
        buf[n] = '\0';
        char sender_ip[INET6_ADDRSTRLEN];
        inet_ntop(AF_INET6, &sender.sin6_addr, sender_ip, sizeof(sender_ip));
        printf("Received %zd bytes from [%s]: %s\n",
               n, sender_ip, buf);

        /* Send response back */
        const char *reply = "ACK";
        sendto(sockfd, reply, 3, 0,
               (struct sockaddr *)&sender, sender_len);
    }

    close(sockfd);
    return 0;
}
```

## Connecting to an IPv6 Server

```c
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <stdint.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>

int connect_ipv6(const char *addr_str, uint16_t port) {
    struct sockaddr_in6 server;
    memset(&server, 0, sizeof(server));
    server.sin6_family = AF_INET6;
    server.sin6_port   = htons(port);

    /* Convert address string to binary */
    if (inet_pton(AF_INET6, addr_str, &server.sin6_addr) != 1) {
        fprintf(stderr, "Invalid IPv6 address: %s\n", addr_str);
        return -1;
    }

    int sockfd = socket(AF_INET6, SOCK_STREAM, 0);
    if (sockfd < 0) { perror("socket"); return -1; }

    if (connect(sockfd, (struct sockaddr *)&server, sizeof(server)) < 0) {
        perror("connect");
        close(sockfd);
        return -1;
    }

    printf("Connected to [%s]:%d\n", addr_str, port);
    return sockfd;
}

int main(void) {
    int fd = connect_ipv6("::1", 8080);
    if (fd >= 0) {
        char buf[256];
        ssize_t n = read(fd, buf, sizeof(buf)-1);
        if (n > 0) { buf[n] = 0; printf("Server: %s", buf); }
        close(fd);
    }
    return 0;
}
```

## Compile and Test

```bash
# Compile the server

gcc -o ipv6_server ipv6_server.c -Wall -Wextra

# Run the server
./ipv6_server

# Test with netcat
nc -6 ::1 8080
# Or
echo "hello" | nc -6 ::1 8080
```

## Key Constants and Functions Reference

```c
/* Address constants */
in6addr_any       /* :: - bind to all interfaces */
in6addr_loopback  /* ::1 - loopback only */
IN6ADDR_ANY_INIT  /* Initializer for struct in6_addr */

/* Address checks (from <netinet/in.h>) */
IN6_IS_ADDR_LOOPBACK(&addr)      /* Is ::1 */
IN6_IS_ADDR_LINKLOCAL(&addr)     /* Is fe80::/10 */
IN6_IS_ADDR_SITELOCAL(&addr)     /* Is deprecated fec0::/10 */
IN6_IS_ADDR_V4MAPPED(&addr)      /* Is ::ffff:x.x.x.x */
IN6_IS_ADDR_MULTICAST(&addr)     /* Is ff00::/8 */

/* Conversion */
inet_pton(AF_INET6, str, &addr)  /* String to binary */
inet_ntop(AF_INET6, &addr, str, INET6_ADDRSTRLEN) /* Binary to string */
```

## Conclusion

Creating IPv6 TCP and UDP sockets in C requires `AF_INET6` as the address family, `struct sockaddr_in6` for address storage, `inet_pton(AF_INET6, ...)` for address parsing, and `in6addr_any` for binding to all interfaces. The structure and function calls are slightly more verbose than IPv4 but follow the same pattern. For portable code, use `getaddrinfo()` with `AF_UNSPEC`, and set `IPV6_V6ONLY` explicitly when you need consistent IPv6-only or dual-stack behavior across platforms.
