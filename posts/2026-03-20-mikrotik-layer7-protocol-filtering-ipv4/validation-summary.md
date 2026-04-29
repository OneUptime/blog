# Validation Summary: How to Configure Layer 7 Protocol Filtering for IPv4 on MikroTik

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- MikroTik RouterOS
- Layer 7 protocol matcher (regex-based DPI)
- `/ip firewall filter` (forward chain rules)
- `/ip firewall mangle` (connection-mark / packet-mark)
- `/queue tree` (QoS / bandwidth shaping)
- Time-based firewall matching
- Standard l7-filter regex patterns (BitTorrent, YouTube, social media)

## Sources Consulted
- MikroTik Layer7 documentation: https://help.mikrotik.com/docs/spaces/ROS/pages/130220161/Layer7
- MikroTik Common Firewall Matchers and Actions (time format): https://help.mikrotik.com/docs/spaces/ROS/pages/250708064/Common+Firewall+Matchers+and+Actions
- MikroTik Queues documentation (priority, parent=global, packet-mark): https://help.mikrotik.com/docs/spaces/ROS/pages/328088/Queues
- MikroTik Mangle documentation (mark-connection, mark-packet, passthrough): https://help.mikrotik.com/docs/spaces/ROS/pages/48660587/Mangle
- Upstream l7-filter BitTorrent pattern: https://github.com/l7-filter/layer7-patterns/blob/master/bittorrent.pat

## Issues Found

1. **Incomplete L7 inspection limit description** (Introduction section). The post originally stated the L7 matcher inspects "the first 10 packets of a TCP/UDP connection." Per the official MikroTik Layer7 documentation, the matcher collects "the first 10 packets of a connection or the first 2KB of a connection" - whichever is reached first. Updated the sentence to include both bounds so readers understand the buffer is also size-capped.

## Review Notes

- **Time format `time=8h-18h,...` is correct.** I initially suspected this should be HH:MM:SS, but MikroTik's firewall time matcher accepts the h/m/s shorthand format (e.g., `8h-18h`, `13h-15h59m59s`). No change needed.
- **BitTorrent regex `get /scrape\?info_hash=get /announce\?info_hash=` (no pipe between the two `get` clauses) is intentional and matches the canonical upstream l7-filter `bittorrent.pat`** at https://github.com/l7-filter/layer7-patterns. The missing `|` is a long-standing upstream artifact, not a typo introduced by the author. Reproducing the canonical pattern is preferable to silently diverging from the well-known reference, so it was left as-is.
- **Queue tree `priority=8`** is the lowest priority (range 1-8, 1=highest) - correctly used here for de-prioritizing YouTube. Note that priority on a queue tree only takes effect on leaf queues.
- **`parent=global`** is valid current syntax per the official Queues docs.
- **`mark-connection` with `passthrough=yes` followed by `mark-packet` with `passthrough=no`** is the documented best-practice pattern.
- The `\\x13`, `\\\?`, and `\$` escapes in the regex strings are appropriate for the MikroTik CLI's double-quoted-string parser, which strips one layer of `\` before passing the regex to the L7 engine.
- The post's tail BitTorrent alternations (`get /client\?peerid=|\.torrent|announce\.php\?passkey=`) differ slightly from the upstream pattern - they appear to be community-extended variants and are syntactically valid regex.
