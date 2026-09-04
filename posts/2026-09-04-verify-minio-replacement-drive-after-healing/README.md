# How to Verify MinIO Recognizes a Replacement Drive After Healing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MinIO, Erasure Coding, Data Integrity, Recovery, Monitoring

Description: Verify a replacement MinIO drive at the operating-system, server, erasure-set, healing, and object-integrity layers before closing recovery work.

---

A mounted replacement is not automatically a completed recovery. MinIO must recognize the drive at the configured endpoint, heal the missing shards, and restore the erasure set's read and write tolerance. Verification should cross five layers: hardware identity, mount identity, MinIO inventory, healing state, and application-visible object bytes.

Use a before-and-after record. Capture the same commands when the incident begins, when the new drive first appears, and when healing is believed complete.

## Verify the Operating-System View

On the affected node, prove that the intended physical device backs the intended path:

```bash
findmnt -o SOURCE,TARGET,FSTYPE,OPTIONS /mnt/drive8
lsblk -o NAME,SERIAL,MODEL,SIZE,FSTYPE,LABEL,MOUNTPOINTS
df -hT /mnt/drive8
```

Expected evidence includes:

- the new device's recorded serial number;
- `xfs` as the filesystem;
- the exact MinIO volume path;
- no accidental mount on the root filesystem;
- capacity and performance at least as large as the failed member.

Confirm that `/etc/fstab` resolves to the same label or UUID after a mount cycle. Do not browse or modify the MinIO backend tree to check object files. MinIO requires exclusive ownership of those files, and manual changes can create corruption that healing cannot safely resolve.

## Verify MinIO's Inventory

Request fresh information rather than relying on a cached console page:

```bash
mc admin info --uncached production
mc admin info --offline --uncached production
mc admin info --watch --interval 5s production
```

`mc admin info` reports node state and aggregate online and offline drive counts. The replacement should appear online on the expected node, and the offline-only view should no longer list its endpoint.

Review server logs around the mount time:

```bash
journalctl -u minio \
  --since '2026-09-04 10:00:00' \
  --until '2026-09-04 14:00:00'

mc admin logs production
```

Look for the empty drive being recognized, healing starting, repeated I/O failures, formatting errors, or the endpoint flapping. A drive that alternates between online and offline is not healthy just because the latest sample says online.

## Verify the Affected Erasure Set

MinIO v3 metrics expose per-pool and per-set state. Print them directly for a spot check or scrape the official endpoint continuously:

```bash
mc admin prometheus metrics production cluster --api-version v3 |
  grep -E 'minio_cluster_erasure_set_(online_drives_count|healing_drives_count|health|read_tolerance|write_tolerance)'
```

Filter on the recorded `pool_id` and `set_id`. At completion:

- online drive count equals the designed set width;
- healing drive count returns to zero;
- erasure-set, read, and write health report healthy;
- read and write tolerance return to the expected values for the configured parity.

Do not use a cluster-wide healthy summary to hide a degraded set. Objects map deterministically to one set, so one unhealthy set can still affect an important prefix even while other sets accept traffic.

## Verify Healing Progress and Errors

Current MinIO metrics include counters for objects scanned, objects healed, heal errors, and time since last healing activity. Capture them throughout the operation:

```bash
mc admin prometheus metrics production --api-version v3 |
  grep -E 'minio_(heal|debug_heal)_'
```

Interpret counters as counters. A nonzero cumulative heal-error value may predate this incident; the important questions are whether it increased during the replacement and whether unresolved manual-intervention signals remain.

Avoid using a new full `mc admin heal` run as the definition of completion. The command starts a resource-intensive scan when the requested bucket or prefix does not already have one. MinIO automatically heals a fresh replacement. Use a targeted command only when the runbook or MinIO support calls for it:

```bash
mc admin heal --verbose production/critical-bucket/known-prefix
```

If it reports an existing scan, observe that status. If no scan exists, understand that the command initiates work and can affect foreground latency.

## Verify Objects Through the S3 API

Infrastructure signals cannot prove that a business-critical object matches its source of truth. Keep external SHA-256 manifests for recovery-critical datasets and sample across object sizes, ages, versions, and the affected set:

```bash
mc stat production/critical-bucket/checkpoint.bin
mc admin object info --bitrot \
  production/critical-bucket/checkpoint.bin
mc cat production/critical-bucket/checkpoint.bin |
  sha256sum
```

Compare the digest with the trusted manifest. Do not treat the ETag as a general-purpose MD5; multipart uploads, encryption, and implementation details can make that assumption false.

For a versioned bucket, verify the intended version explicitly. A successful read of the current version does not prove that retained historical versions healed.

## Run a Controlled Restart Check

After healing has completed and the change window permits it, test persistence through the normal node-maintenance procedure rather than power-cycling unexpectedly. The goal is to prove that stable label or UUID mounting survives startup and MinIO resolves the same endpoint.

Repeat:

```bash
findmnt /mnt/drive8
mc admin info --uncached production
```

Then watch the erasure-set metrics for a defined soak period. No new heal errors, I/O errors, or online/offline transitions should appear.

## Completion Record

Attach these artifacts to the incident or maintenance record:

- old and new drive serial numbers;
- pool, set, node, and endpoint mapping;
- final `findmnt`, `lsblk`, and `mc admin info` output;
- start and finish timestamps;
- metric snapshots showing restored tolerance and zero healing drives;
- representative object paths and verified SHA-256 results;
- any heal errors and their disposition.

## Conclusion

Close a replacement-drive incident only when every layer tells the same story. The correct device must persist at the correct mount, MinIO must list it online, the exact erasure set must regain full tolerance, healing must finish without unresolved errors, and sampled S3 reads must match trusted digests. A green node icon alone is not sufficient evidence.

## Official Documentation

- [MinIO AIStor: Recover After Drive Failure](https://docs.min.io/aistor/operations/failure-and-recovery/recover-after-drive-failure/)
- [MinIO AIStor: mc admin info](https://docs.min.io/aistor/reference/cli/admin/mc-admin-info/)
- [MinIO AIStor: Healing](https://docs.min.io/aistor/operations/core-concepts/healing/)
- [MinIO AIStor: Metrics v3 Reference](https://docs.min.io/aistor/operations/monitoring/metrics-and-alerts/metrics-v3/)
