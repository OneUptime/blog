# Validation Summary: How to Understand the Encapsulating Security Payload (ESP) in IPv6 (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPsec
- ESP
- AH
- Linux XFRM / `ip xfrm`
- strongSwan
- IKEv2
- NAT Traversal (NAT-T)

## Sources Consulted
- RFC 4303, IP Encapsulating Security Payload (ESP): https://datatracker.ietf.org/doc/rfc4303/
- RFC 4302, IP Authentication Header: https://datatracker.ietf.org/doc/html/rfc4302
- RFC 3948, UDP Encapsulation of IPsec ESP Packets: https://datatracker.ietf.org/doc/rfc3948/
- RFC 7296, Internet Key Exchange Protocol Version 2 (IKEv2): https://datatracker.ietf.org/doc/rfc7296/
- RFC 8221, Cryptographic Algorithm Implementation Requirements and Usage Guidance for ESP and AH: https://datatracker.ietf.org/doc/html/rfc8221
- strongSwan `swanctl.conf` reference: https://docs.strongswan.org/docs/latest/swanctl/swanctlConf.html
- strongSwan configuration quickstart: https://docs.strongswan.org/docs/latest/config/quickstart.html
- strongSwan algorithm proposals reference: https://docs.strongswan.org/docs/latest/config/proposals.html
- strongSwan identity parsing reference: https://docs.strongswan.org/docs/latest/config/identityParsing.html
- Local `ip-xfrm(8)` man page for current `ip xfrm` syntax and algorithm names

## Issues Found
- The introduction and conclusion overstated ESP capabilities as if encryption, integrity, and anti-replay are always present. I changed the wording to reflect RFC 4303: ESP can provide these services depending on the SA and selected algorithms.
- The packet-structure section implied that the trailing authentication data is always a truncated HMAC and that the payload is only upper-layer data. I corrected this to note that the ICV/authentication data is optional, AEAD modes such as AES-GCM use an authentication tag, and tunnel mode can carry an entire inner IP packet.
- The Linux `ip xfrm` example used `enc "aes"`, which is not a valid current algorithm name for `ip xfrm`. I changed it to `enc "cbc(aes)"` based on the current `ip-xfrm(8)` syntax.
- The Linux `ip xfrm` example was incomplete for bidirectional traffic because it only showed one outbound SA/policy. I added a note that matching inbound and reverse-direction SAs/policies are required on the peers for return traffic.
- The strongSwan section used invalid IPv6 subnet examples (`2001:db8:site1::/48` and `2001:db8:site2::/48`) and labeled a legacy `ipsec.conf` example as “Modern IPsec”. I replaced it with a valid current `swanctl.conf` site-to-site example using IKEv2, PSK authentication, valid IPv6 selectors, and `esp_proposals`.
- The cipher-suite section said `ip xfrm state list` checks supported algorithms. That command lists configured XFRM states, not kernel algorithm support. I changed the wording so the commands are described accurately.
- The ESP vs AH comparison table overstated AH as protecting the “entire packet” and understated ESP overhead. I corrected AH integrity to account for mutable IP fields and updated the ESP size row to note the mandatory trailer and optional auth/tag overhead.
- The conclusion claimed AES-256-GCM as the singular recommended configuration. I softened this to AES-GCM as a recommended modern configuration, which is more defensible across current guidance.

## Review Notes
- The `ip xfrm` example is a manual-SA illustration. RFC 8221 strongly prefers IKEv2-managed keying for production deployments over manual keying, especially for modern AEAD suites.
- The examples were validated against RFCs, strongSwan documentation, local CLI documentation, and current syntax, but they were not executed end-to-end in a live IPsec lab during this review.
