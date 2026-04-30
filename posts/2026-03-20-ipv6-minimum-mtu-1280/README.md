# How to Understand the IPv6 Minimum MTU of 1280 Bytes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, MTU, Minimum MTU, RFC 8200, Networking

Description: Understand why IPv6 mandates a minimum link MTU of 1280 bytes, how this differs from IPv4, and the practical implications for network design and tunnel configurations.

## Introduction

RFC 8200 mandates that every link carrying IPv6 traffic must support a minimum MTU of 1280 bytes. This is significantly higher than IPv4's 68-byte minimum forwardable datagram size and 576-byte minimum reassembly capability. The 1280-byte minimum provides a guaranteed floor for useful IPv6 packet size and simplifies interoperability across links and tunnels.

## Why 1280 Bytes?

A practical way to think about the 1280-byte minimum is:

```text
Design requirements for the IPv6 minimum MTU:

1. Must be larger than IPv6 base header (40 bytes) by a useful amount
   → At 1280 bytes: 1280 - 40 = 1240 bytes of payload available
   → Even a node that does not implement PMTU Discovery can still send a full 1280-byte packet

2. Must still leave useful payload even when small extension headers are present
   → A single Hop-by-Hop option: 8 bytes
   → Fragment header: 8 bytes
   → 1280 - 40 - 8 - 8 = 1224 bytes payload → still useful

3. Should be large enough for common upper-layer protocols
   → DNS over UDP: typical query/response < 512 bytes (easily fits)
   → ICMPv6 error messages include as much of the offending packet as possible without exceeding the minimum IPv6 MTU
   → NDP messages fit easily in 1280 bytes

4. Serves as the conservative fallback size when PMTU Discovery is not used
   → Minimal IPv6 implementations may simply send packets no larger than 1280 bytes
   → PMTU Discovery is used to take advantage of larger paths
```

## Comparison with IPv4 Minimums

```text
IPv4:
  RFC 791: Minimum forwardable datagram = 68 bytes
  RFC 791: Minimum reassembly size = 576 bytes
  RFC 1191: PMTU Discovery must not reduce PMTU below 68 bytes
  Practice: Most networks use 1500 bytes (Ethernet)

IPv6:
  RFC 8200: Minimum MTU = 1280 bytes (MANDATORY)
  RFC 8201: Nodes not using PMTU Discovery use 1280 bytes as the maximum packet size
  RFC 8201: Packet Too Big messages below 1280 bytes are discarded
  Practice: Most networks use 1500 bytes (Ethernet)
  Tunnels: Often reduce to 1480 or less (overhead)
```

## Practical Impact on Network Design

```text
Links where MTU challenges arise:

1. DSL PPPoE:
   PPPoE header: 8 bytes
   Effective IPv6 MTU: 1500 - 8 = 1492 bytes (still > 1280 ✓)

2. IPv6-in-IPv4 tunnel (6in4, RFC 4213):
   IPv4 header overhead: 20 bytes
   Available for IPv6: 1500 - 20 = 1480 bytes (still > 1280 ✓)

3. IPv6-in-IPv4 + GRE tunnel:
   IPv4 (20) + GRE (4) = 24 bytes overhead
   Available for IPv6: 1500 - 24 = 1476 bytes (still > 1280 ✓)

4. VPN with IPsec (example):
   IPv4 (20) + ESP (8) + IV (16) + ICV (16) + Pad (~12) ≈ 72 bytes
   Available for IPv6: 1500 - 72 = 1428 bytes (still > 1280 ✓)

5. Nested tunnels (problematic):
   IPsec ESP tunnel + GRE + MPLS can consume much of the 220-byte headroom between 1500 and 1280
   May require a larger outer link MTU (jumbo frames) or a reduced inner tunnel MTU
```

## Configuring MTU on IPv6 Interfaces

```bash
# Check current MTU on all interfaces

ip link show | grep -E "^[0-9]+:|mtu"

# Specifically check IPv6-relevant MTU
ip -6 link show

# Set MTU on an interface (must be ≥ 1280 for IPv6)
sudo ip link set eth0 mtu 1500

# For tunnel interfaces, set appropriate MTU
# IPv6 over IPv4 tunnel (accounts for outer IPv4 header)
sudo ip link set sit0 mtu 1480

# Check IPv6 MTU as seen by the kernel
cat /proc/sys/net/ipv6/conf/eth0/mtu

# Check if any interfaces have MTU < 1280 (below the IPv6 minimum MTU requirement)
ip link show | awk '/mtu/ {for(i=1;i<=NF;i++) if ($i=="mtu") print $(i+1), $2}' | \
    awk '{if ($1 < 1280) print "WARNING: " $2 " has MTU " $1 " < 1280 (below IPv6 minimum)"}'
```

## Handling Sub-1280-MTU Links

If a link truly cannot support 1280-byte packets (rare but possible in some IoT contexts):

```bash
# Option 1: Increase the physical link MTU (preferred)
# Configure the underlying link to support ≥ 1280 bytes

# Option 2: Use 6LoWPAN (IPv6 over Low-Power Wireless)
# 6LoWPAN (RFC 4944) provides header compression and fragmentation
# for IEEE 802.15.4 links with 127-byte frames
# The 6LoWPAN layer fragments and reassembles to/from 1280-byte IPv6 packets

# The 6LoWPAN adaptation layer on the sending node handles fragmentation
# The IPv6 layer above never sees sub-1280 packets
```

## ICMPv6 Packet Too Big and the 1280-byte Rule

RFC 8201 requires that if a Packet Too Big message specifies an MTU less than 1280 bytes, the node must discard the message and must not reduce its PMTU estimate below 1280 bytes:

```python
def handle_packet_too_big(notified_mtu: int, current_pmtu: int) -> dict:
    """
    Handle an ICMPv6 Packet Too Big message.

    Args:
        notified_mtu: The MTU value in the PTB message
        current_pmtu: Current PMTU estimate for the path
    """
    if notified_mtu < 1280:
        # RFC 8201 Section 4: Discard PTB messages that report MTU < 1280
        # and never reduce PMTU below the IPv6 minimum link MTU.
        effective_mtu = max(current_pmtu, 1280)
        ignored = True
        print(f"PTB MTU {notified_mtu} < 1280: ignore message and keep PMTU {effective_mtu}")
    else:
        effective_mtu = min(current_pmtu, notified_mtu)
        ignored = False
        print(f"PTB MTU {notified_mtu}: Update PMTU cache to {effective_mtu}")

    return {
        "notified_mtu": notified_mtu,
        "effective_mtu": effective_mtu,
        "ignored_below_ipv6_minimum": ignored,
    }

# Test
print(handle_packet_too_big(1200, 1500))  # Below 1280 - ignore PTB, keep current PMTU
print(handle_packet_too_big(1400, 1500))  # Normal case - reduce PMTU to 1400
```

## Conclusion

IPv6's 1280-byte minimum MTU is a hard requirement that simplifies protocol design by providing a guaranteed floor for packet size. Every IPv6 implementation can assume that 1280 bytes is the conservative end-to-end packet-size floor without relying on router fragmentation; if a link cannot carry that size in one piece, fragmentation and reassembly must happen below IPv6. Tunnel configurations must account for encapsulation overhead to ensure they still support 1280-byte inner packets. When configuring IPv6 interfaces or tunnels, always verify that the configured MTU leaves sufficient room for the IPv6 stack to function correctly.
