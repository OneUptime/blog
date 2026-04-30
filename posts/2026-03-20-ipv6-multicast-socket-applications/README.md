# How to Implement IPv6 Multicast in Socket Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Multicast, Socket Programming, C, Networking, Group Communication

Description: Implement IPv6 multicast sockets in C applications to send and receive multicast datagrams, including joining multicast groups and configuring interface membership.

## Introduction

IPv6 multicast allows one-to-many communication where a sender transmits a single packet that is delivered to all hosts that have joined the multicast group. IPv6 multicast addresses start with `ff00::/8`. IPv6 has no broadcast; link-local multicast (ff02::/16) is used instead by many link-scoped protocols such as NDP, mDNS, and DHCPv6.

## IPv6 Multicast Address Ranges

| Range | Scope | Used For |
|-------|-------|----------|
| ff01::/16 | Interface-local | Node-local multicast |
| ff02::/16 | Link-local | All-nodes (ff02::1), routers (ff02::2), mDNS (ff02::fb) |
| ff05::/16 | Site-local | Site-wide multicast |
| ff0e::/16 | Global | Internet-wide multicast |

## Sender: Sending IPv6 Multicast

```c
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <net/if.h>
#include <string.h>
#include <stdio.h>
#include <unistd.h>

#define MULTICAST_ADDR "ff02::1"  /* All-nodes link-local multicast */
#define MULTICAST_PORT 5007

int send_multicast(const char *message, const char *interface) {
    int sockfd = socket(AF_INET6, SOCK_DGRAM, 0);
    if (sockfd < 0) { perror("socket"); return -1; }

    /* Set the outgoing interface for multicast */
    unsigned int if_index = if_nametoindex(interface);
    if (if_index == 0) {
        perror("if_nametoindex");
        close(sockfd);
        return -1;
    }

    if (setsockopt(sockfd, IPPROTO_IPV6, IPV6_MULTICAST_IF,
                   &if_index, sizeof(if_index)) < 0) {
        perror("IPV6_MULTICAST_IF");
        close(sockfd);
        return -1;
    }

    /* Set TTL (hop limit) for multicast packets */
    int hops = 1;  /* 1 = link-local only */
    setsockopt(sockfd, IPPROTO_IPV6, IPV6_MULTICAST_HOPS, &hops, sizeof(hops));

    /* Enable/disable multicast loopback (receive own multicast) */
    int loop = 0;  /* 0 = don't receive own multicast */
    setsockopt(sockfd, IPPROTO_IPV6, IPV6_MULTICAST_LOOP, &loop, sizeof(loop));

    /* Destination: multicast group address */
    struct sockaddr_in6 dest;
    memset(&dest, 0, sizeof(dest));
    dest.sin6_family   = AF_INET6;
    dest.sin6_port     = htons(MULTICAST_PORT);
    dest.sin6_scope_id = if_index;  /* Select the link-local destination zone */
    if (inet_pton(AF_INET6, MULTICAST_ADDR, &dest.sin6_addr) != 1) {
        fprintf(stderr, "Invalid multicast address: %s\n", MULTICAST_ADDR);
        close(sockfd);
        return -1;
    }

    ssize_t sent = sendto(sockfd, message, strlen(message), 0,
                          (struct sockaddr *)&dest, sizeof(dest));
    if (sent < 0) {
        perror("sendto");
    } else {
        printf("Sent %zd bytes to [%s%%%s]:%d\n",
               sent, MULTICAST_ADDR, interface, MULTICAST_PORT);
    }

    close(sockfd);
    return (int)sent;
}
```

## Receiver: Joining a Multicast Group

