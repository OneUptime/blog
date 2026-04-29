# Validation Summary: How to Configure macvtap Interfaces for KVM Virtualization

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- `macvtap`
- `macvlan`
- KVM
- QEMU
- libvirt
- IPv4 / Layer 2 virtual networking

## Sources Consulted
- Linux `ip-link(8)` manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Linux kernel source for `macvtap`: https://kernel.googlesource.com/pub/scm/linux/kernel/git/torvalds/linux.git/+/master/drivers/net/macvtap.c
- QEMU invocation documentation: https://www.qemu.org/docs/master/system/invocation.html
- QEMU QMP reference for `NetdevTapOptions`: https://www.qemu.org/docs/master/interop/qemu-qmp-ref.html
- libvirt domain XML format: https://libvirt.org/formatdomain.html
- libvirt macvtap host-communication behavior note: https://wiki.libvirt.org/TroubleshootMacvtapHostFail.html
- Local CLI help checked for current syntax: `ip link help macvtap`

## Issues Found
- The post described host-to-VM communication too absolutely. I corrected the wording to reflect the actual limitation documented by libvirt: host communication is blocked on the same lower interface, not in every possible network design.
- The `private`, `vepa`, and `passthru` mode descriptions were oversimplified. I updated them to match the current `ip-link(8)` behavior: `private` blocks direct same-lower-interface peer communication, `vepa` sends same-host traffic out to the external network and back, and `passthru` gives one endpoint exclusive lower-interface access rather than PCI-style physical NIC passthrough.
- The comparison table's VLAN row was imprecise. I changed it to `Mode-dependent` because VLAN behavior depends on the selected macvtap mode.
- The verification example used `cat /sys/class/net/macvtap0/tap*/dev_name`, which does not match the kernel's current macvtap sysfs exposure. I replaced it with verification based on `ifindex`, `/dev/tapX`, and the `tapX` sysfs link created by the macvtap driver.

## Review Notes
The QEMU `-netdev tap,fd=...` example and the libvirt `<interface type='direct'>` example were technically correct and current. The reviewed post remains valid for current Linux/QEMU/libvirt usage, with the usual caveat that host-to-guest communication over the same lower interface is a defined macvtap limitation rather than a bug.
