# Validation Summary: How to Plan SRv6 Deployment for Your Network

## Status
validated

## Post Type
Guide

## Technologies Covered
- SRv6
- IPv6
- IS-IS
- BGP
- Linux networking
- iproute2
- Python
- FRRouting

## Sources Consulted
- RFC 8754, "IPv6 Segment Routing Header (SRH)" https://www.rfc-editor.org/rfc/rfc8754.html
- RFC 8986, "Segment Routing over IPv6 (SRv6) Network Programming" https://www.rfc-editor.org/rfc/rfc8986
- RFC 9252, "BGP Overlay Services Based on Segment Routing over IPv6 (SRv6)" https://www.rfc-editor.org/rfc/rfc9252.html
- RFC 9256, "Segment Routing Policy Architecture" https://www.rfc-editor.org/rfc/rfc9256.html
- RFC 9352, "IS-IS Extensions to Support Segment Routing over the IPv6 Data Plane" https://www.rfc-editor.org/rfc/rfc9352.html
- FRRouting IS-IS documentation https://docs.frrouting.org/en/stable-10.3/isisd.html
- Cisco, "Configure Design and Migration Best Practices for Segment Routing over IPv6" https://www.cisco.com/c/en/us/support/docs/ip/ipv6-routing/220485-configure-design-and-migration-best-prac.html
- Cisco IOS XR SRv6 IS-IS configuration guide https://www.cisco.com/c/en/us/td/docs/iosxr/cisco8000/segment-routing/710x/configuration/guide/b-segment-routing-cg-cisco8000-710x/configuring-segment-routing-over-ipv6-srv6-micro-sids.html
- Juniper, "Example: Configuring SRv6 Network Programming in IS-IS Networks" https://www.juniper.net/documentation/us/en/software/junos/is-is/topics/example/isis-configuring-srv6-network-programming.html
- Juniper, "ping srv6" https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/ping-srv6.html
- Arista EOS documentation note on SRv6/uSID ping behavior https://www.arista.com/en/support/advisories-notices/end-of-support/77-support/quick-start-guide/um-eos?start=150
- Arista SRv6 TOI index https://www.arista.com/en/support/toi/tag/srv6
- Local `ip -6 route help` and `man ip-route` output from the workspace environment

## Issues Found
- The address-planning section implied `5f00::/16` was a default SRv6 allocation and labeled the function field as a generic "behavior code". I changed this to say operators should use an operator-owned IPv6 prefix, kept `5f00::/16` as an explicit placeholder, and clarified that function IDs are locally assigned. RFC 8986 defines SRv6 SIDs as operator-defined `LOC:FUNCT:ARG` values rather than a fixed global hierarchy.
- The Linux verification commands used an invalid IPv6 address (`5f00:test::/32`) and a blanket `Need 4.14+` claim. I replaced the route example with a syntactically valid documentation-prefix `/128` SID and changed the text to require kernel and `iproute2` support for `seg6/seg6local`, which is what the actual `ip route` interface exposes.
- The vendor support matrix contained overly broad version/platform claims, including a Junos `19.4+` statement that does not match Juniper's SRv6 network-programming example documentation. I replaced the matrix with vendor-doc-driven guidance telling readers to verify exact platform and release support, while preserving the intent of the hardware assessment section.
- The IS-IS NET value was malformed because it did not contain a full 6-byte system ID. I corrected `49.0001.0000.0001.00` to `49.0001.0000.0000.0001.00`.
- The monitoring section suggested "ping to each SID" as a generic latency check and labeled a "BGP SRv6 session" as a distinct session type. I changed this to recommend pinging locators or using SRv6 OAM for SIDs, and rewrote the alert to refer to BGP sessions carrying SRv6 services or SR Policy state.
- The rollback example used an invalid placeholder route (`2001:db8:service::/48`) and an incomplete `ip route del ... encap seg6` specification, and it suggested disabling SRv6 globally on Cisco. I replaced that with a valid table-scoped route deletion example and a narrower IOS XR rollback example that removes `segment-routing srv6` from the affected protocol context.

## Review Notes
- The post is now technically sound as a planning guide, but SRv6 hardware support, uSID support, and SRv6 OAM behavior remain highly platform- and release-specific. Readers should still verify current vendor support matrices before production deployment.
- Regular ping/traceroute behavior for SRv6 SIDs varies by platform and SID type. Full-length SIDs may be testable with standard tools on some platforms, while uSID validation often requires SRv6-specific OAM commands.
