# Validation Summary: How to Understand Router Solicitation (RS) Messages

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ICMPv6 Router Solicitation (RFC 4861, Type 133)
- IPv6 Neighbor Discovery Protocol (NDP)
- SLAAC (Stateless Address Autoconfiguration)
- Modified EUI-64 link-local address derivation (RFC 4291)
- tcpdump (BPF filtering on IPv6 ICMPv6 type byte)
- rdisc6 / ndisc6 utility
- Linux `ip link` interface management
- Python `struct` module for binary message construction
- RA Guard (RFC 6105) and NDP security considerations

## Sources Consulted
- RFC 4861 — Neighbor Discovery for IP version 6 (IPv6), §4.1, §6.1.1, §6.2.1, §6.3.7, §10
- RFC 4861 §4.6.1 — Source/Target Link-Layer Address option format
- RFC 4291 — IP Version 6 Addressing Architecture, Appendix A (Modified EUI-64)
- RFC 6105 — IPv6 Router Advertisement Guard
- tcpdump pcap-filter(7) for IPv6 BPF offset semantics (`ip6[40]` is the first byte of the ICMPv6 header)
- ndisc6 / rdisc6 manual

## Issues Found
1. **Incorrect EUI-64 link-local in tcpdump example.** The output showed `fe80::a11:bbff:fecc:ddee` for MAC `a0:11:bb:cc:dd:ee`. Per RFC 4291 Appendix A, flipping the U/L bit on `0xa0` (binary `1010 0000`) produces `0xa2` (binary `1010 0010`), so the correct address is `fe80::a211:bbff:fecc:ddee`. Updated.
2. **Typo in RS process step 6.** The step read "If no RS received after all attempts: wait for periodic RA" — but the host sends RSs and waits for RAs. Changed "no RS received" to "no RA received".
3. **Inaccurate periodic RA wait in conclusion.** The post stated hosts could wait "up to 200 seconds" for a periodic RA. RFC 4861 §6.2.1 sets the default `MaxRtrAdvInterval` to 600 seconds (200s is closer to the default `MinRtrAdvInterval`). Updated to "up to 600 seconds (the default MaxRtrAdvInterval per RFC 4861)".

## Review Notes
- The Python `struct.pack("!BBHI", 133, 0, 0, 0)` correctly produces the 8-byte RS header (Type 1 + Code 1 + Checksum 2 + Reserved 4).
- The Source Link-Layer Address option encoding (`!BB` + 6-byte MAC = 8 bytes, length field = 1 in 8-octet units) is correct for Ethernet per RFC 4861 §4.6.1.
- The tcpdump filter `icmp6 and ip6[40] == 133` is valid: offset 40 is the byte immediately after the fixed 40-byte IPv6 header (assuming no extension headers), which is the ICMPv6 Type byte.
- `rdisc6` is the correct utility name from the `ndisc6` package.
- All NDP timing parameters (`MAX_RTR_SOLICITATIONS`, `RTR_SOLICITATION_INTERVAL`, `MAX_RTR_SOLICITATION_DELAY`) match RFC 4861 §10 defaults.
- The Hop Limit = 255 security check, ff02::2 destination, and Reserved-field structure all match RFC 4861 §4.1 / §6.1.1.
