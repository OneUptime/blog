# How to Use eBPF for Network Monitoring on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, EBPF, Networking, Monitoring, Observability

Description: Learn how to use eBPF for network monitoring on Ubuntu, covering packet inspection, connection tracking, bandwidth accounting, and practical tools like BCC and bpftrace.

---

eBPF (extended Berkeley Packet Filter) lets you run sandboxed programs inside the Linux kernel without modifying kernel source or loading kernel modules. For network monitoring, this means you can intercept and analyze every packet flowing through the system with virtually no overhead compared to traditional tools. This guide covers practical eBPF-based network monitoring using available tools and custom programs.

## Understanding eBPF Hook Points for Networking

eBPF programs can attach to several points in the network stack:

- **XDP (eXpress Data Path)** - Before the kernel's network stack, at the driver level. Extremely fast, can drop or redirect packets before any kernel processing.
- **TC (Traffic Control)** - On the ingress and egress path, after XDP. Can modify, redirect, or mirror packets.
- **Socket filters** - Filter packets for a specific socket.
- **kprobes/tracepoints** - Attach to specific kernel functions like `tcp_connect`, `tcp_close`, etc.

## Setting Up the BCC Toolkit

BCC (BPF Compiler Collection) provides a Python/Lua framework for writing eBPF programs plus a collection of ready-to-use tools:

```bash
# Install BCC on Ubuntu 22.04+
sudo apt update
sudo apt install bpfcc-tools linux-headers-$(uname -r) python3-bpfcc

# Or install from the latest packages
sudo apt install bcc

# Verify installation - list available tools
ls /usr/sbin/*bcc* 2>/dev/null || ls /usr/share/bcc/tools/

# Most tools are in /usr/sbin/ and have -bpfcc suffix on Ubuntu
which tcpconnect-bpfcc
which tcptop-bpfcc
```

## Ready-to-Use Network Monitoring Tools

BCC includes many tools you can use immediately:

```bash
# Monitor all TCP connections being established
sudo tcpconnect-bpfcc
# Output: PID   COMM     IP  SADDR            DADDR            DPORT

# Monitor TCP accepts (incoming connections to listening servers)
sudo tcpaccept-bpfcc

# Show TCP send/receive bytes per connection (like top, but for network)
sudo tcptop-bpfcc
sudo tcptop-bpfcc -C  # Show country as well

# Trace TCP connection attempts that were retransmitted
sudo tcpretrans-bpfcc

# Show TCP round-trip time distributions
sudo tcplife-bpfcc

# Monitor DNS queries (UDP port 53)
sudo execsnoop-bpfcc | grep -i dns

# Track connections by IP and port with latency
sudo tcptracer-bpfcc
```

## Monitoring with bpftrace One-Liners

bpftrace provides a quicker scripting interface for ad-hoc monitoring:

```bash
# Count TCP connections by remote IP
sudo bpftrace -e '
kprobe:tcp_connect {
    @[ntop(AF_INET, ((struct sock *)arg0)->__sk_common.skc_daddr)] = count();
}
interval:s:5 { print(@); clear(@); }'

# Show bandwidth per process
sudo bpftrace -e '
tracepoint:net:net_dev_xmit {
    @bytes_sent[comm] = sum(args->len);
}
tracepoint:net:napi_gro_receive_entry {
    @bytes_recv[comm] = sum(args->len);
}
interval:s:5 {
    printf("Bytes sent:\n"); print(@bytes_sent);
    printf("Bytes received:\n"); print(@bytes_recv);
    clear(@bytes_sent); clear(@bytes_recv);
}'

# Trace DNS queries being sent
sudo bpftrace -e '
tracepoint:syscalls:sys_enter_sendto {
    @dns[comm, pid] = count();
}
interval:s:10 { print(@dns); clear(@dns); }'

# Show all new TCP connections with process and destination
sudo bpftrace -e '
#include <net/sock.h>
kprobe:tcp_connect {
    $sk = (struct sock *)arg0;
    printf("%s (PID %d) connecting to %s:%d\n",
        comm, pid,
        ntop(AF_INET, $sk->__sk_common.skc_daddr),
        ntohs($sk->__sk_common.skc_dport));
}'
```

## Writing a Custom eBPF Program with BCC Python

Here is a practical example: track per-process bandwidth usage in real time.

