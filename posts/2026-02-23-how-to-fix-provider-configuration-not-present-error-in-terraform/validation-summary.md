# Validation Summary: How to Fix Provider Configuration Not Present Error in Terraform

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- Terraform (core CLI, state management)
- HCL (HashiCorp Configuration Language)
- Terraform providers (AWS, random)
- Terraform Cloud / Enterprise
- Terraform modules and provider aliases
- jq (for state JSON inspection)
- Bash scripting

## Sources Consulted
- Terraform CLI docs: `terraform state replace-provider` — https://developer.hashicorp.com/terraform/cli/commands/state/replace-provider
- Terraform CLI docs: `terraform providers` — https://developer.hashicorp.com/terraform/cli/commands/providers
- Terraform CLI docs: `terraform state rm` — https://developer.hashicorp.com/terraform/cli/commands/state/rm
- Terraform CLI docs: `terraform state pull` and state file format
- Terraform docs: Provider configuration and module provider passing (`providers = { ... }` block)
- Terraform Cloud configuration block reference

## Issues Found
- **`terraform state replace-provider` example used invalid argument syntax** (Cause 2 section).
  - The original example passed `'module.app:provider["registry.terraform.io/hashicorp/aws"].west'` and a similar bare provider address as the arguments. Per the official documentation, `terraform state replace-provider` accepts only `FROM_PROVIDER_FQN TO_PROVIDER_FQN` — i.e., provider source addresses like `registry.terraform.io/hashicorp/aws`. It does not support module path prefixes (`module.app:`) or alias suffixes (`.west`), and it always operates on all matching resources rather than filtering by alias or module.
  - Fixed by changing the example to a valid source-FQN replacement (e.g., swapping the upstream registry for an internal mirror) and adding a clarifying note that this command cannot retarget resources to a different alias or module-passed provider, with a pointer to the correct approach (keep the original provider configuration in place, or remove and re-import).

## Review Notes
- The five "cause/fix" categories accurately reflect the real-world situations that produce this error: removed provider blocks, alias/module-provider mismatches, removed module blocks, orphaned providers in state, and Terraform Cloud workspace migrations.
- The example `terraform providers` output in Cause 4 is slightly stylized (Terraform's actual output uses a tree-style layout with `├──` characters rather than `-` bullets), but the substantive content (`Providers required by configuration` vs. `Providers required by state`) is correct and the meaning is preserved. Left as-is.
- The bash script in the "Safe Cleanup Procedure" relies on grepping `terraform state show` output for the literal string `provider`, which only matches resources that explicitly set the `provider` argument (and so may miss resources using the default provider for an alias). It's a reasonable heuristic for the documented use case of finding resources tied to a specific aliased provider, and the subsequent `terraform state pull | jq` verification step is the authoritative check, so this was left in place.
- `terraform state rm 'module.old_app'` correctly removes all resources under that module address — verified against the state rm documentation.
- AMI ID `ami-0123456789abcdef0` is a placeholder and not a real AMI; that's appropriate for an example.
- Terraform Cloud `cloud {}` block syntax shown is current and correct.
