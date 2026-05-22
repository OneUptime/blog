# Validation Summary: How to Handle Terraform Output Rendering Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform plan files
- Terraform JSON output
- Terraform output values
- Bash
- jq
- GitHub CLI

## Sources Consulted
- HashiCorp Terraform `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform `show` command documentation: https://developer.hashicorp.com/terraform/cli/commands/show
- HashiCorp Terraform JSON output format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- HashiCorp Terraform output values tutorial: https://developer.hashicorp.com/terraform/tutorials/configuration-language/outputs
- HashiCorp Terraform `output` command documentation: https://developer.hashicorp.com/terraform/cli/commands/output
- HashiCorp Terraform output block reference: https://developer.hashicorp.com/terraform/language/block/output
- HashiCorp Terraform sensitive data documentation: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- HashiCorp Terraform create a plan tutorial: https://developer.hashicorp.com/terraform/tutorials/cli/plan

## Issues Found
- The post said redirecting `terraform plan` output skips terminal rendering entirely. Updated this to clarify that Terraform still prepares command output, but redirecting avoids displaying, capturing, and processing the full terminal or CI log.
- The post said `terraform plan -out=plan.tfplan` requires no rendering and that saved plans avoid rendering twice. HashiCorp documents that saved plans can still be shown when created, and that saved plan files are primarily used to apply exactly the reviewed plan without creating a new plan. Updated the wording and command comment accordingly.
- The post said `terraform apply plan.tfplan` does not re-render the plan and just applies saved changes. Updated the wording to the more precise documented behavior: Terraform does not create a new plan for approval when applying a saved plan.
- The post claimed JSON output is faster to generate and that `terraform show -json | jq ...` is the fastest way to query a specific resource. HashiCorp documents JSON output as machine-readable, but does not guarantee it is faster than human-readable output or faster than `terraform state show` for a specific resource. Updated those claims to describe JSON as easier to process programmatically and as an alternative filtering approach.
- The summary repeated the inaccurate "save plans to files instead of rendering twice" performance claim. Updated it to say saved plans ensure apply uses exactly the reviewed plan.

## Review Notes
Terraform was not installed in the local workspace, so CLI behavior was verified against official HashiCorp documentation rather than local `terraform --help` output. The remaining examples use valid Terraform CLI flags and syntactically plausible Bash, HCL, and jq snippets. The GitHub CLI example is intentionally minimal and assumes `gh` is authenticated and `PR_NUMBER` is set in the CI environment.
