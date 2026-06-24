# How to Set Up LUKS Encryption for Ceph OSDs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, LUKS, Encryption, OSD, Security

Description: Learn how to set up LUKS2 encryption for Ceph OSDs using Rook, understand how encryption keys are managed, and verify that OSD devices are properly encrypted.

---

## LUKS and Ceph OSD Encryption

Linux Unified Key Setup (LUKS) is the standard disk encryption format on Linux. When you enable `encryptedDevice` in Rook, BlueStore uses LUKS2 (via dmcrypt) to encrypt OSD block devices. Each OSD gets a unique encryption key, preventing cross-OSD key compromise.

## Prerequisites

- Rook 1.4+ (OSD encryption support)
- Linux kernel 4.12+ with dm-crypt modules loaded
- Sufficient CPU for encryption (AES-NI recommended)

Verify dm-crypt is available:

```bash
lsmod | grep dm_crypt
modinfo dm-crypt
```

## Enabling LUKS Encryption in Rook

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    config:
      encryptedDevice: "true"
    nodes:
      - name: "worker-1"
        devices:
          - name: "sdb"
          - name: "sdc"
```

## Verifying LUKS on a Node

SSH to a node where an encrypted OSD was deployed:

```bash
lsblk -f | grep -A1 ceph
```

Check LUKS header:

```bash
cryptsetup luksDump /dev/sdb
```

Expected output includes:
```text
LUKS header information
Version:        2
Epoch:          3
Metadata area:  16384 [bytes]
Keyslots area:  16744448 [bytes]
...
Data segments:
  0: crypt
        cipher: aes-xts-plain64
        sector: 512 [bytes]

Keyslots:
  0: luks2
        Key:        512 bits
        PBKDF:      argon2id
```

## Inspecting Rook's LUKS Key Management

For host-based OSDs (as configured above), Rook stores encryption keys in the Ceph mon key-value store:

```bash
ceph config-key get dm-crypt/osd/<osd-uuid>/luks
```

To find OSD UUIDs:

```bash
ceph osd dump | grep uuid
```

For PVC-based OSDs, Rook creates a Kubernetes Secret per OSD with the LUKS passphrase:

```bash
kubectl -n rook-ceph get secrets -l "pvc_name"
```

Get a specific key:

```bash
kubectl -n rook-ceph get secret rook-ceph-osd-encryption-key-<pvc-name> \
  -o jsonpath='{.data.dmcrypt-key}' | base64 -d
```

## Opening a LUKS Device Manually (for Recovery)

If you need to manually access an encrypted OSD device for recovery, first retrieve the encryption key. For host-based OSDs:

```bash
LUKS_KEY=$(ceph config-key get dm-crypt/osd/<osd-uuid>/luks)

echo "$LUKS_KEY" | cryptsetup luksOpen /dev/sdb ceph-recovery --key-file=-

# BlueStore OSDs use a raw block device, not a filesystem.
# Use ceph-bluestore-tool to inspect the decrypted device:
ceph-bluestore-tool show-label --dev /dev/mapper/ceph-recovery
```

## LUKS2 vs LUKS1

Rook uses LUKS2 by default when the Ceph container image includes cryptsetup 2.1+. LUKS2 provides:
- Argon2id key derivation (more resistant to brute force)
- Larger header (16 MiB) for metadata
- Online reencryption support

## Rotating LUKS Keys

Key rotation requires OSD restart. Use the Vault integration for automated rotation rather than manual key changes.

## Summary

LUKS2 encryption for Ceph OSDs is enabled via `encryptedDevice: "true"` in the Rook CephCluster spec. Rook manages unique per-OSD LUKS passphrases stored in Kubernetes Secrets. Verify encryption using `cryptsetup luksDump` on node devices, and use the stored keys for manual recovery when needed. For production use, integrate with HashiCorp Vault for centralized key lifecycle management.
