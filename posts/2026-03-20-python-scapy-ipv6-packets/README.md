# How to Craft and Analyze IPv6 Packets with Python Scapy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Scapy, Python, Packet Crafting, Network Analysis

Description: Use Python Scapy to craft, send, capture, and analyze IPv6 packets including ICMPv6, TCP/UDP over IPv6, extension headers, and Neighbor Discovery Protocol.

## Scapy IPv6 Basics

Install Scapy and import IPv6 layers.

```bash
pip install scapy
```

```python
from scapy.all import *
from scapy.layers.inet6 import *

# Basic IPv6 packet

pkt = IPv6(dst="::1") / ICMPv6EchoRequest()
pkt.show()

# Send and receive
response = sr1(pkt, timeout=2, verbose=False)
if response:
    print(f"Reply from: {response[IPv6].src}")
    print(f"RTT: {response.time - pkt.sent_time:.3f}s")
else:
    print("No response")
```

## ICMPv6 Packets

```python
from scapy.all import *
from scapy.layers.inet6 import *

# ICMPv6 Echo Request (ping6)
ping_pkt = IPv6(dst="2001:db8::1") / ICMPv6EchoRequest(id=0x1234, seq=1, data=b"Hello IPv6")

# ICMPv6 Echo Reply
reply_pkt = IPv6(dst="2001:db8::1") / ICMPv6EchoReply(id=0x1234, seq=1)

# ICMPv6 Destination Unreachable
unreach = IPv6(dst="2001:db8::2") / ICMPv6DestUnreach(code=0)

# Neighbor Solicitation (NDP NS)
ns = IPv6(dst="ff02::1:ff00:1", hlim=255) / \
     ICMPv6ND_NS(tgt="2001:db8::1") / \
     ICMPv6NDOptSrcLLAddr(lladdr="de:ad:be:ef:00:01")

# Neighbor Advertisement (NDP NA)
na = IPv6(src="2001:db8::1", dst="ff02::1", hlim=255) / \
     ICMPv6ND_NA(tgt="2001:db8::1", R=0, S=0, O=1) / \
     ICMPv6NDOptDstLLAddr(lladdr="de:ad:be:ef:00:01")

# Router Advertisement
ra = IPv6(src="fe80::1", dst="ff02::1", hlim=255) / \
     ICMPv6ND_RA(chlim=64, M=0, O=0) / \
     ICMPv6NDOptPrefixInfo(
         prefixlen=64,
         L=1, A=1,
         validlifetime=86400,
         preferredlifetime=14400,
         prefix="2001:db8:1::"
     ) / \
     ICMPv6NDOptRDNSS(lifetime=300, dns=["2606:4700:4700::1111"])

# Send RA (requires root/CAP_NET_RAW)
sendp(Ether(dst="33:33:00:00:00:01") / ra, iface="eth0", verbose=False)
```

## TCP/UDP over IPv6

```python
from scapy.all import *
from scapy.layers.inet6 import *

# TCP SYN over IPv6
target = "::1"  # Replace with a reachable IPv6 host running TCP/80 if needed.
syn = IPv6(dst=target) / TCP(dport=80, flags="S", sport=RandShort(), seq=RandInt())
resp = sr1(syn, timeout=2, verbose=False)
if resp and resp.haslayer(TCP):
    print(f"TCP flags: {resp[TCP].flags}")
    if resp[TCP].flags == "SA":
        print("Port 80 is open")
        # Send RST to clean up the half-open connection
        rst = IPv6(dst=target) / TCP(dport=80, sport=syn[TCP].sport, flags="R", seq=resp[TCP].ack)
        send(rst, verbose=False)

# UDP packet over IPv6
resolver = "2606:4700:4700::1111"
udp_pkt = IPv6(dst=resolver) / UDP(sport=RandShort(), dport=53) / DNS(rd=1, qd=DNSQR(qname="google.com", qtype="AAAA"))
dns_resp = sr1(udp_pkt, timeout=2, verbose=False)
if dns_resp and dns_resp.haslayer(DNS):
    for rr in dns_resp[DNS].an:
        if rr.type == 28:  # AAAA
            print(f"AAAA record: {rr.rdata}")
```

