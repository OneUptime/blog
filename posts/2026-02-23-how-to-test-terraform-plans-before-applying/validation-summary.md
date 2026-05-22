# Validation Summary: How to Test Terraform Plans Before Applying

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform plan JSON output
- jq
- Python
- Open Policy Agent (OPA)
- Rego
- GitHub Actions
- HashiCorp setup-terraform action
- actions/github-script

## Sources Consulted
- Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `show` command reference: https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform JSON output format: https://developer.hashicorp.com/terraform/internals/json-format
- Terraform `validate` command reference: https://developer.hashicorp.com/terraform/cli/commands/validate
- Terraform `fmt` command reference: https://developer.hashicorp.com/terraform/cli/commands/fmt
- Terraform `refresh` command reference: https://developer.hashicorp.com/terraform/cli/commands/refresh
- Terraform refresh-only tutorial: https://developer.hashicorp.com/terraform/tutorials/state/refresh
- OPA CLI and `opa eval` documentation: https://www.openpolicyagent.org/docs
- OPA Rego `if` keyword documentation: https://www.openpolicyagent.org/docs/policy-reference/keywords/if
- OPA Rego `contains` keyword documentation: https://www.openpolicyagent.org/docs/policy-reference/keywords/contains
- OPA Terraform integration documentation: https://www.openpolicyagent.org/docs/terraform
- HashiCorp setup-terraform action documentation: https://github.com/hashicorp/setup-terraform

## Issues Found
- The post said Terraform plan testing "costs nothing." Terraform plans do not create managed resources, but they can call provider APIs and interact with remote services, so the wording was too absolute. Changed it to say planning usually avoids infrastructure costs.
- The Rego example used pre-Rego-v1 partial set rule syntax (`deny[msg]` and `deletions[resource]`). Current OPA/Rego guidance uses `import rego.v1` with `contains` and `if` for multi-value rules. Updated the policy snippet to current Rego v1 syntax.
- The Common Pitfalls section recommended `terraform refresh`. HashiCorp documents `terraform refresh` as deprecated and recommends refresh-only plan/apply workflows instead. Updated the note to recommend `terraform plan -refresh-only` or `terraform apply -refresh-only`.

## Review Notes
- Terraform CLI commands and flags used in the post (`init`, `fmt -check -recursive`, `validate`, `plan -out`, `plan -var-file`, `plan -detailed-exitcode`, and `show -json`) match current Terraform documentation.
- The Terraform plan JSON examples correctly rely on `resource_changes` and `change.actions`, including scanning for `"delete"` to catch replacements.
- The GitHub Actions example uses current major versions of `actions/checkout`, `hashicorp/setup-terraform`, and `actions/github-script`. Workflows that post PR comments may still need appropriate repository token permissions depending on repository settings and forked pull request policy.
