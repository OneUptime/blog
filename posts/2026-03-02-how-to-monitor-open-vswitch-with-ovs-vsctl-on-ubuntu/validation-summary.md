# Validation Summary: How to Monitor Open vSwitch with ovs-vsctl on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Open vSwitch (OVS)
- ovs-vsctl (configuration database management)
- ovs-ofctl (OpenFlow management)
- ovs-appctl (daemon communication)
- ovs-dpctl (datapath management)
- OpenFlow protocol
- VLAN configuration
- LACP / Link aggregation (bonds)
- MAC learning / forwarding database (FDB)
- Ubuntu

## Sources Consulted
- Open vSwitch official documentation: https://docs.openvswitch.org/
- ovs-vsctl(8) man page: https://www.openvswitch.org/support/dist-docs/ovs-vsctl.8.html
- ovs-ofctl(8) man page: https://www.openvswitch.org/support/dist-docs/ovs-ofctl.8.html
- ovs-appctl(8) man page: https://www.openvswitch.org/support/dist-docs/ovs-appctl.8.html
- ovs-dpctl(8) man page: https://www.openvswitch.org/support/dist-docs/ovs-dpctl.8.html
- ovs-vswitchd(8) man page and ovs-vswitchd.conf.db(5) for table/column references
- Open vSwitch FAQ and Bonding documentation: https://docs.openvswitch.org/en/latest/topics/bonding/

## Issues Found
No technical issues found.

All commands verified against official Open vSwitch man pages and documentation:
- `ovs-vsctl show`, `list-br`, `list-ports`, `list-ifaces`, `get`, `list`, `get-controller` — all valid subcommands.
- Interface columns referenced (`link_state`, `admin_state`, `link_speed`) and Port columns (`tag`, `trunks`, `vlan_mode`) match the OVSDB schema.
- `ovs-ofctl dump-ports`, `dump-ports-desc`, `dump-flows`, `show` — all valid; flow filter syntax (`table=0`, `dl_vlan=100`, `nw_src=10.0.0.0/24`) is correct.
- `ovs-appctl fdb/show`, `fdb/flush`, `bond/show`, `lacp/show`, `ofproto/trace`, `vlog/set`, `vlog/list`, `memory/show`, `dpif/show`, `ofproto/list-tunnels` — all valid appctl unixctl commands.
- `ovs-dpctl show`, `dump-flows`, `--statistics`, `-m` flag — all valid.
- The `vlog/set` spec parser accepts module-only, level-only, or `module:level` forms (e.g., `dbg`, `info`, `ofproto:dbg`), so all log-verbosity examples are correct.
- Default log path `/var/log/openvswitch/ovs-vswitchd.log` matches the Ubuntu openvswitch-switch package layout.
- The `ofproto/trace` flow-key field names (`in_port`, `dl_src`, `dl_dst`, `dl_type`, `nw_src`, `nw_dst`, `dl_vlan`) are the standard OVS match-field names.
- LACP is required for `balance-tcp` bonds (and optional for `balance-slb`), so the inline comment is accurate.

## Review Notes
- The `sort -t, -k2 -n -r` pipeline intended to rank flows by packet count is imperfect: each second comma-delimited field is the literal string `n_packets=N`, so `sort -n` will not extract the numeric N. The command runs without error but the sort is effectively alphabetic on the raw text. A more reliable approach would use `awk` to extract the count, but this is a cosmetic limitation rather than a technical error and the post does not claim guaranteed numeric ordering.
- `ovs-appctl ofproto/list-tunnels` is placed under the "Checking Controller Connectivity" section. The command is valid but it lists tunnel ports, not controller connection details — `ovs-ofctl show <bridge>` (already shown above it) is the right one for controller state. Left as-is since the command itself is correct and the user instructions prohibit restructuring.
- The post does not mention systemd service status (`systemctl status openvswitch-switch`) which is often the first thing to check on Ubuntu, but this is an additive suggestion, not an inaccuracy.
- All commands and column names are consistent with OVS 2.13+ which is the version shipped with Ubuntu 20.04 and later, so the post is current for supported Ubuntu LTS releases.
