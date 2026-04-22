# How to Set ARP Cache Timeouts on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, ARP, Linux, Performance, Tuning

Description: Learn how to configure ARP cache timeouts on Linux using sysctl parameters to optimize ARP behavior for your network.

## Default ARP Cache Behavior

Linux uses the neighbor cache subsystem and Neighbor Unreachability Detection (NUD) states to manage ARP cache entries. The key timing and garbage-collection parameters are controlled via `sysctl`:

```bash
# View common ARP/neighbor settings

sysctl -a | grep -E '^net\.ipv4\.neigh\.default\.(base_reachable|gc_stale|delay|retrans|ucast_solicit|mcast_solicit|gc_thresh)'
```

For timing parameters, the `default` values are inherited by newly created interfaces. For an interface that already exists, use the per-interface form shown below.

Typical defaults:

```text
net.ipv4.neigh.default.base_reachable_time_ms = 30000    # 30 seconds
net.ipv4.neigh.default.gc_stale_time = 60                # 60 seconds
net.ipv4.neigh.default.delay_first_probe_time = 5        # 5 seconds
net.ipv4.neigh.default.retrans_time_ms = 1000            # 1 second
net.ipv4.neigh.default.ucast_solicit = 3                 # 3 unicast probes
net.ipv4.neigh.default.mcast_solicit = 3                 # 3 multicast probes
```

## State Lifecycle and Timeouts

```text
NONE → INCOMPLETE → REACHABLE → STALE → DELAY → PROBE → FAILED
                      ↑ randomized from base_reachable_time_ms
                               ↑ packet sent to a STALE entry
                                         ↑ delay_first_probe_time
                                                  ↑ retrans_time_ms × ucast_solicit
```

## Increasing Reachable Time (Fewer Re-ARPs)

For stable networks where MACs rarely change, increase the reachable time:

```bash
# Set the base REACHABLE timer to 5 minutes
sudo sysctl -w net.ipv4.neigh.default.base_reachable_time_ms=300000

# Check stale neighbor entries less often
sudo sysctl -w net.ipv4.neigh.default.gc_stale_time=300
```

The larger reachable timer can reduce ARP revalidation traffic on large networks with stable MAC assignments.

## Decreasing Timeouts (Faster Failover)

For environments where MAC addresses change frequently (e.g., containers, VMs with live migration):

```bash
# Faster probing of changed MACs
sudo sysctl -w net.ipv4.neigh.default.base_reachable_time_ms=5000
sudo sysctl -w net.ipv4.neigh.default.gc_stale_time=15
sudo sysctl -w net.ipv4.neigh.default.delay_first_probe_time=2
sudo sysctl -w net.ipv4.neigh.default.retrans_time_ms=500
sudo sysctl -w net.ipv4.neigh.default.ucast_solicit=2
```

## Tuning ARP Table Size for Large Environments

On routers, hypervisors, or servers with many neighbors:

```bash
# Check current limits
sysctl net.ipv4.neigh.default.gc_thresh1
sysctl net.ipv4.neigh.default.gc_thresh2
sysctl net.ipv4.neigh.default.gc_thresh3

# Increase for large networks
sudo sysctl -w net.ipv4.neigh.default.gc_thresh1=512
sudo sysctl -w net.ipv4.neigh.default.gc_thresh2=2048
sudo sysctl -w net.ipv4.neigh.default.gc_thresh3=4096
```

| Parameter | Default | Meaning |
|-----------|---------|---------|
| gc_thresh1 | 128 | GC won't run below this (entries safe) |
| gc_thresh2 | 512 | GC starts if this is exceeded for 5+ seconds |
| gc_thresh3 | 1024 | Hard limit; GC runs immediately at this point |

## Per-Interface Timeout Configuration

```bash
# Set timeout for eth0 specifically
sudo sysctl -w net.ipv4.neigh.eth0.base_reachable_time_ms=60000
sudo sysctl -w net.ipv4.neigh.eth0.gc_stale_time=120
```

## Making Changes Persistent

```bash
# Add to /etc/sysctl.conf
sudo tee -a /etc/sysctl.conf > /dev/null << 'EOF'
# ARP cache tuning
net.ipv4.neigh.default.base_reachable_time_ms = 300000
net.ipv4.neigh.default.gc_stale_time = 300
net.ipv4.neigh.default.gc_thresh1 = 512
net.ipv4.neigh.default.gc_thresh2 = 2048
net.ipv4.neigh.default.gc_thresh3 = 4096
EOF

sudo sysctl -p
```

## Verifying Current Entry States

```bash
# Watch entry states over time
watch -n 2 'ip neigh show | awk "{print \$1, \$NF}"'
```

## Key Takeaways

- `base_reachable_time_ms` is the base for the randomized REACHABLE timer (default 30s).
- `gc_stale_time` controls how often Linux checks for stale neighbor entries (default 60s).
- Increase timeouts in stable environments to reduce ARP traffic.
- Increase `gc_thresh` values on systems with many neighbors to prevent cache overflow.

**Related Reading:**

- [How to Understand ARP Cache Timeout and Expiration](https://oneuptime.com/blog/post/2026-03-20-arp-cache-timeout-expiration/view)
- [How to View the ARP Table on Linux](https://oneuptime.com/blog/post/2026-03-20-view-arp-table-linux/view)
- [How to Clear the ARP Cache](https://oneuptime.com/blog/post/2026-03-20-clear-arp-cache-linux/view)
