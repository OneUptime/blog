# How to Configure Encrypted Devices for Ceph OSDs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Encryption, Security, Kubernetes

Description: Enable at-rest encryption for Ceph OSDs using dm-crypt via Rook, protecting data on physical disks with LUKS encryption managed automatically by Rook.

---

## Overview

Rook supports encrypting Ceph OSDs at rest using Linux's dm-crypt/LUKS layer. When enabled, Rook automatically generates encryption keys, stores them as Kubernetes secrets, and provisions each OSD on an encrypted block device. This protects data from physical disk theft or unauthorized access.

## Prerequisites

Ensure the following kernel modules are loaded on all nodes:

```bash
modprobe dm_crypt
lsmod | grep dm_crypt
```

Verify `cryptsetup` is available on the host:

```bash
cryptsetup --version
```

## Step 1: Enable Encryption in CephCluster

Set `encryptedDevice: "true"` in the storage configuration:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    useAllNodes: true
    useAllDevices: true
    config:
      encryptedDevice: "true"
      osdsPerDevice: "1"
```

Encryption is configured per storage section and cannot be changed after OSD creation without reprovisioning.

## Step 2: Verify Key Secret Creation

Rook stores each OSD's encryption key in a Kubernetes secret:

```bash
kubectl -n rook-ceph get secrets | grep encryption
kubectl -n rook-ceph get secret rook-ceph-osd-encryption-key-0 -o yaml
```

The keys are base64-encoded LUKS passphrases managed by Rook.

## Step 3: Use Vault for Key Management (Optional)

For production environments, integrate HashiCorp Vault as the KMS:

```yaml
spec:
  security:
    kms:
      connectionDetails:
        KMS_PROVIDER: vault
        VAULT_ADDR: https://vault.example.com:8200
        VAULT_BACKEND_PATH: rook/
        VAULT_SECRET_ENGINE: kv
      tokenSecretName: rook-vault-token
```

Create the Vault token secret:

```bash
kubectl -n rook-ceph create secret generic rook-vault-token \
  --from-literal=token=<your-vault-token>
```

## Step 4: Verify Encrypted OSDs

After OSD provisioning, confirm encryption is active:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd metadata 0 | grep encrypt
```

Check the LUKS header on the host node:

```bash
kubectl debug node/worker-1 -it --image=busybox -- \
  chroot /host cryptsetup status /dev/mapper/*-block-dmcrypt
```

## Step 5: Monitor Encryption Status

Use the Ceph dashboard or CLI to verify all OSDs report encryption:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd metadata | grep encrypt
```

## Important Considerations

- Encrypted OSDs have a small performance overhead (typically 2-5%)
- Encryption keys in Kubernetes secrets should be protected with RBAC
- Changing encryption after OSD creation requires wiping and reprovisioning
- Always use Vault KMS in production for proper key lifecycle management

```bash
# Verify that OSDs are online and encrypted
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph -s
```

## Summary

Configuring encrypted Ceph OSDs with Rook requires enabling `encryptedDevice: "true"` in the CephCluster storage spec, after which Rook automatically handles LUKS key generation and storage in Kubernetes secrets. For production use, integrate HashiCorp Vault for proper key management and auditing.
