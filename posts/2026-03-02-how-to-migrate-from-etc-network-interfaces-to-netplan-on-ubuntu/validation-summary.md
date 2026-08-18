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

## Revision: 2026-08-18 (issue #162)

**Reported problem:** Step 4 of the original migration plan ran `systemctl stop networking` before Netplan was applied. On a remote server that step drops the connection, so the reader never reaches Step 5 where `netplan try` was recommended.

**Verified against official sources:**
- ifupdown `networking.service` unit (Debian source package): `ExecStop=/sbin/ifdown -a --read-environment --exclude=lo` - confirms stopping the service brings down every interface except loopback.
- `netplan try` implementation (`netplan_cli/cli/commands/try_command.py`, canonical/netplan): `revert()` restores the previous `/etc/netplan` contents and re-applies. With no pre-existing Netplan config, a revert applies an empty config; ifupdown does not re-run on its own.
- `netplan-try(8)` man page (Ubuntu noble): default 120s timeout, and the documented requirement to manually verify that the network actually reverted.
- `netplan try` `is_revertable()` check: exits with `reverting custom parameters for bridges and bonds is not supported` for any bond/bridge that is not a trivial compound interface - which covers the bridge and bond examples in this post.
- `netplan migrate` (canonical/netplan, 0.104 through 1.1): `command_id='migrate'`, `testing=True`, so it is only registered when `ENABLE_TEST_COMMANDS` is set; supports `--dry-run` and `--root-dir`, and bails on unsupported ifupdown options.
- `systemd.network(5)` `KeepConfiguration=`: defaults to `no` outside initrd, so stopping systemd-networkd drops the addresses and routes it configured.
- `systemd-run(1)` `--on-active=` / `--unit=`: creates a transient timer plus service unit, used for the timed rollback.
- Ubuntu Wiki MigratingToNetplan: confirms there is no official step-by-step migration procedure; the ordering here is derived from the tool behaviour above.

**Fixes applied:**
- Reordered the procedure so Netplan is applied while `ifupdown` is still enabled, and the old service is only disabled (never stopped) afterwards.
- Added Step 0 on out-of-band console access.
- Added a `systemd-run` timed rollback that moves the new config aside and reboots, since a reboot is what actually restores the ifupdown configuration.
- Documented that `netplan try` refuses non-trivial bridge/bond configs, with the `netplan apply` + timed rollback alternative.
- Rewrote "Rolling Back" to be console-only or reboot-based, explaining the `KeepConfiguration=no` behaviour.
- Added the optional `netplan migrate --dry-run` converter with its testing-command caveat.
