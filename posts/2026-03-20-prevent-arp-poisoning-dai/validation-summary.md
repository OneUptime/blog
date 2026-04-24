# Validation Summary: How to Prevent ARP Poisoning with Dynamic ARP Inspection

## Status
validated

## Post Type
Guide

## Technologies Covered
- ARP
- ARP spoofing / ARP poisoning
- Dynamic ARP Inspection (DAI)
- DHCP snooping
- Cisco IOS / Cisco Catalyst switch configuration
- ARP ACLs

## Sources Consulted
- Cisco IOS XE 17 FHS and SISF Configuration Guide, "Dynamic ARP Inspection": https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/sec-crypto/fhs-sisf/fhs-and-sisf-configuration-guide/dynamic-arp-inspection.html
- Cisco Catalyst 9200 Series Configuration Guide, "Configuring Dynamic ARP Inspection" PDF: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9200/software/release/16-11/configuration_guide/sec/b_1611_sec_9200_cg/configuring_dynamic_arp_inspection.pdf
- Cisco Security Configuration Guide, "Configuring DHCP Snooping" PDF: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst3850/software/release/3se/security/configuration_guide/b_sec_3se_3850_cg/b_sec_3se_3850_cg_chapter_01100.pdf
- Cisco support article, "Operate and Troubleshoot DHCP Snooping on Catalyst 9000 Switches" PDF: https://www.cisco.com/c/en/us/support/docs/ip/dynamic-host-configuration-protocol-dhcp-dhcpv6/217055-operate-and-troubleshoot-dhcp-snooping.pdf

## Issues Found
- The post stated that DAI depends on DHCP snooping without qualification. I corrected this to make clear that DHCP snooping is required for DHCP-assigned hosts, while ARP ACLs can be used for static hosts in non-DHCP environments.
- The overview and flowchart implied that DAI validates only against the DHCP snooping binding table. I updated both to include ARP ACLs, which Cisco documents as the supported path for static hosts.
- The DHCP snooping example presented `no ip dhcp snooping information option` as a standard step. I changed the comment to mark it as optional, because Cisco documents Option 82 insertion as the default behavior and disabling it is environment-specific.
- The trusted-port guidance said ports to servers should be trusted. I corrected this to match Cisco guidance that host-facing ports remain untrusted, with ARP ACLs used for static-IP hosts when necessary.
- The ARP ACL examples used colon-separated MAC addresses. I aligned the examples with Cisco’s documented dotted-hexadecimal MAC format used in DAI ARP ACL examples.
- The validation section showed multiple `ip arp inspection validate` commands in sequence as if they accumulated. I corrected the wording to show them as separate single-check examples and retained the combined command, because Cisco documents that each command overrides the previous validation setting.
- The validation table was too broad for `dst-mac` and too narrow for `ip`. I updated the descriptions to match Cisco’s documented behavior: `dst-mac` applies to ARP replies, and `ip` checks sender IPs broadly plus target IPs in replies.

## Review Notes
- The commands and behavior were reviewed against Cisco IOS XE / Catalyst documentation. Exact CLI availability can vary by platform and software family, but the post is now aligned with Cisco’s documented DAI behavior and syntax for Catalyst-class switches.
