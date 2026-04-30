# How to Plan IPv6 Addressing for VLANs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, VLAN, Networking, Switching, Address Planning

Description: Plan IPv6 addressing for VLAN-based network segments, mapping VLAN IDs to /64 subnets for consistent, readable addressing across your network infrastructure.

## Introduction

VLANs are the primary tool for segmenting Layer 2 networks, and each host-facing VLAN should have its own IPv6 /64 subnet. A common and elegant approach is to embed the VLAN ID directly in the IPv6 subnet address, creating a one-to-one correspondence between VLAN numbers and subnet prefixes that makes routing tables and firewall rules immediately readable.

## Design Strategy: VLAN ID as Subnet ID

With a /48 prefix, you have 16 bits of subnet ID. If your VLAN IDs are in the range 1-4094 (12 bits), you can embed the VLAN ID directly:

```text
Prefix: 2001:db8:1::/48
Subnet field (bits 49-64): embed VLAN ID

VLAN 1:    2001:db8:1:0001::/64
VLAN 2:    2001:db8:1:0002::/64
VLAN 10:   2001:db8:1:000a::/64
VLAN 100:  2001:db8:1:0064::/64
VLAN 200:  2001:db8:1:00c8::/64
VLAN 1000: 2001:db8:1:03e8::/64
VLAN 4000: 2001:db8:1:0fa0::/64
```

## Python: VLAN-to-Subnet Mapping

```python
import ipaddress

def vlan_to_subnet(site_prefix_48: str, vlan_id: int) -> ipaddress.IPv6Network:
    """
    Map a VLAN ID to a /64 subnet within a /48 site prefix.

    Convention: subnet ID = VLAN ID
    """
    if not 1 <= vlan_id <= 4094:
        raise ValueError(f"VLAN ID must be 1-4094, got {vlan_id}")

    net = ipaddress.IPv6Network(site_prefix_48)
    if net.prefixlen != 48:
        raise ValueError("Must be a /48 prefix")

    subnet_network = net.network_address + (vlan_id << 64)
    return ipaddress.IPv6Network((subnet_network, 64))

def subnet_to_gateway(subnet: ipaddress.IPv6Network) -> ipaddress.IPv6Address:
    """Conventional gateway: first host address (::1)."""
    return subnet.network_address + 1

# Map VLANs to subnets

site_prefix = "2001:db8:1::/48"
vlan_plan = {
    1:   "Management",
    10:  "Servers",
    20:  "User VLAN",
    30:  "VoIP",
    40:  "IoT",
    50:  "Guest WiFi",
    100: "DMZ",
}

print(f"{'VLAN':>6}  {'Subnet':>28}  {'Gateway':>30}  Description")
print("-" * 85)
for vlan_id, description in vlan_plan.items():
    subnet = vlan_to_subnet(site_prefix, vlan_id)
    gateway = subnet_to_gateway(subnet)
    print(f"{vlan_id:>6}  {str(subnet):>28}  {str(gateway)}/64  {description}")
```

Output:
```yaml
  VLAN                          Subnet                         Gateway  Description
-------------------------------------------------------------------------------------
     1   2001:db8:1:1::/64   2001:db8:1:1::1/64  Management
    10   2001:db8:1:a::/64   2001:db8:1:a::1/64  Servers
    20  2001:db8:1:14::/64  2001:db8:1:14::1/64  User VLAN
```

## Router Configuration: SVI per VLAN

```bash
# Cisco IOS-XE: configure IPv6 on SVIs
interface Vlan1
 description Management
 ipv6 address 2001:db8:1:1::1/64
 ipv6 nd ra interval 30
 no shutdown

interface Vlan10
 description Servers
 ipv6 address 2001:db8:1:a::1/64
 no shutdown

interface Vlan20
 description User-LAN
 ipv6 address 2001:db8:1:14::1/64
 no shutdown

# Enable IPv6 routing
ipv6 unicast-routing
```

```bash
# Linux: configure IPv6 on VLAN interfaces
sudo ip link add link eth0 name eth0.10 type vlan id 10
sudo ip -6 addr add 2001:db8:1:a::1/64 dev eth0.10
sudo ip link set eth0.10 up

# Configure radvd for SLAAC on each VLAN
cat >> /etc/radvd.conf << 'EOF'
interface eth0.10 {
    AdvSendAdvert on;
    prefix 2001:db8:1:a::/64 {
        AdvOnLink on;
        AdvAutonomous on;
    };
};
EOF
```

## Special VLAN Addressing Conventions

```text
Convention for common VLAN classes:

VLAN IDs 1-100:    Infrastructure VLANs (management, control)
  → 2001:db8:1:0001::/64 to 2001:db8:1:0064::/64

VLAN IDs 101-999:  User and server VLANs
  → 2001:db8:1:0065::/64 to 2001:db8:1:03e7::/64

VLAN IDs 1000-1999: Guest and IoT VLANs
  → 2001:db8:1:03e8::/64 to 2001:db8:1:07cf::/64

VLAN IDs 4000-4094: Transit / WAN VLANs
  → On dedicated inter-router links, use /127 instead of /64
```

## Firewall Policy Using VLAN Subnets

With VLAN ID encoded in the IPv6 prefix, firewall rules become self-documenting:

```bash
# Allow servers (VLAN 10) to reach management (VLAN 1)
sudo ip6tables -A FORWARD -s 2001:db8:1:a::/64 -d 2001:db8:1:1::/64 -j ACCEPT

# Block IoT (VLAN 40) from reaching servers (VLAN 10)
sudo ip6tables -A FORWARD -s 2001:db8:1:28::/64 -d 2001:db8:1:a::/64 -j DROP

# Allow guest (VLAN 50) to reach internet but not internal
sudo ip6tables -A FORWARD -s 2001:db8:1:32::/64 -d 2001:db8:1::/48 -j DROP
sudo ip6tables -A FORWARD -s 2001:db8:1:32::/64 -j ACCEPT
```

## Conclusion

Mapping VLAN IDs directly to IPv6 subnet IDs creates a clean, self-documenting addressing scheme. Looking at any IPv6 address immediately reveals the VLAN it belongs to. This convention simplifies firewall policies, makes routing tables readable at a glance, and reduces errors when configuring per-VLAN services. Combined with SLAAC or DHCPv6, each host-facing VLAN subnet delivers addresses to hosts automatically.
