# Validation Summary: How to Add a Static Route Through a Specific Interface on Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux routing
- iproute2 `ip route`
- iproute2 `ip rule`
- systemd-networkd
- Debian ifupdown `/etc/network/interfaces`
- NetworkManager `nmcli`
- traceroute

## Sources Consulted
- ip-route(8), Linux manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- ip-rule(8), Linux manual page: https://man7.org/linux/man-pages/man8/ip-rule.8.html
- systemd.network(5), systemd manual: https://www.freedesktop.org/software/systemd/man/257/systemd.network.html
- nm-settings-nmcli, NetworkManager Reference Manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- nmcli, NetworkManager Reference Manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- interfaces(5), Debian ifupdown man page: https://manpages.debian.org/testing/ifupdown/interfaces.5.en.html
- traceroute(1), Debian man page: https://manpages.debian.org/buster/traceroute/traceroute.1.en.html

## Issues Found
- The opening routing explanation implied route selection is based on next-hop gateway. Updated it to describe routing policy, routing tables, longest matching destination prefix, and metrics more accurately.
- The first `ip route add` example routed `10.10.0.0/24` via a gateway inside the same `/24`, which can conflict with the connected route for that subnet. Changed the destination to `10.20.0.0/24` and updated the verification examples to match.
- The policy routing example added a route to table `200` but did not add a rule that would make the table participate in route selection. Removed an unnecessary main-table connected route command and added an explicit `pref` `ip rule` for traffic sourced from `10.0.0.6/32`.
- The VPN default route example did not mention preserving a route to the VPN server outside the tunnel. Added that caveat and used the `default` prefix form.
- The Debian ifupdown `down` command deleted only by destination prefix. Updated it to delete the same route key that was added, including gateway and interface.
- The tunnel-interface takeaway treated tunnel interfaces too broadly as point-to-point. Narrowed the wording to point-to-point tunnel interfaces and clarified that the tunnel is the directly connected next hop.

## Review Notes
The remaining examples are syntactically valid for current iproute2, systemd-networkd, ifupdown, and NetworkManager documentation. The NetworkManager example assumes the connection profile is named `eth1`; on systems where the profile has a different name, that profile name should be used instead.
