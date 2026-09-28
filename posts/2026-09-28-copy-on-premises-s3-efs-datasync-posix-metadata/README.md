# How to Copy On-Premises or S3 Data into EFS with DataSync While Preserving UID, GID, Timestamps, and Permissions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, DataSync, Migration, NFS

Description: Preserve supported POSIX metadata during NFS-to-EFS transfers and understand when S3 sources require an explicit ownership reconstruction plan.

DataSync can preserve a Linux file's numeric owner, group, permissions, and modification time when the source provides those attributes. An ordinary S3 object does not necessarily contain them. Before choosing transfer options, determine whether the source is an NFS filesystem, an S3 copy created by DataSync, or a bucket filled by ordinary object uploads.

That distinction prevents a migration from finishing successfully while leaving every file owned by an unexpected identity.

## Identify the metadata you actually have

For NFS-to-EFS, DataSync supports UID/GID, POSIX permissions, file and directory modification times, and best-effort access times. For S3 objects without previously applied DataSync metadata, AWS documents default destination ownership of `65534:65534` and file and directory modes of `0755`. The original Linux owner cannot be inferred from an object's bytes. [DataSync metadata behavior](https://docs.aws.amazon.com/datasync/latest/userguide/metadata-copied.html).

Build a representative sample before moving the full dataset. Include a private file, an executable, a group-writable directory, a zero-length file, and filenames your application commonly uses. Capture numeric metadata on the NFS source:

```bash
stat -c '%u:%g %a %s %y %n' \
  /exports/project/private.conf \
  /exports/project/bin/run \
  /exports/project/shared
```

For an S3 source, inspect object metadata on multiple samples:

```bash
aws s3api head-object \
  --bucket migration-source-example \
  --key project/private.conf \
  --query '{Metadata:Metadata,Modified:LastModified,Length:ContentLength}'
```

S3 `LastModified` records object state; do not assume it is the original file modification time. A bucket may also mix objects with preserved DataSync metadata and objects without it. Trial transfers reveal that difference before it affects millions of files.

## Build the correct source and destination locations

An on-premises NFS source needs a DataSync agent able to reach the NFS export, plus connectivity from the agent to DataSync. Check the export's read permissions and root-squash behavior using a test directory. An agent activation problem and a file permission problem belong to different parts of the path. [NFS location requirements](https://docs.aws.amazon.com/datasync/latest/userguide/create-nfs-location.html).

An S3 source uses a location access role with the required bucket and object permissions. Include permissions for the actual encryption keys where needed, and restore archived objects if their S3 storage class requires that before reading. [S3 location configuration](https://docs.aws.amazon.com/datasync/latest/userguide/create-s3-location.html).

For the EFS destination, enable TLS and select the network configuration that reaches its mount target. Use a migration role and file-system policy that permit the required writes and root operations. Avoid an identity-enforcing destination access point when preserving multiple source owners. It substitutes one identity for the source owners and causes metadata mismatches. [EFS transfer access](https://docs.aws.amazon.com/datasync/latest/userguide/create-efs-location.html).

## Configure preservation explicitly

For an NFS source or S3 objects carrying supported preserved metadata, use these task options:

```json
{
  "Uid": "INT_VALUE",
  "Gid": "INT_VALUE",
  "PosixPermissions": "PRESERVE",
  "Mtime": "PRESERVE",
  "Atime": "BEST_EFFORT",
  "TransferMode": "CHANGED",
  "OverwriteMode": "ALWAYS",
  "PreserveDeletedFiles": "PRESERVE",
  "VerifyMode": "ONLY_FILES_TRANSFERRED"
}
```

Configure them when creating the task or through its transfer settings. `INT_VALUE` preserves numbers, which avoids relying on matching username databases. The options do not manufacture metadata absent from the source. `BEST_EFFORT` also means an exact access-time comparison should not be your sole acceptance test. [DataSync options reference](https://docs.aws.amazon.com/datasync/latest/apireference/API_Options.html).

For ordinary S3 objects, decide the desired ownership and modes before transferring. A controlled post-transfer ownership assignment can be appropriate when an entire dataset belongs to one application. Mixed ownership requires a trusted manifest mapping paths to identities and permissions. Do not apply a recursive permission change across a shared destination just to make the first failing file writable.

## Validate a trial and explain every mismatch

Run the sample transfer into a dedicated destination directory. Inspect the execution's status and errors with `describe-task-execution`, then compare content hashes and numeric metadata on an administrative EFS mount.

Classify differences by cause:

| Difference | First check |
| --- | --- |
| Every owner is one application UID | Destination access-point identity enforcement |
| Owners are `65534:65534` from S3 | Missing supported source POSIX metadata |
| Files cannot be read by the service | Numeric runtime identity and parent-directory traversal |
| Verification changes between runs | A writer still modifies the source or destination |

Test through the final application access path as well. The administrative mount and the production access point may intentionally present different identities.

## Cut over with one source of writes

The initial copy can run while the application operates, but the final synchronization needs a consistent source. Stop writers, run the delta transfer, and inspect the verification result. Decide whether source deletions must be mirrored: `PRESERVE` retains destination-only files, while a reviewed `REMOVE` setting removes them within the task's scope.

Reapply any explicit S3 ownership reconstruction only after the final transfer, then validate it again. Keep the destination closed to application writers until acceptance. After cutover, record the task ARN, execution ARN, metadata expectations, and reconciliation procedure so a later rerun cannot silently replace production ownership or overwrite new application data.
