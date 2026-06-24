# How to Configure BGP IPv6 Conditional Advertisement

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, IPv6, Conditional Advertisement, Policy, BIRD

Description: Implement conditional BGP advertisement for IPv6 prefixes that only announces routes when specific conditions are met.

## Overview

Implement conditional BGP advertisement for IPv6 prefixes that only announces routes when specific conditions in the BGP table are met.

## Conditional Advertisement and IPv6

Conditional advertisement lets a BGP speaker announce one set of routes only when another route exists or does not exist in the BGP table. On platforms that support it, the same policy logic works for IPv6 unicast as it does for IPv4, but the match objects need to use IPv6-aware prefix lists.

## Conditional Advertisement Logic

Conditional advertisement is commonly built from three policy objects:
```text
advertise-map   # Prefixes to announce when the condition is met
exist-map       # Announce only if these prefixes exist in the BGP table
non-exist-map   # Announce only if these prefixes do not exist in the BGP table
```

All prefixes referenced by the policy must already exist in the local BGP table before they can be conditionally advertised.

## BIRD2 Configuration Example

BIRD 2 does not document a native `advertise-map` / `exist-map` feature like FRRouting or Cisco IOS. The common pattern is to make the route itself conditional and export it only while it exists in the routing table. This example uses a BFD-controlled static IPv6 route, so the prefix is withdrawn when the tracked next hop fails.

```text
# /etc/bird/bird.conf

protocol device {}

protocol bfd {}

filter export_conditional_v6 {
    if net = 2001:db8:100::/48 then accept;
    reject;
}

protocol static conditional_v6 {
    ipv6;
    route 2001:db8:100::/48 via 2001:db8::2 bfd;
}

protocol bgp upstream {
    local as 64496;
    neighbor 2001:db8::1 as 65001;
    ipv6 {
        import none;
        export filter export_conditional_v6;
    };
}
```

## FRRouting Conditional Advertisement

```bash
# FRR vtysh configuration
ipv6 route 2001:db8:100::/48 Null0
ipv6 route 2001:db8:200::/48 Null0

ipv6 prefix-list ADV-PREFIX seq 5 permit 2001:db8:100::/48
ipv6 prefix-list EXIST-PREFIX seq 5 permit 2001:db8:200::/48

route-map ADV-MAP permit 10
  match ipv6 address prefix-list ADV-PREFIX

route-map EXIST-MAP permit 10
  match ipv6 address prefix-list EXIST-PREFIX

router bgp 64496
  neighbor 2001:db8::1 remote-as 65001
  address-family ipv6 unicast
    network 2001:db8:100::/48
    network 2001:db8:200::/48
    neighbor 2001:db8::1 advertise-map ADV-MAP exist-map EXIST-MAP
    neighbor 2001:db8::1 activate
  exit-address-family
```

## Cisco IOS Conditional Advertisement

```text
! Conditionally advertise 2001:DB8:100::/48 while 2001:DB8:200::/48 exists
ipv6 route 2001:DB8:100::/48 Null0
ipv6 route 2001:DB8:200::/48 Null0

ipv6 prefix-list ADV-PREFIX seq 5 permit 2001:DB8:100::/48
ipv6 prefix-list EXIST-PREFIX seq 5 permit 2001:DB8:200::/48

route-map ADV-MAP permit 10
  match ipv6 address prefix-list ADV-PREFIX

route-map EXIST-MAP permit 10
  match ipv6 address prefix-list EXIST-PREFIX

router bgp 64496
  neighbor 2001:DB8::1 remote-as 65001
  address-family ipv6 unicast
    network 2001:DB8:100::/48
    network 2001:DB8:200::/48
    neighbor 2001:DB8::1 activate
    neighbor 2001:DB8::1 advertise-map ADV-MAP exist-map EXIST-MAP
  exit-address-family
```

## Testing Conditional Advertisement

```bash
# Check whether BIRD is exporting the conditional IPv6 prefix
birdc "show route 2001:db8:100::/48 export upstream all"

# In FRR
vtysh -c "show bgp ipv6 unicast neighbors 2001:db8::1 advertised-routes"

# In Cisco IOS
show bgp ipv6 unicast neighbors 2001:DB8::1 advertised-routes

# Use RIPE looking glass for external verification
curl "https://stat.ripe.net/data/bgp-state/data.json?resource=YOUR_IPV6_PREFIX" | jq '.data.bgp_state[] | {target_prefix, path}'
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor BGP session health for your IPv6 peers and track route counts. Unexpected changes in advertised prefix counts may indicate that the tracked condition changed and the IPv6 route was withdrawn.

## Conclusion

Conditional advertisement for IPv6 relies on matching IPv6 prefixes in `advertise-map` and `exist-map` / `non-exist-map` policies. On platforms that support the feature natively, the policy is evaluated against the BGP table; in BIRD, you generally make the route itself conditional and export it only while it exists. Always verify both the local advertised-routes view and an external looking glass before applying changes to production IPv6 BGP sessions.
