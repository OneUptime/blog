# How to use eBPF XDP for DDoS protection at network edge

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: eBPF, XDP, Security, DDoS, Networking

Description: Implement eBPF XDP programs for high-performance DDoS protection at the network edge including rate limiting, packet filtering, SYN flood protection, and integration with Kubernetes for cluster defense.

---

XDP (eXpress Data Path) enables eBPF programs to process packets at the earliest possible point in the Linux network stack, right after they arrive from the network card. This makes XDP perfect for DDoS protection because you can drop malicious packets before they consume CPU cycles or memory in the kernel. Processing millions of packets per second becomes feasible, giving you protection at line rate.

## Understanding XDP for DDoS Mitigation

Traditional DDoS protection operates in user space or in the kernel's network stack. By the time iptables or netfilter see a packet, the kernel has already allocated sk_buff structures and performed initial processing. Under a large-scale DDoS attack, this overhead alone can overwhelm the system.

XDP hooks into the network driver before any memory allocation. Your eBPF program receives a pointer to the packet data and must decide immediately: pass, drop, or redirect. This minimal overhead allows a single CPU core to process millions of packets per second.

XDP programs return one of five verdicts:
- `XDP_DROP`: Drop the packet immediately
- `XDP_PASS`: Send to normal network stack
- `XDP_TX`: Bounce back on same interface
- `XDP_REDIRECT`: Send to another interface
- `XDP_ABORTED`: Drop with error

## Implementing SYN Flood Protection

SYN floods exhaust server resources by opening incomplete TCP connections. Here's an XDP program that rate-limits SYN packets per source IP:

```c
#include <linux/bpf.h>
#include <linux/if_ether.h>
#include <linux/ip.h>
#include <linux/tcp.h>
#include <linux/in.h>
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_endian.h>

#define MAX_ENTRIES 10000
#define SYN_RATE_LIMIT 100  // SYN packets per second per IP

struct syn_tracker {
    __u64 timestamp;
    __u32 count;
};

struct {
    __uint(type, BPF_MAP_TYPE_LRU_HASH);
    __uint(max_entries, MAX_ENTRIES);
    __type(key, __u32);  // Source IP
    __type(value, struct syn_tracker);
} syn_flood_map SEC(".maps");

static __always_inline int parse_tcp(void *data, void *data_end,
                                     struct iphdr **iph, struct tcphdr **tcph) {
    struct ethhdr *eth = data;

    if ((void *)(eth + 1) > data_end)
        return -1;

    if (eth->h_proto != bpf_htons(ETH_P_IP))
        return -1;

    *iph = (void *)(eth + 1);
    if ((void *)(*iph + 1) > data_end)
        return -1;

    if ((*iph)->protocol != IPPROTO_TCP)
        return -1;

    *tcph = (void *)(*iph) + sizeof(struct iphdr);
    if ((void *)(*tcph + 1) > data_end)
        return -1;

    return 0;
}

SEC("xdp")
int xdp_syn_flood_protect(struct xdp_md *ctx) {
    void *data_end = (void *)(long)ctx->data_end;
    void *data = (void *)(long)ctx->data;

    struct iphdr *iph;
    struct tcphdr *tcph;

    if (parse_tcp(data, data_end, &iph, &tcph) < 0)
        return XDP_PASS;

    // Only process SYN packets (without ACK)
    if (!(tcph->syn && !tcph->ack))
        return XDP_PASS;

    __u32 src_ip = iph->saddr;
    __u64 now = bpf_ktime_get_ns();

    struct syn_tracker *tracker = bpf_map_lookup_elem(&syn_flood_map, &src_ip);

    if (tracker) {
        __u64 elapsed = now - tracker->timestamp;

        // Reset counter if more than 1 second has passed
        if (elapsed > 1000000000ULL) {
            tracker->timestamp = now;
            tracker->count = 1;
            return XDP_PASS;
        }

        // Check if rate limit exceeded
        if (tracker->count >= SYN_RATE_LIMIT) {
            // Log dropped SYN (optional, impacts performance)
            // bpf_printk("Dropping SYN from %pI4", &src_ip);
            return XDP_DROP;
        }

        tracker->count++;
    } else {
        // New source IP
        struct syn_tracker new_tracker = {
            .timestamp = now,
            .count = 1
        };
        bpf_map_update_elem(&syn_flood_map, &src_ip, &new_tracker, BPF_ANY);
    }

    return XDP_PASS;
}

char _license[] SEC("license") = "GPL";
```

