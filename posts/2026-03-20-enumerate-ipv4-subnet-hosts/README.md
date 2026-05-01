# How to Enumerate All Host Addresses in an IPv4 Subnet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, IPv4, Subnets, Networking, Ipaddress, CIDR

Description: Learn how to enumerate all host addresses in an IPv4 subnet in Python using the ipaddress module, with examples for host iteration, address generation, and subnet scanning.

## Enumerate Usable Hosts

```python
import ipaddress

net = ipaddress.IPv4Network("192.168.1.0/24")

# For a /24, .hosts() yields all usable addresses except network and broadcast

for host in net.hosts():
    print(host)
# 192.168.1.1
# 192.168.1.2
# ...
# 192.168.1.254

print(f"Total usable hosts: {len(list(net.hosts()))}")  # 254
```

## Iterate All Addresses Including Network and Broadcast

```python
import ipaddress

# Iterate directly over the network to include all 256 addresses
net = ipaddress.IPv4Network("192.168.1.0/24")
for addr in net:
    pass  # processes 192.168.1.0 through 192.168.1.255

# Access first, last, network, and broadcast addresses
print(f"Network:   {net.network_address}")   # 192.168.1.0
print(f"First host:{next(net.hosts())}")      # 192.168.1.1
print(f"Last host: {list(net.hosts())[-1]}")  # 192.168.1.254
print(f"Broadcast: {net.broadcast_address}") # 192.168.1.255
```

## Lazy Generator for Large Subnets

```python
import ipaddress
from typing import Iterator

def iter_hosts(cidr: str) -> Iterator[ipaddress.IPv4Address]:
    """Memory-efficient host iterator for large subnets."""
    net = ipaddress.IPv4Network(cidr, strict=False)
    yield from net.hosts()

# /16 has 65534 hosts - iterate without building a list
count = 0
for host in iter_hosts("10.0.0.0/16"):
    count += 1
print(f"Counted {count} hosts")  # 65534
```

## Count and Summarise Hosts

```python
import ipaddress

def subnet_summary(cidr: str) -> None:
    net = ipaddress.IPv4Network(cidr, strict=False)
    hosts = list(net.hosts())

    print(f"Network:       {net}")
    print(f"Prefix length: /{net.prefixlen}")
    print(f"Total addrs:   {net.num_addresses}")
    print(f"Usable hosts:  {len(hosts)}")
    if hosts:
        print(f"First host:    {hosts[0]}")
        print(f"Last host:     {hosts[-1]}")
    print(f"Network addr:  {net.network_address}")
    print(f"Broadcast:     {net.broadcast_address}")

subnet_summary("10.0.0.0/29")
# Network:       10.0.0.0/29
# Prefix length: /29
# Total addrs:   8
# Usable hosts:  6
# First host:    10.0.0.1
# Last host:     10.0.0.6
```

## Scan Hosts with Concurrent Ping

```python
import ipaddress
import subprocess
import concurrent.futures

def ping(ip: str) -> tuple[str, bool]:
    result = subprocess.run(
        ["ping", "-c", "1", "-W", "1", str(ip)],
        capture_output=True
    )
    return str(ip), result.returncode == 0

def scan_subnet(cidr: str, workers: int = 64) -> list[str]:
    """Return list of responding hosts in the subnet."""
    net   = ipaddress.IPv4Network(cidr, strict=False)
    alive = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(ping, host): host for host in net.hosts()}
        for f in concurrent.futures.as_completed(futures):
            ip, up = f.result()
            if up:
                alive.append(ip)
    return sorted(alive, key=ipaddress.IPv4Address)

# reachable = scan_subnet("192.168.1.0/24")
# print("Responding hosts:", reachable)
```

## Conclusion

`IPv4Network.hosts()` returns a lazy iterator over usable addresses. In typical IPv4 subnets it excludes the network and broadcast addresses, while `/31` includes both addresses and `/32` returns the single host. Iterating directly over the network object includes all addresses including network and broadcast. For subnet scans, combine `hosts()` with `concurrent.futures.ThreadPoolExecutor` to probe many hosts in parallel. Use `strict=False` when constructing networks from interface addresses that may have host bits set.
