# Validation Summary: How to Handle Common Workspace Pitfalls in Terraform

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Terraform (CLI workspaces, HCL configuration)
- Terraform S3 backend with DynamoDB locking
- AWS resources (S3, IAM `assume_role`)
- Bash wrapper scripts
- GitHub Actions concurrency controls
- Terraform `terraform_data` / `null_resource` / `precondition` / `check` constructs

## Sources Consulted
- Terraform Language: Checks — https://developer.hashicorp.com/terraform/language/checks
- Terraform Language: Custom Conditions (preconditions/postconditions) — https://developer.hashicorp.com/terraform/language/expressions/custom-conditions
- Terraform S3 Backend — https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform CLI: `terraform plan` (incl. `-detailed-exitcode`) — https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform CLI: Workspaces — https://developer.hashicorp.com/terraform/cli/workspaces
- Terraform Language: State Workspaces (`.terraform/environment`) — https://developer.hashicorp.com/terraform/language/state/workspaces

## Issues Found
- **Pitfall 5 — `check` block misused as an enforcement mechanism.** The original post presented a `check "no_default_workspace"` block as a "cleaner approach" for preventing apply on the `default` workspace. Per HashiCorp's official documentation, `check` blocks only emit warnings on failure and do not block planning or applying. They are therefore unsuitable for enforcement. I replaced the example with a `precondition` inside a `terraform_data` resource's `lifecycle` block, which actually fails the plan when the condition is false. Added a brief clarifying note explaining why `check` would not work here.

## Review Notes
- **Pitfall 5 first example (the `count` "trick"):** The author explicitly frames this as a hacky trick and immediately follows with the cleaner approach, so I left it as-is. Terraform's type unification on the ternary may surface the error slightly differently across versions, but the practical outcome (failure when on the forbidden workspace) is acceptable for the rhetorical setup of "this works, but here is a better way".
- **Pitfall 7 (S3 backend locking):** The DynamoDB-based locking example is still valid and widely deployed, but as of Terraform 1.10 (Nov 2024) the S3 backend supports native locking via `use_lockfile = true`, and the DynamoDB approach is now deprecated. A future revision could mention the native option, but the current example remains technically correct.
- **Pitfall 1 shell prompt indicator:** Relies on `.terraform/environment`, which is correct for the local backend and for Terraform CLI workspaces. Some backends (e.g., remote/cloud) may not write this file, but for the audience of this post (local CLI workspaces) the snippet is accurate.
- **Pitfall 10 (`-detailed-exitcode`):** Exit codes used (0 = no changes, 1 = error, 2 = changes detected) match the official documentation.
- All Bash, HCL, and YAML snippets are syntactically valid and follow current Terraform conventions.
