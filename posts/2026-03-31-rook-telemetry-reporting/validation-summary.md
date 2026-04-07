# Validation Summary: How to Configure Telemetry Reporting in Rook-Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph telemetry module (mgr module)
- kubectl (Kubernetes CLI)
- Ceph CLI (`ceph telemetry`, `ceph config set`)

## Sources Consulted
- Ceph official documentation on the telemetry module: https://docs.ceph.com/en/latest/mgr/telemetry/
- Ceph CLI reference for `ceph telemetry` subcommands
- Rook documentation on the Ceph toolbox: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found
No technical issues found.

## Review Notes
- The post lists four telemetry channels (`channel_basic`, `channel_crash`, `channel_device`, `channel_ident`). Later Ceph releases (Quincy+) also include `channel_perf` for performance counter data. The post uses the word "include" so this is not an error, but authors may want to add `channel_perf` in a future update.
- The `--license sharing-1-0` flag requirement was introduced in Ceph Pacific and remains current. The post correctly includes it.
- All `kubectl exec` commands correctly target `deploy/rook-ceph-tools` in the `rook-ceph` namespace, which is the standard Rook toolbox deployment.
