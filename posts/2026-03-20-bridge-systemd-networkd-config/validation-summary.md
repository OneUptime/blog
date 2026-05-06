# Validation Summary: How to Configure a Network Bridge with systemd-networkd

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux bridging
- `systemd-networkd`
- `systemd.netdev` and `systemd.network` configuration
- `networkctl`
- `bridge` from iproute2
- libvirt/KVM virtual networking

## Sources Consulted
- systemd `systemd.network` manual: https://www.freedesktop.org/software/systemd/man/257/systemd.network.html
- systemd `systemd.netdev` manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- systemd `systemd-networkd.service` manual: https://www.freedesktop.org/software/systemd/man/systemd-networkd.service.html
- Linux kernel Ethernet bridge documentation: https://kernel.org/doc/html/next/networking/bridge.html
- libvirt network XML format: https://libvirt.org/formatnetwork.html
- libvirt virsh command reference: https://download.libvirt.org/virshcmdref/html-single/
- Local CLI help for `networkctl` and `bridge`

## Issues Found
- The summary said to enable STP "when connecting to managed switches." That is too broad and slightly misleading: STP is used to prevent Layer 2 loops, not simply because a switch is managed. I changed the sentence to recommend STP when there is a possibility of Layer 2 loops.
- No other technical issues found.

## Review Notes
- The `systemd-networkd` bridge configuration snippets are syntactically valid and match upstream `systemd.network` and `systemd.netdev` documentation.
- The `virsh` commands were validated against upstream libvirt documentation; `virsh` was not installed in the review environment, so local CLI help was not available for those commands.
- `DNS=` in a `.network` file is valid, but host name resolution also depends on how the system's resolver integration is set up, commonly with `systemd-resolved`.
