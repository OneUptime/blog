# How to Identify Broadcast Addresses in IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Networking, Broadcast, Subnetting, IP Addressing

Description: IPv4 broadcast addresses are the last address in each subnet (all host bits set to 1) and the limited broadcast 255.255.255.255, used to send packets to all hosts on a network segment simultaneously.

## Types of Broadcast in IPv4

| Type | Address | Scope |
|------|---------|-------|
| Limited Broadcast | 255.255.255.255 | Current network segment only |
| Directed Broadcast | Last address in subnet | All hosts in a specific subnet |

## Calculating the Directed Broadcast Address

The broadcast address of a subnet has all host bits set to 1:

```text
Network: 192.168.10.0/24
Mask:    255.255.255.0   = 11111111.11111111.11111111.00000000
                                                        ^^^^^^^^ host bits
Broadcast: 192.168.10.255 = all host bits = 1
```

## Python: Finding the Broadcast Address

```python
import ipaddress

def subnet_info(cidr: str):
    """Print subnet details including broadcast address."""
    net = ipaddress.IPv4Network(cidr, strict=False)
    if net.prefixlen >= 31:
        host_count = net.num_addresses
        first_host = net.network_address
        last_host = net.broadcast_address
    else:
        host_count = net.num_addresses - 2
        first_host = net.network_address + 1
        last_host = net.broadcast_address - 1

    print(f"Network    : {net.network_address}")
    print(f"Broadcast  : {net.broadcast_address}")
    print(f"Subnet Mask: {net.netmask}")
    print(f"Host Count : {host_count}")
    print(f"First Host : {first_host}")
    print(f"Last Host  : {last_host}")

# Examples

for cidr in ["192.168.10.0/24", "10.0.0.0/8", "172.16.50.0/20"]:
    print(f"\n--- {cidr} ---")
    subnet_info(cidr)
```

## Checking if an Address is a Broadcast

```python
import ipaddress

def is_broadcast(ip: str, network_cidr: str) -> bool:
    """Check if ip is the broadcast address of the given network."""
    net = ipaddress.IPv4Network(network_cidr, strict=False)
    return ipaddress.IPv4Address(ip) == net.broadcast_address

print(is_broadcast("192.168.1.255", "192.168.1.0/24"))  # True
print(is_broadcast("192.168.1.254", "192.168.1.0/24"))  # False
```

## How Broadcast Works at Layer 2

A directed broadcast at Layer 3 maps to the Ethernet broadcast MAC address `FF:FF:FF:FF:FF:FF`. All hosts on the segment receive the frame and pass it up to the IP layer.

```bash
# Send a ping to the directed broadcast (Linux requires -b for broadcast ping)
ping -b 192.168.1.255

# Enable responding to broadcast pings (Linux)
echo 0 | sudo tee /proc/sys/net/ipv4/icmp_echo_ignore_broadcasts
```

## Security: Smurf Attack

A Smurf attack spoofs the victim's IP as the source and sends ICMP echo requests to broadcast addresses. All hosts reply to the victim, amplifying traffic. Modern routers block directed broadcast forwarding by default.

```bash
# Verify directed broadcast forwarding is disabled on Linux router
cat /proc/sys/net/ipv4/conf/all/bc_forwarding  # 0 = disabled
```

## Key Takeaways

- Broadcast address = network address with all host bits set to 1.
- `255.255.255.255` is the limited broadcast (local segment only).
- Directed broadcast sends to all hosts in a specific subnet.
- Directed broadcast forwarding is disabled by default to prevent Smurf amplification attacks.
