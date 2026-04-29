# How to Understand RFC 9098 Operational Implications of Extension Headers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, RFC 9098, Extension Headers, Operation, Networking

Description: Understand the operational implications of IPv6 extension headers documented in RFC 9098, including deployment challenges, measurement data, and operator recommendations.

## Introduction

RFC 9098 (August 2021) "Operational Implications of IPv6 Packets with Extension Headers" is the definitive operational document on IPv6 extension header behavior in real-world networks. It summarizes measured drop rates from studies such as RFC 7872, explains why these drops occur, and provides recommendations for operators and protocol designers. Understanding RFC 9098 helps operators make informed decisions about extension header policies.

## Key Findings of RFC 9098

RFC 9098, together with the measurement studies it cites, documents the following operational realities:

```text
1. Fragment Header (NH=44) Drop Rates:
   - ~30-50% of network paths drop packets with Fragment Headers
   - Cause: Security policies preventing fragment-based attacks
   - Impact: Breaks IPv6 source fragmentation and makes reliance on
             fragmentation brittle
   - Recommendation: Minimize reliance on fragmentation and ensure
                     ICMPv6 Packet Too Big handling works correctly

2. Routing Header (NH=43) Policy Problems:
   - Type 0 (deprecated): Should be dropped - security risk
   - Coarse filters often match NH=43 generically
   - Types 2, 3, 4 are legitimate routing headers and should not be
     blanket-dropped just because they share NH=43 with RH0

3. Hop-by-Hop Options (NH=0) Slow-Path Processing:
   - Many routers punt HbH packets to the CPU or a slow path
   - This creates denial-of-service risk
   - Recommendation: Avoid HbH in new protocols where possible
   - Critical exception: MLD MUST use HbH Router Alert

4. Unknown Extension Headers:
   - Many devices drop unknown extension headers silently
   - This prevents deployment of new IPv6 extensions
   - RFC 7045 says forwarding policy should be explicit, not based
     solely on failure to recognize a standard header
```

## The Hop-by-Hop CPU Vulnerability

RFC 9098 provides detailed analysis of the Hop-by-Hop CPU problem:

```text
Why HbH causes CPU exhaustion:

1. RFC 2460 originally said: All routers MUST examine Hop-by-Hop options
2. RFC 8200 relaxed this: only nodes explicitly configured to do so
   are expected to examine them
3. Hardware: Often cannot implement arbitrary option processing efficiently in ASICs
4. Result: Many packets with HbH header → software slow path → CPU
5. Attack: Send millions of packets with HbH headers to a router
6. Result: Router CPU saturated, legitimate traffic drops

This is why RFC 9098 notes that some routers
completely drop packets with Hop-by-Hop options as a DoS defense.

Affected protocols that use Hop-by-Hop:
  - MLD (Multicast Listener Discovery) - uses Router Alert in HbH
  - RSVP - uses Router Alert in HbH
  - Jumbograms - use Jumbo Payload option in HbH
```

## Operational Recommendations from RFC 9098

```python
# Summarize RFC 9098 recommendations for operators

RFC9098_RECOMMENDATIONS = {
    "Hop-by-Hop (NH=0)": {
        "action": "Protect the control plane; explicitly permit required cases such as MLD",
        "reason": "HbH often triggers slow-path processing and DoS risk",
        "exception": "MLD queries/reports require Router Alert in HbH",
    },
    "Fragment (NH=44)": {
        "action": "Minimize reliance on fragmentation; if required, test it explicitly",
        "reason": "Fragments are often filtered, and PMTUD depends on ICMPv6 PTB rather than the Fragment Header itself",
        "security": "Block overlapping fragments (fragment overlap attacks)"
    },
    "Routing (NH=43) Type 0": {
        "action": "Block specifically",
        "reason": "Deprecated security vulnerability (RFC 5095)",
    },
    "Routing (NH=43) Types 2/3/4": {
        "action": "Do not blanket-drop solely because NH=43 is present",
        "reason": "RFC 5095 requires RH0 filtering to be separable from other Routing Header types",
    },
    "ESP (NH=50)": {
        "action": "Allow when required by site policy",
        "reason": "ESP is a standard IPv6 extension header used by IPsec",
    },
    "AH (NH=51)": {
        "action": "Allow when required by site policy",
        "reason": "AH is a standard IPv6 extension header, but not every deployment uses it",
    },
    "Unknown extension headers": {
        "action": "Make forwarding policy explicit and configurable (per RFC 7045)",
        "reason": "A standard EH should not be dropped solely because it is unrecognized",
    }
}

for header, rec in RFC9098_RECOMMENDATIONS.items():
    print(f"\n{header}:")
    for key, value in rec.items():
        print(f"  {key}: {value}")
```

## Fragment Header and Path MTU Discovery

RFC 9098 discusses fragmentation, while RFC 8201 explains Path MTU Discovery:

```text
Normal Path MTU Discovery (RFC 8201):
1. Source sends packet > Path MTU
2. Router drops packet, sends ICMPv6 "Packet Too Big"
3. Source reduces packet size, no fragmentation needed
4. If source fragmentation is needed, the source adds a Fragment Header;
   PMTUD itself does not depend on routers fragmenting packets in transit

When ICMPv6 "Packet Too Big" is blocked (firewall misconfiguration):
  → Source never learns about smaller MTU
  → Source keeps sending oversized packets
  → All packets are silently dropped at the bottleneck
  → Connection "black hole" (appears to work for small packets, fails for large)

Operational takeaway:
  → NEVER block ICMPv6 Packet Too Big messages (type 2)
  → ICMPv6 filtering should follow RFC 4890 (essential ICMPv6 must be allowed)
  → Treat IPv6 fragmentation as fragile; PMTUD depends on PTB, not on
    transit fragmentation
```

## Measuring Extension Header Impact

```bash
# Basic reachability and PMTUD checks inspired by the issues discussed in RFC 9098

# 1. Establish baseline reachability and packet loss
LC_ALL=C ping -6 -c 20 -q target.example.com

# 2. Discover the path MTU directly
tracepath -6 target.example.com

# 3. Watch for ICMPv6 Packet Too Big while sending oversized probes
sudo tcpdump -ni eth0 'icmp6' &
TCPDUMP_PID=$!
tracepath -6 -l 2000 target.example.com
sleep 3
kill "$TCPDUMP_PID"

# 4. Testing actual Fragment Header survivability requires crafted packets.
# RFC 7872 reproduced this with the SI6 Networks IPv6 Toolkit, not plain ping.
```

## Conclusion

RFC 9098 provides operators with measurement data and recommendations for managing IPv6 extension headers in production networks. The key insights: Hop-by-Hop Options create CPU exhaustion risk and should be tightly controlled, Fragment Headers are frequently dropped and make reliance on IPv6 fragmentation brittle, and ICMPv6 Packet Too Big messages must never be filtered. Protocol designers should consult RFC 9098 before using extension headers in new specifications, as the deployment reality may make reliable extension header delivery impossible on many internet paths.
