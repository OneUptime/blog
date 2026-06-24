# How to Understand the IANA IPv6 Special-Purpose Address Registry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IANA, Special-Purpose Addresses, RFC 6890, Networking

Description: Understand the IANA IPv6 Special-Purpose Address Registry, which catalogues reserved address blocks with specific technical purposes distinct from globally routable unicast addresses.

## Introduction

The IANA IPv6 Special-Purpose Address Space registry (formerly called the IANA IPv6 Special-Purpose Address Registry, maintained at https://www.iana.org/assignments/iana-ipv6-special-registry/) documents IPv6 address blocks that have specific, designated uses. Understanding this registry is essential for network operators, security teams, and application developers who need to correctly handle special-function addresses, many of which are not globally reachable.

## Registry Structure

Each entry in the registry has these properties:

| Property | Description |
|---|---|
| Address Block | The prefix |
| Name | Short name for the purpose |
| RFC | Defining RFC |
| Allocation Date | When allocated |
| Termination Date | If applicable |
| Source | Valid as a source when a packet transits two devices? |
| Destination | Valid as a destination when a packet transits two devices? |
| Forwardable | May routers forward it between external interfaces? |
| Globally Reachable | Forwardable beyond a specified administrative domain? |
| Reserved-by-Protocol | Does the protocol require special handling? |

## Selected Special-Purpose Blocks

```python
# Selected special-purpose blocks with key properties.
# `globally_reachable=None` reflects registry entries that IANA marks as N/A.

SPECIAL_PURPOSE_BLOCKS = [
    {
        "prefix": "::1/128",
        "name": "Loopback Address",
        "rfc": "RFC 4291",
        "source": False, "destination": False,
        "forwardable": False, "globally_reachable": False
    },
    {
        "prefix": "::/128",
        "name": "Unspecified",
        "rfc": "RFC 4291",
        "source": True, "destination": False,
        "forwardable": False, "globally_reachable": False
    },
    {
        "prefix": "::ffff:0:0/96",
        "name": "IPv4-Mapped",
        "rfc": "RFC 4291",
        "source": False, "destination": False,
        "forwardable": False, "globally_reachable": False
    },
    {
        "prefix": "64:ff9b::/96",
        "name": "IPv4-IPv6 Translation (Well-Known Prefix)",
        "rfc": "RFC 6052",
        "source": True, "destination": True,
        "forwardable": True, "globally_reachable": True
    },
    {
        "prefix": "64:ff9b:1::/48",
        "name": "IPv4-IPv6 Translation (Local-Use Prefix)",
        "rfc": "RFC 8215",
        "source": True, "destination": True,
        "forwardable": True, "globally_reachable": False
    },
    {
        "prefix": "100::/64",
        "name": "Discard-Only",
        "rfc": "RFC 6666",
        "source": True, "destination": True,
        "forwardable": True, "globally_reachable": False
    },
    {
        "prefix": "2001::/32",
        "name": "Teredo",
        "rfc": "RFC 4380",
        "source": True, "destination": True,
        "forwardable": True, "globally_reachable": None
    },
    {
        "prefix": "2001:2::/48",
        "name": "Benchmarking",
        "rfc": "RFC 5180",
        "source": True, "destination": True,
        "forwardable": True, "globally_reachable": False
    },
    {
        "prefix": "2001:db8::/32",
        "name": "Documentation",
        "rfc": "RFC 3849",
        "source": False, "destination": False,
        "forwardable": False, "globally_reachable": False
    },
    {
        "prefix": "2002::/16",
        "name": "6to4",
        "rfc": "RFC 3056",
        "source": True, "destination": True,
        "forwardable": True, "globally_reachable": None
    },
    {
        "prefix": "5f00::/16",
        "name": "SRv6 SIDs",
        "rfc": "RFC 9602",
        "source": True, "destination": True,
        "forwardable": True, "globally_reachable": False
    },
    {
        "prefix": "fc00::/7",
        "name": "Unique-Local",
        "rfc": "RFC 4193",
        "source": True, "destination": True,
        "forwardable": True, "globally_reachable": False
    },
    {
        "prefix": "fe80::/10",
        "name": "Link-Local",
        "rfc": "RFC 4291",
        "source": True, "destination": True,
        "forwardable": False, "globally_reachable": False
    },
]
```

## Checking Addresses Against the Registry

```python
import ipaddress

def classify_ipv6_address(addr_str: str) -> str:
    """Check whether an IPv6 address falls in an IANA special-purpose range."""
    addr = ipaddress.IPv6Address(addr_str)

    # More-specific 2001::/23 allocations must appear before 2001::/23 itself.
    checks = [
        (ipaddress.IPv6Network("::1/128"), "Loopback Address"),
        (ipaddress.IPv6Network("::/128"), "Unspecified Address"),
        (ipaddress.IPv6Network("::ffff:0:0/96"), "IPv4-mapped Address"),
        (ipaddress.IPv6Network("64:ff9b::/96"), "IPv4-IPv6 Translation"),
        (ipaddress.IPv6Network("64:ff9b:1::/48"), "Local-Use IPv4-IPv6 Translation"),
        (ipaddress.IPv6Network("100:0:0:1::/64"), "Dummy IPv6 Prefix"),
        (ipaddress.IPv6Network("100::/64"), "Discard-Only Address Block"),
        (ipaddress.IPv6Network("2001:1::1/128"), "Port Control Protocol Anycast"),
        (ipaddress.IPv6Network("2001:1::2/128"), "Traversal Using Relays around NAT Anycast"),
        (ipaddress.IPv6Network("2001:1::3/128"), "DNS-SD Service Registration Protocol Anycast"),
        (ipaddress.IPv6Network("2001:2::/48"), "Benchmarking"),
        (ipaddress.IPv6Network("2001:3::/32"), "AMT"),
        (ipaddress.IPv6Network("2001:4:112::/48"), "AS112-v6"),
        (ipaddress.IPv6Network("2001:10::/28"), "Deprecated ORCHID"),
        (ipaddress.IPv6Network("2001:20::/28"), "ORCHIDv2"),
        (ipaddress.IPv6Network("2001:30::/28"), "Drone Remote ID Protocol Entity Tags"),
        (ipaddress.IPv6Network("2001::/32"), "TEREDO"),
        (ipaddress.IPv6Network("2001::/23"), "IETF Protocol Assignments"),
        (ipaddress.IPv6Network("2001:db8::/32"), "Documentation"),
        (ipaddress.IPv6Network("2002::/16"), "6to4"),
        (ipaddress.IPv6Network("2620:4f:8000::/48"), "Direct Delegation AS112 Service"),
        (ipaddress.IPv6Network("3fff::/20"), "Documentation"),
        (ipaddress.IPv6Network("5f00::/16"), "Segment Routing (SRv6) SIDs"),
        (ipaddress.IPv6Network("fc00::/7"), "Unique-Local"),
        (ipaddress.IPv6Network("fe80::/10"), "Link-Local Unicast"),
    ]

    for network, name in checks:
        if addr in network:
            return name

    return "Not in the special-purpose registry"

# Test
for test_addr in ["::1", "fe80::1", "2001:db8::1", "2001:4860:4860::8888"]:
    print(f"{test_addr}: {classify_ipv6_address(test_addr)}")
```

## Why This Registry Matters

1. **Security filtering**: Firewalls and routers should reject certain special-purpose addresses at network boundaries
2. **Application validation**: Web apps should validate whether an address is intended for internet-facing use before treating it as a public endpoint
3. **Documentation**: Use `2001:db8::/32` in all examples, never real addresses
4. **Monitoring**: Don't alert on traffic to/from special-purpose ranges that are expected

## Conclusion

The IANA IPv6 Special-Purpose Address Space registry is the authoritative reference for IPv6 special-purpose semantics. Applications, firewalls, and monitoring systems should consult it when classifying addresses. The Python function above shows one way to classify addresses against that registry in network tooling and security systems monitored by OneUptime, but production implementations should periodically reconcile their prefix tables with the live IANA registry.
