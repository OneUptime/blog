# Validation Summary: How to Migrate Data to S3 Using AWS DataSync

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS DataSync
- Amazon S3
- AWS CLI
- NFS
- SMB
- Amazon CloudWatch Logs
- AWS IAM

## Sources Consulted
- AWS CLI Command Reference: create-agent - https://docs.aws.amazon.com/cli/latest/reference/datasync/create-agent.html
- AWS CLI Command Reference: create-location-nfs - https://docs.aws.amazon.com/cli/latest/reference/datasync/create-location-nfs.html
- AWS CLI Command Reference: create-location-smb - https://docs.aws.amazon.com/cli/latest/reference/datasync/create-location-smb.html
- AWS CLI Command Reference: create-location-s3 / AWS DataSync S3 location guide - https://docs.aws.amazon.com/datasync/latest/userguide/create-s3-location.html
- AWS CLI Command Reference: create-task - https://docs.aws.amazon.com/cli/latest/reference/datasync/create-task.html
- AWS CLI Command Reference: describe-task-execution - https://docs.aws.amazon.com/cli/latest/reference/datasync/describe-task-execution.html
- AWS DataSync agent activation guide - https://docs.aws.amazon.com/datasync/latest/userguide/activate-agent.html
- AWS DataSync filtering guide - https://docs.aws.amazon.com/datasync/latest/userguide/filtering.html
- AWS DataSync pricing - https://aws.amazon.com/datasync/pricing/

## Issues Found
- The S3 destination location used `--subdirectory "/migrated-data"`. AWS DataSync documentation warns that S3 prefixes cannot begin with a slash, so this was changed to `--subdirectory "migrated-data"`.
- The include filter example used `*.csv|*.parquet`. AWS DataSync include filters only support `*` as the rightmost character in a pattern, so this was changed to an example that includes specific folders with `/csv-data/*|/parquet-data/*`.
- The monitoring section said `describe-task-execution` returns estimated time remaining. The official CLI output documents status, timestamps, transfer counters, and error details, but not an estimated time remaining field, so the wording was corrected.
- The cost example treated 10 TB as about $125 without caveats. The wording was updated to clarify that this is the Basic mode DataSync transfer charge before S3 request, storage, and other service charges.

## Review Notes
The remaining commands and option names match current AWS CLI documentation. The IAM policy shown matches AWS's destination S3 permission model at a high level, though production setups may also need additional conditions, bucket policies, or KMS permissions depending on encryption and account boundaries.
