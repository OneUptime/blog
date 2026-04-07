# How to Set Up Client-Side Encryption for Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Encryption, Security, Client, Storage

Description: Configure client-side encryption for Ceph RBD volumes using LUKS and dm-crypt, ensuring data is encrypted before it reaches the storage cluster.

---

Client-side encryption encrypts data on the client before writing it to Ceph. This protects data from being readable on the Ceph nodes themselves, which is important for compliance and multi-tenant environments where you cannot fully trust the storage layer.

## Encryption Approaches

| Method | Where it runs | Manages keys |
|--------|--------------|--------------|
| LUKS + dm-crypt | Client | Client |
| RBD encryption (native) | librbd | Client (passphrase file) |
| KMS-backed encryption | OSD | Vault or Barbican |

This guide covers LUKS on top of RBD (client-managed) and native RBD encryption.

## Method 1 - LUKS Over RBD

Create an RBD image, map it, apply LUKS, and mount it:

```bash
# Create and map the RBD image
rbd create mypool/encrypted-vol --size 20G
RBD_DEV=$(rbd map mypool/encrypted-vol)
echo "Mapped to: $RBD_DEV"

# Format with LUKS
cryptsetup luksFormat $RBD_DEV
cryptsetup luksOpen $RBD_DEV encrypted-vol

# Format and mount the filesystem
mkfs.ext4 /dev/mapper/encrypted-vol
mkdir -p /mnt/encrypted
mount /dev/mapper/encrypted-vol /mnt/encrypted
```

Unmount and close:

```bash
umount /mnt/encrypted
cryptsetup luksClose encrypted-vol
rbd unmap mypool/encrypted-vol
```

## Method 2 - Native RBD Encryption (Pacific+)

Since Ceph Pacific, librbd supports built-in encryption without needing a separate LUKS layer:

```bash
# Create a passphrase file (or use a KMS)
echo "my-secret-passphrase" > /etc/ceph/rbd-enc-passphrase
chmod 600 /etc/ceph/rbd-enc-passphrase

# Create the image with encryption
rbd create mypool/native-enc-vol --size 20G
rbd encryption format mypool/native-enc-vol \
  luks2 /etc/ceph/rbd-enc-passphrase

# Open with encryption
rbd device map mypool/native-enc-vol \
  --encryption-format luks2 \
  --encryption-passphrase-file /etc/ceph/rbd-enc-passphrase
```

## Using a Hardware Security Module or Vault

For production, manage keys via HashiCorp Vault:

```bash
# Retrieve the passphrase from Vault and store it securely
vault kv get -field=passphrase secret/ceph/rbd-encryption \
  > /etc/ceph/rbd-enc-passphrase
chmod 600 /etc/ceph/rbd-enc-passphrase

# Use the Vault-managed passphrase with rbd encryption format
rbd encryption format mypool/encrypted-vol \
  luks2 /etc/ceph/rbd-enc-passphrase
```

## QEMU and RBD Encryption

For VMs using encrypted RBD volumes, configure QEMU:

```xml
<disk type='network' device='disk'>
  <driver name='qemu' type='raw'/>
  <source protocol='rbd' name='mypool/native-enc-vol'>
    <host name='192.168.1.10' port='6789'/>
    <encryption format='luks'>
      <secret type='passphrase' uuid='YOUR_SECRET_UUID'/>
    </encryption>
  </source>
  <target dev='vda' bus='virtio'/>
</disk>
```

## Verifying Encryption

```bash
# Confirm LUKS headers
cryptsetup luksDump /dev/rbd0

# Check encryption status
cryptsetup status encrypted-vol
```

## Summary

Client-side encryption for Ceph ensures that data is encrypted before reaching the storage cluster, protecting it from administrators who have access to the Ceph nodes. LUKS over RBD is the simplest approach and is well-supported by all client types. Native RBD encryption available since Pacific integrates directly into librbd and is the preferred approach for new deployments using QEMU or Kubernetes CSI.
