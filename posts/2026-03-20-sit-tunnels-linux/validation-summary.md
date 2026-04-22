# Validation Summary: How to Configure SIT (Simple Internet Transition) Tunnels on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux SIT tunnels
- IPv6-in-IPv4 / 6in4
- 6rd
- iproute2 `ip tunnel`, `ip link`, `ip addr`, and `ip route`
- systemd-networkd `.netdev` and `.network` files
- ifupdown `/etc/network/interfaces`
- iptables, ip6tables, and tcpdump

## Sources Consulted
- iproute2 `ip-tunnel(8)` manual: https://man7.org/linux/man-pages/man8/ip-tunnel.8.html
- iproute2 `ip-link(8)` manual: https://man7.org/linux/man-pages/man8/ip-link.8.html
- systemd `systemd.netdev(5)` documentation: https://www.freedesktop.org/software/systemd/man/systemd.netdev.html
- systemd `systemd.network(5)` documentation: https://www.freedesktop.org/software/systemd/man/systemd.network.html
- Debian ifupdown `interfaces(5)` manual: https://manpages.debian.org/experimental/ifupdown/interfaces.5.en.html
- IANA Assigned Internet Protocol Numbers registry: https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml
- RFC 5969, IPv6 Rapid Deployment on IPv4 Infrastructures (6rd): https://www.rfc-editor.org/rfc/rfc5969
- RFC 5214, Intra-Site Automatic Tunnel Addressing Protocol (ISATAP): https://datatracker.ietf.org/doc/html/rfc5214
- iptables/ip6tables manual: https://man7.org/linux/man-pages/man8/iptables.8.html
- Local command help output for `ip tunnel help`, `ip link help sit`, `ip link help ip6tnl`, `ip -6 tunnel help`, `iptables -h`, and `ip6tables -h`.

## Issues Found
- The overview incorrectly stated that SIT is also used for `ip6ip6` IPv6-in-IPv6 mode. Changed it to state that `ip6ip6` uses the `ip6tnl` driver instead.
- The tunnel comparison table listed `ip6tnl` `ipip6` as IPv6 protocol 41 while describing IPv4-in-IPv6. Corrected the row to distinguish IPv4-in-IPv6 and IPv6-in-IPv6 as IPv6 next header 4 or 41.
- The ISATAP example labeled ISATAP as deprecated. Removed that label because RFC 5214 is informational and the Linux/iproute2 mode is still present; it is not formally marked deprecated in the checked sources.
- The `ip6ip6` command used the generic `ip tunnel add` form. Updated it to `ip -6 tunnel add`, matching iproute2's documented IPv6 tunnel syntax.
- The 6rd command used invalid iproute2 parameters (`relay prefix ... mappedlen`). Replaced it with `ip tunnel 6rd dev 6rd 6rd-prefix ... 6rd-relay_prefix ...`; local `ip` rejected the original `relay` parameter.
- The 6rd example routed default IPv6 traffic via the CE WAN IPv4 address encoded as `::203.0.113.10`. Changed it to use a separate BR IPv4 address (`BR_IP`) and route via `::$BR_IP`, matching RFC 5969's default-route-to-BR model.
- The 6rd CE address example assigned `/128` even though the example uses a `/32` 6rd prefix with full 32-bit IPv4 embedding, yielding a `/64` delegated prefix. Updated the address to `/64`.
- The systemd-networkd `.netdev` example did not include `Independent=yes` or an underlying physical `.network` file with `Tunnel=sit1`. Added `Independent=yes` so the standalone snippet creates the tunnel as shown.
- The ifupdown example used the deprecated separate `netmask 64` form for the `v4tunnel` method. Updated it to the current CIDR address form `address 2001:db8::2/64`.

## Review Notes
- The example addresses use documentation-only ranges (`2001:db8::/32`, `198.51.100.0/24`, and `203.0.113.0/24`) and must be replaced with real tunnel broker or ISP parameters before use.
- The iptables/ip6tables commands are syntactically valid, but many modern distributions manage packet filtering through nftables or an iptables-nft compatibility frontend.
- On kernels where SIT support is built in rather than loaded as a module, `lsmod | grep ^sit` may not show a `sit` module even though SIT support is available.
