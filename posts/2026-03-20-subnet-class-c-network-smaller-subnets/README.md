# How to Subnet a Class C Network into Smaller Subnets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Subnetting, Class C, Networking, CIDR

Description: Subnetting a Class C (/24) network divides its 254 usable addresses into smaller segments by borrowing bits from the host portion, creating 2, 4, 8, or more subnets of equal or variable size.

## Class C Basics

A Class C network like `192.168.1.0/24` has:
- 8 host bits
- 254 usable addresses

Borrowing additional bits from the host portion creates subnets.

## Dividing into 4 Equal Subnets (/26)

Borrow 2 bits from the /24: 2^2 = 4 subnets, each /26 (62 hosts):

```python
import ipaddress

parent = ipaddress.IPv4Network("192.168.1.0/24")

print("Subnetting 192.168.1.0/24 into /26 subnets:\n")
for subnet in parent.subnets(new_prefix=26):
    hosts = list(subnet.hosts())
    print(f"  Subnet:    {subnet}")
    print(f"  Network:   {subnet.network_address}")
    print(f"  First Host:{hosts[0]}")
    print(f"  Last Host: {hosts[-1]}")
    print(f"  Broadcast: {subnet.broadcast_address}")
    print(f"  Hosts:     {len(hosts)}")
    print()
```

## Dividing into 8 Equal Subnets (/27)

Borrow 3 bits: 2^3 = 8 subnets, each /27 (30 hosts):

```python
import ipaddress

for subnet in ipaddress.IPv4Network("192.168.1.0/24").subnets(new_prefix=27):
    print(f"{subnet}  ({subnet.num_addresses - 2} hosts)")
```

## Summary Table: /24 Subnetting Options

| New Prefix | Borrowed Bits | Subnets | Hosts Each |
|-----------|--------------|---------|-----------|
| /25 | 1 | 2 | 126 |
| /26 | 2 | 4 | 62 |
| /27 | 3 | 8 | 30 |
| /28 | 4 | 16 | 14 |
| /29 | 5 | 32 | 6 |
| /30 | 6 | 64 | 2 |

## Practical Example: Office Network

```python
import ipaddress

# 192.168.10.0/24 divided for different departments

parent = ipaddress.IPv4Network("192.168.10.0/24")
subnets = list(parent.subnets(new_prefix=27))

departments = ["Servers", "Users-Floor1", "Users-Floor2",
               "VoIP", "Management", "WiFi-AP", "DMZ", "Spare"]

for dept, subnet in zip(departments, subnets):
    print(f"{dept:15s}: {subnet}  ({subnet.num_addresses-2} hosts)")
```

## Route Summarization After Subnetting

All eight /27 subnets are contiguous, so they can be summarized to the parent /24 when they share the same next hop:

```bash
# On a router: instead of adding all 8 /27 static routes,
# add the single /24 summary via a reachable next hop
ip route add 192.168.10.0/24 via 10.0.0.2
```

## Key Takeaways

- Each borrowed bit doubles the number of subnets and halves the address block size.
- For traditional subnets that reserve network and broadcast addresses, a /24 can be divided into up to 64 /30 subnets with 2 usable hosts each.
- Python's `network.subnets(new_prefix=N)` provides a clean way to enumerate all subnets.
- Contiguous subnets of a /24 can be summarized to the original /24 in routing tables when they share the same routing path.
