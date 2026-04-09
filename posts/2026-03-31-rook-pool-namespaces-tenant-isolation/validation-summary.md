# Validation Summary: How to Set Up Pool Namespaces for Tenant Isolation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RBD (RADOS Block Device)
- RBD Namespaces / RADOS Namespaces
- Kubernetes StorageClass and CSI
- ceph-csi RBD plugin
- CephBlockPool and CephBlockPoolRadosNamespace CRDs
- Ceph auth capabilities

## Sources Consulted
- Rook CephBlockPool CRD source code (`pkg/apis/ceph.rook.io/v1/types.go`) - confirmed `spec.parameters` is a valid `map[string]string` field
- Rook CephBlockPoolRadosNamespace CRD documentation (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-rados-namespace-crd/)
- ceph-csi ConfigMap sample (`deploy/csi-config-map-sample.yaml`) - confirmed `radosNamespace` is a ConfigMap field, NOT a StorageClass parameter
- ceph-csi RBD StorageClass example (`examples/rbd/storageclass.yaml`) - confirmed `volumeNamePrefix` is a naming prefix only
- Kubernetes kubectl documentation for `create secret generic` (https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/)
- Kubernetes issue #54200 discussing `--from-literal` stdin behavior

## Issues Found

1. **`volumeNamePrefix` mislabeled as "Namespace isolation"** (line 65): The comment `# Namespace isolation for tenant A` was incorrect. `volumeNamePrefix` only adds a string prefix to RBD image names (e.g., `tenant-a-<uuid>` instead of `csi-vol-<uuid>`). It provides zero actual isolation - all images remain in the same pool and default RADOS namespace, accessible to any client with pool-level access. Changed comment to `# Name prefix only - does not provide RBD namespace isolation`.

2. **Non-existent "CSI RBD namespace parameter" in StorageClass** (lines 69-78): The post claimed "use the CSI RBD namespace parameter" and showed a StorageClass snippet with only per-tenant secret references. There is no StorageClass parameter for specifying an RBD/RADOS namespace - the `radosNamespace` field exists only in the ceph-csi ConfigMap, not in StorageClass parameters. The correct Rook approach is to create a `CephBlockPoolRadosNamespace` CRD per tenant, which generates a namespace-specific `clusterID` that the StorageClass references. Replaced the incomplete snippet with the correct CephBlockPoolRadosNamespace CRD and a complete StorageClass example referencing the namespace-specific clusterID.

3. **Broken secret creation command** (lines 98-103): `--from-literal=key=-` does NOT read from stdin. The `--from-literal` flag treats the value after `=` as a literal string, so this command would create a secret with the value "-" instead of the actual Ceph auth key. Changed to `--from-file=key=/dev/stdin` which correctly reads the piped output from `ceph auth get-key`. Also removed the `-it` flags from `kubectl exec` in this context since piped commands are non-interactive.

## Review Notes
- `spec.parameters.pg_autoscale_mode: "on"` in the CephBlockPool CRD was verified as valid - Rook's `PoolSpec` defines `Parameters` as a `map[string]string` that gets applied via `ceph osd pool set`. However, PG autoscaling is enabled by default in Ceph Nautilus (14.x) and later, so this parameter is only needed if it was previously disabled.
- The `CephBlockPoolRadosNamespace` CRD was introduced in Rook v1.9.0. Users on older Rook versions would need to manually configure the ceph-csi ConfigMap to add namespace-specific clusterID entries.
- The Ceph auth capability syntax (`osd 'profile rbd pool=shared-pool namespace=tenant-a'`) is correct for scoping users to specific RBD namespaces.
- The `rbd namespace create/ls` CLI commands are correct.
- The verification commands using `rbd --id tenant-b ls shared-pool/tenant-a` correctly demonstrate how to test namespace isolation.
