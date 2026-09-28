# Validation Summary: Copy NFS or S3 Data to EFS with DataSync: POSIX Metadata Rules

## Status
validated

## Post Type
Technical migration guide with shell commands and DataSync task configuration.

## Technologies Covered
- AWS DataSync
- Amazon EFS and access points
- Amazon S3, archived storage classes, and object metadata
- AWS IAM and AWS KMS
- NFS and POSIX ownership, permissions, and timestamps
- AWS CLI and GNU Coreutils stat

## Sources Consulted
- [DataSync metadata behavior](https://docs.aws.amazon.com/datasync/latest/userguide/metadata-copied.html)
- [DataSync Options API reference](https://docs.aws.amazon.com/datasync/latest/apireference/API_Options.html)
- [DataSync NFS location requirements](https://docs.aws.amazon.com/datasync/latest/userguide/create-nfs-location.html)
- [DataSync S3 location configuration](https://docs.aws.amazon.com/datasync/latest/userguide/create-s3-location.html)
- [DataSync EFS location configuration](https://docs.aws.amazon.com/datasync/latest/userguide/create-efs-location.html)
- [EFS access-point identity enforcement](https://docs.aws.amazon.com/efs/latest/ug/enforce-identity-access-points.html)
- [AWS CLI head-object reference](https://docs.aws.amazon.com/cli/latest/reference/s3api/head-object.html)
- [AWS CLI describe-task-execution reference](https://docs.aws.amazon.com/cli/latest/reference/datasync/describe-task-execution.html)
- [GNU Coreutils stat reference](https://www.gnu.org/software/coreutils/manual/html_node/stat-invocation.html)

## Issues Found
No technical issues found.

## Review Notes
- Confirmed NFS-to-EFS preservation of numeric ownership, POSIX modes, modification times, and best-effort access times. Confirmed the documented S3 fallback of UID/GID 65534 and file/directory modes 0755 when DataSync metadata is absent.
- Confirmed that ordinary S3 LastModified is an object timestamp and does not establish the original filesystem modification time. The head-object command uses documented parameters and response fields with a valid JMESPath projection.
- Confirmed agent and NFS export access requirements, S3 location-role and encryption-key permissions, archive restoration requirements, and EFS TLS and root-access guidance. Identity-enforcing destination access points can replace transferred ownership and fail metadata verification.
- All nine task-option names and values are documented. The access-time and modification-time combination satisfies Basic mode dependencies. CHANGED supports repeated synchronization, ALWAYS permits updates, and PRESERVE retains destination-only files; REMOVE is compatible with CHANGED.
- ONLY_FILES_TRANSFERRED verifies transferred data rather than providing an independent full-dataset audit. The post appropriately also recommends sample hashes, numeric metadata checks, application-path testing, and stopping writers for final synchronization.
- The stat example uses GNU/Linux syntax, consistent with the post's Linux context; it is not the native macOS/BSD stat syntax. Its format directives correctly report numeric owner/group, octal mode, byte size, modification time, and filename.
- Access-point identity enforcement changes the identity used for filesystem requests; it does not create an alternate display of existing inode ownership. The recommendation to test both administrative and application access paths is appropriate.
- Parsed the JSON example and checked both shell examples with bash -n. Reviewed commands against official documentation; no live AWS transfer was performed, and example paths and bucket names require real resources and credentials.
- The technical documentation links resolve to the intended official resources. No deprecated API or option was identified. README.md was left unchanged.
