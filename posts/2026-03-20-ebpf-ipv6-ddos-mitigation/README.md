# How to Use eBPF for IPv6 DDoS Mitigation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: eBPF, XDP, IPv6, DDoS, Security

Description: Build XDP-based DDoS mitigation programs that drop malicious IPv6 packets at line rate before they reach the kernel network stack.

## Overview

Inspect IPv6 packets with XDP as a foundation for IPv6 DDoS mitigation before they reach the kernel network stack.

## Prerequisites

- Linux kernel 5.8+ recommended (for modern BTF/libbpf workflows and CAP_BPF support)
- Clang/LLVM for compiling eBPF C programs
- Root access, or the combination of CAP_BPF and CAP_NET_ADMIN

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
# Compile eBPF program with BTF debug info

clang -O2 -g --target=bpf -c program.c -o program.o

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

## Testing IPv6 eBPF Programs

```bash
# Generate IPv6 test traffic
ping -6 -c 10 <TARGET_IPV6>

# Use nping for IPv6 TCP SYN packet generation
nping --tcp -6 -p 80 --flags syn <TARGET_IPV6>

# Watch bpf_printk output (kernel trace pipe)
sudo cat /sys/kernel/tracing/trace_pipe

# Use trace-cmd for structured tracing
sudo trace-cmd record -e "bpf:*" ping -6 -c 5 <TARGET_IPV6>
sudo trace-cmd report
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor the network performance metrics exported by your eBPF programs. Configure Prometheus scraping of eBPF-exported metrics and set up alerts for anomalies in IPv6 traffic patterns.

## Conclusion

Using eBPF as a foundation for IPv6 DDoS mitigation requires understanding IPv6 header structure in C, using XDP or TC hooks for packet interception, and leveraging BPF maps to store IPv6 address state. Always validate packet bounds before accessing headers to avoid eBPF verifier rejections.
