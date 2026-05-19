# Validation Summary: How to Configure LXD Networking (Bridge, Macvlan, SR-IOV) on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- LXD / `lxc` CLI
- Linux bridge networking
- Macvlan networking
- SR-IOV networking
- Netplan
- dnsmasq
- iptables / nftables
- systemd-resolved

## Sources Consulted
- LXD documentation: Type `nic` - https://documentation.ubuntu.com/lxd/latest/reference/devices_nic/
- LXD documentation: Bridge network - https://documentation.ubuntu.com/lxd/latest/reference/network_bridge/
- LXD documentation: Macvlan network - https://documentation.ubuntu.com/lxd/latest/reference/network_macvlan/
- LXD documentation: SR-IOV network - https://documentation.ubuntu.com/lxd/latest/reference/network_sriov/
- LXD documentation: Networking setups - https://documentation.ubuntu.com/lxd/latest/explanation/networks/
- LXD documentation: `lxc network create` - https://documentation.ubuntu.com/lxd/latest/reference/manpages/lxc/network/create/
- LXD documentation: `lxc network attach` - https://documentation.ubuntu.com/lxd/latest/reference/manpages/lxc/network/attach/
- LXD documentation: How to integrate with `systemd-resolved` - https://documentation.ubuntu.com/lxd/latest/howto/network_bridge_resolved/
- LXD documentation: How to configure your firewall - https://documentation.ubuntu.com/lxd/latest/howto/network_bridge_firewalld/

## Issues Found
- The managed bridge examples attached `custombr0` with `nictype=bridged parent=custombr0`. This can be used for an existing unmanaged bridge, but for a LXD managed network the documented form is `network=custombr0`. Updated both profile and direct-device examples.
- The physical bridge example used `parent=enp3s0` on a bridge network. LXD bridge networks use `bridge.external_interfaces` to enslave an existing host interface. Updated the command and clarified that the physical interface must be unconfigured first.
- The physical bridge attach example used `nictype=bridged parent=physicalbr`; updated it to `network=physicalbr` to match the managed network created in the previous command.
- The macvlan example created a managed `macvlan0` network but attached the instance directly to `parent=enp3s0`. Updated the attachment to use `network=macvlan0`.
- The SR-IOV example created a managed `sriov0` network but attached the instance directly to `parent=enp5s0f0`. Updated the attachment to use `network=sriov0`.
- The SR-IOV verification note said only `virtchnl` indicates SR-IOV. That is too specific; common VF drivers include `iavf`, `ixgbevf`, and `mlx5_core`. Updated the note.
- The persistent udev rule example wrote to `/etc/udev/rules.d` without privilege escalation. Updated it to use `sudo tee`.
- The DNS example implied host lookups would work immediately after setting `dns.mode=managed`. Updated the comment to note that host lookups require integrating the LXD bridge with `systemd-resolved`.

## Review Notes
The `lxc` CLI was not installed in the local environment, so command verification was performed against the current official LXD documentation rather than local `--help` output.
