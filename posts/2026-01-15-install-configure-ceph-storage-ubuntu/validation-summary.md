# Validation Summary: How to Install and Configure Ceph Storage on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide (step-by-step installation and configuration walkthrough)

## Technologies Covered
- Ceph distributed storage (reef release / v18.x)
- cephadm (containerized cluster deployment)
- Ceph daemons: MON, OSD, MGR, MDS, RGW
- RADOS, RBD (RADOS Block Device), CephFS, RADOS Gateway (S3/Swift)
- CRUSH maps and rules
- Erasure-coded and replicated pools
- Docker / containerd
- AWS CLI (for S3 compatibility testing)
- Ceph Dashboard, Prometheus, Grafana, Alertmanager
- Ubuntu (apt, systemd, chrony)

## Sources Consulted
- Ceph Troubleshooting PGs documentation: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-pg/
- Ceph control/PG command reference (mark_unfound_lost, list_unfound): https://docs.ceph.com/en/latest/rados/operations/control/
- ceph-objectstore-tool man page: https://docs.ceph.com/en/pacific/man/8/ceph-objectstore-tool/
- Ceph OSD Service (cephadm drivegroup spec fields): https://docs.ceph.com/en/reef/cephadm/services/osd/
- CRUSH Maps documentation (create-replicated syntax): https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Cephadm Host Management (orch host add --labels): https://docs.ceph.com/en/reef/cephadm/host-management/
- Monitoring a Cluster (ceph -w): https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph OSD Service / orchestrator OSD management: https://docs.ceph.com/en/reef/cephadm/services/osd/

## Issues Found
1. **Invalid `ceph pg export` / `ceph pg import` commands.** These commands do not exist. PG-level export/import for recovery is done with `ceph-objectstore-tool` directly against a stopped OSD's data path. Replaced with the correct `ceph-objectstore-tool --op export/--op import` invocations and added a note that the OSD must be stopped.

2. **Wrong argument order for unfound-object commands.** The post wrote `ceph pg list-unfound <pg_id>`, `ceph pg mark_unfound_lost revert <pg_id>`, and `ceph pg mark_unfound_lost delete <pg_id>`. The actual CLI takes the pgid *before* the subcommand and uses an underscore: `ceph pg <pg_id> list_unfound` and `ceph pg <pg_id> mark_unfound_lost revert|delete`. Corrected all three.

3. **Invalid device class in CRUSH rule.** `ceph osd crush rule create-replicated rack-rule default rack host` placed `host` in the device-class position (the signature is `create-replicated NAME ROOT FAILURE_DOMAIN [CLASS]`). `host` is not a device class (valid classes are hdd/ssd/nvme), so the rule would fail or behave unexpectedly. Removed the trailing `host` so the rule simply uses `rack` as the failure domain.

4. **Non-existent `ceph orch osd status` command.** Replaced with the valid `ceph osd status` (the `status` mgr module command) for monitoring OSD state. (`ceph orch osd rm status` exists, but only for removal operations, so it does not fit the "deployment progress" context.)

5. **Invalid `ceph health --watch` flag.** `ceph health` has no `--watch` option. Replaced with `watch -n 5 ceph health detail`, which achieves the intended periodic health monitoring (and `ceph -w` is already shown on the preceding line for the event stream).

6. **Invalid `osd_memory_target` field in the DriveGroup/OSD service spec.** `osd_memory_target` is not a valid field within the cephadm OSD service spec `spec:` block (valid fields include data_devices, db_devices, wal_devices, encrypted, objectstore, osds_per_device, block_db_size, crush_device_class, etc.). Including it would cause spec validation to fail. Removed the field; OSD memory is tuned via `ceph config set osd osd_memory_target ...`, which the post already demonstrates in the Performance Tuning section.

## Review Notes
- The cephadm bootstrap flow, host/OSD addition, MON/MGR/MDS/RGW deployment, replicated and erasure-coded pool creation, RBD image/snapshot/clone workflow, CephFS mount (kernel and fuse) with quotas and snapshots, RGW realm/zonegroup/zone setup, S3 testing with AWS CLI, dashboard configuration, and the comprehensive ceph.conf reference were all verified and are accurate for the reef release.
- The `--labels _admin,mon,osd` form on `ceph orch host add` is valid (the `--labels` flag accepts a comma-separated list).
- Minor, not corrected (technically valid): the dashboard section sets both `mgr/dashboard/server_port` and `mgr/dashboard/ssl_server_port` to 8443; these are the HTTP and HTTPS ports respectively, so giving them the same value is unusual but not an error. Enabling `object-map`/`fast-diff` on an image created with default features may report they are already enabled in modern Ceph, since those features are on by default — harmless.
- The post pins to the `reef` release; readers on `squid` or later should substitute the appropriate `CEPH_RELEASE`/container image, and the `MDS version: ceph version 18.2.0 reef` example output is consistent with reef.
