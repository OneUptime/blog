# Validation Summary: How to Configure VoIP QoS for IPv6

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- IPv6 (RFC 8200) Traffic Class field and DSCP marking
- DiffServ DSCP classes: EF (RFC 3246), AF41, CS3
- nftables (ip6 table, mangle chains, `ip6 dscp set`)
- Linux tc (HTB qdisc, PFIFO, SFQ, fq_codel, u32 classifier)
- Asterisk rtp.conf and pjsip.conf transport/QoS settings
- FreeSWITCH sofia SIP profile (IPv6 binding)
- tcpdump / tshark packet capture for DSCP verification
- Cisco IOS MQC (class-map, policy-map, service-policy) on an IPv6 interface

## Sources Consulted
- tc-u32(8) man page — https://man7.org/linux/man-pages/man8/tc-u32.8.html (confirms `match ip6 priority` as the IPv6-specific selector for the Traffic Class field)
- nftables wiki — Matching packet headers / Quick reference — https://wiki.nftables.org/ (confirms `meta l4proto` and `ip6 nexthdr` as the IPv6 L4 protocol selectors; `ip6 protocol` does not exist)
- nftables payload expressions — confirms `ip6 dscp set <value>` is valid and accepts symbolic names (`ef`, `cs0-cs7`, `af11-af43`)
- Asterisk PJSIP transport `tos` parameter (ReviewBoard r/3304, community thread) — https://reviewboard.asterisk.org/r/3304/ , https://community.asterisk.org/t/pjsip-dscp-tos-cos/76267
- FreeSWITCH source (signalwire/freeswitch `master`) — `src/mod/endpoints/mod_sofia/sofia.c`, `conf/vanilla/sip_profiles/internal.xml`; FreeSWITCH QoS docs — https://developer.signalwire.com/freeswitch/FreeSWITCH-Explained/Networking/QoS_13173573/ (confirms no native sofia DSCP parameters; OS-level marking is the canonical approach)
- RFC 4594 (DiffServ Service Class Recommendations) — confirms CS3 for call signaling, EF for telephony

## Issues Found

1. **nftables IPv6 L4 protocol match was invalid.** The rules used `ip6 protocol udp`/`ip6 protocol tcp`, which is not a valid nftables expression — there is no `ip6 protocol` selector. Fixed by replacing each `ip6 protocol <proto>` with `meta l4proto <proto>`, which is the recommended form (walks IPv6 extension headers). `ip6 nexthdr` would also have worked but is unsafe when extension headers are present.

2. **tc u32 filter for IPv6 DSCP used the wrong offset/selector.** The script used `match u8 0xb8 0xfc at 1`, but in IPv6 the Traffic Class byte is not byte-aligned — its upper 4 bits sit in byte 0's low nibble and its lower 4 bits sit in byte 1's high nibble. A `u8 ... at 1` match therefore cannot see the full TC byte. Replaced with `match ip6 priority 0xb8 0xfc` (and `0x60 0xfc` for CS3), which is the documented IPv6-aware selector that correctly extracts the TC field. Also rewrote the adjacent comment that incorrectly claimed "DSCP = bits 2-7 of byte 1."

3. **FreeSWITCH sofia profile had fabricated DSCP parameters.** The original XML set `<param name="rtp-tos" value="ef"/>` and `<param name="sip-tos" value="cs3"/>`; these parameter names do not exist in mod_sofia's profile parser (grepping `sofia.c` and the vanilla `internal.xml` for `tos|dscp|qos|cos` returns zero matches), so they would be silently ignored. FreeSWITCH never calls `setsockopt(IP_TOS)` on its sockets, and the canonical recommendation is OS-level marking. Replaced the invalid parameters with a short note pointing the reader back to the nftables rules for DSCP marking, keeping only the legitimate IPv6 bind parameters.

## Review Notes

- The "Hex" column in the DSCP table uses the full Traffic Class byte value (e.g., 0xB8 = DSCP 46 shifted into the upper 6 bits with ECN=0), while the later `tshark` example reports `ip6.dsfield.dscp = 0x2e` (the DSCP-only hex). Both are accurate in their respective contexts (TC byte vs. extracted DSCP field), but the dual convention may confuse readers comparing the table to packet captures.
- RFC 4594 recommends CS3 for call signaling; CS5 was Cisco's older default. The post correctly offers CS3 as the primary choice and mentions CS5 as an alternative.
- For Asterisk PJSIP, the `tos=` parameter on a transport applies to **signaling** only; media DSCP for PJSIP endpoints is controlled per-endpoint via `tos_audio`/`tos_video`. The post's `rtp.conf` `tos=ef` handles chan_sip/generic RTP correctly, but readers using PJSIP-only deployments may want endpoint-level media TOS settings as well.
- The tc HTB example uses PFIFO with `limit 10` for the VoIP class, which is reasonable for ultra-low latency; on high-rate links, `pfifo_fast` or a small `sfq` may handle bursts better without adding measurable delay.
