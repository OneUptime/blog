# Validation Summary: How to Build Ceph RBD Mirroring

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Ceph
- RADOS Block Device (RBD)
- RBD mirroring
- rbd-mirror daemon
- cephadm / Ceph orchestrator
- systemd
- Prometheus alerting
- Bash and jq

## Sources Consulted
- Ceph RBD Mirroring documentation: https://docs.ceph.com/en/latest/rbd/rbd-mirroring/
- Ceph rbd man page: https://docs.ceph.com/en/reef/man/8/rbd/
- Ceph Messenger v2 documentation: https://docs.ceph.com/en/reef/rados/configuration/msgr2/
- Ceph Prometheus Manager module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph Releases index: https://docs.ceph.com/en/latest/releases/

## Issues Found
- The post described pool mode as mirroring all images automatically. Ceph pool mode mirrors journal-enabled images automatically, while image mode is required for explicit per-image configuration and mixed journal/snapshot examples. Updated the explanation and changed the example pool configuration to image mode.
- The journal-based image example relied on pool-mode auto-enablement. Since the guide now uses image mode, added `rbd mirror image enable rbd-mirror/database-primary journal`.
- The Ceph version example labeled `18.2.0` as Quincy. Ceph 18.2.x is Reef; Quincy is 17.2.x. Updated the example to `reef`.
- The mirror snapshot schedule examples used a `--start-time` option that is not shown in the current `rbd` command syntax. Updated the examples to pass `start-time` positionally.
- The Prometheus section said the `rbd-mirror` daemon exposes Prometheus metrics directly and used non-stable metric names. Updated it to use the Ceph Manager Prometheus module and keep mirror-specific checks based on `rbd mirror pool status --format json`.
- The secondary read-only verification test mapped the mirrored image without a read-only flag and did not create the secondary mount directory. Updated the command to `rbd device map --read-only` and added `mkdir -p /mnt/test-secondary`.

## Review Notes
The guide is technically relevant and mostly aligned with Ceph's documented RBD mirroring workflow. Exact JSON fields from `rbd mirror pool status --format json` and available Prometheus performance counters can vary by Ceph release and deployment configuration, so production monitoring scripts should be tested against the target cluster version.
