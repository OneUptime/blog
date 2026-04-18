# Validation Summary: How to Use VXLAN with Open vSwitch on Linux

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Open vSwitch (OVS) — `ovs-vsctl`, `ovs-ofctl`
- VXLAN (RFC 7348) overlay networking
- OpenFlow flow tables
- Linux `ip` command (iproute2)
- systemd service management
- APT / YUM package managers (Ubuntu/Debian, RHEL/CentOS)

## Sources Consulted
- Open vSwitch documentation: https://docs.openvswitch.org/
- `ovs-vsctl(8)` man page
- `ovs-vswitchd.conf.db(5)` — documents `options:remote_ip`, `options:key`, `options:dst_port`, `in_key`/`out_key` for VXLAN tunnel interfaces
- `ovs-ofctl(8)` man page — confirms port names accepted in `in_port=` matches, and `NORMAL` reserved port semantics
- Debian/Ubuntu `openvswitch-switch` packaging (systemd unit files shipped)
- RHEL/CentOS `openvswitch` RPM packaging
- IANA UDP port registry (port 4789 for VXLAN)

## Issues Found
- **`systemctl enable --now ovsdb-server` was incorrect.** Neither the Ubuntu/Debian `openvswitch-switch` package nor the RHEL/CentOS `openvswitch` package ships a standalone `ovsdb-server.service` systemd unit. The main unit (`openvswitch-switch.service` or `openvswitch.service`) invokes `ovs-ctl start`, which launches both `ovsdb-server` and `ovs-vswitchd`. Running `systemctl enable --now ovsdb-server` would fail on a standard install. Fix: removed the separate line and added a commented alternative for RHEL/CentOS (`openvswitch.service`), with a clarifying comment noting that the single service starts both daemons.

## Review Notes
- `options:key=100` is technically a shorthand that sets both `in_key` and `out_key` to the same VNI. This is valid and commonly used; no change needed. Authors wanting asymmetric tunnel keys can use `options:in_key` and `options:out_key` separately.
- `ovs-ofctl add-flow br-vxlan "in_port=vxlan0,actions=output:NORMAL"` is accepted by modern OVS (port names are supported, and `output:NORMAL` is a valid reserved-port output action). The more idiomatic form per upstream man-page examples is `actions=NORMAL`. Left as-is since it is not incorrect.
- VXLAN default UDP port 4789 is explicitly specified; this matches the IANA assignment and is the default in OVS.
- The commands are current as of OVS 3.x and should work on contemporary distributions.
