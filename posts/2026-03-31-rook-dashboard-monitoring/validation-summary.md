# Validation Summary: How to Use the Rook-Ceph Dashboard for Cluster Monitoring

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- Ceph Dashboard (built-in web management UI)
- Kubernetes (kubectl, port-forward, secrets)
- Ceph REST API (dashboard API endpoints)

## Sources Consulted
- Rook Dashboard documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Monitoring/ceph-dashboard/
- Ceph Dashboard documentation: https://docs.ceph.com/en/latest/mgr/dashboard/
- Ceph tracker issue #36675 (implementation of `/api/health/minimal` endpoint)

## Issues Found
1. **Outdated `ac-user-set-password` command syntax**: The original command used the deprecated positional password argument: `ceph dashboard ac-user-set-password admin --force-password 'MyNewSecurePassword!'`. Since Ceph Nautilus 14.2.17, passing the password as a positional argument is deprecated and triggers warnings. Modern Ceph versions (Quincy, Reef) require the password to be passed via stdin using `-i -`. Fixed to: `bash -c "echo -n 'MyNewSecurePassword!' | ceph dashboard ac-user-set-password admin --force-password -i -"`.

## Review Notes
- The HTTP port 7000 claim (when SSL is disabled) is correct for Rook-deployed dashboards, though the Rook documentation primarily focuses on the HTTPS/8443 configuration. The 7000 port is set by Rook's operator code for non-SSL service exposure.
- Dashboard navigation paths (Cluster > OSDs, Block > Images, File > File Systems, Object > Gateways) are accurate for the current Ceph Dashboard UI but may shift slightly between major Ceph versions.
- The REST API examples (`POST /api/auth` and `GET /api/health/minimal`) are correct and use proper JWT bearer token authentication.
- The CephCluster CR configuration (`spec.dashboard.enabled: true`, `spec.dashboard.ssl: true`), service name (`rook-ceph-mgr-dashboard`), and secret name (`rook-ceph-dashboard-password`) are all confirmed against official Rook documentation.
- Health status values (HEALTH_OK, HEALTH_WARN, HEALTH_ERR) are the standard Ceph cluster health states.
