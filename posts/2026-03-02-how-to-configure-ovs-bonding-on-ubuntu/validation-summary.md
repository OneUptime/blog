# Validation Summary: How to Configure OVS Bonding on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Open vSwitch
- OVS bonding
- LACP / 802.3ad
- Netplan
- Linux networking commands

## Sources Consulted
- Open vSwitch bonding documentation: https://docs.openvswitch.org/en/latest/topics/bonding/
- Open vSwitch ovs-vswitchd.conf.db(5): https://www.openvswitch.org/support/dist-docs/ovs-vswitchd.conf.db.5.html
- Open vSwitch ovs-vsctl(8): https://www.openvswitch.org/support/dist-docs/ovs-vsctl.8.html
- Open vSwitch ovs-appctl documentation: https://docs.openvswitch.org/en/latest/ref/ovs-appctl.8/
- Ubuntu netplan(5) manpage: https://manpages.ubuntu.com/manpages/questing/man5/netplan.5.html
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/

## Issues Found
- The `balance-tcp` description only mentioned IP source/destination fields. Updated it to match OVS documentation, which describes L3/L4 fields such as IP addresses and TCP/UDP ports.
- The sample `ovs-vsctl show` output showed `type: system` under only one bond member. Removed that line because `system` is the default interface type and is commonly omitted from `ovs-vsctl show` output.
- The active-backup primary-interface command used `other_config:active-slave`, which is not the current documented configuration key. Changed it to `other_config:bond-primary`.
- The LACP system ID and priority example set `other_config:system-id` and `other_config:lacp-system-priority` on the `Open_vSwitch` table. Updated the command to set the documented port-level keys `other_config:lacp-system-id` and `other_config:lacp-system-priority` on the bond port.
- The Netplan example used `renderer: openvswitch`, but Netplan documents `renderer` values as `networkd` or `NetworkManager`; Open vSwitch devices are requested with an `openvswitch` mapping. Changed the renderer to `networkd`, added `openvswitch: {}` to the bond, and updated the note accordingly.
- The failover timing commands used undocumented `other_config:updelay` and `other_config:downdelay` keys. Changed them to the documented `bond_updelay` and `bond_downdelay` port columns.
- The MII monitoring comment described it as active probing. Updated the comment to match OVS documentation, which describes MII mode as polling each interface's MII.

## Review Notes
The remaining examples are conceptually correct but assume generic interface names such as `eth0` and `eth1`; on many Ubuntu systems, users will need to replace those with predictable interface names such as `enp1s0` or `ens3`.
