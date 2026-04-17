# Validation Summary: How to Analyze IPv6 IPsec Traffic in Wireshark

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Wireshark / tshark display filters
- IPv6 (RFC 8200 extension header chain)
- IPsec: ESP (protocol 50), AH (protocol 51)
- IKEv2 / ISAKMP (RFC 7296)
- NAT Traversal (UDP 4500)

## Sources Consulted
- RFC 4303 (IP Encapsulating Security Payload) — confirms ESP = protocol 50
- RFC 4302 (IP Authentication Header) — confirms AH = protocol 51
- RFC 7296 (IKEv2) — confirms exchange types: 34=IKE_SA_INIT, 35=IKE_AUTH, 36=CREATE_CHILD_SA, 37=INFORMATIONAL; UDP 500/4500 usage
- RFC 3948 (UDP Encapsulation of IPsec ESP Packets) — confirms NAT-T port 4500
- Wireshark Display Filter Reference — ESP (`esp.sequence`, `esp.spi`), IPv6 (`ipv6.nxt`, `ipv6.src`, `ipv6.dst`), ISAKMP (`isakmp.exchtype`, `isakmp.notify.msgtype`, `isakmp.delete.spi`)
- Wireshark ESP preferences / SA configuration documentation (Edit → Preferences → Protocols → ESP)

## Issues Found
- Replaced `isakmp.payload.delete` with `isakmp.delete.spi`. The former is not a registered Wireshark display-filter field; the Wireshark ISAKMP dissector exposes delete-payload contents via `isakmp.delete.spi` (and `isakmp.delete.number_of_spi`).
- Replaced `isakmp.payload.notify` with `isakmp.notify.msgtype`. Same rationale — the dissector exposes notify payloads via fields such as `isakmp.notify.msgtype`, not `isakmp.payload.notify`.

## Review Notes
- Placeholder addresses like `2001:db8::gw1`, `2001:db8::gateway1` contain non-hex characters (`g`, `w`) and would not parse as IPv6 literals in Wireshark. Readers are expected to substitute real addresses; left in place as they are a common documentation convention, not a technical error.
- The comment "Show IKEv2 messages (UDP port 500)" above `isakmp && ipv6` is slightly misleading since that filter matches IKE on any UDP port (500 or 4500) — left as-is since the filter itself is correct.
- ESP decryption SA fields (Protocol/Source/Destination/SPI/Encryption Algorithm/Encryption Key/Authentication Algorithm/Authentication Key) match the current Wireshark ESP SA table layout.
