# Validation Summary: How to Understand the Encapsulating Security Payload (ESP) in IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPsec
- ESP (Encapsulating Security Payload)
- NAT Traversal (NAT-T)
- Linux `ip xfrm`
- `tcpdump`
- strongSwan / `swanctl`
- IKEv2

## Sources Consulted
- RFC 4303: IP Encapsulating Security Payload (ESP) - https://datatracker.ietf.org/doc/rfc4303/
- RFC 4106: The Use of Galois/Counter Mode (GCM) in IPsec Encapsulating Security Payload (ESP) - https://www.rfc-editor.org/rfc/rfc4106
- RFC 3948: UDP Encapsulation of IPsec ESP Packets - https://www.rfc-editor.org/rfc/rfc3948.html
- RFC 8221: Cryptographic Algorithm Implementation Requirements and Usage Guidance for ESP and AH - https://www.rfc-editor.org/rfc/rfc8221
- strongSwan `swanctl.conf` documentation - https://docs.strongswan.org/docs/latest/swanctl/swanctlConf.html
- strongSwan NAT Traversal documentation - https://docs.strongswan.org/docs/5.9/features/natTraversal.html
- Local `ip-xfrm(8)` man page
- Local `tcpdump(8)` man page

## Issues Found
- The ESP packet diagram treated the IV as a fixed standalone ESP header field. RFC 4303 defines the algorithm-dependent IV/nonce, when present, as part of `Payload Data`, not as a separate generic ESP field. I updated the diagram and the accompanying bullets to reflect the RFC packet layout and integrity coverage.
- The integrity description said the ICV was a MAC over SPI, Sequence Number, IV, and Payload. RFC 4303 defines integrity coverage more broadly over SPI, Sequence Number, Payload Data, and the ESP trailer fields. I corrected the wording and labeled the field as `ICV / tag` to cover AEAD usage accurately.
- The manual Linux transport-mode example used `enc aes`, which does not match current `ip xfrm` algorithm naming in `ip-xfrm(8)`. I changed it to `enc 'cbc(aes)'` and changed the HMAC example to the standard `auth-trunc 'hmac(sha256)' ... 128` form.
- The tunnel-mode example used invalid IPv6 literals such as `2001:db8:gw1::1` and `2001:db8:site1::/48`, which are not legal IPv6 addresses. I replaced them with valid documentation-prefix IPv6 addresses.
- The NAT-T diagram incorrectly showed a Non-ESP Marker in UDP-encapsulated ESP packets. RFC 3948 places the Non-ESP Marker in IKE packets sent over UDP 4500, while UDP-encapsulated ESP packets begin directly with the ESP header and a non-zero SPI. I corrected the diagram accordingly.
- The verification section used `tcpdump -i eth0 'ip6 proto 50'`, which the `tcpdump(8)` man page notes does not chase the IPv6 extension-header chain. I updated it to `ip6 protochain 50` for IPv6 accuracy.
- The byte-counter example used `ip xfrm state list` without stats output. I updated it to `ip -s xfrm state list` so the command actually exposes byte counters.
- The manual AES-GCM `ip xfrm` examples lacked an important caveat. RFC 8221 says counter-mode AEAD algorithms such as AES-GCM must not be used with manual keying. I kept the syntax as illustrative but added comments stating these SAs should be negotiated via IKEv2 in production.

## Review Notes
- The post is now technically accurate for a high-level guide, but the `ip xfrm` examples remain illustrative rather than complete production VPN configurations.
- `tcpdump -i eth0 'udp port 4500'` captures IKE-on-4500 traffic and NAT-T keepalives in addition to ESP-in-UDP packets.
