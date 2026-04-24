# How to Use Python scapy for IPv6 Packet Crafting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Scapy, IPv6, Packet Crafting, Network Testing, Security

Description: Use Python's scapy library to craft, send, and capture IPv6 packets for network testing, protocol analysis, and security research.

## Installing scapy

```bash
pip install scapy

# On Linux, scapy needs root or CAP_NET_RAW for raw socket access
# Packet filters used with sniff(filter=...) rely on libpcap/BPF support

# Run scripts with sudo or grant capabilities
```

## Basic IPv6 Packet Crafting

```python
from scapy.all import *
from scapy.layers.inet6 import IPv6

# Create a basic IPv6 packet
packet = IPv6(
    src="2001:db8::1",    # Source address
    dst="2001:db8::2",    # Destination address
    hlim=64               # Hop limit (TTL equivalent)
)

# View packet fields
packet.show()
print(f"Packet bytes: {bytes(packet).hex()}")
```

## ICMPv6 Echo (Ping)

```python
from scapy.all import *
from scapy.layers.inet6 import IPv6, ICMPv6EchoRequest

def ping6_scapy(destination: str, count: int = 3):
    """Send ICMPv6 echo requests and display responses."""
    for i in range(count):
        # Build the packet: IPv6 header + ICMPv6 Echo Request
        packet = IPv6(dst=destination) / ICMPv6EchoRequest(id=i, seq=i)

        # sr1 = send and receive 1 response (timeout=2 seconds)
        response = sr1(packet, timeout=2, verbose=False)

        if response:
            print(f"Reply from {response[IPv6].src}: seq={i}")
        else:
            print(f"Request timeout for seq={i}")

# ping6_scapy("2001:4860:4860::8888")
```

## NDP Neighbor Solicitation

```python
import socket
from scapy.all import *
from scapy.layers.inet6 import (
    IPv6, ICMPv6ND_NS, ICMPv6ND_NA,
    ICMPv6NDOptSrcLLAddr
)
from scapy.utils6 import in6_getnsma, in6_getnsmac

def send_neighbor_solicitation(target_ip: str, interface: str):
    """
    Send an NDP Neighbor Solicitation to discover the MAC address
    of a target IPv6 address.
    """
    # Solicited-node multicast: ff02::1:ffXX:XXXX
    target_bytes = socket.inet_pton(socket.AF_INET6, target_ip)
    solicited_multicast_bytes = in6_getnsma(target_bytes)
    solicited_multicast = socket.inet_ntop(
        socket.AF_INET6,
        solicited_multicast_bytes
    )
    source_ip = conf.route6.route(target_ip, dev=interface)[1]
    source_mac = get_if_hwaddr(interface)

    packet = (
        Ether(src=source_mac, dst=in6_getnsmac(solicited_multicast_bytes)) /
        IPv6(src=source_ip, dst=solicited_multicast, hlim=255) /
        ICMPv6ND_NS(tgt=target_ip) /
        ICMPv6NDOptSrcLLAddr(lladdr=source_mac)
    )

    # Send and wait for Neighbor Advertisement
    response = srp1(
        packet,
        iface=interface,
        type=ETH_P_IPV6,
        timeout=2,
        verbose=False
    )
    if response and response.haslayer(ICMPv6ND_NA):
        print(f"Target {target_ip} is at {response[Ether].src}")
    else:
        print(f"No response from {target_ip}")
```

## TCP SYN Scan over IPv6

```python
from scapy.all import *
from scapy.layers.inet6 import IPv6, ICMPv6DestUnreach

def tcp_syn_scan_ipv6(target: str, ports: list[int]) -> dict[int, str]:
    """
    Perform a TCP SYN scan against IPv6 target.
    Returns dict of {port: state} where state is 'open', 'closed',
    'filtered', or 'unknown'
    """
    results = {}

    for port in ports:
        sport = RandShort()
        packet = IPv6(dst=target) / TCP(sport=sport, dport=port, flags="S")
        response = sr1(packet, timeout=2, verbose=False)

        if response is None:
            results[port] = "filtered"
        elif response.haslayer(TCP):
            if response[TCP].flags == 0x12:  # SYN-ACK
                results[port] = "open"
                # Send RST to clean up the connection
                send(
                    IPv6(dst=target) /
                    TCP(sport=sport, dport=port, flags="R", seq=response[TCP].ack),
                    verbose=False
                )
            elif response[TCP].flags & 0x04:  # RST
                results[port] = "closed"
        elif response.haslayer(ICMPv6DestUnreach):
            results[port] = "filtered"
        else:
            results[port] = "unknown"

    return results
```

## Sniffing IPv6 Traffic

```python
from scapy.all import sniff
from scapy.layers.inet6 import IPv6, ICMPv6ND_NS

def capture_ipv6_ndp(interface: str, duration: int = 10):
    """Capture and display NDP Neighbor Solicitation messages."""
    print(f"Capturing NDP traffic on {interface} for {duration}s...")

    def process_packet(pkt):
        if pkt.haslayer(IPv6):
            src = pkt[IPv6].src
            if pkt.haslayer(ICMPv6ND_NS):
                target = pkt[ICMPv6ND_NS].tgt
                print(f"NDP NS: {src} looking for {target}")

    # BPF filter: capture ICMPv6 traffic
    sniff(
        iface=interface,
        filter="icmp6",
        prn=process_packet,
        timeout=duration
    )
```

## Crafting IPv6 Extension Headers

```python
from scapy.all import *
from scapy.layers.inet6 import IPv6, IPv6ExtHdrHopByHop, ICMPv6EchoRequest

# Create packet with Hop-by-Hop extension header
packet = (
    IPv6(dst="2001:db8::1") /
    IPv6ExtHdrHopByHop(options=[]) /  # Empty HBH extension header
    ICMPv6EchoRequest()
)

packet.show()
```

## Conclusion

Scapy makes IPv6 packet crafting accessible in Python. From ICMPv6 pings to TCP SYN scans and NDP message construction, scapy handles IPv6 extension headers and checksum computation automatically, and lets you work at Layer 2 when you need explicit Ethernet framing. Use it for protocol testing, network security research, and custom network tool development - always in authorized environments.
