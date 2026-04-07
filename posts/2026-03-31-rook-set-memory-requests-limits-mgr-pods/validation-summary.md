# Validation Summary: How to Set Memory Requests and Limits for Rook-Ceph MGR Pods

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph Manager (MGR) daemon
- Kubernetes resource requests and limits
- Prometheus / PromQL
- kubectl CLI

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook resource configuration examples: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/#cluster-wide-resources-configuration-settings
- Ceph MGR module documentation: https://docs.ceph.com/en/latest/mgr/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- cAdvisor / kubelet metrics reference for container_memory_working_set_bytes and container_spec_memory_limit_bytes

## Issues Found
No technical issues found.

## Review Notes
- The `spec.resources.mgr` and `spec.resources.mgr-sidecar` paths in the CephCluster CRD are correct for configuring MGR pod resources.
- MGR pod names in Rook follow the pattern `rook-ceph-mgr-a-<hash>` (using letter identifiers like `a`, `b`), not node names. The placeholder `<node>` in the example commands is slightly misleading but functional since users will substitute actual pod names from `kubectl get pods` output.
- The PromQL queries use standard cAdvisor metrics and are syntactically correct.
- The Ceph CLI commands (`ceph mgr module disable`, `ceph mgr module ls`, `ceph mgr stat`) are all valid.
- Memory sizing recommendations are reasonable ballpark figures; actual needs will vary by workload and enabled modules.
