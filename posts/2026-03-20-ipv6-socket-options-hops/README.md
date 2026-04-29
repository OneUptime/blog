# How to Set IPv6 Socket Options (IPV6_UNICAST_HOPS, IPV6_MULTICAST_HOPS)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Socket Options, Hop Limit, TTL, C, Socket Programming, Networking

Description: Configure IPv6 socket options for unicast and multicast hop limits (IPV6_UNICAST_HOPS, IPV6_MULTICAST_HOPS) and other IPv6-specific socket settings.

## Introduction

IPv6 uses "hop limit" instead of IPv4's "TTL" to control how many hops a packet can traverse. Socket options `IPV6_UNICAST_HOPS` and `IPV6_MULTICAST_HOPS` control the hop limit for outgoing packets. Other IPv6 socket options control multicast behavior, traffic class, and receiving ancillary data.

## Key IPv6 Socket Options

| Option | Level | Description |
|--------|-------|-------------|
| `IPV6_UNICAST_HOPS` | IPPROTO_IPV6 | Hop limit for unicast packets |
| `IPV6_MULTICAST_HOPS` | IPPROTO_IPV6 | Hop limit for multicast packets |
| `IPV6_MULTICAST_IF` | IPPROTO_IPV6 | Interface for outgoing multicast |
| `IPV6_MULTICAST_LOOP` | IPPROTO_IPV6 | Receive own multicast (0/1) |
| `IPV6_JOIN_GROUP` | IPPROTO_IPV6 | Join multicast group |
| `IPV6_LEAVE_GROUP` | IPPROTO_IPV6 | Leave multicast group |
| `IPV6_V6ONLY` | IPPROTO_IPV6 | IPv6 only (no IPv4-mapped) |
| `IPV6_TCLASS` | IPPROTO_IPV6 | Traffic class (DSCP/ECN) |
| `IPV6_RECVHOPLIMIT` | IPPROTO_IPV6 | Receive hop limit in ancillary data |
| `IPV6_RECVPKTINFO` | IPPROTO_IPV6 | Receive destination address info in ancillary data |

## Setting IPV6_UNICAST_HOPS

```c
#include <sys/socket.h>
#include <netinet/in.h>
#include <stdio.h>
#include <unistd.h>

int main(void) {
    int sockfd = socket(AF_INET6, SOCK_DGRAM, 0);
    if (sockfd < 0) { perror("socket"); return 1; }

    /* Read the current unicast hop limit */
    int current_hops;
    socklen_t optlen = sizeof(current_hops);
    getsockopt(sockfd, IPPROTO_IPV6, IPV6_UNICAST_HOPS,
               &current_hops, &optlen);
    printf("Default unicast hop limit: %d\n", current_hops);
    /* For setsockopt(), -1 = use the system default hop limit */

    /* Set unicast hop limit to 64 */
    int hops = 64;
    if (setsockopt(sockfd, IPPROTO_IPV6, IPV6_UNICAST_HOPS,
                   &hops, sizeof(hops)) < 0) {
        perror("setsockopt IPV6_UNICAST_HOPS");
    }
    printf("Set unicast hop limit to: %d\n", hops);

    /* Set to -1 to restore system default */
    hops = -1;
    setsockopt(sockfd, IPPROTO_IPV6, IPV6_UNICAST_HOPS, &hops, sizeof(hops));

    close(sockfd);
    return 0;
}
```

## Setting IPV6_MULTICAST_HOPS

```c
#include <sys/socket.h>
#include <netinet/in.h>
#include <stdio.h>
#include <unistd.h>

void configure_multicast_socket(int sockfd) {
    /* Multicast hop limit uses the same range as IPV6_UNICAST_HOPS:
     * -1 = use system default
     * 0-255 = explicit hop limit
     *
     * The destination multicast address carries the multicast scope.
     * A hop limit of 1 is common for local-link multicast traffic.
     */

    /* Hop limit 1 is common for local discovery */
    int hops = 1;
    if (setsockopt(sockfd, IPPROTO_IPV6, IPV6_MULTICAST_HOPS,
                   &hops, sizeof(hops)) < 0) {
        perror("IPV6_MULTICAST_HOPS");
    }

    /* Enable multicast loopback (receive own multicast packets) */
    int loop = 1;
    setsockopt(sockfd, IPPROTO_IPV6, IPV6_MULTICAST_LOOP,
               &loop, sizeof(loop));

    /* Or disable loopback instead */
    loop = 0;
    setsockopt(sockfd, IPPROTO_IPV6, IPV6_MULTICAST_LOOP,
               &loop, sizeof(loop));
}
```

## Traffic Class (DSCP/ECN)

