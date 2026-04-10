# Validation Summary: How to Configure CSI RBD Node Stage Secret in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (RBD / RADOS Block Device)
- Kubernetes (StorageClass, Secrets, CSI)
- CSI (Container Storage Interface) RBD driver
- kubectl CLI

## Sources Consulted
- Rook official documentation on CSI RBD configuration: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Ceph documentation on auth management (`ceph auth` commands): https://docs.ceph.com/en/latest/rados/operations/user-management/
- Kubernetes CSI documentation on secret-based authentication: https://kubernetes-csi.github.io/docs/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/

## Issues Found

### 1. Key rotation command does not actually rotate the key
- **What was wrong:** The "Rotate the Node Stage Secret" section used `ceph auth get-or-create` to "regenerate" the key. However, `ceph auth get-or-create` returns the existing key unchanged if the entity already exists — it does not generate a new key. This means the rotation procedure as written would have no effect.
- **What was changed:** Added `ceph auth del client.csi-rbd-node` before the `ceph auth get-or-create` call. Deleting the entity first ensures that `get-or-create` generates a fresh key on recreation.
- **Why:** Without this fix, a reader following the rotation procedure would believe they rotated credentials when in fact the old key remained active, creating a false sense of security.

### 2. Mixed execution contexts in rotation code block
- **What was wrong:** The rotation section had a single code block that started with `kubectl exec ... -- bash` (entering the tools pod), followed by `ceph` commands (which run inside the pod), and then `kubectl` commands (which must run outside the pod). As written, the `kubectl` commands would either fail inside the tools pod or confuse the reader about where to run them.
- **What was changed:** Split into two code blocks — one for commands inside the tools pod (with an explicit `exit`), and a second for `kubectl` commands run from the local machine. The `NEW_KEY` extraction now uses `kubectl exec` to fetch the key from outside the pod, so the variable is available for the subsequent `kubectl create secret` command.
- **Why:** The original single-block format would not work as a copy-paste sequence and could lead to errors during a sensitive credential rotation operation.

## Review Notes
- The rest of the post is technically accurate: secret names (`rook-csi-rbd-node`, `rook-csi-rbd-provisioner`), secret data fields (`userID`, `userKey`), StorageClass parameters, CSI provisioner name (`rook-ceph.rbd.csi.ceph.com`), DaemonSet name (`csi-rbdplugin`), pod label (`app=csi-rbdplugin`), and troubleshooting commands are all correct for current Rook releases.
- The "Custom Ceph User" section also uses the `kubectl exec ... -- bash` pattern followed by in-pod commands, but that section does not mix in kubectl commands, so it reads correctly as an interactive session.
- The Ceph capabilities used for the custom node user (`mon 'profile rbd'`, `osd 'profile rbd pool=replicapool'`) are appropriately minimal for node-level RBD operations.
- The Mermaid diagram correctly represents the CSI workflow and which secrets are used at each stage.
