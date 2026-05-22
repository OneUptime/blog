# Validation Summary: How to Handle Terraform for Thousands of Resources

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform CLI
- Terraform state and backends
- Terraform `terraform_remote_state` data source
- Terraform `for_each`, `count`, and `moved` language features
- AWS Terraform provider
- GitHub Actions
- Python JSON processing

## Sources Consulted
- Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform CLI environment variables reference: https://developer.hashicorp.com/terraform/cli/config/environment-variables
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform `terraform_remote_state` data source documentation: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- Terraform `for_each` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform `moved` block reference: https://developer.hashicorp.com/terraform/language/block/moved
- Terraform state refactoring documentation: https://developer.hashicorp.com/terraform/language/state/refactor
- AWS provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- Python `json` module documentation: https://docs.python.org/3/library/json.html

## Issues Found
- The post claimed `for_each` should be used instead of `count` for better performance. Terraform documentation describes `for_each` in terms of keyed resource instances and stable identities, not as a general performance optimization. Updated the heading text and comments to describe stable keys instead of performance.
- The post recommended `moved` blocks for moving resources between state files. Terraform `moved` blocks are for address changes in configuration, while splitting resources between state files requires a state migration workflow such as `removed` and `import` blocks or `terraform state mv`. Updated the best-practice note accordingly.

## Review Notes
Terraform was not installed in the local workspace, so CLI flags were verified against the official Terraform CLI documentation instead of local `terraform --help` output. The `-target` examples are technically valid, but Terraform documents targeting as an exceptional-circumstances feature and recommends splitting large configurations instead of relying on targeting for routine operations.