```python
#!/usr/bin/env python3
# File: bandwidth-monitor.py
# Track network bytes per process using eBPF

from bcc import BPF
import time
import socket
import struct

# eBPF program written in C
bpf_text = """
#include <uapi/linux/ptrace.h>
#include <net/sock.h>
#include <bcc/proto.h>

// Store bytes sent and received per process
BPF_HASH(send_bytes, u32, u64);
BPF_HASH(recv_bytes, u32, u64);

// Hook into TCP send
int kprobe__tcp_sendmsg(struct pt_regs *ctx, struct sock *sk, struct msghdr *msg, size_t size) {
    u32 pid = bpf_get_current_pid_tgid() >> 32;
    u64 *bytes = send_bytes.lookup(&pid);
    if (bytes) {
        *bytes += size;
    } else {
        send_bytes.update(&pid, &size);
    }
    return 0;
}

// Hook into TCP receive
int kprobe__tcp_cleanup_rbuf(struct pt_regs *ctx, struct sock *sk, int copied) {
    if (copied <= 0) return 0;
    u32 pid = bpf_get_current_pid_tgid() >> 32;
    u64 size = copied;
    u64 *bytes = recv_bytes.lookup(&pid);
    if (bytes) {
        *bytes += size;
    } else {
        recv_bytes.update(&pid, &size);
    }
    return 0;
}
"""

# Load the eBPF program
b = BPF(text=bpf_text)

print("Monitoring network bandwidth per process (Ctrl+C to exit)...")
print(f"{'PID':<8} {'Process':<20} {'Sent (KB)':<12} {'Received (KB)':<12}")
print("-" * 55)

try:
    while True:
        time.sleep(2)

        # Get process names
        send_table = b.get_table("send_bytes")
        recv_table = b.get_table("recv_bytes")

        stats = {}
        for key, value in send_table.items():
            pid = key.value
            try:
                with open(f"/proc/{pid}/comm", "r") as f:
                    comm = f.read().strip()
            except:
                comm = "unknown"
            stats[pid] = {"comm": comm, "sent": value.value, "recv": 0}

        for key, value in recv_table.items():
            pid = key.value
            if pid in stats:
                stats[pid]["recv"] = value.value

        # Print top processes by total bytes
        sorted_stats = sorted(stats.items(),
                              key=lambda x: x[1]["sent"] + x[1]["recv"],
                              reverse=True)[:10]

        for pid, data in sorted_stats:
            if data["sent"] + data["recv"] > 0:
                print(f"{pid:<8} {data['comm']:<20} {data['sent']//1024:<12} {data['recv']//1024:<12}")

        # Clear the tables for the next interval
        send_table.clear()
        recv_table.clear()
        print("-" * 55)

except KeyboardInterrupt:
    print("\nExiting...")
```

Run it:

```bash
sudo python3 bandwidth-monitor.py
```

## XDP-Based Packet Filtering

XDP provides the fastest possible packet processing at the driver level. Here is a simple example using the `ip` command with built-in XDP programs:

```bash
# Install xdp-tools
sudo apt install xdp-tools

# Load a built-in XDP program that drops all packets (benchmark XDP performance)
# WARNING: This will drop all network traffic on the interface
# sudo ip link set dev eth0 xdp obj /usr/lib/bpf/xdp_pass.o sec xdp

# Use xdp-filter for IP-based filtering
# Install xdp-filter tool
which xdp-filter || sudo apt install xdp-tools

# Block traffic from a specific IP at XDP speed
sudo xdp-filter load eth0
sudo xdp-filter ip add 10.0.0.100

# View filtered packets
sudo xdp-filter status

# Remove filtering
sudo xdp-filter unload eth0
```

## Using Cilium's Hubble for Kubernetes Network Visibility

If you are running Kubernetes, Cilium uses eBPF for networking and Hubble provides network observability:

```bash
# Install Hubble CLI
export HUBBLE_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/hubble/master/stable.txt)
curl -L --remote-name-all https://github.com/cilium/hubble/releases/download/$HUBBLE_VERSION/hubble-linux-amd64.tar.gz
tar xzvf hubble-linux-amd64.tar.gz
sudo mv hubble /usr/local/bin/

# If Cilium is installed in your cluster, observe flows
hubble observe
hubble observe --pod my-pod --follow
hubble observe --type drop
```

## Monitoring with `tcpdump` vs eBPF

Traditional tcpdump copies all matching packets to userspace, which has significant overhead. eBPF filtering happens in the kernel:

```bash
# Traditional tcpdump - everything goes to userspace first
sudo tcpdump -i eth0 port 443 -w /tmp/capture.pcap

# With eBPF socket filter via BPF-enhanced tcpdump
# tcpdump automatically uses BPF filters for kernel-side filtering
# The filter is compiled to BPF and applied in the kernel
sudo tcpdump -d port 443  # Show the BPF bytecode tcpdump generates

# For real-time flow monitoring without packet capture overhead:
sudo tcplife-bpfcc  # Shows TCP session lifetimes and bytes
```

## Tracking Dropped Packets

```bash
# Install dropwatch for monitoring packet drops
sudo apt install dropwatch

# Start dropwatch to see where packets are being dropped
sudo dropwatch -l kas

# Or use the BCC tool for drops
sudo /usr/share/bcc/tools/droptrace
# Shows: CALLER, PROTOCOL, PKTLEN, MT, HOOK, IFNAME

# With bpftrace - trace kfree_skb (the function called when packets are dropped)
sudo bpftrace -e '
kprobe:kfree_skb {
    @[kstack] = count();
}
interval:s:10 {
    printf("Packet drops by kernel location:\n");
    print(@);
    clear(@);
}'
```

## Connection Tracking Monitoring

```bash
# Monitor connection state changes with BCC
sudo /usr/share/bcc/tools/tcpstates-bpfcc
# Shows: SKADDR  C-PID  C-COMM  LADDR  LPORT  RADDR  RPORT  OLDSTATE  NEWSTATE  MS

# Count connections by state
sudo bpftrace -e '
#include <net/tcp_states.h>
tracepoint:sock:inet_sock_set_state
/args->protocol == IPPROTO_TCP/
{
    @[tcp_states[args->newstate]] = count();
}
interval:s:5 { print(@); clear(@); }'
```

eBPF represents a fundamental shift in how we observe Linux systems - instead of adding overhead to measure performance, you get kernel-level visibility with near-zero cost. The tools covered here give you a foundation for building sophisticated network monitoring without instrumenting applications.
