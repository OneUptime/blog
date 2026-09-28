# Replicate to an Existing EFS File System: Overwrite Protection and Safety

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, Replication, Disaster Recovery

Description: Configure EFS replication into an existing destination with backups, writer fencing, encryption checks, and explicit overwrite-protection gates.

An existing EFS file system can be a replication destination, which is useful when retaining its identity or preparing failback. The operation is also destructive to destination-only data: EFS makes the destination match the source, including writing changes and removing files that do not belong in the replicated state.

Treat the destination as replaceable by the source before disabling its protection. This is not a two-way merge or a way to append one file tree to another. [Existing-destination replication](https://docs.aws.amazon.com/efs/latest/ug/replicate-existing-destination.html).

## Understand the protection states

The `ReplicationOverwriteProtection` field has three relevant states:

| State | Meaning |
|---|---|
| `ENABLED` | The file system cannot be selected as a replication destination |
| `DISABLED` | The file system is eligible to become a destination |
| `REPLICATING` | EFS controls destination changes; application access is read-only |

New file systems normally start with protection enabled. Deleting a replication configuration re-enables protection and makes its destination writable. Disabling overwrite protection is therefore permission for a destructive relationship; it is not a substitute for stopping application writers.

## Inventory the pair before changing it

This example uses two encrypted file systems in the same account, with the source in `us-east-1` and destination in `us-west-2`. Inspect both with their own Region:

```bash
aws efs describe-file-systems \
  --region us-west-2 \
  --file-system-id fs-0fedcba9876543210 \
  --query 'FileSystems[0].{Id:FileSystemId,State:LifeCycleState,Encrypted:Encrypted,Protection:FileSystemProtection,Size:SizeInBytes}'

aws efs describe-replication-configurations \
  --region us-west-2 \
  --file-system-id fs-0fedcba9876543210
```

Confirm the account through your selected profile or `aws sts get-caller-identity`. Save the source/destination IDs and ARNs in a change record. Repeat the replication-membership check for the source.

A file system can participate in only one replication configuration. Also check encryption compatibility: an encrypted source requires an encrypted destination. Replicating an unencrypted source into an encrypted destination does not provide a symmetric failback route into the old unencrypted source. [EFS replication prerequisites](https://docs.aws.amazon.com/efs/latest/ug/replicate-existing-destination.html).

## Protect destination data and fence its clients

Take a verified backup of any destination content that must remain recoverable. Document why the source is authoritative and how destination-only files will be handled. If the files need to survive independently, choose a new destination instead.

Stop destination applications, scheduled tasks, and controllers that can recreate mounts or restart workers. Verify that no application expects the destination to remain writable. Keep the network and permissions required for read-only verification and for the EFS replication service.

Prepare destination mount targets, access points, and client policies for eventual use. Replicated data and metadata are only part of recovery readiness; application infrastructure must be verified separately.

## Disable protection on the destination only

The caller needs `elasticfilesystem:UpdateFileSystemProtection`. Once the backup and writer-fencing gates pass:

```bash
aws efs update-file-system-protection \
  --region us-west-2 \
  --file-system-id fs-0fedcba9876543210 \
  --replication-overwrite-protection DISABLED
```

Read the protection field again. A wrong Region or ID should fail the change, not trigger a search-and-retry script that may select another file system. [UpdateFileSystemProtection CLI](https://docs.aws.amazon.com/cli/latest/reference/efs/update-file-system-protection.html).

Create the configuration from the source Region:

```bash
aws efs create-replication-configuration \
  --region us-east-1 \
  --source-file-system-id fs-0123456789abcdef0 \
  --destinations '[{
    "Region":"us-west-2",
    "FileSystemId":"fs-0fedcba9876543210"
  }]'
```

For cross-account replication, the destination identifier is its ARN and a suitable replication role is required, together with the file-system resource policies. Do not adapt the same-account command by changing only a CLI profile. [Cross-account EFS replication](https://docs.aws.amazon.com/efs/latest/ug/cross-account-replication.html).

## Verify synchronization and read-only behavior

Check that the returned source and destination are the intended pair, the destination enters `REPLICATING`, and replication reaches a healthy state. Capture `LastReplicatedTimestamp` from `describe-replication-configurations`. EFS performs an initial sync before replicated data is available; duration depends on the dataset. [EFS replication behavior](https://docs.aws.amazon.com/efs/latest/ug/efs-replication.html).

From an authorized recovery client, verify representative files and metadata after synchronization. Compare against the source's known synchronization boundary. Do not interpret a read-only write failure as a permissions bug and start widening IAM or POSIX access: the destination is deliberately protected from application writes.

If setup fails before a relationship is created, and membership checks confirm the destination is not replicating, re-enable overwrite protection while investigating. If replication already started, re-enabling a flag cannot undo overwritten or deleted data. Recovery requires the backup and an explicit restore plan.

## Treat promotion as a separate change

To use the destination for writes, follow a failover process that fences the source, evaluates its last synchronized boundary, deletes replication, waits for promotion, and switches clients. Local-only replication deletion is an exceptional recovery option that leaves the other side's configuration unrecoverable, not a routine shortcut. [Deleting replication configurations](https://docs.aws.amazon.com/efs/latest/ug/delete-replications.html).

The safe outcome is an intentionally read-only destination whose data and recovery point are understood. Keeping that outcome separate from writable promotion makes overwrite protection a useful operational guard rather than a checkbox to bypass.
