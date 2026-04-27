# Validation Summary: How to Set Up IPsec VPN for IPv4 on pfSense

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- pfSense (firewall/router OS, FreeBSD-based)
- strongSwan (IPsec daemon used by pfSense)
- IPsec / IKEv2 (Internet Key Exchange v2)
- ESP (Encapsulating Security Payload, IP protocol 50)
- AES-256, SHA-256, DH Group 14 (cryptographic primitives)
- Site-to-site VPN with Pre-Shared Key (PSK) authentication
- Outbound NAT (Hybrid mode)

## Sources Consulted
- pfSense official documentation: IPsec Site-to-Site (https://docs.netgate.com/pfsense/en/latest/recipes/ipsec-s2s-psk.html)
- pfSense documentation: Phase 1 / Phase 2 settings (https://docs.netgate.com/pfsense/en/latest/vpn/ipsec/index.html)
- strongSwan documentation (https://docs.strongswan.org/)
- FreeBSD ping(8) man page (verifies `-S source_address` flag)
- RFC 7296 (IKEv2 Protocol)
- RFC 4303 (ESP)
- RFC 3526 (MODP Group 14 / 2048-bit DH)

## Issues Found
No technical issues found.

The configuration values, navigation paths, cryptographic parameters, default lifetimes (28800s for Phase 1, 3600s for Phase 2), firewall rule protocols (ESP + UDP 500/4500 for NAT-T), Hybrid Outbound NAT exclusion approach, and verification commands (`ipsec statusall`, FreeBSD `ping -S`) are all technically accurate and consistent with pfSense/strongSwan.

## Review Notes
- pfSense automatically adds firewall rules to the WAN interface to allow ESP and UDP 500/4500 when IPsec is enabled (unless "Disable all auto-added VPN rules" is set in System > Advanced > Firewall & NAT). Manually adding these rules is not strictly required by default but is shown here for completeness — this is a reasonable pedagogical choice.
- The "Port: 500, 4500" notation in the WAN UDP firewall rule represents intent rather than a literal field value; in the pfSense GUI, this requires either two separate rules or a port alias. The intent is clear from context, so no correction was made.
- The "Translation: No NAT / No BINAT" wording in the Outbound NAT section corresponds to the "Do not NAT" checkbox in pfSense's Outbound NAT rule editor; the wording is descriptive but conveys intent correctly.
- Phase 2 protocol field (ESP vs AH) is omitted but ESP is the universal default for site-to-site tunnels, so this omission is acceptable.
- DH Group 14 (2048-bit MODP) is acceptable but minimum-recommended; future updates could mention stronger groups (e.g., Group 19/20/21 ECP curves) for higher security postures.
