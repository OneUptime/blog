# How to Understand ARP Broadcast Domain Boundaries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, ARP, IPv4, Switching, VLAN

Description: Learn how ARP is constrained by broadcast domain boundaries and how routers, VLANs, and switch design affect ARP reachability.

## ARP Is a Broadcast Protocol

ARP requests are sent to the **broadcast MAC address** (`ff:ff:ff:ff:ff:ff`). Every device in the same broadcast domain receives them. This is efficient for small networks but becomes a problem at scale.

## What Defines a Broadcast Domain?

| Device | Creates New Broadcast Domain? |
|--------|-------------------------------|
| Hub | No (shared medium) |
| Switch | No (same VLAN shares one domain) |
| VLAN | Yes (each VLAN is its own domain) |
| Router | Yes (each L3 interface is separate) |
| Bridge | No (bridges L2 domains together) |

**Routers are the boundary of broadcast domains.** ARP broadcasts never cross a router.

## Example: ARP Confined to One Broadcast Domain

```text
Network Diagram:

[192.168.1.0/24]   Router   [192.168.2.0/24]
  Host A              |         Host C
  Host B           eth0/eth1    Host D
```

- Host A can ARP for Host B (same broadcast domain)
- Host A **cannot** ARP for Host C (different broadcast domain - router in the way)
- To reach Host C, Host A sends traffic to the router's MAC (default gateway)

## ARP and VLAN Boundaries

VLANs create separate broadcast domains on the same physical switch. ARP from VLAN 10 never reaches VLAN 20:

```text
VLAN 10 (192.168.10.0/24)  |  VLAN 20 (192.168.20.0/24)
  PC-A: 192.168.10.10       |    PC-C: 192.168.20.10
  PC-B: 192.168.10.20       |    PC-D: 192.168.20.20
  
ARP from PC-A stays in VLAN 10
```

To communicate between VLANs, a Layer 3 device (router or L3 switch) is needed.

## Effects of Broadcast Domain Size

| Domain Size | ARP Behavior |
|------------|-------------|
| Small (/24, ~250 hosts) | Low ARP volume, fast resolution |
| Medium (/22, ~1000 hosts) | Moderate ARP broadcasts |
| Large (/16, ~65000 hosts) | Excessive ARP traffic, switch CPU stress |
| Flat enterprise network | ARP storms possible, slow convergence |

## Checking Broadcast Domain Size

```python
import ipaddress

def broadcast_domain_info(cidr):
    net = ipaddress.ip_network(cidr, strict=False)
    usable_hosts = net.num_addresses if net.prefixlen >= 31 else net.num_addresses - 2
    print(f"Network:       {net}")
    print(f"Broadcast:     {net.broadcast_address}")
    print(f"Host count:    {usable_hosts}")
    print(f"ARP requests per full sweep: {usable_hosts}")

broadcast_domain_info('10.0.0.0/22')
```

## ARP Boundary Enforcement in Practice

```bash
# Verify you cannot ARP across subnets (different broadcast domain)

# On Host A (192.168.1.10), try to ARP for 192.168.2.20
arping -I eth0 192.168.2.20
# Should fail (no reply, unless proxy ARP is enabled) because ARP is link-local and routers do not forward ARP broadcasts

# Verify the router (192.168.1.1) is in the same broadcast domain
arping -I eth0 192.168.1.1
# Should succeed (reply from router)
```

## ARP in Overlay Networks (VXLAN, GENEVE)

In VXLAN and GENEVE environments, ARP broadcasts are encapsulated inside the overlay tunnel and carried across the Layer 3 underlay. Depending on the control plane, broadcast and unknown-unicast traffic may use multicast or head-end replication to reach remote tunnel endpoints:

```bash
# Inspect VXLAN forwarding database entries
bridge fdb show dev vxlan0
```

In overlays with a control plane such as EVPN, ARP suppression can reduce flooding by having the VTEP answer ARP requests locally from a learned IP-to-MAC table.

## Key Takeaways

- ARP broadcasts are confined to a single broadcast domain.
- Routers and VLANs define broadcast domain boundaries.
- Large broadcast domains generate excessive ARP traffic and increase switch CPU load.
- VXLAN extends L2 domains over L3, but ARP suppression can mitigate broadcast flooding.

**Related Reading:**

- [How to Understand ARP in VLAN Environments](https://oneuptime.com/blog/post/2026-03-20-arp-in-vlan-environments/view)
- [How to Mitigate ARP Storms on a Network](https://oneuptime.com/blog/post/2026-03-20-mitigate-arp-storms/view)
- [How to Understand How ARP Maps IP Addresses to MAC Addresses](https://oneuptime.com/blog/post/2026-03-20-how-arp-maps-ip-to-mac-addresses/view)
