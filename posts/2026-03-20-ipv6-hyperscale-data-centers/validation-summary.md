# Validation Summary: How to Design IPv6 for Hyperscale Data Centers - Centers

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- BGP
- FRRouting (FRR)
- Linux networking and `iproute2`
- Linux neighbor discovery and ECMP sysctls
- `radvd`
- Clos fabric design

## Sources Consulted
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRRouting IPv6 / Router Advertisement documentation: https://docs.frrouting.org/en/latest/ipv6.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/v6.15/networking/ip-sysctl.html
- RFC 4291, IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 4861, Neighbor Discovery for IPv6: https://www.rfc-editor.org/rfc/rfc4861
- RFC 4862, Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862
- RFC 6164, Using 127-Bit IPv6 Prefixes on Inter-Router Links: https://www.rfc-editor.org/rfc/rfc6164
- RFC 7421, Analysis of the 64-bit Boundary in IPv6 Addressing: https://www.rfc-editor.org/rfc/rfc7421
- `radvd.conf(5)` manual: https://manpages.debian.org/unstable/radvd/radvd.conf.5.en.html
- Local `iproute2` CLI help via `ip -6 route help`

## Issues Found
- The address plan and multiple example commands used invalid IPv6 literals such as `2001:db8:pod1::/48` and `2001:db8:pod1:gw::1`. I replaced them with syntactically valid hexadecimal IPv6 prefixes and addresses per RFC 4291.
- The architecture section mixed BGP unnumbered links with `/126 or /127 for P2P links` and also claimed `only iBGP` while the FRR example used `remote-as external` for eBGP. I corrected the text to distinguish unnumbered fabric links from numbered `/127` inter-router links and changed the routing statement to “BGP between spine and leaf tiers” so it matches the configuration and FRR documentation.
- The FRR example activated only two of four defined unnumbered neighbors. I activated all four neighbors so the configuration is internally consistent.
- The ECMP section described `fib_multipath_hash_policy=1` as a `4-tuple hash`. Linux documents that value as Layer 4 hashing, commonly the standard 5-tuple, so I corrected the description. I also clarified that `maximum-paths 64` is subject to FRR build and platform limits documented by FRR.
- The SLAAC example advertised a `/80` prefix while also setting `AdvAutonomous on`. SLAAC on common Ethernet-style links requires a `/64`, so I changed the advertised prefix and related verification command to use a `/64`, in line with RFC 4862, RFC 7421, and the `radvd` manual.
- The anycast gateway section implied that one shared gateway address would let servers move between racks without reconfiguration. That was inaccurate in the context of per-rack `/64` subnets. I changed the text to scope the shared anycast gateway to leafs serving the same server subnet and replaced the server command with route validation based on Router Advertisements, which aligns with RFC 4861 behavior.
- The scale-validation script used `vtysh -c "show bgp ipv6 unicast" | grep -c "=>"` to count ECMP paths, but that marker is not a reliable measure of installed multipath routes. I changed the check to count installed routes containing `nexthop` in `ip -6 route show`, which better matches the stated goal.
- The conclusion recommended setting `gc_thresh3` to exactly `2×` the number of servers per spine. That tuning rule is not stated in the Linux kernel documentation. I replaced it with a documented, defensible guideline: size `gc_thresh3` with headroom above the expected number of non-permanent neighbor entries.

## Review Notes
- The post is now technically consistent as a high-level design guide, but several design choices remain deployment-specific rather than universal best practice. In particular, `/48 per pod`, 64-way ECMP, and distributed anycast gateway behavior depend on the operator’s fabric design and platform capabilities.
- FRR supports up to 128 `maximum-paths` values in the CLI, but the usable ECMP width can still be capped by the daemon build or platform support.
- `redistribute connected` is valid FRR syntax, but in production fabrics it is usually paired with policy to avoid advertising unintended connected prefixes.
