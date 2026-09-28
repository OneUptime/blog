# Validation Summary: How to Fail Back an EFS Replica Without Losing Writes Made During the Disaster-Recovery Window

## Status

validated

## Post Type

Technical disaster-recovery guide with AWS CLI commands.

## Technologies Covered

- Amazon Elastic File System (EFS) replication and overwrite protection
- AWS CLI, Bash, JSON, and JMESPath
- Cross-Region disaster recovery, failover, and failback
- EFS encryption, IAM permissions, NFS mounts, and access points
- Application write fencing and recovery consistency

## Sources Consulted

- [AWS EFS: Using the replica](https://docs.aws.amazon.com/efs/latest/ug/replication-fail-over.html)
- [AWS EFS: Configuring replication to an existing file system](https://docs.aws.amazon.com/efs/latest/ug/replicate-existing-destination.html)
- [AWS EFS: Replicating EFS file systems](https://docs.aws.amazon.com/efs/latest/ug/efs-replication.html)
- [AWS EFS: Viewing replication details](https://docs.aws.amazon.com/efs/latest/ug/monitoring-replication-status.html)
- [AWS EFS: Deleting replication configurations](https://docs.aws.amazon.com/efs/latest/ug/delete-replications.html)
- [AWS CLI: update-file-system-protection](https://docs.aws.amazon.com/cli/latest/reference/efs/update-file-system-protection.html)
- [AWS CLI: create-replication-configuration](https://docs.aws.amazon.com/cli/latest/reference/efs/create-replication-configuration.html)
- [AWS CLI: describe-replication-configurations](https://docs.aws.amazon.com/cli/latest/reference/efs/describe-replication-configurations.html)
- [AWS CLI: delete-replication-configuration](https://docs.aws.amazon.com/cli/latest/reference/efs/delete-replication-configuration.html)
- [AWS EFS: Mounting EFS file systems](https://docs.aws.amazon.com/efs/latest/ug/mounting-fs.html)
- [AWS EFS: Working with access points](https://docs.aws.amazon.com/efs/latest/ug/efs-access-points.html)

## Issues Found

No technical issues found.

## Review Notes

- Left README.md unchanged. AWS explicitly documents reversing replication to preserve changes made on the recovery file system, followed by restoration of the original direction.
- Confirmed the existing-destination requirements: disable overwrite protection, avoid overlapping replication membership, and use an encrypted destination for an encrypted source. Destination contents can be overwritten or removed; replication is not conflict reconciliation.
- Confirmed all four CLI command names, flags, region assignments, file-system ID formats, destination JSON fields, and response fields against the current official AWS CLI reference. The JMESPath expression selects the documented destination fields. Bash syntax checks passed for all four code blocks, and the destination JSON parsed successfully.
- Confirmed reverse replication requires an initial sync and that destination data is accessible after that sync. Healthy replication status is ENABLED; a status alone does not establish that the final writes have arrived.
- AWS defines LastReplicatedTimestamp as covering source changes before that timestamp and does not promise point-in-time consistency during ongoing replication. The post correctly combines writer fencing, durable flushes, a later UTC boundary, timestamp verification, and application-specific validation. The no-loss claim is conditional on those gates, not an unconditional service guarantee.
- Confirmed deleting replication makes the destination writable and re-enables overwrite protection, can take several minutes, and may leave an efs-replication-lost+found directory. Exceptional local-only deletion can leave the remote configuration unrecoverable, consistent with the instruction to clear remnants before rebuilding the pair.
- Mount and access-point documentation supports selecting the intended file system and access point during remounting. Updating application configuration alone is not a remount operation.
- All five AWS documentation links in the post resolved to the intended resources. The author profile link also resolved. No deprecated command or version-specific error was identified.
- Validation consisted of documentation review and local syntax/JSON checks. No AWS resources were modified, and an actual failback, IAM/KMS configuration, mount operation, or application recovery was not executed.
