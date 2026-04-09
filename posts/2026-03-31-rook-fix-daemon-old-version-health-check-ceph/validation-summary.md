# Validation Summary: How to Fix DAEMON_OLD_VERSION Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (Quincy / 17.2.x series)
- Rook-Ceph (Kubernetes operator for Ceph)
- Kubernetes (kubectl CLI)
- Prometheus (alerting rules)
- systemd (bare metal service management)

## Sources Consulted
- Ceph official documentation on health checks and the `DAEMON_OLD_VERSION` warning
- Ceph `ceph versions` and `ceph tell` CLI command references
- Rook-Ceph CephCluster CRD specification for `spec.cephVersion.image`
- Ceph MGR Prometheus module exported metrics (confirming `ceph_health_detail` is the correct metric, not `ceph_daemon_versions`)
- Other validated blog posts in this repository that use `ceph_health_detail{name="..."}` for Ceph health check Prometheus alerts

## Issues Found
1. **Incorrect Prometheus metric name in alert rule**: The Prometheus alert used `count(ceph_daemon_versions) > 1` as the expression. The metric `ceph_daemon_versions` is not a standard metric exported by the Ceph MGR Prometheus module. Changed to `ceph_health_detail{name="DAEMON_OLD_VERSION"} > 0`, which uses the real `ceph_health_detail` metric with the appropriate health check name label. This is consistent with how other Ceph health check alerts are structured across this blog.

## Review Notes
- The `apt install` command in the bare metal section does not pin to a specific Ceph version. This is acceptable since users are expected to have the correct Ceph repository configured, but readers should be aware that the installed version depends on their apt sources.
- The post covers Ceph Quincy (17.2.x) examples. The same commands and concepts apply to other recent Ceph releases (Pacific, Reef), though image tags and version numbers would differ.
- All CLI commands (`ceph health detail`, `ceph versions`, `ceph tell`, `kubectl patch`) are syntactically correct and use proper flags.
- The Rook CephCluster patch command correctly targets `spec.cephVersion.image`, which is the right field in the CRD.
