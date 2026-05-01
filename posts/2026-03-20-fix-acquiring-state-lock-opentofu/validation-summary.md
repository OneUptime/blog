# Validation Summary: How to Fix 'Error Acquiring the State Lock' in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu S3 backend
- Amazon S3
- Amazon DynamoDB
- GitHub Actions

## Sources Consulted
- OpenTofu `force-unlock` command docs: https://opentofu.org/docs/cli/commands/force-unlock/
- OpenTofu `plan` command docs (`-lock-timeout`): https://opentofu.org/docs/cli/commands/plan/
- OpenTofu S3 backend docs: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu state locking docs: https://opentofu.org/docs/language/state/locking/
- OpenTofu 1.9 S3 backend docs, including DynamoDB lock key behavior: https://opentofu.org/docs/v1.9/language/settings/backends/s3/
- OpenTofu source for S3 backend lock path and DynamoDB lock item handling: https://github.com/opentofu/opentofu/blob/main/internal/backend/remote-state/s3/client.go
- GitHub Actions concurrency docs: https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-when-your-workflow-runs/control-the-concurrency-of-workflows-and-jobs
- Amazon DynamoDB metrics docs (`ConditionalCheckFailedRequests`): https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html

## Issues Found
- The sample `Lock Info.Path` used an `s3://` URI. OpenTofu stores and reports the S3/DynamoDB lock path as `bucket/key`, so the example was corrected to `my-state-bucket/prod/app/tofu.tfstate`.
- The post claimed that lock timeout is set in backend configuration. In OpenTofu, `-lock-timeout` is a CLI flag on commands such as `tofu plan` and `tofu apply`, so the section was corrected to distinguish backend locking configuration from command timeout behavior.
- The CloudWatch example incorrectly used DynamoDB's `ConditionalCheckFailedRequests` metric as if it represented lock age. That metric counts failed conditional writes and indicates contention, not stale-lock duration, so the section was corrected to recommend alerting based on the lock item's `Info.Created` timestamp instead.

## Review Notes
- OpenTofu 1.10+ supports native S3 locking with `use_lockfile = true`, and current docs describe it as the preferred S3 locking mechanism. This post remains technically valid for DynamoDB-based locking because DynamoDB locking is still supported and not deprecated.
