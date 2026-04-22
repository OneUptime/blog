# How to Set Socket Options (SO_REUSEADDR, SO_KEEPALIVE) in C

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: C, IPv4, Socket Options, SO_REUSEADDR, SO_KEEPALIVE, POSIX

Description: Learn how to configure IPv4 socket options in C using setsockopt and getsockopt, covering SO_REUSEADDR, SO_KEEPALIVE, TCP_NODELAY, SO_SNDBUF, SO_RCVBUF, and timeout options.

## setsockopt / getsockopt Basics

```c
#include <sys/socket.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <stdio.h>

/* Set an integer socket option */
int set_opt(int fd, int level, int optname, int value) {
    return setsockopt(fd, level, optname, &value, sizeof(value));
}

/* Get an integer socket option */
int get_opt(int fd, int level, int optname) {
    int val;
    socklen_t len = sizeof(val);
    if (getsockopt(fd, level, optname, &val, &len) < 0) {
        perror("getsockopt");
        return -1;
    }
    return val;
}
```

## SO_REUSEADDR - Restart During TIME_WAIT

```c
int fd = socket(AF_INET, SOCK_STREAM, 0);
int opt = 1;
/* Must set BEFORE bind() */
if (setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt)) < 0) {
    perror("SO_REUSEADDR");
}
/* Allows fast restart when old connections are in TIME_WAIT */
```

## SO_KEEPALIVE - Detect Dead Connections

```c
int opt = 1;
setsockopt(fd, SOL_SOCKET, SO_KEEPALIVE, &opt, sizeof(opt));

/* Linux-specific keepalive tuning (values in seconds/count) */
#ifdef __linux__
int idle     = 60;   /* start probing after 60s of inactivity */
int interval = 10;   /* probe every 10s */
int count    = 6;    /* declare dead after 6 failed probes */
setsockopt(fd, IPPROTO_TCP, TCP_KEEPIDLE,   &idle,     sizeof(idle));
setsockopt(fd, IPPROTO_TCP, TCP_KEEPINTVL,  &interval, sizeof(interval));
setsockopt(fd, IPPROTO_TCP, TCP_KEEPCNT,    &count,    sizeof(count));
#endif
```

## TCP_NODELAY - Disable Nagle's Algorithm

```c
/* Reduce latency for small messages (e.g., interactive protocols) */
int opt = 1;
if (setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, &opt, sizeof(opt)) < 0) {
    perror("TCP_NODELAY");
}
```

## SO_SNDBUF / SO_RCVBUF - Buffer Sizes

```c
int sndbuf = 256 * 1024;   /* 256 KB send buffer */
int rcvbuf = 256 * 1024;   /* 256 KB receive buffer */

setsockopt(fd, SOL_SOCKET, SO_SNDBUF, &sndbuf, sizeof(sndbuf));
setsockopt(fd, SOL_SOCKET, SO_RCVBUF, &rcvbuf, sizeof(rcvbuf));

/* Read back actual value (Linux may report double the requested size) */
socklen_t len = sizeof(sndbuf);
getsockopt(fd, SOL_SOCKET, SO_SNDBUF, &sndbuf, &len);
printf("Actual send buffer: %d bytes\n", sndbuf);
```

## SO_RCVTIMEO / SO_SNDTIMEO - Timeouts

```c
#include <sys/time.h>

struct timeval tv;
tv.tv_sec  = 5;   /* 5 seconds */
tv.tv_usec = 0;

/* recv() returns -1 with EAGAIN/EWOULDBLOCK after 5 seconds with no data */
setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));
/* send() returns -1 with EAGAIN/EWOULDBLOCK if no data can be sent for 5 seconds */
setsockopt(fd, SOL_SOCKET, SO_SNDTIMEO, &tv, sizeof(tv));
```

## Print All Common Options

```c
void print_socket_info(int fd) {
    printf("SO_REUSEADDR: %d\n", get_opt(fd, SOL_SOCKET, SO_REUSEADDR));
    printf("SO_KEEPALIVE: %d\n", get_opt(fd, SOL_SOCKET, SO_KEEPALIVE));
    printf("SO_SNDBUF:    %d\n", get_opt(fd, SOL_SOCKET, SO_SNDBUF));
    printf("SO_RCVBUF:    %d\n", get_opt(fd, SOL_SOCKET, SO_RCVBUF));
    printf("TCP_NODELAY:  %d\n", get_opt(fd, IPPROTO_TCP, TCP_NODELAY));
}
```

## Conclusion

`setsockopt` takes a level (`SOL_SOCKET` for socket-level options, `IPPROTO_TCP` for TCP-specific options) and a value pointer. Always set `SO_REUSEADDR` before `bind()` for server sockets to allow fast restart when old connections are in `TIME_WAIT`. Enable `SO_KEEPALIVE` on long-lived connections to detect half-open TCP sessions caused by network failures. Set `TCP_NODELAY` for low-latency interactive protocols where Nagle's algorithm would add unwanted latency. Use `SO_RCVTIMEO` and `SO_SNDTIMEO` to impose per-call read/write timeouts without `select`/`poll`.