Compile and load the program:

```bash
# Compile
clang -O2 -g -target bpf -c xdp_syn_flood.c -o xdp_syn_flood.o

# Load onto interface
ip link set dev eth0 xdp obj xdp_syn_flood.o sec xdp

# Verify it's attached
ip link show dev eth0
# Should show: prog/xdp id XXX
```

## Implementing UDP Flood Protection

UDP floods don't require connection setup, making them simpler to execute. Protect against them with per-source rate limiting:

```c
#include <linux/bpf.h>
#include <linux/if_ether.h>
#include <linux/ip.h>
#include <linux/udp.h>
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_endian.h>

#define UDP_RATE_LIMIT_PPS 1000  // Packets per second
#define TIME_WINDOW_NS 1000000000ULL

struct rate_limit {
    __u64 last_reset;
    __u32 pkt_count;
};

struct {
    __uint(type, BPF_MAP_TYPE_LRU_HASH);
    __uint(max_entries, 100000);
    __type(key, __u32);  // Source IP
    __type(value, struct rate_limit);
} udp_rate_limiter SEC(".maps");

struct {
    __uint(type, BPF_MAP_TYPE_PERCPU_ARRAY);
    __uint(max_entries, 1);
    __type(key, __u32);
    __type(value, __u64);  // Dropped packet counter
} drop_stats SEC(".maps");

SEC("xdp")
int xdp_udp_flood_protect(struct xdp_md *ctx) {
    void *data_end = (void *)(long)ctx->data_end;
    void *data = (void *)(long)ctx->data;

    struct ethhdr *eth = data;
    if ((void *)(eth + 1) > data_end)
        return XDP_PASS;

    if (eth->h_proto != bpf_htons(ETH_P_IP))
        return XDP_PASS;

    struct iphdr *iph = (void *)(eth + 1);
    if ((void *)(iph + 1) > data_end)
        return XDP_PASS;

    if (iph->protocol != IPPROTO_UDP)
        return XDP_PASS;

    __u32 src_ip = iph->saddr;
    __u64 now = bpf_ktime_get_ns();

    struct rate_limit *limit = bpf_map_lookup_elem(&udp_rate_limiter, &src_ip);

    if (limit) {
        if (now - limit->last_reset > TIME_WINDOW_NS) {
            // Reset window
            limit->last_reset = now;
            limit->pkt_count = 1;
            return XDP_PASS;
        }

        if (limit->pkt_count >= UDP_RATE_LIMIT_PPS) {
            // Increment drop counter
            __u32 key = 0;
            __u64 *drops = bpf_map_lookup_elem(&drop_stats, &key);
            if (drops)
                __sync_fetch_and_add(drops, 1);

            return XDP_DROP;
        }

        limit->pkt_count++;
    } else {
        struct rate_limit new_limit = {
            .last_reset = now,
            .pkt_count = 1
        };
        bpf_map_update_elem(&udp_rate_limiter, &src_ip, &new_limit, BPF_ANY);
    }

    return XDP_PASS;
}

char _license[] SEC("license") = "GPL";
```

## Creating a Packet Size Filter

Filter packets based on size to block amplification attacks:

```c
SEC("xdp")
int xdp_size_filter(struct xdp_md *ctx) {
    void *data_end = (void *)(long)ctx->data_end;
    void *data = (void *)(long)ctx->data;

    __u32 pkt_size = data_end - data;

    // Drop jumbo packets (possible amplification attack)
    if (pkt_size > 1500) {
        return XDP_DROP;
    }

    // Drop packets smaller than minimum Ethernet frame
    if (pkt_size < 64) {
        return XDP_DROP;
    }

    return XDP_PASS;
}
```

## Blocking Specific Source Networks

Block traffic from known malicious networks using CIDR-based filtering:

