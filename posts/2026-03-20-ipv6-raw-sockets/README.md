# How to Use IPv6 Raw Sockets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Raw Sockets, C, ICMP6, Networking, Systems Programming, Security

Description: Create and use IPv6 raw sockets in C to send and receive ICMPv6 messages and custom protocol packets, with proper capabilities and header construction.

## Introduction

IPv6 raw sockets allow applications to send and receive IPv6 packets with custom protocol headers, bypassing the transport layer. Common uses include ping6 (ICMPv6 Echo), traceroute6, network scanners, and protocol implementations. Raw sockets require elevated privileges (`CAP_NET_RAW` or root).

## Privileges Required

```bash
# Option 1: Run as root (not recommended for production)

sudo ./rawsock

# Option 2: Grant CAP_NET_RAW capability to the binary
sudo setcap cap_net_raw=ep ./rawsock

# Option 3: Verify the binary has the capability
getcap ./rawsock
```

## Creating an ICMPv6 Raw Socket

```c
#include <sys/socket.h>
#include <netinet/in.h>
#include <netinet/icmp6.h>
#include <arpa/inet.h>
#include <string.h>
#include <stdio.h>
#include <unistd.h>
#include <time.h>

/* ICMPv6 Echo Request structure */
struct icmp6_echo {
    struct icmp6_hdr hdr;    /* type, code, checksum, id, seq */
    uint8_t  data[32];       /* Payload */
};

/* Calculate ICMPv6 checksum (kernel does this for IPPROTO_ICMPV6) */
/* Note: for SOCK_RAW with IPPROTO_ICMPV6, kernel calculates checksum */

int create_icmpv6_socket(void) {
    /* SOCK_RAW + IPPROTO_ICMPV6: raw ICMPv6 socket
     * Kernel automatically adds IPv6 header
     * Application provides ICMPv6 header + payload
     */
    int sockfd = socket(AF_INET6, SOCK_RAW, IPPROTO_ICMPV6);
    if (sockfd < 0) {
        perror("socket(AF_INET6, SOCK_RAW, IPPROTO_ICMPV6)");
        printf("Note: Raw sockets require CAP_NET_RAW or root\n");
        return -1;
    }

    /* Set hop limit */
    int hops = 64;
    setsockopt(sockfd, IPPROTO_IPV6, IPV6_UNICAST_HOPS, &hops, sizeof(hops));

    /* Enable ancillary data for destination address, interface, and hop limit */
    int on = 1;
    setsockopt(sockfd, IPPROTO_IPV6, IPV6_RECVPKTINFO, &on, sizeof(on));
    setsockopt(sockfd, IPPROTO_IPV6, IPV6_RECVHOPLIMIT, &on, sizeof(on));

    return sockfd;
}
```

## Sending ICMPv6 Echo Request (ping6)

