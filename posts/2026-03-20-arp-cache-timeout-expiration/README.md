# How to Understand ARP Cache Timeout and Expiration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, ARP, Linux, IPv4

Description: Learn how ARP cache entries expire on Linux, how timeouts are configured, and how to tune them for your network.

## ARP Cache Entry Lifecycle

ARP cache entries do not last forever. Linux can move entries through several states:

```text
INCOMPLETE → REACHABLE → STALE → DELAY → PROBE → FAILED
```

| State | Description | Typical Timing / Trigger |
|-------|-------------|-----------------|
| REACHABLE | Recently confirmed | randomized around `base_reachable_time_ms` (15–45s by default) |
| STALE | Valid but not verified recently | no fixed timeout; revalidated on use |
| DELAY | Waiting before probing | delay_first_probe_time (~5s) |
| PROBE | Reconfirming reachability | retrans_time_ms × ucast_solicit |
| FAILED | Neighbor validation failed | after the probe budget is exhausted |

## Key Kernel Parameters

```bash
# View ARP cache timing parameters

sysctl -a | grep neigh.default

# Key parameters:
# net.ipv4.neigh.default.base_reachable_time_ms = 30000
# net.ipv4.neigh.default.gc_stale_time = 60
# net.ipv4.neigh.default.delay_first_probe_time = 5
# net.ipv4.neigh.default.retrans_time_ms = 1000
# net.ipv4.neigh.default.ucast_solicit = 3
# net.ipv4.neigh.default.mcast_solicit = 3
```

## Understanding Each Parameter

### `base_reachable_time_ms`

The base time (in milliseconds) an entry stays REACHABLE. The actual value is randomized between 50%–150% of this value to prevent ARP synchronization:

```bash
sysctl net.ipv4.neigh.default.base_reachable_time_ms
# Default: 30000 (30 seconds)
```

### `gc_stale_time`

How often (in seconds) the kernel checks for stale neighbor entries. When an entry is stale, Linux resolves it again before sending data to it:

```bash
sysctl net.ipv4.neigh.default.gc_stale_time
# Default: 60 seconds
```

### `delay_first_probe_time`

Seconds to wait in DELAY state before sending the first probe:

```bash
sysctl net.ipv4.neigh.default.delay_first_probe_time
# Default: 5 seconds
```

### `ucast_solicit`

Number of unicast ARP probes Linux sends in PROBE state while reconfirming a known neighbor:

```bash
sysctl net.ipv4.neigh.default.ucast_solicit
# Default: 3
```

## Tuning ARP Cache Parameters

### Tune Reachability and Stale-Entry Checks

For stable environments where MAC addresses rarely change:

```bash
# Increase reachable time to 5 minutes
sudo sysctl -w net.ipv4.neigh.default.base_reachable_time_ms=300000

# Adjust how often the kernel checks for stale neighbor entries
sudo sysctl -w net.ipv4.neigh.default.gc_stale_time=120
```

### Persist Changes in `/etc/sysctl.conf`

```bash
sudo tee -a /etc/sysctl.conf > /dev/null << 'EOF'
net.ipv4.neigh.default.base_reachable_time_ms = 300000
net.ipv4.neigh.default.gc_stale_time = 120
EOF
sudo sysctl -p
```

### Per-Interface Tuning

```bash
# Set reachable time for eth0 only
sudo sysctl -w net.ipv4.neigh.eth0.base_reachable_time_ms=60000
```

## Garbage Collection Parameters

Linux also has GC (Garbage Collection) thresholds for the ARP table size:

```bash
sysctl net.ipv4.neigh.default.gc_thresh1  # Minimum entries to keep
sysctl net.ipv4.neigh.default.gc_thresh2  # Soft threshold; GC becomes more aggressive
sysctl net.ipv4.neigh.default.gc_thresh3  # Maximum non-permanent entries
```

For large networks (e.g., /22 or bigger):

```bash
sudo sysctl -w net.ipv4.neigh.default.gc_thresh1=1024
sudo sysctl -w net.ipv4.neigh.default.gc_thresh2=2048
sudo sysctl -w net.ipv4.neigh.default.gc_thresh3=4096
```

## Key Takeaways

- REACHABLE entries transition to STALE after a randomized interval based on `base_reachable_time_ms` (15–45 seconds by default) if there is no positive feedback.
- STALE entries are revalidated on use; `gc_stale_time` controls how often the kernel checks for stale neighbors.
- `gc_thresh1`, `gc_thresh2`, and `gc_thresh3` control ARP cache garbage collection behavior and capacity.
- Increase thresholds on routers or hypervisors with many neighbors to prevent ARP cache overflow.

**Related Reading:**

- [How to View the ARP Table on Linux](https://oneuptime.com/blog/post/2026-03-20-view-arp-table-linux/view)
- [How to Set ARP Cache Timeouts on Linux](https://oneuptime.com/blog/post/2026-03-20-set-arp-cache-timeouts-linux/view)
- [How to Troubleshoot ARP Resolution Failures](https://oneuptime.com/blog/post/2026-03-20-troubleshoot-arp-resolution/view)
