# Validation Summary: How to Configure Ceph Mirroring for Disaster Recovery

## Status
validated

## Post Type
Technical tutorial / disaster recovery guide

## Technologies Covered
- Ceph RBD
- RBD mirroring
- rbd-mirror daemon
- Cephadm / orchestrator CLI
- CephX authentication
- Prometheus monitoring
- Bash scripting

## Sources Consulted
- Ceph RBD Mirroring documentation: https://docs.ceph.com/en/reef/rbd/rbd-mirroring/
- Ceph rbd man page: https://docs.ceph.com/en/squid/man/8/rbd/
- Ceph Orchestrator CLI documentation: https://docs.ceph.com/en/squid/mgr/orchestrator/
- Cephadm Service Management documentation: https://docs.ceph.com/en/latest/cephadm/services/
- Ceph Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph Monitoring Services documentation: https://docs.ceph.com/en/latest/cephadm/services/monitoring/

## Issues Found
- Pool mirroring mode was described as mirroring all images automatically. Ceph pool mode mirrors journaling-enabled images; snapshot-mode images must be explicitly enabled. Updated the examples to use image mode so both journal and snapshot examples work.
- The rbd-mirror daemon user used `profile rbd-mirror-peer`, which is for peer access. Updated it to `profile rbd-mirror`, matching Ceph's documented daemon-user capabilities.
- The systemd configuration example wrote to `/etc/ceph/ceph.conf.d/rbd-mirror.conf`, which is not the documented default configuration path. Updated it to append a client section to `/etc/ceph/ceph.conf`.
- The Cephadm verification example used a less reliable daemon-status command. Updated it to use `ceph orch ps --daemon-type rbd-mirror --refresh`.
- Snapshot schedule examples used a `--start-time` flag, but the RBD CLI documents start time as a positional argument. Updated those commands.
- The monitoring section said rbd-mirror exposes Prometheus metrics on port 9283. Ceph documents port 9283 as the ceph-mgr Prometheus module endpoint. Updated the text and commands accordingly.
- Prometheus alert examples used unverified rbd-mirror metric names. Replaced the mirror-health alert with the documented `ceph_health_detail` metric and removed the unverified lag alert.
- Bash scripts parsed per-image JSON from non-verbose `rbd mirror pool status`. Updated those commands to use `--verbose --format json`.
- Bash scripts used `((PROMOTED++))` and `((FAILED++))` under `set -e`, which can exit when the previous counter value is zero. Updated them to `((PROMOTED+=1))` and `((FAILED+=1))`.
- The failover section looped over `rbd ls`, which can include non-mirrored images. Updated the multi-image example to use the documented `rbd mirror pool promote --force` command.
- The failback resync section suggested deleting the local image after forced failover. Updated it to demote the stale image and request `rbd mirror image resync`, which matches Ceph's documented split-brain recovery flow.
- The advanced network tuning snippet placed a client section inside `[global]` and described `cluster_network` as mirroring traffic. Updated it to a proper `[client.rbd-mirror.secondary]` section and removed the misleading `cluster_network` example.

## Review Notes
The post is technically relevant and now aligns with the current Ceph RBD mirroring documentation. Metric names for daemon performance counters can still vary depending on Ceph release and whether ceph-exporter or mgr Prometheus perf counters are used, so production alert rules should be checked against the live `/metrics` output.
