# How to Use Cilium eBPF for IPv6 Network Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cilium, eBPF, IPv6, Network Policy, Kubernetes

Description: Configure Cilium's eBPF-based network policies for IPv6 traffic in Kubernetes clusters, including L3, L4, and L7 policies.

## Overview

Inspect IPv6 traffic with an XDP eBPF program, including header parsing, loading, tracing, and bpftool inspection.

## Prerequisites

- Linux kernel with eBPF/XDP support
- Clang/LLVM for compiling eBPF C programs
- Root access, or the capabilities needed to load BPF programs and configure interfaces (typically CAP_BPF and CAP_NET_ADMIN; older kernels may use CAP_SYS_ADMIN)

## IPv6 in eBPF Programs

eBPF programs process IPv6 packets using kernel headers. The IPv6 header is 40 bytes fixed, followed by optional extension headers.

### IPv6 Header Parsing

```c
#include <linux/bpf.h>
#include <linux/if_ether.h>
#include <linux/ipv6.h>
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_endian.h>

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
sudo ip link set dev eth0 xdp object program.o section xdp

# Verify
sudo ip -details link show dev eth0

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

# Inspect maps, if your program defines any
sudo bpftool map list
sudo bpftool map dump id <MAP_ID>

# Show map entries for programs that use maps
sudo bpftool map dump id <MAP_ID> | grep -A 3 "key"
```

## Testing IPv6 eBPF Programs

```bash
# Generate IPv6 test traffic
ping -6 -c 10 <REACHABLE_IPV6>

# Watch bpf_printk output (kernel trace pipe)
sudo cat /sys/kernel/tracing/trace_pipe

# Use trace-cmd for structured tracing
sudo trace-cmd record -e "bpf:*" ping -6 -c 5 <REACHABLE_IPV6>
sudo trace-cmd report
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor the network performance metrics exported by your eBPF programs. Configure Prometheus scraping of eBPF-exported metrics and set up alerts for anomalies in IPv6 traffic patterns.

## Conclusion

Inspecting IPv6 traffic with eBPF XDP programs requires understanding IPv6 header structure in C, using XDP hooks for packet interception, and validating packet bounds before accessing headers to avoid eBPF verifier rejections.
