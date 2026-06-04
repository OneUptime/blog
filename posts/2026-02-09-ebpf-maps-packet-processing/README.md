# How to use eBPF maps for efficient packet processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: eBPF, Networking, Linux, Performance, Kernel

Description: Master eBPF maps for high-performance packet processing with practical examples of hash maps, arrays, per-CPU maps, and LRU caches to build efficient network monitoring and filtering tools.

---

eBPF maps are the foundation of stateful packet processing in the Linux kernel. They provide a way to share data between eBPF programs and user space, enabling sophisticated network monitoring, filtering, and acceleration. Understanding how to effectively use different map types is crucial for building high-performance networking tools.

## Understanding eBPF Map Types

eBPF provides several map types, each optimized for different use cases. The most common types for packet processing are hash maps for connection tracking, arrays for fast lookups, per-CPU maps for lock-free aggregation, and LRU maps for automatic memory management.

Hash maps (`BPF_MAP_TYPE_HASH`) work like traditional hash tables. They're perfect for tracking connections or sessions where you need average O(1) lookup by key. Arrays (`BPF_MAP_TYPE_ARRAY`) use integer indices and provide very fast lookup, ideal for counters or configuration data.

Per-CPU maps create a separate value slot for each possible logical CPU, eliminating lock contention during updates. LRU maps automatically evict the least recently used entries when the map reaches capacity, solving memory management problems in long-running programs.

## Creating a Connection Tracking Map

Here's a practical example of using hash maps to track TCP connections:

```c
#include <linux/bpf.h>
#include <linux/if_ether.h>
#include <linux/ip.h>
#include <linux/tcp.h>
#include <bpf/bpf_helpers.h>

// Connection tracking key
struct conn_key {
    __u32 saddr;
    __u32 daddr;
    __u16 sport;
    __u16 dport;
    __u8 protocol;
};

// Connection statistics value
struct conn_stats {
    __u64 packets;
    __u64 bytes;
    __u64 first_seen;
    __u64 last_seen;
};

// Define the map
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 1000000);
    __type(key, struct conn_key);
    __type(value, struct conn_stats);
} conn_tracker SEC(".maps");

SEC("xdp")
int track_connections(struct xdp_md *ctx) {
    void *data = (void *)(long)ctx->data;
    void *data_end = (void *)(long)ctx->data_end;

    // Parse Ethernet header
    struct ethhdr *eth = data;
    if ((void *)(eth + 1) > data_end)
        return XDP_PASS;

    if (eth->h_proto != __constant_htons(ETH_P_IP))
        return XDP_PASS;

    // Parse IP header
    struct iphdr *ip = data + sizeof(*eth);
    if ((void *)(ip + 1) > data_end)
        return XDP_PASS;

    if (ip->protocol != IPPROTO_TCP)
        return XDP_PASS;

    // Parse TCP header
    struct tcphdr *tcp = (void *)ip + sizeof(*ip);
    if ((void *)(tcp + 1) > data_end)
        return XDP_PASS;

    // Build connection key
    struct conn_key key = {
        .saddr = ip->saddr,
        .daddr = ip->daddr,
        .sport = tcp->source,
        .dport = tcp->dest,
        .protocol = ip->protocol
    };

    // Lookup or create connection entry
    struct conn_stats *stats = bpf_map_lookup_elem(&conn_tracker, &key);
    __u64 now = bpf_ktime_get_ns();

    if (stats) {
        // Update existing connection
        __sync_fetch_and_add(&stats->packets, 1);
        __sync_fetch_and_add(&stats->bytes, data_end - data);
        stats->last_seen = now;
    } else {
        // Create new connection entry
        struct conn_stats new_stats = {
            .packets = 1,
            .bytes = data_end - data,
            .first_seen = now,
            .last_seen = now
        };
        bpf_map_update_elem(&conn_tracker, &key, &new_stats, BPF_ANY);
    }

    return XDP_PASS;
}

char _license[] SEC("license") = "GPL";
```

This program tracks TCP flows passing through the interface. It uses atomic operations for counters to ensure correctness even when multiple packets from the same flow arrive on different CPU cores. For production flow tracking, parse `ip->ihl` instead of assuming a 20-byte IPv4 header, and decide how to handle fragmented packets.

## Using Per-CPU Maps for High-Performance Aggregation

