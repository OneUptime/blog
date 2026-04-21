# How to Handle TCP Connection Timeouts in C Socket Code

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: C, IPv4, TCP, Timeout, Socket, POSIX, Networking

Description: Learn how to set connection, send, and receive timeouts on IPv4 TCP sockets in C using SO_RCVTIMEO, SO_SNDTIMEO, and non-blocking connect with select().

## Receive and Send Timeouts with SO_RCVTIMEO / SO_SNDTIMEO

```c
#include <sys/socket.h>
#include <sys/time.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <stdio.h>
#include <errno.h>

/* Apply a read/write timeout to a socket */
void set_socket_timeout(int fd, int seconds) {
    struct timeval tv;
    tv.tv_sec  = seconds;
    tv.tv_usec = 0;
    setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));
    setsockopt(fd, SOL_SOCKET, SO_SNDTIMEO, &tv, sizeof(tv));
}

int main(void) {
    int fd = socket(AF_INET, SOCK_STREAM, 0);

    struct sockaddr_in addr = {0};
    addr.sin_family = AF_INET;
    addr.sin_port   = htons(9000);
    inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr);

    connect(fd, (struct sockaddr *)&addr, sizeof(addr));

    /* After connect, apply 5-second timeout to all recv/send calls */
    set_socket_timeout(fd, 5);

    char buf[256];
    ssize_t n = recv(fd, buf, sizeof(buf), 0);
    if (n < 0) {
        if (errno == EAGAIN || errno == EWOULDBLOCK) {
            printf("recv timed out after 5 seconds\n");
        } else {
            perror("recv");
        }
    }

    close(fd);
    return 0;
}
```

## Non-Blocking connect() with select() Timeout

The `connect()` system call blocks by default until the TCP handshake completes or the OS times out (up to 2+ minutes). Use a non-blocking socket and `select()` to impose a shorter connection deadline.

```c
#include <sys/socket.h>
#include <sys/select.h>
#include <sys/time.h>
#include <fcntl.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <errno.h>
#include <stdint.h>
#include <stdio.h>

/* Connect with a custom timeout in seconds.
   Returns fd on success, -1 on failure or timeout. */
int connect_with_timeout(const char *ip, uint16_t port, int timeout_sec) {
    int fd = socket(AF_INET, SOCK_STREAM, 0);
    if (fd < 0) return -1;

    /* Put socket in non-blocking mode */
    int flags = fcntl(fd, F_GETFL, 0);
    fcntl(fd, F_SETFL, flags | O_NONBLOCK);

    struct sockaddr_in addr = {0};
    addr.sin_family = AF_INET;
    addr.sin_port   = htons(port);
    inet_pton(AF_INET, ip, &addr.sin_addr);

    int ret = connect(fd, (struct sockaddr *)&addr, sizeof(addr));
    if (ret == 0) {
        /* Immediate success (unlikely but possible for loopback) */
        goto restore_blocking;
    }
    if (errno != EINPROGRESS) {
        perror("connect");
        close(fd);
        return -1;
    }

    /* Wait for the socket to become writable (= connect completed) */
    fd_set wfds;
    FD_ZERO(&wfds);
    FD_SET(fd, &wfds);
    struct timeval tv = { .tv_sec = timeout_sec, .tv_usec = 0 };

    ret = select(fd + 1, NULL, &wfds, NULL, &tv);
    if (ret <= 0) {
        /* ret == 0 → timeout, ret < 0 → error */
        printf(ret == 0 ? "connect timed out\n" : "select error\n");
        close(fd);
        return -1;
    }

    /* Check if connect actually succeeded */
    int err = 0;
    socklen_t len = sizeof(err);
    if (getsockopt(fd, SOL_SOCKET, SO_ERROR, &err, &len) < 0) {
        perror("getsockopt(SO_ERROR)");
        close(fd);
        return -1;
    }
    if (err != 0) {
        errno = err;
        perror("connect (async)");
        close(fd);
        return -1;
    }

restore_blocking:
    /* Restore blocking mode for normal send/recv */
    fcntl(fd, F_SETFL, flags);
    return fd;
}

int main(void) {
    int fd = connect_with_timeout("93.184.216.34", 80, 3);
    if (fd < 0) {
        printf("Failed to connect\n");
        return 1;
    }
    printf("Connected (fd=%d)\n", fd);
    close(fd);
    return 0;
}
```

## Timeout Summary

| Approach | What it controls | API |
|----------|-----------------|-----|
| `SO_RCVTIMEO` | `recv()` / `recvfrom()` deadline | `setsockopt` with `struct timeval` |
| `SO_SNDTIMEO` | `send()` / `sendto()` deadline | `setsockopt` with `struct timeval` |
| Non-blocking + `select()` | `connect()` deadline | `fcntl(O_NONBLOCK)` + `select()` |
| `alarm()` / `SIGALRM` | Blocking calls that are interruptible by signals | Signal-based (`EINTR` / `SA_RESTART` caveats) |

## Checking Timeout Errors

```c
/* After recv/send returns -1, check errno */
if (errno == EAGAIN || errno == EWOULDBLOCK) {
    /* Timed out - no data received within the deadline */
}

/* After non-blocking connect select() check SO_ERROR */
int so_err;
socklen_t slen = sizeof(so_err);
if (getsockopt(fd, SOL_SOCKET, SO_ERROR, &so_err, &slen) == 0) {
    /* so_err == 0 means success; otherwise it holds the connect errno */
}
```

## Conclusion

Set `SO_RCVTIMEO` and `SO_SNDTIMEO` with a `struct timeval` to bound `recv()` and `send()` calls - if no data is transferred before the timeout, they return `-1` with `errno` set to `EAGAIN`/`EWOULDBLOCK`; if some data is transferred first, the call returns the byte count. For `connect()`, put the socket into non-blocking mode with `fcntl(O_NONBLOCK)`, call `connect()` which returns `EINPROGRESS`, then wait in `select()` on the writable set with a `struct timeval` deadline. After `select()` returns, verify success by reading `SO_ERROR` with `getsockopt`. Always restore blocking mode after a successful non-blocking connect if the rest of the code expects blocking semantics.
