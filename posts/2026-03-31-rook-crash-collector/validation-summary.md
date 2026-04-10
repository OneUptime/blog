# Validation Summary: How to Configure the Crash Collector in Rook-Ceph

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system)
- Kubernetes (container orchestration)
- Prometheus (monitoring and alerting)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook GitHub repository (`deploy/examples/monitoring/` directory)
- Ceph crash module documentation: https://docs.ceph.com/en/latest/rados/operations/crash/
- Ceph Prometheus alert rules (ceph-mixin): https://github.com/ceph/ceph/tree/main/monitoring/ceph-mixin
- Rook GitHub issues #9324, #4647, #5000 (crash collector architecture discussion)

## Issues Found

1. **Crash collector described as DaemonSet (multiple locations)**: The post incorrectly described the crash collector as a "DaemonSet." Rook actually deploys crash collectors as individual Deployments (one per node with node affinity), not as a DaemonSet. Fixed all references throughout the post (description, mermaid diagram, disabling section, pod status section, and summary).

2. **Resource key casing (line 143)**: The resource key was `crashCollector` (camelCase) under `spec.resources`. The correct key per the Rook CRD is `crashcollector` (all lowercase). Changed to `crashcollector`.

3. **Prometheus alert severity (line 104)**: The alert had `severity: warning`. The official Ceph mixin alert rules define `CephDaemonCrash` with `severity: critical`. Changed to `critical`.

4. **Monitoring rules file path (line 113)**: The command referenced `rook/deploy/examples/monitoring/prometheus-ceph-rules.yaml`, which does not exist in the Rook repository. The correct file for in-cluster Prometheus rules is `deploy/examples/monitoring/localrules.yaml`. Updated the path.

## Review Notes
- The Ceph image `quay.io/ceph/ceph:v19.2.0` (Squid release) is valid and current.
- All `ceph crash` CLI commands (`ls`, `info`, `archive`, `archive-all`) are correct.
- The CRD fields `spec.crashCollector.disable` and `spec.crashCollector.daysToRetain` are correct.
- The crash data path `/var/lib/ceph/crash/<id>` is correct per Ceph documentation.
- The pod label `app=rook-ceph-crashcollector` is correct for selecting crash collector pods.
- For external cluster setups, users should use `externalrules.yaml` instead of `localrules.yaml`.
