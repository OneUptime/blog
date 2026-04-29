# How to Understand Why IPv6 Removed the Header Checksum

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Header, Checksum, Performance, Protocol Design

Description: Understand the reasoning behind IPv6's decision to remove the header checksum present in IPv4, and how data integrity is maintained at other layers.

## Introduction

IPv4 includes a 16-bit header checksum that every router must verify and update when it decrements the TTL. IPv6 removes this checksum entirely. This was a controversial but deliberate design decision that improves router performance. Understanding the rationale requires examining how data integrity is maintained without a header checksum.

## Why IPv4 Had a Header Checksum

IPv4 was designed in the 1970s when network hardware was unreliable. Bit errors in transit were common. The header checksum provided a fast way to detect if the header had been corrupted during transmission, preventing misrouted packets due to corrupted destination addresses.

## Why IPv6 Removed It

### 1. Every Router Must Verify and Update It

In IPv4, the TTL field changes at every hop. Since the checksum covers the entire header (including TTL), it must be checked and updated at every router:

```text
IPv4 router processing:
  1. Verify header checksum
  2. Decrement TTL
  3. Update header checksum
  4. Forward packet

This adds checksum verification plus a checksum update per hop, per packet.
Routers can update incrementally when only TTL changes, but it still adds per-hop work.
At 10 Gbps, this is millions of operations per second.
```

### 2. Link-Layer Protection Makes It Redundant

Modern network technologies all provide their own error detection:

```text
Ethernet: 32-bit CRC (Frame Check Sequence)
  → Catches all single-bit errors and most burst errors
  → Checked on each hop before the packet reaches the IP layer

802.11 WiFi: CRC-32 per frame

Many modern links also use strong link-layer error detection and, in some cases, FEC
  → Fewer transmission errors reach the IP layer

Result: In the normal case, by the time an IPv6 packet is processed,
        the link-layer CRC has already verified the bits.
```

### 3. Upper-Layer Checksums Cover the Important Fields

IPv6 relies on upper-layer integrity checks. In the default case, UDP checksums are mandatory in IPv6 (they are optional in IPv4):

```python
# Common IPv6 upper-layer protocols with integrity checks:

# TCP:    Checksum required (was already required in IPv4)
# UDP:    Checksum required by default (optional in IPv4; tunnel exceptions exist)
# ICMPv6: Checksum required, and it includes the IPv6 pseudo-header
# SCTP:   CRC32c checksum required

# For TCP, UDP, and ICMPv6, these checks cover:
# - Upper-layer data
# - Upper-layer header
# - IPv6 pseudo-header (src, dst, length, next header)
# So bit errors in the IPv6 source or destination address will usually be
# caught at the receiver even though IPv6 has no header checksum
```

## Performance Impact

```python
def estimate_checksum_savings(packet_rate_mpps: float) -> dict:
    """
    Roughly estimate the per-router work avoided by removing the IPv4 header checksum.
    """
    # IPv4: one checksum verification plus one checksum update per packet
    # A minimum IPv4 header is 20 bytes = 10 16-bit words.
    # This is only a rough estimate; implementations may use incremental updates.

    ops_per_packet_ipv4 = 11  # verify 10 words, then do a small checksum update
    ops_per_packet_ipv6 = 0       # no header checksum

    total_packets_per_second = packet_rate_mpps * 1_000_000

    ipv4_ops = total_packets_per_second * ops_per_packet_ipv4
    ipv6_ops = total_packets_per_second * ops_per_packet_ipv6

    return {
        "packet_rate": f"{packet_rate_mpps} Mpps",
        "ipv4_checksum_ops_per_sec": f"{ipv4_ops:,.0f}",
        "ipv6_checksum_ops_per_sec": f"{ipv6_ops:,.0f}",
        "savings_percent": 100 - (ipv6_ops / ipv4_ops * 100) if ipv4_ops > 0 else 100,
    }

result = estimate_checksum_savings(100)  # 100 Mpps (a real core router rate)
print(f"IPv4 header checksum ops/sec: {result['ipv4_checksum_ops_per_sec']}")
print(f"IPv6 header checksum ops/sec: {result['ipv6_checksum_ops_per_sec']}")
print(f"Savings: {result['savings_percent']:.0f}%")
```

## The One Risk: Silent Misrouting

The legitimate concern about removing the header checksum is **silent misrouting**:

```text
Scenario without header checksum:
1. A bit error corrupts a destination address in the IPv6 header
2. The link-layer CRC does NOT catch it (bit error after CRC calculation)
3. The packet is delivered to the wrong destination
4. Usually no error is returned to the sender

For TCP, UDP, and ICMPv6, the upper-layer checksum will usually cause
the misdelivered packet to be silently discarded by the wrong recipient.
If the traffic is using a reliable transport such as TCP,
retransmission will eventually recover the data.
```

The IPv6 designers accepted this tradeoff: silent packet loss is acceptable; reliable upper-layer protocols such as TCP handle retransmission.

## Conclusion

IPv6's removal of the header checksum was a deliberate tradeoff: accept occasional silent packet loss in exchange for dramatic router performance improvements. The rationale is sound - link-layer error detection has become reliable, upper-layer checksums protect the important fields end to end, and UDP checksums are mandatory by default in IPv6. The result is that routers do not need to perform per-hop checksumming, enabling significantly higher forwarding rates in hardware.
