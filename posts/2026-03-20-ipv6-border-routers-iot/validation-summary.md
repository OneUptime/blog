# Validation Summary: How to Configure IPv6 Border Routers for IoT Networks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- IPv6
- IEEE 802.15.4
- 6LoWPAN
- Linux `iwpan` / `ip` networking
- `radvd`
- OpenThread Border Router (OTBR)
- NAT64 / DNS64
- TAYGA
- BIND 9

## Sources Consulted
- Linux kernel IEEE 802.15.4 Developer's Guide: https://www.kernel.org/doc/html/next/networking/ieee802154.html
- Linux-wpan documentation: https://linux-wpan.org/documentation.html
- RFC 4944, Transmission of IPv6 Packets over IEEE 802.15.4 Networks: https://datatracker.ietf.org/doc/rfc4944/
- RFC 6052, IPv6 Addressing of IPv4/IPv6 Translators: https://datatracker.ietf.org/doc/html/rfc6052
- RFC 6147, DNS64: https://datatracker.ietf.org/doc/html/rfc6147
- `radvd.conf(5)` Debian manpage: https://manpages.debian.org/unstable/radvd/radvd.conf.5.en.html
- OpenThread Border Router native install guide: https://openthread.io/guides/border-router/build-native
- TAYGA configuration manpage: https://manpages.debian.org/testing/tayga-core/tayga.conf.5.en.html
- TAYGA upstream README: https://raw.githubusercontent.com/openthread/tayga/master/README
- BIND 9 configuration reference: https://bind9.readthedocs.io/en/v9.21.12/reference.html
- Ubuntu Server BIND 9 documentation: https://ubuntu.com/server/docs/how-to/networking/install-dns/
- `iptables-extensions(8)` manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html

## Issues Found
- The Linux and routing examples used invalid IPv6 literals such as `2001:db8:mesh:1::1` and `2001:db8:infra::border-router`. I replaced them with valid documentation-prefix addresses.
- The `iwpan` example set `short_addr 0xffff`, which is the IEEE 802.15.4 broadcast address and not a valid unicast short address for the border router. I removed that line.
- The OTBR section used an outdated install approach and a manual `otbr-agent` invocation that did not match the current official install workflow. I replaced it with the current `ot-br-posix` bootstrap/setup flow from OpenThread documentation.
- The TAYGA example was incomplete: it omitted the mandatory `tun-device` directive, skipped creating the `data-dir`, and did not configure the host-side TUN addresses that TAYGA requires the administrator to set. I added the missing configuration and interface setup.
- The original NAT64 example paired the Well-Known Prefix `64:ff9b::/96` with an RFC1918 dynamic pool. RFC 6052 and TAYGA both reject that combination for translation. I changed the example to use a Network-Specific Prefix and updated the DNS64 prefix to match it.
- The Debian/Ubuntu BIND path was wrong. For the `bind9` package installed with `apt`, the correct file is `/etc/bind/named.conf.options`, not `/etc/named.conf.options`.

## Review Notes
- The generic Linux `lowpan0`/`radvd` workflow is appropriate for Linux 6LoWPAN examples, but Thread deployments should follow the OTBR path instead of trying to manage Thread border routing with plain `radvd`.
- The NAT44 `MASQUERADE` example is appropriate for a dynamic IPv4 uplink. On a static IPv4 uplink, `SNAT` is typically the better fit.
