# How to Replace a Failed MinIO Drive and Trigger Automatic Erasure-Code Healing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MinIO, Erasure Coding, Storage, Recovery, Data Integrity

Description: Replace a failed MinIO drive safely, preserve erasure-set quorum, and let MinIO automatically reconstruct missing shards onto the empty replacement.

---

MinIO can hot-swap a failed drive and heal its missing object shards without restarting the deployment. The trigger is not a bulk manual repair command. MinIO detects a correctly mounted, empty replacement at the configured storage path and begins aggressive healing for that drive.

The safe procedure has three invariants:

1. the affected erasure set remains above read and write quorum;
2. the new device is definitely the intended device, XFS-formatted, empty, and mounted at the original path;
3. nobody copies, deletes, or rearranges MinIO backend files by hand.

## Confirm the Failure and Remaining Quorum

Configure an administrative alias once, then query uncached state:

```bash
mc alias set production https://minio.example.net \
  "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY"
mc admin info --uncached production
mc admin info --offline --uncached production
```

Populate those variables through the approved secret mechanism for the session. Keep credentials out of shell history and use a least-privilege administrative identity where supported. Verify the server certificate. Record the node, pool, set, drive endpoint, mount path, device serial number, and configured parity.

MinIO writes each object across one erasure set of `N = K + M` drives. An object needs at least `K` intact shards to be read. It normally needs `K` online drives for a write, except at maximum parity (`M = N/2`), where write quorum is `K + 1` to prevent a half-set split brain.

Do not remove another drive merely because the cluster as a whole has many healthy drives. Quorum is evaluated per erasure set. If the set is already at its tolerance boundary, restore a transiently offline member or escalate before replacing anything.

## Map the Mount to the Physical Device

On the affected node, collect read-only evidence:

```bash
findmnt /mnt/drive8
lsblk -o NAME,SERIAL,MODEL,SIZE,FSTYPE,LABEL,MOUNTPOINTS
sudo smartctl -x /dev/disk/by-id/FAILED_DEVICE_ID
journalctl -u minio --since '2 hours ago'
```

Adapt the device name to the platform. A timeout, cable fault, controller problem, and failed medium require different hardware work even if MinIO reports all of them as an offline drive.

Before touching `/etc/fstab`, save its current contents through the normal configuration-management or change-control system. Current MinIO recovery guidance recommends commenting out the failed drive entry before unmounting it so an unexpected reboot does not block or incorrectly mount that path.

Unmount the known mount point:

```bash
sudo umount /mnt/drive8
findmnt /mnt/drive8 || true
```

If unmounting fails because the path is busy, stop and identify the process. Do not use a lazy or forced unmount to hide an unresolved storage path.

## Prepare the Replacement

MinIO's documented requirements are an empty XFS drive of the same media type, at least the same performance, and at least the same capacity. A larger replacement does not increase pool capacity because the smallest drive caps usable capacity in that server pool.

After the hardware swap, resolve the **new serial number** and inspect it before formatting:

```bash
lsblk -o NAME,SERIAL,MODEL,SIZE,FSTYPE,LABEL,MOUNTPOINTS
sudo wipefs -n /dev/disk/by-id/NEW_DEVICE_ID
```

The following operation destroys data. Substitute the stable device ID only after a second operator or automated inventory check confirms its serial number:

```bash
sudo mkfs.xfs -f \
  -L DRIVE8 \
  /dev/disk/by-id/NEW_DEVICE_ID
```

Use label- or UUID-based entries in `/etc/fstab`, not an enumeration-dependent name such as `/dev/sdb`. Restore or update the entry for the original mount path, then mount and verify:

```bash
sudo mount -a
findmnt /mnt/drive8
df -hT /mnt/drive8
lsblk -f /dev/disk/by-id/NEW_DEVICE_ID
```

The mount must be XFS, at the exact path in the MinIO server volume configuration, and empty. A directory that silently falls back to the root filesystem is not a replacement drive and can fill the operating-system disk.

## Let MinIO Detect and Heal It

MinIO requires exclusive access to backend volumes. Do not restore `.minio.sys`, shard directories, metadata, or object parts from the failed drive. Do not use `rsync`, filesystem snapshots, or another process to populate the replacement. MinIO reconstructs each recoverable shard from intact members of the same erasure set and writes consistent metadata itself.

Watch the service log and cluster state:

```bash
journalctl -fu minio
mc admin info --watch --interval 5s production
```

The log should identify the formatted empty drive and the start of healing. Current MinIO documentation says a fresh replacement is healed aggressively and does not require a server restart.

`mc admin heal production/bucket/prefix` can inspect or initiate healing for a particular target, but starting a full manual scan is resource-intensive and normally unnecessary after drive replacement. Do not run it reflexively across the deployment. If a target already has an active scan, the command returns that scan's status.

## Monitor Completion, Not Just Detection

Print current v3 metrics and track the affected pool and set:

```bash
mc admin prometheus metrics production cluster --api-version v3 |
  grep 'minio_cluster_erasure_set_'

mc admin prometheus metrics production --api-version v3 |
  grep 'minio_heal_'
```

The key signals are online drive count, healing drive count, erasure-set health, read and write tolerance, objects healed, and heal errors. Detection is only the start. Completion requires the drive to remain online, healing activity to settle, error counters not to increase, and the erasure set to regain its expected failure tolerance.

Sample application-critical objects through the S3 path, not the backend filesystem:

```bash
mc stat production/critical/checkpoint.bin
mc admin object info --bitrot production/critical/checkpoint.bin
mc cat production/critical/checkpoint.bin | sha256sum
```

Compare the digest with a trusted external manifest. An S3 ETag is not a universal content MD5, especially for multipart or encrypted objects.

## Conclusion

A MinIO drive replacement is a quorum-preserving hardware operation followed by MinIO-managed reconstruction. Prove the device identity, mount an empty XFS replacement at the exact original path, and let the server heal its own shards. Do not copy backend files manually, and do not declare recovery complete until erasure-set tolerance, healing metrics, logs, and sampled object digests all agree.

## Official Documentation

- [MinIO AIStor: Recover After Drive Failure](https://docs.min.io/aistor/operations/failure-and-recovery/recover-after-drive-failure/)
- [MinIO AIStor: Healing](https://docs.min.io/aistor/operations/core-concepts/healing/)
- [MinIO AIStor: Erasure Coding](https://docs.min.io/aistor/operations/core-concepts/erasure-coding/)
- [MinIO AIStor: Metrics and Alerts](https://docs.min.io/aistor/operations/monitoring/metrics-and-alerts/)
