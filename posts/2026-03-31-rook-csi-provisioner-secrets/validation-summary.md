# Validation Summary: How to Set Up CSI Provisioner Secrets for RBD in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph orchestrator for Kubernetes)
- Ceph RBD (RADOS Block Device)
- Kubernetes CSI (Container Storage Interface)
- Kubernetes Secrets
- Kubernetes StorageClass
- Kubernetes VolumeSnapshotClass

## Sources Consulted
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- ceph-csi RBD secret examples: https://github.com/ceph/ceph-csi/blob/devel/examples/rbd/secret.yaml
- Rook Ceph CSI drivers documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Rook Block Storage (RBD) documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Kubernetes CSI specification for secret parameters: https://kubernetes-csi.github.io/docs/
- Ceph authentication documentation: https://docs.ceph.com/en/latest/rados/operations/user-management/

## Issues Found
- **Incorrect Secret type `kubernetes.io/rook`**: The YAML manifests and kubectl commands used `type: kubernetes.io/rook` for the Kubernetes Secrets. The `kubernetes.io/` prefix is reserved for Kubernetes built-in secret types (e.g., `kubernetes.io/tls`, `kubernetes.io/dockerconfigjson`). Neither Rook nor ceph-csi defines or requires a `kubernetes.io/rook` type. The Rook operator and official ceph-csi examples use `Opaque` (the default type). Fixed the YAML manifests to use `type: Opaque` and removed the `--type="kubernetes.io/rook"` flag from kubectl commands (which defaults to `Opaque`).

## Review Notes
- The CSI secret parameter names (`csi.storage.k8s.io/provisioner-secret-name`, `csi.storage.k8s.io/node-stage-secret-name`, etc.) are all correct and current.
- The secret data field names (`userID`, `userKey`) match what ceph-csi expects.
- The Ceph auth capabilities (`profile rbd` for mon/osd, `allow rw` for mgr) are appropriate minimum privileges.
- The secret rotation procedure in Step 7 correctly handles base64 encoding for the JSON patch against `/data/` fields.
- The VolumeSnapshotClass configuration and snapshotter secret references are correct.
- The mermaid sequence diagram accurately represents the CSI provisioning and node-stage flow.