## Packet Capture and Analysis

```python
from scapy.all import *
from scapy.layers.inet6 import *
import collections

def analyze_ipv6_capture(interface="eth0", count=100, timeout=30):
    """Capture and analyze IPv6 traffic."""
    stats = collections.defaultdict(int)
    src_counts = collections.Counter()

    def process_packet(pkt):
        if not pkt.haslayer(IPv6):
            return
        ip6 = pkt[IPv6]
        stats["total"] += 1
        src_counts[ip6.src] += 1

        # Count by next header
        nh_names = {6: "TCP", 17: "UDP", 58: "ICMPv6", 43: "Routing", 44: "Fragment"}
        nh = nh_names.get(ip6.nh, f"NH={ip6.nh}")
        stats[nh] += 1

        # Count ICMPv6 types
        if pkt.haslayer(ICMPv6EchoRequest):
            stats["ICMPv6 Echo Request"] += 1
        elif pkt.haslayer(ICMPv6ND_NS):
            stats["NDP NS"] += 1
        elif pkt.haslayer(ICMPv6ND_NA):
            stats["NDP NA"] += 1
        elif pkt.haslayer(ICMPv6ND_RA):
            stats["NDP RA"] += 1

    sniff(iface=interface, filter="ip6", prn=process_packet,
          count=count, timeout=timeout, store=False)

    print("\n=== IPv6 Traffic Analysis ===")
    for k, v in sorted(stats.items(), key=lambda x: -x[1]):
        print(f"  {k:30s}: {v}")
    print("\nTop sources:")
    for src, cnt in src_counts.most_common(5):
        print(f"  {src:40s}: {cnt} packets")

# Run (requires root)
# analyze_ipv6_capture(interface="eth0", count=200, timeout=60)
```

## IPv6 Extension Headers

```python
from scapy.all import *
from scapy.layers.inet6 import *

# IPv6 packet carrying a Fragment header
# (this does not split the payload into multiple packets by itself)
frag_pkt = IPv6(dst="2001:db8::1") / \
           IPv6ExtHdrFragment(id=0x1234, offset=0, m=1) / \
           UDP(dport=9999) / \
           Raw(load=b"A" * 1000)

# IPv6 with Hop-by-Hop Options header
hop_pkt = IPv6(dst="2001:db8::1") / \
          IPv6ExtHdrHopByHop(options=[
              RouterAlert(otype=0x05, optlen=2, value=0)  # MLD router alert
          ]) / \
          ICMPv6EchoRequest()

# IPv6 with Routing header (Type 0 - deprecated, for study only)
# Note: Type 0 RH is filtered by most modern routers
route_pkt = IPv6(dst="2001:db8::2") / \
            IPv6ExtHdrRouting(addresses=["2001:db8::3"]) / \
            ICMPv6EchoRequest()

# Parse raw bytes containing extension headers
raw_bytes = bytes(hop_pkt)
parsed = IPv6(raw_bytes)
parsed.show()
```

## Conclusion

Scapy provides a Python API for crafting and parsing common IPv6 packet types: use `IPv6()` as the base layer, `ICMPv6EchoRequest()` for ping6, `ICMPv6ND_NS/NA/RA()` for Neighbor Discovery Protocol, and `TCP()`/`UDP()` for transport layer packets. Layer packets with `/` operator and send with `send()` (layer 3) or `sendp()` (layer 2 with Ethernet). Capture live traffic with `sniff(filter="ip6")` and use `pkt.haslayer()` to detect protocol layers. Live packet injection and sniffing usually require root or the needed capabilities (for example, `CAP_NET_RAW` and sometimes `CAP_NET_ADMIN`). Use Scapy for testing NDP implementations, firewall rules, and protocol analyzers - not in production traffic flows.
