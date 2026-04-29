# Validation Summary: How to Use a Linux Bridge for KVM Virtual Machine Networking

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux bridge
- iproute2
- KVM/QEMU
- libvirt
- `virsh`
- `virt-install`
- Netplan

## Sources Consulted
- libvirt Domain XML format: https://www.libvirt.org/formatdomain.html
- libvirt Network XML format: https://www.libvirt.org/formatnetwork.html
- libvirt `virsh` man page: https://www.libvirt.org/manpages/virsh.html
- `virt-install` upstream man page: https://github.com/virt-manager/virt-manager/blob/main/man/virt-install.rst
- libosinfo Ubuntu 22.04 definition: https://gitlab.com/libosinfo/osinfo-db/-/raw/main/data/os/ubuntu.com/ubuntu-22.04.xml.in
- Netplan single-NIC VM host guide: https://netplan.readthedocs.io/en/stable/single-nic-vm-host/
- Netplan YAML bridge reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Linux kernel bridge documentation: https://docs.kernel.org/networking/bridge.html
- libvirt networking guide: https://wiki.libvirt.org/Networking.html
- Local CLI syntax checks from `iproute2-6.1.0`: `ip link help type bridge`, `ip route help`

## Issues Found
- The introduction said KVM uses `virbr0` NAT by default. I changed this to libvirt, because `virbr0` is part of libvirt's default virtual network rather than KVM itself.
- The prerequisites said only "Physical interface connected to the network". I changed this to a wired Ethernet interface because standard Linux host bridging does not generally work with a client Wi-Fi interface.
- The transient bridge setup used `ip link set br0 type bridge forward_delay 0`. I removed that line because Linux bridge forward delay is an STP timer and the kernel documents valid values as 2-30 seconds.
- The Netplan example also set `forward-delay: 0`. I removed it for the same reason, while keeping `stp: false`.
- The route command used `ip route add default via 192.168.1.1`. I changed it to `ip route replace default via 192.168.1.1 dev br0` so the example replaces an existing default route instead of failing with a duplicate route and explicitly binds the route to the bridge.
- The libvirt network definition step was presented as a required step even though the VM examples attach directly to `br0`. I marked the libvirt network step as optional so the flow matches the direct bridge attachment shown later.
- The `virt-install` example used the deprecated `--ram` flag. I changed it to `--memory`, which is the current upstream syntax.
- The `virsh edit` XML fragment omitted the closing `</interface>` tags. I added them so the example fragment is complete.
- The verification section implied `virsh console myvm` is always available. I clarified that this works when the guest has a serial console configured.

## Review Notes
- The temporary `ip addr flush dev eth0` workflow can interrupt a remote SSH session while the host IP is moved to `br0`; it is safest from a local console or other out-of-band access.
- Netplan's official single-NIC VM host guide notes that defining a libvirt bridge network is optional and mainly helps with VM management convenience.
- Some environments need bridge netfilter settings adjusted for bridged guest traffic if firewall rules interfere; both Netplan and libvirt documentation mention this as a possible follow-up.
