# Validation Summary: Find Restored EFS Data in AWS Backup's aws-backup-restore_* Directory

## Status
validated

## Post Type
Technical troubleshooting and recovery guide.

## Technologies Covered
- AWS Backup and AWS CLI
- Amazon EFS, access points, mount helper, and NFS
- Linux file ownership, permissions, and open file descriptors
- GNU findutils and coreutils
- util-linux findmnt
- rsync

## Sources Consulted
- [AWS Backup: Restore an Amazon EFS file system](https://docs.aws.amazon.com/aws-backup/latest/devguide/restoring-efs.html)
- [AWS CLI: describe-restore-job](https://docs.aws.amazon.com/cli/latest/reference/backup/describe-restore-job.html)
- [EFS: Enforcing a root directory with an access point](https://docs.aws.amazon.com/efs/latest/ug/enforce-root-directory-access-point.html)
- [EFS: Mount helper](https://docs.aws.amazon.com/efs/latest/ug/efs-mount-helper.html)
- [AWS efs-utils upstream documentation](https://github.com/aws/efs-utils)
- [EFS: Mounting with IAM authorization](https://docs.aws.amazon.com/efs/latest/ug/mounting-IAM-option.html)
- [EFS: NFS users, groups, and permissions](https://docs.aws.amazon.com/efs/latest/ug/accessing-fs-nfs-permissions.html)
- [EFS: Backup consistency](https://docs.aws.amazon.com/efs/latest/ug/awsbackup.html)
- [util-linux findmnt manual](https://man7.org/linux/man-pages/man8/findmnt.8.html)
- [GNU find manual](https://man7.org/linux/man-pages/man1/find.1.html)
- [GNU stat manual](https://man7.org/linux/man-pages/man1/stat.1.html)
- [GNU sha256sum manual](https://man7.org/linux/man-pages/man1/sha256sum.1.html)
- [Upstream rsync manual](https://download.samba.org/pub/rsync/rsync.1)
- [Linux rename manual](https://man7.org/linux/man-pages/man2/rename.2.html)
- [Author profile link](https://github.com/nawazdhandala)

## Issues Found
1. **Recovery-point ARN omitted from displayed results.** The text asked readers to record the recovery-point ARN, but the JMESPath query filtered it out. Added `RecoveryPoint:RecoveryPointArn`, a documented response field. Clarified that the required status is `COMPLETED`, the displayed timestamp is completion time, and the new/existing destination choice must be checked in the original restore request.
2. **Missing staging-directory prerequisite.** The nested rsync destination can fail when its parent does not exist. Added an instruction to ensure `/mnt/efs-root/recovery-staging` exists before the dry run. The upstream manual confirms that rsync creates only the final missing destination component by default.

## Review Notes
- Confirmed non-destructive recovery directories for full and item-level restores, new and existing destinations, repeated restore attempts, and preservation of item hierarchy. Item paths use the EFS root rather than the client mount path.
- Confirmed access-point root remapping and the need for authorized visibility of the actual file-system root. Numeric UID/GID comparisons are appropriate because EFS evaluates numeric identities.
- Verified findmnt flags and columns, find depth/type/name filters, GNU stat format directives, SHA-256 invocation, and rsync archive, hard-link, dry-run, numeric-ID, itemized-output, and trailing-slash behavior.
- The TLS mount explanation accommodates a local relay; current efs-utils also documents efs-proxy. The post does not depend on a specific helper implementation.
- AWS documents possible inconsistencies when files change during backup, supporting the application's consistency-check requirement. Linux documents that renaming does not change existing open file descriptors.
- The examples target Linux/GNU utilities; GNU stat syntax is not portable to the default macOS stat utility. No deprecated command or API usage was found.
- All post links resolved to their intended resources. GNU website manual URLs were unavailable through the browser tool, so the GNU command manuals hosted by man7.org were consulted instead.
- Validation consisted of documentation review and Bash syntax checks for every shell block. No live AWS restore, EFS mount, or production data copy was performed; execution requires the reader's authorized AWS and Linux environment.
