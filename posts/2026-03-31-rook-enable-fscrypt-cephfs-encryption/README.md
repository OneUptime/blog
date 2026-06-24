# How to Enable fscrypt for CephFS Encryption

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, fscrypt, Encryption, Security

Description: Learn how to enable fscrypt for CephFS directory-level encryption in Ceph, configure encryption policies on directories, and manage encryption keys for filesystem data.

---

## What is fscrypt for CephFS?

fscrypt is a Linux kernel feature that provides per-directory encryption for filesystems. CephFS supports fscrypt natively, allowing you to encrypt specific directories within a CephFS mount without encrypting the entire OSD. This is useful for multi-tenant environments where different tenants need isolated encryption keys.

## Prerequisites

- Linux kernel 6.6+ (CephFS fscrypt support was added in kernel 6.6)
- `fscrypt` userspace tool installed
- CephFS mounted via the kernel client (not ceph-fuse)

Install the fscrypt tool:

```bash
# Debian/Ubuntu
apt-get install libpam-fscrypt

# From source (recommended for other distros)
git clone https://github.com/google/fscrypt
cd fscrypt
make && make install
```

## Enabling fscrypt on a CephFS Mount

### Step 1: Mount CephFS

```bash
mount -t ceph mon1:6789,mon2:6789,mon3:6789:/ /mnt/cephfs \
  -o name=admin,secret=<admin-keyring>
```

### Step 2: Format the Filesystem for fscrypt

```bash
fscrypt setup /mnt/cephfs
```

This creates a `.fscrypt` directory at the root of the mount point.

### Step 3: Create an Encryption Policy

Create a directory and apply an encryption policy:

```bash
mkdir /mnt/cephfs/tenant-a
fscrypt encrypt /mnt/cephfs/tenant-a
```

You will be prompted to create or select a protector (key source). Options include:
- `pam_passphrase` - user login passphrase
- `custom_passphrase` - manually entered passphrase
- `raw_key` - raw key file

### Step 4: Using a Raw Key File

For automation, use a raw key:

```bash
# Generate a 32-byte key
dd if=/dev/urandom of=/etc/ceph/tenant-a.key bs=32 count=1

fscrypt encrypt /mnt/cephfs/tenant-a \
  --source=raw_key \
  --key=/etc/ceph/tenant-a.key \
  --name="tenant-a-key"
```

## Verifying Encryption Status

```bash
fscrypt status /mnt/cephfs/tenant-a
```

Expected output:
```text
"/mnt/cephfs/tenant-a" is encrypted with fscrypt.
Policy:   abc123...
Unlocked: Yes
```

## Locking and Unlocking Directories

Lock a directory (removes key from kernel keyring):

```bash
fscrypt lock /mnt/cephfs/tenant-a
```

Unlock with the key:

```bash
fscrypt unlock /mnt/cephfs/tenant-a \
  --key=/etc/ceph/tenant-a.key
```

## CephFS Encryption with ceph-fuse

For ceph-fuse or libcephfs-based mounts, the standard `fscrypt` tool does not work directly. Use the Ceph-maintained fork at `github.com/ceph/fscrypt` (branch `wip-ceph-fuse`) which adds support for userspace CephFS clients.

## Summary

fscrypt for CephFS provides directory-level encryption that supports per-tenant key isolation without encrypting the underlying OSD devices. Enable it by running `fscrypt setup` on a mounted CephFS volume, then apply encryption policies to specific directories using `fscrypt encrypt`. Use raw key files for automation and integrate key storage with a secrets manager for production deployments.
