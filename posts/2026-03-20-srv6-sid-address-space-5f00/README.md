# How to Understand the SRv6 SID Address Space (5f00::/16)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, SRv6, 5f00, RFC 9602, Segment Routing, SID

Description: Understand the SRv6 SID address space 5f00::/16 allocated by RFC 9602, its properties, and how operators should plan and use SRv6 SID allocations.

## Introduction

RFC 9602 (2024) formally allocates `5f00::/16` as a dedicated IPv6 special-purpose address block for SRv6 Segment Identifiers (SIDs). This is a 16-bit prefix, providing an enormous address space for SRv6 deployments. IANA marks the block as forwardable but not globally reachable, so operators should use it inside an SR domain or between collaborating SR domains rather than assuming Internet-wide reachability. Unlike earlier SRv6 deployments that used arbitrary IPv6 addresses, using `5f00::/16` provides a common, clearly identifiable block.

## Key Properties

| Property | Value |
|---|---|
| Prefix | 5f00::/16 |
| RFC | RFC 9602 (2024) |
| Source | True |
| Destination | True |
| Forwardable | True |
| Globally Reachable | False |

## Address Space Scale

```python
import ipaddress

SRV6_SPACE = ipaddress.IPv6Network("5f00::/16")

# Calculate sub-allocations available

print(f"Total /48 locators available: {2**(48-16):,}")
# 4,294,967,296 - over 4 billion /48 node locators

print(f"Total /128 SIDs: {2**(128-16):,}")
# An astronomically large number

# Example allocation plan within one SR domain:
# /16 dedicated SRv6 SID space: 5f00::/16
# /32 operator/domain block: 5f00:domain::
# /48 per-node locator: 5f00:domain:node::/48
# /128 per-SID: 5f00:domain:node:function::

example_allocations = {
    "SR domain block":  "5f00:fe81::/32",
    "Node R1 locator":  "5f00:fe81:1::/48",
    "Node R2 locator":  "5f00:fe81:2::/48",
    "R1 End SID":       "5f00:fe81:1:0001::/128",
    "R1 End.X SID":     "5f00:fe81:1:e001::/128",
    "R1 End.DT6 SID":   "5f00:fe81:1:e002::/128",
}
for name, prefix in example_allocations.items():
    print(f"{name}: {prefix}")
```

## Routing 5f00::/16

```bash
# 5f00::/16 is forwardable, but it is not globally reachable by default
# Advertise SRv6 locator prefixes only in the intended SR domain

# FRR: advertise your SRv6 locator block via BGP when collaborating SR domains need it
# The prefix must exist in the RIB for current FRR defaults
router bgp 65001
  address-family ipv6 unicast
    network 5f00:fe81::/32  ! Your SR domain block
  !
!

# Configure the SRv6 locator in zebra
segment-routing
  srv6
    locators
      locator MAIN
        prefix 5f00:fe81:1::/48 block-len 32 node-len 16 func-bits 16
!

# Then have IS-IS advertise the configured locator
router isis CORE
  segment-routing srv6
    locator MAIN
```

## Filtering in BGP

```bash
# Accept SRv6 locators from trusted peers only
# Do not accept 5f00::/16 more-specifics from untrusted customers
# (they should not advertise SRv6 SIDs)

# FRR IPv6 prefix list
ip prefix-list DENY_SRV6_SPACE seq 5 deny 5f00::/16 le 128
ip prefix-list DENY_SRV6_SPACE seq 100 permit ::/0 le 128

# Apply to customer BGP sessions
router bgp 65001
  address-family ipv6 unicast
    neighbor 2001:db8::2 prefix-list DENY_SRV6_SPACE in
```

## Verifying 5f00::/16 Routing

```bash
# Check if your SRv6 locator is reachable from an intended SR-domain vantage point
# (requires the locator prefix to be advertised in that domain)
traceroute6 5f00:fe81:2:0001::  # Should reach a programmed SID on Node R2 from an allowed source

# Check BGP advertisement
show bgp ipv6 unicast 5f00:fe81::/32

# Verify SID is programmed in FIB
ip -6 route show 5f00:fe81:1:e001::/128
# Should show: encap seg6local action End.X ...
```

## Conclusion

The `5f00::/16` allocation makes SRv6 SIDs forwardable and clearly distinguishable. Operators should use a documented allocation plan that is coordinated inside their SR domain or between collaborating SR domains. Structure allocations hierarchically: /32 per operator or SR domain, /48 per node, /128 per SID function. Monitor SRv6 locator reachability from multiple allowed vantage points using OneUptime to ensure your SRv6 infrastructure is visible where it is intended to be reachable.
