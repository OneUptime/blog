# Validation Summary: How to Migrate Ceph from VM-Based to Container-Based Deployment

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Ceph (distributed storage)
- Rook (Ceph operator for Kubernetes)
- Kubernetes
- Rook CephCluster CRD
- Rook External Cluster Mode
- Rook CSI (Container Storage Interface)

## Sources Consulted
- Rook GitHub repository (https://github.com/rook/rook) — verified default branch (`master`), file paths for deployment manifests, and `create-external-cluster-resources.py` script flags
- Rook Quickstart documentation (https://rook.io/docs/rook/latest/Getting-Started/quickstart/) — confirmed required deployment manifests: `crds.yaml`, `common.yaml`, `operator.yaml`
- Rook CephCluster CRD documentation (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/) — confirmed `dataDirHostPath` semantics (stores Rook's own data, does not adopt existing clusters)
- Rook External Cluster documentation (provider-export.md, consumer-import.md) — confirmed script flags and correct import workflow
- Ceph source code (`OSDMonitor.cc`, `doc/man/8/ceph.rst`) — confirmed `ceph osd purge` syntax and `--yes-i-really-mean-it` flag
- quay.io/ceph/ceph image tags — confirmed `v18.2.0` is a valid tag (Ceph Reef)

## Issues Found

### 1. CRITICAL: False claim that Rook can adopt an existing Ceph cluster via `dataDirHostPath`
- **What was wrong:** The post claimed Rook supports "importing an existing Ceph cluster" by pointing `dataDirHostPath` to the existing Ceph data directory (`/var/lib/ceph`). This is incorrect — `dataDirHostPath` only specifies where Rook stores its own configuration and data. Rook has no feature to adopt or import existing non-Rook Ceph daemons. Pointing it at an existing Ceph data directory would cause conflicts.
- **What was changed:** Rewrote the section heading and description to accurately state that Rook deploys a new cluster on existing nodes, not an adoption. Changed `dataDirHostPath` from `/var/lib/ceph` to `/var/lib/rook` (Rook's default). Removed the misleading `external.enable: false` field (unnecessary since false is the default). Added guidance to use separate disks from the existing cluster. Removed the incorrect keyring copy step (Step 3), which suggested copying existing keyrings to Rook's directory — Rook generates its own keyrings.
- **Why:** The Rook CRD docs explicitly state that `dataDirHostPath` must be cleaned between cluster deployments, contradicting the adoption claim. The only supported way to connect Rook to a pre-existing cluster is external cluster mode.

### 2. HIGH: Missing `common.yaml` in Rook operator deployment
- **What was wrong:** The post only deployed `crds.yaml` and `operator.yaml`. The official Rook quickstart requires `common.yaml` as well, which creates the namespace, service accounts, RBAC roles, and cluster roles needed by the operator.
- **What was changed:** Added `kubectl apply -f .../common.yaml` between the CRDs and operator manifests.
- **Why:** Without `common.yaml`, the operator deployment will fail due to missing RBAC permissions and namespace.

### 3. MEDIUM: Incorrect external cluster script usage (`| bash`)
- **What was wrong:** The post piped the output of `create-external-cluster-resources.py --format=bash` directly to `| bash`. The `--format=bash` output produces `export VAR=value` statements. Piping to `| bash` runs these in a subshell where the exports are lost, making them unavailable for the subsequent `import-external-cluster.sh` script.
- **What was changed:** Removed `| bash` piping. Added instructions to copy the export statements into the current shell and then source `import-external-cluster.sh`, matching the official Rook documentation workflow.
- **Why:** The official Rook docs describe a two-step process: source the exports, then run the import script.

### 4. LOW: Migration strategy section inaccurately described the approach
- **What was wrong:** The strategy section stated the "safest migration path avoids moving data" by adopting the cluster into Rook — reinforcing the incorrect adoption claim.
- **What was changed:** Rewrote to describe the two actual approaches: external cluster mode (for CSI access without containerizing) and new Rook-managed cluster with incremental migration.
- **Why:** Aligns the strategy section with the corrected technical content.

## Review Notes
- The Ceph image `quay.io/ceph/ceph:v18.2.0` is valid but outdated. Ceph Reef has progressed to v18.2.8+, and current Rook releases primarily support Ceph Squid (v19.x). The post does not specify a Rook version, so v18.2.0 may work with older Rook releases. Left as-is since the post doesn't claim to target a specific Rook version.
- The latest Rook quickstart also includes `csi-operator.yaml` as a deployment manifest. This was not added since it may be a newer addition and the post doesn't target a specific Rook release.
- The `ceph osd purge 3 --yes-i-really-mean-it` command syntax is confirmed correct.
- The incremental daemon migration section (MGR → MON → OSD) describes a sound general strategy, though the specific steps would vary depending on cluster configuration.
- Using `master` branch URLs for Rook manifests works but is not recommended for production — tagged releases are more stable. Left as-is since this is a common pattern in tutorial posts.
