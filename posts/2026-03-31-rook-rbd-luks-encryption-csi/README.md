# How to Configure RBD LUKS Encryption with Rook CSI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Encryption, Security

Description: Learn how to enable LUKS encryption for RBD volumes in Rook CSI using Kubernetes Secrets or an external KMS for per-volume encryption keys.

---

## What Is RBD LUKS Encryption

Rook CSI supports at-rest encryption for RBD block volumes using the Linux Unified Key Setup (LUKS) standard. When enabled, each RBD image is encrypted at the block layer before data is written to Ceph. The encryption key can be stored in a Kubernetes Secret (per-volume) or in an external KMS like HashiCorp Vault. This provides data-at-rest protection independent of Ceph's own network encryption.

## Enabling Encryption in the StorageClass

Create a StorageClass with encryption enabled and using a Kubernetes Secret as the key source:

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
  encrypted: "true"
  encryptionKMSID: secrets-metadata-kms
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

The `encryptionKMSID` references a KMS configuration defined in the ceph-csi encryption KMS ConfigMap.

## Configuring the KMS ConfigMap

Create the ceph-csi encryption KMS ConfigMap to define the KMS backend:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ceph-csi-encryption-kms-config
  namespace: rook-ceph
data:
  config.json: |
    {
      "secrets-metadata-kms": {
        "encryptionKMSType": "metadata"
      }
    }
```

The `metadata` KMS type stores the per-volume encryption key in a Kubernetes Secret in the same namespace as the PVC.

## Using HashiCorp Vault as KMS

For production, use Vault for centralized key management:

```yaml
config.json: |
  {
    "vault-kms": {
      "encryptionKMSType": "vault",
      "vaultAddress": "https://vault.example.com:8200",
      "vaultBackendPath": "secret/",
      "vaultRole": "rook-csi",
      "vaultAuthPath": "/v1/auth/kubernetes/login"
    }
  }
```

## Creating an Encrypted PVC

Once the StorageClass and KMS are configured, create a PVC normally:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: encrypted-db-storage
  namespace: my-app
spec:
  storageClassName: rook-ceph-block-encrypted
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
```

Rook CSI provisions an RBD image, generates a LUKS encryption key via the configured KMS, and runs `cryptsetup luksFormat` on the image before it is mapped to the node.

## Verifying Encryption

Check that the block device is LUKS-encrypted on the node where the volume is mounted:

```bash
# On the Kubernetes node
cryptsetup luksDump /dev/rbd0
```

Output confirms:

```text
LUKS header information
Version:       2
Epoch:         3
Metadata area: 16384 [bytes]
Keyslots area: 16744448 [bytes]
UUID:          a1b2c3d4-...
```

## Summary

RBD LUKS encryption in Rook CSI is enabled by setting `encrypted: "true"` and an `encryptionKMSID` in the StorageClass, and configuring the KMS backend in the `ceph-csi-encryption-kms-config` ConfigMap. Use the `metadata` KMS type for simple deployments with per-PVC Kubernetes Secrets, or Vault for centralized enterprise key management. Each encrypted PVC gets a unique LUKS key, ensuring that compromise of one volume's key does not expose others.
