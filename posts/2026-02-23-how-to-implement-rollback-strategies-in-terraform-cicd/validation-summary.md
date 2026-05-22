# Validation Summary: How to Implement Rollback Strategies in Terraform CI/CD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI and Terraform state
- Terraform S3 backend
- GitHub Actions workflows
- AWS CLI for S3, RDS, and EC2
- AWS RDS, S3, EBS, DynamoDB, and EFS
- jq and shell scripting

## Sources Consulted
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform state push command documentation: https://developer.hashicorp.com/terraform/cli/commands/state/push
- HashiCorp Terraform state locking documentation: https://developer.hashicorp.com/terraform/language/state/locking
- HashiCorp Terraform state command documentation: https://developer.hashicorp.com/terraform/cli/commands/state
- HashiCorp Terraform releases: https://releases.hashicorp.com/terraform/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- actions/checkout documentation: https://github.com/actions/checkout
- AWS CLI get-object documentation: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/s3api/get-object.html
- AWS CLI create-db-snapshot documentation: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-snapshot.html
- AWS CLI create-snapshot documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-snapshot.html
- Terraform AWS Provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- The S3 backend example used `dynamodb_table` for state locking. Terraform's S3 backend now marks DynamoDB-based locking as deprecated, so the snippet was updated to use `use_lockfile = true`.
- The backend comment implied S3 bucket versioning could be enabled by the backend block. The comment was changed to clarify that the backend should use an S3 bucket with versioning already enabled.
- The workflow examples pinned Terraform to `1.7.0`, which predates current S3 native lockfile guidance. The examples were updated to `1.15.4`, the latest stable release listed by HashiCorp on 2026-05-22.
- The state comparison step changed into the `terraform` directory and then referenced `previous-state.tfstate` as if it were in that directory. The path was corrected to `../previous-state.tfstate`.
- The state restore example uploaded the state file directly with `aws s3 cp`, bypassing Terraform backend state handling. It was changed to `terraform state push -force ../previous-state.tfstate`, with an emergency-use warning because restoring an older serial requires `-force`.
- The targeted and automated rollback examples used `ref: HEAD~1` in `actions/checkout`. The official checkout example fetches two commits and then runs `git checkout HEAD^`, so both snippets were updated to that pattern.
- The health-check step used `continue-on-error: true`, which allows a failed step to pass and would prevent the rollback job from being triggered as intended. That option was removed so the dependent rollback job can run on failure.

## Review Notes
- The `-target` option is valid for Terraform plan/apply, but it should remain an exceptional recovery mechanism because targeted operations can skip unrelated dependency changes.
- The snapshot discovery shell snippets are intentionally simple and depend on Terraform state output format. For production use, JSON state parsing would be more robust.
