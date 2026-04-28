# How to Understand Prefix Discovery in NDP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NDP, Prefix Discovery, Prefix Information, IPv6, SLAAC

Description: Understand how IPv6 hosts discover on-link prefixes through NDP Router Advertisements, maintain the Prefix List, and use prefix information for address autoconfiguration and routing decisions.

## Introduction

IPv6 Prefix Discovery allows hosts to learn which IPv6 prefixes are on-link (directly reachable on the local segment) and which require routing through a gateway. This information comes from the Prefix Information options in Router Advertisements. The host maintains a Prefix List that determines whether a destination is on-link or needs to be sent to a default router.

## Prefix Discovery Mechanism

```text
Prefix Discovery process:

1. Host receives Router Advertisement
2. For each Prefix Information option in the RA:
   a. If L flag = 1: Add prefix to Prefix List as on-link
      → Valid Lifetime sets how long this entry is valid
      → Hosts can directly communicate with addresses in this prefix
   b. If A flag = 1: Form SLAAC address from this prefix
      → Preferred Lifetime sets when the address becomes deprecated
      → Valid Lifetime sets when the address expires

3. Host uses Prefix List to decide:
   → "Is this destination on-link?" (in Prefix List with L=1)
     → Send directly to destination via neighbor discovery
   → "Is this destination off-link?" (not in Prefix List)
     → Send to default router
```

## Prefix List Maintenance

```bash
# View current prefix list (shown as on-link routes)

ip -6 route show

# On-link routes are shown as:
# 2001:db8::/64 dev eth0 proto ra metric 100 expires 2591900sec
# These come from Prefix Information options with L=1

# View prefix information from received RA
# (Linux stores this in network configuration)
ip -6 route show proto ra

# Check which prefixes are on-link
ip -6 route show | grep "proto ra"
# 'proto ra' source = added by NDP based on RA prefix information (kernel >= 4.18)

# List all addresses with their Valid and Preferred lifetimes
ip -6 addr show dev eth0
# valid_lft = Valid Lifetime (seconds remaining)
# preferred_lft = Preferred Lifetime (seconds remaining)
```

## Prefix Information Option Lifetimes

```bash
# Capture RA and read prefix information
sudo tcpdump -i eth0 -vv "icmp6 and ip6[40] == 134" | head -30

# Example output:
# prefix info option (3), length 32 (4): 2001:db8::/64, Flags [onlink,auto]
#   valid time 2592000s, pref. time 604800s
#
# valid time = Valid Lifetime (2592000s = 30 days)
# pref. time = Preferred Lifetime (604800s = 7 days)
#
# Address lifecycle based on these lifetimes:
# 0 to pref_time:       PREFERRED (use this address for new connections)
# pref_time to valid:   DEPRECATED (existing connections continue, no new ones)
# > valid_time:         INVALID (address removed from interface)
```

## Configuring Prefix Lifetimes in radvd

```bash
sudo tee /etc/radvd.conf << 'EOF'
interface eth0 {
    AdvSendAdvert on;
    MaxRtrAdvInterval 200;

    # Primary prefix with normal lifetimes
    prefix 2001:db8:1::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime 2592000;    # 30 days
        AdvPreferredLifetime 604800; # 7 days (preferred for 7 days)
    };

    # Second prefix for planned renumbering:
    # Old prefix being phased out (short preferred lifetime)
    prefix 2001:db8:0::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime 7200;       # 2 hours (will be gone soon)
        AdvPreferredLifetime 0;      # Already deprecated (don't use for new conns)
    };
};
EOF
```

## Prefix-Based Next-Hop Determination

```python
import ipaddress

class PrefixList:
    """Simulates the IPv6 Prefix List used for next-hop determination."""

    def __init__(self):
        self._prefixes = []  # List of (network, valid_lifetime)

    def add_prefix(self, prefix: str, valid_lifetime: int):
        """Add a prefix from a Router Advertisement."""
        network = ipaddress.ip_network(prefix, strict=False)
        self._prefixes.append((network, valid_lifetime))
        print(f"Prefix List: added {prefix}, lifetime={valid_lifetime}s")

    def is_on_link(self, destination: str) -> bool:
        """Return True if destination is on-link (in Prefix List)."""
        dst = ipaddress.ip_address(destination)
        for network, lifetime in self._prefixes:
            if dst in network and lifetime > 0:
                return True
        return False

    def next_hop(self, destination: str, default_router: str) -> str:
        """Determine the next-hop for a destination."""
        if self.is_on_link(destination):
            return destination  # On-link: send directly
        else:
            return default_router  # Off-link: use default router

# Simulate prefix discovery from RA
pl = PrefixList()
pl.add_prefix("2001:db8:1::/64", 2592000)   # On-link prefix
pl.add_prefix("2001:db8:2::/64", 2592000)   # Another on-link prefix

default_router = "fe80::1"
test_destinations = [
    "2001:db8:1::100",    # On-link
    "2001:db8:2::200",    # On-link (second prefix)
    "2001:db8:3::300",    # Off-link (different prefix)
    "8.8.8.8",            # Off-link (IPv4 mapped/different)
]

for dest in test_destinations:
    try:
        next_hop = pl.next_hop(dest, default_router)
        onlink = pl.is_on_link(dest)
        print(f"{dest}: {'on-link (direct)' if onlink else f'via {next_hop}'}")
    except Exception:
        print(f"{dest}: not a valid IPv6 address")
```

## Conclusion

Prefix Discovery is the NDP mechanism by which hosts learn which address ranges are directly reachable on the local link. The Prefix List maintained by each host determines whether traffic is sent directly or via a default router. Valid and Preferred Lifetimes control address aging, enabling graceful network renumbering by gradually deprecating old prefixes while introducing new ones. Always set Valid Lifetime to at least 2 hours during renumbering to allow existing connections to complete before the old prefix becomes invalid.