```c
#include <sys/socket.h>
#include <netinet/in.h>
#include <netinet/icmp6.h>
#include <arpa/inet.h>
#include <string.h>
#include <stdio.h>
#include <unistd.h>
#include <time.h>

int send_icmpv6_echo(int sockfd, const char *dest_addr, uint16_t seq) {
    /* Build ICMPv6 Echo Request */
    struct icmp6_echo echo_req;

    memset(&echo_req, 0, sizeof(echo_req));
    echo_req.hdr.icmp6_type = ICMP6_ECHO_REQUEST;  /* 128 */
    echo_req.hdr.icmp6_code = 0;
    echo_req.hdr.icmp6_id   = htons(getpid() & 0xFFFF);
    echo_req.hdr.icmp6_seq  = htons(seq);

    /* Fill payload with timestamp */
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    memcpy(echo_req.data, &ts, sizeof(ts));

    /* Destination address */
    struct sockaddr_in6 dest;
    memset(&dest, 0, sizeof(dest));
    dest.sin6_family = AF_INET6;
    if (inet_pton(AF_INET6, dest_addr, &dest.sin6_addr) != 1) {
        fprintf(stderr, "Invalid IPv6 address: %s\n", dest_addr);
        return -1;
    }

    ssize_t sent = sendto(sockfd, &echo_req, sizeof(echo_req), 0,
                          (struct sockaddr *)&dest, sizeof(dest));
    if (sent < 0) {
        perror("sendto");
        return -1;
    }

    printf("Sent ICMPv6 Echo Request to %s (seq=%d)\n", dest_addr, seq);
    return 0;
}

int receive_icmpv6_echo_reply(int sockfd) {
    uint8_t buf[4096];
    struct sockaddr_in6 sender;
    socklen_t sender_len = sizeof(sender);

    ssize_t n = recvfrom(sockfd, buf, sizeof(buf), 0,
                         (struct sockaddr *)&sender, &sender_len);
    if (n < 0) { perror("recvfrom"); return -1; }

    /* The buffer contains the ICMPv6 message, not the IPv6 header */
    if (n < 8) return -1;  /* Too short */

    struct icmp6_hdr reply;
    memcpy(&reply, buf, sizeof(reply));

    char sender_ip[INET6_ADDRSTRLEN];
    inet_ntop(AF_INET6, &sender.sin6_addr, sender_ip, sizeof(sender_ip));

    if (reply.icmp6_type == ICMP6_ECHO_REPLY) {  /* 129 */
        uint16_t seq = ntohs(reply.icmp6_seq);
        printf("ICMPv6 Echo Reply from [%s]: seq=%d\n", sender_ip, seq);
    } else {
        printf("ICMPv6 type=%d code=%d from [%s]\n",
               reply.icmp6_type, reply.icmp6_code, sender_ip);
    }

    return 0;
}
```

## Filtering ICMPv6 Message Types

Use ICMPv6 socket filters to receive only specific message types:

```c
#include <string.h>
#include <netinet/icmp6.h>

void set_icmpv6_filter(int sockfd, int receive_echo_replies_only) {
    struct icmp6_filter filter;

    if (receive_echo_replies_only) {
        /* Block all ICMPv6 types except Echo Reply (129) */
        ICMP6_FILTER_SETBLOCKALL(&filter);
        ICMP6_FILTER_SETPASS(ICMP6_ECHO_REPLY, &filter);
    } else {
        /* Pass all ICMPv6 types */
        ICMP6_FILTER_SETPASSALL(&filter);
    }

    if (setsockopt(sockfd, IPPROTO_ICMPV6, ICMP6_FILTER,
                   &filter, sizeof(filter)) < 0) {
        perror("ICMP6_FILTER");
    }
}
```

## Full ping6 Example

```c
int main(int argc, char *argv[]) {
    if (argc != 2) {
        fprintf(stderr, "Usage: %s <numeric-ipv6-address>\n", argv[0]);
        return 1;
    }

    int sockfd = create_icmpv6_socket();
    if (sockfd < 0) return 1;

    /* Filter: only receive Echo Replies */
    set_icmpv6_filter(sockfd, 1);

    /* Set receive timeout */
    struct timeval tv = { .tv_sec = 2, .tv_usec = 0 };
    setsockopt(sockfd, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));

    for (int seq = 1; seq <= 3; seq++) {
        send_icmpv6_echo(sockfd, argv[1], seq);
        receive_icmpv6_echo_reply(sockfd);
        sleep(1);
    }

    close(sockfd);
    return 0;
}
```

## Compile and Run

```bash
gcc -o ping6_example ping6_example.c -Wall

# Grant raw socket capability
sudo setcap cap_net_raw=ep ./ping6_example

# Test
./ping6_example ::1
./ping6_example 2001:db8::1  # replace with a reachable IPv6 address
```

## Conclusion

IPv6 raw sockets with `SOCK_RAW` and `IPPROTO_ICMPV6` allow applications to send and receive ICMPv6 messages at the packet level. The kernel handles IPv6 header construction and ICMPv6 checksum calculation. Use `ICMP6_FILTER` to efficiently filter incoming message types, and use `IPV6_RECVPKTINFO` with `recvmsg()` if you need destination address information in ancillary data. Raw sockets require `CAP_NET_RAW` capability.
