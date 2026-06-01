# Validation Summary: How to Upload Files to S3 Using the AWS CLI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CLI v2
- Amazon S3
- S3 high-level commands (`aws s3 cp`, `aws s3 sync`, `aws s3 ls`)
- S3 metadata, content type, cache-control, server-side encryption, storage classes, multipart upload, and transfer configuration
- Bash pipelines for streamed uploads

## Sources Consulted
- AWS CLI `s3 cp` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- AWS CLI `s3 sync` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html
- AWS CLI high-level S3 commands user guide: https://docs.aws.amazon.com/cli/latest/userguide/cli-services-s3-commands.html
- AWS CLI S3 configuration reference: https://docs.aws.amazon.com/cli/latest/topic/s3-config.html
- AWS CLI retry configuration guide: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-retries.html
- AWS CLI installation guide: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
- Amazon S3 default encryption FAQ: https://docs.aws.amazon.com/AmazonS3/latest/userguide/default-encryption-faq.html

## Issues Found
- Corrected the content-type explanation to say the AWS CLI guesses MIME types during upload, not S3 itself. The AWS CLI `s3 cp` reference documents default MIME-type guessing and `--content-type` overrides.
- Corrected the performance configuration wording. The S3 transfer settings are profile/config-file settings, not per-command settings.
- Corrected the large-file `--expected-size` example. AWS documents `--expected-size` as applying to streamed uploads larger than 50 GB, so the post now shows automatic multipart upload for a local file and uses `--expected-size` only with a large stream.

## Review Notes
The AWS CLI was not installed in the local workspace, so command verification used official AWS documentation rather than local `aws --help` output. The remaining commands, options, config keys, encryption values, storage-class values, retry-mode mention, and stdin upload examples matched the official AWS CLI and S3 documentation.
