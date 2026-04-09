# Validation Summary: How to Manage Multiple External Ceph Clusters with Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (external cluster mode)
- Kubernetes (CRDs, Secrets, ConfigMaps, StorageClasses, PVCs)
- Ceph CSI Driver (RBD provisioner and node plugins)
- Kustomize (for multi-cluster configuration management)

## Sources Consulted
- Rook source code on GitHub (`master` branch): `pkg/apis/ceph.rook.io/v1/types.go` for CephCluster CR field validation
- Rook source code: `pkg/operator/ceph/csi/spec.go` for CSI ConfigMap name and key constants
- Rook source code: `deploy/examples/operator.yaml` for `ROOK_CURRENT_NAMESPACE_ONLY` default value
- Rook source code: `deploy/examples/cluster-external.yaml` for external cluster CR example
- Rook source code: `deploy/examples/common-external.yaml` for external cluster RBAC requirements
- Rook source code: `deploy/examples/import-external-cluster.sh` for secret names and key names

## Issues Found

1. **Incorrect claim about default namespace watching**: The post stated "By default, the Rook operator watches a single namespace." In reality, `ROOK_CURRENT_NAMESPACE_ONLY` defaults to `"false"`, meaning the operator watches all namespaces by default. This also contradicted the Prerequisites section which correctly stated "manages all namespaces by default." Fixed Step 1 title and description to reflect this accurately.

2. **Incorrect `rook-ceph-mon` secret keys**: The post used `mon_host` and `fsid` as keys in the `rook-ceph-mon` secret. The `mon_host` key does not exist in Rook's expected schema. The correct keys are `cluster-name`, `fsid`, `admin-secret`, and `mon-secret`. Monitor endpoints belong in a separate `rook-ceph-mon-endpoints` ConfigMap with keys `data` (format: `name=ip:port,...`), `mapping`, and `maxMonId`. Fixed both primary and secondary secret definitions and added the required ConfigMap resources.

3. **Incorrect CSI config ConfigMap key**: The post used `config.json` as the data key in the `rook-ceph-csi-config` ConfigMap. The correct key is `csi-cluster-config-json` (defined as `ConfigKey` in `pkg/operator/ceph/csi/spec.go`). Fixed the key name.

4. **Missing RBAC setup for external namespaces**: The post did not mention creating the required RBAC resources (ServiceAccounts, Roles, RoleBindings) from Rook's `common-external.yaml` for each external cluster namespace. Without these, the operator cannot manage CephCluster CRs in the new namespaces. Added instructions to apply these RBAC resources in Step 1.

## Review Notes
- Port 6789 (msgr1) used for monitor endpoints is correct but modern Ceph clusters (Nautilus+) prefer port 3300 (msgr2). The post's usage is valid for compatibility but readers with newer clusters may want to use msgr2 addresses.
- With the CSI Operator enabled (`ROOK_USE_CSI_OPERATOR: "true"`, which is the default in recent Rook versions), the `rook-ceph-csi-config` ConfigMap may be managed by the operator automatically. Manual creation could conflict with operator management. Readers should verify their CSI operator configuration.
- The Rook `import-external-cluster.sh` script automates much of the secret and ConfigMap creation shown in this post. For production use, running that script is recommended over manual resource creation.
