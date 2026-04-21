# Validation Summary: How to Understand Stateful vs Stateless NAT

## Status
validated

## Post Type
Guide

## Technologies Covered
- Network Address Translation (NAT)
- Stateful NAT and connection tracking
- Port Address Translation (PAT/NAPT)
- Static 1:1 NAT and prefix translation
- NPTv6
- SIIT/stateless IP/ICMP translation
- Linux netfilter conntrack
- AWS NAT Gateway
- Cisco IOS NAT
- pfSense NAT

## Sources Consulted
- RFC 2663: IP Network Address Translator (NAT) Terminology and Considerations - https://www.rfc-editor.org/rfc/rfc2663
- RFC 3022: Traditional IP Network Address Translator (Traditional NAT) - https://www.rfc-editor.org/rfc/rfc3022
- RFC 6296: IPv6-to-IPv6 Network Prefix Translation - https://www.rfc-editor.org/rfc/rfc6296
- RFC 7915: IP/ICMP Translation Algorithm - https://www.rfc-editor.org/rfc/rfc7915
- RFC 2766: Network Address Translation - Protocol Translation (NAT-PT) - https://www.rfc-editor.org/rfc/rfc2766
- RFC 4966: Reasons to Move NAT-PT to Historic Status - https://www.rfc-editor.org/rfc/rfc4966
- AWS VPC NAT Gateway documentation - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html
- AWS VPC NAT Gateway troubleshooting documentation - https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-troubleshooting.html
- Linux Kernel Netfilter conntrack sysctl documentation - https://docs.kernel.org/networking/nf_conntrack-sysctl.html
- Cisco IOS XE NAT configuration guide - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_nat/configuration/xe-16-12/nat-xe-16-12-book/iadnat-stateful-nat64.html

## Issues Found
- The post described RFC 6296 prefix translation as "NAT66." RFC 6296 specifically defines NPTv6, so the example bullet and section heading were changed to use "NPTv6."
- NAT-PT was listed as an example of stateless NAT. RFC 2766 describes NAT-PT as tracking supported sessions, and RFC 4966 moved NAT-PT to Historic status. Replaced it with SIIT/stateless IP/ICMP translation from RFC 7915.
- The stateful NAT advantages and comparison table implied NAT itself is a firewall. Updated the wording to describe a firewall-like effect for unsolicited inbound traffic while noting that NAT is not a firewall by itself.
- Stateless NAT limitations were too absolute around PAT and session limits. Clarified that dynamic many-to-one PAT requires state, and that stateless NAT avoids state-table session limits rather than all possible resource limits.
- The performance comparison was oversimplified as "moderate" versus "high." Changed it to the concrete technical distinction: state lookup overhead versus no state lookup overhead.
- The stateless NAT examples were narrowed from vague hardware NAT and basic NAT phrasing to fixed 1:1, static, or prefix translation cases.
- The key takeaways used the Linux-specific term "conntrack" for all home and enterprise NAT. Updated it to the generic "connection tracking."

## Review Notes
- The author GitHub link and all three related OneUptime links returned HTTP 200 during validation.
- RFC 6296/NPTv6 is Experimental and includes operational caveats around application referrals and IP-header integrity protection. The post is still accurate after the targeted terminology fixes.
