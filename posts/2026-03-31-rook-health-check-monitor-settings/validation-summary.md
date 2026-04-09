# Validation Summary: How to Configure Health Check Settings for Monitors in Rook

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system, specifically monitor daemons)
- Kubernetes (CRDs, kubectl, liveness probes)

## Sources Consulted
- Rook CephCluster CRD Go type definitions: `pkg/apis/ceph.rook.io/v1/types.go` — confirmed `HealthCheckSpec` struct has `disabled` (bool), `interval` (*metav1.Duration), and `timeout` (string) fields, and `DaemonHealthSpec.Monitor` maps to JSON tag `mon`
- Rook monitor health check logic: `pkg/operator/ceph/cluster/mon/health.go` — confirmed default `HealthCheckInterval = 45 * time.Second` and `MonOutTimeout = 10 * time.Minute`, and that `failMon()` is triggered when the timeout is exceeded
- Rook example cluster manifest: https://github.com/rook/rook/blob/master/deploy/examples/cluster.yaml — confirmed `healthCheck.daemonHealth.mon` structure with `disabled` and `interval` fields
- Rook official CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/ — confirmed monitor health check configuration including timeout behavior

## Issues Found
No technical issues found.

## Review Notes
- The official Rook example `cluster.yaml` only shows `disabled` and `interval` for `daemonHealth.mon` (omitting `timeout`), but the Go types and operator source code confirm `timeout` is a valid and supported field with a 600s default. The blog correctly documents this field.
- The environment variables `ROOK_MON_HEALTHCHECK_INTERVAL` and `ROOK_MON_OUT_TIMEOUT` can also override these settings, which the blog does not mention. This is acceptable as those are operator-level overrides not typically used by end users.
- Setting `timeout` to `0` completely disables monitor failover (per the source code comment), which could be mentioned as an alternative to `disabled: true` for maintenance scenarios, but this is an enhancement suggestion rather than an error.
