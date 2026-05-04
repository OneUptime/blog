# Validation Summary: How to Create Custom Routing Tables on Linux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux kernel routing
- iproute2 (`ip route`, `ip rule`)
- Policy-based routing (RPDB)
- `/etc/iproute2/rt_tables` configuration
- Multi-homing / VPN split tunneling concepts
- Firewall marks (fwmark)

## Sources Consulted
- `ip-route(8)` man page (iproute2)
- `ip-rule(8)` man page (iproute2)
- `/etc/iproute2/rt_tables` default contents
- Linux kernel header `linux/rtnetlink.h` definitions of `RT_TABLE_*` constants (RT_TABLE_UNSPEC=0, RT_TABLE_COMPAT=252, RT_TABLE_DEFAULT=253, RT_TABLE_MAIN=254, RT_TABLE_LOCAL=255, RT_TABLE_MAX=0xFFFFFFFF)
- iproute2 documentation: https://wiki.linuxfoundation.org/networking/iproute2

## Issues Found
- **Inaccurate table-ID range**: The introduction stated routing tables are "numbered 0–252, plus special tables `local`, `main`, `default`". Table 0 is actually reserved as `RT_TABLE_UNSPEC` (visible in the default `/etc/iproute2/rt_tables` shipped with iproute2), so the user-table range in the legacy 8-bit scheme is 1–252. Reserved IDs are 0 (unspec), 253 (default), 254 (main), 255 (local). Modern kernels also support 32-bit table IDs (`RT_TABLE_MAX = 0xFFFFFFFF`). Updated the sentence to read "numbered 1–252, plus reserved tables `local` (255), `main` (254), `default` (253), and `unspec` (0); modern kernels also support 32-bit table IDs".

## Review Notes
- All `ip route add`/`ip route del`/`ip route show` invocations match the syntax described in `ip-route(8)`. `ip route show table all` is valid (the TABLE_ID grammar accepts `all`).
- All `ip rule add` selectors used (`from`, `fwmark`) and the `table` action are valid per `ip-rule(8)`.
- The full multi-homing example is correct: adding the on-link subnet route with an explicit `src` and the default route via the gateway in each per-ISP table, then `ip rule add from <local-ip> table <isp>` for return-path symmetry.
- Worth flagging in a future revision: the post's commands modify only the live runtime state and are not persistent across reboots. A note about persisting via NetworkManager dispatcher scripts, systemd-networkd, `/etc/network/interfaces` `post-up` hooks, or distro-specific config would round out the guide. Not a correctness issue.
- Also worth a future caveat: with two default routes in separate tables and asymmetric reverse-path filtering (`rp_filter`), administrators may need to set `net.ipv4.conf.all.rp_filter=2` (loose mode) to avoid silently dropping return traffic on the secondary ISP. Not addressed in the post but not strictly wrong either.
