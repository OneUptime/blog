# Validation Summary: How to Use the IPv6 Traffic Class for DSCP Marking

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- DSCP / DiffServ
- Linux `ip6tables`
- Linux `tc` / iproute2
- Python `socket`

## Sources Consulted
- RFC 2474: Definition of the Differentiated Services Field (DS Field) in the IPv4 and IPv6 Headers - https://datatracker.ietf.org/doc/html/rfc2474
- RFC 2475: An Architecture for Differentiated Services - https://datatracker.ietf.org/doc/rfc2475/
- RFC 2597: Assured Forwarding PHB Group - https://datatracker.ietf.org/doc/html/rfc2597
- RFC 3246: An Expedited Forwarding PHB (Per-Hop Behavior) - https://datatracker.ietf.org/doc/html/rfc3246
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification - https://www.rfc-editor.org/rfc/rfc8200
- Python `socket` documentation - https://docs.python.org/3/library/socket.html
- `iptables-extensions(8)` DSCP target reference - https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `tc-pedit(8)` reference - https://man7.org/linux/man-pages/man8/tc-pedit.8.html
- `tc-u32(8)` reference - https://manpages.debian.org/testing/iproute2/tc-u32.8.en.html
- Microsoft Teams QoS documentation - https://learn.microsoft.com/en-us/microsoftteams/qos-in-teams
- Zoom firewall requirements documentation - https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0058078
- Local CLI help/output checked with `ip6tables -j DSCP -h`, `tc action add action skbedit help`, and Python `socket` option tests on this system

## Issues Found
- The Assured Forwarding description implied guaranteed bandwidth. I changed it to forwarding assurance with drop precedence because AF behavior depends on local resource allocation and queueing policy, not DSCP marking alone.
- The `ip6tables` example labeled UDP 8801:8802 as "Zoom, Teams" traffic. I changed it to Zoom-only and updated the range to `8801:8803` to match Zoom's documented media ports more accurately.
- The `tc` example used invalid syntax: `skbedit dsfield` is not supported here, and `u32 match ip6 dscp` is not a valid IPv6 match form. I replaced the marking example with `pedit ex munge ip6 traffic_class` and corrected the IPv6 classifier to `match ip6 priority ...` with an ECN-preserving mask.
- The `tc` example marked traffic on an ingress hook even though the section was presenting host-side marking and egress queuing. I moved the example to a root `prio` qdisc on egress so the marking and queue selection examples are consistent.
- The Python helper accepted an `af_family` argument instead of using the socket's actual family, which could misconfigure IPv4 sockets. I changed it to inspect `sock.family` directly and added DSCP range validation.
- The trust-boundary wording said untrusted DSCP markings "must" be re-marked. I softened this to "should" because RFC guidance is to classify and condition at boundaries, but exact policy is domain-specific.
- The conclusion overstated AF as guaranteed minimum bandwidth and also conflicted with the earlier AF41 video example. I corrected it to describe differentiated forwarding/drop precedence and to align video guidance with AF41.

## Review Notes
- The `ip6tables` examples are valid for Linux systems that still expose the xtables-compatible `ip6tables` interface, including the common nf_tables-backed implementation. Modern distributions may prefer native `nft` syntax operationally, but the commands shown remain usable where the DSCP target is available.
- The `tc` examples assume a Linux system with the required traffic-control actions and classifiers available in iproute2/kernel. Exact module availability can vary by distribution and kernel build.
