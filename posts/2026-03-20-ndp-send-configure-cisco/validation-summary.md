# Validation Summary: How to Configure SEND on Cisco Routers

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Cisco IOS / IOS XE
- IPv6 Secure Neighbor Discovery (SEND, RFC 3971)
- Cisco IPv6 First Hop Security (FHS)
- IPv6 RA Guard
- IPv6 DHCPv6 Guard
- IPv6 Snooping / Binding Table
- IPv6 Source Guard
- Cisco IOS crypto key infrastructure (RSA)

## Sources Consulted
- [Cisco IPv6 First-Hop Security Configuration Guide - IPv6 RA Guard (IOS XE 16.10.x)](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6_fhsec/configuration/xe-16-10/ip6f-xe-16-10-book/ip6-ra-guard.html)
- [Cisco IPv6 First-Hop Security Configuration Guide - IPv6 RA Guard (IOS 15E)](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6_fhsec/configuration/15-e/ip6f-15-e-book/ip6-ra-guard.html)
- [Cisco IPv6 First-Hop Security Configuration Guide - IPv6 Source Guard and Prefix Guard (IOS 15E)](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6_fhsec/configuration/15-e/ip6f-15-e-book/ip6f-15-e-book_chapter_0110.html)
- [Cisco Security Configuration Guide, IOS XE Cupertino 17.9.x (Catalyst 9300) - IPv6 First Hop Security](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-9/configuration_guide/sec/b_179_sec_9300_cg/configuring_ipv6_first_hop_security.html)
- [Cisco IOS IPv6 Command Reference - show ipv6 na to show ipv6 pr](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s4.html)
- RFC 3971 (SEcure Neighbor Discovery)
- RFC 3972 (Cryptographically Generated Addresses)

## Issues Found
No technical issues found.

The post correctly characterizes Cisco's SEND support as limited and steers users toward IPv6 First Hop Security as the practical alternative. All Cisco IOS commands shown are syntactically valid:

- `ipv6 nd raguard policy <name>` with `device-role host|router` and `trusted-port` sub-commands match the official IOS RA Guard configuration model.
- `ipv6 dhcp guard policy <name>` with `device-role client` is correct DHCPv6 Guard syntax.
- `ipv6 snooping policy <name>` with `security-level guard` and the `vlan configuration` attach mode are valid for binding-table construction.
- `ipv6 source-guard attach-policy <name>` is the correct interface-level attach command.
- `ipv6 neighbor binding max-entries 1000` is a valid global binding-table tuning command.
- `crypto key generate rsa general-keys modulus 2048 label SEND_KEY` and `show crypto key mypubkey rsa SEND_KEY` are correct IOS crypto syntax.
- Verification commands `show ipv6 nd raguard policy`, `show ipv6 nd raguard interface ...`, and `show ipv6 neighbor binding` are all valid.

## Review Notes
- The post deliberately shows `ipv6 source-guard attach-policy SOURCE_GUARD_POLICY` without explicitly defining `ipv6 source-guard policy SOURCE_GUARD_POLICY` first. In a production context the policy must be created beforehand (e.g., `ipv6 source-guard policy SOURCE_GUARD_POLICY` followed by `validate address` or `permit link-local`). This is an omission rather than an error and is consistent with the abbreviated style of the surrounding examples.
- IPv6 Source Guard requires the binding table to be populated first (via IPv6 Snooping or DHCP/ND gleaning); the post's ordering (Snooping → RA Guard → DHCPv6 Guard → Source Guard) reflects this dependency correctly.
- Command availability varies across Cisco platforms and IOS / IOS XE versions. On modern Catalyst platforms (e.g., 9300/9400), the `ipv6 snooping` family has been superseded in newer guides by the `device-tracking` policy syntax, but the legacy `ipv6 snooping` commands still work and are documented in current IOS XE references. A future revision could mention the `device-tracking policy` equivalents for newer platforms.
- The SEND status statement is accurate: native SEND in mainstream IOS releases is essentially absent; Cisco's posture is to recommend FHS instead.
