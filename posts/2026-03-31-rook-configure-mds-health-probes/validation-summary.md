# Validation Summary: How to Configure MDS Health Probes in Rook

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph MDS (Metadata Server for CephFS)
- CephFilesystem CRD (ceph.rook.io/v1)
- Kubernetes health probes (startup, liveness)
- CephFS

## Sources Consulted
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Rook CRD Specification (types.go): https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go
- Kubernetes probe configuration docs: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes API reference for Probe spec: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#probe-v1-core
- Cross-referenced with validated blog posts: rook-liveness-startup-probes, rook-rgw-health-probes, rook-configure-mds-standby-replay-cephfs, rook-configure-resource-limits-mds-pods

## Issues Found

### 1. Description incorrectly mentioned "readiness" probes instead of "startup" probes
**What was wrong:** The post description (line 7) said "liveness and readiness health probes" and the overview (line 13) referenced monitoring "readiness and liveness." However, the CephFilesystem CRD's `metadataServer.healthCheck` section exposes `startupProbe` and `livenessProbe` — not `readinessProbe`. The post's own YAML examples correctly show only `startupProbe` and `livenessProbe`, contradicting the description.
**What was changed:** Updated the description from "liveness and readiness" to "startup and liveness." Updated the overview paragraph to explicitly reference "startup and liveness health probes" instead of "readiness and liveness."
**Why:** This is the same class of error found and fixed in the RGW health probes post. Mentioning readiness probes when the CRD doesn't support them for MDS would mislead operators into trying to configure a non-existent probe type.

## Review Notes
- The `successThreshold: 1` on the liveness probe is technically redundant since Kubernetes requires this value to be 1 for liveness probes (it's the default and only valid value). It's not wrong, but could be omitted for brevity.
- The CephFilesystem CRD structure (`spec.metadataServer.healthCheck.startupProbe` and `spec.metadataServer.healthCheck.livenessProbe`) with `disabled`/`probe` fields is correct per Rook documentation.
- The `activeStandby: true`, `preserveFilesystemOnDelete: true`, and `activeCount` fields are all valid CephFilesystem CRD fields, confirmed across multiple validated posts.
- The pod label `app=rook-ceph-mds` is the correct label selector for Rook MDS pods, confirmed in multiple validated posts.
- The `ceph mds stat` and `ceph fs status myfs` commands are valid Ceph CLI commands for checking MDS daemon status.
- All kubectl commands use correct syntax and flag combinations.
- The advice about tuning `initialDelaySeconds` and `failureThreshold` for standby-replay MDS is sound — standby-replay MDS daemons do need more time during journal replay.
