# Validation Summary: How to View All Routes with ip route show

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Linux `ip` command (iproute2)
- Linux routing table
- Route selectors: `dev`, `via`, `proto`, `type`, `table`, `match`
- Legacy `route` command (net-tools)

## Sources Consulted
- `ip route help` output from iproute2-6.1.0 (confirms SELECTOR: `root`, `match`, `exact`, `table`, `vrf`, `proto`, `type`, `scope`; TYPE: `unicast`, `blackhole`, `unreachable`, etc.; RTPROTO: `kernel`, `boot`, `static`)
- `man 8 ip-route` (iproute2 manual)
- Live testing of `ip route show dev ...`, `ip route show via ...`, `ip -brief route show`, `ip -json route show`
- iproute2 upstream docs: https://github.com/iproute2/iproute2

## Issues Found
- **Duplicate command in "Filter by Destination Network"**: The section listed `ip route show 192.168.1.0/24` twice with different descriptions. The second command claimed to "show routes that include this IP" but used the same exact-prefix-match syntax, which does not do that. Replaced the second command with `ip route show match 192.168.1.0/24`, which is the correct selector for matching routes including broader prefixes (confirmed in `ip route help` SELECTOR list). Updated the first comment to clarify it is an exact prefix match.

## Review Notes
- `ip -brief route show` works on recent iproute2 (confirmed on 6.1.0), though brief formatting for routes is minimal compared to `ip -br link`/`addr`.
- `ip route show via ADDRESS` and `ip route show dev NAME` are not listed in the top-level SELECTOR grammar in `ip route help`, but are valid and supported filter shortcuts in iproute2.
- `0.0.0.0/0` is equivalent to `default` in the kernel routing table — both work as destinations for IPv4 default routes.
- The post is Linux/IPv4-focused; IPv6 routes would require `ip -6 route show` but that is out of scope for this post.
