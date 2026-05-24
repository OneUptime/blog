# Validation Summary: How to Fix Terraform State Lock Stuck (ConditionalCheckFailedException)

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- Terraform (S3 backend with DynamoDB state locking)
- AWS DynamoDB
- AWS S3 (object versioning)
- AWS CLI
- GitHub Actions (workflow timeouts, concurrency)
- GitLab CI (resource_group)
- Bash scripting

## Sources Consulted
- Terraform S3 Backend documentation — https://developer.hashicorp.com/terraform/language/settings/backends/s3
- Terraform `force-unlock` command reference — https://developer.hashicorp.com/terraform/cli/commands/force-unlock
- Terraform `apply -refresh-only` — https://developer.hashicorp.com/terraform/tutorials/state/refresh
- AWS CLI DynamoDB `get-item` / `delete-item` reference — https://docs.aws.amazon.com/cli/latest/reference/dynamodb/
- AWS CLI S3 `copy-object` reference — https://docs.aws.amazon.com/cli/latest/reference/s3api/copy-object.html
- AWS DynamoDB `ConditionalCheckFailedException` documentation
- GitHub Actions concurrency control — https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency
- GitLab CI resource_group — https://docs.gitlab.com/ci/resource_groups/
- Terraform AWS provider `aws_dynamodb_table` resource — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- GNU `date` man page — https://man7.org/linux/man-pages/man1/date.1.html

## Issues Found
1. **BSD/macOS date syntax in Linux cron script** (Step 3, "Set Up Automatic Stale Lock Detection"): The script used `date -j -f "%Y-%m-%dT%H:%M:%S" "${CREATED%%.*}" +%s`, which is BSD/macOS-only syntax. Since the script is documented as running every 15 minutes via cron (typically on a Linux server) and uses `#!/bin/bash`, this would silently fail (the `2>/dev/null` would hide the error and the age check would be skipped). Replaced with GNU `date -d "$CREATED" +%s`, which correctly parses the ISO 8601 timestamp (including the trailing `Z`) on Linux distributions.

## Review Notes
- The post correctly identifies `ConditionalCheckFailedException` as the DynamoDB-level rejection of the conditional `PutItem` that Terraform uses to acquire the lock.
- The DynamoDB table schema (partition key `LockID` of type `S`) is correct and matches what Terraform requires for the legacy S3 + DynamoDB locking setup.
- All AWS CLI command syntax (`get-item`, `delete-item`, `copy-object`, `list-object-versions`, `scan`) is correct.
- The `terraform force-unlock <LOCK_ID>` command and the confirmation prompt text are accurate.
- `terraform apply -refresh-only` is correct (available since Terraform v0.15.4).
- The GitHub Actions `concurrency` block and GitLab `resource_group` examples are correct.
- The `aws_dynamodb_table` HCL example with `PAY_PER_REQUEST` billing and the `point_in_time_recovery` block is correct.
- **Forward-looking caveat (not changed):** As of Terraform v1.10+, HashiCorp introduced native S3 state locking via the `use_lockfile = true` backend option, which is now the recommended approach and is positioned to eventually replace the DynamoDB-based locking pattern. The DynamoDB approach described here remains widely deployed and fully functional, so the post is still accurate for current users, but readers starting fresh today may want to evaluate `use_lockfile` instead.
