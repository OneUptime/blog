# How to Divide a /16 Network into Multiple VLANs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Subnetting, VLAN, Networking, /16, Enterprise

Description: A /16 network can be divided into multiple VLANs by subnetting to /24 (256 VLANs of 254 hosts), /23 (128 VLANs of 510 hosts), or other prefix lengths depending on the density needed.

## /16 Subnetting Options

| Subnet Prefix | Subnets Available | Hosts per Subnet |
|--------------|-------------------|------------------|
| /17 | 2 | 32,766 |
| /18 | 4 | 16,382 |
| /20 | 16 | 4,094 |
| /22 | 64 | 1,022 |
| /23 | 128 | 510 |
| /24 | 256 | 254 |
| /26 | 1,024 | 62 |

## Dividing 172.16.0.0/16 into /24 Subnets for VLANs

```python
import ipaddress

parent = ipaddress.IPv4Network("172.16.0.0/16")
subnets = list(parent.subnets(new_prefix=24))
print(f"Total /24 subnets: {len(subnets)}")

# Map VLAN IDs to subnets (VLAN ID = third octet)

vlan_assignments = {
    10:  ("Servers",    subnets[10]),
    20:  ("Users-A",    subnets[20]),
    30:  ("Users-B",    subnets[30]),
    40:  ("VoIP",       subnets[40]),
    50:  ("WiFi",       subnets[50]),
    100: ("Management", subnets[100]),
    200: ("DMZ",        subnets[200]),
}

print("\nVLAN Assignments:")
for vlan_id, (name, subnet) in vlan_assignments.items():
    hosts = list(subnet.hosts())
    print(f"  VLAN {vlan_id:3d} ({name:12s}): {subnet}  "
          f"GW={hosts[0]}  Last={hosts[-1]}")
```

## Mixed /23 and /24 Design (VLSM)

```python
import ipaddress

# Large user VLANs get /23, small VLANs get /24
parent = ipaddress.IPv4Network("10.10.0.0/16")
subnets_23 = list(parent.subnets(new_prefix=23))
subnets_24 = list(parent.subnets(new_prefix=24))

mixed_design = {
    "Users-Large-1": subnets_23[0],   # 10.10.0.0/23 (510 hosts)
    "Users-Large-2": subnets_23[1],   # 10.10.2.0/23 (510 hosts)
    "Servers":        subnets_24[4],  # 10.10.4.0/24 (254 hosts)
    "Management":     subnets_24[5],  # 10.10.5.0/24 (254 hosts)
}

for name, subnet in mixed_design.items():
    print(f"{name:18s}: {subnet}  ({subnet.num_addresses - 2} hosts)")
```

## VLAN Configuration on Linux (802.1Q)

```bash
# Create VLAN sub-interfaces on eth0
sudo ip link add link eth0 name eth0.10 type vlan id 10
sudo ip link add link eth0 name eth0.20 type vlan id 20
sudo ip link set eth0.10 up
sudo ip link set eth0.20 up

# Assign IPs matching the VLAN-to-subnet mapping
sudo ip addr add 172.16.10.1/24 dev eth0.10   # VLAN 10 gateway
sudo ip addr add 172.16.20.1/24 dev eth0.20   # VLAN 20 gateway
```

## Key Takeaways

- A /16 → /24 provides 256 subnets, often mapped one-per-VLAN, with 254 hosts each - common enterprise choice.
- Align VLAN IDs with the third octet for intuitive mapping (VLAN 10 = 172.16.10.0/24).
- Use /23 for high-density user segments and /24 or smaller for servers and management.
- If the VLAN subnets stay contiguous within the /16, they can be summarized upstream as a single route advertisement, keeping BGP/OSPF routing tables cleaner.
