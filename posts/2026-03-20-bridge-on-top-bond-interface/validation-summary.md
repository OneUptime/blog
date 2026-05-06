# Validation Summary: How to Configure a Bridge on Top of a Bond Interface

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux bonding driver
- Linux bridge
- `iproute2` (`ip`, `bridge`)
- Netplan with `systemd-networkd`
- KVM/libvirt bridge networking
- TAP interfaces

## Sources Consulted
- Linux kernel bonding documentation: https://docs.kernel.org/6.17/networking/bonding.html
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan routing reference/examples: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- libvirt domain XML format: https://libvirt.org/formatdomain.html
- Local current `iproute2` CLI help: `ip link add bond0 type bond help`
- Local current `iproute2` CLI help: `bridge link help`
- Local current `iproute2` CLI help: `bridge fdb help`
- Local current `iproute2` CLI help: `ip tuntap help`

## Issues Found
- The verification command `bridge link show br0` was not valid `bridge` CLI syntax. I changed it to `bridge link show dev bond0`, which correctly shows the bridged bond port and its `master br0` relationship.

## Review Notes
- The post is technically sound after the command fix. It correctly places the host IP address on the bridge instead of the bonded lower interface.
- The examples assume a standard wired Ethernet uplink. If readers switch from `active-backup` to `802.3ad`, switch-side LACP configuration would also be required.
