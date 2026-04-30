# How to Build IPv6 Network Scanners in Python - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Python, Network Scanning, Scapy, Security

Description: Build IPv6 network scanners in Python using ICMPv6 ping sweeps, NDP neighbor table reading, multicast group probing, and DNS-based host discovery.

## IPv6 Scanning Challenges

```text
IPv4 scanning: 254 hosts per /24 - trivial to sweep
IPv6 scanning: 18 quintillion addresses per /64 - impossible to brute-force

IPv6 discovery methods:
1. NDP neighbor table (passive - see who your local host already knows)
2. Multicast ping (ff02::1 - all nodes on segment)
3. DNS AAAA/PTR records for known hosts
4. Service-specific multicast groups (ff02::fb for mDNS)
5. DHCPv6 lease database
6. SLAAC address prediction (modified EUI-64 only, if MAC known)
```

## NDP Neighbor Table Reader

The fastest passive way to discover IPv6 hosts already present in the local kernel neighbor cache.

```python
import subprocess
import ipaddress
import re

def read_ndp_table(interface: str = None) -> list[dict]:
    """Read IPv6 neighbors from kernel NDP table."""
    cmd = ["ip", "-6", "neigh", "show"]
    if interface:
        cmd += ["dev", interface]

    result = subprocess.run(cmd, capture_output=True, text=True)
    neighbors = []

    for line in result.stdout.strip().split("\n"):
        if not line:
            continue
        # Format: 2001:db8::1 dev eth0 lladdr aa:bb:cc:dd:ee:ff REACHABLE
        parts = line.split()
        if len(parts) < 4:
            continue
        try:
            addr = ipaddress.ip_address(parts[0])
            entry = {
                "address": str(addr),
                "interface": parts[2],
                "mac": parts[4] if len(parts) >= 5 and ":" in parts[4] else None,
                "state": parts[-1],
                "is_link_local": addr.is_link_local,
                "is_global": addr.is_global,
            }
            neighbors.append(entry)
        except ValueError:
            continue

    return neighbors

# Display results

neighbors = read_ndp_table()
print(f"Found {len(neighbors)} IPv6 neighbors:")
for n in neighbors:
    if n["is_link_local"]:
        scope = "link-local"
    elif n["is_global"]:
        scope = "global"
    else:
        scope = "other"
    print(f"  {n['address']:40s} {scope:12s} MAC={n['mac']} [{n['state']}]")
```

## Multicast Ping Scanner

Ping the all-nodes multicast address to discover responding hosts on the segment.

```python
from scapy.all import *
from scapy.layers.inet6 import *
import ipaddress

def multicast_ping_scan(interface: str, timeout: int = 3) -> list[str]:
    """
    Send ICMPv6 echo request to ff02::1 (all nodes) and
    collect responses to discover active IPv6 hosts.
    """
    discovered = []

    # Build ping to all-nodes multicast
    ping = IPv6(dst=f"ff02::1%{interface}") / ICMPv6EchoRequest(id=0xBEEF, seq=1)

    print(f"Scanning all-nodes multicast on {interface}...")
    # Send and collect all responses
    responses, _ = srp(
        Ether(dst="33:33:00:00:00:01") / ping,
        iface=interface,
        timeout=timeout,
        verbose=False,
        multi=True,   # collect multiple responses
    )

    for sent, recv in responses:
        if recv.haslayer(ICMPv6EchoReply):
            src = recv[IPv6].src
            try:
                addr = ipaddress.ip_address(src)
                discovered.append(str(addr))
                print(f"  Responded: {addr}")
            except ValueError:
                pass

    return list(set(discovered))

# Run (requires root):
# hosts = multicast_ping_scan("eth0")
# print(f"Discovered {len(hosts)} hosts")
```

## EUI-64 Address Prediction

If you know a device's MAC address, predict its IPv6 address only when it uses modified EUI-64-based SLAAC.

