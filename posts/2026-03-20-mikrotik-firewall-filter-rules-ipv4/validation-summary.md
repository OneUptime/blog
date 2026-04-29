# Validation Summary: How to Configure Firewall Filter Rules for IPv4 on MikroTik

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MikroTik RouterOS
- IPv4 firewall filter (`/ip firewall filter`)
- Stateful connection tracking (`connection-state`)
- Filter chains: `input`, `forward`, `output`
- Rate limiting via `dst-limit`

## Sources Consulted
- MikroTik Help Center — Firewall Filter: https://help.mikrotik.com/docs/spaces/ROS/pages/328088/Filter
- MikroTik Wiki — Manual:IP/Firewall/Filter (parameter reference for `connection-state`, `connection-rate`, `dst-limit`, `place-before`, `move`)
- MikroTik Wiki — Bruteforce login prevention example (SSH, FTP) using `dst-limit` / staged address lists

## Issues Found
- **Misuse of `connection-rate` for new-connection rate limiting** (Section: "Rate Limit with Connection Rate"): The original example used `connection-rate=3/1m` to throttle new SSH connections. In RouterOS, `connection-rate` matches connections by their current data rate in bps (format `min-max`, e.g. `100k-100M`) — it cannot accept a `count/time` value, and it does not measure the rate of new connections. The correct matcher for new-connection throttling is `dst-limit=count[/time],burst,mode[/expire]`. I rewrote the section to use `dst-limit=3/1m,3,src-address/1m` with `action=accept` to permit up to 3 new SSH connections per minute per source, followed by a second rule that drops the overflow `connection-state=new` traffic. The section heading was changed to "Rate Limit New Connections" to match the intent. This is the standard MikroTik pattern for SSH brute-force rate limiting.

## Review Notes
- All other commands and parameter names were verified correct against RouterOS syntax: `connection-state=established,related,invalid,new`, `src-address`, `out-interface`, `place-before`, `print stats`, `disable <num>`, `move <num> destination=<num>`, `remove <num>`.
- Backslash line continuations are valid in the RouterOS terminal/scripts when commands are pasted in.
- The catch-all-drop pattern at the end of `input` and `forward` chains is best practice and correctly placed after the accept-established / drop-invalid pair.
- For production hardening, readers may want to consider the staged address-list approach (sshd_stage1 → stage2 → blacklist) for longer-duration brute-force blocking, but `dst-limit` is sufficient for the simple case shown.
