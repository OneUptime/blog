# Validation Summary: How to Use Wireshark Coloring Rules to Highlight IPv4 Errors

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Wireshark (4.x) coloring rules
- Wireshark display filters (tcp.analysis.*, icmp.type, dhcp.option.dhcp, dns.flags.rcode, http.response.code, arp.duplicate-address-detected, hsrp.state, tcp.flags.*)
- colorfilters file format (personal configuration)
- IPv4 / TCP / ICMP / DHCP / DNS / HTTP / ARP / HSRP packet analysis

## Sources Consulted
- Wireshark User's Guide, Appendix B (Files and Folders): https://www.wireshark.org/docs/wsug_html_chunked/ChConfigurationPluginFolders.html
- Wireshark User's Guide, Appendix B.3 (colorfilters format): https://www.wireshark.org/docs/wsug_html_chunked/ChAppFilesConfigurationSection.html
- Wireshark DHCP display filter reference: https://www.wireshark.org/docs/dfref/d/dhcp.html
- Wireshark source `epan/dissectors/packet-dhcp.c` (DHCP Option 53 / NAK value, bootp protocol alias registration)
- Wireshark source `ui/qt/wireshark_main_window.ui` (menu actions and default shortcuts)
- Wireshark source `resources/share/wireshark/colorfilters` (default coloring rules)
- RFC 2131 (DHCP message types, NAK = 6)
- RFC 792 (ICMP type 3 Destination Unreachable, type 11 Time Exceeded)

## Issues Found

1. **macOS colorfilters path was incorrect.** The post listed `~/Library/Application Support/Wireshark/colorfilters`, but Wireshark treats macOS as a Unix-like system and stores personal configuration under `$XDG_CONFIG_HOME/wireshark` (defaulting to `~/.config/wireshark/`). Changed to `~/.config/wireshark/colorfilters` to match the Wireshark User's Guide and the `get_persconffile_dir()` behavior in `wsutil/filesystem.c`.

2. **Bogus keyboard shortcut `Ctrl+Alt+C`.** Inspection of `ui/qt/wireshark_main_window.ui` shows `actionViewColoringRules` has no `<shortcut>` element, and no default keybinding maps to Coloring Rules. Removed the "(or Ctrl+Alt+C)" line rather than asserting a non-existent default shortcut.

3. **Deprecated `bootp.*` filter prefix.** In Wireshark 3.0+ the BOOTP dissector was renamed to DHCP; `bootp` is kept only as a legacy protocol alias and emits deprecation warnings. Updated both occurrences of `bootp.option.dhcp == 6` to `dhcp.option.dhcp == 6`, which is the canonical field name registered in `packet-dhcp.c` (Option 53, value 6 = DHCPNAK).

## Review Notes

- The built-in default coloring rules listed in Step 2 are simplified approximations of the actual defaults in `resources/share/wireshark/colorfilters`. For example, the real "Bad TCP" rule is `tcp.analysis.flags && !tcp.analysis.window_update && !tcp.analysis.keep_alive && !tcp.analysis.keep_alive_ack`, and the default "HTTP" rule now also matches `http2` and `http3`. The post's shorter forms are acceptable as pedagogical summaries, and each filter expression shown is itself valid Wireshark syntax.
- The colorfilters file example in Step 4 uses the correct `[bg][fg]` ordering (background first, then foreground) per the Wireshark User's Guide; the 16-bit RGB values map correctly to the hex colors described in the custom rules (e.g., `[63488,0,0]` ≈ `#F80000` on white, matching a bright-red background with white foreground).
- The "up to 10 conversations" claim for View → Colorize Conversation is accurate — the Qt main window defines exactly `actionViewColorizeConversation1` through `actionViewColorizeConversation10`.
- Step 4's code fence is marked as ```python even though the content is not Python. This is a cosmetic rendering issue, not a technical inaccuracy, and was left unchanged per the "fix only technical errors" scope.
- DHCP Option 53 values, ICMP type codes (3, 11), TCP analysis flag names, and DNS rcode semantics all match RFC/Wireshark definitions as of Wireshark 4.x.
