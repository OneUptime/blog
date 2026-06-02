# Validation Summary: How to Transfer Data Between On-Premises and S3 with DataSync

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS DataSync
- Amazon S3
- AWS IAM
- AWS KMS
- AWS CLI
- Amazon CloudWatch Logs
- NFS and SMB file shares

## Sources Consulted
- AWS CLI Command Reference: `aws datasync create-task` - https://docs.aws.amazon.com/cli/latest/reference/datasync/create-task.html
- AWS CLI Command Reference: `aws datasync create-location-nfs` - https://docs.aws.amazon.com/cli/latest/reference/datasync/create-location-nfs.html
- AWS CLI Command Reference: `aws datasync create-agent` - https://docs.aws.amazon.com/cli/latest/reference/datasync/create-agent.html
- AWS DataSync: Activating your AWS DataSync agent - https://docs.aws.amazon.com/datasync/latest/userguide/activate-agent.html
- AWS DataSync: Configuring AWS DataSync transfers with Amazon S3 - https://docs.aws.amazon.com/datasync/latest/userguide/create-s3-location.html
- AWS DataSync: Transferring specific files, objects, and folders by using filters - https://docs.aws.amazon.com/datasync/latest/userguide/filtering.html
- AWS DataSync: Understanding how DataSync handles file and object metadata - https://docs.aws.amazon.com/datasync/latest/userguide/metadata-copied.html
- AWS DataSync API Reference: DescribeTaskExecution - https://docs.aws.amazon.com/datasync/latest/apireference/API_DescribeTaskExecution.html
- AWS DataSync: Scheduling when your AWS DataSync task runs - https://docs.aws.amazon.com/datasync/latest/userguide/task-scheduling.html
- AWS DataSync pricing - https://aws.amazon.com/datasync/pricing/

## Issues Found
- The S3 bucket access policy omitted versioned object read/tagging permissions that AWS includes for S3 destination locations. Added `s3:GetObjectVersion` and `s3:GetObjectVersionTagging`.
- The post enabled SSE-KMS bucket encryption but did not mention that the customer managed KMS key policy must allow the DataSync role to use the key. Added the required KMS permissions note.
- The agent activation curl used outdated query parameters. Updated it to the current documented `gatewayType=SYNC&activationRegion=...&no_redirect` form.
- The include filter example used extension-style patterns such as `*.pdf`, but DataSync include filters only support `*` as the rightmost character. Replaced the include example with supported path-prefix patterns and clarified the limitation.
- The metadata explanation incorrectly said `ObjectTags=PRESERVE` stores NFS/SMB file metadata as S3 object tags. Updated it to explain that NFS-to-S3 file metadata is stored as S3 user metadata, while `ObjectTags` applies to object storage transfers.
- The verification query referenced non-existent `Result.TransferredFiles`, `Result.TransferredBytes`, and `Result.VerifiedFiles` fields. Updated it to use the documented top-level `FilesTransferred`, `BytesTransferred`, and `FilesVerified` fields and corrected `PrepareStatus`.
- The scheduling example created an EventBridge rule but did not connect it to the DataSync task. Replaced it with the documented DataSync `update-task --schedule` command.

## Review Notes
The local AWS CLI was not installed in the review environment, so commands were checked against official AWS CLI and AWS DataSync documentation rather than local `--help` output. Pricing was current as checked on June 2, 2026; AWS pricing can change and should be rechecked before publishing cost-sensitive guidance.
