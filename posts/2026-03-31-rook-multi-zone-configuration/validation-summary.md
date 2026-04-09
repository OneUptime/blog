# Validation Summary: How to Set Up Rook-Ceph in a Multi-Zone Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system, Squid v19.2.0)
- Kubernetes (node labeling, topology spread constraints, pod scheduling)
- CRUSH maps (Ceph data placement algorithm)
- CephBlockPool (Rook CRD for block storage pools)
- Stretch clusters (Ceph multi-zone MON quorum)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Stretch Cluster documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/stretch-cluster/
- Rook CephBlockPool CRD documentation: https://www.rook.io/docs/rook/v1.17/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook stretch cluster example YAML: https://github.com/rook/rook/blob/master/deploy/examples/cluster-stretched.yaml
- Rook stretch cluster design doc: https://github.com/rook/rook/blob/master/design/ceph/ceph-stretch-cluster.md
- Rook pool.go source (CRUSH rule naming): https://github.com/rook/rook/blob/master/pkg/daemon/ceph/client/pool.go
- Ceph CRUSH map documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph v19.2.0 Squid release announcement: https://ceph.io/en/news/blog/2024/v19-2-0-squid-released/

## Issues Found

### 1. Misleading description of CephCluster topology configuration
- **What was wrong:** The section "Configuring the CephCluster with Zone Topology" stated "Set `topology` in the CephCluster spec to enable CRUSH map awareness of zones." However, no `topology` field is set in the YAML. The `topologySpreadConstraints` shown control Kubernetes pod scheduling, not CRUSH topology. CRUSH map awareness is automatic — Rook detects `topology.kubernetes.io/zone` node labels during OSD deployment and builds the CRUSH hierarchy from them.
- **What was changed:** Updated the intro text to accurately explain that Rook automatically detects zone labels for CRUSH topology, and that `topologySpreadConstraints` ensures even pod distribution across zones.
- **Why:** The original text implied a specific `topology` field needed to be set and conflated Kubernetes scheduling constraints with Ceph CRUSH topology configuration.

### 2. Incorrect CRUSH rule name in verification command
- **What was wrong:** The command `ceph osd crush rule dump zone-replicated-pool` used the pool name as the CRUSH rule name. When Rook creates a pool with a non-default failure domain (e.g., `zone`), it names the CRUSH rule by appending the failure domain: `zone-replicated-pool_zone`.
- **What was changed:** Updated the command to use `zone-replicated-pool_zone` and added a note explaining Rook's naming convention.
- **Why:** Using the pool name directly would result in a "rule not found" error since Rook appends the failure domain to the rule name.

## Review Notes
- The Ceph image `quay.io/ceph/ceph:v19.2.0` is valid (Squid release) but v19.2.1 has also been released. The post doesn't claim to use the latest, so this is fine.
- The stretch cluster configuration correctly nests `stretchCluster` under `spec.mon` and uses `mon.count: 5` (2 MONs per data zone + 1 arbiter = 5), matching the official Rook examples.
- The `kubectl drain` command correctly uses `--delete-emptydir-data` (the modern flag, replacing the deprecated `--delete-local-data` from Kubernetes <1.20).
- The CRUSH rule naming convention may vary between Rook versions. The blog already includes a `ceph osd pool get crush_rule` command before the `crush rule dump` command, so readers can verify the actual rule name in their environment.
