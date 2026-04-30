# How to Understand IPv6 Fragmentation Attacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Security, Fragmentation, Evasion, Firewall

Description: Learn how IPv6 fragmentation differs from IPv4, how attackers exploit fragment headers to evade security devices, and how to defend against fragmentation-based attacks.

## Overview

IPv6 handles fragmentation differently from IPv4: only the originating host may fragment packets (not routers in transit). This design change, combined with the Fragment Extension Header, creates new attack surfaces that can be exploited to evade intrusion detection, bypass firewalls, and perform denial-of-service attacks.

## IPv6 vs IPv4 Fragmentation

| Feature | IPv4 | IPv6 |
|---------|------|------|
| Who can fragment | Any router | Source host only |
| Fragment field | Always in IP header | Only in Fragment Extension Header |
| Minimum baseline | 576-byte reassembly | 1280-byte link MTU |
| Path MTU Discovery | Optional | Strongly recommended |
| Atomic fragment | Not applicable | Fragment offset=0, M=0 |

## The IPv6 Fragment Header

When fragmentation is needed, the source adds a Fragment Extension Header:

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Next Header  |   Reserved    |      Fragment Offset    |Res|M|
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                         Identification                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

- **Fragment Offset**: offset in 8-byte units
- **M (More Fragments)**: 1 = more fragments follow, 0 = last fragment
- **Identification**: 32-bit ID to reassemble fragments

## Attack Types

### 1. Tiny Fragment Attack

An attacker sends the first fragment so small that the TCP header is split across two fragments. The firewall sees fragment 1 but cannot determine the TCP flags:

```text
Fragment 1: IPv6 + Fragment Header + first 8 bytes of TCP header
Fragment 2: Rest of TCP header + payload
```

RFC 7112 requires that the first fragment contain the complete upper-layer header - many older devices don't enforce this.

### 2. Overlapping Fragment Attack

Two fragments have overlapping offsets. This was historically an evasion technique because different reassembly policies could produce different results:

```text
Fragment 1: offset=0, length=64  (contains benign data)
Fragment 2: offset=24 (overlaps with fragment 1) (contains malicious payload)
```

RFC 5722 and RFC 8200 now require compliant IPv6 stacks to silently discard the entire fragment set when any overlap is detected. Older or non-compliant devices may still create evasion opportunities.

### 3. Atomic Fragment Attack (RFC 6946 / RFC 8021)

An attacker sends a forged ICMPv6 Packet Too Big message advertising an MTU smaller than 1280, causing some legacy hosts to generate "atomic fragments" (Fragment Header with offset=0 and M=0). These can be used to introduce fragmentation into otherwise non-fragmented communications:

```bash
# Detect atomic fragments when the Fragment Header immediately follows the IPv6 header

tcpdump -i eth0 'ip6[6]==44 and (ip6[42:2] & 0xfff9) == 0'
# ip6[6]==44 = Fragment Header
# offset=0 and M=0 = atomic fragment
```

RFC 6946 defines how atomic fragments are processed, and RFC 8021 documents why generating them is harmful.

### 4. Resource Exhaustion via Incomplete Fragment Sets

An attacker sends first fragments without ever sending the last fragment. The victim must hold partial reassembly buffers:

```text
Attacker → sends fragment 1 (M=1) with random ID
Attacker → never sends fragment 2
Victim → holds reassembly buffer for timeout period (~60 seconds)
Repeat → exhaust kernel memory
```

## Detection

### tcpdump Detection Rules

```bash
# Capture all IPv6 fragmented traffic, even if extension headers precede the Fragment Header
tcpdump -i eth0 'ip6 protochain 44'

# The following offset-based filters assume the Fragment Header immediately follows the IPv6 header
# Capture first fragments only (offset=0, M=1)
tcpdump -i eth0 'ip6[6]==44 and (ip6[42:2] & 0x0001) == 1 and (ip6[42:2] >> 3) == 0'

# Detect non-initial fragments (offset > 0)
tcpdump -i eth0 'ip6[6]==44 and (ip6[42:2] >> 3) > 0'
```

### Suricata/Snort Rules

```text
# Alert on IPv6 first fragments
alert ip ::/0 any -> ::/0 any (
    msg:"IPv6 First Fragment Detected";
    fragbits:M;
    fragoffset:0;
    sid:9000010;
    rev:1;
)

# Alert on tiny IPv6 first fragments (TCP header may be split)
alert ip ::/0 any -> ::/0 any (
    msg:"IPv6 Tiny Fragment - Possible Evasion";
    fragbits:M;
    fragoffset:0;
    dsize:<20;
    sid:9000011;
    rev:1;
)
```

## Firewall Mitigation

```bash
# ip6tables: Drop non-initial fragments (cannot inspect transport headers)
ip6tables -A FORWARD -m frag ! --fragfirst -j DROP

# Simple TCP-focused heuristic: drop first fragments too short to contain
# IPv6 + Fragment + minimal TCP header
ip6tables -A INPUT -m frag --fragfirst --fragmore -m length --length 0:67 -j DROP

# nftables: Block all fragmented IPv6 traffic
nft add rule ip6 filter input exthdr frag exists drop

# Or be selective - block forwarded fragments only
nft add rule ip6 filter forward exthdr frag exists drop
```

## RFC 7112: Requiring Complete Header Chain in First Fragment

RFC 7112 (2014) requires that the first fragment of an IPv6 packet contain the complete extension header chain up to (and including) the first upper-layer protocol header:

```text
First Fragment MUST contain:
  IPv6 Header
  → Any extension headers that appear before fragmentation
  → Fragment Header
  → Any remaining extension headers
  → The first upper-layer header (TCP/UDP/ICMPv6)
```

Security devices MAY drop first fragments that don't satisfy this requirement, and many do so by policy.

```python
# Test if your device enforces RFC 7112
# Requires Scapy and root privileges
from scapy.all import IPv6, IPv6ExtHdrFragment, TCP, send

src = "2001:db8::2"
target = "2001:db8::1"
base = IPv6(src=src, dst=target)
tcp_hdr = bytes((base/TCP(sport=12345, dport=80, flags="S"))[TCP])
frag_id = 0x12345678

frag1 = IPv6(src=src, dst=target)/IPv6ExtHdrFragment(nh=6, id=frag_id, m=1, offset=0)/tcp_hdr[:8]
frag2 = IPv6(src=src, dst=target)/IPv6ExtHdrFragment(nh=6, id=frag_id, m=0, offset=1)/tcp_hdr[8:]

send(frag1)
send(frag2)
```

## Kernel Tuning for Fragment Reassembly Limits

On Linux, you can limit fragment reassembly memory to reduce DoS impact:

```bash
# View current fragment settings
sysctl net.ipv6.ip6frag_high_thresh
sysctl net.ipv6.ip6frag_low_thresh
sysctl net.ipv6.ip6frag_time

# Reduce reassembly timeout (default 60s, reduce to 10s)
sysctl -w net.ipv6.ip6frag_time=10

# Reduce reassembly memory (default ~4MB)
sysctl -w net.ipv6.ip6frag_high_thresh=2097152
sysctl -w net.ipv6.ip6frag_low_thresh=1048576
```

## Summary

IPv6 fragmentation attacks exploit the Fragment Extension Header to split transport headers across fragments, evade security inspection, or exhaust reassembly buffers. Defend by enforcing RFC 7112 (first fragment must contain the complete header chain through the upper-layer header), dropping non-initial fragments at security boundaries, applying kernel limits on reassembly memory, and alerting on unusual fragment patterns with IDS rules.
