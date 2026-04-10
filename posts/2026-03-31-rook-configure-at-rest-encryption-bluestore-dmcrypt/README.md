# How to Configure At-Rest Encryption with BlueStore and dmcrypt

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Encryption, BlueStore, dmcrypt, Security

Description: Learn how to enable at-rest encryption for Ceph OSDs using BlueStore and dmcrypt, configure encryption at cluster deployment time, and verify encryption is active.

---

## Why At-Rest Encryption Matters

At-rest encryption protects data on physical disks from unauthorized access if drives are stolen or decommissioned. Ceph BlueStore integrates with dmcrypt (Linux kernel device mapper crypto) to transparently encrypt all OSD data without application changes.

## Important: Encryption Must Be Enabled at OSD Creation

BlueStore dmcrypt encryption cannot be added to existing OSDs. You must configure it before creating OSDs, or during cluster bootstrapping.

## Enabling Encryption in Rook

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
```

Apply the configuration:

```bash
kubectl apply -f cluster.yaml
```

## Using a KMS for Key Storage

By default, Rook stores encryption keys in the Ceph mon store. For production, use a KMS like HashiCorp Vault to centralize key management:

```yaml
spec:
  security:
    kms:
      connectionDetails:
        KMS_PROVIDER: "vault"
        VAULT_ADDR: "https://vault.example.com:8200"
        VAULT_BACKEND_PATH: "rook"
        VAULT_SECRET_ENGINE: "kv"
        VAULT_AUTH_METHOD: "token"
        VAULT_CACERT: "vault-ca-cert"
      tokenSecretName: rook-vault-token
```

## Verifying Encryption is Active

Check that OSDs were created with dmcrypt:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash
ceph osd tree
```

On the OSD node, verify the dm-crypt device exists:

```bash
ls -la /dev/mapper/ | grep ceph
```

You should see entries like:
```text
ceph-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-sdb-block-dmcrypt
```

## Inspecting Encryption Keys

Encryption keys for `encryptedDevice`-based OSDs are stored in the Ceph mon store. Retrieve a key from the Rook toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph config-key get dm-crypt/osd/<osd-uuid>/luks
```

## Understanding the Key Flow

1. Rook generates a unique per-OSD encryption key
2. The key is stored in the Ceph mon store (or a KMS if configured)
3. At OSD startup, Rook retrieves the key and opens the dm-crypt device
4. All writes go through the encryption layer before reaching the physical disk

## Monitoring Encryption Overhead

Encryption adds CPU overhead. Monitor with:

```bash
kubectl -n rook-ceph top pods -l app=rook-ceph-osd
```

On modern CPUs with AES-NI hardware acceleration, the overhead is typically less than 5%.

## Summary

At-rest encryption with BlueStore and dmcrypt is configured via `encryptedDevice: "true"` in the Rook CephCluster spec and must be set before OSD creation. For production clusters, integrate with a KMS like HashiCorp Vault to centralize key management. Verify encryption by checking for dm-crypt devices on OSD nodes and inspecting keys in the Ceph mon store.
