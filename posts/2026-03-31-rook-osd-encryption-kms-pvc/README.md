# How to Set Up OSD Encryption with KMS on PVC Clusters in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Encryption, KMS, Kubernetes

Description: Configure OSD at-rest encryption backed by an external KMS for PVC-based Rook-Ceph clusters to protect data on dynamically provisioned storage.

---

## Overview

For Rook clusters using PVC-based OSD storage (common in cloud environments), enabling encryption with an external KMS ensures data at rest is protected by keys managed outside the cluster. This is required for compliance scenarios where key material must not reside on the same system as encrypted data.

## Architecture

In a PVC-based encrypted OSD setup:
1. Each OSD PVC contains a LUKS-encrypted block device
2. LUKS passphrase is stored in an external KMS (Vault, IBM Key Protect, etc.)
3. On OSD startup, the Rook operator retrieves the key from KMS and unlocks the device
4. On OSD shutdown, the key is not stored locally

## Enable Encryption in CephCluster CRD

Configure the OSD `storageClassDeviceSets` with encryption enabled. The KMS connection is configured directly in the CephCluster CR's `security.kms` section (note: the `rook-ceph-csi-kms-config` ConfigMap is for CSI per-volume encryption, which is separate from OSD encryption):

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    storageClassDeviceSets:
    - name: set1
      count: 3
      encrypted: true
      portable: true
      volumeClaimTemplates:
      - metadata:
          name: data
        spec:
          resources:
            requests:
              storage: 100Gi
          storageClassName: local-storage
          volumeMode: Block
          accessModes:
            - ReadWriteOnce
  security:
    kms:
      connectionDetails:
        KMS_PROVIDER: vault
        VAULT_ADDR: https://vault.example.com:8200
        VAULT_BACKEND_PATH: secret
        VAULT_SECRET_ENGINE: kv
      tokenSecretName: rook-vault-kms-token
```

## Create the Vault Token Secret

```bash
kubectl create secret generic rook-vault-kms-token \
  --from-literal=token="<vault-token>" \
  -n rook-ceph
```

## Verify Encryption is Active

After deployment, check that OSD pods initialized with LUKS encryption:

```bash
kubectl logs -n rook-ceph -l app=rook-ceph-osd --container osd | grep -i "luks\|encrypt"
```

From an OSD pod, confirm the underlying block device is a dm-crypt (LUKS) device:

```bash
OSD_POD=$(kubectl get pod -n rook-ceph -l app=rook-ceph-osd -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n rook-ceph "$OSD_POD" -- lsblk | grep crypt
```

## Summary

OSD encryption with KMS on PVC-based Rook clusters provides LUKS block-level encryption for all stored data, with key material held exclusively in an external KMS. The `encrypted: true` flag on `storageClassDeviceSets`, combined with the KMS connection details in the CephCluster security spec, automates the entire key lifecycle from OSD provisioning through normal operation.