Per-CPU maps eliminate lock contention by giving each possible logical CPU its own value slot. Here's how to use them for packet statistics:

```c
#include <linux/bpf.h>
#include <bpf/bpf_helpers.h>

struct packet_stats {
    __u64 rx_packets;
    __u64 rx_bytes;
    __u64 tx_packets;
    __u64 tx_bytes;
};

struct {
    __uint(type, BPF_MAP_TYPE_PERCPU_ARRAY);
    __uint(max_entries, 1);
    __type(key, __u32);
    __type(value, struct packet_stats);
} stats_map SEC(".maps");

SEC("xdp")
int count_packets(struct xdp_md *ctx) {
    __u32 key = 0;
    struct packet_stats *stats;

    stats = bpf_map_lookup_elem(&stats_map, &key);
    if (!stats)
        return XDP_PASS;

    // No atomic operations needed - each CPU has its own copy
    stats->rx_packets++;
    stats->rx_bytes += (ctx->data_end - ctx->data);

    return XDP_PASS;
}
```

When you read this map from user space, you get an array of values, one per CPU. You need to aggregate them yourself:

```c
#include <stdio.h>
#include <stdlib.h>
#include <bpf/bpf.h>
#include <bpf/libbpf.h>

void read_percpu_stats(int map_fd) {
    __u32 key = 0;
    int nr_cpus = libbpf_num_possible_cpus();

    if (nr_cpus < 0) {
        fprintf(stderr, "libbpf_num_possible_cpus failed: %d\n", nr_cpus);
        return;
    }

    struct packet_stats values[nr_cpus];

    if (bpf_map_lookup_elem(map_fd, &key, values) != 0) {
        perror("bpf_map_lookup_elem");
        return;
    }

    // Aggregate across all CPUs
    __u64 total_packets = 0;
    __u64 total_bytes = 0;

    for (int i = 0; i < nr_cpus; i++) {
        total_packets += values[i].rx_packets;
        total_bytes += values[i].rx_bytes;
    }

    printf("Total packets: %llu\n", (unsigned long long)total_packets);
    printf("Total bytes: %llu\n", (unsigned long long)total_bytes);
}
```

Per-CPU maps can be orders of magnitude faster than regular maps when you have high update rates, because there's no synchronization overhead between CPUs.

## Implementing Rate Limiting with LRU Maps

LRU maps are perfect for rate limiting because they automatically evict old entries:

```c
#include <linux/bpf.h>
#include <linux/if_ether.h>
#include <linux/ip.h>
#include <bpf/bpf_helpers.h>

#define RATE_LIMIT_PPS 1000  // Packets per second
#define TIME_WINDOW_NS 1000000000  // 1 second in nanoseconds

struct rate_limit_key {
    __u32 src_ip;
    __u64 window;
};

struct {
    __uint(type, BPF_MAP_TYPE_LRU_HASH);
    __uint(max_entries, 10000);
    __type(key, struct rate_limit_key);
    __type(value, __u64);  // Packet count
} rate_limiter SEC(".maps");

SEC("xdp")
int rate_limit_by_ip(struct xdp_md *ctx) {
    void *data = (void *)(long)ctx->data;
    void *data_end = (void *)(long)ctx->data_end;

    struct ethhdr *eth = data;
    if ((void *)(eth + 1) > data_end)
        return XDP_PASS;

    if (eth->h_proto != __constant_htons(ETH_P_IP))
        return XDP_PASS;

    struct iphdr *ip = data + sizeof(*eth);
    if ((void *)(ip + 1) > data_end)
        return XDP_PASS;

    __u64 now = bpf_ktime_get_ns();
    struct rate_limit_key key = {
        .src_ip = ip->saddr,
        .window = now / TIME_WINDOW_NS,
    };

    __u64 *count = bpf_map_lookup_elem(&rate_limiter, &key);

    if (count) {
        __u64 old_count = __sync_fetch_and_add(count, 1);

        if (old_count >= RATE_LIMIT_PPS)
            return XDP_DROP;
    } else {
        // New source IP for this time window
        __u64 initial_count = 1;
        if (bpf_map_update_elem(&rate_limiter, &key, &initial_count, BPF_NOEXIST) != 0) {
            count = bpf_map_lookup_elem(&rate_limiter, &key);
            if (count) {
                __u64 old_count = __sync_fetch_and_add(count, 1);

                if (old_count >= RATE_LIMIT_PPS)
                    return XDP_DROP;
            }
        }
    }

    return XDP_PASS;
}
```

