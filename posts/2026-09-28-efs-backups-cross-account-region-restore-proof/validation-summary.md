# Validation Summary: Copy EFS Backups Across Accounts and Regions and Verify Restores

## Status
validated

## Post Type
Tutorial / disaster recovery guide with AWS CLI commands and JSON configuration examples.

## Technologies Covered
- Amazon Elastic File System (Amazon EFS)
- AWS Backup recovery points, vaults, copy jobs, and restore jobs
- AWS Organizations and cross-account, cross-Region backup copies
- AWS Identity and Access Management (IAM) and AWS Key Management Service (KMS)
- AWS CLI, JSON restore metadata, and JMESPath queries
- EFS mount targets, access points, POSIX permissions, and recovery drills

## Sources Consulted
- [AWS Backup feature availability](https://docs.aws.amazon.com/aws-backup/latest/devguide/backup-feature-availability.html)
- [Creating backup copies across AWS accounts](https://docs.aws.amazon.com/aws-backup/latest/devguide/create-cross-account-backup.html)
- [Encryption for backups in AWS Backup](https://docs.aws.amazon.com/aws-backup/latest/devguide/encryption.html)
- [How AWS Backup works with supported AWS services](https://docs.aws.amazon.com/aws-backup/latest/devguide/working-with-supported-services.html)
- [Managing automatic backups of EFS file systems](https://docs.aws.amazon.com/efs/latest/ug/automatic-backups.html)
- [AWS CLI: start-copy-job](https://docs.aws.amazon.com/cli/latest/reference/backup/start-copy-job.html)
- [AWS CLI: describe-copy-job](https://docs.aws.amazon.com/cli/latest/reference/backup/describe-copy-job.html)
- [AWS CLI: list-recovery-points-by-backup-vault](https://docs.aws.amazon.com/cli/latest/reference/backup/list-recovery-points-by-backup-vault.html)
- [AWS CLI: get-recovery-point-restore-metadata](https://docs.aws.amazon.com/cli/latest/reference/backup/get-recovery-point-restore-metadata.html)
- [AWS CLI: start-restore-job](https://docs.aws.amazon.com/cli/latest/reference/backup/start-restore-job.html)
- [AWS CLI: describe-restore-job](https://docs.aws.amazon.com/cli/latest/reference/backup/describe-restore-job.html)
- [Restore an Amazon EFS file system](https://docs.aws.amazon.com/aws-backup/latest/devguide/restoring-efs.html)
- [AWS Backup actions and permissions](https://docs.aws.amazon.com/service-authorization/latest/reference/list_backup.html)
- [Backing up EFS file systems](https://docs.aws.amazon.com/efs/latest/ug/awsbackup.html)
- [Working with EFS access points](https://docs.aws.amazon.com/efs/latest/ug/efs-access-points.html)
- [Managing EFS mount targets](https://docs.aws.amazon.com/efs/latest/ug/accessing-fs.html)
- [EFS file and directory permissions](https://docs.aws.amazon.com/efs/latest/ug/user-and-group-permissions.html)
- [AWS Well-Architected: Define recovery objectives for downtime and data loss](https://docs.aws.amazon.com/wellarchitected/2024-06-27/framework/rel_planning_for_recovery_objective_defined_recovery.html)

## Issues Found
- **Recovery duration included backup-copy age.** The drill instructions included copy age in elapsed time from incident declaration to usable data, mixing recovery duration with recoverable-data age. Replaced copy age with restore time in the elapsed-time measurement and clarified that data age is measured separately at the incident using the newest recoverable business transaction. AWS distinguishes the downtime addressed by RTO from the data-loss interval addressed by RPO; backup or copy completion time does not establish the newest recoverable transaction.

## Review Notes
- Confirmed EFS copy support, the organization and management-account prerequisites, warm-tier restriction, and use of a custom vault instead of the reserved EFS automatic backup vault.
- The destination policy uses the documented account-principal pattern. Copy-role identity permissions and destination vault authorization are both necessary. KMS authorization remains a separate requirement; EFS backups use vault encryption and the copied backup uses the destination vault key.
- All four CLI examples use documented commands and options. The copy lifecycle shorthand and queried copy-job fields are valid. Destination recovery-point listings expose resource type, encryption key, and calculated deletion time.
- The restore metadata uses supported field names and string values. A new-file-system restore does not require the original file-system ID. Omitting ItemsToRestore selects a full restore. The custom EFS encryption key is distinct from the backup vault key.
- Confirmed CreatedResourceArn, the recovery-directory behavior of full restores, and the need to prepare network access and application dependencies. Numeric identity and application checks are appropriate validation steps.
- All five documentation links embedded in the post resolved to the intended official AWS resources. No deprecated command or version-specific incompatibility was identified.
- Parsed both JSON examples and checked all shell examples with bash syntax validation. This was a documentation and static-syntax review; no AWS copy job, restore job, or application drill was executed. Actual success depends on configured profiles, existing recovery points, IAM trust and permissions, KMS policies, and destination networking.
