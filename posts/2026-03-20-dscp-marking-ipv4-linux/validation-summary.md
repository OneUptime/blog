# Validation Summary: How to Configure DSCP Marking for IPv4 Packets on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- IPv4 DSCP / DiffServ
- `iptables`
- `nftables`
- `tc` / `u32` filters
- `tcpdump`
- Wireshark

## Sources Consulted
- RFC 2474, "Definition of the Differentiated Services Field (DS Field) in the IPv4 and IPv6 Headers" - https://www.rfc-editor.org/rfc/rfc2474.html
- RFC 3246, "An Expedited Forwarding PHB (Per-Hop Behavior)" - https://www.rfc-editor.org/rfc/rfc3246.html
- RFC 4594, "Configuration Guidelines for DiffServ Service Classes" - https://www.rfc-editor.org/rfc/rfc4594.html
- `iptables-extensions(8)` man page - https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- nftables man page - https://netfilter.org/projects/nftables/manpage.html
- `tc-u32(8)` man page - https://man7.org/linux/man-pages/man8/tc-u32.8.html
- `tcpdump(8)` man page - https://man7.org/linux/man-pages/man8/tcpdump.8.html

## Issues Found
- The post described DSCP as being in the IPv4 ToS byte without clarifying current terminology. I changed this to "IPv4 DS field (historically the ToS byte)" to match RFC 2474.
- The DSCP reference table listed `AF31` for call signaling. I corrected this to `CS5`, which RFC 4594 recommends for signaling traffic such as SIP/H.323.
- The DSCP reference table described `AF11` as "High-priority data". I corrected this to "High-throughput data" to match DiffServ service-class guidance.
- The `iptables` and `nftables` examples marked SIP signaling on UDP port `5060` with `EF`. I changed those examples to `CS5`, because `EF` is for low-loss, low-latency bearer traffic like voice media, while signaling traffic belongs in `CS5`.
- The SSH example used `CS6`, which is reserved for network-control traffic such as routing protocols. I changed it to `AF21`, which is a more appropriate low-latency data class for interactive client/server traffic.
- The raw-value and verification examples were updated from `46` / `0xb8` to `40` / `0xa0` for the SIP-signaling example so the commands and expected packet captures remain internally consistent.
- The `tc` explanation referred to the full byte as the ToS byte. I updated it to "IPv4 DS field byte" for precision while keeping the command unchanged.

## Review Notes
- `iptables` DSCP target syntax in the post is still current on modern Linux systems, including systems where `iptables` uses the nf_tables backend.
- The `nftables` example correctly uses a `route` chain on the `output` hook when modifying packet header fields before routing decisions.
- DSCP policies are administrative choices. The corrected examples now align with common DiffServ guidance, but some networks may still rewrite or ignore DSCP markings in transit.