The LRU behavior means inactive source IP and time-window entries automatically drop out of the map, preventing memory exhaustion during attacks with many different source addresses.

## Using Array Maps for Configuration

Array maps are perfect for storing configuration that your eBPF program reads:

```c
#include <linux/bpf.h>
#include <bpf/bpf_helpers.h>

#define CONFIG_ENABLE_LOGGING 0
#define CONFIG_LOG_LEVEL 1
#define CONFIG_MAX_PACKET_SIZE 2

struct {
    __uint(type, BPF_MAP_TYPE_ARRAY);
    __uint(max_entries, 16);
    __type(key, __u32);
    __type(value, __u32);
} config_map SEC(".maps");

static inline __u32 get_config(__u32 key, __u32 default_value) {
    __u32 *value = bpf_map_lookup_elem(&config_map, &key);
    return value ? *value : default_value;
}

SEC("xdp")
int configurable_filter(struct xdp_md *ctx) {
    __u32 max_size = get_config(CONFIG_MAX_PACKET_SIZE, 1500);
    __u32 packet_size = ctx->data_end - ctx->data;

    if (packet_size > max_size) {
        // Log if enabled
        if (get_config(CONFIG_ENABLE_LOGGING, 0)) {
            bpf_printk("Dropped oversized packet: %u bytes", packet_size);
        }
        return XDP_DROP;
    }

    return XDP_PASS;
}
```

You can update configuration from user space without reloading the eBPF program:

```c
void update_config(int map_fd, __u32 key, __u32 value) {
    if (bpf_map_update_elem(map_fd, &key, &value, BPF_ANY) != 0) {
        perror("Failed to update config");
    }
}

// Enable logging
update_config(config_fd, CONFIG_ENABLE_LOGGING, 1);

// Change max packet size
update_config(config_fd, CONFIG_MAX_PACKET_SIZE, 9000);
```

## Sharing Data Between Multiple eBPF Programs

You can use map-in-map to share data between different eBPF programs:

```c
struct inner_map {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 1000);
    __type(key, __u32);
    __type(value, __u64);
} shared_stats SEC(".maps");

struct {
    __uint(type, BPF_MAP_TYPE_ARRAY_OF_MAPS);
    __uint(max_entries, 10);
    __type(key, __u32);
    __array(values, struct inner_map);
} outer_map SEC(".maps") = {
    .values = {
        [0] = &shared_stats,
    },
};

SEC("xdp")
int program_a(struct xdp_md *ctx) {
    __u32 outer_key = 0;
    void *inner_map = bpf_map_lookup_elem(&outer_map, &outer_key);

    if (!inner_map)
        return XDP_PASS;

    __u32 inner_key = 123;
    __u64 *value = bpf_map_lookup_elem(inner_map, &inner_key);

    if (value) {
        __sync_fetch_and_add(value, 1);
    }

    return XDP_PASS;
}
```

This pattern is useful when you have multiple programs that need to coordinate, like XDP programs on different interfaces sharing connection state.

## Memory Management Best Practices

Always check map operations for errors. In the kernel context, memory allocation can fail:

```c
struct conn_stats *stats = bpf_map_lookup_elem(&conn_tracker, &key);
if (!stats) {
    // Map lookup failed or entry doesn't exist
    struct conn_stats new_stats = {0};

    // BPF_NOEXIST ensures we don't overwrite existing entries
    int ret = bpf_map_update_elem(&conn_tracker, &key, &new_stats, BPF_NOEXIST);
    if (ret != 0) {
        // Update failed - might be out of memory or concurrent insert
        // Decide how to handle: drop packet, log error, etc.
        return XDP_DROP;
    }
}
```

Size your maps appropriately. Larger maps use more memory, but too-small maps fill up quickly. Monitor map utilization from user space and adjust `max_entries` based on actual usage patterns.

eBPF maps are powerful primitives that enable sophisticated packet processing directly in the kernel. By choosing the right map type for your use case and following best practices for memory management and synchronization, you can build high-performance networking tools that scale to millions of packets per second.
