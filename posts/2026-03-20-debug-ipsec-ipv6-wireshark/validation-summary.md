# Validation Summary: How to Debug IPsec IPv6 Issues with Wireshark

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- IPv6 (RFC 8200)
- IPsec / ESP (RFC 4303)
- IKEv2 (RFC 7296)
- Wireshark / tshark (display filters, ESP decryption)
- tcpdump / libpcap BPF filters
- strongSwan (swanctl, charon, charon.conf filelog)
- Linux XFRM (`ip xfrm state`)
- ICMPv6 Packet Too Big / Path MTU Discovery (RFC 4443, RFC 8201)

## Sources Consulted
- RFC 7296 — Internet Key Exchange Protocol Version 2 (IKEv2)
- RFC 4303 — IP Encapsulating Security Payload (ESP)
- RFC 4443 — ICMPv6 (Type 2 = Packet Too Big)
- RFC 8200 — IPv6 specification (Next Header field at byte offset 6)
- strongSwan documentation: swanctl command reference (https://docs.strongswan.org/docs/latest/swanctl/swanctl.html) and charon logger configuration
- Wireshark documentation: ESP preferences and SA configuration (https://www.wireshark.org/docs/wsug_html_chunked/ChAdvDecryptingIPsecESP.html)
- libpcap / pcap-filter(7) man page

## Issues Found
1. **Incorrect swanctl initiate syntax.** The post used `swanctl --initiate conn:my-vpn`, which is not valid swanctl syntax. swanctl uses `--child <name>` (or `-c`) to specify the Child SA to bring up. Changed to `swanctl --initiate --child my-vpn`.

2. **Misleading IKEv2 exchange sequence.** The post listed CREATE_CHILD_SA Request/Response as part of a "successful negotiation," implying it is part of the initial handshake. Per RFC 7296, the first Child SA is established within IKE_AUTH; CREATE_CHILD_SA only appears later for rekey operations or when adding additional Child SAs. Reworded to separate the initial two-exchange handshake (IKE_SA_INIT + IKE_AUTH) from CREATE_CHILD_SA, which is now correctly described as occurring later for rekey/additional SAs.

3. **Wrong strongSwan logging configuration.** The post used the legacy/ambiguous filepath-as-section form for `filelog` and claimed `knl = 3` causes keys to be logged. In modern strongSwan the named-section format with `path =` is preferred, and key material requires debug level 4 ("private") on the IKE subsystem (not level 3 on kernel). Updated the snippet to the named-section form, raised `ike` to level 4 with a comment explaining that level 4 logs sensitive material, and clarified the path comment.

## Review Notes
- The libpcap filter `ip6 proto 50` works only when ESP is the immediate Next Header. If IPv6 extension headers (Hop-by-Hop, Routing, Fragment, etc.) sit between the IPv6 header and ESP, `ip6 protochain 50` is more robust. Same caveat applies to `ip6[6] == 50` and `ip6[40] == 2`. Left as-is because (a) the post is targeting the common case, and (b) extension headers are rare in production IPsec.
- `ip -6 link set eth0 mtu 1400` works, but the `-6` family flag has no effect on link operations (MTU is a link-layer property). The command is harmless. Setting MTU on the underlying physical interface affects all traffic, not just the IPsec tunnel — for tunnel-mode IPsec it's often better to set MTU on a virtual tunnel interface or use TCP MSS clamping. Left untouched as it is technically valid.
- All Wireshark UI references (Edit → Preferences → Protocols → ESP, "Attempt to detect/decode encrypted ESP payloads", ESP SAs table fields) match current Wireshark versions.
- `ip xfrm state list` is correct (`list` and `show` are both valid subcommands).
- ICMPv6 type 2 = Packet Too Big and the byte-40 offset are correct per RFC 4443 and RFC 8200.
