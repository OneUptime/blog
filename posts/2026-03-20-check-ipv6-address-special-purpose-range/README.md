# How to Check If an IPv6 Address Is in a Special-Purpose Range

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Special-Purpose, Address Classification, Python, Networking, Security

Description: Build a comprehensive IPv6 address classifier that checks all IANA special-purpose ranges and returns the block name, properties, and appropriate usage guidance.

## Introduction

Applications that handle IPv6 addresses often need to classify special-purpose addresses - is this address documentation-only? Is it loopback? Is it link-local? A single, comprehensive classification function handles all these cases.

## Complete IPv6 Address Classifier

```python
import ipaddress
from dataclasses import dataclass
from typing import Optional

@dataclass
class IPv6AddressInfo:
    address: str
    block_name: str
    rfc: str
    source: Optional[bool]
    destination: Optional[bool]
    forwardable: Optional[bool]
    globally_reachable: Optional[bool]
    notes: str = ""

# Current IANA registry entries. Longest-prefix match matters because
# 2001::/23 contains more-specific special-purpose allocations.
RAW_SPECIAL_PURPOSE_REGISTRY = [
    ("::1/128", "Loopback Address", "RFC 4291",
     False, False, False, False, "Reserved by the protocol for loopback"),
    ("::/128", "Unspecified Address", "RFC 4291",
     True, False, False, False, "Used before an interface has an assigned address"),
    ("::ffff:0:0/96", "IPv4-mapped Address", "RFC 4291",
     False, False, False, False, "Represents an IPv4 address in an IPv6 socket API"),
    ("64:ff9b::/96", "IPv4-IPv6 Translation", "RFC 6052",
     True, True, True, True, "Well-known NAT64 translation prefix"),
    ("64:ff9b:1::/48", "IPv4-IPv6 Translation", "RFC 8215",
     True, True, True, False, "Local-use NAT64 translation prefix"),
    ("100::/64", "Discard-Only Address Block", "RFC 6666",
     True, True, True, False, "Traffic to this block should be dropped"),
    ("100:0:0:1::/64", "Dummy IPv6 Prefix", "RFC 9780",
     True, False, False, False, "Source-only dummy prefix for examples and testing"),
    ("2001::/32", "TEREDO", "RFC 4380 / RFC 8190",
     True, True, True, None, "Automatic tunneling prefix; global reachability is deployment-specific"),
    ("2001:1::1/128", "Port Control Protocol Anycast", "RFC 7723",
     True, True, True, True, "Port Control Protocol anycast address"),
    ("2001:1::2/128", "Traversal Using Relays around NAT Anycast", "RFC 8155",
     True, True, True, True, "TURN anycast address"),
    ("2001:1::3/128", "DNS-SD Service Registration Protocol Anycast", "RFC 9665",
     True, True, True, True, "DNS-SD Service Registration Protocol anycast address"),
    ("2001:2::/48", "Benchmarking", "RFC 5180 (Errata 1752)",
     True, True, True, False, "Reserved for benchmarking and performance testing"),
    ("2001:3::/32", "AMT", "RFC 7450",
     True, True, True, True, "Automatic Multicast Tunneling"),
    ("2001:4:112::/48", "AS112-v6", "RFC 7535",
     True, True, True, True, "AS112 service prefix"),
    ("2001:10::/28", "Deprecated (previously ORCHID)", "RFC 4843",
     None, None, None, None, "Allocation terminated in 2014-03"),
    ("2001:20::/28", "ORCHIDv2", "RFC 7343",
     True, True, True, True, "Overlay Routable Cryptographic Hash Identifiers"),
    ("2001:30::/28", "Drone Remote ID Protocol Entity Tags (DETs) Prefix", "RFC 9374",
     True, True, True, True, "Drone Remote ID DET prefix"),
    ("2001:db8::/32", "Documentation", "RFC 3849",
     False, False, False, False, "Examples and documentation only"),
    ("2002::/16", "6to4", "RFC 3056",
     True, True, True, None, "6to4 transition prefix; global reachability is deployment-specific"),
    ("2620:4f:8000::/48", "Direct Delegation AS112 Service", "RFC 7534",
     True, True, True, True, "Direct-delegation AS112 service prefix"),
    ("3fff::/20", "Documentation", "RFC 9637",
     False, False, False, False, "Additional documentation-only prefix"),
    ("5f00::/16", "Segment Routing (SRv6) SIDs", "RFC 9602",
     True, True, True, False, "Segment Routing SID space"),
    ("fc00::/7", "Unique-Local", "RFC 4193 / RFC 8190",
     True, True, True, False, "Private use inside an administrative domain"),
    ("fe80::/10", "Link-Local Unicast", "RFC 4291",
     True, True, False, False, "Valid only on a single link"),
    ("2001::/23", "IETF Protocol Assignments", "RFC 2928",
     False, False, False, False, "Applies only when no more-specific 2001::/23 allocation matches"),
]

SPECIAL_PURPOSE_REGISTRY = sorted(
    [
        (ipaddress.IPv6Network(prefix), name, rfc, src, dst, fwd, global_r, notes)
        for prefix, name, rfc, src, dst, fwd, global_r, notes
        in RAW_SPECIAL_PURPOSE_REGISTRY
    ],
    key=lambda row: row[0].prefixlen,
    reverse=True,
)

def classify_ipv6(addr_str: str) -> IPv6AddressInfo:
    """
    Classify an IPv6 address against the IANA special-purpose registry.
    """
    try:
        addr = ipaddress.IPv6Address(addr_str)
    except ValueError as exc:
        raise ValueError(f"Invalid IPv6 address: {addr_str}") from exc

    for network, name, rfc, src, dst, fwd, global_r, notes in SPECIAL_PURPOSE_REGISTRY:
        if addr in network:
            return IPv6AddressInfo(
                address=str(addr),
                block_name=name,
                rfc=rfc,
                source=src,
                destination=dst,
                forwardable=fwd,
                globally_reachable=global_r,
                notes=notes
            )

    return IPv6AddressInfo(
        address=str(addr),
        block_name="Not in IANA Special-Purpose Registry",
        rfc="N/A",
        source=None,
        destination=None,
        forwardable=None,
        globally_reachable=None,
        notes='Use ipaddress checks such as addr in IPv6Network("2000::/3") or is_multicast for broader IPv6 classification'
    )

def format_flag(value: Optional[bool]) -> str:
    return "N/A" if value is None else str(value)

# Test the classifier
test_addresses = [
    "::1", "::", "fe80::1", "2001:db8::1",
    "fc00::1", "64:ff9b::8.8.8.8", "5f00:1:1::1",
    "2001:4860:4860::8888"
]

for addr in test_addresses:
    info = classify_ipv6(addr)
    print(f"\n{addr}:")
    print(f"  Block: {info.block_name} ({info.rfc})")
    print(f"  Source:{format_flag(info.source)} "
          f"Dst:{format_flag(info.destination)} "
          f"Fwd:{format_flag(info.forwardable)} "
          f"Global:{format_flag(info.globally_reachable)}")
    print(f"  Notes: {info.notes}")
```

## Integration with Web Applications

```python
import ipaddress
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/classify")
def classify():
    addr = request.args.get("addr", "")
    try:
        info = classify_ipv6(addr)
        addr_obj = ipaddress.IPv6Address(info.address)
        return jsonify({
            "address": info.address,
            "block": info.block_name,
            "globally_reachable": info.globally_reachable,
            "safe_for_production": (
                info.rfc == "N/A" and
                addr_obj in ipaddress.IPv6Network("2000::/3")
            )
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
```

## Conclusion

A comprehensive IPv6 address classifier is essential for applications that handle user-supplied addresses. The Python implementation above mirrors the current IANA special-purpose registry and provides actionable metadata. For addresses that do not match the registry, pair it with broader `ipaddress` checks such as membership in `IPv6Network("2000::/3")` and `is_multicast`. Integrate this into your API input validation and use OneUptime to ensure your classification service remains healthy.