```c
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 10000);
    __type(key, __u32);  // Network address
    __type(value, __u32);  // Netmask
} blacklist SEC(".maps");

SEC("xdp")
int xdp_blacklist(struct xdp_md *ctx) {
    void *data_end = (void *)(long)ctx->data_end;
    void *data = (void *)(long)ctx->data;

    struct ethhdr *eth = data;
    if ((void *)(eth + 1) > data_end)
        return XDP_PASS;

    if (eth->h_proto != bpf_htons(ETH_P_IP))
        return XDP_PASS;

    struct iphdr *iph = (void *)(eth + 1);
    if ((void *)(iph + 1) > data_end)
        return XDP_PASS;

    __u32 src_ip = iph->saddr;

    // Check against all blacklisted networks
    __u32 *mask;
    __u32 network;

    bpf_for_each_map_elem(&blacklist, check_blacklist, &src_ip, 0);

    return XDP_PASS;
}
```

Manage blacklist from user space:

```c
#include <stdio.h>
#include <arpa/inet.h>
#include <bpf/libbpf.h>
#include <bpf/bpf.h>

void add_to_blacklist(int map_fd, const char *cidr) {
    char ip_str[16];
    int prefix_len;

    sscanf(cidr, "%[^/]/%d", ip_str, &prefix_len);

    struct in_addr addr;
    inet_pton(AF_INET, ip_str, &addr);

    __u32 network = ntohl(addr.s_addr);
    __u32 mask = (~0U) << (32 - prefix_len);
    network &= mask;

    bpf_map_update_elem(map_fd, &network, &mask, BPF_ANY);
    printf("Added %s to blacklist\n", cidr);
}

int main() {
    int map_fd = bpf_obj_get("/sys/fs/bpf/xdp/blacklist");

    // Add malicious networks
    add_to_blacklist(map_fd, "192.0.2.0/24");
    add_to_blacklist(map_fd, "198.51.100.0/24");

    return 0;
}
```

## Deploying XDP in Kubernetes

Create a DaemonSet to deploy XDP programs on all nodes:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: xdp-ddos-protection
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: xdp-ddos
  template:
    metadata:
      labels:
        app: xdp-ddos
    spec:
      hostNetwork: true
      hostPID: true
      containers:
      - name: xdp-loader
        image: alpine:3.18
        securityContext:
          privileged: true
        command:
        - sh
        - -c
        - |
          apk add --no-cache clang llvm iproute2 linux-headers

          # Load XDP program
          ip link set dev eth0 xdp obj /xdp/syn_flood.o sec xdp

          # Keep container running
          sleep infinity
        volumeMounts:
        - name: xdp-programs
          mountPath: /xdp
        - name: bpf-maps
          mountPath: /sys/fs/bpf
      volumes:
      - name: xdp-programs
        configMap:
          name: xdp-programs
      - name: bpf-maps
        hostPath:
          path: /sys/fs/bpf
```

## Monitoring XDP Performance

Track XDP statistics:

```bash
# View XDP statistics
ip -s link show dev eth0

# Check drop counters
bpftool map dump name drop_stats

# Monitor in real-time
watch -n 1 'ip -s link show dev eth0 | grep -A 1 XDP'
```

Export metrics to Prometheus:

```python
#!/usr/bin/env python3
from bcc import BPF
from prometheus_client import start_http_server, Counter
import time

# Prometheus metrics
xdp_drops = Counter('xdp_packets_dropped_total', 'Total XDP dropped packets')
xdp_passes = Counter('xdp_packets_passed_total', 'Total XDP passed packets')

# Load BPF program
b = BPF(src_file="xdp_syn_flood.c")

# Start Prometheus exporter
start_http_server(8000)

print("Exporting XDP metrics on :8000")

while True:
    try:
        # Read and export stats
        time.sleep(10)
    except KeyboardInterrupt:
        break
```

## Testing DDoS Protection

Simulate attacks to test your XDP programs:

```bash
# Install hping3 for testing
apt-get install hping3

# Test SYN flood protection
hping3 -S -p 80 --flood --rand-source <TARGET_IP>

# Test UDP flood protection
hping3 -2 -p 53 --flood --rand-source <TARGET_IP>

# Monitor drops
watch -n 1 'bpftool map dump name syn_flood_map | head -20'
```

Use legitimate traffic generators to verify false positive rates:

```bash
# Generate normal TCP connections
ab -n 10000 -c 100 http://<TARGET_IP>/

# Check if legitimate traffic passes through
curl -v http://<TARGET_IP>/
```

XDP provides unprecedented performance for DDoS protection, processing packets at line rate before they can impact the system. By implementing rate limiting, blacklisting, and protocol-specific protections directly in the kernel with eBPF, you can defend against massive attacks while maintaining low latency for legitimate traffic.
