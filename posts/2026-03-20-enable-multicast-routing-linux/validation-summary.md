# Validation Summary: How to Enable Multicast Routing on Linux

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Linux IPv4 multicast routing
- Linux kernel multicast forwarding
- `smcroute` / `smcrouted`
- `pimd` / PIM-SM
- IGMP
- `iproute2`
- Python socket multicast examples

## Sources Consulted
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- `smcroute.conf(5)` man page: https://manpages.debian.org/trixie/smcroute/smcroute.conf.5.en.html
- `smcroute(8)` man page: https://manpages.debian.org/bullseye/smcroute/smcroute.8.en.html
- `pimd` project documentation: https://github.com/troglobit/pimd
- `pimd(8)` man page: https://manpages.debian.org/trixie/pimd/pimd.8.en.html
- `ip(7)` Linux man page: https://man7.org/linux/man-pages/man7/ip.7.html
- `ip-mroute(8)` man page: https://manpages.debian.org/trixie/iproute2/ip-mroute.8.en.html
- `ip-maddress(8)` Linux man page: https://man7.org/linux/man-pages/man8/ip-maddress.8.html

## Issues Found
- The kernel section enabled only `net.ipv4.ip_forward` and omitted `mc_forwarding`, which the kernel documentation requires for multicast routing. Updated the commands and persistent sysctl example to enable multicast forwarding globally and per participating interface.
- The kernel availability note said only `CONFIG_IP_MROUTE=y` is valid. Updated it to note that `=m` is also valid when multicast routing is built as a module.
- The `smcroute` runtime examples used incorrect current CLI syntax for route removal. Changed `smcroutectl remove eth0 239.1.1.2` to `smcroutectl rem eth0 239.1.1.2 eth1` and made the route display command explicit with `smcroutectl show routes`.
- The `pimd` example used invalid or incorrect configuration and monitoring commands: `default-phyint-timer hello-interval 30`, `spt-threshold rate 0 packets 0`, and `pimctl show pim ...`. Replaced them with valid `hello-interval 30`, `spt-threshold packets 0 interval 100`, `pimctl show neighbor`, `pimctl show mrt`, and `pimctl show interfaces`.
- The static RP example `rp-address 192.168.1.1` would default to `224.0.0.0/16` and would not cover the post's example `239.1.1.1` group. Updated it to `rp-address 192.168.1.1 224.0.0.0/4`.
- The interface section incorrectly described `ip route add 239.1.0.0/16 dev eth1` as joining a multicast group. Updated the text to explain that it only selects the egress interface for locally generated multicast traffic and does not replace group membership or the multicast routing daemon.
- The monitoring section had inaccurate `/proc` header descriptions and labeled `netstat -g` as routing statistics. Updated the comments to reflect actual Linux output and group-membership semantics.
- The conclusion implied IP forwarding alone was sufficient. Updated it to mention multicast forwarding explicitly.

## Review Notes
- `pimd` enables all multicast-capable interfaces by default; selective interface enablement requires starting the daemon with `-N`, which is now noted in the config example.
- `netstat -g` is still valid for checking multicast memberships, but `ip maddr show` is the more modern `iproute2` alternative.
