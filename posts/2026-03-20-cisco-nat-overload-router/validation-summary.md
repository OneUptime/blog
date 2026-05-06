# Validation Summary: How to Configure NAT Overload on a Cisco Router

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cisco IOS / IOS XE NAT
- NAT overload / PAT
- Static NAT
- Static PAT / port forwarding
- IPv4 addressing
- VLAN interfaces

## Sources Consulted
- Cisco IP Addressing Services Configuration Guide, Cisco IOS XE Cupertino 17.7.x (PAT using `ip nat inside source list ... interface ... overload`): https://www.cisco.com/content/en/us/td/docs/switches/lan/catalyst9300/software/release/17-7/configuration_guide/ip/b_177_ip_9300_cg.pdf
- Cisco, Configuring NAT for IP Address Conservation (static NAT, static PAT, NAT pools): https://www.cisco.com/en/US/docs/ios-xml/ios/ipaddr_nat/configuration/15-2mt/iadnat-addr-consv.html
- Cisco, IP Addressing: NAT Configuration Guide, Cisco IOS Release 15S - Monitoring and Maintaining NAT (`clear ip nat translation`, `show ip nat translations`, `show ip nat statistics`): https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_nat/configuration/15-s/nat-15-s-book/iadnat-monmain.html
- Cisco IOS IP Addressing Services Command Reference (`clear ip nat translation` syntax and related commands): https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr/command/ipaddr-cr-book.pdf
- RFC 3022, Traditional IP Network Address Translator (Traditional NAT): https://www.rfc-editor.org/rfc/rfc3022.html
- RFC 2663, IP Network Address Translator (NAT) Terminology and Considerations: https://www.rfc-editor.org/rfc/rfc2663.html

## Issues Found
- The specific clear command example was invalid. `clear ip nat translation inside 10.1.0.10 outside 8.8.8.8` omits required address arguments from Cisco’s documented syntax. It was changed to `clear ip nat translation inside 203.0.113.2 10.1.0.10 outside 8.8.8.8 8.8.8.8`.
- The static NAT section presented 1:1 static NAT and static PAT entries using the same inside/global mapping in one block, which is misleading because Cisco documents same-address static NAT and PAT as unsupported for `ip nat inside source static` when treated as one combined configuration. The comment was updated to make the 1:1 static NAT line and the port-forwarding lines explicitly alternative examples.

## Review Notes
- The core NAT overload configuration is technically correct: match inside addresses with a standard ACL, apply `ip nat inside source list <ACL> interface <WAN> overload`, and mark interfaces with `ip nat inside` / `ip nat outside`.
- The post focuses on NAT itself. Real internet access also requires correct routing and any required security policy or ACLs, which are assumed but not shown.
- The examples use documentation-only public IPv4 space (`203.0.113.0/24`), which is appropriate for a tutorial.
