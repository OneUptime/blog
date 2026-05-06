# How to Build a Port Scanner Using IPv4 Sockets in C

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: C, Socket, IPv4, Port Scanner, Networking, Security

Description: Build a concurrent TCP port scanner in C using POSIX sockets and threads to probe open ports on an IPv4 target within a specified range.

## Introduction

A port scanner probes TCP ports on a remote host to determine which services are listening. Building one in C with POSIX sockets gives you direct control over connection attempts, timeouts, and parallelism.

## Sequential Port Scanner

```c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <fcntl.h>
#include <errno.h>
#include <sys/select.h>
#include <sys/time.h>

int scan_port(const char *ip, int port, int timeout_ms) {
    int fd = socket(AF_INET, SOCK_STREAM, 0);
    if (fd < 0) return -1;

    int flags = fcntl(fd, F_GETFL, 0);
    if (flags < 0 || fcntl(fd, F_SETFL, flags | O_NONBLOCK) < 0) {
        close(fd);
        return -1;
    }

    struct sockaddr_in addr = {
        .sin_family = AF_INET,
        .sin_port = htons(port)
    };
    if (inet_pton(AF_INET, ip, &addr.sin_addr) != 1) {
        close(fd);
        return -1;
    }

    int rc = connect(fd, (struct sockaddr *)&addr, sizeof(addr));
    if (rc == 0) {
        close(fd);
        return 1;
    }
    if (errno != EINPROGRESS) {
        close(fd);
        return 0;
    }

    fd_set wfds;
    FD_ZERO(&wfds);
    FD_SET(fd, &wfds);

    struct timeval tv = { timeout_ms / 1000, (timeout_ms % 1000) * 1000 };
    rc = select(fd + 1, NULL, &wfds, NULL, &tv);
    if (rc <= 0) {
        close(fd);
        return 0;
    }

    int so_error = 0;
    socklen_t len = sizeof(so_error);
    if (getsockopt(fd, SOL_SOCKET, SO_ERROR, &so_error, &len) < 0) {
        close(fd);
        return -1;
    }

    close(fd);
    return so_error == 0 ? 1 : 0;
}

int main(int argc, char *argv[]) {
    if (argc != 4) {
        fprintf(stderr, "Usage: %s <ip> <start_port> <end_port>\n", argv[0]);
        return 1;
    }

    const char *ip = argv[1];
    int start = atoi(argv[2]);
    int end   = atoi(argv[3]);

    if (start < 1 || end > 65535 || start > end) {
        fprintf(stderr, "Port range must be 1-65535 and start <= end\n");
        return 1;
    }

    struct in_addr target;
    if (inet_pton(AF_INET, ip, &target) != 1) {
        fprintf(stderr, "Invalid IPv4 address: %s\n", ip);
        return 1;
    }

    printf("Scanning %s ports %d-%d\n", ip, start, end);
    for (int port = start; port <= end; port++) {
        if (scan_port(ip, port, 500) == 1)
            printf("  Port %d: OPEN\n", port);
    }
    return 0;
}
```

## Compile and Run

```bash
gcc -o portscan portscan.c
./portscan 192.168.1.1 1 1024
```

## Threaded Scanner for Speed

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <fcntl.h>
#include <errno.h>
#include <sys/select.h>
#include <sys/time.h>
#include <pthread.h>

int scan_port(const char *ip, int port, int timeout_ms) {
    int fd = socket(AF_INET, SOCK_STREAM, 0);
    if (fd < 0) return -1;

    int flags = fcntl(fd, F_GETFL, 0);
    if (flags < 0 || fcntl(fd, F_SETFL, flags | O_NONBLOCK) < 0) {
        close(fd);
        return -1;
    }

    struct sockaddr_in addr = {
        .sin_family = AF_INET,
        .sin_port = htons(port)
    };
    if (inet_pton(AF_INET, ip, &addr.sin_addr) != 1) {
        close(fd);
        return -1;
    }

    int rc = connect(fd, (struct sockaddr *)&addr, sizeof(addr));
    if (rc == 0) {
        close(fd);
        return 1;
    }
    if (errno != EINPROGRESS) {
        close(fd);
        return 0;
    }

    fd_set wfds;
    FD_ZERO(&wfds);
    FD_SET(fd, &wfds);

    struct timeval tv = { timeout_ms / 1000, (timeout_ms % 1000) * 1000 };
    rc = select(fd + 1, NULL, &wfds, NULL, &tv);
    if (rc <= 0) {
        close(fd);
        return 0;
    }

    int so_error = 0;
    socklen_t len = sizeof(so_error);
    if (getsockopt(fd, SOL_SOCKET, SO_ERROR, &so_error, &len) < 0) {
        close(fd);
        return -1;
    }

    close(fd);
    return so_error == 0 ? 1 : 0;
}

typedef struct { const char *ip; int port; } ScanArg;

void *thread_scan(void *arg) {
    ScanArg *a = arg;
    if (scan_port(a->ip, a->port, 300) == 1)
        printf("Port %d: OPEN\n", a->port);
    free(a);
    return NULL;
}

/* Launch one thread per port - limit to batches of 100 */
void threaded_scan(const char *ip, int start, int end) {
    pthread_t threads[100];
    int batch = 0;

    for (int p = start; p <= end; p++) {
        ScanArg *a = malloc(sizeof(*a));
        if (!a) {
            perror("malloc");
            break;
        }

        a->ip = ip;
        a->port = p;

        int rc = pthread_create(&threads[batch], NULL, thread_scan, a);
        if (rc != 0) {
            fprintf(stderr, "pthread_create: %s\n", strerror(rc));
            free(a);
            continue;
        }

        batch++;
        if (batch == 100) {
            for (int i = 0; i < 100; i++) pthread_join(threads[i], NULL);
            batch = 0;
        }
    }
    for (int i = 0; i < batch; i++) pthread_join(threads[i], NULL);
}

int main(int argc, char *argv[]) {
    if (argc != 4) {
        fprintf(stderr, "Usage: %s <ip> <start_port> <end_port>\n", argv[0]);
        return 1;
    }

    const char *ip = argv[1];
    int start = atoi(argv[2]);
    int end   = atoi(argv[3]);

    if (start < 1 || end > 65535 || start > end) {
        fprintf(stderr, "Port range must be 1-65535 and start <= end\n");
        return 1;
    }

    struct in_addr target;
    if (inet_pton(AF_INET, ip, &target) != 1) {
        fprintf(stderr, "Invalid IPv4 address: %s\n", ip);
        return 1;
    }

    printf("Scanning %s ports %d-%d\n", ip, start, end);
    threaded_scan(ip, start, end);
    return 0;
}
```

```bash
gcc -pthread -o portscan_threaded portscan_threaded.c
./portscan_threaded 192.168.1.1 1 1024
```

## Conclusion

Building a port scanner in C teaches non-blocking sockets, `select()` plus `getsockopt(SO_ERROR)` for timeout-based connection probing, and thread-based concurrency. Always obtain proper authorization before scanning any network.
