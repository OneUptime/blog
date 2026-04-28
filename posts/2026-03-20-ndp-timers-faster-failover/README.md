# How to Configure NDP Timers for Faster Failover

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NDP, Failover, NUD Timers, IPv6, High Availability

Description: Configure IPv6 NDP timers to achieve faster failure detection and failover, understand the tradeoffs, and implement both host-side and router-side NDP timing.

## Introduction

In high-availability IPv6 deployments, fast failure detection is critical. By default, NDP's NUD state machine may take 30-40 seconds to declare a neighbor FAILED. By tuning NUD timers on both hosts and routers, failure detection can be reduced to 2-5 seconds. This guide covers the timer parameters, their interactions, and how to calculate the total failover time.

## Default vs Tuned Failover Times

```text
Default NUD failover time calculation:
  REACHABLE state: 30s (base_reachable_time_ms)
  STALE state: until first packet sent
  DELAY state: 5s (delay_first_probe_time)
  PROBE state: 3 × 1s = 3s (ucast_solicit × retrans_time_ms)
  Total (worst case): 30 + 5 + 3 = 38 seconds

Tuned NUD failover time (fast failover):
  REACHABLE state: 5s (base_reachable_time_ms = 5000ms)
  STALE state: until first packet sent
  DELAY state: 1s (delay_first_probe_time = 1)
  PROBE state: 2 × 0.5s = 1s (ucast_solicit=2, retrans_time_ms=500)
  Total (worst case): 5 + 1 + 1 = 7 seconds

Ultra-fast NUD (aggressive, higher NDP traffic):
  REACHABLE state: 2s (base_reachable_time_ms = 2000ms)
  DELAY state: 1s (delay_first_probe_time = 1, the minimum integer value in seconds)
  PROBE state: 2 × 0.25s = 0.5s (ucast_solicit=2, retrans_time_ms=250)
  Total: ~3.5 seconds
```

## Tuning Host-Side NUD Timers

```bash
# Fast failover configuration for a specific interface

IFACE="eth0"

# Reduce REACHABLE time (how often NUD confirmation is needed)
sudo sysctl -w "net.ipv6.neigh.${IFACE}.base_reachable_time_ms=5000"

# Reduce DELAY before starting PROBE
sudo sysctl -w "net.ipv6.neigh.${IFACE}.delay_first_probe_time=1"

# Reduce PROBE interval
sudo sysctl -w "net.ipv6.neigh.${IFACE}.retrans_time_ms=500"

# Reduce number of PROBE attempts before FAILED
sudo sysctl -w "net.ipv6.neigh.${IFACE}.ucast_solicit=2"

# Verify new settings
sysctl -a 2>/dev/null | grep "neigh.${IFACE}"

# Make persistent
sudo tee /etc/sysctl.d/10-ndp-fast-failover.conf << EOF
net.ipv6.neigh.${IFACE}.base_reachable_time_ms = 5000
net.ipv6.neigh.${IFACE}.delay_first_probe_time = 1
net.ipv6.neigh.${IFACE}.retrans_time_ms = 500
net.ipv6.neigh.${IFACE}.ucast_solicit = 2
EOF
sudo sysctl -p /etc/sysctl.d/10-ndp-fast-failover.conf
```

## Router-Side: Fast RA for Quick Router Failover

```bash
# radvd.conf: reduce RA interval for faster router discovery failover
sudo tee /etc/radvd.conf << 'EOF'
interface eth0 {
    AdvSendAdvert on;

    # Reduce RA interval for faster router discovery
    MinRtrAdvInterval 10;    # Minimum 10 seconds between RAs
    MaxRtrAdvInterval 30;    # Maximum 30 seconds between RAs

    # Router Lifetime must be 0 or between MaxRtrAdvInterval and 9000s.
    # Default is 3x MaxRtrAdvInterval; 90s gives resilience to lost RAs.
    AdvDefaultLifetime 90;

    # Advertise NUD parameters to hosts
    # AdvReachableTime in ms (0 = let hosts use their own defaults)
    AdvReachableTime 5000;   # Tell hosts to use 5s REACHABLE time
    AdvRetransTimer 500;     # Tell hosts to use 500ms retrans timer

    prefix 2001:db8::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime 2592000;
        AdvPreferredLifetime 604800;
    };
};
EOF

sudo systemctl restart radvd
```

## Testing Failover Time

```bash
# Test 1: Measure time from host failure to detection
# On monitoring host: watch neighbor cache
watch -n 0.1 'ip -6 neigh show | grep 2001:db8::1'

# On target: bring down the interface
# sudo ip link set eth0 down

# Measure time from "REACHABLE" to "FAILED"
# Record timestamps when state changes

# Test 2: Script to measure failover time
#!/bin/bash
TARGET="2001:db8::1"
IFACE="eth0"
START_TIME=""
STATE=""

while true; do
    CURRENT_STATE=$(ip -6 neigh show $TARGET dev $IFACE 2>/dev/null | \
        awk '{print $NF}')
    if [ "$CURRENT_STATE" != "$STATE" ]; then
        echo "$(date +%s.%N) State: $STATE → $CURRENT_STATE"
        STATE=$CURRENT_STATE
        if [ "$CURRENT_STATE" = "FAILED" ]; then
            break
        fi
    fi
    sleep 0.1
done
```

## Tradeoffs of Fast Timers

```text
Faster timers = more NDP traffic:
  base_reachable_time_ms = 5000:
    NUD confirmation needed every ~5 seconds per active connection
    vs. default ~30 seconds

  retrans_time_ms = 500, ucast_solicit = 2:
    PROBE phase: 2 × 0.5s = 1s (vs default 3 × 1s = 3s)
    But PROBE sends unicast NS twice as fast

Calculate NDP overhead:
  For N active neighbors with T=5s reachable time:
  NS rate ≈ N / T per second (rough estimate for traffic estimation)
  For 100 neighbors at 5s: ~20 NS/s (acceptable)
  For 1000 neighbors at 1s: ~1000 NS/s (may be problematic)
```

## Conclusion

NDP timer tuning for faster failover involves reducing `base_reachable_time_ms`, `delay_first_probe_time`, `retrans_time_ms`, and `ucast_solicit`. The total worst-case failover time equals the sum of REACHABLE + DELAY + (ucast_solicit × retrans_time). For HA environments, 3-7 second failover times are achievable with modest timer reduction. Router-side RA interval reduction (via radvd `MaxRtrAdvInterval`) ensures router failures are detected quickly through Router Lifetime expiry. Always measure the resulting NDP traffic increase to ensure it doesn't overwhelm the network infrastructure.
