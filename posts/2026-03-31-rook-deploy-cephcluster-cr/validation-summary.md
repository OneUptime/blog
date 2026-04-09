# Validation Summary: How to Deploy Rook-Ceph with a CephCluster Custom Resource

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes storage operator)
- Ceph (distributed storage system, Reef v18.2.0)
- Kubernetes (CRDs, pod scheduling, resource management)
- CephCluster Custom Resource (ceph.rook.io/v1)

## Sources Consulted
- Rook official documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook CephCluster CRD source (pkg/apis/ceph.rook.io/v1/types.go): https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go
- Rook example cluster.yaml: https://github.com/rook/rook/blob/master/deploy/examples/cluster.yaml
- Ceph documentation on monitor quorum: https://docs.ceph.com/en/reef/rados/operations/add-or-rm-mons/
- Kubernetes API reference for affinity/anti-affinity scheduling

## Issues Found
No technical issues found.

## Review Notes
- The `monitoring.interval: 10s` field controls the Prometheus rules evaluation interval, not the scrape interval. The post does not explicitly claim what it does, so this is not an error, but readers may benefit from a clarifying comment in the YAML.
- The Ceph image `v18.2.0` (Reef) is a valid and stable release. Newer point releases in the v18.2.x series may be available; readers should check for the latest patch version.
- The `mgr.count: 2` configuration is correct for HA (one active, one standby manager).
- All resource key names in the `resources` section (`mgr`, `mon`, `osd`, `prepareosd`, `mgr-sidecar`, `crashcollector`, `logcollector`, `cleanup`) match the Rook CRD exactly.
- The placement section correctly demonstrates both cluster-wide (`all`) and daemon-specific (`mon`) scheduling rules using standard Kubernetes affinity constructs.
- The cleanup policy `sanitizeDisks` values (`method: quick`, `dataSource: zero`) are correct; valid alternatives are `method: complete` and `dataSource: random`.
