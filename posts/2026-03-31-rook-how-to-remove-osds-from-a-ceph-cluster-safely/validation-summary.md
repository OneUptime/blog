# Validation Summary: How to Remove OSDs from a Ceph Cluster Safely

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Ceph (OSD management, CRUSH map, PG health)
- Rook (Kubernetes Ceph operator, toolbox pod, OSD deployments)
- cephadm (Ceph orchestrator, daemon management)
- Kubernetes (kubectl, deployment management)
- systemd (service management for Ceph daemons)

## Sources Consulted
- Ceph official documentation: OSD management and removal procedures (https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/)
- Ceph official documentation: `ceph osd purge` command reference (https://docs.ceph.com/en/latest/man/8/ceph/)
- Ceph official documentation: cephadm OSD management (https://docs.ceph.com/en/latest/cephadm/services/osd/)
- Rook documentation: OSD management and removal (https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-osd-mgmt/)

## Issues Found
1. **Incorrect `--replace` flag in cephadm section**: The command `ceph orch osd rm 5 --replace` was used under "Using cephadm to Remove OSDs" with the comment "Safe removal with automatic data drain." The `--replace` flag tells the orchestrator to preserve the OSD ID for a future replacement device, which is not the intent of a permanent removal. Removed the `--replace` flag so the command is now `ceph orch osd rm 5`, which performs a permanent removal with automatic data draining.

## Review Notes
- The `ceph osd down` command in Step 5 is technically redundant when the OSD daemon has already been stopped in Step 4, as the monitors will detect the OSD as down automatically after the heartbeat timeout. However, explicitly marking it down is not harmful and speeds up the process, so it is acceptable.
- The Rook section describes a manual removal approach. Modern Rook (v1.10+) also supports more automated OSD removal via the `CephCluster` CR and removal jobs, but the manual approach described remains valid.
- The post correctly advises removing OSDs one at a time when decommissioning multiple OSDs, which is the safest practice.
