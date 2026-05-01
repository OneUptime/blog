# How to Enumerate IPv6 Network Hosts in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, IPv6, Network Scanning, Ipaddress, Host, Enumeration

Description: Enumerate hosts in IPv6 networks using Python, handling the unique challenges of large address spaces with generators and sampling techniques.

## The IPv6 Enumeration Challenge

Unlike IPv4, where a /24 has 254 hosts (easy to enumerate), IPv6 subnets are enormous:
- A /64 has 2^64 = 18,446,744,073,709,551,616 addresses
- You cannot iterate through all of them

Enumeration strategies for IPv6:
1. Use generators (lazy iteration) for small subnets (/120 or smaller)
2. Sample random addresses for scanning
3. Use NDP cache to discover active hosts instead of scanning

## Enumerating Small Subnets

The `hosts()` method works for small subnets:

```python
import ipaddress

# Works for small subnets - generates addresses lazily

subnet = ipaddress.IPv6Network("2001:db8:1::/126")

print(f"Network: {subnet}")
print(f"Hosts: {subnet.num_addresses - 1}")   # Excludes Subnet-Router anycast

for host in subnet.hosts():
    print(host)
# 2001:db8:1::1
# 2001:db8:1::2
# 2001:db8:1::3
```

## Safe Enumeration with Size Check

Always check subnet size before iterating:

```python
import ipaddress

MAX_SAFE_HOSTS = 65536  # Only enumerate if fewer than this many usable hosts

def safe_enumerate_hosts(network_str: str):
    """Enumerate hosts only if the network is small enough."""
    network = ipaddress.IPv6Network(network_str)
    host_count = network.num_addresses if network.prefixlen >= 127 else network.num_addresses - 1

    if host_count > MAX_SAFE_HOSTS:
        raise ValueError(
            f"Network {network_str} has {host_count:,} hosts - too large to enumerate. "
            f"Consider using NDP discovery instead."
        )

    return list(network.hosts())

# Small subnet - safe
hosts = safe_enumerate_hosts("2001:db8:1::/120")
print(f"Found {len(hosts)} hosts")

# Large subnet - raises error
try:
    safe_enumerate_hosts("2001:db8:1::/64")
except ValueError as e:
    print(f"Error: {e}")
```

## Generating Host Addresses by Pattern

For management automation, generate addresses at known offsets rather than enumerating:

```python
import ipaddress

def generate_management_addresses(prefix_str: str) -> dict[str, ipaddress.IPv6Address]:
    """
    Generate well-known management addresses within a prefix.
    Convention: router=::1, switch=::2, mgmt=::10, server range=::100+
    """
    prefix = ipaddress.IPv6Network(prefix_str)
    base_int = int(prefix.network_address)

    return {
        "router":    ipaddress.IPv6Address(base_int + 1),
        "switch1":   ipaddress.IPv6Address(base_int + 2),
        "switch2":   ipaddress.IPv6Address(base_int + 3),
        "mgmt_vlan": ipaddress.IPv6Address(base_int + 10),
        "server1":   ipaddress.IPv6Address(base_int + 100),
        "server2":   ipaddress.IPv6Address(base_int + 101),
        "server3":   ipaddress.IPv6Address(base_int + 102),
    }

# Generate management addresses for a rack subnet
mgmt = generate_management_addresses("2001:db8:1:1::/64")
for role, addr in mgmt.items():
    print(f"{role:12}: {addr}")
```

## NDP-Based Host Discovery

Instead of scanning, query the NDP neighbor cache to find active hosts:

```python
import subprocess
import ipaddress
import re

def discover_hosts_via_ndp(interface: str) -> list[ipaddress.IPv6Address]:
    """
    Discover active IPv6 hosts using NDP neighbor cache.
    Much more efficient than scanning for IPv6.
    """
    result = subprocess.run(
        ["ip", "-6", "neigh", "show", "dev", interface],
        capture_output=True, text=True
    )

    addresses = []
    for line in result.stdout.splitlines():
        # Skip FAILED entries (unreachable)
        if "FAILED" in line:
            continue
        # Extract IPv6 address from the start of each line
        match = re.match(r'^([0-9a-fA-F:]+)\s', line)
        if match:
            try:
                addr = ipaddress.IPv6Address(match.group(1))
                if addr.is_global:  # Only include global unicast
                    addresses.append(addr)
            except ValueError:
                pass

    return addresses

# Discover hosts on your LAN
# active_hosts = discover_hosts_via_ndp("eth0")
# for host in active_hosts:
#     print(host)
```

## IPv6 Ping Sweep for Small Subnets

For subnets with known patterns (like /120 which has 256 addresses):

```python
import ipaddress
import subprocess
import concurrent.futures

def ping6_sweep(network_str: str, timeout: int = 1) -> list[ipaddress.IPv6Address]:
    """Ping all hosts in a small IPv6 subnet and return responsive ones."""
    network = ipaddress.IPv6Network(network_str)

    if network.num_addresses > 256:
        raise ValueError("Subnet too large for ping sweep")

    def ping_host(addr: ipaddress.IPv6Address) -> ipaddress.IPv6Address | None:
        result = subprocess.run(
            ["ping", "-6", "-c", "1", "-W", str(timeout), str(addr)],
            capture_output=True
        )
        return addr if result.returncode == 0 else None

    responsive = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
        futures = {executor.submit(ping_host, host): host for host in network.hosts()}
        for future in concurrent.futures.as_completed(futures):
            result = future.result()
            if result:
                responsive.append(result)

    return sorted(responsive)
```

## Conclusion

IPv6 host enumeration requires a different mindset than IPv4. For large /64 networks, use NDP cache discovery, known address patterns, or DHCP lease files rather than exhaustive scanning. Python's `ipaddress` module provides the building blocks for safe, lazy enumeration of smaller subnets and for generating addresses at known offsets.
