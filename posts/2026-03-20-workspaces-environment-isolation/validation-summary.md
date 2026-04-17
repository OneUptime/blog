# Validation Summary: How to Use Workspaces for Environment Isolation in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- OpenTofu (workspaces, CLI, HCL)
- Terraform-compatible language constructs (`terraform.workspace`, lifecycle, locals, variables)
- AWS provider resources: `aws_instance`, `aws_vpc`, `aws_s3_bucket`, `aws_caller_identity`
- Bash (deployment pipeline script)

## Sources Consulted
- OpenTofu workspace CLI docs: https://opentofu.org/docs/cli/commands/workspace/
- OpenTofu lifecycle meta-argument docs: https://opentofu.org/docs/language/meta-arguments/lifecycle/
- OpenTofu resources behavior docs (lifecycle literal-value constraint)
- Terraform lifecycle meta-argument docs: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform `terraform.workspace` reference (retained in OpenTofu for compatibility)

## Issues Found
- **Dynamic `prevent_destroy` in `lifecycle` block.** The original `aws_instance.app` example used `prevent_destroy = terraform.workspace == "production" ? true : false`. Lifecycle arguments must be literal values and cannot be dynamic expressions — this would produce a plan-time error. Removed the broken `lifecycle` block from the example to eliminate the incorrect guidance. The author's intent (protecting production) is better achieved through deployment-time guards, which the post already demonstrates via the `deploy.sh` confirmation prompt.

## Review Notes
- `terraform.workspace` is still the correct reference in OpenTofu (kept for Terraform compatibility).
- `tofu init`, `tofu workspace new/select/list/show`, `tofu plan -var-file`, `tofu apply <plan>`, and `tofu state list` are all accurate CLI invocations.
- The `deploy.sh` uses `grep -q "$ENVIRONMENT"` against `tofu workspace list` output; this is functional but would substring-match (e.g., `dev` would match `development`). Not incorrect, just something to watch for in practice — not modified.
- The `variable "environment"` declaration is present but shadowed by `local.environment = terraform.workspace`. This is intentional per the author's comment ("Use workspace as the authoritative source of environment"), and locals/variables live in separate namespaces, so it is syntactically fine.
- S3 bucket naming example correctly notes that bucket names are globally unique and uses workspace + account ID to disambiguate.
