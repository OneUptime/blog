# Validation Summary: How to Fix Terraform 'Error acquiring the state lock'

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform S3 backend
- AWS S3
- AWS DynamoDB
- AWS CLI
- GitHub Actions
- Python JSON tooling

## Sources Consulted
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform force-unlock command documentation: https://docs.hashicorp.com/terraform/cli/commands/force-unlock
- AWS CLI DynamoDB create-table command reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/create-table.html
- GitHub Actions contexts reference: https://docs.github.com/en/actions/learn-github-actions/contexts
- GitHub Actions workflow syntax reference: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- The post treated DynamoDB state locking for the S3 backend as current best practice. Current Terraform documentation marks DynamoDB-based locking as deprecated and recommends S3 lockfile-based locking with `use_lockfile = true`. Updated the wording and backend examples to make that distinction clear while preserving guidance for existing DynamoDB-backed setups.
- The GitHub Actions cleanup step used `if: failure() && steps.apply.outcome == 'failure'` after a step with `continue-on-error: true`. GitHub documents that a failed `continue-on-error` step has `outcome: failure` but final `conclusion: success`, so the status function can prevent the cleanup step from running. Changed the condition to `if: steps.apply.outcome == 'failure'`.

## Review Notes
The DynamoDB commands and required `LockID` string partition key are still valid for legacy Terraform S3 backend locking. The `terraform force-unlock` syntax and `-force` option match HashiCorp's command reference. The AWS CLI examples use valid command shapes, though local verification with installed `terraform` and `aws` binaries was not possible because those CLIs are not installed in this workspace.
