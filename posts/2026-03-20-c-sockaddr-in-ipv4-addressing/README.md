# How to Use the struct sockaddr_in for IPv4 Addressing in C

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: C, Socket, IPv4, Sockaddr_in, Networking, Systems Programming

Description: Learn how to correctly populate and use struct sockaddr_in for IPv4 addressing in C, covering all fields, byte order conversion, and common patterns for bind, connect, and accept.

## Introduction

`struct sockaddr_in` is the fundamental data structure for IPv4 socket addressing in C. Understanding its fields, correct byte-order conversions, and how to pass it to socket system calls prevents subtle networking bugs.

## Structure Definition

```c
#include <netinet/in.h>

struct sockaddr_in {
    sa_family_t    sin_family;   /* AF_INET */
    in_port_t      sin_port;     /* port in network byte order */
    struct in_addr sin_addr;     /* IPv4 address */
    unsigned char  sin_zero[8];  /* padding on many systems; zero the whole struct */
};

struct in_addr {
    uint32_t s_addr; /* address in network byte order */
};
```

## Populating sockaddr_in

```c
#include <stdio.h>
#include <string.h>
#include <arpa/inet.h>
#include <netinet/in.h>

void demo_sockaddr_in(void) {
    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));          /* zero all fields */

    addr.sin_family = AF_INET;               /* IPv4 */
    addr.sin_port   = htons(8080);           /* host-to-network short */

    /* Option 1: hard-coded address */
    inet_pton(AF_INET, "192.168.1.100", &addr.sin_addr);

    /* Option 2: any local address */
    addr.sin_addr.s_addr = htonl(INADDR_ANY); /* 0.0.0.0 */

    /* Option 3: loopback */
    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK); /* 127.0.0.1 */

    /* Convert back to string */
    char ip_str[INET_ADDRSTRLEN];
    inet_ntop(AF_INET, &addr.sin_addr, ip_str, INET_ADDRSTRLEN);
    printf("Address: %s, Port: %d\n", ip_str, ntohs(addr.sin_port));
}
```

## Using with bind()

```c
int server_socket_ipv4(int port) {
    int fd = socket(AF_INET, SOCK_STREAM, 0);
    if (fd < 0) {
        perror("socket");
        return -1;
    }

    int opt = 1;
    if (setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt)) < 0) {
        perror("setsockopt");
        close(fd);
        return -1;
    }

    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family      = AF_INET;
    addr.sin_port        = htons(port);
    addr.sin_addr.s_addr = htonl(INADDR_ANY);

    if (bind(fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        perror("bind");
        close(fd);
        return -1;
    }
    return fd;
}
```

## Using with connect()

```c
int connect_to(const char *ip, int port) {
    int fd = socket(AF_INET, SOCK_STREAM, 0);
    if (fd < 0) {
        perror("socket");
        return -1;
    }

    struct sockaddr_in server;
    memset(&server, 0, sizeof(server));
    server.sin_family = AF_INET;
    server.sin_port   = htons(port);
    if (inet_pton(AF_INET, ip, &server.sin_addr) != 1) {
        fprintf(stderr, "invalid IPv4 address\n");
        close(fd);
        return -1;
    }

    if (connect(fd, (struct sockaddr *)&server, sizeof(server)) < 0) {
        perror("connect");
        close(fd);
        return -1;
    }
    return fd;
}
```

## Extracting Peer Address from accept()

```c
struct sockaddr_in peer;
socklen_t peer_len = sizeof(peer);
int client_fd = accept(server_fd, (struct sockaddr *)&peer, &peer_len);

if (client_fd < 0) {
    perror("accept");
} else {
    char peer_ip[INET_ADDRSTRLEN];
    if (inet_ntop(AF_INET, &peer.sin_addr, peer_ip, INET_ADDRSTRLEN) == NULL) {
        perror("inet_ntop");
    } else {
        printf("Connected: %s:%d\n", peer_ip, ntohs(peer.sin_port));
    }
}
```

## Byte Order Conversion Reference

| Function | Direction | Use for |
|----------|-----------|---------|
| `htons()` | host → network | port (16-bit) |
| `ntohs()` | network → host | port (16-bit) |
| `htonl()` | host → network | address (32-bit) |
| `ntohl()` | network → host | address (32-bit) |
| `inet_pton()` | string → binary | IP address |
| `inet_ntop()` | binary → string | IP address |

## Conclusion

`struct sockaddr_in` is the entry point for all IPv4 socket operations. Always zero-initialize it with `memset`, use `htons` for ports, use `inet_pton` or `htonl` with `INADDR_*` constants for addresses, and cast to `struct sockaddr *` when calling socket API functions.
