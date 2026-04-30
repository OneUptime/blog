# How to Use getaddrinfo() for Protocol-Independent Code

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: C, IPv6, Getaddrinfo, Socket Programming, Protocol Independence, Networking

Description: Use getaddrinfo() to write protocol-independent network code in C that automatically works with both IPv4 and IPv6 without separate code paths.

## Introduction

`getaddrinfo()` is the modern, protocol-independent alternative to `gethostbyname()` and manual IPv4/IPv6 address handling. It resolves hostnames and service names to a list of socket addresses, handling IPv4 and IPv6 transparently. Using `getaddrinfo()` is the recommended approach for new network code.

## Function Signature

```c
#define _POSIX_C_SOURCE 200112L

#include <sys/types.h>
#include <sys/socket.h>
#include <netdb.h>

int getaddrinfo(
    const char *node,           /* Hostname or IP string, or NULL */
    const char *service,        /* Port number string or service name */
    const struct addrinfo *hints, /* Input parameters */
    struct addrinfo **res         /* Output: linked list of results */
);

void freeaddrinfo(struct addrinfo *res);  /* Free results */
const char *gai_strerror(int errcode);    /* Error string */

/* Result structure */
struct addrinfo {
    int              ai_flags;     /* Flags (AI_PASSIVE, AI_ADDRCONFIG, etc.) */
    int              ai_family;    /* AF_INET, AF_INET6, or AF_UNSPEC */
    int              ai_socktype;  /* SOCK_STREAM, SOCK_DGRAM */
    int              ai_protocol;  /* IPPROTO_TCP, IPPROTO_UDP */
    socklen_t        ai_addrlen;   /* Length of ai_addr */
    struct sockaddr *ai_addr;      /* Socket address */
    char            *ai_canonname; /* Canonical hostname */
    struct addrinfo *ai_next;      /* Next result in linked list */
};
```

## Protocol-Independent Client

```c
#define _POSIX_C_SOURCE 200112L

#include <sys/socket.h>
#include <netdb.h>
#include <unistd.h>
#include <string.h>
#include <stdio.h>

int connect_to_host(const char *host, const char *port) {
    struct addrinfo hints, *result, *p;
    int sockfd = -1;
    int status;

    /* Set hints: we want any address family, TCP */
    memset(&hints, 0, sizeof(hints));
    hints.ai_family   = AF_UNSPEC;     /* Accept IPv4 or IPv6 */
    hints.ai_socktype = SOCK_STREAM;   /* TCP */
    hints.ai_flags    = AI_ADDRCONFIG; /* Only return families configured locally */

    /* Resolve hostname */
    status = getaddrinfo(host, port, &hints, &result);
    if (status != 0) {
        fprintf(stderr, "getaddrinfo error: %s\n", gai_strerror(status));
        return -1;
    }

    /* Try each result until one succeeds */
    for (p = result; p != NULL; p = p->ai_next) {
        /* Print which family we're trying */
        printf("Trying %s address...\n",
               p->ai_family == AF_INET6 ? "IPv6" : "IPv4");

        sockfd = socket(p->ai_family, p->ai_socktype, p->ai_protocol);
        if (sockfd < 0) continue;

        if (connect(sockfd, p->ai_addr, p->ai_addrlen) == 0) {
            printf("Connected successfully\n");
            break;  /* Connected! */
        }

        close(sockfd);
        sockfd = -1;
    }

    freeaddrinfo(result);  /* Always free the result */

    if (sockfd < 0) {
        fprintf(stderr, "Could not connect to %s:%s\n", host, port);
    }

    return sockfd;
}

int main(void) {
    /* This works for both IPv4 and IPv6 hosts transparently */
    int fd = connect_to_host("example.com", "80");
    if (fd >= 0) {
        const char request[] = "GET / HTTP/1.0\r\nHost: example.com\r\n\r\n";
        write(fd, request, sizeof(request) - 1);
        char buf[4096];
        ssize_t n = read(fd, buf, sizeof(buf)-1);
        if (n > 0) { buf[n] = 0; printf("%s", buf); }
        close(fd);
    }
    return 0;
}
```

## Protocol-Independent Server (Passive Mode)

