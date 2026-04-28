# How to Configure NDP Parameters on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NDP, Linux Configuration, Sysctl, IPv6, Neighbor Discovery

Description: Configure IPv6 NDP parameters on Linux using sysctl, including neighbor cache timers, router advertisement acceptance, and NUD behavior tuning.

## Introduction

Linux provides extensive NDP configuration via sysctl parameters under `/proc/sys/net/ipv6/`. These control neighbor cache behavior, RA acceptance, DAD configuration, redirect handling, and NUD timing. Understanding these parameters enables fine-tuning NDP for specific deployment requirements such as fast failover, security hardening, or high-traffic environments.

## Key NDP sysctl Parameters

```bash
# View all IPv6 NDP-related parameters for eth0

sysctl -a 2>/dev/null | grep "net.ipv6.neigh.eth0"

# Key parameters (with defaults):
# Neighbor cache timers
cat /proc/sys/net/ipv6/neigh/eth0/base_reachable_time_ms  # 30000 (30s)
cat /proc/sys/net/ipv6/neigh/eth0/delay_first_probe_time  # 5 (seconds)
cat /proc/sys/net/ipv6/neigh/eth0/retrans_time_ms         # 1000 (1s)
cat /proc/sys/net/ipv6/neigh/eth0/ucast_solicit           # 3 (probes)
cat /proc/sys/net/ipv6/neigh/eth0/mcast_solicit           # 3 (probes)

# Neighbor cache size limits
cat /proc/sys/net/ipv6/neigh/default/gc_thresh1  # 128
cat /proc/sys/net/ipv6/neigh/default/gc_thresh2  # 512
cat /proc/sys/net/ipv6/neigh/default/gc_thresh3  # 1024
cat /proc/sys/net/ipv6/neigh/default/gc_stale_time  # 60 (seconds)

# RA acceptance
cat /proc/sys/net/ipv6/conf/eth0/accept_ra         # 1 (accept RA)
cat /proc/sys/net/ipv6/conf/eth0/accept_ra_pinfo   # 1 (process prefix info)
cat /proc/sys/net/ipv6/conf/eth0/accept_ra_rtr_pref # 1 (accept router preference)
cat /proc/sys/net/ipv6/conf/eth0/accept_redirects  # 1 (accept redirects)

# DAD configuration
cat /proc/sys/net/ipv6/conf/eth0/dad_transmits     # 1 (DAD probe count)

# Address autoconfiguration
cat /proc/sys/net/ipv6/conf/eth0/autoconf          # 1 (enable SLAAC)
cat /proc/sys/net/ipv6/conf/eth0/use_tempaddr      # 0 or 2 (privacy extensions)
```

## Tuning for Fast Failover

```bash
# Create sysctl file for fast failover configuration
sudo tee /etc/sysctl.d/99-ipv6-fast-failover.conf << 'EOF'
# Faster NUD: detect failures within ~3-4 seconds instead of ~40 seconds
# Reduce REACHABLE timer: how long a neighbor is considered confirmed
net.ipv6.neigh.eth0.base_reachable_time_ms = 5000

# Reduce DELAY state: shorter wait before starting PROBE
net.ipv6.neigh.eth0.delay_first_probe_time = 1

# Reduce retransmit interval for NUD probes
net.ipv6.neigh.eth0.retrans_time_ms = 500

# Reduce number of unicast probes before FAILED
net.ipv6.neigh.eth0.ucast_solicit = 2

# Also tune the "default" interface (applies to new interfaces)
net.ipv6.neigh.default.base_reachable_time_ms = 5000
net.ipv6.neigh.default.delay_first_probe_time = 1
net.ipv6.neigh.default.retrans_time_ms = 500
net.ipv6.neigh.default.ucast_solicit = 2
EOF

sudo sysctl -p /etc/sysctl.d/99-ipv6-fast-failover.conf
```

## Tuning for Security (Hardening)

```bash
# Security hardening: disable features not needed
sudo tee /etc/sysctl.d/99-ipv6-security.conf << 'EOF'
# Disable accepting Router Advertisements (for servers/routers)
# that get their IPv6 addresses statically
net.ipv6.conf.all.accept_ra = 0
net.ipv6.conf.default.accept_ra = 0

# Disable SLAAC (use static addresses only)
net.ipv6.conf.all.autoconf = 0
net.ipv6.conf.default.autoconf = 0

# Disable accepting redirects (routers shouldn't follow redirects)
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0

# Disable forwarding RA through router interfaces
# (prevent rogue RA from being forwarded)
net.ipv6.conf.all.forwarding = 1  # Enable forwarding (for routers)
# When forwarding=1: RAs are ignored by default (accept_ra=1 only takes effect
# when forwarding is disabled). To accept RAs while forwarding, set accept_ra=2.
EOF

sudo sysctl -p /etc/sysctl.d/99-ipv6-security.conf
```

## Tuning Neighbor Cache Size for High-Traffic Environments

```bash
# For large networks (many neighbors)
sudo tee -a /etc/sysctl.d/99-ipv6-ndp.conf << 'EOF'
# Increase neighbor cache thresholds for large deployments
net.ipv6.neigh.default.gc_thresh1 = 1024    # Keep below this level
net.ipv6.neigh.default.gc_thresh2 = 4096    # Force GC if exceeded
net.ipv6.neigh.default.gc_thresh3 = 8192    # Hard limit: force immediate GC

# Increase cache stale time before eviction
net.ipv6.neigh.default.gc_stale_time = 120  # 2 minutes
EOF

sudo sysctl -p /etc/sysctl.d/99-ipv6-ndp.conf
```

## Conclusion

Linux NDP configuration via sysctl provides granular control over every aspect of neighbor discovery behavior. For fast failover, reduce `base_reachable_time_ms`, `delay_first_probe_time`, `retrans_time_ms`, and `ucast_solicit`. For security hardening, disable `accept_ra` and `autoconf` on servers with static addresses. For high-traffic networks with many neighbors, increase the garbage collection thresholds. Always apply changes to both the specific interface (e.g., `neigh.eth0`) and the `default` to ensure new interfaces inherit the correct settings.
