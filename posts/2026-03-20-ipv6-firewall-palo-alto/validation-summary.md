# Validation Summary: How to Configure IPv6 Firewall Rules on Palo Alto Networks

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Palo Alto Networks NGFW / PAN-OS
- IPv6
- PAN-OS security policy and App-ID
- ICMPv6 and NDP
- Threat Prevention and security profiles
- PAN-OS CLI

## Sources Consulted
- PAN-OS 11.2 Configure CLI Command Hierarchy: https://docs.paloaltonetworks.com/ngfw/pan-os-cli-quick-start/cli-command-hierarchy/pan-os-11-2-configure-cli-command-hierarchy
- PAN-OS 11.1 CLI Ops Command Hierarchy: https://docs.paloaltonetworks.com/ngfw/pan-os-cli-quick-start/cli-command-hierarchy/pan-os-11-1-cli-ops-command-hierarchy
- Configure Layer 3 Interfaces: https://docs.paloaltonetworks.com/pan-os/11-0/pan-os-networking-admin/configure-interfaces/layer-3-interfaces/configure-layer-3-interfaces
- Address Objects: https://docs.paloaltonetworks.com/pan-os/11-0/pan-os-admin/policy/use-address-object-to-represent-ip-addresses/address-objects
- ICMP: https://docs.paloaltonetworks.com/ngfw/networking/networking/session-settings-and-timeouts/icmp
- Security Policy Rules Based on ICMP and ICMPv6 Packets: https://docs.paloaltonetworks.com/pan-os/11-0/pan-os-networking-admin/session-settings-and-timeouts/icmp/security-policy-rules-based-on-icmp-and-icmpv6-packets
- Objects > Services: https://docs.paloaltonetworks.com/pan-os/11-0/pan-os-web-interface-help/objects/objects-services
- IPv6 Support by Feature: https://docs.paloaltonetworks.com/compatibility-matrix/reference/ipv6-support-by-feature
- Building Blocks in a Security Policy Rule: https://docs.paloaltonetworks.com/pan-os/11-2/pan-os-web-interface-help/policies/policies-security/building-blocks-in-a-security-policy-rule
- RFC 4291: IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- RFC 4443: ICMPv6 for IPv6: https://www.rfc-editor.org/rfc/rfc4443

## Issues Found
- Several example IPv6 literals were invalid because they used non-hexadecimal hextets such as `wan`, `lan`, `mgmt`, and `web`. I replaced them with valid documentation-style IPv6 prefixes and host addresses.
- The interface CLI examples used the wrong hierarchy and command form. I corrected them to the documented `layer3 ipv6 enabled yes` and `layer3 ipv6 address ... enable-on-interface yes` syntax.
- The ICMPv6 section incorrectly created a TCP service object for ICMPv6 and used `icmp6` as the application name. I removed the invalid service object example and changed the App-ID to `ipv6-icmp`.
- The IPv6 session-monitoring command used `ipv6 yes`, which is not the documented ops filter. I corrected it to `ip6 yes`.
- The address-group example used `member` subcommands instead of the documented `static [ ... ]` syntax. I corrected the CLI example.
- The packet-diag example used invalid IPv6 literals and incorrect arguments such as `ipv6`, `sport`, and `dport`. I rewrote it to match the documented filter syntax, including `destination-port` and `ipv6-only yes`.
- The threat-prevention section described Anti-Spyware as including IPS. I removed that wording because PAN-OS documents Anti-Spyware and Vulnerability Protection as separate profile types.
- The verification example used `show running security-policy name ...`, which does not match the documented usage I verified. I replaced it with `show running security-policy`.

## Review Notes
- The post is now technically correct against current PAN-OS documentation, but it is version-agnostic. Readers using older PAN-OS releases should still confirm CLI paths against their exact version.
- The outbound example rule still uses `Application: any` in the GUI snippet. That can work, but Palo Alto documentation recommends specifying applications instead of `any` where practical to reduce attack surface.
- `Best-Practice` is reasonable as an example profile-group name, but Security Profile Groups are objects you create or select; they are not implied to exist automatically on every firewall.
