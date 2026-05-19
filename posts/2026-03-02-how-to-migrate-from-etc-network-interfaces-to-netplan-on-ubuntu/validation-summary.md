# Validation Summary: How to Migrate from /etc/network/interfaces to Netplan on Ubuntu

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Ubuntu (17.10+, 18.04+)
- Netplan (YAML network configuration)
- ifupdown / `/etc/network/interfaces` (legacy)
- systemd-networkd
- networkd-dispatcher
- VLANs, bridges, and bonding/link aggregation
- `resolvectl` (systemd-resolved)

## Sources Consulted
- Netplan official documentation: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- Netplan examples: https://netplan.readthedocs.io/en/stable/examples/
- `netplan-try(8)` man page (Ubuntu noble): https://manpages.ubuntu.com/manpages/noble/man8/netplan-try.8.html
- Ubuntu package archive (packages.ubuntu.com) — verified `systemd-networkd` is not a separate apt package
- Ubuntu release notes for 17.10 (introduction of Netplan as default)

## Issues Found
- **`sudo apt install systemd-networkd` would fail** — `systemd-networkd` is not a standalone installable package on Ubuntu; it ships as part of the main `systemd` package. A search of packages.ubuntu.com returns no results for this package name.
  - **Fix applied:** Changed the install step to `sudo apt install netplan.io` (which is the package actually needed for the migration; it is also typically already present), with a comment noting that systemd-networkd is included with systemd. Kept the `systemctl enable systemd-networkd` line which is correct.

All other technical content was verified accurate:
- Netplan YAML keys (`addresses`, `dhcp4`, `routes`, `nameservers`, `vlans`, `bridges`, `bonds`) — correct
- Bond parameter `mii-monitor-interval` — correct (verified against official docs; not `mii-monitoring-interval`)
- Bridge parameters `stp` (boolean) and `forward-delay` — correct
- VLAN syntax (`id`, `link`, `addresses` under `vlans:`) — correct
- Bond parameters `mode`, `primary`, `mii-monitor-interval` — all valid
- Modern default-route syntax (`routes: - to: default, via: ...`) instead of deprecated `gateway4:` — correct
- `netplan try` default timeout of 120 seconds — confirmed in man page
- Configuring `lo` under `ethernets:` — documented and supported by Netplan (even though the post correctly recommends omitting it)
- Ubuntu 17.10 as the first Netplan-default release — correct
- `resolvectl status` for DNS verification — correct modern command

## Review Notes
- The post correctly notes that the loopback `lo` example is for translation comparison only and can be omitted; this matches the official Netplan recommendation that `lo` is handled automatically.
- The deprecated `bond-slaves` term is used in the legacy `interfaces` example for accuracy with the historical ifupdown syntax. The netplan translation correctly uses the modern `interfaces:` list key.
- The `netplan try` revert-on-loss-of-connectivity behavior is a useful safety net highlighted at the right step.
- Worth noting in future revisions: on very recent netplan releases (1.0+), the recommended renderer for desktops vs servers can differ; the post sensibly chooses `networkd` which is the right server default.
- The rollback section is conservative and complete; readers performing remote migrations should be reminded that re-enabling `networking` may require ensuring no Netplan-rendered configs remain that would conflict on next boot.
