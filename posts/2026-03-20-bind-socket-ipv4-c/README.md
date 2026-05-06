# How to Bind a Socket to a Specific IPv4 Address and Port in C

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: C, IPv4, Socket, BIND, POSIX, Networking

Description: Learn how to bind a TCP or UDP socket to a specific IPv4 address and port in C, covering INADDR_ANY, specific interfaces, SO_REUSEADDR, SO_REUSEPORT, and port 0 for ephemeral binding.

## Basic bind() Call

```c
#include <arpa/inet.h>
#include <netinet/in.h>
#include <stdint.h>
#include <sys/socket.h>
#include <string.h>
#include <stdio.h>
#include <unistd.h>

int bind_socket(const char *ip, uint16_t port) {
    int fd = socket(AF_INET, SOCK_STREAM, 0);
    if (fd < 0) { perror("socket"); return -1; }

    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_port   = htons(port);

    if (ip == NULL || strcmp(ip, "0.0.0.0") == 0) {
        addr.sin_addr.s_addr = INADDR_ANY;        /* all interfaces */
    } else {
        if (inet_pton(AF_INET, ip, &addr.sin_addr) != 1) {
            fprintf(stderr, "Invalid IP: %s\n", ip);
            close(fd);
            return -1;
        }
    }

    if (bind(fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        perror("bind");
        close(fd);
        return -1;
    }

    printf("Bound to %s:%d\n", ip ? ip : "0.0.0.0", port);
    return fd;
}

int main(void) {
    /* Bind to all interfaces */
    int fd1 = bind_socket("0.0.0.0", 9000);

    /* Bind to localhost only */
    int fd2 = bind_socket("127.0.0.1", 9001);

    /* Bind to a specific local IPv4 address (must exist on this host) */
    int fd3 = bind_socket("192.168.1.10", 9002);

    close(fd1); close(fd2); close(fd3);
    return 0;
}
```

## SO_REUSEADDR - Allow Port Reuse After Restart

```c
int opt = 1;
/* Must call before bind().
   On Linux, this can allow rebinding a recently used local address,
   but it does not let you bind over an active listener. */
if (setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt)) < 0) {
    perror("setsockopt SO_REUSEADDR");
}
/* Now attempt bind() */
bind(fd, (struct sockaddr *)&addr, sizeof(addr));
```

## SO_REUSEPORT - Multiple Sockets on Same Port

```c
/* Linux 3.9+: if each socket sets SO_REUSEPORT before bind(),
   multiple sockets with the same effective UID can bind the same
   address/port. The kernel load-balances incoming connections or
   datagrams across them. */
int opt = 1;
setsockopt(fd, SOL_SOCKET, SO_REUSEPORT, &opt, sizeof(opt));
bind(fd, (struct sockaddr *)&addr, sizeof(addr));
```

## Ephemeral Port (port 0)

```c
/* Bind to port 0 - kernel assigns an available port */
struct sockaddr_in addr;
memset(&addr, 0, sizeof(addr));
addr.sin_family      = AF_INET;
addr.sin_addr.s_addr = INADDR_ANY;
addr.sin_port        = htons(0);   /* 0 = let kernel choose */

bind(fd, (struct sockaddr *)&addr, sizeof(addr));

/* Find out which port was assigned */
socklen_t len = sizeof(addr);
getsockname(fd, (struct sockaddr *)&addr, &len);
printf("Assigned port: %d\n", ntohs(addr.sin_port));
```

## UDP Bind

```c
/* UDP bind is identical - just change SOCK_STREAM to SOCK_DGRAM */
int udp_fd = socket(AF_INET, SOCK_DGRAM, 0);
int opt    = 1;
setsockopt(udp_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

struct sockaddr_in addr;
memset(&addr, 0, sizeof(addr));
addr.sin_family      = AF_INET;
addr.sin_addr.s_addr = INADDR_ANY;
addr.sin_port        = htons(5007);

bind(udp_fd, (struct sockaddr *)&addr, sizeof(addr));
```

## Conclusion

`bind()` takes a `sockaddr_in` with the address family, port in network byte order (`htons()`), and either `INADDR_ANY` for all interfaces or a specific IPv4 address converted with `inet_pton()`. If you want quicker restarts, set `SO_REUSEADDR` before `bind()`; on Linux this can allow rebinding a recently used local address, but it does not override an active listener. Use port 0 for client sockets that do not need a fixed source port or for test servers that need dynamic port assignment. Call `getsockname()` after binding to port 0 to find the assigned port.