```c
#include <sys/socket.h>
#include <netinet/in.h>
#include <stdio.h>

void set_traffic_class(int sockfd) {
    /* Traffic class byte:
     * Bits 7-2: DSCP (6 bits)
     * Bits 1-0: ECN (2 bits)
     *
     * Common traffic class byte values:
     * 0x00 = Default (best effort)
     * 0xB8 = EF (Expedited Forwarding) - for real-time traffic
     * 0x28 = AF11 (Assured Forwarding)
     */
    int tclass = 0xB8;  /* EF DSCP (Expedited Forwarding) */
    setsockopt(sockfd, IPPROTO_IPV6, IPV6_TCLASS, &tclass, sizeof(tclass));

    /* Read it back */
    socklen_t optlen = sizeof(tclass);
    getsockopt(sockfd, IPPROTO_IPV6, IPV6_TCLASS, &tclass, &optlen);
    printf("Traffic class: 0x%02X\n", tclass);
}
```

## Receiving Ancillary Data (Hop Limit, Destination Address)

```c
#define _GNU_SOURCE
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <stdio.h>
#include <string.h>

void receive_with_ancillary(int sockfd) {
    /* Enable receiving hop limit in ancillary data */
    int on = 1;
    setsockopt(sockfd, IPPROTO_IPV6, IPV6_RECVHOPLIMIT, &on, sizeof(on));

    /* Enable receiving destination address (for servers with multiple IPs) */
    setsockopt(sockfd, IPPROTO_IPV6, IPV6_RECVPKTINFO, &on, sizeof(on));

    /* Receive with ancillary data */
    char data_buf[1024];
    char ctrl_buf[CMSG_SPACE(sizeof(int)) + CMSG_SPACE(sizeof(struct in6_pktinfo))];
    struct iovec iov = { data_buf, sizeof(data_buf) };
    struct msghdr msg = {
        .msg_iov     = &iov,
        .msg_iovlen  = 1,
        .msg_control = ctrl_buf,
        .msg_controllen = sizeof(ctrl_buf),
    };

    ssize_t n = recvmsg(sockfd, &msg, 0);
    if (n < 0) return;

    /* Parse ancillary data */
    for (struct cmsghdr *cmsg = CMSG_FIRSTHDR(&msg);
         cmsg != NULL;
         cmsg = CMSG_NXTHDR(&msg, cmsg)) {

        if (cmsg->cmsg_level == IPPROTO_IPV6 &&
            cmsg->cmsg_type == IPV6_HOPLIMIT) {
            int hoplimit;
            memcpy(&hoplimit, CMSG_DATA(cmsg), sizeof(hoplimit));
            printf("Received hop limit: %d\n", hoplimit);
        }

        if (cmsg->cmsg_level == IPPROTO_IPV6 &&
            cmsg->cmsg_type == IPV6_PKTINFO) {
            struct in6_pktinfo *pktinfo = (struct in6_pktinfo *)CMSG_DATA(cmsg);
            char dest_str[INET6_ADDRSTRLEN];
            inet_ntop(AF_INET6, &pktinfo->ipi6_addr, dest_str, sizeof(dest_str));
            printf("Destination address: %s (interface %u)\n",
                   dest_str, pktinfo->ipi6_ifindex);
        }
    }
}
```

## Practical Example: Traceroute-Like Probe

```c
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <net/if.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>

/* Send a UDP probe with a specific hop limit for traceroute-style probing */
void send_hop_probe(const char *dest_addr, int hop_limit) {
    int sockfd = socket(AF_INET6, SOCK_DGRAM, IPPROTO_UDP);

    /* Set strict hop limit for traceroute-like probing */
    setsockopt(sockfd, IPPROTO_IPV6, IPV6_UNICAST_HOPS,
               &hop_limit, sizeof(hop_limit));

    struct sockaddr_in6 dest;
    memset(&dest, 0, sizeof(dest));
    dest.sin6_family = AF_INET6;
    dest.sin6_port   = htons(33434);  /* traceroute port */
    inet_pton(AF_INET6, dest_addr, &dest.sin6_addr);

    sendto(sockfd, "probe", 5, 0, (struct sockaddr *)&dest, sizeof(dest));
    printf("Sent probe with hop_limit=%d to %s\n", hop_limit, dest_addr);
    close(sockfd);
}
```

## Conclusion

IPv6 socket options use `IPPROTO_IPV6` as the level (not `IPPROTO_IP` as in IPv4). `IPV6_UNICAST_HOPS` controls the hop limit for unicast traffic (equivalent to `IP_TTL` in IPv4), while `IPV6_MULTICAST_HOPS` controls the hop limit for multicast packets. The multicast address still determines multicast scope. Use `-1` to restore system defaults. Enable `IPV6_RECVHOPLIMIT` and `IPV6_RECVPKTINFO` to receive hop-limit and destination/interface information in ancillary data via `recvmsg()`.
