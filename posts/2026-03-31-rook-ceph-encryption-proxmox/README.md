# How to Configure Ceph Encryption in Proxmox Environment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Proxmox, Encryption, Security, LUKS, Data Protection

Description: Enable Ceph OSD encryption at rest in a Proxmox environment to protect VM disk data stored in Ceph RBD pools using dmcrypt/LUKS on OSD devices.

---

Ceph supports encryption at rest using dmcrypt/LUKS on OSD devices. When enabled, all data written to Ceph OSDs is encrypted transparently, protecting VM disk images stored in Ceph RBD pools from unauthorized physical access. This guide covers enabling encryption in a Proxmox-integrated Ceph environment.

## Encryption Architecture

Ceph OSD encryption uses Linux's dm-crypt framework:
- Each OSD device gets a unique encryption key
- Keys are stored in the Ceph monitor's config-key store
- Encryption/decryption is transparent to clients (Proxmox VMs)
- Performance impact is typically 5-15% on modern CPUs with AES-NI

**Important**: Encryption must be enabled when creating OSDs. Existing unencrypted OSDs cannot be encrypted in-place - you must add new encrypted OSDs and rebalance data.

## Enabling Encryption When Creating OSDs (Proxmox GUI)

In the Proxmox web interface when deploying Ceph:
1. Navigate to **Node -> Ceph -> OSD -> Create OSD**
2. Select the disk
3. Check the **Encrypt** checkbox
4. Click **Create**

Proxmox will handle the dmcrypt setup automatically.

## Enabling Encryption via Proxmox CLI

```bash
# Create an encrypted OSD on a Proxmox node
pveceph osd create /dev/sdb --encrypted

# Create with separate WAL and DB devices
pveceph osd create /dev/sdb \
  --encrypted \
  --wal-dev /dev/nvme0n1p1 \
  --db-dev /dev/nvme0n1p2
```

## Enabling Encryption via ceph-volume (Manual)

If managing Ceph manually on Proxmox nodes:

```bash
# Create an encrypted OSD using ceph-volume
ceph-volume lvm create \
  --dmcrypt \
  --data /dev/sdc

# For a raw BlueStore OSD with dmcrypt
ceph-volume raw prepare \
  --dmcrypt \
  --data /dev/sdc

# Activate the OSD
ceph-volume raw activate --device /dev/sdc
```

## Verifying OSD Encryption

```bash
# Check that the OSD is using a dmcrypt device
ceph-volume lvm list | grep -A5 "osd\.5"
# Look for: dmcrypt -> True

# Verify dm-crypt device on the OSD node
ls -la /dev/mapper/ | grep ceph
# Example: ceph-<uuid>-<osd-id>-bluestore-block-dmcrypt

# Verify at Ceph level
ceph osd metadata osd.5 | grep -i "encrypt\|crypt"
```

## Key Management

Ceph encryption keys are stored in the monitor's keystore. Back them up:

```bash
# List OSD encryption keys
ceph config-key ls | grep "dm-crypt"

# Export keys for backup (store securely!)
# Key paths use the OSD's FSID (UUID), not the numeric ID
# Find the FSID from the output of: ceph config-key ls | grep dm-crypt
ceph config-key get "dm-crypt/osd/<osd-fsid>/luks" > /secure-backup/osd-key.b64

# Verify key backup
ceph config-key exists "dm-crypt/osd/<osd-fsid>/luks" && echo "Key exists"
```

## Re-encrypting with a New Key (Key Rotation)

```bash
# OSD encryption keys cannot be rotated on live OSDs without reprovisioning
# For key rotation, the standard process is:
# 1. Add new encrypted OSDs with new keys
# 2. Let Ceph rebalance data to new OSDs
# 3. Remove old OSDs (Ceph will re-encrypt data in new OSDs)

# Add a new encrypted OSD
pveceph osd create /dev/sdd --encrypted

# Monitor rebalancing
ceph -w | grep "recovery\|rebalance"

# After rebalancing, remove old OSD
ceph osd out osd.1
# Wait for full rebalancing, then destroy via Proxmox
# pveceph osd destroy handles the Ceph-level purge internally
pveceph osd destroy 1 --cleanup
```

## Impact on VM Performance

```bash
# Benchmark encrypted vs unencrypted OSD
# On a VM running on Proxmox with Ceph storage:
apt install -y fio

# Random read test
fio --name=enc-test \
  --ioengine=libaio \
  --iodepth=32 \
  --rw=randread \
  --bs=4k \
  --direct=1 \
  --size=1G \
  --filename=/dev/vda \
  --output-format=json | python3 -c "
import sys, json
d = json.load(sys.stdin)
iops = d['jobs'][0]['read']['iops']
bw = d['jobs'][0]['read']['bw'] / 1024
print(f'Read IOPS: {iops:.0f}, BW: {bw:.1f} MB/s')
"
```

## Summary

Ceph OSD encryption in Proxmox environments protects VM disk data at rest using per-OSD dmcrypt/LUKS encryption managed automatically by Ceph. Enable encryption at OSD creation time using `pveceph osd create --encrypted` or the GUI checkbox. Encryption is transparent to Proxmox VMs - no configuration changes are needed at the VM or storage level. Always back up OSD encryption keys from the Ceph config-key store to a secure off-cluster location, as losing the keys makes encrypted OSDs permanently inaccessible.
