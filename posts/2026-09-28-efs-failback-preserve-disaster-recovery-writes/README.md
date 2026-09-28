# Fail Back an EFS Replica Without Losing Disaster-Recovery Writes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, Replication, Disaster Recovery

Description: Preserve writes made on an EFS disaster-recovery replica by reversing replication, fencing writers, and waiting for a final synchronization boundary.

After failover, the EFS file system in the recovery Region contains new production writes. Recreating the original replication direction immediately would replace those changes with the old primary's state. A safe failback first copies the recovery system's changes back to the original primary.

AWS explicitly supports this reverse replication approach. It synchronizes differences in one direction; it does not merge independent writes made on both file systems. [Using an EFS replica and failing back](https://docs.aws.amazon.com/efs/latest/ug/replication-fail-over.html).

This procedure assumes same-account replication between two encrypted file systems. Call the original primary **A** in `us-east-1` and the currently active recovery file system **B** in `us-west-2`.

## Establish one authoritative writer

Before starting, verify that the original A → B replication configuration was removed during failover and that B is the only production writer. Keep A's applications stopped, scheduled jobs disabled, and stale deployments unable to restart against it. Preserve the permissions needed by the replication service while fencing application access.

If both A and B received independent writes, stop here and reconcile them at the application level. Back up both versions before any overwrite. Choosing a replication direction cannot determine which conflicting business transaction should survive.

Take verified recovery backups of the current state before using an existing destination. Replication can overwrite or remove destination files to make it match the source. A retained backup provides a recovery path if the pair or direction was selected incorrectly. [Replicating to an existing EFS file system](https://docs.aws.amazon.com/efs/latest/ug/replicate-existing-destination.html).

## Make A the reverse-replication destination

Record A and B's IDs, encryption configuration, and replication membership. Each file system can belong to only one replication configuration. Remove unresolved configuration remnants from a prior exceptional failover using the documented procedure before constructing the new pair.

With A's writers fenced and its backup verified, disable A's overwrite protection:

```bash
aws efs update-file-system-protection \
  --region us-east-1 \
  --file-system-id fs-0123456789abcdef0 \
  --replication-overwrite-protection DISABLED
```

Then create **B → A**, issuing the command in B's Region:

```bash
aws efs create-replication-configuration \
  --region us-west-2 \
  --source-file-system-id fs-0fedcba9876543210 \
  --destinations '[{
    "Region":"us-east-1",
    "FileSystemId":"fs-0123456789abcdef0"
  }]'
```

Here `fs-0fedcba9876543210` is B, the current authoritative source. Check these identifiers twice. The existing-destination documentation explains both the overwrite behavior and encryption compatibility requirements. An encrypted source cannot replicate into an unencrypted destination.

## Let the reverse sync catch up

B can serve production while reverse replication runs. A is a read-only replication destination. A reverse configuration performs an initial sync; do not assume prior replication history makes it instantaneous. [Replication performance](https://docs.aws.amazon.com/efs/latest/ug/efs-replication.html).

```bash
aws efs describe-replication-configurations \
  --region us-west-2 \
  --file-system-id fs-0fedcba9876543210 \
  --query 'Replications[0].Destinations[0].{Id:FileSystemId,Status:Status,Message:StatusMessage,LastSync:LastReplicatedTimestamp}'
```

Wait for healthy status, an actual completed synchronization timestamp, and readable destination data. Validate representative B-side changes on A. A canary is helpful, but it does not establish consistency of all application files.

## Freeze B for the final boundary

Schedule the failback window and stop **all** B writers, including background workers, cron jobs, upload handlers, and administrative processes. Complete application checkpoints and durable flushes. Record a UTC boundary after the last acknowledged write, using synchronized clocks.

Keep B fenced and wait until `LastReplicatedTimestamp` covers that boundary. Verify a manifest or application-specific recovery check on A. EFS replication is asynchronous and does not provide a live, point-in-time-consistent multi-file snapshot, so the write freeze is essential to the planned no-loss claim. [Replication timestamps](https://docs.aws.amazon.com/efs/latest/ug/monitoring-replication-status.html).

If a writer resumes on B, invalidate the boundary and repeat this gate. Do not rely on a fixed sleep duration.

## Promote A, then switch clients

Delete the reverse configuration from its source, B:

```bash
aws efs delete-replication-configuration \
  --region us-west-2 \
  --source-file-system-id fs-0fedcba9876543210
```

Wait for deletion to finish and for A to become available with overwrite protection `ENABLED`. Promotion can take several minutes. Inspect any replication `lost+found` directory as part of the recovery review. [Deleting replication configurations](https://docs.aws.amazon.com/efs/latest/ug/delete-replications.html).

Update clients to A's file-system and access-point IDs. Stop old mounts cleanly, remount through the supported runtime process, and verify known data and an authorized write as the service user. Existing NFS connections do not move because a configuration variable or DNS alias changes.

Only then resume production on A. B must remain fenced. Once A receives new writes, “rollback to B” is another data synchronization exercise, not an immediate traffic flip.

## Restore the normal protection direction

After the application passes its checks, disable B's overwrite protection and recreate **A → B** using the same existing-destination procedure with the roles reversed. Keep B's applications stopped and monitor the new initial sync and lag.

Preserving DR-window writes depends on the full sequence: B is authoritative, reverse sync completes, final writers are frozen, the timestamp covers their writes, and only A resumes. Document the actual final boundary and verification results so the next failover begins from a known state.
