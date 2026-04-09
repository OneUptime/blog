# Validation Summary: How to Set Up an External Ceph Cluster with Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Kubernetes (StorageClasses, PVCs, CSI drivers, ConfigMaps, Secrets)
- cephadm (Ceph deployment tool)
- CSI (Container Storage Interface) for RBD and CephFS

## Sources Consulted
- Rook `create-external-cluster-resources.py` source code: https://github.com/rook/rook/blob/master/deploy/examples/create-external-cluster-resources.py
- Rook `cluster-external.yaml` example: https://github.com/rook/rook/blob/master/deploy/examples/cluster-external.yaml
- Rook `common-external.yaml` example: https://github.com/rook/rook/blob/master/deploy/examples/common-external.yaml
- Rook `import-external-cluster.sh` script: https://github.com/rook/rook/blob/master/deploy/examples/import-external-cluster.sh
- Rook External Storage Cluster documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/external-cluster/external-cluster/
- Rook Provider Export documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/external-cluster/provider-export/

## Issues Found

1. **Invalid `--output-directory` flag in Step 1**: The `create-external-cluster-resources.py` script does not have an `--output-directory` flag. The correct flag is `--output <filepath>` which writes to a specific file. Changed `--output-directory /tmp/` to `--output /tmp/external-cluster-env.sh`.

2. **Confused workflow between Python script and import script in Steps 2-3**: The blog originally conflated the output of `create-external-cluster-resources.py` with the `import-external-cluster.sh` script. The Python script generates environment variable exports; `import-external-cluster.sh` is a separate pre-existing script in the Rook repository that reads those environment variables and creates Kubernetes Secrets and ConfigMaps. Rewrote Steps 2 and 3 to correctly describe the two-script workflow: source the Python script output, then run `import-external-cluster.sh`.

3. **Incorrect `kubectl apply -f import-external-cluster.sh` in Step 3**: The original post suggested running `kubectl apply -f import-external-cluster.sh`, but this file is a bash script (not a YAML manifest) and cannot be applied with kubectl. Fixed to `bash import-external-cluster.sh`.

4. **Unnecessary `dataDirHostPath` in external CephCluster CRD**: The official `cluster-external.yaml` example does not include `dataDirHostPath` since external clusters do not manage local data directories. Removed this field from the CRD example.

5. **Missing `controller-expand-secret` in StorageClass**: The StorageClass had `allowVolumeExpansion: true` but was missing the required `csi.storage.k8s.io/controller-expand-secret-name` and `csi.storage.k8s.io/controller-expand-secret-namespace` parameters. Without these, volume expansion would fail. Added the missing parameters.

6. **Incomplete environment variable exports in Step 2**: The original list was missing several important variables exported by the script, including `ROOK_EXTERNAL_USER_SECRET`, `CSI_*_SECRET_NAME` variables (which define Ceph usernames), `MONITORING_ENDPOINT`, `RBD_POOL_NAME`, and `RGW_POOL_PREFIX`. Updated to include a more complete and accurate set of exports.

7. **Updated example output for `kubectl get cephcluster`**: Removed the `DATADIRHOSTPATH` value from the example output to match the CRD change, and updated the `PHASE` column to `Connected` which is more accurate for external clusters.

## Review Notes
- The blog uses namespace `rook-ceph` throughout. The official Rook examples use `rook-ceph-external` as the namespace for external cluster resources (to avoid conflict when an internal Rook cluster already uses `rook-ceph`). The namespace is configurable, so using `rook-ceph` is not wrong, but users with an existing internal Rook cluster should use a separate namespace.
- The MON data format shown (`a=192.168.1.10:6789`) reflects only the quorum leader as output by the Python script. In practice, the mon-endpoints ConfigMap may contain multiple MON entries once the cluster is operational.
- The "Updating MON Endpoints" section describes a manual approach (editing the ConfigMap and restarting CSI pods). The officially recommended approach is to re-run the `create-external-cluster-resources.py` and `import-external-cluster.sh` scripts, which will update all resources automatically. This is not incorrect but could be mentioned as an alternative.
