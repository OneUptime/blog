# Validation Summary: How to Handle Concurrent State Access in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Amazon S3 backend configuration
- Amazon DynamoDB
- Amazon CloudWatch
- GitHub Actions
- HCL
- YAML
- AWS CLI

## Sources Consulted
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu state locking documentation: https://opentofu.org/docs/v1.6/language/state/locking/
- OpenTofu `force-unlock` command documentation: https://opentofu.org/docs/cli/commands/force-unlock/
- OpenTofu `apply` command documentation: https://opentofu.org/docs/v1.11/cli/commands/apply/
- GitHub Actions concurrency documentation: https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency
- GitHub Actions workflow syntax and concurrency context rules: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions context availability reference: https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/accessing-contextual-information-about-workflow-runs
- AWS CLI `dynamodb get-item` reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/get-item.html
- DynamoDB metrics reference: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html
- Official AWS provider `aws_dynamodb_table` resource documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/dynamodb_table.html.markdown
- Official AWS provider `aws_cloudwatch_metric_alarm` resource documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudwatch_metric_alarm.html.markdown

## Issues Found
- The post described DynamoDB locking as the standard S3-backend mechanism. I updated the introduction and conclusion to reflect current OpenTofu guidance: native S3 locking via `use_lockfile = true` is preferred for the S3 backend, while DynamoDB locking remains fully supported.
- The DynamoDB table example did not mention that the backend lock table must already exist before `tofu init` can use it. I updated the code comment above the `aws_dynamodb_table` example to make that prerequisite explicit.
- The "Lock Timeout Configuration" section incorrectly presented `-lock-timeout` as something configured in HCL and used an unrelated `null_resource` example. I replaced that snippet with a CLI-focused note because `-lock-timeout` is a command-line flag.
- The GitHub Actions concurrency example used `matrix.environment` at workflow scope, which is not valid for top-level `concurrency`, and its comment implied generic queueing behavior. I changed the snippet to a valid workflow-level concurrency group using supported contexts and adjusted the wording to describe serialization accurately.
- The "Per-Workspace Lock Tables" section implied separate tables are needed to reduce contention. I revised it to describe separate per-environment tables as an optional administrative separation pattern and noted that one DynamoDB table can lock multiple remote state files.
- The CloudWatch alarm example described `ConsumedWriteCapacityUnits` as if it measured lock wait time. I updated the comment and example names so they match what the metric actually represents: lock table write activity.

## Review Notes
- OpenTofu currently supports both DynamoDB locking and native S3 locking for the S3 backend, but the S3 backend documentation explicitly marks native S3 locking as the preferred option.
- GitHub Actions concurrency groups allow at most one running and one pending run per group, and ordering is not guaranteed.
- The `tofu` CLI binary was not installed in the local environment, so CLI flags and command behavior were validated against the official OpenTofu documentation instead of local `--help` output.
