# Validation Summary: How to Use NAT with IPsec VPN Tunnels

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPsec (ESP, AH, IKE)
- NAT-Traversal (NAT-T, RFC 3947 / RFC 3948)
- strongSwan (ipsec.conf, IKEv2)
- iptables (nat table, policy match, NETMAP, MASQUERADE, SNAT, DNAT)
- nftables (inet nat, postrouting, masquerade)
- Linux networking

## Sources Consulted
- RFC 3947 - Negotiation of NAT-Traversal in the IKE: https://datatracker.ietf.org/doc/html/rfc3947
- RFC 3948 - UDP Encapsulation of IPsec ESP Packets: https://datatracker.ietf.org/doc/html/rfc3948
- RFC 4301 - Security Architecture for the Internet Protocol: https://datatracker.ietf.org/doc/html/rfc4301
- RFC 4302 - IP Authentication Header (AH): https://datatracker.ietf.org/doc/html/rfc4302
- RFC 4303 - IP Encapsulating Security Payload (ESP): https://datatracker.ietf.org/doc/html/rfc4303
- strongSwan ipsec.conf documentation: https://docs.strongswan.org/docs/5.9/config/IKEv2.html and https://wiki.strongswan.org/projects/strongswan/wiki/ConnSection
- iptables-extensions(8) man page (policy match, NETMAP, SNAT, DNAT, MASQUERADE)
- nftables wiki: https://wiki.nftables.org/wiki-nftables/index.php/Performing_Network_Address_Translation_(NAT)
- IANA Protocol Numbers: https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml (ESP=50, AH=51)

## Issues Found
- **Overlapping subnets NAT example used SNAT to a single IP, inconsistent with stated goal of 1:1 subnet translation.** The original code translated `192.168.1.0/24` to a single source IP `10.100.1.10` via `SNAT --to-source 10.100.1.10`, while the comment and the corresponding `DNAT --to-destination 192.168.1.0/24` rule implied 1:1 subnet mapping. SNAT to a single address performs PAT/overload, not 1:1 mapping, so individual hosts on the local subnet would not be addressable from the remote side. Replaced both rules with the `NETMAP` target (`-j NETMAP --to 10.100.1.0/24` and `-j NETMAP --to 192.168.1.0/24`), which is the standard iptables target for stateless 1:1 subnet translation and is consistent with the stated goal.

## Review Notes
- The ESP/AH protocol descriptions and NAT-T encapsulation format are accurate.
- RFC 3947 reference is correct (RFC 3948 also defines the UDP encapsulation format if a more precise citation were desired, but RFC 3947 covers NAT-T negotiation as stated).
- The strongSwan `ipsec.conf` snippet uses the legacy stroke/starter format. This format is still supported in strongSwan 5.x but is being phased out in favour of `swanctl.conf` (vici) in newer releases. Readers using strongSwan 6.x and later may need to convert to swanctl syntax.
- The IKE NAT detection explanation ("comparing internal IP with external IP") is a simplification. In practice, IKE peers exchange NAT-D payloads containing hashes of IP/port pairs and compare the received hash with the locally computed one. The simplification is acceptable for an introductory tutorial.
- The iptables NAT-table `ACCEPT` and `RETURN` targets both effectively bypass MASQUERADE for matching packets; both forms shown are valid.
- nftables `priority 100` for the postrouting NAT chain is equivalent to the named priority `srcnat` and is correct.
- The `forceencaps=yes` strongSwan option is documented and works as described.
