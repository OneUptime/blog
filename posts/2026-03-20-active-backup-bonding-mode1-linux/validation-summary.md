# Validation Summary: How to Configure Active-Backup Bonding (Mode 1) on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux bonding driver
- `iproute2`
- Netplan
- Linux sysfs and `/proc`

## Sources Consulted
- Linux kernel bonding documentation: https://docs.kernel.org/6.17/networking/bonding.html
- `ip-link(8)` manual: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Local `iproute2` help output via `ip link help bond`

## Issues Found
- The post used `active_slave` to describe setting a preferred primary interface. I changed that command to `ip link set bond0 type bond primary eth0` because `active_slave` selects the currently active slave, while `primary` defines the preferred slave for active-backup mode.
- The sample `/proc/net/bonding/bond0` output showed `primary_reselect failure` even though the post did not configure that policy and later used `always` in the Netplan example. I changed the sample output to `primary_reselect always` to match the documented configuration and default policy.
- The `iproute2` example in the “Set Primary Interface” section was labeled “during bond creation” even though it used `ip link set` on an existing bond. I corrected the label to reflect that it is a runtime `iproute2` configuration command.
- The failback note implied unconditional return to `eth0`. I clarified that failback occurs with `primary=eth0` and the default `primary_reselect` policy.
- The Netplan snippet omitted the required top-level `network:` structure and did not define the member interfaces referenced by `interfaces:`. I updated the example to a valid Netplan structure with `version: 2`, `ethernets:`, and `bonds:`.
- The conclusion said the backup interface monitors link state. I corrected that to the bonding driver monitoring link state, which is how failover is actually handled.

## Review Notes
- The post’s `iproute2` commands and bond mode selection are current and aligned with present-day bonding documentation.
- Netplan accepts unqualified numeric values for `mii-monitor-interval`, `up-delay`, and `down-delay` as milliseconds; adding `ms` would be optional, not required.
- The upstream Linux bonding HOWTO in kernel documentation is old but remains the canonical bonding reference and is still reflected in current kernel docs.
