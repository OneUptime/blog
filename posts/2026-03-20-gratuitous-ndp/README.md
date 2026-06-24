# How to Send Gratuitous NDP in IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, NDP, Gratuitous NDP, Unsolicited NA, High Availability, Networking

Description: Understand and implement Gratuitous NDP (Unsolicited Neighbor Advertisements) for IPv6 high availability, failover, and cache invalidation.

## What is Gratuitous NDP?

In IPv4, Gratuitous ARP announces an IP-to-MAC mapping without being asked. IPv6's equivalent is the **Unsolicited Neighbor Advertisement (Unsolicited NA)**, defined in RFC 4861.

Unsolicited NAs are used to:
- Announce address changes after VRRP/HSRP failover
- Update neighbor caches after a MAC address change
- Prompt neighbor cache re-validation during maintenance
- Notify neighbors of link-layer address changes

## Sending Unsolicited NA from Linux

```bash
# Method 1: Using ndsend (if available)

# Package availability varies by distro; ndsend is not part of ndisc6.
ndsend 2001:db8::1 eth0
# Sends an unsolicited NA for 2001:db8::1 on eth0

# Method 2: Python with Scapy
# (See code below)
```

## Scapy: Send Unsolicited NA

```python
from scapy.all import *
from scapy.layers.inet6 import *
import sys

def send_unsolicited_na(iface, ipv6_addr, mac_addr=None):
    """Send an IPv6 Unsolicited Neighbor Advertisement"""

    if mac_addr is None:
        # Use interface's MAC
        from scapy.arch import get_if_hwaddr
        mac_addr = get_if_hwaddr(iface)

    # Unsolicited NA:
    # - Destination: ff02::1 (all-nodes multicast)
    # - Override flag = 1 (allow cache update)
    # - Solicited flag = 0 (unsolicited)
    # - Router flag = 0 (unless it's a router)

    pkt = (Ether(src=mac_addr, dst="33:33:00:00:00:01") /
           IPv6(src=ipv6_addr, dst="ff02::1") /
           ICMPv6ND_NA(
               tgt=ipv6_addr,
               R=0,    # Router flag
               S=0,    # Solicited flag (0 = unsolicited)
               O=1,    # Override flag (1 = allow cache update)
           ) /
           ICMPv6NDOptDstLLAddr(lladdr=mac_addr))

    sendp(pkt, iface=iface, verbose=False, count=3, inter=1.0)
    print(f"Sent 3 unsolicited NAs for {ipv6_addr} on {iface}")

# Usage
send_unsolicited_na("eth0", "2001:db8::1")
```

## Gratuitous NDP for VRRP Failover

After a VRRP master transition, the new master sends unsolicited NAs to update neighbor caches:

```bash
#!/bin/bash
# vrrp-failover.sh - Run on new VRRP master

VIRTUAL_IP="2001:db8::100"
IFACE="eth0"
NEW_MASTER_MAC=$(cat /sys/class/net/${IFACE}/address)

echo "VRRP failover: announcing ${VIRTUAL_IP} on ${IFACE}"

# Send multiple unsolicited NAs to refresh neighbor caches
for i in 1 2 3; do
    # Using ndsend if available
    ndsend ${VIRTUAL_IP} ${IFACE} 2>/dev/null || \
        python3 -c "
from scapy.all import *
from scapy.layers.inet6 import *
pkt = (Ether(dst='33:33:00:00:00:01') /
       IPv6(src='${VIRTUAL_IP}', dst='ff02::1') /
       ICMPv6ND_NA(tgt='${VIRTUAL_IP}', O=1, S=0, R=0) /
       ICMPv6NDOptDstLLAddr(lladdr='${NEW_MASTER_MAC}'))
sendp(pkt, iface='${IFACE}', verbose=False)
"
    sleep 1
done

echo "Failover announcement complete"
```

## Keepalived Integration for IPv6

```text
# /etc/keepalived/keepalived.conf
vrrp_instance VI_IPv6 {
    state MASTER
    interface eth0
    virtual_router_id 60
    priority 150
    advert_int 1

    virtual_ipaddress {
        2001:db8::100/64 dev eth0
    }

    # Keepalived automatically sends unsolicited NAs on failover

    notify_master "/etc/keepalived/notify-master.sh"
}
```

## Manage Local NDP Cache for a Specific Neighbor

```bash
# Flush a specific entry from the local neighbor cache
# (Useful after maintenance to force re-resolution)
ip -6 neigh del 2001:db8::1 dev eth0

# Or set to STALE to trigger re-verification
ip -6 neigh change 2001:db8::1 \
    lladdr 52:54:00:ab:cd:ef \
    dev eth0 \
    nud stale

# Flush REACHABLE entries from the local neighbor table
ip -6 neigh flush dev eth0 nud reachable
```

## Verification

```bash
# Capture unsolicited NAs on the network
tcpdump -i eth0 -n -v \
    'icmp6 and icmp6[icmp6type] == icmp6-neighboradvert'

# Expected output includes:
# neighbor advertisement, tgt is 2001:db8::1
# target link-address option (2): 52:54:00:ab:cd:ef

# Check neighbor cache updated
ip -6 neigh show | grep 2001:db8::1
# Typically shows the announced lladdr, often in STALE state after an unsolicited NA:
# 2001:db8::1 dev eth0 lladdr 52:54:00:ab:cd:ef STALE
```

## Conclusion

Gratuitous NDP (Unsolicited Neighbor Advertisement) can quickly propagate updated IPv6 neighbor information without waiting for resolution requests. This is essential for virtual IP failover (VRRP/HSRP) where hosts need to update their cache to point to the new primary. The `Override` flag (O=1) allows the new link-layer address to replace a cached mapping. RFC 4861 allows up to 3 unsolicited NAs, separated by at least RetransTimer; tools such as keepalived expose their own repeat and interval tuning. Tools: `ndsend` when available, Scapy for programmatic control, and keepalived for production VRRP integration.
