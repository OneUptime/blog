# Validation Summary: How to Configure VLANs on Top of a Bond Interface

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux kernel bonding driver
- 802.1Q VLAN tagging (8021q kernel module)
- iproute2 (`ip link`, `ip addr`)
- Netplan (networkd renderer)
- NetworkManager (`nmcli`)

## Sources Consulted
- Linux kernel bonding documentation: https://www.kernel.org/doc/Documentation/networking/bonding.txt
- iproute2 `ip-link(8)` man page (VLAN type options)
- Netplan reference: https://netplan.readthedocs.io/en/stable/netplan-yaml/ (bonds, vlans, parameters)
- NetworkManager `nm-settings-nmcli` / nmcli(1) man pages for `bond`, `vlan`, and `ethernet` connection types
- IEEE 802.1Q tagging standard

## Issues Found
No technical issues found.

- The iproute2 syntax `ip link add link <parent> name <name> type vlan id <vid>` is correct.
- Netplan keys used (`bonds`, `parameters.mode`, `parameters.mii-monitor-interval`, `vlans.<name>.id/link/addresses`) match the Netplan YAML reference.
- `nmcli` invocations for `type bond`, `type ethernet ... master bond0`, and `type vlan ... dev bond0 id N` are valid and the `bond.options "mode=active-backup,miimon=100"` form is correct.
- Verification commands (`/proc/net/bonding/bond0`, `ip link show type vlan`, `ping -I`) are accurate.
- Technical claim that VLAN subinterfaces inherit the bond's failover is correct — VLANs ride on top of the bond netdev, so slave switching is transparent to the VLAN layer.

## Review Notes
- The `master` shortcut in `nmcli connection add ... master bond0` is still accepted but internally maps to `connection.master` / `connection.slave-type`; newer docs sometimes prefer the explicit form, but the shortcut used here is valid.
- Kernel bonding terminology has been shifting from "slave" to "port" in recent kernel documentation; the post uses the traditional "slave" wording which still matches `/proc/net/bonding/bond0` output.
- The post doesn't mention that the upstream switch port must be configured as an 802.1Q trunk carrying the listed VLAN IDs; worth noting for readers but not a technical error.
