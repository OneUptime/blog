# How to Handle Unknown Extension Headers in Middleboxes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Extension Headers, Middleboxes, Firewall, RFC 7045

Description: Understand how middleboxes should handle unknown IPv6 extension headers, the RFC 7045 guidelines, and why incorrect handling causes connectivity failures.

## Introduction

A "middlebox" is any network device between two communicating endpoints that is not the final destination - firewalls, load balancers, deep packet inspection systems, and network address translators. The handling of unknown IPv6 extension headers by middleboxes is a major source of connectivity problems in IPv6 networks. RFC 7045 defines clear rules for how forwarding nodes that inspect IPv6 headers MUST handle extension headers.

## The Problem: Middlebox Drop Behavior

Many IPv6 deployments suffer from "extension header filtering" where middleboxes incorrectly drop packets containing extension headers they don't recognize. This breaks:

- IPv6 fragmentation (Fragment Header = 44)
- IPsec (AH = 51, ESP = 50)
- Mobility (MIPv6 = 135)
- New protocols that add new extension headers

Research has shown that a significant fraction of internet paths drop packets with extension headers:

```text
Measured extension header drop rates from RFC 7872 (Alexa Top 1M dataset):
  Destination Options header (8 bytes):                 10.91% drop rate
  Fragmented packets (roughly two 512-byte fragments): 28.26% drop rate
  Hop-by-Hop Options header (8 bytes):                 45.45% drop rate
```

## RFC 7045: Extension Header Transmission Rules

RFC 7045 defines what middleboxes MUST and SHOULD do:

```text
Forwarding nodes that inspect extension headers:
  - MUST recognize and deal appropriately with all standard IPv6 extension header types
  - SHOULD recognize and deal appropriately with experimental extension header types
  - MUST make discard policy individually configurable for each standard extension header type
  - SHOULD allow all standard extension headers by default

Unrecognized or experimental extension headers:
  - Intermediate forwarding nodes SHOULD NOT drop a packet only because the header is unrecognized
  - Forwarding nodes MUST be configurable to allow unrecognized extension headers
  - Default configuration MAY drop unrecognized extension headers
  - Experimental extension headers SHOULD have individually configurable policy, and defaults MAY drop them

Routing Header special case:
  - Routing Header Type 0 is deprecated by RFC 5095
  - This does NOT justify dropping all Routing Headers by default
```

## Testing Extension Header Passthrough

```bash
# Test if a path passes Fragment Headers

# A large ping may trigger local fragmentation when the outgoing MTU requires it.
# Verify on the wire; this does not guarantee a Fragment Header on every path.
ping -6 -s 2000 -M want 2001:db8::target

# Test with specific extension headers using scapy
python3 << 'EOF'
from scapy.all import *

# Build and send an actually fragmented ICMPv6 Echo Request
base = IPv6(dst="2001:db8::target") / ICMPv6EchoRequest(data=b"A" * 2000)
frags = fragment6(base, 512)

# Send and see if we get a response
ans, unans = sr(frags, timeout=2, verbose=0)
if ans:
    print("Fragment Header: PASSED")
else:
    print("Fragment Header: DROPPED (or no route)")
EOF

# Test ICMPv6 with Hop-by-Hop Router Alert
python3 << 'EOF'
from scapy.all import *

# MLD Membership Query uses Router Alert
pkt = IPv6(dst="ff02::1", hlim=1) / \
      IPv6ExtHdrHopByHop(options=[RouterAlert(value=0)]) / \
      ICMPv6MLQuery()
send(pkt, verbose=0)
print("Sent MLD query with Router Alert")
EOF
```

## Firewall Configuration for Extension Header Passthrough

```bash
# ip6tables: allow essential extension headers

# Allow packets that contain a Fragment Header
sudo ip6tables -A FORWARD -m ipv6header --soft --header frag -j ACCEPT

# Allow IPsec (AH and ESP)
sudo ip6tables -A FORWARD -m ipv6header --soft --header auth -j ACCEPT
sudo ip6tables -A FORWARD -m ipv6header --soft --header esp -j ACCEPT

# Allow forwarded packets that carry Hop-by-Hop options
sudo ip6tables -A FORWARD -m ipv6header --soft --header hop -j ACCEPT

# Allow Destination Options
sudo ip6tables -A FORWARD -m ipv6header --soft --header dst -j ACCEPT

# Drop only deprecated RH0; do not drop all Routing Headers
sudo ip6tables -A FORWARD -m rt --rt-type 0 -j LOG --log-prefix "RH0-DROP: "
sudo ip6tables -A FORWARD -m rt --rt-type 0 -j DROP  # Only RH0 is dangerous
```

## nftables Configuration

```text
# /etc/nftables.conf - extension header handling
table ip6 filter {
    chain forward {
        type filter hook forward priority 0; policy drop;

        # Allow established/related
        ct state established,related accept

        # Match specific extension headers with parser-aware expressions
        exthdr frag exists accept
        exthdr hbh exists accept
        exthdr dst exists accept
        exthdr mh exists accept
        meta l4proto { esp, ah } accept

        # Drop deprecated RH0 explicitly; do not drop all Routing Headers
        rt type 0 log prefix "RH0-DROP: " drop

        # In this minimal example, permit the rest of the forwarded traffic
        accept
    }
}
```

## Conclusion

Middleboxes that indiscriminately drop IPv6 packets containing extension headers are a significant barrier to IPv6 adoption and feature development. RFC 7045 requires forwarding nodes that inspect IPv6 headers to understand standard extension headers, make discard policy explicit and configurable, and be configurable to allow unrecognized extension headers. Routing Header Type 0 remains a special case because RFC 5095 deprecates it, but that is not a blanket justification for dropping all Routing Headers or all unfamiliar extension headers.
