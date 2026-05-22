# Validation Summary: How to Use Terraform with Resource Parallelism

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform dependency graph
- Terraform resource meta-arguments (`depends_on`, `for_each`)
- HCP Terraform / Terraform Cloud remote runs
- AWS provider resource examples

## Sources Consulted
- Terraform dependency graph internals: https://developer.hashicorp.com/terraform/internals/graph
- Terraform apply command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform destroy command reference: https://developer.hashicorp.com/terraform/cli/commands/destroy
- Terraform meta-arguments reference: https://developer.hashicorp.com/terraform/language/meta-arguments
- Terraform `for_each` reference: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform references and dependency inference: https://developer.hashicorp.com/terraform/language/expressions/references
- Terraform module block reference: https://developer.hashicorp.com/terraform/language/modules/syntax
- HCP Terraform CLI-driven remote run workflow: https://developer.hashicorp.com/terraform/cloud-docs/run/cli
- HCP Terraform run environment and run concurrency notes: https://developer.hashicorp.com/terraform/enterprise/workspaces/run/run-environment
- AWS provider `aws_s3_bucket` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- AWS provider `aws_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance

## Issues Found
- The provider-specific parallelism examples implied fixed safe concurrency ranges for AWS, Azure, and GCP. These limits are account-, region-, API-, and resource-dependent, so the comments were changed to example tuning values that must be tested against the user's own quotas and throttling behavior.
- The module dependency example said that referencing `module.a.output_value` creates a full module dependency. Terraform infers dependencies from references, and a full module-wide dependency is created by module-level `depends_on`. The example was changed to use `depends_on = [module.a]`, and the guidance now recommends passing the specific needed value so Terraform can infer a narrower dependency.
- The monitoring section claimed Terraform progress output shows timestamps. Standard Terraform progress output shows operation start/completion and elapsed durations, not timestamps. The text now says the output shows when operations start and finish.

## Review Notes
Terraform was not installed in the workspace, so CLI flag verification was performed against official Terraform CLI documentation instead of local `terraform --help` output. The `-parallelism` flag, default concurrency of 10, graph-walk explanation, `for_each` usage, `depends_on` usage, and destroy behavior were confirmed against official documentation.
