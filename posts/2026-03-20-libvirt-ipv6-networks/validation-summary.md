# Validation Summary: How to Configure IPv6 in libvirt Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- libvirt virtual network XML
- `virsh` network and domain interface commands
- KVM/QEMU virtual networking
- IPv6, DHCPv6, Router Advertisement, and SLAAC
- `dnsmasq` in libvirt-managed networks

## Sources Consulted
- libvirt Network XML format: https://libvirt.org/formatnetwork.html
- `virsh` manual page: https://www.libvirt.org/manpages/virsh.html
- libvirt network API reference (`virNetworkGetDHCPLeases`): https://www.libvirt.org/html/libvirt-libvirt-network
- libvirt daemon architecture (`virtnetworkd` and `libvirtd`): https://libvirt.org/daemons.html
- libvirt wiki on per-network `dnsmasq` usage: https://wiki.libvirt.org/Libvirtd_and_dnsmasq.html
- RFC 4193, Unique Local IPv6 Unicast Addresses: https://www.rfc-editor.org/rfc/rfc4193
- libvirt issue documenting current DHCPv6-only vs SLAAC-only behavior: https://gitlab.com/libvirt/libvirt/-/issues/799

## Issues Found
- The sample IPv6 addresses `fd00:vm:net1::...` and `2001:db8:vms::...` were not valid IPv6 literals because IPv6 hextets must be hexadecimal. I replaced them with valid ULA and documentation-prefix addresses so the XML examples are syntactically correct.
- The dual-stack NAT example used `<forward mode='nat'>` without `<nat ipv6='yes'>`. Current libvirt forwards IPv6 with plain routing unless IPv6 NAT is explicitly requested, so I added `ipv6='yes'` and corrected the introduction and conclusion to reflect the version requirement.
- The introduction claimed IPv6 support began in libvirt 0.9.4. I corrected the version details to match the documented milestones for IPv6 addresses, DHCPv6, static IPv6 routes, and IPv6 NAT.
- The IPv6-only static DHCP host example used an invalid placeholder DUID (`xx:xx...`). I replaced it with a valid DUID-style identifier so the reservation example is usable.
- The routed-network note incorrectly said a static route had to be added on the host via `virbr-rt`. I corrected this to the documented requirement: the upstream router must know how to route the guest subnet back through the host.
- The `virsh net-update ... ip-dhcp-host` example omitted `--parent-index` even though the network has both IPv4 and IPv6 `<ip>` sections. I added `--parent-index 1` so the DHCPv6 host entry is applied to the IPv6 `<ip>` element.
- The Router Advertisement section described libvirt as using a built-in `radvd` process and referenced incorrect config-file paths. I updated it to current libvirt-managed behavior using the active network XML and the per-network `dnsmasq` process.
- The `virsh attach-interface` example used `--live --persistent`, which does not match the documented syntax. I changed it to `--persistent`, which applies live and config changes for a running persistent guest.
- The `virsh domifaddr` note incorrectly implied the command always requires a guest agent. I changed the example to `--source lease`, which matches the documented DHCP-lease lookup behavior for libvirt-managed networks.
- The troubleshooting section only referenced `libvirtd` logs. I expanded it to include `virtnetworkd`, because current libvirt deployments may use modular daemons instead of the monolithic daemon.
- The Router Advertisement explanation implied SLAAC on the dual-stack DHCPv6 network. I corrected the wording so the post distinguishes DHCPv6-only address assignment from SLAAC-only networks created by omitting `<dhcp>`.

## Review Notes
- IPv6 NAT is only available in libvirt 6.5.0 and later, and only when `<nat ipv6='yes'>` is explicitly set.
- The post now correctly separates two common IPv6 patterns in libvirt: DHCPv6-only networks and SLAAC-only networks. Mixed SLAAC plus stateful DHCPv6 is not directly exposed through the standard network XML shown here.
