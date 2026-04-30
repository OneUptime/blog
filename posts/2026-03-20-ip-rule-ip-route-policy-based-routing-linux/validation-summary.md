# Validation Summary: How to Use ip rule and ip route for Policy-Based Routing on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux policy-based routing (`ip rule`, RPDB)
- Linux routing tables (`ip route`, `/etc/iproute2/rt_tables`)
- `iptables` packet marking (`MARK`)
- NetworkManager dispatcher scripts
- IPv4 routing

## Sources Consulted
- `ip-rule(8)` Linux manual page — https://man7.org/linux/man-pages/man8/ip-rule.8.html
- `ip-route(8)` Linux manual page — https://man7.org/linux/man-pages/man8/ip-route.8.html
- `iptables-extensions(8)` Linux manual page — https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- NetworkManager dispatcher reference — https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager-dispatcher.html
- Local command help used for syntax verification: `ip rule help`, `ip route help`, `iptables -j MARK -h`, and `man NetworkManager-dispatcher`

## Issues Found
1. The `iif` example described the rule as a way for traffic arriving on `eth1` to "reply via" that gateway. Per `ip-rule(8)`, `iif` matches the packet's incoming interface and is primarily relevant to forwarded traffic, not generic locally generated reply traffic. I changed the scenario text and inline comment to describe forwarded traffic received on `eth1`.
2. The cleanup section said `ip rule flush` leaves the default three rules in place. That was incorrect. I changed the comment to state that it flushes all rules, including the default three, which matches the following re-add commands.
3. The verification section said `ip rule show` checks which table a specific packet would use. That command only lists the current rules. I changed the comment so it accurately describes inspecting rule order and priorities, while leaving `ip route get` as the actual route-selection check.
4. The NetworkManager dispatcher example triggered on `eth0 up` even though the route being installed depends on the VPN interface `tun0`. Based on the dispatcher action model, I changed the example to trigger on `tun0` with `vpn-up`, delete any existing matching rule before re-adding it, and use `ip route replace` for the VPN default route.
5. The `rt_tables` comment implied that appending `100 vpn` creates the routing table. More precisely, it registers the name `vpn` for table ID `100`, so I corrected that comment.
6. The selector table said `tos` matches the "TOS/DSCP field". The selector matches the TOS/DS field value, so I corrected that wording.

## Review Notes
- The `iptables` marking example is still valid, but many modern distributions prefer expressing new packet-marking policy with `nftables`.
- Re-running `echo "100 vpn" | sudo tee -a /etc/iproute2/rt_tables` can append duplicate name entries, so in practice that mapping is usually managed once rather than appended repeatedly.
