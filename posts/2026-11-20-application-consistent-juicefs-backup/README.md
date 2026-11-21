# Create an Application-Consistent JuiceFS Backup with a Recovery Manifest

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: JuiceFS, Backup, Disaster Recovery

Description: Coordinate application shutdown, drain pending JuiceFS uploads, retain matching objects, and record a verifiable recovery set rather than only a metadata dump.

A successful metadata export proves that you produced an export file. It does not prove that an application can restart from it. For JuiceFS, a usable backup needs a stable application state, matching filesystem metadata, and every referenced object for as long as the backup is retained.

This guide uses **JuiceFS Community Edition 1.4.2**. It describes a planned maintenance backup, with a protected workspace outside the volume being backed up. The central artifact is a recovery manifest: a small record that identifies what was captured and which checks still need to pass.

## Decide what “consistent” means for the application

Application consistency means the saved state obeys the application's rules. For a document service, that might mean no upload remains half-finished and the index agrees with the files. For a database, it may require a clean shutdown or a database-native backup protocol plus transaction logs.

Pausing incoming requests is not necessarily enough. Workers, scheduled jobs, background compaction, or database buffers may still modify files. PostgreSQL 17's filesystem-backup guidance, for example, says that simply disallowing connections does not make an ordinary file copy safe. Use the application's documented procedure rather than treating filesystem inactivity as a substitute. [PostgreSQL filesystem backup requirements](https://www.postgresql.org/docs/17/backup-file.html).

Before the window, define the acceptance evidence: application checkpoint identifier, clean-stop result, required external database backups, and a restore test that proves those pieces agree. If the application cannot be paused for the required duration, design a coordinated snapshot or application-native backup path instead of silently shortening this procedure.

## Inventory every writer and deletion path

Include every client that can alter the volume: application mounts, gateways, batch jobs, administrative tools, and other clusters. Record each mount's writeback setting and cache location.

Also identify object lifecycle rules and garbage-collection jobs. A metadata backup can refer to blocks that later disappear from the live bucket. Retaining the metadata longer than its referenced objects produces a backup that looks intact until restoration.

Choose one object-protection strategy before starting:

| Strategy | Evidence needed before reopening writes |
| --- | --- |
| Independent retained copy | Completed transfer, exact namespace mapping, and verification record |
| Provider snapshot or equivalent | Completed snapshot identifier and tested restoration procedure |
| Retained object versions | Required versions protected from expiry and a procedure to restore their visibility |

On Amazon S3, versioning retains older object versions, but a delete marker can hide them from an ordinary read. It is not an automatic point-in-time restoration of the whole JuiceFS volume. [S3 versioning behavior](https://docs.aws.amazon.com/AmazonS3/latest/userguide/versioning-workflows.html).

S3 Object Lock protects specific versions. It does not prevent a later version or delete marker becoming current. Validate permissions, retention, cost, and restoration behavior for your selected backup destination; do not enable retention settings casually on a working bucket. [Object Lock behavior](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html).

## Establish a quiet, durable boundary

Use this order during the approved window:

```mermaid
flowchart LR
  A[Quiesce applications] --> B[Flush and drain all clients]
  B --> C[Stop mount owners and background mutation]
  C --> D[Export metadata]
  D --> E[Complete object protection]
  E --> F[Verify recovery set]
  F --> G[Resume writers]
```

Quiescing means bringing the application to its documented stable state and keeping it there. Record when that state was reached. Close application file handles and check all reported flush errors.

JuiceFS normally uploads data before committing file-write metadata. With `--writeback`, data can instead remain in local staging after metadata is committed. A quiet application therefore does not prove that every block reached object storage. Inspect staging progress on every writing client, including clients outside the main cluster. [JuiceFS client write-cache semantics](https://github.com/juicedata/juicefs/blob/v1.4.2/docs/en/guide/cache.md#client-write-cache).

After applications release the mount, the supported normal-unmount command can wait for staging chunks:

```bash
juicefs umount --flush /mnt/jfs
```

Replace the path and coordinate with the mount's service owner so it does not immediately restart. Repeat for all relevant mounts through their normal management procedure. Stop other volume-mutating clients too. A failed or timed-out flush is a failed preparation step, not permission to delete staging files or use force. [Pinned unmount implementation](https://github.com/juicedata/juicefs/blob/v1.4.2/cmd/umount.go).

For this maintenance workflow, keep writers and background mutation stopped until both the metadata export and object protection are complete. A pre-established version-retention design can change that timing only if its recovery guarantees have been demonstrated.

## Export metadata into a new protected directory

The following Bash example assumes the metadata password file and TLS trust already exist. Replace the URL and workspace location. The workspace must have sufficient capacity and must not be inside JuiceFS:

```bash
set -eu
umask 077
export META_PASSWORD_FILE=/etc/juicefs/backup-meta-password
meta='rediss://juicefs@metadata.example.internal:6379/1'
backup_dir=$(mktemp -d /srv/backups/juicefs-candidate.XXXXXX)
juicefs dump "$meta" "$backup_dir/metadata.json.gz"
printf 'Candidate directory: %s\n' "$backup_dir"
```

The `.gz` suffix requests gzip compression. The unique directory prevents this run from overwriting a previous candidate. A failed command leaves an incomplete candidate for investigation; do not publish it as a successful backup.

JuiceFS explicitly documents that `dump` is not snapshot-consistent during concurrent changes. Keeping the volume quiet is the important consistency step. The dump also omits object-storage secrets by default, so retain access credentials and encryption keys separately through the approved secret backup process. [Metadata dump guidance](https://github.com/juicedata/juicefs/blob/v1.4.2/docs/en/administration/metadata_dump_load.md).

## Record a manifest that does not overstate readiness

Set `BACKUP_DIR` to the candidate directory printed above. This Python 3 example records a checksum without loading the whole dump into memory:

```python
import hashlib
import json
import os
from pathlib import Path

root = Path(os.environ["BACKUP_DIR"])
dump = root / "metadata.json.gz"
digest = hashlib.sha256()
with dump.open("rb") as source:
    for block in iter(lambda: source.read(1024 * 1024), b""):
        digest.update(block)
record = {
    "status": "candidate",
    "juicefs_version": "1.4.2",
    "metadata_file": dump.name,
    "metadata_sha256": digest.hexdigest(),
    "application_checkpoint": None,
    "object_recovery_reference": None,
    "restore_test_reference": None,
}
with (root / "recovery-manifest.json").open("x") as output:
    json.dump(record, output, indent=2)
    output.write("\n")
```

Exclusive creation prevents silently replacing an existing manifest. Fill the missing references from actual evidence; do not infer them from the successful checksum. Store the completed manifest with the backup in a protected location. Its hash detects accidental dump changes only when the manifest itself is trusted. [Python hashlib documentation](https://docs.python.org/3/library/hashlib.html).

## Prove the set can be restored

Load the export into an empty isolated metadata engine, connect it to the retained object set, and keep production writers away from that environment. Check volume identity and required objects, then run the application's own recovery and acceptance tests. Avoid running a second writable metadata copy against production objects.

A directory listing is insufficient. Check representative large and small files, permissions, known checksums, application records, and any external database relationship. Preserve test results and the exact object recovery reference in the manifest.

Only mark the backup ready when those checks pass. Resume normal writers through a controlled test first, and retain the previous known-good backup until this candidate's acceptance is complete.

The manifest example was tested locally for checksum correctness and refusal to overwrite an existing manifest. Shell examples were syntax-checked against JuiceFS 1.4.2 options. No multi-client quiescence, FUSE flush, cloud object retention, or application restoration was executed here; those are environment-specific acceptance work, not implied by the local checks.
