# Validation Summary: How to Use Ansible to Configure VLAN Interfaces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- community.general Ansible collection
- NetworkManager and nmcli
- Netplan
- Linux 802.1Q VLAN interfaces
- Debian ifupdown `/etc/network/interfaces`
- Linux `ip` command
- systemd modules-load.d

## Sources Consulted
- Ansible community.general nmcli module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/nmcli_module.html
- Ansible community.general modprobe module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/modprobe_module.html
- Netplan VLAN examples: https://netplan.readthedocs.io/en/0.107/examples/
- Debian vlan-interfaces(5) man page: https://manpages.debian.org/bookworm/vlan/vlan-interfaces.5.en.html
- NetworkManager nmcli manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager nm-settings-nmcli reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- systemd modules-load.d documentation: https://www.freedesktop.org/software/systemd/man/latest/modules-load.d.html
- Local `ip link help` output for `ip link set ... mtu` and VLAN link support.

## Issues Found
- The post used `10.300.0.x` addresses for VLAN 300. IPv4 octets must be in the 0-255 range, so these examples would fail. Changed the storage network examples to `10.30.0.x`.
- The NetworkManager examples used custom connection names but later assumed interface names like `eth0.100` and `eth0.300`. Added `ifname` to the `community.general.nmcli` VLAN examples so the created interfaces match the later commands and diagram.
- The nmcli VLAN list used `gateway: ""` for VLANs without a gateway. An empty string can still be passed as `gw4`; removed those empty values and used `default(omit, true)` so missing or empty gateways are omitted.
- The verification playbook derived ping targets from VLAN IDs, which produced the invalid address `10.300.0.1` for VLAN 300. Replaced it with an explicit `vlan_ping_targets` map.
- The task label said it verified VLAN interfaces were up, but `ip link show` only verifies that the interface exists and displays its state. Renamed the task to match the command behavior.
- The MTU example later referenced `eth0.300` even though the NetworkManager task did not explicitly create that interface name. Added `ifname: eth0.300` and set `mtu: 9000` through the nmcli module for persistent configuration.
- The prerequisites said only "Ansible 2.9+" even though the examples use modules from the `community.general` collection. Updated the prerequisite to mention the required collection.

## Review Notes
The examples are technically sound after correction, but the exact package and renderer behavior still varies by distribution. In production, parent interface MTU and VLAN activation should be managed by the system's primary network manager rather than mixing temporary `ip link set` commands with persistent profiles.
