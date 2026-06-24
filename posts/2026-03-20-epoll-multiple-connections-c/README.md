# How to Handle Multiple Connections with epoll on Linux in C

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: C, IPv4, Epoll, Linux, Non-Blocking, Networking

Description: Learn how to use the Linux epoll API to handle thousands of concurrent IPv4 TCP connections in a single-threaded C server with O(1) event notification.

## epoll API Overview

| Function | Purpose |
|----------|---------|
| `epoll_create1(0)` | Create epoll instance |
| `epoll_ctl(epfd, EPOLL_CTL_ADD, fd, &ev)` | Add fd to watch list |
| `epoll_ctl(epfd, EPOLL_CTL_MOD, fd, &ev)` | Modify interest flags |
| `epoll_ctl(epfd, EPOLL_CTL_DEL, fd, NULL)` | Remove fd |
| `epoll_wait(epfd, events, maxevents, timeout)` | Wait for events |

## epoll Echo Server

```c
#define _GNU_SOURCE

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>
#include <arpa/inet.h>
#include <sys/epoll.h>
#include <sys/socket.h>

#define PORT       9000
#define MAX_EVENTS 1024
#define BUFSIZE    4096

struct client_state {
    char   buf[BUFSIZE];
    size_t write_len;
    size_t write_off;
};

static void close_client(int epfd, int fd, struct client_state **clients) {
    epoll_ctl(epfd, EPOLL_CTL_DEL, fd, NULL);
    close(fd);
    free(clients[fd]);
    clients[fd] = NULL;
}

static int update_interest(int epfd, int fd, uint32_t events) {
    struct epoll_event event;

    event.events  = events;
    event.data.fd = fd;
    return epoll_ctl(epfd, EPOLL_CTL_MOD, fd, &event);
}

static int flush_client(int epfd, int fd, struct client_state **clients) {
    struct client_state *client = clients[fd];

    while (client->write_off < client->write_len) {
        ssize_t sent = send(fd,
                            client->buf + client->write_off,
                            client->write_len - client->write_off,
                            MSG_NOSIGNAL);
        if (sent > 0) {
            client->write_off += (size_t)sent;
            continue;
        }

        if (sent < 0 && (errno == EAGAIN || errno == EWOULDBLOCK)) {
            return update_interest(epfd, fd, EPOLLIN | EPOLLOUT | EPOLLRDHUP);
        }

        return -1;
    }

    client->write_len = 0;
    client->write_off = 0;
    return update_interest(epfd, fd, EPOLLIN | EPOLLRDHUP);
}

int main(void) {
    int    server_fd, epfd;
    struct epoll_event event, events[MAX_EVENTS];
    struct sockaddr_in server_addr;
    int    opt = 1;
    long   max_fds = sysconf(_SC_OPEN_MAX);
    struct client_state **clients;

    if (max_fds < 0) {
        perror("sysconf");
        return 1;
    }

    clients = calloc((size_t)max_fds, sizeof(*clients));
    if (!clients) {
        perror("calloc");
        return 1;
    }

    /* Create non-blocking server socket */
    server_fd = socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK, 0);
    if (server_fd < 0) {
        perror("socket");
        free(clients);
        return 1;
    }

    if (setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt)) < 0) {
        perror("setsockopt");
        close(server_fd);
        free(clients);
        return 1;
    }

    memset(&server_addr, 0, sizeof(server_addr));
    server_addr.sin_family      = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;
    server_addr.sin_port        = htons(PORT);
    if (bind(server_fd, (struct sockaddr *)&server_addr, sizeof(server_addr)) < 0) {
        perror("bind");
        close(server_fd);
        free(clients);
        return 1;
    }

    if (listen(server_fd, SOMAXCONN) < 0) {
        perror("listen");
        close(server_fd);
        free(clients);
        return 1;
    }

    /* Create epoll instance */
    epfd = epoll_create1(0);
    if (epfd < 0) {
        perror("epoll_create1");
        close(server_fd);
        free(clients);
        return 1;
    }

    /* Register server socket for read events */
    event.events  = EPOLLIN;
    event.data.fd = server_fd;
    if (epoll_ctl(epfd, EPOLL_CTL_ADD, server_fd, &event) < 0) {
        perror("epoll_ctl");
        close(epfd);
        close(server_fd);
        free(clients);
        return 1;
    }

    printf("epoll server on 0.0.0.0:%d\n", PORT);

    while (1) {
        int n = epoll_wait(epfd, events, MAX_EVENTS, -1);
        if (n < 0) {
            if (errno == EINTR) continue;
            perror("epoll_wait");
            break;
        }

        for (int i = 0; i < n; i++) {
            int fd = events[i].data.fd;

            if (fd == server_fd) {
                /* Accept all pending connections */
                while (1) {
                    struct sockaddr_in caddr;
                    socklen_t          clen = sizeof(caddr);
                    int cfd = accept4(server_fd,
                                      (struct sockaddr *)&caddr, &clen,
                                      SOCK_NONBLOCK);
                    if (cfd < 0) {
                        if (errno == EAGAIN || errno == EWOULDBLOCK) break;
                        perror("accept4");
                        break;
                    }

                    if (cfd >= max_fds) {
                        close(cfd);
                        continue;
                    }

                    clients[cfd] = calloc(1, sizeof(*clients[cfd]));
                    if (!clients[cfd]) {
                        perror("calloc");
                        close(cfd);
                        continue;
                    }

                    char ip[INET_ADDRSTRLEN];
                    if (!inet_ntop(AF_INET, &caddr.sin_addr, ip, sizeof(ip))) {
                        strcpy(ip, "?");
                    }
                    printf("[+] %s:%d (fd=%d)\n", ip, ntohs(caddr.sin_port), cfd);

                    event.events  = EPOLLIN | EPOLLRDHUP;  /* level-triggered */
                    event.data.fd = cfd;
                    if (epoll_ctl(epfd, EPOLL_CTL_ADD, cfd, &event) < 0) {
                        perror("epoll_ctl");
                        free(clients[cfd]);
                        clients[cfd] = NULL;
                        close(cfd);
                    }
                }
            } else if (events[i].events & EPOLLERR) {
                printf("[-] fd=%d hung up\n", fd);
                close_client(epfd, fd, clients);
            } else {
                struct client_state *client = clients[fd];

                if ((events[i].events & (EPOLLIN | EPOLLRDHUP | EPOLLHUP)) &&
                    client->write_len == 0) {
                    ssize_t len = recv(fd, client->buf, sizeof(client->buf), 0);
                    if (len > 0) {
                        client->write_len = (size_t)len;
                        client->write_off = 0;
                    } else if (len == 0) {
                        close_client(epfd, fd, clients);
                        continue;
                    } else if (errno != EAGAIN && errno != EWOULDBLOCK) {
                        close_client(epfd, fd, clients);
                        continue;
                    }
                }

                if ((events[i].events & EPOLLOUT) || client->write_len > 0) {
                    if (flush_client(epfd, fd, clients) < 0) {
                        close_client(epfd, fd, clients);
                    }
                }
            }
        }
    }

    close(epfd);
    close(server_fd);
    free(clients);
    return 0;
}
```

## Compile

```bash
gcc -Wall -Wextra -o epoll_server epoll_server.c
./epoll_server
```

## Edge vs Level Triggered

```c
/* Level-triggered (default): fires as long as data is available */
event.events = EPOLLIN;

/* Edge-triggered: fires when readiness changes */
event.events = EPOLLIN | EPOLLET;
/* With ET, use non-blocking fds and continue read/write until EAGAIN */
```

## Conclusion

`epoll` on Linux scales well because `epoll_wait()` returns file descriptors from a ready list instead of rescanning every monitored descriptor on each wait. Use non-blocking sockets with `epoll`, and handle short reads and writes correctly. Edge-triggered mode (`EPOLLET`) can reduce repeated readiness notifications, but it requires more care: continue reading or writing until the call returns `EAGAIN`. Use `accept4()` with `SOCK_NONBLOCK` to create non-blocking accepted sockets atomically.
