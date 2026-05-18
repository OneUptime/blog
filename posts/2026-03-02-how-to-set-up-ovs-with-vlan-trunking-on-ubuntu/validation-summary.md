# Validation Summary: How to Set Up OVS with VLAN Trunking on Ubuntu

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Open vSwitch (OVS) / `ovs-vsctl`, `ovs-ofctl`, `ovs-appctl`
- Ubuntu (`apt`, `ip`, `tcpdump`, `ip netns`)
- 802.1Q VLAN tagging
- Netplan with the `openvswitch` renderer

## Sources Consulted
- Open vSwitch documentation, `ovs-vsctl(8)` man page — https://docs.openvswitch.org/en/latest/ref/ovs-vsctl.8/
- Open vSwitch database schema reference, `ovs-vswitchd.conf.db(5)` — Port table `vlan_mode`, `tag`, and `trunks` columns: https://www.openvswitch.org/support/dist-docs/ovs-vswitchd.conf.db.5.html
- Open vSwitch FAQ — VLAN configuration section: https://docs.openvswitch.org/en/latest/faq/vlan/
- Netplan reference (Canonical) — `openvswitch` renderer and bridge integration: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- `tcpdump`/`pcap-filter(7)` man page for VLAN filter expressions
- Ubuntu package archive — `openvswitch-switch` package name confirmation

## Issues Found
1. **Invalid IPv4 address `10.300.0.1/24`** in the "Connecting to a Physical Switch Trunk" section. IPv4 octets must be in the range 0–255, so `300` is not a valid octet and the command would have errored out. Changed to `10.30.0.1/24` to keep the example syntactically valid while preserving the structure.
2. **Misleading comment in the "Restricting VLANs on a Trunk Port" section**: the line `# Remove trunks restriction (allow all VLANs)` was placed above `sudo ovs-vsctl remove port eth0 trunks 200`, but that command only removes VLAN 200 from the trunks list (which the next inline comment correctly stated). Replaced the misleading comment with an accurate one and added a note showing the canonical `add` form (`ovs-vsctl add port eth0 trunks <vlan>`) for incrementally extending a trunks list, since the previous text only described `set` (which replaces the value).
3. **Imprecise `vlan_mode` descriptions**: the original comments said `native-tagged` and `native-untagged` are "like trunk but native VLAN traffic is tagged/untagged". The defining behaviour of those modes is actually how *untagged ingress* is handled (mapped to the native VLAN specified in `tag`), and how *egress on the native VLAN* is emitted (tagged vs untagged). Updated the inline descriptions to match the `ovs-vswitchd.conf.db(5)` definitions, and clarified that pure `trunk` mode drops untagged ingress.

## Review Notes
- The Netplan example uses Linux `vlans:` sub-interfaces stacked on top of an OVS bridge (`link: br-vlan`). This is syntactically valid Netplan and works, but the more idiomatic OVS approach is to declare the VLAN as an OVS internal port with a `tag` directly inside the bridge (via the Netplan `openvswitch` extension on the bridge port). The current example is fine and commonly used, just worth being aware of.
- The post correctly notes that an OVS port with neither `tag` nor `trunks` set behaves as a trunk that carries all VLANs — this matches the OVS behaviour where an empty `trunks` list means "all VLANs".
- All `ovs-vsctl`, `ovs-ofctl`, `ovs-appctl`, `tcpdump`, and `ip netns` commands are syntactically correct and reflect current (OVS 2.17+/3.x on Ubuntu 22.04/24.04) usage.
- `openvswitch-switch` is the correct Ubuntu package name and remains current.
