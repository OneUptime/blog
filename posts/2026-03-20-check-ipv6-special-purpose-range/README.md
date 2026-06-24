# How to Check If an IPv6 Address Is in a Special-Purpose Range (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Special-Purpose, Classification, Python, Validation, IANA

Description: Build a comprehensive IPv6 address classifier that checks against all IANA special-purpose ranges and returns the address type and its properties.

## Introduction

Checking whether an IPv6 address falls in a special-purpose range is a common requirement for security filters, logging systems, and network tools. The IANA IPv6 Special-Purpose Address Space registry documents these prefixes and their properties. This post provides a Python implementation that checks the current registry entries, prefers the most specific match, and still distinguishes multicast, global-unicast, and reserved space for addresses outside the registry.

## Complete IPv6 Address Classifier

```python
import ipaddress
from dataclasses import dataclass
from typing import Optional

@dataclass
class IPv6AddressInfo:
    address: str
    category: str
    rfc: str
    source: Optional[bool]
    destination: Optional[bool]
    forwardable: Optional[bool]
    globally_reachable: Optional[bool]
    reserved_by_protocol: Optional[bool]
    description: str

RAW_SPECIAL_PURPOSE_REGISTRY = [
    # (prefix, category, rfc, source, dest, forwardable, globally_reachable, reserved_by_protocol, description)
    ("::1/128", "Loopback Address", "RFC 4291",
     False, False, False, False, True, "Loopback; never valid between two devices"),
    ("::/128", "Unspecified Address", "RFC 4291",
     True, False, False, False, True, "Unspecified source address"),
    ("::ffff:0:0/96", "IPv4-mapped Address", "RFC 4291",
     False, False, False, False, True, "IPv4-mapped IPv6 address"),
    ("64:ff9b::/96", "IPv4-IPv6 Translation", "RFC 6052",
     True, True, True, True, False, "NAT64 well-known prefix"),
    ("64:ff9b:1::/48", "IPv4-IPv6 Translation", "RFC 8215",
     True, True, True, False, False, "Local-use translation prefix"),
    ("100::/64", "Discard-Only Address Block", "RFC 6666",
     True, True, True, False, False, "Discard-only address block"),
    ("100:0:0:1::/64", "Dummy IPv6 Prefix", "RFC 9780",
     True, False, False, False, False, "Dummy prefix for examples and testing"),
    ("2001:1::1/128", "Port Control Protocol Anycast", "RFC 7723",
     True, True, True, True, False, "PCP anycast address"),
    ("2001:1::2/128", "Traversal Using Relays around NAT Anycast", "RFC 8155",
     True, True, True, True, False, "TURN anycast address"),
    ("2001:1::3/128", "DNS-SD Service Registration Protocol Anycast", "RFC 9665",
     True, True, True, True, False, "SRP anycast address"),
    ("2001:2::/48", "Benchmarking", "RFC 5180",
     True, True, True, False, False, "Benchmarking address space"),
    ("2001:3::/32", "AMT", "RFC 7450",
     True, True, True, True, False, "Automatic Multicast Tunneling"),
    ("2001:4:112::/48", "AS112-v6", "RFC 7535",
     True, True, True, True, False, "AS112 sink service"),
    ("2001:10::/28", "Deprecated ORCHID", "RFC 4843",
     None, None, None, None, None, "Deprecated ORCHID block; allocation terminated in 2014-03"),
    ("2001:20::/28", "ORCHIDv2", "RFC 7343",
     True, True, True, True, False, "Overlay Routable Cryptographic Hash IDs"),
    ("2001:30::/28", "Drone Remote ID Protocol Entity Tags (DETs) Prefix", "RFC 9374",
     True, True, True, True, False, "Drone Remote ID Protocol Entity Tags prefix"),
    ("2001:db8::/32", "Documentation", "RFC 3849",
     False, False, False, False, False, "Documentation prefix"),
    ("2001::/32", "TEREDO", "RFC 4380 / RFC 8190",
     True, True, True, None, False, "Teredo; global reachability depends on deployment"),
    ("2002::/16", "6to4", "RFC 3056",
     True, True, True, None, False, "6to4; global reachability depends on deployment"),
    ("2620:4f:8000::/48", "Direct Delegation AS112 Service", "RFC 7534",
     True, True, True, True, False, "Direct-delegation AS112 service"),
    ("3fff::/20", "Documentation", "RFC 9637",
     False, False, False, False, False, "Additional documentation prefix"),
    ("5f00::/16", "Segment Routing (SRv6) SIDs", "RFC 9602",
     True, True, True, False, False, "SRv6 SID space"),
    ("fc00::/7", "Unique-Local", "RFC 4193 / RFC 8190",
     True, True, True, False, False, "Unique Local Addresses"),
    ("fe80::/10", "Link-Local Unicast", "RFC 4291",
     True, True, False, False, True, "Link-local unicast addresses"),
    ("2001::/23", "IETF Protocol Assignments", "RFC 2928",
     False, False, False, False, False, "Parent block for more-specific IETF protocol allocations"),
]

SPECIAL_PURPOSE_REGISTRY = sorted(
    [
        (
            ipaddress.IPv6Network(prefix),
            category,
            rfc,
            src,
            dst,
            fwd,
            global_r,
            reserved,
            desc,
        )
        for prefix, category, rfc, src, dst, fwd, global_r, reserved, desc
        in RAW_SPECIAL_PURPOSE_REGISTRY
    ],
    key=lambda entry: entry[0].prefixlen,
    reverse=True,
)

GLOBAL_UNICAST_SPACE = ipaddress.IPv6Network("2000::/3")

def classify_ipv6(addr_str: str) -> IPv6AddressInfo:
    """Classify an IPv6 address using the IANA special-purpose registry."""
    try:
        addr = ipaddress.IPv6Address(addr_str)
    except ValueError as e:
        raise ValueError(f"Invalid IPv6 address: {addr_str}") from e

    for network, category, rfc, src, dst, fwd, global_r, reserved, desc in SPECIAL_PURPOSE_REGISTRY:
        if addr in network:
            return IPv6AddressInfo(
                address=str(addr),
                category=category,
                rfc=rfc,
                source=src,
                destination=dst,
                forwardable=fwd,
                globally_reachable=global_r,
                reserved_by_protocol=reserved,
                description=desc,
            )

    if addr.is_multicast:
        return IPv6AddressInfo(
            address=str(addr),
            category="Multicast",
            rfc="RFC 4291",
            source=False,
            destination=True,
            forwardable=None,
            globally_reachable=None,
            reserved_by_protocol=True,
            description="Multicast address; see the IANA IPv6 Multicast Address Space registry",
        )

    if addr in GLOBAL_UNICAST_SPACE:
        return IPv6AddressInfo(
            address=str(addr),
            category="Global Unicast",
            rfc="RFC 4291",
            source=True,
            destination=True,
            forwardable=True,
            globally_reachable=True,
            reserved_by_protocol=False,
            description="Global unicast address",
        )

    return IPv6AddressInfo(
        address=str(addr),
        category="Reserved by IETF",
        rfc="RFC 4291",
        source=None,
        destination=None,
        forwardable=None,
        globally_reachable=None,
        reserved_by_protocol=None,
        description="Outside the current IANA special-purpose registry and the allocated global-unicast space",
    )

# Test the classifier

test_addresses = [
    "::1",
    "::",
    "64:ff9b::808:808",
    "100::1",
    "100:0:0:1::1",
    "2001::1",
    "2001:1::3",
    "2001:db8::1",
    "3fff::1",
    "5f00:1:0:e001::",
    "2620:4f:8000::1",
    "fc00::1",
    "fd00:1:2:3::4",
    "fe80::1",
    "ff02::1",
    "2001:4860:4860::8888",
    "4000::1",
]

for addr in test_addresses:
    info = classify_ipv6(addr)
    print(f"{addr:40s} → {info.category} ({info.rfc})")
```

## Batch Classification

```python
def classify_from_log(log_file: str) -> dict:
    """
    Classify all IPv6 addresses found in a log file.
    Returns a summary count by category.
    """
    import re
    from collections import Counter

    ipv6_pattern = re.compile(
        r'(?<![0-9A-Fa-f:.%])\[?[0-9A-Fa-f:.%]+\]?(?![0-9A-Fa-f:.%])'
    )
    category_counts = Counter()

    with open(log_file, encoding="utf-8") as f:
        for line in f:
            for match in ipv6_pattern.finditer(line):
                candidate = match.group().strip("[]")
                candidate = candidate.split("%", 1)[0]
                if ":" not in candidate:
                    continue
                try:
                    info = classify_ipv6(candidate)
                    category_counts[info.category] += 1
                except ValueError:
                    pass

    return dict(category_counts.most_common())
```

## Conclusion

A complete IANA registry-based classifier lets you quickly determine what any IPv6 address is and whether it should appear in logs, configurations, or traffic. Integrate this classifier into your log analysis pipelines, security tooling, and network automation to detect misconfigured or unexpected addresses. Use OneUptime to alert when special-purpose addresses appear in unexpected contexts.
