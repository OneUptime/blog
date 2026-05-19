# Validation Summary: How to Configure 802.1Q VLAN Trunking on Ubuntu

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Ubuntu networking
- 802.1Q VLAN tagging
- Linux 8021q kernel module
- iproute2 `ip` and `bridge` commands
- Netplan YAML configuration
- ifupdown `/etc/network/interfaces`
- Linux bridge VLAN filtering
- KVM/QEMU host networking
- tcpdump troubleshooting

## Sources Consulted
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan VLAN examples: https://netplan.readthedocs.io/en/stable-0.106/examples/
- Ubuntu Server networking and Netplan documentation: https://documentation.ubuntu.com/server/explanation/networking/about-netplan
- Ubuntu Server network configuration documentation: https://ubuntu.com/server/docs/explanation/networking/configuring-networks/
- Linux `ip-link(8)` manual: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Linux `bridge(8)` manual: https://man7.org/linux/man-pages/man8/bridge.8.html
- Ubuntu `vlan-interfaces(5)` manual: https://manpages.ubuntu.com/manpages/jammy/man5/vlan-interfaces.5.html
- Ubuntu `interfaces(5)` manual: https://manpages.ubuntu.com/manpages/noble/man5/interfaces.5.html
- Local command help for `ip link`, `ip link help vlan`, `bridge vlan help`, `netplan info`, and `modinfo 8021q`

## Issues Found
- The Linux bridge VLAN filtering example configured `tap0` VLAN membership before adding `tap0` to `br0`. `bridge vlan add` operates on bridge ports, so the tap interface should first be enslaved to the bridge. Added `sudo ip link set tap0 master br0` before the access-port VLAN configuration.

## Review Notes
The examples use `eth0` for clarity, but modern Ubuntu installations commonly use predictable interface names such as `ens3`, `enp0s25`, or `eno1`. Users should substitute the actual interface name on their system.
