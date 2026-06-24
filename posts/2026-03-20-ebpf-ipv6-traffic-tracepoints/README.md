# How to Monitor IPv6 Traffic with eBPF Tracepoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: eBPF, IPv6, Tracepoints, Linux Kernel, Monitoring

Description: Use eBPF tracepoints and kprobes to monitor IPv6 socket operations, connection events, and packet processing in the Linux kernel.

## Overview

Use an eBPF XDP program to inspect IPv6 packets and monitor packet processing in the Linux kernel.

## Prerequisites

- Linux kernel with XDP and eBPF support
- Clang/LLVM, libbpf headers, iproute2, and bpftool
- Root access, or the capabilities needed to load BPF programs and configure interfaces (typically CAP_BPF and CAP_NET_ADMIN on newer kernels)

## IPv6 in eBPF Programs

eBPF programs process IPv6 packets using kernel headers. The IPv6 header is 40 bytes fixed, followed by optional extension headers.

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

    // Log source address (first 64 bits)
    bpf_printk("IPv6 src prefix: %08x:%08x",
               bpf_ntohl(ip6h->saddr.s6_addr32[0]),
               bpf_ntohl(ip6h->saddr.s6_addr32[1]));

    return XDP_PASS;
}

char LICENSE[] SEC("license") = "GPL";
```

### Loading with ip

```bash
# Compile eBPF program

clang -O2 -target bpf -c program.c -o program.o

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
# Replace with a reachable IPv6 target in your environment
TARGET_IPV6=2001:db8::1

# Generate IPv6 test traffic
ping -6 -c 10 "$TARGET_IPV6"

# Generate IPv6 TCP traffic
curl -6 -I "http://[$TARGET_IPV6]/"

# Watch bpf_printk output (kernel trace pipe)
sudo cat /sys/kernel/tracing/trace_pipe

# Use trace-cmd for structured tracing
sudo trace-cmd record -e "bpf:*" ping -6 -c 5 "$TARGET_IPV6"
sudo trace-cmd report
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor the network performance metrics exported by your eBPF programs. Configure Prometheus scraping of eBPF-exported metrics and set up alerts for anomalies in IPv6 traffic patterns.

## Conclusion

Monitoring IPv6 traffic with eBPF XDP requires understanding IPv6 header structure in C, using an XDP hook for packet interception, and, when needed, leveraging BPF maps to store IPv6 address state. Always validate packet bounds before accessing headers to avoid eBPF verifier rejections.
