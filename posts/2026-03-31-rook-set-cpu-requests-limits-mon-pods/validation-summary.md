# Validation Summary: How to Set CPU Requests and Limits for Rook-Ceph Mon Pods

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (CephCluster CRD)
- Kubernetes (resource requests/limits, pod scheduling, node affinity, pod anti-affinity)
- Ceph Monitors (MON daemons, quorum, elections)
- Prometheus (CPU throttling metrics)

## Sources Consulted
- Rook-Ceph CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Ceph Monitor documentation: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Kubernetes affinity/anti-affinity: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/

## Issues Found
- **"Map elections" terminology**: The post referred to "Map elections" as a reason for CPU spikes. The correct Ceph term is "leader elections" — MON daemons use Paxos to elect a leader among themselves. While MONs do maintain cluster maps, the election process is not called a "map election." Changed to "Leader elections."

## Review Notes
- The cgroup path `/sys/fs/cgroup/cpu/cpu.stat` in the CPU Throttling Alerts section is specific to cgroup v1. Most modern Kubernetes clusters (v1.25+) default to cgroup v2, where the equivalent path is `/sys/fs/cgroup/cpu.stat`. The post does not specify which cgroup version is assumed. This is not incorrect but may cause confusion on newer clusters.
- The CephCluster CRD YAML structure (`spec.resources.mon`) is correct for current Rook-Ceph versions.
- The placement configuration with nodeAffinity and podAntiAffinity is correctly structured.
- The production sizing guide provides reasonable starting values, though actual requirements depend heavily on workload characteristics.
- All kubectl commands and Ceph CLI commands are syntactically correct.
