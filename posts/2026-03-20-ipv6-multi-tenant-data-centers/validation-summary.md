# Validation Summary: How to Plan IPv6 for Multi-Tenant Data Centers - Centers

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and subnetting
- VRF and BGP on Cisco NX-OS
- Linux network namespaces with `iproute2`
- Linux firewalling with `ip6tables`
- Router Advertisements with `radvd`
- Python `ipaddress`-based IPAM logic

## Sources Consulted
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- Cisco Nexus 9000 Series NX-OS Unicast Routing Configuration Guide, IPv6 Addresses: https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/106x/configuration/unicast-routing-configuration/cisco-nexus-9000-series-nx-os-unicast-routing-configuration-guide/m-n9k-configuring-ipv6-93x.html
- Cisco Nexus 9000 Series NX-OS Unicast Routing Configuration Guide, BGP: https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/105x/unicast-routing-configuration/cisco-nexus-9000-series-nx-os-unicast-routing-configuration-guide/configuring-bgp.html
- `ip-netns(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-netns.8.html
- `iptables-extensions(8)` Linux manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `radvd.conf(5)` Debian manpage: https://manpages.debian.org/testing/radvd/radvd.conf.5.en.html
- Local CLI help checked for current syntax: `ip netns help`, `ping -h`, and `ip6tables -h`

## Issues Found
- The address plan said a `/40` provides `16 /48s for growth`. That is incorrect; a `/40` contains 256 distinct `/48` subnets. I corrected the tenant A example accordingly.
- The infrastructure examples used `2001:db8:infra::/48` and `2001:db8:transit::/48`, which are invalid IPv6 literals because `infra` and `transit` are not hexadecimal hextets. I replaced them with valid documentation prefixes.
- The Cisco NX-OS SVI example assigned `2001:db8:a000::1/48` directly to a tenant VLAN. For standard IPv6 host-facing subnets, the VLAN/link should be a `/64`, consistent with RFC 4291/RFC 4862 and Cisco NX-OS IPv6 guidance. I changed the interface and BGP example to a `/64` tenant VLAN prefix.
- The Linux namespace example was incomplete as written: it did not configure the host-side veth address, did not bring interfaces up, and therefore would not have worked for the ping/default-route example. I added the required interface and link-up steps.
- The namespace isolation verification comment implied that a ping fails simply because the destination is in a different namespace. That overstates what namespaces guarantee. I changed the note to reflect that failure depends on the absence of explicit routing/firewall policy.
- The example used `ping6`; current `iputils` documents IPv6 usage as `ping -6`. I updated the verification commands to the current documented form.
- The firewall example used `-m state --state ESTABLISHED,RELATED`. That still works, but `state` is documented as a subset of `conntrack`. I updated the example to `-m conntrack --ctstate ESTABLISHED,RELATED`.
- The `radvd` example set `AdvManagedFlag on` while also leaving `AdvAutonomous on` for the same prefix, even though the comment said DHCPv6 was being used for addresses. I changed Tenant A's prefix advertisement to `AdvAutonomous off` so the example matches the stated DHCPv6-managed behavior.
- The architecture bullet used `Policy routing` to describe firewall traversal. That is the wrong term for the mechanism shown in the post, so I corrected it to `Firewall policy`.

## Review Notes
- `2001:db8::/32` is a documentation-only prefix, so the examples are suitable for a blog post but must not be used as real production allocations.
- The `ip6tables` examples remain technically valid, but many current Linux deployments use the nftables backend underneath `ip6tables`; a future refresh could add an `nft` equivalent.
- The Python IPAM example is syntactically correct and its allocation logic works, but it is intentionally simplistic and does not persist allocations or handle duplicate tenant IDs.
