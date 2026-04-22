# Validation Summary: How to Create a SIT Tunnel for IPv6-over-IPv4

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux SIT tunnels
- IPv6-over-IPv4 / 6in4
- iproute2 `ip tunnel`, `ip addr`, and `ip route`
- iputils `ping`
- systemd-networkd `.netdev` and `.network` configuration
- Hurricane Electric Tunnel Broker

## Sources Consulted
- RFC 4213: Basic Transition Mechanisms for IPv6 Hosts and Routers: https://datatracker.ietf.org/doc/html/rfc4213
- iproute2 `ip-tunnel(8)` manual page: https://man7.org/linux/man-pages/man8/ip-tunnel.8.html
- Linux kernel `/proc/sys/net/` documentation for fallback tunnel devices: https://docs.kernel.org/admin-guide/sysctl/net.html
- systemd `systemd.netdev(5)` manual page: https://manpages.debian.org/bookworm/systemd/systemd.netdev.5.en.html
- systemd `systemd.network(5)` manual page: https://manpages.debian.org/bookworm/systemd/systemd.network.5.en.html
- iputils `ping(8)` manual page: https://manpages.debian.org/bookworm/iputils-ping/ping.8.en.html
- Local command/man-page checks: `ip tunnel help`, `ip -6 route help`, `ping -6 -h`, `man ip-tunnel`, `man systemd.netdev`, `man systemd.network`, and `man ping`

## Issues Found
- The use-case list described tunnel-broker access as "native IPv6 access". A SIT tunnel is encapsulated IPv6-over-IPv4, so I changed this to "IPv6 connectivity".
- The private site-to-site example used `sit0` as the tunnel interface name. Linux commonly creates fallback tunnel devices including `sit0` when the relevant module is loaded, so I changed the example to use a custom `sit-ipv6` interface name.
- The verification commands used `sit0`, which did not match the main `he-ipv6` tunnel example. I updated the verification commands to show `he-ipv6`.
- The connectivity tests used `ping6`. Current iputils documents IPv6 support through `ping -6`, with `ping6` retained only as a compatibility symlink on systems that provide it, so I updated the commands to `ping -6`.
- The systemd-networkd `.netdev` example did not set `Independent=yes` or show a physical interface `.network` file with `Tunnel=he-ipv6`. Because the post only provides the standalone tunnel files, I added `Independent=yes` so networkd can create the tunnel without a separate requester.

## Review Notes
The examples use `2001:db8::/32` documentation addresses, so they are appropriate as placeholders but must be replaced with real tunnel broker-assigned IPv6 addresses before testing. For routing IPv6 prefixes behind either end of a site-to-site tunnel, additional routes and IPv6 forwarding would normally be required.
