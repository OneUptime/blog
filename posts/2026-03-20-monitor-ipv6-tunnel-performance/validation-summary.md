# Validation Summary: How to Monitor IPv6 Tunnel Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 tunnels (6in4, GRE, IPIP, SIT)
- Linux `ip` (iproute2) command
- `ping6` (iputils)
- `iperf3`
- `vnstat`
- Prometheus Node Exporter / PromQL
- OneUptime ICMP monitor
- Mermaid diagrams

## Sources Consulted
- iproute2 `ip-link(8)` man page (verified `-s` and `-s -s` flags)
- iputils `ping(8)` / `ping6` man page (verified `-i`, `-c`, `-f` flags)
- iperf3 documentation: https://iperf.fr/iperf-doc.php (verified `-s`, `-6`, `-c`, `-t`, `-P`, `-R` flags)
- vnstat manual: https://humdi.net/vnstat/man/vnstat.html (verified `--add`, `-i`, `-h`, `-d`, `-m` flags)
- Prometheus Node Exporter source/docs (verified `node_network_receive_bytes_total`, `node_network_receive_errs_total`, `node_network_receive_drop_total` metric names)
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (`2001:db8::/32`)

## Issues Found
1. **Invalid IPv6 address `2001:db8:tunnel::2`** — "tunnel" contains characters (`t`, `u`, `n`, `l`) that are not valid hexadecimal digits, so this is not a parseable IPv6 address. Replaced all occurrences (in `ping6`, `iperf3`, and the OneUptime instructions) with `2001:db8:1::2`, which is within the RFC 3849 documentation prefix.
2. **Misleading vnstat command** — `vnstat -i sit1` only queries stats for the interface; it does not initialize/add it to vnstat's database. Updated to `vnstat --add -i sit1` with a corrected comment ("Add the tunnel interface to vnstat's database"), which matches the official vnstat manual.
3. **Mermaid diagram typo** — interface label was `sits1`, while the rest of the post uses `sit1`. Fixed for consistency.

## Review Notes
- The `vnstat --add` flag requires vnstat 2.6+. On older systems the equivalent is `vnstat -u -i <iface>`. The post does not call out a version, but for current Linux distributions `--add` is correct.
- On modern iputils (>= s20221126), `ping6` is provided as a symlink to `ping` and accepts the same flags; the commands shown remain valid on both old and new systems.
- `iperf3 -s -6` makes the server bind to IPv6 only. If you want the server to accept both IPv4 and IPv6 clients on a dual-stack host, omit `-6` on the server side. The post's intent (force IPv6 path through the tunnel) is fine as-is.
- The Node Exporter metric names shown are the current canonical names; older `node_exporter` (< 0.16) used different names without the `_total` suffix, but those versions are long EOL.
