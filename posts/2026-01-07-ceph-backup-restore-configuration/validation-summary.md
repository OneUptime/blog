# Validation Summary: How to Backup and Restore Ceph Cluster Configurations

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Ceph RADOS
- Ceph monitors and monitor stores
- CRUSH maps
- OSD maps and pool metadata
- CephX authentication and keyrings
- systemd timers and services
- Bash backup and recovery scripts
- LVM snapshots, rsync, GPG, jq

## Sources Consulted
- Ceph command-line tool man page: https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph monitor store tool man page: https://docs.ceph.com/en/latest/man/8/ceph-monstore-tool/
- Ceph monitor troubleshooting and monitor store recovery: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-mon/
- Ceph adding/removing monitors: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-mons/
- Ceph user management and auth import/export: https://docs.ceph.com/en/latest/rados/operations/user-management/
- Ceph CRUSH tool man page: https://docs.ceph.com/en/latest/man/8/crushtool/
- Ceph pool and OSD command references: https://docs.ceph.com/en/latest/rados/operations/pools/

## Issues Found
- The online MON backup method was labeled as using `ceph-volume` and implied a live `rsync` copy was a consistent snapshot. Changed the heading and wording to describe it as a best-effort online directory copy, and pointed readers to the snapshot method for consistency.
- The runtime configuration script called `ceph config show-with-defaults` with daemon types such as `mon` and `osd`, but Ceph expects a daemon/entity name for that command. Replaced that loop with `ceph config ls` while keeping `ceph config dump` as the authoritative runtime configuration backup.
- The auth backup examples used `ceph auth ls --format=json` as if the JSON output were a top-level array. Updated the jq path to `.auth_dump[].entity`.
- The auth restore script attempted to reconstruct entities from JSON with malformed `ceph auth add --cap` usage. Added `ceph auth export` to the backup scripts and changed restore to use the documented `ceph auth import -i` workflow.
- The complete monitor recovery script did not actually rebuild a monitor store from OSDs. Replaced the placeholder/listing approach with the documented `ceph-objectstore-tool --op update-mon-db --no-mon-config` and `ceph-monstore-tool rebuild` flow, then replaced the recovered `store.db`.
- The single-monitor replacement script used `ceph mon remove`, which is deprecated in the current command API, and used the admin keyring for `ceph-mon --mkfs`. Updated it to `ceph mon rm`, fetch `mon.` with `ceph auth get mon.`, and use that monitor keyring for monitor initialization.
- The single-monitor replacement script added the monitor to the monmap with only the legacy `:6789` address. Changed `monmaptool --add` to pass the IP without a port so modern maps can include the expected messenger protocol addresses.

## Review Notes
The post remains a general operational guide rather than a version-pinned runbook. Cephadm-managed and containerized clusters often use different data paths and service workflows than legacy package deployments, so production users should adapt paths and run commands from the appropriate host or `cephadm shell`.
