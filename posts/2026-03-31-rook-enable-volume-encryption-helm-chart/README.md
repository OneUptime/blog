# How to Enable Volume Encryption in Rook Helm Chart

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Helm, Encryption, Security

Description: Enable per-volume encryption for RBD PersistentVolumes in Rook-Ceph via Helm chart settings and StorageClass parameters for data-at-rest protection.

---

## Overview

Rook-Ceph supports per-volume encryption for RBD block devices using Linux LUKS (dm-crypt). Unlike OSD-level encryption which encrypts entire disks, per-volume encryption gives granular control - different PVCs can use different encryption keys. This is configured via Helm and StorageClass parameters.

## Enabling Encryption in the Helm Chart

The CSI driver handles encryption at the volume level. Ensure the CSI RBD driver is enabled:

```yaml
csi:
  enableRbdDriver: true
  # Encryption requires the kms section in StorageClass
  # No Helm flag needed - it's configured per StorageClass
```

You also need to enable encryption support in the operator ConfigMap:

```bash
kubectl patch cm rook-ceph-operator-config -n rook-ceph -p $'data:\n "CSI_ENABLE_ENCRYPTION": "true"'
```

For KMS-backed encryption (recommended for production), configure KMS connectivity at the cluster level in your `CephCluster` CR rather than the Helm chart.

## Creating an Encryption-Enabled StorageClass

The StorageClass controls which PVCs get encrypted:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block-encrypted
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  imageFormat: "2"
  imageFeatures: layering

  # Enable encryption
  encrypted: "true"

  # Use a Kubernetes secret for the encryption passphrase
  encryptionKMSID: user-secret-metadata

  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-publish-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-publish-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

## Configuring the KMS ConfigMap and Secret

The `encryptionKMSID` in the StorageClass references a key in the `rook-ceph-csi-kms-config` ConfigMap, which defines how encryption keys are managed. For Kubernetes secret-based encryption (simple mode without an external KMS), first create the KMS config:

```bash
kubectl patch configmap rook-ceph-csi-kms-config -n rook-ceph --type merge -p '{
  "data": {
    "config.json": "{\"user-secret-metadata\":{\"encryptionKMSType\":\"metadata\",\"secretName\":\"storage-encryption-secret\"}}"
  }
}'
```

Then create the secret containing the encryption passphrase:

```bash
kubectl create secret generic storage-encryption-secret \
  --from-literal=encryptionPassphrase="your-strong-passphrase" \
  -n rook-ceph
```

The `encryptionKMSID` value in the StorageClass (`user-secret-metadata`) must match the key in the `rook-ceph-csi-kms-config` ConfigMap, which in turn points to the Kubernetes secret via `secretName`.

## Creating an Encrypted PVC

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: encrypted-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: rook-ceph-block-encrypted
```

```bash
kubectl apply -f encrypted-pvc.yaml
kubectl get pvc encrypted-pvc
```

## Verifying Encryption

Once a pod mounts the encrypted volume, verify dm-crypt is active on the node:

```bash
# SSH to the node hosting the pod
lsblk | grep crypt
```

You should see a `dm-crypt` device mapped to the RBD image.

## Summary

Per-volume encryption in Rook-Ceph is configured at the StorageClass level by setting `encrypted: "true"` and specifying an `encryptionKMSID`. The Helm chart enables the underlying CSI RBD driver, while encryption specifics live in the StorageClass and Kubernetes secrets. This approach lets you selectively encrypt only the PVCs that require it.
