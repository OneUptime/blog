# Validation Summary: How to Configure Multi-Topology IS-IS for IPv6

## Status
<!-- One of: validated, not-code-blog, not-technically-relevant -->
validated

## Post Type
<!-- e.g., Tutorial, Guide, Opinion piece, Company update, Reference, etc. -->
Guide

## Technologies Covered
<!-- Bulleted list of technologies, frameworks, languages discussed in the post -->
- IS-IS
- Multi-Topology IS-IS (MT-ISIS)
- IPv6
- Cisco IOS / IOS XE CLI
- Junos OS
- FRRouting
- RFC 5120

## Sources Consulted
<!-- Bulleted list of official documentation, RFCs, or authoritative sources you checked against. Include URLs where possible. -->
- RFC 5120, "M-ISIS: Multi Topology (MT) Routing in Intermediate System to Intermediate Systems (IS-ISs)" — https://datatracker.ietf.org/doc/html/rfc5120
- Cisco IOS XE, "IPv6 Routing: IS-IS Multitopology Support for IPv6" — https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_isis/configuration/xe-3s/irs-xe-3s-book/ip6-route-mult-isis-xe.html
- Cisco IOS IP Routing Command Reference, `show isis topology` / `show isis database verbose` / `router isis` — https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_isis/command/irs-cr-book/irs-l1.html
- Juniper, "Understanding IS-IS IPv4 and IPv6 Unicast Topologies" — https://www.juniper.net/documentation/us/en/software/junos/is-is/topics/concept/isis-topologies.html
- Juniper, "Example: Configuring IS-IS IPv4 and IPv6 Unicast Topologies" — https://www.juniper.net/documentation/us/en/software/junos/is-is/topics/example/isis-ipv6-unicast-multitopology.html
- Juniper CLI reference, `topologies` and interface `level` statements — https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/topologies-edit-protocols-isis.html and https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/level-edit-protocols-isis-interface.html
- FRRouting `isisd` documentation — https://docs.frrouting.org/en/stable-10.3/isisd.html

## Issues Found
<!-- If no issues: "No technical issues found." -->
<!-- If issues were found, list each one: what was wrong, what you changed, and why. -->
- The MT-ID table listed IPv6 multicast as MT-ID `3`. RFC 5120 reserves MT-ID `4` for IPv6 multicast, so the table was corrected.
- The explanation of why MT-ISIS is needed described an "IPv6 link down" case that would normally also drop the IS-IS adjacency. This was corrected to the documented single-topology problem: IPv4 topology participation does not guarantee IPv6 reachability on the same links.
- The Cisco IOS example omitted `metric-style wide`, which Cisco documents as required when using multitopology IS-IS for IPv6 because the IPv6 TLVs use extended metrics. This command was added.
- The Junos metric example used invalid syntax: `topologies ipv6-unicast metric 20` under the interface. Junos documents the correct knob as `ipv6-unicast-metric` under the interface `level`, so the snippet was corrected.
- The Junos example was also missing the minimum required `family iso` / `family inet6` interface context and an ISO NET on `lo0`, so those were added to make the example workable.
- The FRRouting example used `isis ipv6 metric 10`, but the FRR documentation describes the standard interface metric command as `isis metric`. The example was corrected accordingly.
- The Cisco verification command order was wrong. Cisco documents `show isis ipv6 topology`, not `show isis topology ipv6`, and the route verification was aligned to the documented `show isis ipv6 rib`.
- The FRRouting verification command `show isis topology ipv6-unicast` was corrected to the documented `show isis topology`.
- The summary incorrectly implied all three vendors used the same per-topology metric behavior. It was corrected to state that separate IPv6 interface metrics are shown for Cisco IOS and Junos.

## Review Notes
<!-- Any additional observations: things that are technically correct but could be improved in the future, deprecation warnings, version-specific caveats, etc. If none, write "None." -->
- Cisco syntax here matches IOS / IOS XE documentation. Equivalent workflows on IOS XR or other Cisco platforms use different CLI.
- FRRouting documentation shows `topology ipv6-unicast` for enabling the IPv6 topology, but the current stable manual documents only the standard interface `isis metric` command in the IS-IS interface section.
- No runtime lab validation against actual Cisco, Junos, or FRRouting instances was possible in this workspace; the review was completed against RFC and vendor documentation.
