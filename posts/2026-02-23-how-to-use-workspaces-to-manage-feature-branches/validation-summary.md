# Validation Summary: How to Use Workspaces to Manage Feature Branches

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform CLI workspaces
- Terraform S3 backend
- Terraform AWS provider
- AWS EC2
- AWS RDS
- Amazon Route 53
- GitHub Actions
- GitLab CI/CD
- Bash

## Sources Consulted
- Terraform CLI `workspace select` command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace/select
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform workspace state documentation: https://docs.hashicorp.com/terraform/language/state/workspaces
- Terraform AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform Random provider `random_integer` resource documentation: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/integer
- HashiCorp `setup-terraform` GitHub Action documentation: https://github.com/hashicorp/setup-terraform
- GitHub Actions pull request event documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- GitLab CI/CD environments documentation: https://docs.gitlab.com/ci/environments/
- GitLab dotenv variables documentation: https://docs.gitlab.com/ci/variables/dotenv_variables/
- GitLab CI/CD variable usage documentation: https://docs.gitlab.com/ci/variables/where_variables_can_be_used/

## Issues Found
- The S3 backend example used `dynamodb_table` for Terraform state locking. Terraform's S3 backend documentation now marks DynamoDB-based locking as deprecated, so the example was updated to use `use_lockfile = true`.
- The GitLab CI example set `environment:url` to `$(terraform output -raw url)`. GitLab does not execute shell command substitution in `environment:url`; it expands CI variables. The example now writes the Terraform output to a dotenv artifact and uses `$FEATURE_ENV_URL`, which is the documented GitLab pattern for dynamic environment URLs.
- The networking example said `random_integer` avoids CIDR conflicts between branches. The random provider generates a persisted random value per state, but it does not coordinate uniqueness across workspaces or existing subnets. The comment was changed to say it reduces CIDR overlap risk.

## Review Notes
Terraform was not installed in the local environment, so CLI behavior was checked against official documentation rather than local `terraform validate` output. The Terraform snippets are illustrative and still assume surrounding production details such as existing VPC routing, security groups, IAM permissions, variables, and provider credentials.
