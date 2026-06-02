# Validation Summary: How to Sync a Local Directory with an S3 Bucket

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CLI
- Amazon S3
- `aws s3 sync`
- Bash
- Cron
- S3 server-side encryption
- S3 object metadata and cache headers

## Sources Consulted
- AWS CLI `s3 sync` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html
- AWS CLI high-level S3 command reference, include/exclude filters: https://docs.aws.amazon.com/cli/latest/reference/s3/
- AWS CLI S3 configuration reference: https://docs.aws.amazon.com/cli/latest/topic/s3-config.html

## Issues Found
- The post described sync as transferring files that are "new or changed" without qualifying that AWS CLI sync decides this by size and modified time rather than by content checksums. Updated the wording to match AWS's documented comparison behavior.
- The local-to-S3 example said sync skips files that are identical with the "same size and timestamp." AWS documents local-to-S3 uploads as occurring when the local file is missing remotely, has a different size, or has a newer modified time. Updated the comment to say same-sized files are skipped when the local file is not newer.
- The `--exact-timestamps` example used a local-to-S3 sync even though AWS documents this option as only applying to S3-to-local syncs. Reversed the example direction and clarified its purpose.
- The post claimed S3 transfer concurrency could be passed with `AWS_MAX_CONCURRENT_REQUESTS`, but AWS CLI S3 transfer settings are documented as S3 config values, not that environment variable. Replaced the example with a temporary AWS config file approach.
- The static website asset sync used `--exclude "*.html"` followed by asset includes. Because AWS CLI filters include everything by default and later filters only override earlier filters, that command would still sync non-HTML files beyond the listed assets with the long cache header. Changed it to start with `--exclude "*"` and then include only the intended asset extensions.

## Review Notes
- The local AWS CLI was not installed in the workspace, so command options were verified against official AWS CLI documentation rather than local `aws s3 sync help` output.
- The internal S3 Replication link maps to an existing post directory in this repository.
