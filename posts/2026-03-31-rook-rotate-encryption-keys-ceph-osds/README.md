# How to Rotate Encryption Keys for Ceph OSDs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Encryption, Key Rotation, Security, OSD

Description: Learn how to rotate LUKS encryption keys for Ceph OSDs in Rook, understand the limitations of in-place key rotation, and plan a safe rotation procedure with minimal data risk.

---

## Key Rotation Challenges for Ceph OSDs

Unlike object storage encryption (where key rotation is a metadata operation), OSD-level LUKS encryption requires either:

1. **Re-keying the LUKS header** - Fast, changes the passphrase that unlocks the data encryption key (DEK)
2. **Full device re-encryption** - Slow, re-encrypts all data with a new DEK (not typically needed)

Most "key rotation" for Ceph OSDs means updating the passphrase in the LUKS header and the corresponding secret in Kubernetes or Vault.

## Understanding LUKS Key Slots

LUKS2 supports up to 32 key slots. Each slot can hold a different passphrase that unlocks the same data encryption key. This allows adding a new key before removing the old one.

## Step 1: Identify the OSD and Device

```bash
ceph osd tree
kubectl -n rook-ceph get pods -l app=rook-ceph-osd -o wide
```

Find the device path on the node:

```bash
kubectl -n rook-ceph exec rook-ceph-osd-0-<pod-suffix> -- ls /dev/mapper/ | grep ceph
```

## Step 2: Add a New Key to the LUKS Slot

On the OSD node, add a new passphrase to slot 1 (slot 0 holds the current key):

```bash
# Get the current key
CURRENT_KEY=$(kubectl -n rook-ceph get secret rook-ceph-osd-encryption-key-osd-0 \
  -o jsonpath='{.data.dmcrypt-key}' | base64 -d)

# Generate new key
NEW_KEY=$(openssl rand -base64 64)

# Add new key to LUKS
printf '%s' "$CURRENT_KEY" | cryptsetup luksAddKey /dev/sdb \
  --key-file=- \
  --new-keyfile=<(printf '%s' "$NEW_KEY")
```

## Step 3: Update the Kubernetes Secret

```bash
kubectl -n rook-ceph patch secret rook-ceph-osd-encryption-key-osd-0 \
  -p "{\"data\": {\"dmcrypt-key\": \"$(printf '%s' "$NEW_KEY" | base64)\"}}"
```

## Step 4: Remove the Old Key Slot

After confirming the new key works:

```bash
printf '%s' "$NEW_KEY" | cryptsetup luksKillSlot /dev/sdb 0 --key-file=-
```

## Step 5: Verify the Key Rotation

```bash
cryptsetup luksDump /dev/sdb
```

In the `Keyslots:` section of the output, slot 0 should no longer be listed, and slot 1 should be present.

## Rotation via OSD Re-provisioning (Simplest Approach)

For Rook-managed clusters, the safest rotation method is to re-provision the OSD:

```bash
# Mark OSD out and remove it
ceph osd out osd.0
ceph osd purge osd.0 --yes-i-really-mean-it

# Delete the OSD pod and PVC
kubectl -n rook-ceph delete pod rook-ceph-osd-0-<suffix>
kubectl -n rook-ceph delete pvc <osd-pvc-name>

# Rook will re-create the OSD with a fresh encryption key
```

This approach requires data to re-replicate, so ensure your cluster has sufficient capacity.

## If Using Vault

With Vault KV v2, you must update both the LUKS header and the Vault secret. First, perform Steps 2 through 4 above to rotate the passphrase on the LUKS device. Then update the stored key in Vault:

```bash
vault kv put rook/osd/osd-0 dmcrypt-key="$NEW_KEY"
```

Simply updating the Vault secret without also updating the LUKS header will cause the OSD to fail on next restart, since the passphrase in Vault would no longer match the LUKS device.

## Summary

Key rotation for Ceph OSD LUKS encryption involves adding a new passphrase to the LUKS header, updating the stored secret in Kubernetes or Vault, and then removing the old key slot. The safest approach for Rook-managed clusters is to use OSD re-provisioning, which guarantees a fresh key and clean state. Always ensure adequate cluster capacity before removing an OSD for re-provisioning.
