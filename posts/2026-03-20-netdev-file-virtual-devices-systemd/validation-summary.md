# Validation Summary: How to Create a .netdev File for Virtual Devices in systemd-networkd

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- systemd-networkd
- .netdev configuration files
- VLAN (Virtual LAN)
- Bridge networking
- Bond (link aggregation)
- VXLAN (Virtual eXtensible LAN)
- GRE (Generic Routing Encapsulation) tunnels
- networkctl, ip, systemctl CLI tools

## Sources Consulted
- systemd.netdev(5) man page (official systemd documentation)
- systemd.network(5) man page
- systemd-networkd(8) man page
- Linux kernel networking documentation for VLAN, bridge, bond, VXLAN, GRE
- RFC 7348 (VXLAN), RFC 2784 (GRE)

## Issues Found
No technical issues found.

Verified:
- `[NetDev]` section with `Name=` and `Kind=` is the correct minimum required configuration.
- `Kind=vlan`, `Kind=bridge`, `Kind=bond`, `Kind=vxlan`, `Kind=gre` are all valid kinds per the supported netdev kinds table.
- VLAN `[VLAN] Id=10` — Id is compulsory and accepts integer 0-4094; 10 is valid.
- Bridge `[Bridge] STP=yes` — boolean accepted; `ForwardDelaySec=4` — accepts time span, valid.
- Bond `[Bond] Mode=active-backup` — valid bond mode; `MIIMonitorSec=100ms` — accepts time span, rounded to nearest millisecond.
- VXLAN `[VXLAN] VNI=100` — `VNI=` is the current canonical field name (added in systemd 243), accepts 1-16777215. `DestinationPort=4789` matches the IANA-assigned VXLAN UDP port.
- GRE `[Tunnel]` section — correct section for GRE; `TTL=64` is valid (range 1-255 for tunnels).
- `systemctl restart systemd-networkd`, `ip link show`, and `networkctl list` are all valid commands.
- File processing claim is accurate: configuration files are sorted alphanumerically and processed; .netdev devices are created before .network configurations are applied to them.
- File naming convention with numeric prefix (e.g., `10-br0.netdev`) follows the recommendation in the man page to use a number smaller than 70.

## Review Notes
- The VLAN example uses `Name=eth0.10` which is a common convention but the actual binding of the VLAN device to the physical interface `eth0` requires a `VLAN=eth0.10` directive in eth0's `.network` file. The post's "File Processing Order" section hints at this with `20-eth0.network ← physical interface attached to bridge`, but doesn't explicitly show the binding. This is a minor educational gap but not a technical error.
- The post does not mention that the kernel auto-creates devices named `gre0` and `gretap0` when the GRE module is loaded, so users should avoid those names. The post uses `gre1` which is fine.
- The bond `MIIMonitorSec=100ms` is a sensible non-default value; the upstream default is 0 (disabled).
- Version-specific note: `VNI=` in `[VXLAN]` was added in systemd 243; current distributions all support it.
