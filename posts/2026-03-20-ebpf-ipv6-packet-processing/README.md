# How to Write eBPF Programs for IPv6 Packet Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: eBPF, IPv6, Linux, Networking, BPF

Description: Write eBPF programs that process IPv6 packets, parse IPv6 headers, and extract information from IPv6 traffic using TC and XDP hooks.

## Introduction to eBPF and IPv6

eBPF (extended Berkeley Packet Filter) runs sandboxed programs in the Linux kernel, enabling high-performance packet processing without kernel modification. Processing IPv6 requires parsing the 40-byte fixed header and optional extension headers.

## IPv6 Header Structure

```c
// Linux UAPI IPv6 header layout (<linux/ipv6.h>)
struct ipv6hdr {
#if defined(__LITTLE_ENDIAN_BITFIELD)
    __u8    priority:4,
            version:4;
#elif defined(__BIG_ENDIAN_BITFIELD)
    __u8    version:4,
            priority:4;
#else
#error  "Please fix <asm/byteorder.h>"
#endif
    __u8    flow_lbl[3];    // Remaining traffic class + flow label bits
    __be16  payload_len;    // Payload length
    __u8    nexthdr;        // Next header type (TCP=6, UDP=17, ICMPv6=58)
    __u8    hop_limit;      // Hop limit (TTL equivalent)
    struct  in6_addr saddr; // Source address (128 bits)
    struct  in6_addr daddr; // Destination address (128 bits)
};
```

## Basic IPv6 Packet Parser (TC BPF)

```c
//go:build ignore

// ipv6_parser.c - TC/TCX BPF program for IPv6 packet parsing
#include <linux/bpf.h>
#include <linux/if_ether.h>
#include <linux/ipv6.h>
#include <linux/pkt_cls.h>
#include <linux/tcp.h>
#include <linux/udp.h>
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_endian.h>

// Map to count packets per destination IPv6 address
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __type(key, struct in6_addr);
    __type(value, __u64);
    __uint(max_entries, 1024);
} ipv6_counter SEC(".maps");

SEC("tc")
int ipv6_packet_counter(struct __sk_buff *skb) {
    void *data = (void *)(long)skb->data;
    void *data_end = (void *)(long)skb->data_end;

    // Parse Ethernet header
    struct ethhdr *eth = data;
    if ((void *)(eth + 1) > data_end)
        return TC_ACT_OK;

    // Only process IPv6 packets
    if (bpf_ntohs(eth->h_proto) != ETH_P_IPV6)
        return TC_ACT_OK;

    // Parse IPv6 header
    struct ipv6hdr *ip6h = (void *)(eth + 1);
    if ((void *)(ip6h + 1) > data_end)
        return TC_ACT_OK;

    struct in6_addr dst = ip6h->daddr;

    // Log the next-header field for quick debugging
    bpf_printk("IPv6 nexthdr=%d", ip6h->nexthdr);

    // Increment counter for destination address
    __u64 *count = bpf_map_lookup_elem(&ipv6_counter, &dst);
    if (count) {
        __sync_fetch_and_add(count, 1);
    } else {
        __u64 initial = 1;
        if (bpf_map_update_elem(&ipv6_counter, &dst, &initial, BPF_NOEXIST) != 0) {
            count = bpf_map_lookup_elem(&ipv6_counter, &dst);
            if (count)
                __sync_fetch_and_add(count, 1);
        }
    }

    return TC_ACT_OK;
}

char LICENSE[] SEC("license") = "GPL";
```

## Loading the eBPF Program

```bash
# Compile the eBPF program

clang -O2 -g -target bpf \
    -I/usr/include/x86_64-linux-gnu \
    -c ipv6_parser.c -o ipv6_parser.o

# Load with tc (Traffic Control)
sudo tc qdisc add dev eth0 clsact
sudo tc filter add dev eth0 ingress bpf object-file ipv6_parser.o section tc direct-action

# Verify it's loaded
sudo tc filter show dev eth0 ingress
```

## Go-Based eBPF Loader (cilium/ebpf with TCX)

The `link` package attaches `tc` programs through TCX on Linux 6.6 and newer. For classic TC attachment on older kernels, use the `tc` command shown above.

```go
// main.go
package main

import (
    "fmt"
    "net"
    "time"

    "github.com/cilium/ebpf"
    "github.com/cilium/ebpf/link"
)

//go:generate go tool bpf2go -tags linux IPv6Counter ipv6_parser.c -- -I/usr/include/x86_64-linux-gnu

func main() {
    // Load the compiled eBPF objects
    objs := IPv6CounterObjects{}
    if err := LoadIPv6CounterObjects(&objs, nil); err != nil {
        panic(err)
    }
    defer objs.Close()

    // Attach to network interface
    iface, err := net.InterfaceByName("eth0")
    if err != nil {
        panic(err)
    }
    l, err := link.AttachTCX(link.TCXOptions{
        Program:   objs.Ipv6PacketCounter,
        Interface: iface.Index,
        Attach:    ebpf.AttachTCXIngress,
    })
    if err != nil {
        panic(err)
    }
    defer l.Close()

    // Read packet counts
    ticker := time.NewTicker(5 * time.Second)
    defer ticker.Stop()
    for range ticker.C {
        var key [16]byte
        var value uint64

        iter := objs.Ipv6Counter.Iterate()
        for iter.Next(&key, &value) {
            ip := net.IP(key[:])
            fmt.Printf("Destination %s: %d packets\n", ip, value)
        }
        if err := iter.Err(); err != nil {
            panic(err)
        }
    }
}
```

## Parsing IPv6 Extension Headers

```c
// Parse extension headers to find actual transport layer
__u8 parse_ipv6_extensions(void *data, void *data_end, __u8 nexthdr, __u32 *offset) {
    // Extension header types to skip
    while (nexthdr == 0   ||  // Hop-by-Hop Options
           nexthdr == 43  ||  // Routing Header
           nexthdr == 44  ||  // Fragment Header
           nexthdr == 51  ||  // Authentication Header
           nexthdr == 60  ||  // Destination Options
           nexthdr == 135 ||  // Mobility Header
           nexthdr == 139 ||  // HIP
           nexthdr == 140) {  // Shim6
        struct ipv6_opt_hdr *exthdr = (void *)((__u8 *)data + *offset);
        __u8 hdr_type = nexthdr;
        __u32 hdrlen;

        if ((void *)(exthdr + 1) > data_end)
            return 0;  // Failed to parse

        nexthdr = exthdr->nexthdr;

        if (hdr_type == 44) {
            hdrlen = 8;  // Fragment header is always 8 bytes
        } else if (hdr_type == 51) {
            hdrlen = (exthdr->hdrlen + 2) * 4;  // AH length is in 32-bit words minus 2
        } else {
            hdrlen = (exthdr->hdrlen + 1) * 8;
        }

        if ((void *)((__u8 *)exthdr + hdrlen) > data_end)
            return 0;

        *offset += hdrlen;

        if (*offset > 256)  // Prevent infinite loops
            return 0;
    }
    return nexthdr;
}
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor the health of your eBPF-instrumented network. Set up monitors that track network performance metrics exported by your eBPF programs via Prometheus.

## Conclusion

Writing eBPF programs for IPv6 requires understanding the 40-byte IPv6 header structure, handling extension headers, and using BPF maps for tracking state. Use TC hooks for bidirectional traffic inspection and XDP for high-performance ingress processing.
