# Validation Summary: Migrate EFS One Zone to Regional EFS While Preserving POSIX Metadata

## Status

validated

## Post Type

Technical migration guide with Linux commands, an AWS CLI command, and DataSync task configuration.

## Technologies Covered

- Amazon EFS One Zone and Regional file systems
- AWS DataSync metadata preservation and transfer verification
- AWS CLI
- Linux GNU Coreutils `stat` and POSIX ownership and permissions
- EFS access points, IAM authorization, and TLS
- VPC subnets, Availability Zones, mount targets, and NFS networking
- EFS backups

## Sources Consulted

- [EFS file-system configuration](https://docs.aws.amazon.com/efs/latest/ug/creating-using-create-fs.html) — storage types, performance modes, and mount-target creation.
- [AWS CLI: efs create-file-system](https://docs.aws.amazon.com/cli/latest/reference/efs/create-file-system.html) — command flags, accepted values, tags, and backup defaults.
- [EFS NFS users, groups, and permissions](https://docs.aws.amazon.com/efs/latest/ug/accessing-fs-nfs-permissions.html) — numeric identities, ownership, and root permissions.
- [DataSync EFS location configuration](https://docs.aws.amazon.com/datasync/latest/userguide/create-efs-location.html) — subnet selection, network access, migration roles, and access-point ownership behavior.
- [DataSync metadata support](https://docs.aws.amazon.com/datasync/latest/userguide/metadata-copied.html) — metadata supported between NFS-family locations.
- [AWS CLI: datasync create-task](https://docs.aws.amazon.com/cli/latest/reference/datasync/create-task.html) — all nine task-option fields, accepted values, and option dependencies.
- [DataSync verification choices](https://docs.aws.amazon.com/datasync/latest/userguide/configure-data-verification-options.html) — transferred-data verification and Basic-mode full-scope verification.
- [EFS access-point identity enforcement](https://docs.aws.amazon.com/efs/latest/ug/enforce-identity-access-points.html) — enforced identities and authorization.
- [EFS access-point root directories](https://docs.aws.amazon.com/efs/latest/ug/enforce-root-directory-access-point.html) — mount-root behavior and directory permissions.
- [Backing up EFS file systems](https://docs.aws.amazon.com/efs/latest/ug/awsbackup.html) — backup configuration.
- [GNU Coreutils stat documentation](https://www.gnu.org/s/coreutils/manual/html_node/stat-invocation.html) — format option and each format directive in the example.

## Issues Found

No technical issues found.

The README.md was left unchanged.

## Review Notes

- The Regional creation command uses supported flags and compatible General Purpose and Elastic settings. Omitting the Availability Zone selects Regional storage. Credentials, an appropriate default Region, and creation permissions must already be configured.
- The `stat` example correctly reports numeric UID/GID, octal permission bits, size, modification time, and path on a GNU/Linux client. Its sample paths must exist. It is not a portable command for macOS BSD `stat`.
- All nine DataSync JSON settings are valid. `INT_VALUE` preserves numeric identities; `BEST_EFFORT` access time and preserved modification time are compatible. `CHANGED` and `ALWAYS` support subsequent reconciliation passes. The JSON represents task options, not a complete task-creation request.
- The networking guidance matches the required mount-target AZ placement and NFS port. The source subnet also needs to be in the source file system's VPC. IAM-restricted migration access must allow the necessary mount, write, and root operations; identity-enforcing destination access points can prevent preservation of source ownership.
- Access points are separate resources that must be recreated. Testing the application through its replacement access point is necessary because preserved file metadata alone does not establish equivalent effective access.
- `ONLY_FILES_TRANSFERRED` checks transferred data and metadata. `POINT_IN_TIME_CONSISTENT` is appropriately limited to Basic tasks and the task's scope. Neither setting provides an application snapshot or stops concurrent changes. The writer freeze, deletion reconciliation, and rollback guidance are sound.
- The command does not enable automatic backups for the Regional destination. The post correctly calls for enabling them separately.
- All five AWS documentation links in the post resolved to the intended resources; the author profile link also resolved. No deprecated commands or configuration values were identified.
- Both shell blocks passed `bash -n`, and the DataSync JSON parsed successfully. Review was based on official documentation and static checks; no AWS resources were created and no live migration, permission test, or Availability Zone recovery exercise was performed.
