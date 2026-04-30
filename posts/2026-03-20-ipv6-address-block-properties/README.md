# How to Understand IPv6 Address Block Properties

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Address Properties, RFC 6890, Source, Destinations, Forwardable, Networking

Description: Understand the four key properties of IPv6 address blocks - Source, Destination, Forwardable, and Globally Reachable - and how they determine valid usage.

## Introduction

RFC 6890, as updated by RFC 8190, defines the properties recorded for each address block in the IANA IPv6 Special-Purpose Address Space registry. These properties define how addresses from each block can legitimately be used in packets that transit between devices.

## The Four Properties

### Source

Can packets use addresses from this block as a source address?

- `::` (unspecified) = Source: True (used only during init)
- `100::/64` (discard) = Source: True
- `2001:db8::/32` (documentation) = Source: False (never in real packets)

### Destination

Can packets use addresses from this block as a destination address?

- `::` (unspecified) = Destination: False
- `::1/128` (loopback) = Destination: False (must never leave a single node)
- `2001:db8::/32` (documentation) = Destination: False

### Forwardable

May routers forward packets whose destination is in this block?

- `fe80::/10` (link-local) = Forwardable: False (stay on link)
- `fc00::/7` (ULA) = Forwardable: True (within organization)
- `2001:db8::/32` (documentation) = Forwardable: False

### Globally Reachable

May packets to destinations in this block be forwarded beyond an administrative domain?

- `fc00::/7` (ULA) = Globally Reachable: False
- `5f00::/16` (SRv6 SIDs) = Globally Reachable: False
- `fe80::/10` (link-local) = Globally Reachable: False

## Selected Properties Table

```python
ADDRESS_BLOCK_PROPERTIES = {
    "::1/128": {
        "name": "Loopback",
        "source": False, "destination": False,
        "forwardable": False, "globally_reachable": False
    },
    "::/128": {
        "name": "Unspecified",
        "source": True, "destination": False,
        "forwardable": False, "globally_reachable": False
    },
    "::ffff:0:0/96": {
        "name": "IPv4-Mapped",
        "source": False, "destination": False,
        "forwardable": False, "globally_reachable": False
    },
    "64:ff9b::/96": {
        "name": "NAT64 Well-Known",
        "source": True, "destination": True,
        "forwardable": True, "globally_reachable": True
    },
    "100::/64": {
        "name": "Discard-Only",
        "source": True, "destination": True,
        "forwardable": True, "globally_reachable": False
    },
    "2001::/32": {
        "name": "Teredo",
        "source": True, "destination": True,
        "forwardable": True, "globally_reachable": "N/A"
    },
    "2001:db8::/32": {
        "name": "Documentation",
        "source": False, "destination": False,
        "forwardable": False, "globally_reachable": False
    },
    "5f00::/16": {
        "name": "SRv6 SIDs",
        "source": True, "destination": True,
        "forwardable": True, "globally_reachable": False
    },
    "fc00::/7": {
        "name": "Unique-Local",
        "source": True, "destination": True,
        "forwardable": True, "globally_reachable": False
    },
    "fe80::/10": {
        "name": "Link-Local",
        "source": True, "destination": True,
        "forwardable": False, "globally_reachable": False
    },
}
```

## Applying Properties in Firewall Rules

```bash
# Based on properties, create appropriate firewall rules

# Non-forwardable prefixes: block at FORWARD chain

ip6tables -A FORWARD -s ::1/128 -j DROP         # Loopback
ip6tables -A FORWARD -s fe80::/10 -j DROP        # Link-local
ip6tables -A FORWARD -d ::1/128 -j DROP
ip6tables -A FORWARD -d fe80::/10 -j DROP

# Non-globally-reachable: block at internet edge
ip6tables -A FORWARD -s fc00::/7 -o eth-internet -j DROP
ip6tables -A FORWARD -d fc00::/7 -i eth-internet -j DROP

# Non-source addresses should never appear as source
ip6tables -A FORWARD -s 2001:db8::/32 -j DROP    # Documentation
ip6tables -A INPUT -s ::ffff:0:0/96 -j DROP       # IPv4-Mapped
```

## Conclusion

The four address block properties (Source, Destination, Forwardable, Globally Reachable) form the basis of IPv6 address policy. Use them to build correct firewall rules, configure BGP routing policies, and validate network configurations. Integrate address property checks into your network monitoring with OneUptime to alert on policy violations.
