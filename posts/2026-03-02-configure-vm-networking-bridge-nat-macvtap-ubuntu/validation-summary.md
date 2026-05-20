# Validation Summary: How to Configure VM Networking (Bridge, NAT, Macvtap) on Ubuntu

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Ubuntu
- KVM/QEMU virtualization
- libvirt virtual networks and domain interfaces
- virsh
- virt-install
- Netplan
- Linux bridge, VLAN, NAT, and macvtap networking

## Sources Consulted
- libvirt Network XML format: https://libvirt.org/formatnetwork.html
- libvirt Domain XML format: https://libvirt.org/formatdomain.html
- libvirt virsh man page: https://www.libvirt.org/manpages/virsh.html
- Ubuntu virt-install man page: https://manpages.ubuntu.com/manpages/jammy/man1/virt-install.1.html
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- libvirt firewall documentation: https://libvirt.org/firewall.html
- Local `netplan generate --help`, `ip link help`, and `bridge -h` output

## Issues Found
- The static DHCP lease XML snippet closed with `</network>` even though the instruction said to add the snippet inside the `<dhcp>` section. Changed the closing tag to `</dhcp>` so the snippet is well-formed for the section being edited.
- The macvtap description said it bypasses the kernel network stack. Macvtap is itself a Linux kernel networking mechanism, so this overstated the behavior. Changed the wording to say it avoids a separate Linux bridge and can reduce bridge overhead.
- The bridge verification and troubleshooting examples used `brctl`, which is from the older bridge-utils tooling and was not available in the review environment. Replaced those checks with current iproute2 commands: `ip link show type bridge`, `bridge link`, and `bridge link show master br0`.

## Review Notes
- The libvirt NAT, isolated network, existing host bridge, and macvtap network XML examples match libvirt's documented network XML patterns.
- The Netplan bridge, static address, route, VLAN, and bridge parameter examples match the current Netplan YAML schema and generated successfully in an offline root during review.
- The shell snippets passed `bash -n`, and the XML snippets parsed successfully after the DHCP closing-tag fix.
