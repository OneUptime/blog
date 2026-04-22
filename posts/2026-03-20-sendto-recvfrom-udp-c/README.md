# How to Use sendto() and recvfrom() for UDP Socket Communication in C

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: C, IPv4, UDP, Sendto, Recvfrom, POSIX, Networking

Description: Learn how to send and receive UDP datagrams in C using sendto() and recvfrom(), covering server binding, client addressing, message size limits, and connected UDP sockets.

## UDP vs TCP Socket Calls

| Operation | TCP | UDP |
|-----------|-----|-----|
| Send data | `send()` | `sendto()` - includes destination address |
| Receive data | `recv()` | `recvfrom()` - fills in sender address |
| Connection | Required (`connect`) | Optional |
| Message boundaries | None (stream) | Preserved (datagram) |

## UDP Echo Server

```c
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <sys/socket.h>

#define PORT    9000
#define BUFSIZE 65507   /* max IPv4 UDP payload (65535 - 20 IP - 8 UDP headers) */

int main(void) {
    /* Create UDP socket */
    int fd = socket(AF_INET, SOCK_DGRAM, 0);

    /* Bind to all interfaces on PORT */
    struct sockaddr_in addr = {0};
    addr.sin_family      = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port        = htons(PORT);
    bind(fd, (struct sockaddr *)&addr, sizeof(addr));

    printf("UDP echo server on 0.0.0.0:%d\n", PORT);

    char buf[BUFSIZE];
    while (1) {
        struct sockaddr_in client;
        socklen_t          clen = sizeof(client);

        /* recvfrom() blocks until a datagram arrives;
           fills 'client' with the sender's IP and port */
        ssize_t n = recvfrom(fd, buf, sizeof(buf), 0,
                             (struct sockaddr *)&client, &clen);
        if (n < 0) { perror("recvfrom"); break; }

        char ip[INET_ADDRSTRLEN];
        inet_ntop(AF_INET, &client.sin_addr, ip, sizeof(ip));
        printf("[+] %zd bytes from %s:%d\n", n, ip, ntohs(client.sin_port));

        /* Echo the datagram back to the sender */
        sendto(fd, buf, (size_t)n, 0,
               (struct sockaddr *)&client, clen);
    }

    close(fd);
    return 0;
}
```

## UDP Client

```c
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <sys/time.h>

int main(void) {
    int fd = socket(AF_INET, SOCK_DGRAM, 0);

    /* Set a 3-second receive timeout */
    struct timeval tv = { .tv_sec = 3, .tv_usec = 0 };
    setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));

    struct sockaddr_in server = {0};
    server.sin_family = AF_INET;
    server.sin_port   = htons(9000);
    inet_pton(AF_INET, "127.0.0.1", &server.sin_addr);

    const char *msg = "Hello, UDP!";
    /* sendto() sends msg to the specified destination address */
    sendto(fd, msg, strlen(msg), 0,
           (struct sockaddr *)&server, sizeof(server));

    char buf[1024];
    struct sockaddr_in reply_from;
    socklen_t          rlen = sizeof(reply_from);
    ssize_t n = recvfrom(fd, buf, sizeof(buf) - 1, 0,
                         (struct sockaddr *)&reply_from, &rlen);
    if (n > 0) {
        buf[n] = '\0';
        printf("Reply: %s\n", buf);
    } else {
        perror("recvfrom (timeout?)");
    }

    close(fd);
    return 0;
}
```

## Connected UDP Socket

```c
/* Calling connect() on a UDP socket sets a default destination
   and filters incoming datagrams to only that peer.
   After connect(), you can use send()/recv() without passing
   the peer address each time. */

int fd = socket(AF_INET, SOCK_DGRAM, 0);

struct sockaddr_in peer = {0};
peer.sin_family = AF_INET;
peer.sin_port   = htons(9000);
inet_pton(AF_INET, "192.168.1.10", &peer.sin_addr);

/* "Connect" - no handshake, just records the peer address */
connect(fd, (struct sockaddr *)&peer, sizeof(peer));

/* Now use send/recv without providing the address each time */
send(fd, "ping", 4, 0);

char buf[256];
ssize_t n = recv(fd, buf, sizeof(buf), 0);

/* Disconnect to allow sending to different peers again */
struct sockaddr_in unspec = {0};
unspec.sin_family = AF_UNSPEC;
connect(fd, (struct sockaddr *)&unspec, sizeof(unspec));
```

## sendto() and recvfrom() Signatures

```c
/* sendto - send a datagram to a specific address */
ssize_t sendto(int sockfd,
               const void *buf, size_t len, int flags,
               const struct sockaddr *dest_addr, socklen_t addrlen);

/* recvfrom - receive a datagram and capture sender's address */
ssize_t recvfrom(int sockfd,
                 void *buf, size_t len, int flags,
                 struct sockaddr *src_addr, socklen_t *addrlen);

/* Pass NULL for src_addr/addrlen in recvfrom if sender address is not needed */
recvfrom(fd, buf, sizeof(buf), 0, NULL, NULL);
```

## Compile and Run

```bash
# Compile server and client

gcc -Wall -o udp_server udp_server.c
gcc -Wall -o udp_client udp_client.c

# Run server in background, then client
./udp_server &
./udp_client
```

## Conclusion

`sendto()` transmits a datagram to an explicit destination each call - no prior connection required. `recvfrom()` delivers the next queued datagram and fills in the sender's `sockaddr_in`, enabling stateless request/reply protocols. UDP preserves message boundaries: one successful `sendto()` creates one datagram, and one `recvfrom()` reads one datagram at a time. If the receive buffer is too small, the datagram is truncated and the excess bytes are discarded; datagrams can also be dropped entirely. On a typical 1500-byte Ethernet IPv4 path with no IP options, 1472 bytes avoids fragmentation; the actual safe size depends on the path MTU. The absolute IPv4 UDP payload limit with a 20-byte IP header is 65507 bytes. Use a connected UDP socket (`connect()` + `send()`/`recv()`) when always communicating with the same peer to simplify call sites and filter spurious datagrams.
