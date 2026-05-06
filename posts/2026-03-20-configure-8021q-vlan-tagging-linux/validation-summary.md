# Validation Summary: How to Configure 802.1Q VLAN Tagging on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- IEEE 802.1Q VLAN tagging
- IEEE 802.1ad encapsulation / QinQ context
- `iproute2`
- `tcpdump`
- `ethtool`
- `systemd` `modules-load.d`

## Sources Consulted
- `ip-link(8)` local man page
- `tcpdump(1)` local man page
- `pcap-filter(7)` local man page
- `ethtool(8)` local man page
- `modules-load.d(5)` local man page
- `systemd-modules-load.service(8)` local man page
- Linux kernel documentation, "Network Devices, the Kernel, and You!": https://www.kernel.org/doc/html/v6.11/networking/netdevices.html
- Linux kernel documentation, Intel `ice` driver, "IEEE 802.1ad (QinQ) Support": https://www.kernel.org/doc/html/v5.14/networking/device_drivers/ethernet/intel/ice.html
- systemd `modules-load.d` documentation: https://www.freedesktop.org/software/systemd/man/latest/modules-load.d.html

## Issues Found
- The post described Linux VLAN support solely as the `8021q` kernel module. I corrected this to the `8021q` driver, commonly exposed as a kernel module, so the explanation is accurate for systems where support is modular.
- The module persistence step was written as a generic Linux instruction. I qualified it so `/etc/modules-load.d/8021q.conf` is clearly presented as a systemd-based static-loading method, which matches the documented behavior of `modules-load.d`.
- The `tcpdump` section said capturing on the parent interface shows raw 802.1Q tags. I corrected this because `ip-link(8)` documents that VLAN header reordering and VLAN offload can hide the tag from packet capture even when tagging is working correctly.
- The 802.1ad section implied that a single `802.1ad` VLAN device is equivalent to QinQ. I corrected the wording so it accurately describes 802.1ad as an encapsulation choice commonly used for the outer service tag in QinQ deployments.
- The 802.1ad examples used `proto`; I updated them to the currently documented `protocol` keyword from `ip-link(8)`.
- The troubleshooting table said fragmentation is fixed by reducing MTU to `1496`. I corrected this because kernel networking documentation states Ethernet devices should accommodate the extra 4-byte VLAN header with a standard `1500` MTU; lowering MTU is only needed when the path cannot carry tagged frames.
- The troubleshooting row about "Frames not tagged" blamed the `8021q` module. I replaced it with the more accurate packet-capture caveat that VLAN offload can hide tags from `tcpdump`.

## Review Notes
- The command examples are otherwise current and valid for `iproute2`-managed VLAN interfaces.
- `modprobe 8021q` is still a valid manual step, but many systems auto-load the support when a VLAN interface is created.
