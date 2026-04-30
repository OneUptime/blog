# Validation Summary: How to Plan IPv4 Addressing for Voice Over IP (VoIP) Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 subnetting
- VoIP
- DHCP (ISC DHCP)
- Cisco IOS switching and QoS
- VLANs
- SIP
- SDP
- RTP
- NAT traversal

## Sources Consulted
- ISC DHCP 4.4 `dhcp-options` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- ISC standard DHCP options reference: https://kb.isc.org/docs/standard-dhcp-options
- RFC 2132, DHCP Options and BOOTP Vendor Extensions: https://www.rfc-editor.org/rfc/rfc2132.html
- RFC 5859, TFTP Server Address Option for DHCPv4: https://www.rfc-editor.org/rfc/rfc5859
- Cisco, Configure Catalyst 2960/2950 Series Switches with Voice VLAN: https://www.cisco.com/c/en/us/support/docs/switches/catalyst-2950-series-switches/113260-voice-vlan-00.html
- Cisco, Quality of Service for Voice over IP: https://www.cisco.com/c/en/us/td/docs/ios/solutions_docs/qos_solutions/QoSVoIP/QoSVoIP.html
- RFC 4594, Configuration Guidelines for DiffServ Service Classes: https://www.rfc-editor.org/rfc/rfc4594.html
- RFC 6314, NAT Traversal Practices for Client-Server SIP: https://www.rfc-editor.org/rfc/rfc6314
- RFC 5389, Session Traversal Utilities for NAT: https://www.rfc-editor.org/rfc/rfc5389.html
- Cisco IOS XE, SIP ALG Hardening for NAT and Firewall: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-addressing/b-ip-addressing/m_iadnat-fw-sip-alg-hardng.html

## Issues Found
- The ISC DHCP example used Cisco IOS syntax (`option 150 ip ...`) instead of ISC DHCP syntax. I changed it to `option tftp-server-address ...`, which is the correct ISC DHCP option name for DHCP option 150.
- The Cisco switch snippet enabled `mls qos trust cos` on the access port but omitted the required global `mls qos` command on platforms that use this QoS model. I added `mls qos` to make the example operational.
- The QoS section presented UDP `16384-32767` as if it were the universal RTP range. I qualified it as an example/common range because RTP port ranges vary by platform.
- The SIP/NAT section treated SIP over TLS as a NAT traversal method and overgeneralized SIP ALG. I rewrote that section to describe SBCs, ICE/STUN/TURN, keepalives/symmetric RTP, and to position SIP ALG as platform/provider-specific rather than a default recommendation.
- The Cisco SIP ALG disable command was changed from the port-specific form to the documented `no ip nat service sip` form.
- The introduction said QoS could "guarantee" voice quality. I changed that to "protect" voice quality, which is technically more accurate.

## Review Notes
- The latency, jitter, and packet-loss targets are reasonable design targets, but they are not universal absolutes; acceptable values still depend on codec choice, path characteristics, and endpoint behavior.
- `switchport voice vlan` behavior depends on endpoint/vendor capabilities such as CDP or LLDP-MED; the example is appropriate for Cisco-style voice VLAN deployments.
- The Python example is syntactically valid and produces sensible subnet sizes for the sample phone counts.
