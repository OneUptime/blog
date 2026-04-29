# How to Map IPv4 Addresses to Physical Network Interfaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Linux, Networking, Network Interfaces, Sysadmin

Description: Mapping IPv4 addresses to network interfaces involves using ip, ifconfig, and Python's psutil to discover which addresses are bound to which interfaces, essential for multi-homed host configuration.

## Viewing Interface-to-Address Mappings

```bash
# Linux: modern approach with ip

ip addr show

# Show only addresses for a specific interface
ip addr show dev eth0

# Legacy ifconfig
ifconfig

# macOS
ifconfig

# Windows
ipconfig /all
```

## Python: Enumerate All Interface Addresses

```python
import socket
import psutil

def get_interfaces_and_ips() -> dict:
    """
    Return a dict of {interface_name: [ip_addresses]}.
    Uses psutil's cross-platform network interface APIs.
    """
    result = {}
    for iface, addrs in psutil.net_if_addrs().items():
        ips = []
        for addr in addrs:
            if addr.family == socket.AF_INET:  # IPv4 only
                ips.append({
                    "address": addr.address,
                    "netmask": addr.netmask,
                    "broadcast": addr.broadcast,
                })
        if ips:
            result[iface] = ips
    return result

ifaces = get_interfaces_and_ips()
for iface, ips in ifaces.items():
    for ip_info in ips:
        print(f"{iface:10s} {ip_info['address']:15s} mask={ip_info['netmask']}")
```

Install psutil: `pip install psutil`

## Adding a Secondary IP to an Interface

```bash
# Add a second IP address to eth0
sudo ip addr add 192.168.1.200/24 dev eth0

# View both IPs on eth0
ip addr show eth0

# Remove the secondary IP
sudo ip addr del 192.168.1.200/24 dev eth0
```

## Multi-Homed Host with Multiple Interfaces

A server with multiple NICs can have different subnets on each:

```bash
# eth0: connected to internal network
sudo ip addr add 10.0.1.10/24 dev eth0

# eth1: connected to DMZ
sudo ip addr add 172.16.100.10/24 dev eth1

# lo: loopback
ip addr show lo  # 127.0.0.1/8
```

## Binding a Service to a Specific Local Address

```python
import socket

# Bind only to the internal IP address
server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server.bind(("10.0.1.10", 8080))  # Accepts connections addressed to 10.0.1.10
server.listen(5)
print("Listening only on 10.0.1.10:8080")
```

## Key Takeaways

- Use `ip addr show` (Linux) or `ipconfig /all` (Windows) to see the interface-to-IP mapping.
- A single interface can have multiple IP addresses assigned to it.
- A multi-homed host has interfaces on multiple subnets; routing decides which interface to use.
- Bind services to specific local IPs to control access from different network segments.
