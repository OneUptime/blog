# How to Mitigate ARP Storms on a Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, ARP, Security, Switching, Performance

Description: Learn what causes ARP storms, how they affect network performance, and how to mitigate them with rate limiting, VLAN sizing, and ARP suppression.

## What Is an ARP Storm?

An ARP storm occurs when a network is flooded with excessive ARP broadcast packets. This can:

- Saturate switch CPU and memory
- Degrade network performance for all hosts in the broadcast domain
- Cause loops in some configurations
- Trigger a cascading broadcast storm

## Common Causes

1. **Large flat networks** - /16 or /8 subnets with thousands of hosts all sharing one broadcast domain
2. **Misconfigured hosts** - hosts rapidly cycling through IP addresses, each triggering ARP
3. **ARP spoofing tools** - malicious tools flooding ARP
4. **Network loops** - spanning tree failures causing broadcasts to circulate
5. **VM migrations** - large numbers of VMs coming online simultaneously

## Mitigation Strategy 1: Segment into Smaller Subnets

The most effective mitigation is reducing the broadcast domain size:

```text
Before: One /16 with 65,534 hosts → massive ARP domain
After:  256 /24 subnets with 254 hosts each → small ARP domains
```

```python
import ipaddress

# Show how /16 breaks into /24 subnets

network = ipaddress.ip_network('10.0.0.0/16')
subnets = list(network.subnets(new_prefix=24))
print(f"Number of /24 subnets: {len(subnets)}")
print(f"Hosts per subnet: {subnets[0].num_addresses - 2}")
```

## Mitigation Strategy 2: Rate Limit ARP on Switch Ports

On Cisco switches:

```cisco
! Limit ARP to 100 packets per second per port
interface range GigabitEthernet0/1 - 24
 ip arp inspection limit rate 100

! Enable errdisable recovery
errdisable recovery cause arp-inspection
errdisable recovery interval 60
```

## Mitigation Strategy 3: ARP Proxy/Suppression on the Gateway

When the router or VTEP performs ARP on behalf of remote hosts, local ARP broadcasts are suppressed:

```bash
# On a Linux bridge/VTEP, enable ARP proxy
echo 1 > /proc/sys/net/ipv4/conf/bridge0/proxy_arp

# For VXLAN with ARP suppression (common in overlay networks)
ip link set vxlan0 type vxlan ... nolearning
bridge fdb append 00:00:00:00:00:00 dev vxlan0 dst 0.0.0.0
```

In VXLAN environments, ARP suppression prevents broadcast flooding across the fabric.

## Mitigation Strategy 4: Detect and Block Misbehaving Hosts

```bash
#!/bin/bash
# Monitor ARP rate per host and alert if threshold exceeded
THRESHOLD=50  # ARP per 10 seconds
WINDOW=10     # seconds

sudo tcpdump -n arp -i eth0 2>/dev/null | \
    awk '/Request/ {gsub(",", "", $7); print $7}' | \
    sort | uniq -c | sort -rn | \
    awk -v thresh="$THRESHOLD" '$1 > thresh {print "High ARP rate from:", $2, "count:", $1}'
```

## Mitigation Strategy 5: Enable Spanning Tree PortFast

Broadcast storms are often triggered by STP issues. Enable PortFast on access ports:

```cisco
! Enable PortFast on access ports
interface range GigabitEthernet0/1 - 24
 spanning-tree portfast
 spanning-tree bpduguard enable
```

## Detecting an ARP Storm

```bash
# Check ARP packet rate
sudo tcpdump -n arp -i eth0 -q 2>/dev/null | pv -r > /dev/null
# Shows current ARP packet rate

# Count ARP packets in 5 seconds
sudo timeout 5 tcpdump -n arp -i eth0 2>/dev/null | wc -l
```

## Key Takeaways

- ARP storms are most common in large flat networks with oversized broadcast domains.
- Segment networks into /24 or smaller to contain ARP broadcasts.
- Switch-level ARP rate limiting prevents a single host from flooding the network.
- In VXLAN/overlay environments, enable ARP suppression to prevent broadcast flooding across the fabric.

**Related Reading:**

- [How to Configure ARP Inspection on Cisco Switches](https://oneuptime.com/blog/post/2026-03-20-cisco-arp-inspection/view)
- [How to Understand ARP in VLAN Environments](https://oneuptime.com/blog/post/2026-03-20-arp-in-vlan-environments/view)
- [How to Understand ARP Broadcast Domain Boundaries](https://oneuptime.com/blog/post/2026-03-20-arp-broadcast-domain-boundaries/view)
