# Validation Summary: Essential iproute2 Commands on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- iproute2 (`ip` command suite)
- `ss` (socket statistics)
- `tc` (traffic control) including netem and HTB/TBF
- Linux networking: addresses, links, routing, policy routing, neighbor/ARP table, tunnels (GRE/IPIP), VLAN, bridge, bond, VXLAN, macvlan, veth
- Network namespaces (`ip netns`)
- Netplan persistent configuration

## Sources Consulted
- iproute2 man pages: ip(8), ip-address(8), ip-link(8), ip-route(8), ip-rule(8), ip-neighbour(8), ip-tunnel(8), ip-netns(8) — https://man7.org/linux/man-pages/man8/ip.8.html
- ss(8) man page — https://man7.org/linux/man-pages/man8/ss.8.html
- tc(8), tc-tbf(8), tc-htb(8), tc-netem(8) man pages — https://man7.org/linux/man-pages/man8/tc.8.html
- Linux kernel bridge netlink behavior (br_set_forward_delay — value interpreted in USER_HZ clock ticks)
- Netplan documentation — https://netplan.io/reference

## Issues Found
No technical issues found.

All commands were verified for correct syntax, flags, and options:
- `ip addr`/`ip link`/`ip route`/`ip neigh`/`ip rule`/`ip tunnel`/`ip netns` examples are syntactically correct, including short forms (`-4`, `-6`, `-br`, `-c`, `-s`, `-d`) and address lifetimes (`valid_lft`/`preferred_lft`).
- Virtual interface creation (VLAN, bridge, bond `802.3ad`, VXLAN with `dstport 4789`, macvlan, veth) matches current iproute2 syntax.
- `forward_delay 400` is valid — the kernel interprets bridge time parameters in clock ticks (USER_HZ=100), giving 4 seconds, within the valid range.
- `ss` filtering and state names (e.g., `syn-recv`, `time-wait`) are correct.
- `tc` TBF, HTB, and netem (delay/jitter/loss/corrupt/reorder) examples are correct.
- The legacy-vs-modern mapping table is accurate.

## Review Notes
- `ip link set eth0 name lan0` (rename) requires the interface to be administratively down first; the kernel rejects renaming an UP interface. The command syntax is correct, but in practice a `ip link set eth0 down` step is needed before renaming, similar to the MAC-change example which already shows this. Not a syntax error, so left unchanged.
- `ip route show cache` is valid syntax but generally returns no entries on modern kernels, since the IPv4 route cache was removed in kernel 3.6. Harmless and still useful for IPv6 / PMTU cache inspection.
- The post correctly notes `ip` changes are non-persistent and points to Netplan (the Ubuntu default) for persistence; the `rc.local` approach is legacy but still functional where enabled.
