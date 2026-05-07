# Validation Summary: How to Automate State File Backups in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- AWS S3
- AWS CLI
- Terraform AWS Provider / OpenTofu AWS provider configuration
- Amazon EventBridge / CloudWatch Events
- Bash

## Sources Consulted
- OpenTofu `state push` command docs: https://opentofu.org/docs/cli/commands/state/push/
- AWS CLI `s3 cp` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- AWS CLI `list-object-versions` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/list-object-versions.html
- AWS CLI `get-object` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/get-object.html
- Amazon S3 Versioning docs: https://docs.aws.amazon.com/AmazonS3/latest/userguide/versioning-workflows.html
- Amazon S3 replication requirements: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-requirements.html
- Terraform AWS Provider `aws_s3_bucket_replication_configuration` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_replication_configuration.html.markdown
- Terraform AWS Provider `aws_s3_bucket_lifecycle_configuration` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_lifecycle_configuration.html.markdown
- Terraform AWS Provider `aws_cloudwatch_event_rule` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_event_rule.html.markdown

## Issues Found
- The replication example omitted the current AWS provider requirement to include `filter {}` when a rule has no filter. I added `filter {}` and a `depends_on` block so replication is configured only after source and DR bucket versioning are enabled, which aligns with the provider docs and S3 replication requirements.
- The replication example read like a complete snippet even though it depends on a preconfigured aliased provider and replication IAM role. I clarified that assumption in the surrounding text.
- The backup script used `aws s3 cp --server-side-encryption AES256`, but the `aws s3 cp` command uses `--sse`, not `--server-side-encryption`. I corrected the flag to `--sse AES256`.
- The backup script claimed to back up "all state files" even though it iterates over a fixed list of environments and components. I narrowed the wording so it accurately describes the script's behavior.
- The state existence check used `aws s3 ls` for object probing. I replaced it with `aws s3api head-object`, which is the direct object metadata check for this purpose.
- The EventBridge example claimed it would alert on stale state by itself, but an `aws_cloudwatch_event_rule` only schedules or matches events. I corrected the comments to explain that a separate target, such as a Lambda function, must inspect object age and send the alert.

## Review Notes
- The restore workflow using `aws s3api get-object --version-id ...` followed by `tofu state push` is technically valid, but `tofu state push` is a high-risk operation and should only be run from the configuration that is initialized against the correct backend.
- The lifecycle configuration for noncurrent state versions is valid as written. The post does not pin an AWS provider version, so future provider-level S3 lifecycle behavior changes could still affect exact defaults outside the shown arguments.