```c
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <net/if.h>
#include <string.h>
#include <stdio.h>
#include <unistd.h>

#define MULTICAST_PORT 5007

int receive_multicast(const char *multicast_addr,
                       const char *interface, int port) {
    int sockfd = socket(AF_INET6, SOCK_DGRAM, 0);
    if (sockfd < 0) { perror("socket"); return -1; }

    /* Allow multiple sockets to bind to same port */
    int reuse = 1;
    setsockopt(sockfd, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse));

    /* Bind to the multicast port on all interfaces */
    struct sockaddr_in6 local;
    memset(&local, 0, sizeof(local));
    local.sin6_family = AF_INET6;
    local.sin6_port   = htons(port);
    local.sin6_addr   = in6addr_any;

    if (bind(sockfd, (struct sockaddr *)&local, sizeof(local)) < 0) {
        perror("bind");
        close(sockfd);
        return -1;
    }

    /* Join the multicast group on the specified interface */
    struct ipv6_mreq mreq;
    memset(&mreq, 0, sizeof(mreq));
    if (inet_pton(AF_INET6, multicast_addr, &mreq.ipv6mr_multiaddr) != 1) {
        fprintf(stderr, "Invalid multicast address: %s\n", multicast_addr);
        close(sockfd);
        return -1;
    }

    mreq.ipv6mr_interface = if_nametoindex(interface);
    if (mreq.ipv6mr_interface == 0) {
        perror("if_nametoindex");
        close(sockfd);
        return -1;
    }

    if (setsockopt(sockfd, IPPROTO_IPV6, IPV6_JOIN_GROUP,
                   &mreq, sizeof(mreq)) < 0) {
        perror("IPV6_JOIN_GROUP");
        close(sockfd);
        return -1;
    }

    printf("Joined multicast group %s on %s, listening on port %d\n",
           multicast_addr, interface, port);

    /* Receive multicast datagrams */
    char buf[4096];
    struct sockaddr_in6 sender;
    socklen_t sender_len;

    while (1) {
        sender_len = sizeof(sender);
        ssize_t n = recvfrom(sockfd, buf, sizeof(buf)-1, 0,
                             (struct sockaddr *)&sender, &sender_len);
        if (n < 0) { perror("recvfrom"); break; }

        buf[n] = '\0';
        char sender_ip[INET6_ADDRSTRLEN];
        inet_ntop(AF_INET6, &sender.sin6_addr, sender_ip, sizeof(sender_ip));
        printf("From [%s]: %s\n", sender_ip, buf);
    }

    /* Leave the group when done */
    setsockopt(sockfd, IPPROTO_IPV6, IPV6_LEAVE_GROUP, &mreq, sizeof(mreq));
    close(sockfd);
    return 0;
}

int main(void) {
    receive_multicast("ff02::1", "eth0", MULTICAST_PORT);
    return 0;
}
```

## Common Multicast Groups

```c
/* Well-known IPv6 multicast groups */
#define IPV6_MC_ALL_NODES    "ff02::1"   /* All nodes on link */
#define IPV6_MC_ALL_ROUTERS  "ff02::2"   /* All routers on link */
#define IPV6_MC_MDNS         "ff02::fb"  /* mDNS (port 5353) */
#define IPV6_MC_DHCPV6       "ff02::1:2" /* DHCPv6 relay agents and servers */
#define IPV6_MC_NDP_SOLICITED_PREFIX "ff02::1:ff00:0/104" /* Solicited-node prefix */
```

## Testing Multicast

```bash
# Send a test multicast packet

echo "Hello" | socat - UDP6-SENDTO:'[ff02::1%eth0]':5007

# Receive on eth0
socat UDP6-RECV:5007,ipv6-join-group='[ff02::1]:eth0' STDOUT

# List multicast group memberships on the host
ip -6 maddr show

# Capture multicast traffic with tcpdump
sudo tcpdump -n -i eth0 ip6 and ip6[24] == 0xff
```

## Conclusion

IPv6 multicast socket programming requires joining a group with `IPV6_JOIN_GROUP` on a specific interface and setting the outgoing interface with `IPV6_MULTICAST_IF`. When sending to link-local multicast groups, setting the destination scope ID identifies the correct link-local zone. The `ipv6_mreq` structure pairs a multicast address with an interface index for group management operations.
