# Validation Summary: How to Fix MON_DISK_CRIT Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Emergency Troubleshooting Guide

## Technologies Covered
- Ceph (monitor subsystem, health checks, RocksDB store compaction)
- Rook (Kubernetes-based Ceph operator, PVC management)
- Kubernetes (PVC resizing, kubectl)
- Prometheus (alerting rules, PromQL)

## Sources Consulted
- Ceph Health Checks documentation: https://docs.ceph.com/en/reef/rados/operations/health-checks/
- Ceph Adding/Removing Monitors documentation: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-mons/
- Ceph MonCommands.h source (command definitions): https://github.com/ceph/ceph/blob/main/src/mon/MonCommands.h
- Ceph Messenger v2 protocol documentation: https://docs.ceph.com/en/latest/rados/configuration/msgr2/
- Ceph centralized configuration management: https://docs.ceph.com/en/reef/rados/configuration/ceph-conf/

## Issues Found

1. **`ceph mon remove` is deprecated**: The post used `ceph mon remove a` which is a deprecated command. Changed to `ceph mon rm a` for manual deployments, and `ceph orch daemon rm mon.a` for orchestrator-managed deployments. Source: MonCommands.h marks `mon remove` with `FLAG(DEPRECATED)`.

2. **Monitor migration section was misleading**: The original text used `ceph mon add a <new-ip-address>:6789` as if it were a complete way to deploy a new monitor. In reality, `ceph mon add` only registers an address in the monmap — it does not deploy or start a monitor daemon. The section was rewritten to distinguish between Rook/cephadm deployments (which use `ceph orch daemon add mon`) and manual deployments (which require a multi-step bootstrap process involving `ceph-mon --mkfs`). This is especially important since the blog is in the Rook context where the orchestrator manages monitor lifecycle.

## Review Notes
- The default monitor port 6789 (v1 legacy) is still valid but modern Ceph (Nautilus+) monitors also listen on port 3300 (v2 msgr2 protocol). The migration section was rewritten to avoid hardcoding a specific port, sidestepping this issue.
- The Prometheus alert rule uses `node_filesystem_avail_bytes` with a static mountpoint filter. In containerized/Rook deployments, the monitor data may be on a PVC with a different mountpoint. The alert rule is correct for bare-metal deployments but may need adjustment for Rook. This was not changed as it is a deployment-specific consideration, not an error.
- The PVC patching approach assumes the StorageClass supports volume expansion (`allowVolumeExpansion: true`). This prerequisite is not mentioned but is a standard Kubernetes consideration rather than a blog error.
