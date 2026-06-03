# Validation Summary: How to Download Files from S3 Using the AWS CLI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3
- AWS CLI `s3` high-level commands
- AWS CLI `s3api` commands
- Bash shell scripting
- Presigned URLs
- IAM permissions for S3 object downloads

## Sources Consulted
- AWS CLI Command Reference: `aws s3 cp` - https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- AWS CLI Command Reference: `aws s3 sync` - https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html
- AWS CLI Command Reference: `aws s3 ls` - https://docs.aws.amazon.com/cli/latest/reference/s3/ls.html
- AWS CLI Command Reference: high-level `aws s3` include/exclude filters - https://docs.aws.amazon.com/cli/latest/reference/s3/
- AWS CLI S3 configuration reference - https://docs.aws.amazon.com/cli/latest/topic/s3-config.html
- AWS CLI Command Reference: `aws s3api list-object-versions` - https://docs.aws.amazon.com/cli/latest/reference/s3api/list-object-versions.html
- AWS CLI Command Reference: `aws s3api get-object` - https://docs.aws.amazon.com/cli/latest/reference/s3api/get-object.html
- Amazon S3 API Reference: `GetObject` permissions and version IDs - https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html
- Amazon S3 User Guide: sharing objects with presigned URLs - https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html

## Issues Found
- The `--size-only` example comment said "Sync only recent files (by size, not date)", but `--size-only` does not filter for recency. It makes object/file size the only comparison criterion. Updated the comment to say it syncs using file size only and ignores timestamps.
- The Access Denied note only mentioned `s3:GetObject`. That is correct for current object downloads, but downloading a specific version requires `s3:GetObjectVersion`. Updated the note to include both permission cases.
- The interrupted-downloads note said rerunning `sync` would "pick up where it left off", which can imply byte-level resume of a partially downloaded object. Updated it to state that rerunning `sync` skips files that already downloaded successfully.

## Review Notes
- The remaining AWS CLI examples and flags are current and consistent with AWS CLI v2 documentation.
- The local environment did not have the `aws` CLI installed, so validation used official AWS documentation rather than local `aws --help` output.
