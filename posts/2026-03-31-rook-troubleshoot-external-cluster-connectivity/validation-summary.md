# Validation Summary: How to Troubleshoot External Cluster Connectivity in Rook

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (external/provider cluster mode)
- Kubernetes (kubectl, ConfigMaps, Secrets, CSI drivers)
- Ceph messenger protocols (v1 on port 6789, msgr2 on port 3300)

## Sources Consulted
- Rook official documentation on external clusters: https://rook.io/docs/rook/latest/CRDs/Cluster/external-cluster/
- Rook `create-external-cluster-resources.py` script usage: https://rook.io/docs/rook/latest/CRDs/Cluster/external-cluster/#extract-rook-ceph-data-from-the-provider-cluster
- Ceph documentation on monitor ports and messenger protocols: https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/
- Ceph authentication (cephx) documentation: https://docs.ceph.com/en/latest/rados/operations/user-management/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- **Missing namespace in Step 3 commands**: The `kubectl run` command in Step 3 correctly specified `-n rook-ceph-external`, but the subsequent `kubectl logs net-test` and `kubectl delete pod net-test` commands omitted the namespace flag. This would cause those commands to look for the pod in the default namespace instead of `rook-ceph-external`, resulting in "pod not found" errors. Fixed by adding `-n rook-ceph-external` to both the `logs` and `delete` commands.

## Review Notes
- The Ceph monitor ports listed (6789 for v1, 3300 for msgr2) are correct.
- The `create-external-cluster-resources.py` script name and flags (`--rbd-data-pool-name`, `--namespace`, `--format bash`) are accurate for current Rook releases.
- The CSI pod labels (`app=csi-rbdplugin-provisioner`, `app=csi-rbdplugin`) are correct for Rook's CSI deployment.
- The `ceph auth get client.healthchecker` command is the correct way to verify external cluster credentials on the provider side.
- The CephCluster status phases listed (Connecting, Connected, Error) are reasonable representations of actual Rook external cluster states.
- Step 6's `kubectl run` commands consistently omit the namespace (defaulting to `default`), which is acceptable since it's just a connectivity test pod and doesn't need to be in any particular namespace.
