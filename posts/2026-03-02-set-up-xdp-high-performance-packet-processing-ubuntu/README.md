# How to Set Up XDP for High-Performance Packet Processing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, XDP, Networking, eBPF, Performance

Description: Set up XDP (eXpress Data Path) on Ubuntu for high-performance packet processing at the network driver level using eBPF programs, bypassing kernel overhead.

---

XDP (eXpress Data Path) is a programmable, high-performance packet processing framework built into the Linux kernel. XDP programs run at the earliest possible point in the receive path - directly in the NIC driver or even in the NIC firmware - before the kernel allocates a socket buffer. The result is packet processing at line rate with minimal CPU overhead.

XDP uses eBPF programs that you write, compile, and attach to a network interface. Common use cases include DDoS mitigation, load balancing, packet filtering, and custom protocol handling at very high packet rates.

## Prerequisites and Kernel Requirements

XDP requires a kernel version of 4.8 or newer. Ubuntu 20.04+ ships with kernels well above this requirement.

```bash
# Check kernel version
uname -r

# Verify eBPF support
ls /sys/fs/bpf/
```

You also need a NIC driver that supports XDP. Check XDP support for your driver:

```bash
# Check NIC driver
ethtool -i eth0 | grep driver

# Common drivers with native XDP support:
# mlx4, mlx5 (Mellanox)
# i40e (Intel X710)
# ixgbe (Intel 82599)
# virtio_net (VMs)
# bpf (generic mode - works on any NIC)
```

XDP has three modes:
- **Native (driver)**: Fastest - runs in the driver, before packet allocation
- **Generic (SKB)**: Falls back to running after skb allocation - slower but works on any NIC
- **Offloaded**: Runs on NIC hardware - fastest possible, requires SmartNIC

## Installing Development Dependencies

```bash
sudo apt update
sudo apt install -y \
    clang \
    llvm \
    libelf-dev \
    linux-headers-$(uname -r) \
    libbpf-dev \
    iproute2 \
    bpftool
```

For the latest libbpf tools:

```bash
# Install libbpf from source if the package version is too old
sudo apt install -y pkg-config libz-dev
git clone https://github.com/libbpf/libbpf.git
cd libbpf/src
make
sudo make install
```

## Writing a Basic XDP Program

XDP programs are written in C and compiled to eBPF bytecode. Here's a minimal example that drops all ICMP packets and passes everything else.

Create the program file:

```bash
mkdir -p ~/xdp-demo
nano ~/xdp-demo/xdp_drop_icmp.c
```

```c
// xdp_drop_icmp.c - Drop ICMP packets, pass everything else
#include <linux/bpf.h>
#include <linux/if_ether.h>
#include <linux/ip.h>
#include <linux/icmp.h>
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_endian.h>

SEC("xdp")
int xdp_drop_icmp(struct xdp_md *ctx)
{
    // ctx->data and ctx->data_end define the packet boundaries
    void *data_end = (void *)(long)ctx->data_end;
    void *data     = (void *)(long)ctx->data;

    // Parse Ethernet header
    struct ethhdr *eth = data;
    if ((void *)(eth + 1) > data_end)
        return XDP_PASS;  // Malformed packet, pass to kernel

    // Only process IPv4 packets
    if (bpf_ntohs(eth->h_proto) != ETH_P_IP)
        return XDP_PASS;

    // Parse IP header
    struct iphdr *ip = (void *)(eth + 1);
    if ((void *)(ip + 1) > data_end)
        return XDP_PASS;

    // Drop ICMP packets
    if (ip->protocol == IPPROTO_ICMP)
        return XDP_DROP;

    // Pass all other packets
    return XDP_PASS;
}

// License declaration required for kernel eBPF programs
char _license[] SEC("license") = "GPL";
```

## Compiling the XDP Program

```bash
cd ~/xdp-demo

# Compile to eBPF bytecode using clang
clang -O2 -g -target bpf \
    -I /usr/include/$(uname -m)-linux-gnu \
    -c xdp_drop_icmp.c \
    -o xdp_drop_icmp.o

# Verify the object file
file xdp_drop_icmp.o
# Should show: ELF 64-bit LSB relocatable, eBPF
```

## Loading the XDP Program

Use `ip link` to attach the XDP program to an interface:

```bash
# Load in native mode (fastest - requires driver support)
sudo ip link set dev eth0 xdp obj xdp_drop_icmp.o sec xdp

# Load in generic (SKB) mode - works on any NIC
sudo ip link set dev eth0 xdpgeneric obj xdp_drop_icmp.o sec xdp

# Load in offloaded mode - runs on NIC hardware
sudo ip link set dev eth0 xdpoffload obj xdp_drop_icmp.o sec xdp
```

