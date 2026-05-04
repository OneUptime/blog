# How to Configure Route Summarization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Routing, OSPF, BGP, Summarization, IPv4

Description: Configure route summarization to reduce routing table size and improve network scalability by aggregating multiple prefixes into a single advertisement.

## Introduction

Route summarization (also called route aggregation or supernetting) combines multiple smaller prefixes into one larger prefix. This reduces the number of routes in routing tables, decreases memory consumption, speeds up route lookups, and limits the propagation of topology changes.

## Understanding Summarization Math

To summarize 10.1.0.0/24 through 10.1.3.0/24 into a single prefix:

```text
10.1.0.0  = 00001010.00000001.00000000.00000000
10.1.1.0  = 00001010.00000001.00000001.00000000
10.1.2.0  = 00001010.00000001.00000010.00000000
10.1.3.0  = 00001010.00000001.00000011.00000000

Common bits: 10.1.0.0/22
Summary:     10.1.0.0/22 covers all four /24s
```

## Summarization in OSPF (FRR/Quagga)

OSPF summarization is performed at Area Border Routers (ABRs) to reduce the number of Type 3 LSAs propagated between areas.

```bash
# Configure OSPF area range for summarization at ABR

# vtysh configuration
router ospf
  area 1 range 10.1.0.0/22
  # This summarizes 10.1.0.0/24, 10.1.1.0/24, 10.1.2.0/24, 10.1.3.0/24
  # into a single 10.1.0.0/22 advertisement sent to area 0
```

To suppress the summary (advertise nothing for the range):

```bash
router ospf
  area 1 range 10.1.0.0/22 not-advertise
```

## Summarization in BGP

BGP uses aggregate-address to summarize routes before advertising to peers.

```bash
# Summarize 10.1.0.0/24 through 10.1.3.0/24 into 10.1.0.0/22
router bgp 65001
  address-family ipv4 unicast
    aggregate-address 10.1.0.0/22
    # This advertises the summary AND the individual /24s (unless suppressed)

    # Use summary-only to suppress more-specific routes
    aggregate-address 10.1.0.0/22 summary-only
```

## Static Summary Route on Linux

For static routing, add the summary prefix and a null route to prevent loops:

```bash
# Add a black-hole route for the summary prefix (prevents routing loops
# if one of the component routes disappears)
ip route add blackhole 10.1.0.0/22

# Then advertise 10.1.0.0/22 to neighbors via your routing protocol
# The specific /24 routes handle actual forwarding internally
```

## Verifying Summarization

```bash
# Check that the summary route appears in OSPF
vtysh -c "show ip ospf route" | grep "10.1.0.0/22"

# Check BGP table - summary should be present, specifics suppressed
vtysh -c "show ip bgp" | grep "10.1"

# Check neighbor's routing table received routes
vtysh -c "show ip bgp neighbors 10.0.0.2 received-routes"
```

## When NOT to Summarize

Avoid summarization when:
- The component subnets belong to different customers or security zones
- You need per-prefix traffic engineering (BGP communities, AS path prepending)
- The summary would cover unused address space (can cause black-holing)

## Conclusion

Route summarization is one of the most effective tools for scaling IP networks. It reduces routing overhead, isolates topology instability, and simplifies routing tables. Always add a null/blackhole route for the summary block on the summarizing router to prevent traffic from looping if individual component routes become unreachable.
