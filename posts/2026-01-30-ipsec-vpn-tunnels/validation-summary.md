# Validation Summary: How to Build IPSec VPN Tunnels

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- IPsec
- IKEv1 and IKEv2
- ESP and AH
- strongSwan
- strongSwan `ipsec.conf` and `ipsec.secrets`
- strongSwan PKI tooling
- Linux iptables, firewalld, sysctl, and XFRM
- AWS Site-to-Site VPN
- Ansible
- Prometheus node_exporter textfile collector

## Sources Consulted
- RFC 7296: Internet Key Exchange Protocol Version 2 (IKEv2): https://datatracker.ietf.org/doc/html/rfc7296
- RFC 4301: Security Architecture for the Internet Protocol: https://datatracker.ietf.org/doc/html/rfc4301
- RFC 4302: IP Authentication Header: https://datatracker.ietf.org/doc/html/rfc4302
- RFC 4303: IP Encapsulating Security Payload (ESP): https://datatracker.ietf.org/doc/html/rfc4303
- strongSwan Algorithm Proposals documentation: https://docs.strongswan.org/docs/latest/config/proposals.html
- strongSwan Security Recommendations: https://docs.strongswan.org/docs/latest/howtos/securityRecommendations.html
- strongSwan Certificates Quickstart: https://docs.strongswan.org/docs/latest/pki/pkiQuickstart.html
- strongSwan `ipsec.conf(5)` man page: https://manpages.debian.org/unstable/strongswan-starter/ipsec.conf.5.en.html
- AWS Site-to-Site VPN getting started documentation: https://docs.aws.amazon.com/vpn/latest/s2svpn/SetUpVPNConnections.html

## Issues Found
- The post described IKE as always happening in two phases. Updated the wording to clarify that "Phase 1/Phase 2" is IKEv1 terminology, while IKEv2 uses an IKE SA and one or more CHILD_SAs.
- The Phase 2 section implied that ESP integrity algorithms are always configured separately. Updated it to note that SHA integrity is used with non-AEAD ciphers and omitted for AEAD ciphers such as AES-GCM.
- The firewall forwarding comment referred to "tunnel interfaces" even though the examples are policy-based IPsec and do not create tunnel interfaces. Updated the comment to describe policy-protected forwarding and to tell readers to adjust interfaces for their topology.
- The certificate-based `ipsec.conf` example did not set `authby=pubkey`, which could be wrong if pasted into a file with an earlier `authby=secret` default. Added `authby=pubkey`.
- The multi-subnet diagram labeled comma-separated subnet selectors as "Multiple Child SAs." Updated it to "Multiple Traffic Selectors" to match the IKEv2 multi-selector configuration shown.
- The AWS routing example added Linux routes via AWS inside tunnel IPs while the shown strongSwan configuration was policy-based and did not configure VTI or XFRM interfaces. Replaced the route commands with a note explaining that policy-based XFRM policies select matching traffic, and that VTI/XFRM interfaces are required for route-based static routes or BGP.
- The modern AES-GCM IKE proposal used `sha384` as if it were an integrity algorithm. Updated it to `prfsha384`, matching strongSwan's AEAD proposal syntax for IKEv2.

## Review Notes
The examples use strongSwan's legacy `ipsec.conf`/starter interface, which is still documented and widely packaged, but strongSwan's newer documentation emphasizes `swanctl.conf` and VICI for modern deployments. The AWS section remains intentionally generic because AWS-generated customer gateway configurations vary by tunnel options and routing mode.
