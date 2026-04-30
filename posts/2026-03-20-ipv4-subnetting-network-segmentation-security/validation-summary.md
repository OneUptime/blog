# Validation Summary: How to Plan IPv4 Subnetting for Network Segmentation and Security

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 subnetting and CIDR
- Network segmentation and DMZ design
- PF firewall rule syntax
- Cisco IOS ACLs and VLAN access control concepts
- IEEE 802.1X VLAN assignment
- Zero Trust architecture
- Python `ipaddress`
- AWS EC2 Security Groups

## Sources Consulted
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- Python IP address HOWTO: https://docs.python.org/3/howto/ipaddress.html
- OpenBSD PF User's Guide: https://www.openbsd.org/faq/pf/
- OpenBSD `pf.conf(5)` manual: https://man.openbsd.org/pf.conf.5
- Cisco, Configure IP Access Lists: https://www.cisco.com/c/en/us/support/docs/security/ios-firewall/23602-confaccesslists.html
- Cisco, VLAN Access Control Lists: https://www.cisco.com/c/en/us/td/docs/routers/ir8340/software/configuration/b_ir8340_cg_17-16-x/m-vlan-access-control-lists.pdf
- Cisco, IEEE 802.1X VLAN Assignment: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/sec_usr_8021x/configuration/xe-3e/sec-usr-8021x-xe-3e-book/sec-ieee-8021x-vlan-assign.html
- NIST SP 800-207, Zero Trust Architecture: https://nvlpubs.nist.gov/nistpubs/specialpublications/NIST.SP.800-207.pdf
- NIST SP 800-171 Rev. 3, boundary protection discussion: https://nvlpubs.nist.gov/nistpubs/SpecialPublications/800-171r3/NIST.SP.800-171r3.html
- Amazon EC2 security groups documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html
- RFC 1918, Address Allocation for Private Internets: https://www.rfc-editor.org/rfc/rfc1918.html

## Issues Found
- The User LAN subnet was written as `10.x.10.0/22` and `10.1.10.0/22`. In CIDR notation that has host bits set for a `/22`, and Python's `ipaddress.IPv4Network()` raises `ValueError` by default for that input. I corrected both to `10.x.8.0/22` and `10.1.8.0/22`, which are valid `/22` network addresses.
- The firewall policy matrix showed `Internet -> DMZ` as unrestricted `ALLOW`. I changed it to `ALLOW*` so it matches least-privilege, allow-by-exception firewall policy and the existing footnote that `*` means specific ports only.
- The PF examples matched TCP ports without an explicit protocol. I added `proto tcp` to the HTTP/HTTPS, PostgreSQL, and SSH examples so the syntax aligns with PF documentation and the rules describe the intended traffic precisely.
- The Cisco ACL example labeled `permit ip ... host 8.8.8.8` as DNS, but that permits all IP traffic to `8.8.8.8`, not just DNS. I replaced it with explicit UDP/TCP port 53 permits.
- The Cisco ACL example claimed to prevent workstation-to-workstation direct communication with an inbound ACL on `interface Vlan10`. A routed SVI ACL does not stop same-VLAN switched traffic, so I changed the example to describe and implement routed user-VLAN restrictions instead.
- The Zero Trust bullet described both VMware NSX and AWS Security Groups as "hypervisor" microsegmentation. AWS Security Groups are instance-level controls, so I reworded that line to "virtualized or cloud environments."
- The conclusion said ACLs block lateral movement "within zones." Given the corrected example is a routed ACL, I changed that to "across routed paths."

## Review Notes
- The Python usable-address calculation (`net.num_addresses - 2`) is correct for the subnets shown in the post. If the example is later generalized to `/31` or `/32` networks, it should special-case those masks.
