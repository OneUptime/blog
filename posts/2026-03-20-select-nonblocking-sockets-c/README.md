# How to Use the select() Function for Non-Blocking IPv4 Sockets in C

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: C, IPv4, SELECT, Non-Blocking, POSIX, Networking

Description: Learn how to use the POSIX select() function to multiplex multiple IPv4 TCP connections in a single-threaded C server, avoiding blocking on any one socket.

## How select() Works

`select()` monitors a set of file descriptors for readability, writability, and exceptional conditions. Depending on the timeout, it blocks until at least one fd is ready, the timeout expires, or a signal interrupts the call. On success, it modifies the fd sets to show which fds are ready.

```c
int select(int nfds,
           fd_set *readfds,    /* watch for readable */
           fd_set *writefds,   /* watch for writable */
           fd_set *exceptfds,  /* watch for exceptions */
           struct timeval *timeout);
```

## Echo Server with select()

```c
#include <errno.h>
#include <fcntl.h>
#include <signal.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <sys/select.h>
#include <sys/socket.h>

#define PORT     9000
#define MAX_FDS  FD_SETSIZE   /* 1024 on Linux/glibc */
#define BUFSIZE  4096

struct client {
    int    fd;
    char   out[BUFSIZE];
    size_t out_len;
    size_t out_sent;
};

static int make_nonblocking(int fd) {
    int flags = fcntl(fd, F_GETFL, 0);
    if (flags == -1) return -1;
    return fcntl(fd, F_SETFL, flags | O_NONBLOCK);
}

static void close_client(struct client clients[], int i) {
    printf("[-] fd=%d closed\n", clients[i].fd);
    close(clients[i].fd);
    clients[i].fd = -1;
    clients[i].out_len = 0;
    clients[i].out_sent = 0;
}

int main(void) {
    int    server_fd;
    int    max_fd, i;
    fd_set read_set, write_set;
    char   buf[BUFSIZE];
    static struct client clients[MAX_FDS];

    if (signal(SIGPIPE, SIG_IGN) == SIG_ERR) {
        perror("signal");
        return 1;
    }

    /* Initialize client array */
    for (i = 0; i < MAX_FDS; i++) clients[i].fd = -1;

    /* Create and bind server socket */
    struct sockaddr_in addr;
    server_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd < 0) { perror("socket"); return 1; }
    if (server_fd >= FD_SETSIZE) {
        fprintf(stderr, "server fd exceeds FD_SETSIZE\n");
        close(server_fd);
        return 1;
    }
    if (make_nonblocking(server_fd) < 0) {
        perror("fcntl");
        close(server_fd);
        return 1;
    }

    int opt = 1;
    if (setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt)) < 0)
        perror("setsockopt");

    memset(&addr, 0, sizeof(addr));
    addr.sin_family      = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port        = htons(PORT);
    if (bind(server_fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        perror("bind");
        close(server_fd);
        return 1;
    }
    if (listen(server_fd, 10) < 0) {
        perror("listen");
        close(server_fd);
        return 1;
    }

    printf("select() echo server on 0.0.0.0:%d\n", PORT);

    while (1) {
        /* Re-build fd_set every iteration (select modifies it) */
        FD_ZERO(&read_set);
        FD_ZERO(&write_set);
        FD_SET(server_fd, &read_set);
        max_fd = server_fd;

        for (i = 0; i < MAX_FDS; i++) {
            int cfd = clients[i].fd;
            if (cfd != -1) {
                if (clients[i].out_len == 0)
                    FD_SET(cfd, &read_set);
                if (clients[i].out_sent < clients[i].out_len)
                    FD_SET(cfd, &write_set);
                if (cfd > max_fd)
                    max_fd = cfd;
            }
        }

        /* Block until any fd is readable or writable */
        int ready = select(max_fd + 1, &read_set, &write_set, NULL, NULL);
        if (ready < 0) {
            if (errno == EINTR) continue;
            perror("select");
            break;
        }

        /* New connection */
        if (FD_ISSET(server_fd, &read_set)) {
            while (1) {
                struct sockaddr_in caddr;
                socklen_t len = sizeof(caddr);
                int cfd = accept(server_fd, (struct sockaddr *)&caddr, &len);
                if (cfd < 0) {
                    if (errno == EAGAIN || errno == EWOULDBLOCK) break;
                    if (errno == EINTR) continue;
                    perror("accept");
                    break;
                }
                if (cfd >= FD_SETSIZE) {
                    fprintf(stderr, "fd=%d exceeds FD_SETSIZE; closing\n", cfd);
                    close(cfd);
                    continue;
                }
                if (make_nonblocking(cfd) < 0) {
                    perror("fcntl");
                    close(cfd);
                    continue;
                }

                char ip[INET_ADDRSTRLEN];
                inet_ntop(AF_INET, &caddr.sin_addr, ip, sizeof(ip));
                printf("[+] %s:%d (fd=%d)\n", ip, ntohs(caddr.sin_port), cfd);

                /* Find empty slot */
                int slot = -1;
                for (i = 0; i < MAX_FDS; i++) {
                    if (clients[i].fd == -1) { slot = i; break; }
                }
                if (slot == -1) {
                    fprintf(stderr, "too many clients; closing fd=%d\n", cfd);
                    close(cfd);
                    continue;
                }
                clients[slot].fd = cfd;
                clients[slot].out_len = 0;
                clients[slot].out_sent = 0;
            }
        }

        /* Data from clients */
        for (i = 0; i < MAX_FDS; i++) {
            int cfd = clients[i].fd;
            if (cfd == -1) continue;

            if (FD_ISSET(cfd, &read_set)) {
                ssize_t n = recv(cfd, buf, sizeof(buf), 0);
                if (n > 0) {
                    memcpy(clients[i].out, buf, (size_t)n);
                    clients[i].out_len = (size_t)n;
                    clients[i].out_sent = 0;
                } else if (n == 0) {
                    /* Client closed */
                    close_client(clients, i);
                    continue;
                } else if (errno != EAGAIN && errno != EWOULDBLOCK && errno != EINTR) {
                    perror("recv");
                    close_client(clients, i);
                    continue;
                }
            }

            cfd = clients[i].fd;
            if (cfd != -1 && clients[i].out_sent < clients[i].out_len &&
                FD_ISSET(cfd, &write_set)) {
                ssize_t n = send(cfd, clients[i].out + clients[i].out_sent,
                                 clients[i].out_len - clients[i].out_sent, 0);
                if (n > 0) {
                    clients[i].out_sent += (size_t)n;
                    if (clients[i].out_sent == clients[i].out_len) {
                        clients[i].out_len = 0;
                        clients[i].out_sent = 0;
                    }
                } else if (n < 0 &&
                           (errno == EAGAIN || errno == EWOULDBLOCK || errno == EINTR)) {
                    continue;
                } else {
                    if (n < 0) perror("send");
                    close_client(clients, i);
                }
            }
        }
    }

    close(server_fd);
    return 0;
}
```

## Compile and Test

```bash
gcc -Wall -o select_server select_server.c
./select_server

# Test with multiple clients

for i in 1 2 3; do
    echo "client $i" | nc -N 127.0.0.1 9000 &
done
```

## select() Limitations

| Limitation | Details |
|-----------|---------|
| fd limit | `fd_set` can only represent fd numbers below `FD_SETSIZE` (1024 on Linux/glibc) |
| O(n) scan | Must scan all fds every call |
| fd_set is modified | Must rebuild before each call |
| Linux alternative | `poll()` (avoids `FD_SETSIZE`) or `epoll()` (scales well for large fd sets) |

## Conclusion

`select()` is the portable way to multiplex multiple sockets in a single thread. Rebuild the `fd_set` before every call since `select()` modifies it in place. Track client fds in an array and scan for ready fds after `select()` returns. The hard limit of `FD_SETSIZE` (1024 on Linux/glibc) makes `select()` unsuitable for high-connection-count servers - use `poll()` to avoid the `fd_set` size limit or `epoll()` (Linux) for scalable event notification. `select()` is still valuable for simple tools, test code, and portable applications.
