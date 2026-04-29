# Validation Summary: How to Add IPv6 Static Routes on Linux with ip Command

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux networking
- IPv6
- iproute2 `ip` command
- Debian/Ubuntu `ifupdown`
- `systemd-networkd`
- NetworkManager `nmcli`
- RHEL/CentOS legacy `network-scripts`

## Sources Consulted
- iproute2 `ip(8)` manual: https://man7.org/linux/man-pages/man8/ip.8.html
- iproute2 `ip-route(8)` manual: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Debian `interfaces(5)` manual: https://manpages.debian.org/unstable/ifupdown/interfaces.5.en.html
- `systemd.network` manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- NetworkManager `nm-settings-nmcli` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager `nmcli` manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- Red Hat static route documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_networking/configuring-static-routes_configuring-and-managing-networking
- Red Hat RHEL 9 networking considerations: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_networking_considerations-in-adopting-rhel-9
- RFC 4007, IPv6 Scoped Address Architecture: https://www.rfc-editor.org/rfc/rfc4007

## Issues Found
- The batch example used `ip -6 route batch`, which is not a valid `ip` subcommand. I changed it to `ip -6 -batch -` with `route add ...` lines, which matches the documented batch mode syntax in `ip(8)`.
- The delete example claimed `ip -6 route del 2001:db8:1::/48` would delete all routes for that destination regardless of next hop. I changed the wording to say it deletes a route by destination prefix when the prefix uniquely identifies it, which is consistent with `ip-route(8)`.
- The Debian/Ubuntu `ifupdown` example used a separate `netmask 64` line. Current Debian `interfaces(5)` marks `netmask` for `inet6 static` as deprecated, so I changed the address to CIDR form: `address 2001:db8::2/64`.
- The RHEL/CentOS/Fedora persistence section implied the `route6-*` approach was a general current method across those distributions. I narrowed it to RHEL/CentOS systems using legacy `network-scripts` and added `dev eth0` to the example lines to match Red Hat's documented `ip`-style route format.
- The summary originally recommended `route6-*` files on RHEL-based systems without the legacy `network-scripts` caveat. I updated the summary to reflect that modern systems commonly use NetworkManager, while `route6-*` remains relevant only where legacy scripts are still in use.

## Review Notes
Modern RHEL and Fedora deployments generally use NetworkManager rather than legacy `network-scripts`; RHEL 8 deprecated those scripts and RHEL 9 removed them from the distribution. The post now reflects that version-specific caveat while preserving the legacy example for systems that still use it.
