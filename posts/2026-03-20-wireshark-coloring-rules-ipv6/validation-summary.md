# Validation Summary: How to Use Wireshark Coloring Rules for IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Wireshark (packet analyzer)
- IPv6
- ICMPv6 / NDP (Neighbor Discovery Protocol)
- DHCPv6
- Wireshark display filter language
- Wireshark colorfilters configuration file format

## Sources Consulted
- Wireshark User's Guide — Packet Colorization: https://www.wireshark.org/docs/wsug_html_chunked/ChCustColorizationSection.html
- Wireshark User's Guide — Configuration Files: https://www.wireshark.org/docs/wsug_html_chunked/ChAppFilesConfigurationSection.html
- Wireshark Wiki — ColoringRules: https://wiki.wireshark.org/ColoringRules
- Wireshark source `epan/color_filters.c` (parser uses `[%hu,%hu,%hu][%hu,%hu,%hu]` format): https://github.com/wireshark/wireshark/blob/master/epan/color_filters.c
- Wireshark Display Filter Reference (`ipv6.fraghdr`): https://www.wireshark.org/docs/dfref/i/ipv6.fraghdr.html
- Wireshark Display Filter Reference (`dhcpv6`): https://www.wireshark.org/docs/dfref/d/dhcpv6.html
- RFC 4443 — ICMPv6 Specification: https://datatracker.ietf.org/doc/html/rfc4443
- RFC 4291 — IPv6 Addressing Architecture (link-local `fe80::/10`, global unicast `2000::/3`): https://datatracker.ietf.org/doc/html/rfc4291

## Issues Found

1. **Incorrect keyboard shortcut for Coloring Rules dialog.** The post claimed `Ctrl+Shift+O` opens View → Coloring Rules. Wireshark's Coloring Rules dialog has no default keyboard shortcut; `Ctrl+Shift+O` is assigned to "Show Packet Bytes..." under the Analyze menu. Removed the incorrect parenthetical shortcut.

2. **Incorrect keyboard shortcut for Reset Colorization.** The post claimed `Ctrl+Shift+``. The correct default shortcut per the Wireshark User's Guide is `Ctrl+Space`. Updated accordingly.

3. **Incorrect colorfilters file format documentation.** The "format" example showed `@[65535,65535,0]@[0,0,0]` with an `@` between the background and foreground color brackets. The actual parser in `color_filters.c` expects `[bg_r,bg_g,bg_b][fg_r,fg_g,fg_b]` with no separator between the two bracketed triples. Fixed the example.

4. **Malformed heredoc colorfilters block.** The bash heredoc that appended rules to `~/.config/wireshark/colorfilters` contained broken syntax: doubled `@@` separators, hex-style comma values instead of 16-bit decimals, and a mangled filter ending `::::ffff,ffff,0000` where the `::` unspecified-address literal ran into the color field. As written, none of the lines would parse and Wireshark would reject the file. Rewrote all five entries in the correct `@name@filter@[bg][fg]` format with proper 16-bit decimal RGB values (e.g., Yellow `[65535,65535,0]`, Light Blue `[41120,50372,65535]`, Orange `[65535,52428,39321]`, Purple `[52428,26214,65535]`, Red `[65535,0,0]`, Black `[0,0,0]`, White `[65535,65535,65535]`).

## Review Notes

- Display filters verified: `icmpv6.type == 135`, `icmpv6.type == 134`, `dhcpv6`, `ipv6.fraghdr`, `icmpv6.type == 1..4`, `ipv6.src == fe80::/10`, `ipv6.src == 2000::/3` — all valid per Wireshark's Display Filter Reference.
- ICMPv6 error types 1 (Destination Unreachable), 2 (Packet Too Big), 3 (Time Exceeded), 4 (Parameter Problem) confirmed against RFC 4443.
- IPv6 prefixes `fe80::/10` (link-local) and `2000::/3` (global unicast) confirmed against RFC 4291.
- The Linux default config path `~/.config/wireshark/colorfilters` is correct (follows XDG Base Directory spec; `$XDG_CONFIG_HOME` defaults to `~/.config`).
- `ipv6.fraghdr` works as an existence filter. An alternative (`ipv6.nxt == 44`) matches on the Next Header value and could be used if a user hits issues with older Wireshark versions, but the post's choice is supported and documented.
