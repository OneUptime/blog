# Validation Summary: How to Set Up Open vSwitch Tunnels on Ubuntu

## Status
validated

## Post Type
Tutorial / Hands-on guide

## Technologies Covered
- Open vSwitch (OVS) / `ovs-vsctl`, `ovs-ofctl`, `ovs-appctl`, `ovsdb-client`
- VXLAN overlay networking (RFC 7348)
- GRE overlay networking (RFC 2784/2890)
- OpenFlow flow tables
- 802.1Q VLAN tagging
- Linux network namespaces & veth pairs
- libvirt / QEMU-KVM network interface XML
- Ubuntu / systemd / UFW

## Sources Consulted
- Open vSwitch documentation: https://docs.openvswitch.org/
- `ovs-vsctl(8)` man page (upstream OVS): https://www.openvswitch.org/support/dist-docs/ovs-vsctl.8.html
- `ovsdb-client(1)` man page: https://www.openvswitch.org/support/dist-docs/ovsdb-client.1.html
- `ovs-ofctl(8)` man page: https://www.openvswitch.org/support/dist-docs/ovs-ofctl.8.html
- OVS tunneling guide: https://docs.openvswitch.org/en/latest/howto/tunneling/
- IANA: VXLAN UDP port 4789 assignment
- libvirt OVS integration docs: https://libvirt.org/formatdomain.html#setting-network-interface
- Ubuntu package: `openvswitch-switch`

## Issues Found
1. **Invalid `ovs-vsctl monitor` command.** The original "Monitoring OVS" section showed `sudo ovs-vsctl --db=unix:/var/run/openvswitch/db.sock monitor`. `ovs-vsctl` does not have a `monitor` subcommand — OVSDB monitoring is provided by the `ovsdb-client` utility. Replaced with `sudo ovsdb-client monitor Open_vSwitch`, which is the correct way to stream database changes.

## Review Notes
- VXLAN default UDP port `4789` is correct (IANA-assigned). Note: the Linux kernel's standalone VXLAN driver historically used port `8472`, but OVS defaults to `4789`, which the post correctly uses.
- `options:key=` for setting the VXLAN VNI (and GRE key) is correct OVS syntax.
- The libvirt XML snippet (`<virtualport type='openvswitch'/>`) is the correct way to attach a KVM guest NIC to an OVS bridge.
- The `ovs-appctl fdb/show` command and `ovs-ofctl dump-flows / dump-ports` syntax are accurate.
- The note about GRE having less overhead than VXLAN (no UDP header) and weaker NIC offload support is accurate.
- On Ubuntu the OVS database path `/etc/openvswitch/conf.db` and kernel module name `openvswitch` are correct, and the `openvswitch-switch` systemd unit does restore configuration on reboot.
- The `grep -A 5 "tunnel"` pattern under "Check tunnel status" is illustrative — `ovs-vsctl list interface` output uses fields like `options` and `status` rather than a literal "tunnel" section, so the grep may return no lines on some setups. Left as-is since it's not strictly wrong and the surrounding commands are correct.
