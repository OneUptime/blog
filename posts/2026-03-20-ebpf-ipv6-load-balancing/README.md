# How to Use eBPF for IPv6 Load Balancing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: eBPF, XDP, IPv6, Load Balancing, DNAT

Description: Implement high-performance IPv6 load balancing using XDP and eBPF DNAT (Destination NAT) without iptables overhead.

## Overview

Parse and inspect IPv6 packets in XDP programs using eBPF and kernel headers.

## Prerequisites

- Linux kernel with XDP and eBPF support
- Clang/LLVM and libbpf headers for compiling eBPF C programs
- Root access, or the capabilities needed to load BPF programs and attach XDP (typically CAP_BPF and CAP_NET_ADMIN on newer kernels, or CAP_SYS_ADMIN on older kernels)

## IPv6 in eBPF Programs

eBPF programs process IPv6 packets using kernel headers. The base IPv6 header is always 40 bytes, followed by optional extension headers.

### IPv6 Header Parsing

```c
#include <linux/bpf.h>
#include <linux/if_ether.h>
#include <linux/ipv6.h>
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

    // Log the first 64 bits of the source address
    bpf_printk("IPv6 src first 64 bits: %08x:%08x",
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
sudo ip link set dev eth0 xdp obj program.o sec xdp

# Verify
sudo ip link show dev eth0

# Remove XDP program
sudo ip link set dev eth0 xdp off
```

### Using bpftool for Inspection

```bash
# List loaded eBPF programs
sudo bpftool prog list

# Show program details
sudo bpftool prog show id <PROG_ID>

# Dump program instructions
sudo bpftool prog dump xlated id <PROG_ID>

# Inspect maps
sudo bpftool map list
sudo bpftool map dump id <MAP_ID>

# Show map entries (useful for IPv6 address tables)
sudo bpftool map dump id <MAP_ID> | grep -A 3 "key"
```

## Testing IPv6 eBPF Programs

```bash
# Generate IPv6 test traffic
ping -6 -c 10 2001:db8::1

# Use Nping for IPv6 TCP packet generation
nping --tcp -6 -p 80 2001:db8::1

# Watch bpf_printk output
sudo bpftool prog tracelog

# Use trace-cmd for structured tracing
sudo trace-cmd record -e "bpf:*" ping -6 -c 5 2001:db8::1
sudo trace-cmd report
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor the network performance metrics exported by your eBPF programs. Configure Prometheus scraping of eBPF-exported metrics and set up alerts for anomalies in IPv6 traffic patterns.

## Conclusion

Working with IPv6 in XDP programs requires understanding the IPv6 header structure in C, handling extension headers when you need to inspect beyond the base header, and always validating packet bounds before accessing headers to avoid eBPF verifier rejections.
