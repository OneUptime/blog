# Validation Summary: How to Fix BLUESTORE_SPURIOUS_READ_ERRORS Health Check in Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (BlueStore storage backend)
- Rook (Ceph operator for Kubernetes)
- smartctl / SMART disk diagnostics
- Prometheus alerting (smartmon text collector)
- Kubernetes (kubectl)
- ceph-volume (OSD provisioning)

## Sources Consulted
- Ceph health checks documentation: https://docs.ceph.com/en/reef/rados/operations/health-checks/
- Ceph source code (BlueStore.cc) for `BLUESTORE_SPURIOUS_READ_ERRORS` implementation: https://github.com/ceph/ceph/blob/main/src/os/bluestore/BlueStore.cc
- Ceph PR #23273 (introduced spurious read error handling): https://github.com/ceph/ceph/pull/23273
- Ceph PR #28107 (OSD metadata device fields): https://github.com/ceph/ceph/pull/28107
- Ceph adding/removing OSDs documentation: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/
- Ceph ceph-volume lvm documentation: https://docs.ceph.com/en/latest/ceph-volume/lvm/prepare/
- Rook OSD management documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Advanced/ceph-osd-mgmt/
- prometheus-community smartmon.py text collector: https://github.com/prometheus-community/node-exporter-textfile-collector-scripts/blob/master/smartmon.py
- Proxmox forum threads on spurious read errors for real-world output format validation

## Issues Found

1. **Health detail output format was incorrect.** The blog showed `osd.9 has spurious read errors` and `47 spurious read errors detected in the last 24h`. The actual Ceph output format is `N OSD(s) have spurious read errors` in the summary line and `osd.X reads with retries: N` in the detail line. The counter is cumulative since OSD start, not a 24-hour sliding window. Fixed to match the real output format.

2. **`ceph tell osd.9 reset spurious_read_errors` command does not exist.** This command was fabricated. There is no admin socket or tell command to reset the spurious read error counter. The actual approaches are: (a) restart the OSD daemon to clear the in-memory counter, or (b) disable the warning with `ceph config set osd bluestore_warn_on_spurious_read_errors false`. Replaced the section with both correct approaches.

3. **OSD metadata grep pattern used non-existent field name.** The blog used `grep -E '"devname"|"dev"'` but `devname` is not a field in `ceph osd metadata` output. The correct fields are `bluestore_bdev_dev_node` and `bluestore_bdev_devices`. Fixed the grep pattern.

4. **BlueStore perf dump grep pattern used wrong counter names.** The blog grepped for `read_error` and `spurious`, but the actual BlueStore perf counters are `reads_with_retries` and `read_eio`. Fixed both the standalone and Rook versions of the command.

5. **Rook OSD removal procedure had wrong ordering.** The blog scaled down the deployment before marking the OSD out, which would stop the OSD before data migration could begin. The correct order is: mark OSD out first, wait for PGs to become active+clean, then scale down the deployment, then purge. Reordered the steps correctly and added the wait step.

6. **Prometheus alert metric name was wrong.** The blog used `node_smartmon_attr_raw_value{attr="5"}` but the correct metric from the smartmon text collector is `smartmon_attr_raw_value{name="reallocated_sector_ct"}` (no `node_` prefix, attribute identified by name not numeric ID). Fixed the metric name and label.

7. **kubectl exec used `-it` flags unnecessarily for piped output.** Removed the `-t` flag from the piped kubectl exec command to avoid TTY allocation interfering with piped output.

## Review Notes
- The `ceph-volume lvm create` command is correct but somewhat dated. Modern Ceph deployments (Reef+) using cephadm would typically use `ceph orch daemon add osd` instead. This is acceptable since the post targets both traditional and Rook deployments.
- The Rook OSD removal section could mention the recommended `osd-purge.yaml` job or the `kubectl rook-ceph rook purge-osd` plugin as the preferred approach per Rook documentation, but the manual procedure shown is still valid.
- The `bluestore_warn_on_spurious_read_errors` config option controls whether this health check fires and is worth knowing about for operators who have investigated and confirmed the errors are benign.
