# Validation Summary: How to Configure Authentication for External Ceph Clusters in Rook

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Rook (v1.14)
- Ceph (Quincy+)
- Kubernetes
- Cephx authentication
- CSI (Container Storage Interface) for RBD and CephFS

## Sources Consulted
- Rook official documentation: external cluster provider export (https://rook.io/docs/rook/latest/CRDs/Cluster/external-cluster/provider-export/)
- Rook official documentation: external cluster consumer import (https://rook.io/docs/rook/latest/CRDs/Cluster/external-cluster/consumer-import/)
- Rook official documentation: advanced external cluster configuration (https://rook.io/docs/rook/latest/CRDs/Cluster/external-cluster/advance-external/)
- Rook `create-external-cluster-resources.py` script source (release-1.14 branch) for auth caps and argument definitions
- Rook `import-external-cluster.sh` script source (release-1.14 branch) for exact secret/ConfigMap names and field structures
- Rook `cluster-external.yaml` example (release-1.14 branch) for CephCluster CR spec

## Issues Found

1. **Incorrect cephx/caps terminology (Introduction)**: The post stated "Ceph uses the CAPS (Cephx) authentication system," conflating two distinct concepts. Cephx is the authentication protocol; caps (capabilities) are the authorization mechanism. Fixed to: "Ceph uses the cephx authentication protocol, and access is controlled through capabilities (caps)."

2. **Misleading architecture diagram labels**: The diagram labeled outputs as "Admin Keyring," "Mon Keyring," and "OSD Keyring." The keyrings created are actually for the operator, RBD CSI, and CephFS CSI — not for mon/OSD daemons. Fixed labels to "Operator Keyring," "RBD CSI Keyrings," and "CephFS CSI Keyrings."

3. **Incorrect rook-ceph-mon secret fields**: The post used `mon_host` and `fsid` as the only fields in the `rook-ceph-mon` secret. Rook expects a secret of type `kubernetes.io/rook` with fields: `cluster-name`, `fsid`, `admin-secret`, `mon-secret`, `ceph-username`, and `ceph-secret`. Fixed to match the official import script structure.

4. **Missing rook-ceph-mon-endpoints ConfigMap**: Monitor endpoints belong in a separate `rook-ceph-mon-endpoints` ConfigMap (with `data`, `mapping`, and `maxMonId` fields), not in the mon secret. Added the ConfigMap with the correct format (`a=IP:PORT,b=IP:PORT,c=IP:PORT`).

5. **Non-existent rook-ceph-admin-keyring secret**: The post created a separate `rook-ceph-admin-keyring` secret with a full keyring block. This secret does not exist in Rook's expected workflow — operator credentials are stored in the `rook-ceph-mon` secret via the `ceph-username` and `ceph-secret` fields. Removed and consolidated into the corrected `rook-ceph-mon` secret.

6. **Misleading "base64-encoded" description (Step 2)**: The description said "Extract the base64-encoded key strings needed for Kubernetes secrets." While Ceph keys happen to be base64 strings, calling them "base64-encoded key strings needed for Kubernetes secrets" implies additional encoding is needed. Since `stringData` handles encoding automatically, changed to "Extract the key strings needed for Kubernetes secrets."

7. **Toolbox troubleshooting command errors**: The command used namespace `rook-ceph` and non-standard paths (`/etc/ceph/external.conf`, `/etc/ceph/external.keyring`). For an external cluster, the toolbox should be in the `rook-ceph-external` namespace, and it uses the standard Ceph config paths automatically. Fixed namespace and removed non-standard path flags.

8. **Wrong command for key rotation (Security Best Practices)**: The post recommended `ceph auth caps` for key rotation, but that command changes capabilities, not keys. Fixed to recommend recreating users with `ceph auth get-or-create` and updating the corresponding Kubernetes secrets.

## Review Notes
- The `dataDirHostPath: /var/lib/rook` field in the CephCluster CR is not present in Rook's official `cluster-external.yaml` example. It is harmless for external clusters but unnecessary since no local data directory is used. Left as-is since it does not cause errors.
- The Ceph user names in the blog (e.g., `client.rook-csi-rbd-node`) differ from the default names created by the official `create-external-cluster-resources.py` script (e.g., `client.csi-rbd-node` without the `rook-` prefix). The blog's names are valid custom names, but readers should be aware that the import script uses different defaults.
- The CSI secret field names (`userID`/`userKey` for RBD, `adminID`/`adminKey` for CephFS) are correct and match the official import script.
- The post correctly recommends the `create-external-cluster-resources.py` script as the preferred approach (Step 4), which mitigates most manual configuration issues.
