# Validation Summary: How to Fix MON_MSGR2_NOT_ENABLED Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (msgr2 protocol, monitor configuration, health checks)
- Rook-Ceph (CephCluster CRD, Kubernetes operator)
- Kubernetes (kubectl patching)
- systemd (service management for bare-metal Ceph)

## Sources Consulted
- Ceph Messenger v2 documentation: https://docs.ceph.com/en/latest/rados/configuration/msgr2/
- Ceph Health Checks documentation: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph Operating a Cluster documentation: https://docs.ceph.com/en/latest/rados/operations/operating/
- Ceph source code (`src/mon/HealthMonitor.cc`, `src/common/options/global.yaml.in`)

## Issues Found
1. **Incorrect health output summary line**: The example `ceph health detail` output showed `HEALTH_WARN mons are allowing insecure global_id reclaim` as the summary line. This message belongs to the `AUTH_INSECURE_GLOBAL_ID_RECLAIM` health check (related to CVE-2021-20288), not `MON_MSGR2_NOT_ENABLED`. Fixed the summary line to `HEALTH_WARN 3 monitors have not enabled msgr2`, which is the correct summary message for the `MON_MSGR2_NOT_ENABLED` health check as confirmed by the Ceph source code in `HealthMonitor.cc`.

## Review Notes
- The description of msgr2 modes is slightly ambiguous: "supports both encryption and authentication modes (`crc` and `secure`)" could be read as implying both modes provide encryption. In reality, `crc` mode provides authentication and integrity checking (CRC32C) but no encryption; only `secure` mode provides full encryption. This is a minor wording ambiguity rather than a clear error.
- The `ms_bind_msgr2` option defaults to `true` since Nautilus. Setting it in `ceph.conf` is only necessary if it was explicitly disabled or on a pre-Nautilus upgrade. The post correctly frames this as an "ensure" step.
- For complete secure mode enforcement, monitor-specific options (`ms_mon_cluster_mode`, `ms_mon_service_mode`, `ms_mon_client_mode`) could also be set. The post covers the general options which is sufficient for most deployments.
- The `requireMsgr2: true` Rook setting requires kernel 5.11+ or CentOS 8.4+, which the post does not mention. This could be a useful addition for future updates.
