# How to Understand Link-Local Addresses (fe80::/10)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Link-Local, Fe80, RFC 4291, NDP, Neighbor Discovery

Description: Understand IPv6 link-local addresses in the fe80::/10 range (RFC 4291), how they are generated, their role in Neighbor Discovery, and how to work with them in applications.

## Introduction

Link-local unicast addresses (`fe80::/10`) are automatically configured on IPv6-enabled non-loopback interfaces. They are scoped to a single network link and are never forwarded by routers. They serve as the foundation for Neighbor Discovery Protocol (NDP), SLAAC, and router advertisements. Every IPv6 node must have at least one link-local address on each interface.

## Link-Local Address Structure

```yaml
 | 10 bits  |  54 bits (zeros) |    64 bits Interface ID    |
 +----------+------------------+----------------------------+
 | 1111111010|  000...000       |       Interface ID         |
 +----------+------------------+----------------------------+
 fe80::/10

 Interface ID sources:
   1. EUI-64 from MAC address (RFC 4291 §2.5.1)
   2. Stable opaque value (RFC 7217)
   3. Manually assigned
```

## EUI-64 Interface ID from MAC

```python
def mac_to_eui64(mac: str) -> str:
    """
    Convert a MAC address to an EUI-64 Interface ID.
    Insert 0xFFFE in the middle and flip the universal/local bit.
    """
    # Remove separators
    mac_clean = mac.replace(":", "").replace("-", "").upper()
    if len(mac_clean) != 12:
        raise ValueError("Invalid MAC address")

    # Split into OUI (3 bytes) and NIC-specific (3 bytes)
    oui = mac_clean[:6]
    nic = mac_clean[6:]

    # Insert FF:FE between OUI and NIC
    eui64 = oui + "FFFE" + nic

    # Flip the Universal/Local (U/L) bit (bit 6 of first byte)
    first_byte = int(eui64[:2], 16)
    first_byte ^= 0x02  # Flip bit 1
    eui64 = f"{first_byte:02X}" + eui64[2:]

    # Format as IPv6 groups
    groups = [eui64[i:i+4] for i in range(0, 16, 4)]
    return ":".join(groups)

def mac_to_link_local(mac: str) -> str:
    """Generate the link-local address from a MAC address."""
    iid = mac_to_eui64(mac)
    return f"fe80::{iid}"

# Example

print(mac_to_link_local("00:1a:2b:3c:4d:5e"))
# fe80::021a:2bff:fe3c:4d5e
```

## Verifying Link-Local Addresses

```bash
# Show link-local addresses on all interfaces
ip -6 addr show scope link
# inet6 fe80::1/64 scope link

# Show only link-local
ip -6 addr show | grep "scope link"

# Ping link-local (specify the interface)
ping -6 fe80::1%eth0
# The interface can be specified with %eth0 or -I eth0

# Neighbor Discovery: resolve link-local to MAC
ip -6 neigh show
# fe80::1 dev eth0 lladdr 00:1a:2b:3c:4d:5e REACHABLE
```

## Using Link-Local Addresses in Applications

```python
import socket

# Connect to a link-local address - requires scope ID
# In Python, use the 4th element of the address tuple for scope ID
# scope_id = interface index (from socket.if_nametoindex)

interface = "eth0"
scope_id = socket.if_nametoindex(interface)

# TCP connect to link-local server
sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
sock.connect(("fe80::1", 8080, 0, scope_id))
sock.sendall(b"GET / HTTP/1.1\r\nHost: [fe80::1]:8080\r\n\r\n")
print(sock.recv(1024).decode())
sock.close()
```

## NDP and Router Advertisements Use Link-Local

```bash
# Routers send Router Advertisements from their link-local address
# Capture RA packets
tcpdump -i eth0 -n "icmp6 and ip6[40]==134"
# ICMP6 type 134 = Router Advertisement

# Hosts typically use a router's link-local address as the default gateway
ip -6 route show default
# default via fe80::1 dev eth0 proto ra metric 1024

# Router Advertisements identify routers by their link-local address
# so RA-learned default routes use fe80::/10 next hops
```

## Security Considerations

```bash
# Block unsolicited RAs on a host firewall
ip6tables -A INPUT -p ipv6-icmp --icmpv6-type router-advertisement \
  ! -i eth-router -j DROP

# Block malicious Neighbor Solicitation spoofing
# Use SEND (Secure Neighbor Discovery, RFC 3971) in high-security environments
```

## Conclusion

Link-local addresses (`fe80::/10`) are automatically assigned to IPv6-enabled non-loopback interfaces and serve as the foundation for NDP, SLAAC, and routing protocol adjacencies. In applications, they typically require a scope identifier such as `%interface` in text form or a numeric scope ID in the socket API. Every production network depends on link-local working correctly - monitor for NDP failures and RA issues with OneUptime network monitoring.
