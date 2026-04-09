# Validation Summary: How to Fix RECENT_CRASH Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (health checks, crash module, OSD/MGR daemon management)
- Rook (CephCluster CRD, Kubernetes-based Ceph deployment)
- Kubernetes (kubectl commands for pod logs and resource monitoring)

## Sources Consulted
- Ceph official documentation: crash module and `mgr/crash/warn_recent_interval` configuration (https://docs.ceph.com/en/latest/mgr/crash/)
- Ceph CLI reference for `ceph crash` subcommands (https://docs.ceph.com/en/latest/man/8/ceph/)
- Rook documentation: CephCluster CRD resource configuration (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Ceph configuration reference for `osd_memory_target` (https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/)

## Issues Found
1. **Misleading label for `ceph crash ls-new` command**: The section labeled "Check the crash archive:" was followed by the `ceph crash ls-new` command. However, `ceph crash ls-new` lists *unarchived* (new/unacknowledged) crashes, not the crash archive. The label was changed to "List unarchived (pending) crashes:" to accurately describe what the command does.

## Review Notes
- All Ceph CLI commands (`ceph health detail`, `ceph crash ls`, `ceph crash info`, `ceph crash archive`, `ceph crash archive-all`, `ceph crash ls-new`) are correct and current.
- The `mgr/crash/warn_recent_interval` default of 2 weeks (1209600 seconds) is accurate.
- The `osd_memory_target` value of 8589934592 (8 GiB) is a valid and reasonable configuration.
- The Rook CephCluster CRD YAML for `spec.resources.osd` is correctly structured.
- The `ceph config set mgr mgr/crash/warn_recent_interval 604800` command correctly sets the interval to 7 days.
- The example `ceph health detail` output is a simplified but reasonable representation of the actual output format.
