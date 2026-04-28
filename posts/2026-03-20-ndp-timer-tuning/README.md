# How to Tune NDP Timers for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, NDP, Timer, Performance, Sysctl, Linux, Networking

Description: Tune NDP timers and neighbor cache parameters on Linux for optimal IPv6 performance including reachability, cache size, and garbage collection.

## NDP Timer Reference

| Timer | sysctl | Default | Description |
|---|---|---|---|
| Reachability time | `base_reachable_time_ms` | 30000ms | How long to consider neighbor REACHABLE |
| Retransmit time | `retrans_time_ms` | 1000ms | NS retransmit interval |
| Delay before probe | `delay_first_probe_time` | 5s | STALE → DELAY time |
| Unicast solicits | `ucast_solicit` | 3 | Probes before declaring FAILED |
| Multicast solicits | `mcast_solicit` | 3 | Mcast probes for new resolution |
| GC interval | `gc_interval` | 30s | Neighbor table GC frequency |
| GC staletime | `gc_stale_time` | 60s | Max time without update before GC |

## Viewing Current Timer Values

```bash
# Show all NDP timers for an interface

sysctl net.ipv6.neigh.eth0

# Key timers
sysctl net.ipv6.neigh.eth0.base_reachable_time_ms
sysctl net.ipv6.neigh.eth0.retrans_time_ms
sysctl net.ipv6.neigh.eth0.delay_first_probe_time
sysctl net.ipv6.neigh.eth0.ucast_solicit
sysctl net.ipv6.neigh.eth0.mcast_solicit

# Global cache limits
sysctl net.ipv6.neigh.default.gc_thresh1  # No GC below this
sysctl net.ipv6.neigh.default.gc_thresh2  # GC starts here
sysctl net.ipv6.neigh.default.gc_thresh3  # Hard limit
```

## Tuning for Different Scenarios

### Scenario 1: Data Center (High Performance)

```bash
# Data center: fast detection, large cache
cat > /etc/sysctl.d/99-ndp-datacenter.conf << 'EOF'
# Faster reachability detection
net.ipv6.neigh.default.base_reachable_time_ms = 15000
net.ipv6.neigh.default.retrans_time_ms = 1000
net.ipv6.neigh.default.delay_first_probe_time = 3
net.ipv6.neigh.default.ucast_solicit = 3

# Large neighbor cache for data center (many servers)
net.ipv6.neigh.default.gc_thresh1 = 4096
net.ipv6.neigh.default.gc_thresh2 = 8192
net.ipv6.neigh.default.gc_thresh3 = 16384
EOF
sysctl -p /etc/sysctl.d/99-ndp-datacenter.conf
```

### Scenario 2: Wireless/Mobile (Battery-Conscious)

```bash
# Wireless: less frequent probing to save battery
cat > /etc/sysctl.d/99-ndp-wireless.conf << 'EOF'
# Less aggressive probing
net.ipv6.neigh.default.base_reachable_time_ms = 60000
net.ipv6.neigh.default.retrans_time_ms = 2000
net.ipv6.neigh.default.delay_first_probe_time = 10
net.ipv6.neigh.default.ucast_solicit = 2

# Smaller cache for constrained devices
net.ipv6.neigh.default.gc_thresh1 = 512
net.ipv6.neigh.default.gc_thresh2 = 1024
net.ipv6.neigh.default.gc_thresh3 = 2048
EOF
```

### Scenario 3: Router with Many Neighbors

```bash
# High-density router: large cache, aggressive GC
cat > /etc/sysctl.d/99-ndp-router.conf << 'EOF'
# Large neighbor table
net.ipv6.neigh.default.gc_thresh1 = 32768
net.ipv6.neigh.default.gc_thresh2 = 65536
net.ipv6.neigh.default.gc_thresh3 = 131072

# Faster GC to prevent table overflow
net.ipv6.neigh.default.gc_interval = 15
net.ipv6.neigh.default.gc_stale_time = 30
EOF
```

## Neighbor Cache Size Monitoring

```bash
# Current neighbor table size
ip -6 neigh show | wc -l

# Show neighbor table statistics
ip -6 neigh show | awk '{print $NF}' | sort | uniq -c
# Output: count per state (REACHABLE, STALE, FAILED, etc.)

# Check if approaching gc_thresh2 (GC kicks in)
CURRENT=$(ip -6 neigh show | wc -l)
THRESH2=$(sysctl -n net.ipv6.neigh.default.gc_thresh2)
echo "Cache: ${CURRENT}/${THRESH2} entries ($(( CURRENT * 100 / THRESH2 ))%)"

# Monitor cache over time
watch -n 5 "echo 'IPv6 neighbors:'; ip -6 neigh show | awk '{print \$NF}' | sort | uniq -c"
```

## RA-Announced Timer Values

Routers can announce recommended timer values in Router Advertisements:

```text
# /etc/radvd.conf - Set RA-announced timer values
interface eth0 {
    AdvSendAdvert on;

    # Announced reachable time in ms; hosts randomize 0.5x-1.5x per RFC 4861
    AdvReachableTime 15000;    # ms - hint for hosts

    # Announce retransmit timer
    AdvRetransTimer 1000;      # ms

    prefix 2001:db8:1::/64 {
        AdvOnLink on;
        AdvAutonomous on;
    };
};
```

## Diagnosing Timer Issues

```bash
# Check if NDP probing is causing performance issues
# High NS rate suggests cache thrashing
tcpdump -i eth0 -n 'icmp6 and ip6[40]==135' | \
    awk '{count++} END {print count " NS in capture period"}'

# Monitor state transitions (should be smooth)
ip monitor neigh dev eth0 | head -20

# Check for FAILED entries (unreachable neighbors)
ip -6 neigh show nud failed | head -20

# Flush FAILED entries to reclaim space
ip -6 neigh flush nud failed dev eth0
```

## Conclusion

NDP timer tuning balances three competing goals: fast failure detection (smaller timers), reduced network overhead (larger timers), and cache efficiency (appropriate thresholds). Data centers benefit from larger caches (`gc_thresh3=16384+`) and moderate timers. Mobile devices benefit from conservative probing. Routers in large L2 networks should increase `gc_thresh3` significantly and reduce `gc_stale_time`. Monitor cache size regularly and alert if approaching `gc_thresh2`, which triggers GC and may cause brief forwarding delays.
