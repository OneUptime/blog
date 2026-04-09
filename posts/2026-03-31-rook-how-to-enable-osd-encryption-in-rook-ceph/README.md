# How to Enable OSD Encryption in Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Encryption, OSD, Security, KMS

Description: Learn how to enable OSD encryption in Rook-Ceph using Linux LUKS encryption, with options for local key management or HashiCorp Vault KMS integration.

---

## What Is OSD Encryption in Rook-Ceph

OSD encryption encrypts the data stored on Ceph OSD disks using Linux LUKS (Linux Unified Key Setup). When enabled, all data written to OSD devices is encrypted at rest, protecting against unauthorized disk access if drives are removed from the server.

Rook supports two key management approaches:
- **Local keys**: Keys are stored as Kubernetes Secrets (simpler, less secure)
- **KMS (Key Management Service)**: Keys stored in HashiCorp Vault or other KMS systems

## Enabling Encryption on PVC-Based OSDs

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    storageClassDeviceSets:
      - name: encrypted-osds
        count: 3
        portable: true
        encrypted: true    # Enable LUKS encryption
        volumeClaimTemplates:
          - metadata:
              name: data
            spec:
              resources:
                requests:
                  storage: 200Gi
              storageClassName: gp2-block
              volumeMode: Block
              accessModes:
                - ReadWriteOnce
```

## Enabling Encryption on Host-Based OSDs

```yaml
spec:
  storage:
    useAllNodes: false
    nodes:
      - name: "storage-node-1"
        config:
          encryptedDevice: "true"
        devices:
          - name: "sdb"
          - name: "sdc"
```

## Key Management Options

### Option 1: Local Kubernetes Secret (Default)

When no KMS is configured, Rook generates random encryption keys and stores them as Kubernetes Secrets:

```bash
# View encryption keys (created automatically by Rook)
kubectl -n rook-ceph get secrets | grep encryption
# rook-ceph-osd-encryption-key-<pvc-name>   Opaque   1   5m
```

This is simple but means keys are stored within the Kubernetes cluster. If the cluster is compromised, keys are accessible.

### Option 2: HashiCorp Vault KMS

For production security, store encryption keys in Vault:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  security:
    kms:
      connectionDetails:
        KMS_PROVIDER: vault
        VAULT_ADDR: https://vault.example.com:8200
        VAULT_BACKEND_PATH: secret/rook
        VAULT_SECRET_ENGINE: kv
        VAULT_AUTH_METHOD: token
      tokenSecretName: rook-vault-kms-token   # Kubernetes Secret with Vault token
  storage:
    storageClassDeviceSets:
      - name: encrypted-osds
        count: 3
        encrypted: true
        volumeClaimTemplates:
          - metadata:
              name: data
            spec:
              resources:
                requests:
                  storage: 200Gi
              storageClassName: gp2-block
              volumeMode: Block
              accessModes:
                - ReadWriteOnce
```

```bash
# Create the Vault token secret
kubectl -n rook-ceph create secret generic rook-vault-kms-token \
  --from-literal=token=<vault-token>
```

### Option 3: Vault with Kubernetes Auth

More secure than token auth - uses Kubernetes Service Account authentication:

```yaml
spec:
  security:
    kms:
      connectionDetails:
        KMS_PROVIDER: vault
        VAULT_ADDR: https://vault.example.com:8200
        VAULT_BACKEND_PATH: secret/rook
        VAULT_AUTH_METHOD: kubernetes
        VAULT_AUTH_KUBERNETES_ROLE: rook-ceph
```

## Verifying Encryption Is Active

```bash
# Check OSD pod has encryption configured
kubectl -n rook-ceph get pods -l app=rook-ceph-osd
kubectl -n rook-ceph describe pod <osd-pod> | grep -i encrypt

# On the node, verify LUKS is active on the OSD device
kubectl debug node/<node> -- chroot /host cryptsetup status <device-name>
```

```text
/dev/mapper/set1-data-0 is active.
  type:    LUKS2
  cipher:  aes-xts-plain64
  keysize: 512 bits
  key location: keyring
```

## Performance Considerations

LUKS encryption adds CPU overhead for encryption/decryption operations. The impact depends on hardware:

```text
Without AES-NI hardware acceleration:
- 20-30% performance reduction for write-heavy workloads

With AES-NI (most modern CPUs):
- 5-10% performance reduction
- Negligible for most workloads
```

```bash
# Check if AES-NI is available on nodes
grep -o aes /proc/cpuinfo | head -1
# Output 'aes' means AES-NI is available
```

## Limitations

```text
- Encryption can only be enabled at OSD creation time
- Existing unencrypted OSDs cannot be converted to encrypted
- To migrate from unencrypted to encrypted: add encrypted OSDs, rebalance data, remove old OSDs
- Encryption is OSD-level, not per-pool or per-object
```

## Summary

Rook-Ceph OSD encryption uses Linux LUKS to encrypt all data at rest on OSD devices. Enable it by setting `encrypted: true` in `StorageClassDeviceSets` or node-level OSD configuration. By default, encryption keys are stored as Kubernetes Secrets; for production security, integrate with HashiCorp Vault KMS using token or Kubernetes Service Account authentication. Encryption must be configured at OSD creation time and cannot be applied to existing OSDs. Most modern CPUs with AES-NI have negligible performance impact from LUKS encryption.
