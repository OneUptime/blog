# Validation Summary: How to Configure IPv6 Bridge Networking in KVM

## Status
validated

## Post Type
Guide

## Technologies Covered
- KVM/QEMU
- libvirt and virsh
- Linux bridge networking
- IPv6 SLAAC, Router Advertisements, and NDP
- systemd-networkd
- ifupdown `/etc/network/interfaces`

## Sources Consulted
- systemd-networkd documentation: https://www.freedesktop.org/software/systemd/man/254/systemd.network.html
- libvirt domain XML format: https://libvirt.org/formatdomain.html
- libvirt `virsh` manual: https://www.libvirt.org/manpages/virsh.html
- QEMU invocation documentation: https://www.qemu.org/docs/master/system/invocation.html
- Linux kernel bridge documentation: https://www.kernel.org/doc/html/latest/networking/bridge.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Debian `bridge-utils-interfaces(5)` manpage: https://manpages.debian.org/bookworm/bridge-utils/bridge-utils-interfaces.5.en.html
- Debian `interfaces(5)` manpage: https://manpages.debian.org/bookworm/ifupdown/interfaces.5.en.html
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- Local `ip`, `bridge`, `ip-neighbour`, and `ping` help/man pages for CLI syntax verification

## Issues Found
- The `/etc/network/interfaces` example used separate bridge stanzas for IPv4 and IPv6 and also configured the bridge port separately. I rewrote it to keep bridge configuration on `br0` and add IPv6 with `up`/`down` commands, because Debian's `bridge-utils-interfaces(5)` documents that bridge ports should not be configured separately and notes limitations around multiple bridge stanzas.
- The multicast verification comments implied that `bridge mdb show` always proves multicast forwarding and should always list `ff02::` groups. I changed the wording to reflect that the MDB shows learned multicast listeners when multicast snooping has populated the table.
- The TAP inspection example used `bridge link show br0`, which is not the documented form for listing interfaces enslaved to a bridge. I changed it to `ip link show master br0`.
- The guest default-route expectation showed a global next hop for SLAAC and Router Advertisements. I corrected it to a link-local next hop (`fe80::...`) because Router Advertisements use the router's link-local address.
- The NDP proxy section enabled `proxy_ndp` on `br0` while creating the proxy neighbor entry on `eth0`, and its introductory explanation described the use case inaccurately. I corrected it so the example applies to the upstream interface and clarified that NDP proxy is not needed for a true same-L2 bridge.
- The guest connectivity test used `ping6`; I changed it to `ping -6` to match current `iputils` behavior where `ping6` is merged into `ping`.
- The `systemd-networkd` comment implied RA acceptance was part of the required static bridge configuration. I changed the note to mark it as optional.

## Review Notes
- The post is technically sound after correction. The `2001:db8::/64` addresses are documentation examples and must be replaced with real production prefixes.
- The `/etc/network/interfaces` example applies to hosts using ifupdown or bridge-utils. Hosts managed by Netplan or NetworkManager need equivalent bridge configuration in those tools instead.
