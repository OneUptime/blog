# Validation Summary: How to Configure IGMP Snooping on a Network Switch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IGMP snooping (multicast group management at L2)
- Cisco IOS IGMP snooping CLI (`ip igmp snooping`, querier, mrouter)
- Linux kernel bridge multicast snooping (sysfs under `/sys/class/net/<br>/bridge/`)
- iproute2 `bridge` and `ip` utilities (`bridge mdb show`, `ip mdb show`, `ip link set ... type bridge mcast_snooping`)
- Open vSwitch (OVS) multicast snooping (`mcast_snooping_enable`, `ovs-appctl mcast-snooping/show`)
- systemd-networkd bridge configuration (`.netdev` `[Bridge]` section)
- tcpdump for verification

## Sources Consulted
- Linux kernel source: `net/bridge/br_sysfs_br.c` (jiffies_to_clock_t / USER_HZ for multicast_query_interval units) — https://github.com/torvalds/linux/blob/master/net/bridge/br_sysfs_br.c
- `bridge(8)` man page — https://man7.org/linux/man-pages/man8/bridge.8.html
- `time(7)` man page (USER_HZ definition) — https://www.man7.org/linux/man-pages/man7/time.7.html
- systemd.netdev(5) — https://www.freedesktop.org/software/systemd/man/systemd.netdev.html
- systemd.network(5) — https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- Cisco Catalyst 2960-X IGMP snooping command reference — https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst2960x/software/15-2_7_e/command_reference/b_1527_2960x_cr/igmp_snooping_and_mvr_commands.html
- Open vSwitch `ovs-vsctl(8)` and `mcast-snooping` test cases — http://www.openvswitch.org/support/dist-docs/ovs-vsctl.8.txt, https://github.com/openvswitch/ovs/blob/main/tests/mcast-snooping.at
- OpenStack OVN IGMP guide — https://docs.openstack.org/neutron/latest/admin/ovn/igmp.html

## Issues Found

1. **Wrong unit for `multicast_query_interval`.** Original text said the value is in **deciseconds** and that "1000 deciseconds = 100 seconds". The Linux kernel exposes this value in **centiseconds** (USER_HZ ticks at 100 Hz, via `jiffies_to_clock_t`). Fixed the comment to say "centiseconds" and changed the example to `12500` (= 125 seconds, the kernel default) for an accurate, useful value.

2. **Incorrect alternative command for enabling bridge IGMP snooping.** Original showed `bridge link set dev br0 flood off` as a way to enable IGMP snooping. That command actually controls **unknown unicast** flooding on a bridge port — it has nothing to do with multicast snooping. Replaced with `ip link set dev br0 type bridge mcast_snooping 1`, which is the correct iproute2 equivalent of writing `1` to `multicast_snooping`.

3. **systemd-networkd `MulticastSnooping=` placed in the wrong file type.** Original wrote `MulticastSnooping=yes` into a `.network` file (matched by `Name=br0`). Per systemd.netdev(5) and systemd.network(5), `MulticastSnooping=` is a `[Bridge]` setting on the **bridge device** and only takes effect in a `.netdev` file. The `[Bridge]` section of a `.network` file configures port-level options (UnicastFlood, MulticastFlood, HairPin, etc.). Changed the example to a `.netdev` file with `[NetDev]` and `[Bridge]` sections, and added `MulticastQuerier=yes` to match the section's recommendation about running a querier when there is no router.

4. **OVS column header in `mcast-snooping/show`.** Original showed a `uptime` column. The actual column header emitted by Open vSwitch is `Age` (seconds since the entry was learned). Updated the example output accordingly and replaced the `mm:ss` value with a plain seconds count to match real OVS output.

5. **OVS command for disabling unregistered-multicast flooding.** Original used `ovs-vsctl set bridge br0 flood-vlans=""`. `flood_vlans` is an OVSDB integer **set** (empty-set syntax is `flood_vlans=[]`), and more importantly it is not the right knob for "disable flooding of unregistered multicast". The correct setting is `other_config:mcast-snooping-disable-flood-unregistered=true` on the Bridge. Updated the command and comment.

## Review Notes

- The Cisco IOS commands (`ip igmp snooping`, `ip igmp snooping vlan N querier ...`, `show ip igmp snooping groups`, etc.) match Cisco's published command references; the 60-second querier `query-interval` default is correct.
- The diagrammatic explanation of how IGMP snooping works (mrouter port receiving all multicast, group→port table, etc.) is accurate.
- The exact column layout printed by `show ip igmp snooping querier` varies slightly by IOS/IOS-XE version (some versions don't print `State`/`Uptime`/`Expires` in the default form and require `detail`). The shown format is plausible but readers on newer IOS-XE may see a different layout — left as-is since it's illustrative.
- `multicast_query_interval` in Linux is actually clamped/handled in jiffies internally; values much smaller than the default can cause excessive query traffic. The 125-second default chosen for the example is conservative and matches kernel defaults.
- For modern systemd-networkd setups, a complete bridge usually also needs a matching `.network` file for the bridge interface itself (so it gets carrier/IP); the snippet only shows the `.netdev` portion needed to enable snooping persistently, which is intentional given the post's scope.
