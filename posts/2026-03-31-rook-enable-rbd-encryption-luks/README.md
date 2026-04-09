# How to Enable RBD Encryption (LUKS)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Encryption, Security

Description: Learn how to enable LUKS-based encryption for RBD block volumes in Rook-Ceph using the CSI driver for data-at-rest security.

---

## RBD Encryption in Rook-Ceph

Rook-Ceph supports data-at-rest encryption for RBD volumes using Linux Unified Key Setup (LUKS) through the CSI driver. When enabled, data is encrypted at the host before being written to the Ceph cluster, meaning even Ceph administrators cannot read the raw data without the encryption key.

Encryption is configured per StorageClass and uses Kubernetes secrets to manage encryption keys.

## Step 1 - Create an Encryption Key Secret

Generate an encryption passphrase and store it as a Kubernetes secret:

```bash
kubectl create secret generic rbd-encryption-secret \
  --from-literal=encryptionPassphrase="$(openssl rand -base64 32)" \
  -n rook-ceph
```

Verify the secret was created:

```bash
kubectl get secret rbd-encryption-secret -n rook-ceph -o jsonpath='{.data.encryptionPassphrase}' | base64 -d
```

Then configure the CSI driver to use this secret for encryption key management by creating a KMS configuration ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: csi-kms-connection-details
  namespace: rook-ceph
data:
  kubernetes-secret-encryption: |
    {
      "encryptionKMSType": "metadata",
      "secretName": "rbd-encryption-secret"
    }
```

## Step 2 - Create an Encrypted StorageClass

Define a StorageClass with encryption parameters:

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
  imageFeatures: layering,exclusive-lock,object-map,fast-diff,deep-flatten
  encrypted: "true"
  encryptionKMSID: kubernetes-secret-encryption
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

## Step 3 - Configure KMS Integration (Optional)

For production environments, store encryption keys in a Key Management Service (KMS) such as HashiCorp Vault:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: csi-kms-connection-details
  namespace: rook-ceph
data:
  vault-kv-connection-details: |
    {
      "encryptionKMSType": "vault",
      "vaultAddress": "https://vault.example.com",
      "vaultAuthPath": "/v1/auth/kubernetes/login",
      "vaultRole": "ceph-csi-role",
      "vaultPassphraseRoot": "/v1/secret",
      "vaultPassphrasePath": "ceph-csi/",
      "vaultCAVerify": "true"
    }
```

Reference the KMS in the StorageClass:

```yaml
parameters:
  encrypted: "true"
  encryptionKMSID: vault-kv-connection-details
```

## Step 4 - Provision an Encrypted PVC

Create a PVC using the encrypted StorageClass:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: encrypted-rbd-pvc
  namespace: default
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: rook-ceph-block-encrypted
```

## Step 5 - Verify Encryption Is Active

After mounting, verify that the block device is using LUKS encryption:

```bash
kubectl exec -it <pod-using-pvc> -- lsblk -o NAME,TYPE,MOUNTPOINT
kubectl exec -it <pod-using-pvc> -- dmsetup info
```

You should see a `dm-crypt` device mapping, confirming LUKS is active.

## Summary

LUKS-based RBD encryption in Rook-Ceph secures data at rest by encrypting volumes at the CSI node plugin layer before writing to the Ceph cluster. Configure encryption by creating a Kubernetes secret for the passphrase, defining an encrypted StorageClass, and optionally integrating with a KMS like HashiCorp Vault for enterprise key management. All encryption operations are transparent to the application.
