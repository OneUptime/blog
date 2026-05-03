# Validation Summary: How to Debug Routing Issues with ip route get on Linux

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Linux networking (iproute2)
- `ip route` / `ip route get`
- `ip rule` (policy routing)
- Linux routing tables (main, local, default, custom)
- traceroute
- Bash scripting

## Sources Consulted
- `man ip-route` (iproute2 manual page) — synopsis of `ip route get` parameters
- iproute2 source (`ip/iproute.c`, `iproute_get` function) — confirming supported keywords
- Live verification on a Linux host (`ip route get`, `ip rule show`)
- Linux kernel routing documentation (Documentation/networking/policy-routing)

## Issues Found
- **Invalid `table` argument to `ip route get`**: The original "Querying a Specific Table" section showed `ip route get 10.20.0.1 table main`, `ip route get 10.20.0.1 table 100`, and `ip route get 10.20.0.1 table local`. None of these are valid — `ip route get` does not accept a `table` keyword and fails with `Error: inet prefix is expected rather than "table"`. The valid `ip route get` parameters are `from`, `iif`, `oif`, `mark`, `tos`, `vrf`, `uid`, `ipproto`, `sport`, `dport`, plus the flags `fibmatch`, `notify`, `connected`. Fixed by replacing the invalid commands with `ip route show table <name>` (which is the correct way to view a specific table) and added a note that `ip route get` always follows the kernel's policy rules; the `from` argument can be used to trigger a rule that selects a particular table.

## Review Notes
- The output format `8.8.8.8 via 192.168.1.1 dev eth0 src 192.168.1.10 uid 1000` with a trailing `cache` line is accurate for modern iproute2 (the `uid` field appeared in iproute2 4.10+).
- `ip rule show` standard preferences (0 local, 32766 main, 32767 default) are correct.
- The `awk '/via/{print $3}'` extraction of the next-hop is correct given the field layout.
- `ip route get ... iif <iface>` works without `from`; the kernel uses the input interface for FIB lookup (useful with VRFs and reverse-path scenarios).
- `traceroute -n -m 3` flags are valid (`-n` numeric, `-m` max TTL).
- The post is IPv4-only as tagged; IPv6 callers would use `ip -6 route get` but the post does not claim IPv6 support, so this is acceptable scope.
