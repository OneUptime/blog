# Validation Summary: How to Plan IPv6 Addressing for Data Center Fabrics

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Data center fabric design
- BGP
- Cisco NX-OS
- Kubernetes networking
- Python 3

## Sources Consulted
- RFC 4291, IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 6164, Using 127-Bit IPv6 Prefixes on Inter-Router Links: https://www.rfc-editor.org/rfc/rfc6164
- RFC 7217, A Method for Generating Semantically Opaque Interface Identifiers with IPv6 SLAAC: https://www.rfc-editor.org/rfc/rfc7217
- RFC 8064, Recommendation on Stable IPv6 Interface Identifiers: https://www.rfc-editor.org/rfc/rfc8064
- RFC 8981, Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6: https://www.rfc-editor.org/rfc/rfc8981
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html
- Kubernetes dual-stack networking docs: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes dual-stack validation docs: https://kubernetes.io/docs/tasks/network/validate-dual-stack/
- Cisco Nexus 9000 Series NX-OS Unicast Routing Configuration Guide, Release 10.2(x) - Configuring Basic BGP: https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/102x/configuration/Unicast-routing/cisco-nexus-9000-series-nx-os-unicast-routing-configuration-guide-release-102x/m-n9k-configuring-basic-bgp-101x.html
- Cisco Nexus 9000 Series NX-OS Unicast Routing Configuration Guide, Release 10.6(x): https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/106x/configuration/unicast-routing-configuration/cisco-nexus-9000-series-nx-os-unicast-routing-configuration-guide.pdf
- Cisco Nexus 9000 Series NX-OS Command Reference (Configuration Commands), Release 10.3(x) - prefix-list neighbor command: https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/103x/command-reference/config/b_n9k_config_commands_103x/m_p_cmds.html

## Issues Found
- The post treated `/126` and `/127` as equivalent point-to-point guidance. RFC 6164 specifically standardizes `/127` for inter-router point-to-point links, and the concrete examples in the post already used `/127`. I updated the explanatory text to make `/127` the documented recommendation.
- The Cisco NX-OS BGP snippets used IOS-style `activate`, `remote-as range`, and `ip prefix-list` in an IPv6 example. NX-OS enables the neighbor address family by entering `address-family ipv6 unicast`, uses dynamic AS matching through `remote-as route-map`, and uses `ipv6 prefix-list` for IPv6 prefixes. I corrected the spine and leaf examples to match documented NX-OS behavior.
- The conclusion implied that `/128` loopback addresses are BGP router IDs. On NX-OS, the BGP router ID is a separate 32-bit value, commonly represented as an IPv4 address. I corrected the wording to describe loopbacks as stable peering and reachability addresses instead.
- The server example said SLAAC addresses are MAC-derived. Current IETF guidance recommends stable opaque or temporary interface identifiers rather than embedding stable link-layer addresses by default. I changed the wording to `SLAAC-derived IID`.
- The Kubernetes example presented a fixed per-node `/64` as universal behavior and used a sample prefix outside the post's own `2001:db8:dc1:2000::/52` workload block. I changed the wording to a common-but-configurable pattern, noted the dependency on the CNI plugin and cluster configuration, and moved the sample pod CIDR into a non-overlapping sub-block within the workload allocation.
- The Python inventory generator did not follow the row/rack encoding shown earlier in the post. I updated it to generate `Leaf-101`-style names and matching `/128` loopbacks, and added simple `ipaddress` validation assertions.

## Review Notes
- The examples correctly use the `2001:db8::/32` documentation prefix reserved for published samples.
- The updated Python snippet was executed locally with `python3` to confirm it runs and generates 48 leaf entries.