```c
#define _POSIX_C_SOURCE 200112L

#include <sys/socket.h>
#include <netinet/in.h>
#include <netdb.h>
#include <unistd.h>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>

int create_server(const char *port) {
    struct addrinfo hints, *result, *p;
    int sockfd = -1;
    int status;

    memset(&hints, 0, sizeof(hints));
    hints.ai_family   = AF_UNSPEC;     /* IPv4 or IPv6 */
    hints.ai_socktype = SOCK_STREAM;
    hints.ai_flags    = AI_PASSIVE;    /* Wildcard bind address (:: or 0.0.0.0) */

    /* NULL for node = wildcard bind */
    status = getaddrinfo(NULL, port, &hints, &result);
    if (status != 0) {
        fprintf(stderr, "getaddrinfo: %s\n", gai_strerror(status));
        return -1;
    }

    for (p = result; p != NULL; p = p->ai_next) {
        sockfd = socket(p->ai_family, p->ai_socktype, p->ai_protocol);
        if (sockfd < 0) continue;

        int reuse = 1;
        setsockopt(sockfd, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse));

        /* For IPv6 sockets, clear IPV6_V6ONLY for dual-stack where supported */
        if (p->ai_family == AF_INET6) {
            int v6only = 0;  /* Also accept IPv4-mapped connections */
            setsockopt(sockfd, IPPROTO_IPV6, IPV6_V6ONLY,
                      &v6only, sizeof(v6only));
        }

        if (bind(sockfd, p->ai_addr, p->ai_addrlen) == 0) {
            break;  /* Bound successfully */
        }

        close(sockfd);
        sockfd = -1;
    }

    freeaddrinfo(result);

    if (sockfd >= 0) {
        if (listen(sockfd, 5) == 0) {
            printf("Server listening on port %s\n", port);
        } else {
            perror("listen");
            close(sockfd);
            sockfd = -1;
        }
    }

    return sockfd;
}
```

## Resolving and Printing All Addresses

```c
#define _POSIX_C_SOURCE 200112L

#include <sys/socket.h>
#include <netinet/in.h>
#include <netdb.h>
#include <arpa/inet.h>
#include <stdio.h>
#include <string.h>

void resolve_and_print(const char *host) {
    struct addrinfo hints, *result;
    char ip_str[INET6_ADDRSTRLEN];
    int status;

    memset(&hints, 0, sizeof(hints));
    hints.ai_family   = AF_UNSPEC;
    hints.ai_socktype = SOCK_STREAM;

    status = getaddrinfo(host, NULL, &hints, &result);
    if (status != 0) {
        fprintf(stderr, "getaddrinfo: %s\n", gai_strerror(status));
        return;
    }

    printf("Addresses for %s:\n", host);
    for (struct addrinfo *p = result; p != NULL; p = p->ai_next) {
        void *addr;
        const char *version;

        if (p->ai_family == AF_INET) {
            addr = &((struct sockaddr_in *)p->ai_addr)->sin_addr;
            version = "IPv4";
        } else if (p->ai_family == AF_INET6) {
            addr = &((struct sockaddr_in6 *)p->ai_addr)->sin6_addr;
            version = "IPv6";
        } else {
            continue;
        }

        inet_ntop(p->ai_family, addr, ip_str, sizeof(ip_str));
        printf("  %s: %s\n", version, ip_str);
    }

    freeaddrinfo(result);
}

int main(void) {
    resolve_and_print("google.com");
    resolve_and_print("ipv6.google.com");
    return 0;
}
```

## getaddrinfo Flags Reference

| Flag | Description |
|------|-------------|
| `AI_PASSIVE` | For server: bind to wildcard address |
| `AI_CANONNAME` | Fill in `ai_canonname` with canonical hostname |
| `AI_NUMERICHOST` | Input is an IP address string, no DNS lookup |
| `AI_NUMERICSERV` | Input port is a numeric string |
| `AI_ADDRCONFIG` | Only return addresses matching locally configured interfaces |
| `AI_V4MAPPED` | For AF_INET6: return IPv4-mapped addresses if no AAAA records |
| `AI_ALL` | With `AI_V4MAPPED` and `AF_INET6`, return IPv6 and IPv4-mapped addresses |

## Conclusion

`getaddrinfo()` is the correct modern API for protocol-independent network code. Use `AF_UNSPEC` to handle both IPv4 and IPv6 automatically, `AI_PASSIVE` with a `NULL` node for server bind addresses, and iterate through results until a connection succeeds. Always call `freeaddrinfo()` to avoid memory leaks. This approach eliminates the need for separate IPv4/IPv6 address-resolution code paths.