Verify the program is loaded:

```bash
# Check XDP attachment
ip link show eth0 | grep xdp

# List all loaded BPF programs
sudo bpftool prog list

# Show program details
sudo bpftool prog show pinned /sys/fs/bpf/xdp
```

## Unloading the XDP Program

```bash
# Remove XDP program from interface
sudo ip link set dev eth0 xdp off

# Or for generic mode
sudo ip link set dev eth0 xdpgeneric off
```

## Using XDP with BPF Maps for Statistics

XDP programs can use BPF maps to pass data between the kernel program and user space. Here's an example that counts dropped packets:

```c
// xdp_counter.c - Count packets by action
#include <linux/bpf.h>
#include <linux/if_ether.h>
#include <linux/ip.h>
#include <bpf/bpf_helpers.h>

// Define a map to count packets
struct {
    __uint(type, BPF_MAP_TYPE_ARRAY);
    __uint(max_entries, 2);  // [0] = passed, [1] = dropped
    __type(key, __u32);
    __type(value, __u64);
} packet_count SEC(".maps");

SEC("xdp")
int xdp_count(struct xdp_md *ctx)
{
    __u32 key;
    __u64 *count;

    void *data_end = (void *)(long)ctx->data_end;
    void *data     = (void *)(long)ctx->data;

    struct iphdr *ip = data + sizeof(struct ethhdr);
    if ((void *)(ip + 1) > data_end) {
        key = 0;  // pass
        count = bpf_map_lookup_elem(&packet_count, &key);
        if (count) __sync_fetch_and_add(count, 1);
        return XDP_PASS;
    }

    // Drop UDP for demonstration
    if (ip->protocol == IPPROTO_UDP) {
        key = 1;  // drop
        count = bpf_map_lookup_elem(&packet_count, &key);
        if (count) __sync_fetch_and_add(count, 1);
        return XDP_DROP;
    }

    key = 0;  // pass
    count = bpf_map_lookup_elem(&packet_count, &key);
    if (count) __sync_fetch_and_add(count, 1);
    return XDP_PASS;
}

char _license[] SEC("license") = "GPL";
```

Read the map from user space:

```bash
# Find the map ID after loading
sudo bpftool map list

# Dump map contents
sudo bpftool map dump id <MAP_ID>
```

## Using xdp-tools for Testing

The `xdp-tools` package provides utilities for testing and managing XDP:

```bash
sudo apt install xdp-tools

# Test basic XDP packet counting
sudo xdpdump -i eth0 -s 64
```

## XDP Return Codes

Understanding XDP return codes is essential:

| Code | Value | Meaning |
|------|-------|---------|
| XDP_ABORTED | 0 | Error - drop and generate tracepoint |
| XDP_DROP | 1 | Drop the packet immediately |
| XDP_PASS | 2 | Pass to normal kernel networking stack |
| XDP_TX | 3 | Transmit back out the same interface |
| XDP_REDIRECT | 4 | Redirect to another interface or CPU |

`XDP_TX` and `XDP_REDIRECT` are particularly powerful for building high-speed load balancers and packet forwarders.

## Performance Measurement

Benchmark XDP packet processing rate:

```bash
# Install pktgen for packet generation
# On the sending machine:
sudo apt install linux-tools-common

# Use kernel pktgen for high-rate packet generation
echo "add_device eth1" > /proc/net/pktgen/kpktgend_0
echo "pkt_size 64" > /proc/net/pktgen/eth1
echo "count 10000000" > /proc/net/pktgen/eth1
echo "start" > /proc/net/pktgen/pgctrl
```

Monitor XDP stats:

```bash
# Per-interface XDP stats
sudo bpftool net list

# Kernel XDP statistics (via ethtool)
ethtool -S eth0 | grep -i xdp
```

## Troubleshooting

**Program fails to load - verifier error:**
```bash
# Run with verbose output to see verifier messages
sudo ip -v link set dev eth0 xdp obj xdp_drop_icmp.o sec xdp
```

The eBPF verifier ensures programs are safe. Common errors involve out-of-bounds memory access - always check bounds before dereferencing pointers.

**Generic mode only (native not available):**
Check if your driver supports native XDP:

```bash
# Look for XDP support in driver info
ethtool -i eth0
# Check kernel driver source for xdp_xmit or ndo_bpf
```

## Summary

XDP provides a powerful framework for high-performance packet processing in the Linux kernel's fast path. By running eBPF programs before packet allocation, XDP achieves significantly higher packet rates than traditional iptables or kernel socket approaches - often 10-40 million packets per second per core. The framework is production-ready and used by projects like Cilium, Cloudflare's DDoS mitigation, and Facebook's Katran load balancer.
