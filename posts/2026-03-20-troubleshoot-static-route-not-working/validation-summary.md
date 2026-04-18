# Validation Summary: How to Troubleshoot Static Route Not Working on Linux

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Linux networking (iproute2 suite)
- `ip route`, `ip neigh`, `ip rule` commands
- `sysctl` and `/proc/sys/net/ipv4/ip_forward`
- iptables (FORWARD chain, policies)
- traceroute
- IPv4 static routing and policy routing

## Sources Consulted
- iproute2 `ip-route(8)` man page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- iproute2 `ip-neighbour(8)` man page: https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
- iproute2 `ip-rule(8)` man page: https://man7.org/linux/man-pages/man8/ip-rule.8.html
- `iptables(8)` man page: https://man7.org/linux/man-pages/man8/iptables.8.html
- `traceroute(8)` man page: https://man7.org/linux/man-pages/man8/traceroute.8.html
- Linux kernel documentation: `Documentation/networking/ip-sysctl.rst` (net.ipv4.ip_forward)
- `sysctl(8)` man page

## Issues Found
No technical issues found.

## Review Notes
- All `ip` subcommands (`route show`, `route add`, `route get`, `neigh show`, `rule show`, `route show table ...`) use correct iproute2 syntax.
- The `ip route get <dst> from <src>` form is valid and useful for policy-routing diagnostics as described.
- The example output `192.168.2.10 via 10.0.0.1 dev eth0 src 10.0.0.5` is a plausible simplified rendering; modern kernels may additionally include `uid` and `cache` tokens, but the shown form is a correct subset.
- The claim that a gateway must be in a directly connected subnet is accurate for the common case; the `onlink` flag on `ip route add` is an advanced exception that is out of scope here.
- iptables commands and flags (`-L FORWARD -n -v --line-numbers`, `-P FORWARD ACCEPT`) are correct. On systems using nftables as the backend, `iptables-legacy` vs `iptables-nft` could yield differences, but the invocation itself remains valid.
- `sysctl -w net.ipv4.ip_forward=1` correctly enables forwarding at runtime; readers should note this is not persistent across reboots without editing `/etc/sysctl.conf` or `/etc/sysctl.d/*.conf` — minor future enhancement but not an error.
