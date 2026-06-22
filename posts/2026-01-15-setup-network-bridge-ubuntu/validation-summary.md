# Validation Summary: How to Set Up a Network Bridge on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu networking
- Linux bridge
- Netplan
- NetworkManager and nmcli
- bridge-utils / ifupdown
- iproute2 bridge tooling
- KVM/QEMU and libvirt
- LXD/LXC networking
- UFW, iptables, and Linux sysctl

## Sources Consulted
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan CLI manpage on local system: `netplan(8)`
- NetworkManager nmcli examples: https://networkmanager.dev/docs/api/1.44.4/nmcli-examples.html
- NetworkManager nmcli settings reference: https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- Local `nmcli connection add help` and `nmcli connection modify help`
- Ubuntu bridge-utils interfaces manpage: https://manpages.ubuntu.com/manpages/focal/man5/bridge-utils-interfaces.5.html
- Local iproute2 `bridge fdb help`, `bridge link help`, and `bridge vlan help`
- libvirt network XML format: https://libvirt.org/formatnetwork.html
- libvirt virsh manpage: https://www.libvirt.org/manpages/virsh.html
- LXD bridge network reference: https://documentation.ubuntu.com/lxd/latest/reference/network_bridge/
- LXD NIC device reference: https://documentation.ubuntu.com/lxd/latest/reference/devices_nic/
- LXD networking setups: https://documentation.ubuntu.com/lxd/latest/explanation/networks/
- LXD `lxc network attach-profile` reference: https://documentation.ubuntu.com/lxd/latest/reference/manpages/lxc/network/attach-profile/

## Issues Found
- The use case "Network aggregation" was inaccurate for Linux bridges because link aggregation is handled by bonding/team/802.3ad, not by a bridge itself. Changed it to "Connecting multiple network segments."
- The ifupdown example showed the physical bridge port as a standalone auto/manual interface and then showed two active `br0` stanzas in the same snippet. Adjusted the comments to make clear the DHCP and static bridge stanzas are alternatives and removed the separate physical-interface stanza.
- The LXD command for attaching an existing host bridge used `lxc network attach-profile`, which applies to LXD-managed networks. Changed it to `lxc profile device add default eth0 nic nictype=bridged parent=br0`, matching LXD guidance for pre-existing Linux bridges.
- The MAC address table command used `bridge fdb show br0`, but iproute2 expects a bridge filter as `br BRDEV` or a port filter as `brport DEV`. Changed it to `bridge fdb show br br0`.
- The troubleshooting section implied IP forwarding fixes normal Layer 2 bridge forwarding. IP forwarding applies to routed/NAT traffic, so the comment was changed to "Routed/NAT traffic not forwarding."

## Review Notes
The main Netplan, NetworkManager, bridge-utils, libvirt, and LXD examples are technically valid after the fixes. The NetworkManager `slave-type` option remains accepted but is documented as a deprecated alias in newer NetworkManager versions; future updates could prefer `port-type` terminology where supported.
