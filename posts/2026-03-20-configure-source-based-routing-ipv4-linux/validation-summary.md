# Validation Summary: How to Configure Source-Based Routing for IPv4 on Linux

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Linux kernel routing (RPDB - Routing Policy Database)
- iproute2 (`ip rule`, `ip route`)
- `/etc/iproute2/rt_tables` configuration
- systemd unit files
- Policy-based routing (PBR) for multi-homed servers

## Sources Consulted
- `ip-rule(8)` man page (iproute2)
- `ip-route(8)` man page (iproute2)
- Default `/etc/iproute2/rt_tables` shipped with iproute2
- Linux kernel documentation: Documentation/networking/policy-routing.txt
- systemd.unit(5) and systemd.service(5) man pages

## Issues Found
No technical issues found.

Verified items:
- The default RPDB rules at priorities 0 (local), 32766 (main), 32767 (default) are correct per `ip-rule(8)`.
- Reserved table IDs 253 (default), 254 (main), 255 (local) match the iproute2 defaults in `/etc/iproute2/rt_tables`.
- The conventional usable range of 1-252 is the standard reference (0 is "unspec"; 253-255 are reserved). Note: modern kernels actually support 32-bit table IDs, but the 1-252 convention is the standard guidance and is correctly paired with the reserved IDs in the post.
- `ip rule add from <addr> table <name> priority <num>` syntax is correct per the man page (`priority` is accepted as an alias for `pref`/`preference`).
- `ip route add default via <gw> dev <iface> table <name>` and `ip route add <prefix> dev <iface> table <name>` are correct syntactic forms.
- `ip route get <dst> from <src>` is a supported form per `ip-route(8)` for testing source-based routing.
- The `ip rule show` output format (priority, selector, lookup table) matches actual iproute2 output.
- The systemd unit file is well-formed: `Type=oneshot` with `RemainAfterExit=yes` is the correct pattern for a setup script that exits, and `After=network.target` with `WantedBy=multi-user.target` is appropriate.
- `systemctl enable pbr` correctly resolves to `pbr.service` (extension is optional).

## Review Notes
- The "Making Rules Persistent" section references `/etc/pbr-setup.sh` in the systemd unit's `ExecStart` but doesn't show how to create that script. Readers will need to assemble the `ip rule`/`ip route` commands from prior steps into that file. This is a minor completeness gap, not a technical error.
- For the directly-connected routes (`ip route add 203.0.113.0/24 dev eth0 table isp-a`), the kernel will infer `scope link` automatically when no `via` is specified, so the commands as written work correctly.
- `/etc/rc.local` is mentioned as an alternative but is deprecated/unavailable on most modern systemd-based distributions by default. The systemd service approach shown is the recommended modern path.
- For production multi-homed setups, administrators may also want to consider `rp_filter` sysctl settings (often needs to be set to `2` loose mode or `0` for asymmetric setups), but this is beyond the scope of a focused PBR tutorial.
