# Validation Summary: How to Configure Ceph Encryption in Proxmox Environment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (OSD encryption with dm-crypt/LUKS)
- Proxmox VE (pveceph CLI, GUI OSD management)
- ceph-volume (LVM and raw OSD provisioning)
- Linux dm-crypt / LUKS
- fio (storage benchmarking)

## Sources Consulted
- Ceph official documentation on OSD encryption and ceph-volume dmcrypt (https://docs.ceph.com/en/latest/ceph-volume/lvm/encryption/)
- Ceph config-key store documentation (https://docs.ceph.com/en/latest/man/8/ceph/#config-key)
- Proxmox VE documentation on Ceph OSD management and pveceph CLI (https://pve.proxmox.com/wiki/Deploy_Hyper-Converged_Ceph_Cluster)
- Proxmox VE pveceph man page for osd create/destroy flags

## Issues Found

1. **Incorrect key store terminology (line 18):** The post stated encryption keys are stored in "the Ceph monitor's keyring store." The keyring store is for cephx authentication keys. dm-crypt OSD encryption keys are stored in the **config-key store** (accessed via `ceph config-key`). Fixed "keyring store" to "config-key store."

2. **Incorrect dm-crypt key path format (Key Management section):** The post used `dm-crypt/osd/5/luks` as the config-key path, suggesting the numeric OSD ID is used. In reality, ceph-volume stores dm-crypt keys using the OSD's FSID (UUID), e.g., `dm-crypt/osd/<osd-fsid>/luks`. Fixed the key paths to use `<osd-fsid>` placeholder and added a comment explaining how to find the FSID.

3. **Redundant and problematic OSD removal workflow (Re-encrypting section):** The post showed running `ceph osd purge` followed by `pveceph osd destroy`, which is redundant — `pveceph osd destroy` handles the Ceph-level purge internally. Running `ceph osd purge` first would cause `pveceph osd destroy` to fail since the OSD no longer exists in the cluster. Fixed to use only `pveceph osd destroy <id> --cleanup`.

4. **Misleading "Rook" tag:** The tags included "Rook" but the post covers native Proxmox Ceph integration, not Rook (a Kubernetes Ceph operator). Removed the Rook tag to avoid confusion.

## Review Notes
- The performance impact claim of "5-15% on modern CPUs with AES-NI" is a commonly cited range in the community but actual results vary significantly by workload. This is acceptable as a general estimate.
- The fio benchmark section uses `--filename=/dev/vda` which tests the raw block device. This is safe since the test shown is read-only (`--rw=randread`), but users should be cautioned about write tests on active devices. The post appropriately only shows a read test.
- The `ceph-volume raw activate --device /dev/sdc` command does not explicitly pass `--dmcrypt`, but this is correct — ceph-volume detects the dm-crypt layer automatically during activation.
- The Proxmox GUI workflow description is accurate for current Proxmox VE versions.
