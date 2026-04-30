# How to Understand Extension Header Drop Rates in Production Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Extension Headers, Network Measurement, Middleboxes, Troubleshooting

Description: Understand why IPv6 extension headers are frequently dropped in production networks, how to measure drop rates, and what this means for protocol design.

## Introduction

Extensive measurement research has revealed that IPv6 extension headers are dropped at surprisingly high rates by production internet infrastructure. This is a practical deployment problem that affects fragmentation, IPsec, and any new protocol that relies on extension headers. Understanding the causes and measuring drop rates helps network engineers make informed decisions about extension header use.

## Documented Drop Rates

Research papers and IETF working group documents have measured or documented:

```text
Extension Header Type     | Approximate Observation
Fragment (NH=44)         | ~28-55% drop in RFC 7872 datasets (critical - breaks fragmentation)
Routing (NH=43)          | RFC 9288 recommends dropping only Routing Types 0, 1, and 3; RH0 is deprecated
Hop-by-Hop (NH=0)        | ~39-54% drop in RFC 7872 datasets (often the most heavily filtered)
Authentication (NH=51)   | Policy dependent; RFC 9288 recommends permitting it in transit
ESP (NH=50)              | Policy dependent; RFC 9288 recommends permitting it in transit
Destination Opt (NH=60)  | ~11-21% drop in RFC 7872 datasets
```

Note: These observations vary significantly by measurement methodology, path, header size, and time. Later measurements have shown large regional and network-by-network variation, but extension headers remain a real deployment concern.

## Why Extension Headers Are Dropped

```text
1. Misconfigured firewalls:
   Many firewall default policies drop anything "unusual"
   Including packets with extension headers as a "precaution"

2. ACL/filter limitations in older hardware:
   Some hardware cannot parse beyond the first extension header
   Default policy: if can't parse, drop

3. Security concerns (valid):
   RH0 routing header was a legitimate security threat (deprecated)
   Some operators block all routing headers out of caution

4. Fragment filtering (common but operationally risky):
   Firewalls blocking all fragments (prevents fragment reassembly attacks)
   But this also blocks legitimate fragmented IPv6 traffic

5. Deep Packet Inspection failure:
   DPI systems that cannot parse extension headers
   May drop packets they can't classify

6. Performance optimization:
   Hardware fast paths may not support all extension headers
   Packets with unusual headers sent to slow path → rate limiting or drop
```

## Testing Extension Header Reachability

```bash
# Test if a path has fragmentation-related delivery problems

# Method: Compare reachability with and without source fragmentation
# This is a coarse signal only; it does not prove where the packet was dropped

# Test 1: Normal packet (no extension headers)
ping -6 -c 5 -s 56 target.example.com  # Small packet, no fragmentation needed

# Test 2: Oversized packet (on a typical 1500-byte link, this adds a Fragment Header)
ping -6 -c 5 -s 2000 -M want target.example.com

# Compare loss rates - if Test 2 has more loss, Fragment Header handling
# or PMTU/ICMPv6 behavior may be a problem

# Baseline traceroute for path visibility
traceroute -6 -n target.example.com

# There is no standard traceroute flag that adds a Fragment Header;
# locating the exact drop point requires packet-crafting tools such as Scapy
```

## Python: Coarse Fragmentation Reachability Probe

```python
import subprocess

def test_fragmentation_path(target: str) -> dict:
    """
    Compare a normal IPv6 echo probe with an oversized probe that typically
    triggers source fragmentation on a 1500-byte access link.

    This is not a direct test of arbitrary extension headers, and it cannot
    distinguish Fragment Header filtering from PMTU/ICMPv6 issues.
    """
    result = {"target": target}

    # Test 1: Normal IPv6 reachability
    proc = subprocess.run(
        ["ping", "-6", "-c", "3", "-W", "2", target],
        capture_output=True, text=True
    )
    normal_reachable = proc.returncode == 0
    result["normal_reachable"] = normal_reachable

    # Test 2: Oversized probe that typically triggers source fragmentation
    proc = subprocess.run(
        ["ping", "-6", "-c", "3", "-W", "2", "-s", "2000", "-M", "want", target],
        capture_output=True, text=True
    )
    oversized_reachable = proc.returncode == 0
    result["oversized_probe_reachable"] = oversized_reachable
    result["possible_fragmentation_issue"] = normal_reachable and not oversized_reachable

    return result

# Coarse probe for fragmentation-related delivery problems
result = test_fragmentation_path("2001:4860:4860::8888")
print(f"Target: {result['target']}")
print(f"Normal ping: {'OK' if result['normal_reachable'] else 'FAIL'}")
print(
    "Oversized probe: "
    f"{'POSSIBLE FRAGMENTATION ISSUE' if result['possible_fragmentation_issue'] else 'NO DIFFERENCE DETECTED'}"
)
```

## Operational Implications

```text
For network operators deploying new protocols:
  → Cannot rely on extension headers for critical functionality
  → Design protocols to work WITHOUT extension headers when possible
  → Use extension headers only for optional enhancements

For firewall operators:
  → RFC 7045 says the default policy SHOULD allow standard extension headers, with discard policies individually configurable
  → Review your drop policies - are you dropping legitimate traffic?
  → Test: are you accidentally blocking your own VPN (ESP) or fragmented traffic?

For application developers:
  → Avoid large UDP datagrams that require fragmentation
  → Prefer transports and PMTU-aware application behavior that avoid IP fragmentation when possible
  → If using IPsec, test paths for ESP passthrough

For IETF protocol designers:
  → The "extension header problem" has led to shift away from new extension headers
  → New proposals increasingly use UDP-based tunneling instead of new IPv6 headers
```

## Measuring Your Own Network

```bash
# Quick self-test: is your host emitting IPv6 Fragment Header packets?
# Send an oversized ICMPv6 echo on a typical 1500-byte access link

# Confirm local transmission of Fragment Header packets
sudo tcpdump -i eth0 -Q out -nn -vv 'ip6[6] == 44' &
TCPDUMP_PID=$!
ping -6 -c 3 -s 2000 -M want 2001:4860:4860::8888
sleep 5
kill "$TCPDUMP_PID"

# End-to-end validation requires capture or instrumentation on the far side
# because seeing outbound fragments locally does not prove the path forwards them
```

## Conclusion

Extension header drop rates represent a real deployment challenge for IPv6. Historical measurements of the Fragment Header, for example, showed roughly 28-55% loss in RFC 7872's datasets, meaning a material share of internet paths may silently discard fragmented IPv6 packets and cause failures that are difficult to diagnose. Network operators should audit their own firewall policies against RFC 7045 guidelines and ensure they are not inadvertently dropping legitimate traffic. For protocol designers, this landscape argues for designing new protocols to work without relying on extension header delivery.
