# How to Set Up CSI KMS Config (rook-ceph-csi-kms-config) in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Encryption, Kubernetes, Security

Description: Step-by-step guide to configuring the rook-ceph-csi-kms-config ConfigMap for key management in Rook CSI encrypted volumes.

---

## Overview

Rook CSI supports encrypting RBD and CephFS volumes at rest. The encryption key material is managed through a Key Management Service (KMS), and the KMS configuration lives in a Kubernetes ConfigMap named `rook-ceph-csi-kms-config`. This guide walks through setting up that ConfigMap for the most common KMS backends.

## ConfigMap Structure

The `rook-ceph-csi-kms-config` ConfigMap contains a single JSON key (`config.json`) that maps KMS IDs to their configuration blocks:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-ceph-csi-kms-config
  namespace: rook-ceph
data:
  config.json: |-
    {
      "<kms-id>": {
        "encryptionKMSType": "<type>",
        ...type-specific fields...
      }
    }
```

## Secrets Metadata KMS (Kubernetes Secrets)

The simplest backend stores encryption keys in Kubernetes Secrets within a specified namespace:

```json
{
  "secrets-metadata-kms": {
    "encryptionKMSType": "metadata",
    "secretName": "ceph-csi-encryption-keys",
    "secretNamespace": "rook-ceph"
  }
}
```

This option requires no external dependencies and is suitable for non-production or smaller clusters.

## HashiCorp Vault KMS

For production environments, Vault provides a more robust option:

```json
{
  "vault-kms": {
    "encryptionKMSType": "vault",
    "vaultAddress": "https://vault.example.com:8200",
    "vaultAuthPath": "/v1/auth/kubernetes/login",
    "vaultRole": "ceph-csi",
    "vaultPassphraseRoot": "/v1/secret",
    "vaultPassphrasePath": "ceph-csi/",
    "vaultCAFromSecret": "vault-ca-cert",
    "vaultClientCertFromSecret": "vault-client-cert",
    "vaultClientCertKeyFromSecret": "vault-client-key"
  }
}
```

## Apply the ConfigMap

Create or update the ConfigMap using kubectl:

```bash
kubectl apply -f kms-config.yaml -n rook-ceph
```

Verify it is present:

```bash
kubectl get configmap rook-ceph-csi-kms-config -n rook-ceph -o yaml
```

## Reference the KMS ID in a StorageClass

Once the ConfigMap is applied, reference the KMS ID in any StorageClass that needs encryption:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block-encrypted
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  encrypted: "true"
  encryptionKMSID: vault-kms
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

## Restart CSI Pods After Changes

Any change to the KMS ConfigMap requires restarting the CSI provisioner and plugin pods so they pick up the new configuration:

```bash
kubectl rollout restart deployment/csi-rbdplugin-provisioner -n rook-ceph
kubectl rollout restart daemonset/csi-rbdplugin -n rook-ceph
```

## Summary

The `rook-ceph-csi-kms-config` ConfigMap is the central configuration point for all CSI encryption key management in Rook. By selecting the appropriate KMS backend (Kubernetes Secrets for simplicity, Vault for production) and referencing the KMS ID in your StorageClasses, you can enable transparent at-rest encryption for RBD and CephFS volumes.
