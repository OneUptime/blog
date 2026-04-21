# Validation Summary: How to Handle State Locking for Concurrent Team Access in OpenTofu

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTofu state locking
- OpenTofu S3 backend
- DynamoDB lock tables
- AWS CLI for DynamoDB
- Terraform/OpenTofu HCL with the AWS provider
- GitHub Actions workflow snippets
- Amazon CloudWatch alarms

## Sources Consulted
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu state locking documentation: https://opentofu.org/docs/language/state/locking/
- OpenTofu `force-unlock` command documentation: https://opentofu.org/docs/cli/commands/force-unlock/
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command documentation: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu `output` command documentation: https://opentofu.org/docs/cli/commands/output/
- OpenTofu environment variables documentation: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu S3 backend source for DynamoDB lock item schema: https://github.com/opentofu/opentofu/blob/main/internal/backend/remote-state/s3/client.go
- OpenTofu lock metadata source: https://github.com/opentofu/opentofu/blob/main/internal/states/statemgr/locker.go
- AWS DynamoDB TTL documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html
- AWS DynamoDB TTL enablement documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/time-to-live-ttl-how-to.html
- AWS DynamoDB metrics and dimensions documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html
- AWS Database Blog on DynamoDB item count and table size metrics: https://aws.amazon.com/blogs/database/how-to-use-amazon-cloudwatch-to-monitor-amazon-dynamodb-table-size-and-item-count-metrics/
- HashiCorp AWS provider `aws_dynamodb_table` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- HashiCorp AWS provider `aws_dynamodb_table_item` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/dynamodb_table_item
- HashiCorp AWS provider `aws_cloudwatch_metric_alarm` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm

## Issues Found
1. **S3 backend locking was described too narrowly**: The post implied DynamoDB is the S3 backend locking mechanism. Current OpenTofu documentation says S3 backends support multiple locking mechanisms: DynamoDB via `dynamodb_table` and S3-native lockfiles via `use_lockfile`. Updated the wording to describe DynamoDB as one supported mechanism.
2. **DynamoDB TTL was presented as automatic stale-lock cleanup**: OpenTofu's DynamoDB lock item contains `LockID` and `Info`, while DynamoDB TTL requires a numeric per-item expiration attribute. Removed the TTL block from the table example and changed the best practice to warn that TTL only works if separate automation writes a TTL attribute.
3. **Force-unlock ID source was ambiguous**: The DynamoDB partition key is named `LockID`, but `tofu force-unlock` needs the unique lock metadata ID stored in the lock info. Clarified that the ID comes from the error output or the DynamoDB item's `Info.ID` field.
4. **`aws_dynamodb_table_item` caveat was missing**: The data source errors when the requested item does not exist, which is the normal state when no lock is held. Added a comment so readers do not mistake it for a general no-lock-safe monitoring query.
5. **Invalid `tofu output -lock=false` command**: Current OpenTofu `output` documentation does not include a `-lock` option. Replaced it with `tofu output` and noted that the command has no `-lock` flag.
6. **Saved-plan apply example included a no-op approval flag**: OpenTofu ignores `-auto-approve` when a saved plan file is passed to `tofu apply`. Removed the flag from the CI/CD example.
7. **CloudWatch stale-lock alarm used the wrong metric**: `AWS/DynamoDB` does not provide an `ItemCount` metric suitable for lock age, and table item count would not distinguish active locks from digest items or prove that a lock is older than one hour. Replaced the alarm with a custom `LockAgeSeconds` metric example based on the lock item's `Info.Created` timestamp.

## Review Notes
- The remaining DynamoDB table HCL uses supported AWS provider arguments for on-demand billing, a string `LockID` hash key, point-in-time recovery, and `prevent_destroy`.
- The AWS CLI scan example is syntactically valid, though a direct `get-item` is usually more efficient when the exact lock path is known.
- `tofu force-unlock` prompts for confirmation unless `-force` is supplied; leaving the prompt in place is reasonable for a manual recovery example.
