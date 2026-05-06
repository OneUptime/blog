# Validation Summary: How to Use brctl vs ip link for Bridge Management

## Status
validated

## Post Type
Reference

## Technologies Covered
- Linux bridge
- `brctl` / `bridge-utils`
- `ip link`
- `bridge`
- Spanning Tree Protocol (STP)
- Forwarding database (FDB)
- VLAN filtering

## Sources Consulted
- Linux kernel bridge documentation: https://docs.kernel.org/6.15/networking/bridge.html
- `ip-link(8)` manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `bridge(8)` manual page: https://man7.org/linux/man-pages/man8/bridge.8.html
- `brctl(8)` manual page: https://man7.org/linux/man-pages/man8/brctl.8.html
- Local `iproute2` help output from `ip link help`, `ip link help bridge`, `ip link help bridge_slave`, `bridge help`, `bridge link help`, and `bridge fdb help` on `iproute2-6.1.0`

## Issues Found
- The post mapped `brctl show` to `bridge link show`, but `bridge link show` lists bridge ports rather than bridge devices. I changed the equivalent to `ip link show type bridge` and kept `bridge link show` only as a per-port status example.
- The post used `bridge stp show br0`, which is not a valid `bridge` subcommand. I replaced it with `ip -d link show dev br0`, which is the documented way to inspect bridge-specific settings including `stp_state`.
- The `brctl` port-cost command was written as `setportcost`, but the documented command is `setpathcost`. I corrected that command and used `bridge link set dev eth0 cost 10` as the modern equivalent.
- The post set `ageing_time` to `6000` for a 60-second bridge ageing timer. In `ip link`, `ageing_time` is specified in seconds, so I corrected the command to `ageing_time 60`.
- The recommendation to use `brctl` for "very old kernels (pre-3.x)" was too specific and not supported by the current documentation. I changed that guidance to legacy scripts or environments that still ship `bridge-utils`.
- The JSON-output takeaway referenced `bridge fdb show br br0` without the required `-j` flag. I corrected it to `bridge -j fdb show br br0`.

## Review Notes
- The post is technically relevant and salvageable; after the command corrections above, it is accurate as a compact command-reference article.
- `brctl` remains usable for basic bridge administration, but the upstream manual page marks it as obsolete and explicitly recommends `bridge` from `iproute2` for fuller feature coverage.
- The commands were validated against official documentation and local CLI help, but not executed against a live bridge interface in this environment.
