# How to Use getsockopt() and setsockopt() for IPv4 Socket Configuration in C

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: C, IPv4, Socket, Getsockopt, Setsockopt, POSIX, Networking

Description: Learn how to configure and inspect IPv4 socket options in C using setsockopt() and getsockopt(), with a comprehensive reference for SOL_SOCKET and IPPROTO_TCP options.

## Function Signatures

```c
#include <sys/socket.h>

/* Set an option on a socket */
int setsockopt(int sockfd,
               int level,       /* SOL_SOCKET, IPPROTO_TCP, IPPROTO_IP */
               int optname,     /* SO_REUSEADDR, TCP_NODELAY, IP_TTL … */
               const void *optval,
               socklen_t optlen);

/* Get the current value of a socket option */
int getsockopt(int sockfd,
               int level,
               int optname,
               void *optval,
               socklen_t *optlen);  /* in/out: pass sizeof(val), receives actual size */
```

Both return `0` on success and `-1` on error with `errno` set.

## Option Levels

| Level constant | Header | Covers |
|---------------|--------|--------|
| `SOL_SOCKET` | `<sys/socket.h>` | Generic socket options |
| `IPPROTO_TCP` | `<netinet/in.h>` | TCP-specific options |
| `IPPROTO_IP` | `<netinet/in.h>` | IPv4-specific options |

## SOL_SOCKET Options

```c
#include <sys/socket.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <sys/time.h>

void configure_socket(int fd) {
    int opt;
    socklen_t len;

    /* SO_REUSEADDR - allow binding to a port in TIME_WAIT state */
    opt = 1;
    setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    /* SO_REUSEPORT - allow multiple sockets on the same port (Linux 3.9+) */
    setsockopt(fd, SOL_SOCKET, SO_REUSEPORT, &opt, sizeof(opt));

    /* SO_KEEPALIVE - enable TCP keepalive probes */
    setsockopt(fd, SOL_SOCKET, SO_KEEPALIVE, &opt, sizeof(opt));

    /* SO_LINGER - control close() behavior (wait for data to flush) */
    struct linger sl = { .l_onoff = 1, .l_linger = 5 };
    setsockopt(fd, SOL_SOCKET, SO_LINGER, &sl, sizeof(sl));

    /* SO_SNDBUF - send buffer size (kernel may double the value) */
    opt = 256 * 1024;
    setsockopt(fd, SOL_SOCKET, SO_SNDBUF, &opt, sizeof(opt));

    /* SO_RCVBUF - receive buffer size */
    opt = 256 * 1024;
    setsockopt(fd, SOL_SOCKET, SO_RCVBUF, &opt, sizeof(opt));

    /* SO_RCVTIMEO - read timeout */
    struct timeval tv = { .tv_sec = 5, .tv_usec = 0 };
    setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));

    /* SO_SNDTIMEO - write timeout */
    setsockopt(fd, SOL_SOCKET, SO_SNDTIMEO, &tv, sizeof(tv));

    /* SO_ERROR - read and clear pending async error (read-only) */
    len = sizeof(opt);
    getsockopt(fd, SOL_SOCKET, SO_ERROR, &opt, &len);

    /* SO_TYPE - retrieve socket type (SOCK_STREAM, SOCK_DGRAM, …) */
    len = sizeof(opt);
    getsockopt(fd, SOL_SOCKET, SO_TYPE, &opt, &len);
}
```

## IPPROTO_TCP Options

```c
#include <netinet/in.h>
#include <netinet/tcp.h>

void configure_tcp(int fd) {
    int opt;

    /* TCP_NODELAY - disable Nagle's algorithm for low-latency sends */
    opt = 1;
    setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, &opt, sizeof(opt));

#ifdef __linux__
    /* TCP_CORK - Linux-only; hold partial frames until uncorked */
    opt = 1;
    setsockopt(fd, IPPROTO_TCP, TCP_CORK, &opt, sizeof(opt));
#endif

    /* TCP_MAXSEG - maximum segment size; set before connect/listen to affect advertised MSS */
    opt = 1460;
    setsockopt(fd, IPPROTO_TCP, TCP_MAXSEG, &opt, sizeof(opt));

#ifdef __linux__
    /* Linux keepalive tuning (takes effect when SO_KEEPALIVE is enabled) */
    opt = 60;
    setsockopt(fd, IPPROTO_TCP, TCP_KEEPIDLE,  &opt, sizeof(opt));  /* idle secs */
    opt = 10;
    setsockopt(fd, IPPROTO_TCP, TCP_KEEPINTVL, &opt, sizeof(opt));  /* probe interval */
    opt = 6;
    setsockopt(fd, IPPROTO_TCP, TCP_KEEPCNT,   &opt, sizeof(opt));  /* probe count */
#endif
}
```

## IPPROTO_IP Options

```c
#include <netinet/in.h>

void configure_ip(int fd) {
    int opt;

    /* IP_TTL - time-to-live for outgoing packets */
    opt = 64;
    setsockopt(fd, IPPROTO_IP, IP_TTL, &opt, sizeof(opt));

    /* IP_TOS - type-of-service / DS field byte (affects QoS) */
    opt = 0x10;  /* IPTOS_LOWDELAY */
    setsockopt(fd, IPPROTO_IP, IP_TOS, &opt, sizeof(opt));

#ifdef __linux__
    /* IP_MTU_DISCOVER - path MTU discovery (Linux) */
    opt = IP_PMTUDISC_DO;
    setsockopt(fd, IPPROTO_IP, IP_MTU_DISCOVER, &opt, sizeof(opt));
#endif
}
```

## Reading Back Option Values

```c
/* After setsockopt(SO_SNDBUF), Linux returns a doubled size.
   Always read back with getsockopt to learn the actual value. */
int sndbuf = 128 * 1024;
setsockopt(fd, SOL_SOCKET, SO_SNDBUF, &sndbuf, sizeof(sndbuf));

socklen_t len = sizeof(sndbuf);
getsockopt(fd, SOL_SOCKET, SO_SNDBUF, &sndbuf, &len);
printf("Actual SO_SNDBUF: %d bytes\n", sndbuf);
```

## Conclusion

`setsockopt` and `getsockopt` use a three-part key (socket fd, level, option name) and a value pointer. The `level` parameter routes the option to the correct protocol layer: `SOL_SOCKET` for generic options, `IPPROTO_TCP` for TCP-specific tuning, and `IPPROTO_IP` for IP-layer control. Always read buffer sizes back with `getsockopt` after setting them - on Linux, `SO_SNDBUF` and `SO_RCVBUF` are doubled internally for bookkeeping, and `getsockopt` returns the doubled value. Use `SO_ERROR` via `getsockopt` to retrieve the result of an asynchronous operation (non-blocking connect). Check the man page for the exact `optval` type - some options take `int`, others take `struct timeval` or `struct linger`.