```python
import ipaddress

def mac_to_eui64(mac: str) -> str:
    """Convert MAC address to EUI-64 interface identifier."""
    # Remove separators and split into bytes
    mac_clean = mac.replace(":", "").replace("-", "").lower()
    if len(mac_clean) != 12:
        raise ValueError(f"Invalid MAC: {mac}")

    parts = [mac_clean[i:i+2] for i in range(0, 12, 2)]
    # Insert ff:fe in the middle
    eui64_parts = parts[:3] + ["ff", "fe"] + parts[3:]
    # Flip the U/L bit (7th bit of first byte)
    first_byte = int(eui64_parts[0], 16) ^ 0x02
    eui64_parts[0] = f"{first_byte:02x}"

    # Format as IPv6 groups
    groups = []
    for i in range(0, 8, 2):
        groups.append(eui64_parts[i] + eui64_parts[i+1])
    return ":".join(groups)

def predict_slaac_address(prefix: str, mac: str) -> str:
    """Predict SLAAC address from prefix and MAC."""
    net = ipaddress.ip_network(prefix, strict=False)
    if net.version != 6 or net.prefixlen != 64:
        raise ValueError("SLAAC prediction requires an IPv6 /64 prefix")
    eui64 = mac_to_eui64(mac)
    # Combine the /64 network prefix with the 64-bit interface identifier
    interface_id = int(ipaddress.IPv6Address(f"::{eui64}"))
    return str(ipaddress.IPv6Address(int(net.network_address) | interface_id))

# Example
mac = "aa:bb:cc:dd:ee:ff"
prefix = "2001:db8:1:1::/64"
predicted = predict_slaac_address(prefix, mac)
print(f"MAC {mac} → SLAAC {predicted}")
# aa:bb:cc:dd:ee:ff → 2001:db8:1:1:a8bb:ccff:fedd:eeff
```

## DNS-Based IPv6 Discovery

```python
import subprocess
import ipaddress

def dns_ipv6_discovery(domain: str, nameserver: str = None) -> list[str]:
    """Discover IPv6 addresses for a domain via AAAA records."""
    cmd = ["dig", "+short", "AAAA", domain]
    if nameserver:
        cmd.append(f"@{nameserver}")

    result = subprocess.run(cmd, capture_output=True, text=True)
    addresses = []
    for line in result.stdout.strip().split("\n"):
        line = line.strip()
        if not line:
            continue
        try:
            addr = ipaddress.ip_address(line)
            if addr.version == 6:
                addresses.append(str(addr))
        except ValueError:
            pass
    return addresses

def reverse_dns_lookup(ipv6_addr: str) -> str:
    """Look up PTR record for an IPv6 address."""
    addr = ipaddress.ip_address(ipv6_addr)
    # Reverse nibble format
    full = addr.exploded.replace(":", "")
    ptr = ".".join(reversed(full)) + ".ip6.arpa"
    cmd = ["dig", "+short", "PTR", ptr]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stdout.strip() or "no PTR record"

# Discover AAAA records
hosts = dns_ipv6_discovery("google.com")
print(f"Google IPv6 addresses: {hosts}")

# Reverse lookup
for host in hosts[:2]:
    ptr = reverse_dns_lookup(host)
    print(f"  {host} -> {ptr}")
```

## Conclusion

IPv6 network scanning cannot use traditional sequential address sweeps due to the enormous address space of a /64. Effective IPv6 host discovery uses: NDP neighbor table inspection (`ip -6 neigh show`) for hosts already present in the local neighbor cache, multicast ping to `ff02::1` for responding nodes on the local segment, modified EUI-64 prediction when device MAC addresses are known and the target uses EUI-64-based SLAAC, and DNS AAAA/PTR record queries for service hosts. Build Python scanners with `subprocess` for NDP table reading, Scapy for multicast probes, and `ipaddress` for address manipulation. Always obtain proper authorization before scanning networks - IPv6 multicast probes are detectable by SIEM systems.
