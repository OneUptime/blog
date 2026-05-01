# How to Divide a /24 Network into Four Equal Subnets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Subnetting, /24, Networking, CIDR

Description: Dividing a /24 into four equal subnets requires borrowing 2 bits from the host portion, creating four /26 subnets each with 62 usable host addresses.

## The Math

Starting with `192.168.1.0/24`:
- Borrow 2 bits: 2^2 = **4 subnets**
- New prefix: /24 + 2 = **/26**
- Host bits remaining: 6
- Usable hosts per subnet: 2^6 − 2 = **62**
- Block size: 256 − 192 = **64**

## The Four /26 Subnets

| Subnet | Network | First Host | Last Host | Broadcast |
|--------|---------|-----------|----------|-----------|
| 1 | 192.168.1.0/26 | .1 | .62 | .63 |
| 2 | 192.168.1.64/26 | .65 | .126 | .127 |
| 3 | 192.168.1.128/26 | .129 | .190 | .191 |
| 4 | 192.168.1.192/26 | .193 | .254 | .255 |

## Python: Generate the Four Subnets

```python
import ipaddress

def divide_24_into_four(network_24: str) -> None:
    """Divide a /24 into four equal /26 subnets."""
    parent = ipaddress.IPv4Network(network_24, strict=False)
    assert parent.prefixlen == 24, "Input must be a /24 network"

    subnets = list(parent.subnets(new_prefix=26))
    assert len(subnets) == 4, "Should produce exactly 4 subnets"

    print(f"Dividing {parent} into 4 × /26:\n")
    for i, subnet in enumerate(subnets, 1):
        hosts = list(subnet.hosts())
        print(f"Subnet {i}: {subnet}")
        print(f"  Network:   {subnet.network_address}")
        print(f"  First Host:{hosts[0]}")
        print(f"  Last Host: {hosts[-1]}")
        print(f"  Broadcast: {subnet.broadcast_address}")
        print(f"  Hosts:     {len(hosts)}")
        print()

divide_24_into_four("192.168.1.0/24")
```

## Assigning Subnets to Segments

```python
import ipaddress

segments = {
    "Management":   0,
    "Servers":      1,
    "Users-Floor1": 2,
    "Users-Floor2": 3,
}

parent = ipaddress.IPv4Network("192.168.10.0/24")
subnets = list(parent.subnets(new_prefix=26))

print("Segment Assignments:")
for name, idx in segments.items():
    s = subnets[idx]
    print(f"  {name:15s}: {s}  (gateway: {list(s.hosts())[0]})")
```

## Configuring on Linux

```bash
# Assuming the VLAN interfaces already exist, assign each /26 gateway IP

sudo ip addr add 192.168.1.1/26 dev eth0.10    # Subnet 1 gateway
sudo ip addr add 192.168.1.65/26 dev eth0.20   # Subnet 2 gateway
sudo ip addr add 192.168.1.129/26 dev eth0.30  # Subnet 3 gateway
sudo ip addr add 192.168.1.193/26 dev eth0.40  # Subnet 4 gateway
```

## Key Takeaways

- Dividing /24 into 4 equal parts = /26 (borrow 2 bits).
- Each /26 has 62 usable host addresses.
- The four subnets start at .0, .64, .128, .192 in the last octet.
- For 2 equal subnets use /25; for 8 use /27; for 16 use /28.
