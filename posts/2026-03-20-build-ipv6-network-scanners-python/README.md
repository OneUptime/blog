# How to Build IPv6 Network Scanners in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, IPv6, Network Scanner, NDP, Security, Automation

Description: Build IPv6 network scanners in Python using NDP discovery, multicast pings, and async connectivity probing.

## IPv6 Scanning Strategy

IPv6 /64 networks have 2^64 addresses - exhaustive scanning is impractical. Effective IPv6 scanning uses:
1. **NDP cache inspection**: Query the kernel's neighbor table
2. **Multicast ping**: Ping `ff02::1` to find all nodes on a link
3. **Targeted range scanning**: Scan known address patterns (::1, ::2, etc.)
4. **mDNS/DNS-SD**: Discover services via multicast DNS

## Scanner 1: NDP Cache Dumper

The fastest way to find active hosts - query the existing NDP cache:

```python
import subprocess
import ipaddress
from dataclasses import dataclass

@dataclass
class NeighborEntry:
    address: ipaddress.IPv6Address
    mac: str
    state: str
    interface: str

def scan_ndp_cache(interface: str | None = None) -> list[NeighborEntry]:
    """
    Scan the NDP neighbor cache to find active IPv6 hosts.
    This doesn't send any packets - just reads kernel state.
    """
    cmd = ["ip", "-6", "neigh", "show"]
    if interface:
        cmd += ["dev", interface]

    result = subprocess.run(cmd, capture_output=True, text=True)
    entries = []

    for line in result.stdout.splitlines():
        # Example outputs:
        # "2001:db8::1 dev eth0 lladdr 00:11:22:33:44:55 REACHABLE"
        # "fe80::1 dev eth0 lladdr 00:11:22:33:44:55 router STALE"
        tokens = line.split()
        if "dev" not in tokens or "lladdr" not in tokens:
            continue

        try:
            addr = ipaddress.IPv6Address(tokens[0])
            iface = tokens[tokens.index("dev") + 1]
            mac = tokens[tokens.index("lladdr") + 1]
            state = tokens[-1]
            entries.append(NeighborEntry(addr, mac, state, iface))
        except (ValueError, IndexError):
            pass

    return entries

# Scan and display

hosts = scan_ndp_cache("eth0")
print(f"Found {len(hosts)} hosts in NDP cache:")
for host in hosts:
    print(f"  {host.address}  MAC:{host.mac}  ({host.state})")
```

## Scanner 2: Multicast Ping Discovery

Ping `ff02::1` (all-nodes multicast) to populate the NDP cache:

```python
import subprocess
import time
import ipaddress

def multicast_discover(interface: str) -> list[ipaddress.IPv6Address]:
    """
    Discover IPv6 hosts on a link using multicast ping.
    Sends to ff02::1 and collects responses.
    """
    print(f"Sending multicast ping on {interface}...")

    # Ping all-nodes multicast
    subprocess.run(
        ["ping", "-6", "-c", "3", "-I", interface, "ff02::1"],
        capture_output=True
    )

    # Give NDP time to populate
    time.sleep(1)

    # Now scan the NDP cache
    return [entry.address for entry in scan_ndp_cache(interface)]

discovered = multicast_discover("eth0")
print(f"Discovered {len(discovered)} hosts via multicast:")
for addr in discovered:
    print(f"  {addr}")
```

## Scanner 3: Async Port Scanner

Scan specific ports across discovered hosts using asyncio:

```python
import asyncio
import ipaddress
from typing import Tuple

async def probe_port(
    host: str,
    port: int,
    timeout: float = 2.0
) -> Tuple[str, int, bool]:
    """Check if a TCP port is open on an IPv6 host."""
    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(host, port),
            timeout=timeout
        )
        writer.close()
        await writer.wait_closed()
        return (host, port, True)
    except (asyncio.TimeoutError, ConnectionRefusedError, OSError):
        return (host, port, False)

async def scan_hosts(
    hosts: list[str],
    ports: list[int]
) -> list[Tuple[str, int]]:
    """Scan multiple hosts and ports concurrently."""
    tasks = [
        probe_port(host, port)
        for host in hosts
        for port in ports
    ]

    results = await asyncio.gather(*tasks)
    open_ports = [(host, port) for host, port, is_open in results if is_open]
    return open_ports

# Usage
import asyncio

hosts = ["2001:db8::1", "2001:db8::2", "2001:db8::10"]
common_ports = [22, 80, 443, 8080, 8443]

open_services = asyncio.run(scan_hosts(hosts, common_ports))
for host, port in open_services:
    print(f"  [{host}]:{port} - OPEN")
```

## Scanner 4: DNS-Based Discovery

Enumerate hosts from DNS reverse zone for known prefixes:

```python
import dns.resolver
import dns.reversename
import ipaddress

def reverse_dns_scan(prefix_str: str) -> list[tuple[str, str]]:
    """
    Scan a small IPv6 subnet using reverse DNS lookups.
    Only practical for /120 or longer prefixes (256 total addresses or fewer).
    """
    prefix = ipaddress.IPv6Network(prefix_str)

    if prefix.num_addresses > 256:
        raise ValueError("Prefix too large for DNS scan")

    results = []
    resolver = dns.resolver.Resolver()

    for addr in prefix.hosts():
        try:
            rev_name = dns.reversename.from_address(str(addr))
            answer = resolver.resolve(rev_name, "PTR")
            for rdata in answer:
                results.append((str(addr), str(rdata.target)))
        except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer):
            pass

    return results
```

## Conclusion

Effective IPv6 network scanning combines NDP cache inspection, multicast discovery, and targeted async port probing. Since exhaustive address scanning is impractical for /64 subnets, these targeted approaches can find active hosts efficiently. Always obtain proper authorization before scanning any network.
