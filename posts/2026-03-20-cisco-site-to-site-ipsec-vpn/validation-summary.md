# Validation Summary: How to Configure Site-to-Site IPsec VPN on Cisco Routers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cisco IOS / IOS XE
- IPsec
- IKEv1
- Site-to-site VPN
- IPv4 ACLs
- NAT/PAT
- Crypto maps

## Sources Consulted
- Cisco: Configure a Site-to-Site IPSec IKEv1 Tunnel Between ASA and Cisco IOS XE Router - https://www.cisco.com/c/en/us/support/docs/ios-nx-os-software/ios/218432-configure-a-site-to-site-ipsec-ikev1-tun.html
- Cisco: Internet Key Exchange for IPsec VPNs Configuration Guide, Cisco IOS XE Gibraltar 16.12.x - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/sec_conn_ikevpn/configuration/xe-16-12/sec-ike-for-ipsec-vpns-xe-16-12-book/sec-key-exch-ipsec.html
- Cisco: Security for VPNs with IPsec Configuration Guide, Cisco IOS XE Fuji 16.8.x - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/sec_conn_vpnips/configuration/xe-16-8/sec-sec-for-vpns-w-ipsec-xe-16-8-book/sec-cfg-vpn-ipsec.html
- Cisco: IP Addressing: NAT Configuration Guide, Cisco IOS XE Release 2 - Configuring NAT for IP Address Conservation - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_nat/configuration/xe-2/nat-xe-2-book/iadnat-addr-consv.html
- Cisco: Understand and Use Debug Commands to Troubleshoot IPsec - https://www.cisco.com/c/en/us/support/docs/security-vpn/ipsec-negotiation-ike-protocols/5409-ipsec-debug-00.html
- Cisco: Internet Key Exchange Security Protocol Commands - https://www.cisco.com/c/en/us/td/docs/ios/12_2/security/command/reference/srfike.html
- Cisco: Cisco IOS Configuration Fundamentals Command Reference - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/fundamentals/command/cf_command_ref/monitor_event-trace_through_Q.html
- Cisco: IP Addressing Configuration Guide, Cisco IOS XE 17.x - Configuring TCP - https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-addressing/b-ip-addressing/m_iap-tcp_for_xe.html

## Issues Found
- The original sample did not configure LAN interfaces or NAT interface roles, but it later relied on `192.168.1.1` as the ping source and on NAT exemption. I added LAN interface IPs on both routers and added `ip nat outside` on Router A's WAN plus `ip nat inside` on Router A's LAN so the configuration works as described.
- The troubleshooting note said a mismatched pre-shared key shows up as `MM_NO_STATE`. Cisco documents `MM_NO_STATE` as an early phase 1 state, not a PSK-specific indicator. I changed that note to point `MM_NO_STATE` troubleshooting at reachability, UDP/500, and ISAKMP policy matching, and added a separate PSK note tied to `debug crypto isakmp`.
- The MTU note referred to adding `ip mtu 1400` on a "crypto interface", but this example uses a crypto map on a physical interface, not a separate tunnel/VTI. I corrected the note to recommend lowering TCP MSS on the LAN interface for large-packet issues.
- The conclusion said to always add NAT exemption. That is only required when NAT is actually configured on the router, so I made the statement conditional.

## Review Notes
- The IKEv1, AES-256, SHA-256, DH group 14, transform-set, crypto map, and verification commands used here are valid in current Cisco IOS XE documentation.
- IKEv1 remains supported, but it is an older choice than IKEv2. That is not a correctness issue for this post, but it is a version/architecture caveat worth keeping in mind for future updates.
- AES-256 support depends on the platform/image supporting the relevant crypto feature set.
