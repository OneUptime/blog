# How to Use IPv4 Multicast Sockets in C

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: C, IPv4, Multicast, UDP, IGMP, POSIX, Networking

Description: Learn how to send and receive IPv4 multicast datagrams in C using SOCK_DGRAM, IP_ADD_MEMBERSHIP, IP_MULTICAST_TTL, and IP_MULTICAST_IF to build group communication applications.

## IPv4 Multicast Basics

Multicast addresses occupy the Class D range: `224.0.0.0` – `239.255.255.255`. Senders transmit one packet; the network delivers it to all group members. Receivers join a group with `IP_ADD_MEMBERSHIP`; the kernel sends an IGMP join to the router.

| Range | Scope |
|-------|-------|
| 224.0.0.0 – 224.0.0.255 | Link-local (TTL 1, not routed) |
| 239.0.0.0 – 239.255.255.255 | Administratively scoped (RFC 2365) |
| 224.0.1.0 – 238.255.255.255 | Globally scoped |

## Multicast Sender

```c
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <netinet/in.h>

#define MCAST_GROUP "239.0.0.1"
#define MCAST_PORT  9000

int main(void) {
    int fd = socket(AF_INET, SOCK_DGRAM, 0);

    /* Set TTL - 1 keeps traffic on the local subnet */
    unsigned char ttl = 1;
    setsockopt(fd, IPPROTO_IP, IP_MULTICAST_TTL, &ttl, sizeof(ttl));

    /* Optionally select which interface sends multicast packets.
       INADDR_ANY lets the OS choose based on the routing table. */
    struct in_addr iface = { .s_addr = htonl(INADDR_ANY) };
    setsockopt(fd, IPPROTO_IP, IP_MULTICAST_IF, &iface, sizeof(iface));

    /* Disable loopback so the sender itself doesn't receive its own packets.
       Default is enabled (1). */
    unsigned char loop = 0;
    setsockopt(fd, IPPROTO_IP, IP_MULTICAST_LOOP, &loop, sizeof(loop));

    struct sockaddr_in dest = {0};
    dest.sin_family = AF_INET;
    dest.sin_port   = htons(MCAST_PORT);
    inet_pton(AF_INET, MCAST_GROUP, &dest.sin_addr);

    for (int i = 0; i < 5; i++) {
        char msg[64];
        snprintf(msg, sizeof(msg), "Multicast message #%d", i + 1);
        sendto(fd, msg, strlen(msg), 0,
               (struct sockaddr *)&dest, sizeof(dest));
        printf("Sent: %s\n", msg);
        sleep(1);
    }

    close(fd);
    return 0;
}
```

## Multicast Receiver

```c
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <netinet/in.h>

#define MCAST_GROUP "239.0.0.1"
#define MCAST_PORT  9000
#define BUFSIZE     1024

int main(void) {
    int fd = socket(AF_INET, SOCK_DGRAM, 0);

    /* Allow multiple receivers on the same host to use the same port */
    int opt = 1;
    setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    /* Bind to the multicast port on all interfaces */
    struct sockaddr_in addr = {0};
    addr.sin_family      = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_ANY);
    addr.sin_port        = htons(MCAST_PORT);
    bind(fd, (struct sockaddr *)&addr, sizeof(addr));

    /* Join the multicast group on the default interface */
    struct ip_mreq mreq;
    inet_pton(AF_INET, MCAST_GROUP, &mreq.imr_multiaddr);
    mreq.imr_interface.s_addr = htonl(INADDR_ANY);
    setsockopt(fd, IPPROTO_IP, IP_ADD_MEMBERSHIP, &mreq, sizeof(mreq));

    printf("Listening on multicast group %s:%d\n", MCAST_GROUP, MCAST_PORT);

    char buf[BUFSIZE];
    while (1) {
        struct sockaddr_in sender;
        socklen_t          slen = sizeof(sender);
        ssize_t n = recvfrom(fd, buf, sizeof(buf) - 1, 0,
                             (struct sockaddr *)&sender, &slen);
        if (n < 0) { perror("recvfrom"); break; }
        buf[n] = '\0';

        char ip[INET_ADDRSTRLEN];
        inet_ntop(AF_INET, &sender.sin_addr, ip, sizeof(ip));
        printf("[%s:%d] %s\n", ip, ntohs(sender.sin_port), buf);
    }

    /* Leave the group before closing */
    setsockopt(fd, IPPROTO_IP, IP_DROP_MEMBERSHIP, &mreq, sizeof(mreq));
    close(fd);
    return 0;
}
```

## Join Multiple Groups

```c
/* Join up to IP_MAX_MEMBERSHIPS groups (usually 20) per socket */
const char *groups[] = { "239.0.0.1", "239.0.0.2", "239.0.0.3" };
for (int i = 0; i < 3; i++) {
    struct ip_mreq mreq;
    inet_pton(AF_INET, groups[i], &mreq.imr_multiaddr);
    mreq.imr_interface.s_addr = htonl(INADDR_ANY);
    setsockopt(fd, IPPROTO_IP, IP_ADD_MEMBERSHIP, &mreq, sizeof(mreq));
}
```

## Compile and Run

```bash
gcc -Wall -o mcast_recv mcast_recv.c
gcc -Wall -o mcast_send mcast_send.c

# Start receiver first, then sender

./mcast_recv &
./mcast_send
```

## Conclusion

IPv4 multicast requires a UDP socket (`SOCK_DGRAM`). Senders use `sendto()` with the multicast group address as the destination; no special socket options are required for sending. Set `IP_MULTICAST_TTL` to control how far packets travel - TTL 1 is local subnet only. Receivers bind to `INADDR_ANY` on the multicast port and join the group with `IP_ADD_MEMBERSHIP` using an `ip_mreq` struct that specifies the group address and local interface. Set `SO_REUSEADDR` so multiple processes on the same host can join the same group. Leave the group with `IP_DROP_MEMBERSHIP` before closing the socket to send an IGMP leave message to the router.
