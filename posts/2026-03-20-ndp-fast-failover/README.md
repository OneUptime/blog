# How to Configure NDP for Fast IPv6 Failover

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, NDP, Failover, High Availability, VRRP, Networking

Description: Configure NDP parameters for fast IPv6 gateway failover including NDP cache tuning, VRRP, and unsolicited NA announcement.

## NDP Failure Detection Timing

Default NDP behavior is slow for failover detection:
- REACHABLE timeout: ~30 seconds
- STALE → DELAY → PROBE: ~5 seconds
- MAX retransmits: 3 × 1 second = 3 seconds
- Total detection: up to 38 seconds!

For failover scenarios, this can be reduced significantly.

## Tuning NDP Reachability Timers

```bash
# Reduce NDP reachability timeout for faster failure detection

# Default: 30000ms (30 seconds)
sysctl -w net.ipv6.neigh.eth0.base_reachable_time_ms=10000  # 10 seconds

# Reduce DELAY before probing
# Default: 5 seconds
sysctl -w net.ipv6.neigh.eth0.delay_first_probe_time=2

# Reduce retransmit interval
# Default: 1000ms
sysctl -w net.ipv6.neigh.eth0.retrans_time_ms=500  # 500ms

# Reduce number of NS probes
# Default: 3
sysctl -w net.ipv6.neigh.eth0.ucast_solicit=2
sysctl -w net.ipv6.neigh.eth0.mcast_solicit=2

# Persist settings
cat >> /etc/sysctl.d/99-ndp-failover.conf << 'EOF'
net.ipv6.neigh.default.base_reachable_time_ms = 10000
net.ipv6.neigh.default.delay_first_probe_time = 2
net.ipv6.neigh.default.retrans_time_ms = 500
EOF
sysctl -p /etc/sysctl.d/99-ndp-failover.conf
```

## VRRP with IPv6 Fast Failover

```text
# /etc/keepalived/keepalived.conf
vrrp_instance VI_IPv6 {
    state MASTER
    interface eth0
    virtual_router_id 70
    priority 200
    advert_int 1      # Check every 1 second

    virtual_ipaddress {
        2001:db8::100/64 dev eth0
    }

    # Scripts to send gratuitous NDP on failover
    notify_master "/etc/keepalived/failover-announce.sh MASTER"
    notify_backup "/etc/keepalived/failover-announce.sh BACKUP"
    notify_fault  "/etc/keepalived/failover-announce.sh FAULT"
}
```

```bash
# /etc/keepalived/failover-announce.sh
#!/bin/bash
STATE=$1
IFACE="eth0"
VIP="2001:db8::100"

case ${STATE} in
    MASTER)
        echo "Became MASTER - sending unsolicited NAs"
        # Send 5 unsolicited NAs with 100ms intervals
        for i in 1 2 3 4 5; do
            ndsend ${VIP} ${IFACE} 2>/dev/null || \
            python3 -c "
from scapy.all import *
from scapy.layers.inet6 import *
mac = open('/sys/class/net/${IFACE}/address').read().strip()
pkt = Ether(dst='33:33:00:00:00:01')/IPv6(src='${VIP}',dst='ff02::1')/ICMPv6ND_NA(tgt='${VIP}',O=1)/ICMPv6NDOptDstLLAddr(lladdr=mac)
sendp(pkt,iface='${IFACE}',verbose=False)
"
            sleep 0.1
        done
        ;;
    *)
        echo "State: ${STATE}"
        ;;
esac
```

## Fast Neighbor Table Recovery

```bash
# After a link failure and recovery, flush stale NDP cache
# and force re-discovery

# Flush all STALE/FAILED entries
ip -6 neigh flush nud stale dev eth0
ip -6 neigh flush nud failed dev eth0

# Probe specific gateway immediately
GATEWAY="2001:db8::1"
ip -6 neigh change ${GATEWAY} dev eth0 nud probe

# Watch neighbor state
watch -n 0.5 "ip -6 neigh show dev eth0"
```

## Router Advertisement Frequency Tuning

```text
# /etc/radvd.conf - Faster RA for quicker gateway discovery
interface eth0 {
    AdvSendAdvert on;
    MaxRtrAdvInterval 10;     # Default 600s - reduce to 10s
    MinRtrAdvInterval 3;      # Default 0.33*Max - set to 3s
    AdvRouterLifetime 30;     # How long to trust this router

    prefix 2001:db8:1::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime 86400;
        AdvPreferredLifetime 14400;
    };
};
```

## Measuring Failover Time

```bash
#!/bin/bash
# measure-failover.sh - Time IPv6 failover detection

TARGET="2001:db8::100"
INTERVAL=0.1

echo "Monitoring ${TARGET} with ${INTERVAL}s interval..."

START=""
FAIL_TIME=""

while true; do
    if ping6 -c 1 -W 1 ${TARGET} &>/dev/null; then
        if [ -n "${FAIL_TIME}" ]; then
            NOW=$(date +%s%N)
            RECOVERY=$((( NOW - FAIL_TIME ) / 1000000))
            echo "Recovered after ${RECOVERY}ms"
            FAIL_TIME=""
        fi
        echo -n "."
    else
        if [ -z "${FAIL_TIME}" ]; then
            FAIL_TIME=$(date +%s%N)
            echo ""
            echo "Failure detected at $(date)"
        fi
        echo -n "X"
    fi
    sleep ${INTERVAL}
done
```

## Conclusion

IPv6 NDP failover speed is controlled by three key parameters: `base_reachable_time_ms` (how quickly REACHABLE → STALE), `delay_first_probe_time` (how quickly STALE → PROBE), and `retrans_time_ms` (probe retransmit interval). Reducing these from defaults (30s/5s/1s) to aggressive values (10s/2s/500ms) cuts detection time from ~38s to ~12s. VRRP with keepalived handles the IP failover, while notify scripts send unsolicited NAs to update neighbor caches on all connected hosts. Send 3-5 NAs with 100ms spacing to ensure reliable delivery.
