# Validation Summary: How to Set a Default Gateway Using ip route on Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux IPv4 routing
- iproute2 `ip route`
- Netplan
- Debian ifupdown `/etc/network/interfaces`
- NetworkManager `nmcli`
- RHEL/CentOS legacy network-scripts
- `ping` and `traceroute`

## Sources Consulted
- iproute2 `ip-route(8)` manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Local `ip route help` output from the installed iproute2 command.
- Netplan YAML configuration reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan examples for default routes and route metrics: https://netplan.readthedocs.io/en/latest/examples/
- Debian `interfaces(5)` manual page for ifupdown: https://manpages.debian.org/bookworm/ifupdown/interfaces.5.en.html
- NetworkManager `nm-settings-nmcli` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- Red Hat Enterprise Linux 8 default gateway documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_networking/managing-the-default-gateway-setting_configuring-and-managing-networking
- Red Hat Enterprise Linux 7 default gateway documentation for ifcfg `GATEWAY`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/networking_guide/sec-configuring_the_default_gateway
- iputils `ping(8)` manual page: https://manpages.opensuse.org/Tumbleweed/iputils/ping.8.en.html
- `traceroute(8)` manual page: https://man7.org/linux/man-pages/man8/traceroute.8.html

## Issues Found
- The introduction implied that a host without a default gateway can only reach directly attached subnets. Updated it to mention that more specific static routes can also provide reachability.
- The first `ip route add default` example said the route was via `eth0` but omitted `dev eth0`. Added the device to match the explanation and the documented iproute2 example format.
- The replacement section implied any second default route always fails. Clarified that the conflict applies when a default route with the same table and metric already exists, because multiple default routes with different metrics are valid.
- The metric section overstated automatic failover. Updated it to say traffic can shift after the lower-metric interface route is removed, and noted that a gateway failure on an otherwise-up link usually needs separate monitoring.
- The NetworkManager persistence snippet omitted the static-address prerequisite. Updated the heading to clarify it applies to an existing static IPv4 connection.
- The RHEL/CentOS network-scripts heading did not indicate that this is a legacy path. Updated the heading to reflect the legacy network-scripts context.
- The conclusion described metrics as failover. Updated it to say metrics prefer one route over another.

## Review Notes
- `traceroute` was not installed in the local workspace, but the command syntax is valid according to the traceroute manual page.
- NetworkManager's `ipv4.gateway` is only meaningful when addresses are configured on the connection and is ignored if `ipv4.never-default` is set.
