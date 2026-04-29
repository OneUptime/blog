# Validation Summary: How to Configure IPv6 in KVM/QEMU

## Status
validated

## Post Type
Guide

## Technologies Covered
- KVM
- QEMU
- libvirt
- IPv6
- Linux bridging and TAP networking
- cloud-init
- Netplan
- ip6tables

## Sources Consulted
- libvirt network XML format: https://libvirt.org/formatnetwork.html
- libvirt domain XML format: https://libvirt.org/formatdomain.html
- `virsh` man page: https://www.libvirt.org/manpages/virsh.html
- QEMU user documentation / man page: https://www.qemu.org/docs/master/system/qemu-manpage.html
- cloud-init NoCloud datasource reference: https://docs.cloud-init.io/en/latest/reference/datasources/nocloud.html
- cloud-init network configuration reference: https://docs.cloud-init.io/en/latest/reference/network-config.html
- cloud-init networking config v2 reference: https://docs.cloud-init.io/en/24.1/reference/network-config-format-v2.html
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- `ip-link(8)` Linux man page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `ip-route(8)` Linux man page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- `iptables(8)` / `ip6tables(8)` Linux man page: https://www.man7.org/linux/man-pages/man8/ip6tables.8.html
- `iptables-extensions(8)` Linux man page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- RFC 4193 (Unique Local IPv6 Unicast Addresses): https://www.rfc-editor.org/rfc/rfc4193
- RFC 6296 (IPv6-to-IPv6 Network Prefix Translation): https://www.rfc-editor.org/rfc/rfc6296.html

## Issues Found
- The introduction described libvirt IPv6 networking as generic NAT via MASQUERADE. I corrected this to match libvirt behavior: `forward mode='nat'` NATs IPv4 by default, while IPv6 is routed unless `<nat ipv6='yes'/>` is explicitly enabled, and noted that IPv6 NAT support requires libvirt 6.5.0 or newer.
- The bridge host example used `ip -6 addr flush dev eth0`, which is unnecessarily destructive because it removes all IPv6 addresses from the interface. I changed it to a targeted `ip -6 addr del ...` example and used `ip -6 route replace` for the default route.
- The `virsh attach-interface` example used mutually exclusive flags (`--current --live`). I corrected both `virsh attach-interface` commands to use valid `--live --config` semantics.
- The libvirt NAT XML used an invalid IPv6 literal (`2001:db8:nat::...`) and an incorrect `<nat><address ...></nat>` structure for IPv6 NAT. I replaced it with valid libvirt IPv6 NAT syntax using `<nat ipv6='yes'>` and a valid example guest IPv6 subnet.
- The guest Netplan example used deprecated `gateway6`. I updated it to the current `routes:` syntax for the default IPv6 route.
- The cloud-init example incorrectly put network configuration in `user-data`. I replaced it with a proper NoCloud `network-config` example and updated the `cloud-localds` command to pass `--network-config=network-config`.
- The firewall section conflated NPTv6 with `MASQUERADE`. I corrected the description to stateful NAT66, switched the example to `conntrack`, and clarified that libvirt-managed NAT networks install their own firewall/NAT rules.

## Review Notes
- Bridged IPv6 works only when the upstream L2 network allows additional MAC addresses from the host port and router advertisements can reach the guest.
- For production NAT/routed lab networks, the example ULA prefix should be replaced with one generated per RFC 4193 for that environment.
