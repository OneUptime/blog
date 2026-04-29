# Validation Summary: How to Configure IPv6 in VM Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- KVM/QEMU
- libvirt
- Linux bridge networking
- VirtualBox
- VMware Workstation/Fusion
- LXD

## Sources Consulted
- libvirt Network XML format: https://www.libvirt.org/formatnetwork.html
- Oracle VirtualBox User Manual, Chapter 6 Virtual Networking: https://www.virtualbox.org/manual/ch06.html
- Oracle VirtualBox User Manual, Chapter 8 VBoxManage: https://www.virtualbox.org/manual/ch08.html
- Broadcom KB, Understanding networking types in hosted products: https://knowledge.broadcom.com/external/article/309842/understanding-networking-types-in-hosted.html
- Broadcom KB, Modifying the DHCP settings of vmnet1 and vmnet8 in Fusion: https://knowledge.broadcom.com/external/article/311759/modifying-the-dhcp-settings-of-vmnet1-an.html
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- Linux kernel bridge documentation: https://docs.kernel.org/networking/bridge.html
- LXD configuration options: https://documentation.ubuntu.com/lxd/latest/config-options/
- LXD `lxc network set` man page: https://documentation.ubuntu.com/lxd/latest/reference/manpages/lxc/network/set/

## Issues Found
- The libvirt IPv6 `<ip>` element used an invalid `address='fd00:cafe::/64'` form. I changed it to `address='fd00:cafe::1' prefix='64'`, which matches libvirt's documented XML format.
- The libvirt example claimed an IPv6 NAT network but only used `<forward mode='nat'/>`. I added `<nat ipv6='yes'/>`, because libvirt documents IPv6 NAT as opt-in.
- The libvirt section manually added the bridge IPv6 address after defining it in the network XML. I replaced that with a verification command because libvirt manages the bridge address from the XML definition.
- The bridged KVM section used `accept_ra=1` as a generic bridge setting. I changed this to a conditional `accept_ra=2` example for the specific case where the host must accept RAs while forwarding is enabled, which matches kernel behavior.
- The VirtualBox section used an outdated GUI path and undocumented flag forms. I updated the GUI path to `Tools -> Network`, changed the CLI examples to documented `VBoxManage` syntax, and corrected IPv6 enablement to `--ipv6=on`.
- The VirtualBox host-only IPv6 example omitted the documented address-range restriction on Linux, macOS, and Solaris. I added the required `/etc/vbox/networks.conf` step so the non-link-local IPv6 example will work on those hosts.
- The VMware section instructed readers to edit `dhcpd.conf` directly and to build a manual `radvd` setup for `vmnet8`. Broadcom's documentation does not support that workflow and explicitly says not to modify the DHCP config file directly, so I replaced it with supported bridged-mode guidance and Linux-host verification steps.
- The VMware example also used invalid IPv6 literals such as `fd00:vmware::/64`. I removed those invalid addresses along with the unsupported configuration steps.
- The troubleshooting section described Linux bridge `multicast_snooping` incorrectly as `0 = good, 1 = may block NDP`. I corrected it to reflect kernel documentation: snooping is enabled by default, and disabling it is only a diagnostic step.
- The Linux bridge section enabled `proxy_ndp` unconditionally even though proxy NDP is only needed when the host answers NDP on behalf of guests. I changed that to an informational check instead of a blanket enablement.
- The LXD example used an invalid IPv6 address (`fd00:lxd::1/64`) and older argument style. I replaced it with a valid ULA and current `lxc network set ... key=value` syntax.

## Review Notes
- `rdisc6` is useful for troubleshooting but is provided by the `ndisc6` package and might not be installed by default in every guest OS.
- VMware's public documentation is much clearer for bridged, host-only, and NAT network types than for custom IPv6 service configuration on `vmnet8`, so bridged mode remains the safest documented choice when you need guest IPv6 from the upstream network.
