# Validation Summary: How to Set Up Proxmox HA with Ceph Backend

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Proxmox VE (Virtual Environment)
- Ceph RBD (RADOS Block Device) storage
- Proxmox HA (High Availability) Manager
- Corosync cluster engine
- Linux watchdog (fencing mechanism)

## Sources Consulted
- Proxmox VE ha-manager(1) man page - PVE 8.x: https://pve.proxmox.com/pve-docs-8/ha-manager.1.html
- Proxmox VE ha-manager(1) man page - PVE 9.x: https://pve.proxmox.com/pve-docs/ha-manager.1.html
- Proxmox VE High Availability chapter: https://pve.proxmox.com/pve-docs/chapter-ha-manager.html
- Proxmox watchdog-mux source code: https://github.com/proxmox/pve-ha-manager/blob/master/src/watchdog-mux.c
- Proxmox Forum threads on watchdog testing and cluster log locations

## Issues Found

1. **Incorrect `ha-manager` subcommand for listing groups (Step 2)**: The post used `ha-manager grouplist`, which is not a valid subcommand. Changed to `ha-manager groupconfig`, which is the documented command for listing HA groups per the official man page.

2. **Wrong watchdog verification command (Step 4)**: The post used `cat /etc/pve/corosync.conf | grep watchdog` to verify watchdog configuration. Watchdog settings are not stored in corosync.conf (which only contains cluster communication settings). Replaced with `cat /etc/default/pve-ha-manager` (where the watchdog module is configured) and `ls -la /dev/watchdog*` (to verify the device exists).

3. **Invalid `watchdog-mux --test` command (Step 4)**: The `watchdog-mux` binary accepts no command-line arguments (confirmed via source code review). Removed this invalid command and replaced with the watchdog device check.

4. **Non-existent log path (Step 6)**: The post referenced `/var/log/pve-cluster/pve-cluster.log`, which does not exist in Proxmox VE. The pve-cluster service logs to the systemd journal. Replaced with `journalctl -u pve-cluster -n 20 --no-pager`.

## Review Notes
- In Proxmox VE 9.x, HA groups are deprecated in favor of HA rules (`ha-manager rules` subcommands). The tutorial remains valid for PVE 8.x but may need updating for PVE 9.x deployments.
- The failover simulation in Step 5 (stopping pve-ha-lrm) is a simplified test approach. A more realistic node failure simulation would involve disconnecting network or triggering a kernel panic, but the approach shown is safer for controlled testing.
- The best practices script assumes Ceph storage pools contain "ceph" in their names, which may not always be the case with custom pool naming.
