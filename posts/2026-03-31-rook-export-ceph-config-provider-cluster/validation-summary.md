# Validation Summary: How to Export Ceph Config from a Provider Cluster for Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system)
- `create-external-cluster-resources.py` (Rook's external cluster export script)
- Kubernetes Secrets and CRDs
- CephFS, RBD (RADOS Block Device)

## Sources Consulted
- Rook official documentation — provider export page: https://rook.io/docs/rook/latest/ (CRDs > Cluster > External Cluster > Export config from the Ceph provider cluster)
- Rook source script: https://raw.githubusercontent.com/rook/rook/master/deploy/examples/create-external-cluster-resources.py — verified argparse definitions and processing logic directly
- Rook GitHub repository: https://github.com/rook/rook/tree/master/deploy/examples/external/ — confirmed script path and symlink structure

## Issues Found

### 1. Step 4 — `--rbd-data-pool-name` does not accept comma-separated multiple pool names
- **What was wrong**: The post claimed you could pass multiple pools as `--rbd-data-pool-name pool1,pool2,pool3`. In reality, this flag accepts only a single pool name string. The argparse definition has no comma-parsing logic. Only `--topology-pools` explicitly supports comma-separated lists (processed via `convert_comma_separated_to_array()`).
- **What was changed**: Replaced the incorrect comma-separated example with the correct approach: run the script separately for each pool. Also added an example using `--topology-pools` for topology-constrained multi-pool environments, including the required `--topology-failure-domain-label` and `--topology-failure-domain-values` flags.
- **Why**: Running the original command would treat `pool1,pool2,pool3` as a single literal pool name, causing the script to fail when it cannot find a pool with that name in Ceph.

## Review Notes
- The script download URL (`deploy/examples/create-external-cluster-resources.py`) is correct — the `deploy/examples/external/` directory contains only a reference back to this path.
- The sample environment variable output is accurate but intentionally incomplete (marked as "Sample output"). The actual script outputs additional variables like `MONITORING_ENDPOINT`, `MONITORING_ENDPOINT_PORT`, `RBD_POOL_NAME`, `RGW_POOL_PREFIX`, `ROOK_EXTERNAL_DASHBOARD_LINK`, etc. This is acceptable for a tutorial.
- The Ceph user names (`client.healthchecker`, `client.csi-rbd-provisioner`, `client.csi-rbd-node`) are verified correct. The script also creates `client.csi-cephfs-provisioner` and `client.csi-cephfs-node` when CephFS is configured, which are not mentioned but not needed for the scope of this post.
- The `--v2-port-enable` flag for msgr2 (port 3300) is not mentioned; the example uses the traditional msgr1 port 6789 which is still valid.
