# How to Write eBPF Programs for IPv6 NDP Inspection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: eBPF, IPv6, NDP, Security, Network Monitoring

Description: Inspect and monitor IPv6 Neighbor Discovery Protocol (NDP) traffic using eBPF to detect rogue RAs and neighbor spoofing.

## Overview

Inspect and monitor IPv6 Neighbor Discovery Protocol (NDP) traffic using eBPF to detect rogue RAs and neighbor spoofing.

## Prerequisites

- Linux kernel 5.6+ (for BTF and full eBPF feature support)
- Clang/LLVM for compiling eBPF C programs
- Root access (or equivalent capabilities to load BPF programs and attach XDP on the target interface)

## IPv6 in eBPF Programs

eBPF programs process IPv6 packets using kernel headers. The IPv6 header is a fixed 40 bytes, followed by optional extension headers. NDP uses ICMPv6, so an NDP inspector must parse the IPv6 header and then the ICMPv6 header.

### IPv6 and NDP Parsing

```c
#include <linux/bpf.h>
#include <linux/if_ether.h>
#include <linux/in.h>
#include <linux/ipv6.h>
#include <linux/icmpv6.h>
#include <bpf/bpf_endian.h>
#include <bpf/bpf_helpers.h>

SEC("xdp")
int process_ipv6(struct xdp_md *ctx) {
    void *data = (void *)(long)ctx->data;
    void *data_end = (void *)(long)ctx->data_end;

    // Parse Ethernet header
    struct ethhdr *eth = data;
    if ((void *)(eth + 1) > data_end)
        return XDP_PASS;

    // Check for IPv6 EtherType (0x86DD)
    if (eth->h_proto != bpf_htons(ETH_P_IPV6))
        return XDP_PASS;

    // Parse IPv6 header
    struct ipv6hdr *ip6h = (void *)(eth + 1);
    if ((void *)(ip6h + 1) > data_end)
        return XDP_PASS;

    // This minimal example expects ICMPv6 immediately after the IPv6 header.
    if (ip6h->nexthdr != IPPROTO_ICMPV6 || ip6h->hop_limit != 255)
        return XDP_PASS;

    // Parse ICMPv6 header
    struct icmp6hdr *icmp6h = (void *)(ip6h + 1);
    if ((void *)(icmp6h + 1) > data_end)
        return XDP_PASS;

    // NDP message types occupy the ICMPv6 range 133-137 and use code 0.
    if (icmp6h->icmp6_type < 133 || icmp6h->icmp6_type > 137 ||
        icmp6h->icmp6_code != 0)
        return XDP_PASS;

    // Log the NDP message type and source address prefix
    bpf_printk("NDP type %u src prefix: %08x:%08x",
               icmp6h->icmp6_type,
               bpf_ntohl(ip6h->saddr.s6_addr32[0]),
               bpf_ntohl(ip6h->saddr.s6_addr32[1]));

    return XDP_PASS;
}

char LICENSE[] SEC("license") = "GPL";
```

### Loading with ip

```bash
# Compile eBPF program

clang -O2 -g -target bpf -c program.c -o program.o

# Load XDP program on interface
sudo ip link set dev eth0 xdp object program.o section xdp

# Verify
sudo ip link show dev eth0

# Remove XDP program
sudo ip link set dev eth0 xdp off
```

### Using bpftool for Inspection

```bash
# List loaded eBPF programs
sudo bpftool prog list

# Show program details (BTF info)
sudo bpftool prog show id <PROG_ID>

# Dump program instructions
sudo bpftool prog dump xlated id <PROG_ID>

# Inspect maps
sudo bpftool map list
sudo bpftool map dump id <MAP_ID>

# Show map entries (useful for IPv6 address tables)
sudo bpftool map dump id <MAP_ID> | grep -A 3 "key"
```

This minimal example assumes ICMPv6 follows the fixed IPv6 header directly. If extension headers may be present in your environment, walk them before accessing `struct icmp6hdr`.

## Testing IPv6 eBPF Programs

```bash
# Generate IPv6 test traffic
ping -6 -c 10 2001:db8::1

# Generate additional IPv6 traffic
nc -6 -vz 2001:db8::1 80

# Watch bpf_printk output (TraceFS trace_pipe)
sudo cat /sys/kernel/tracing/trace_pipe

# Use trace-cmd for structured tracing
sudo trace-cmd record -e "bpf:*" ping -6 -c 5 2001:db8::1
sudo trace-cmd report
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor the network performance metrics exported by your eBPF programs. Configure Prometheus scraping of eBPF-exported metrics and set up alerts for anomalies in IPv6 traffic patterns.

## Conclusion

How to Write eBPF Programs for IPv6 NDP Inspection requires understanding IPv6 and ICMPv6 header structure in C, using XDP or TC hooks for packet interception, and leveraging BPF maps to store neighbor state. Always validate packet bounds before accessing headers to avoid eBPF verifier rejections, and account for IPv6 extension headers if ICMPv6 is not immediately after the fixed IPv6 header.
