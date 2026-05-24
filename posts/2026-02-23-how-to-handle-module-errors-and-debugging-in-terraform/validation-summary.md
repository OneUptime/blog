# Validation Summary: How to Handle Module Errors and Debugging in Terraform

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Terraform (CLI, HCL configuration language)
- Terraform modules (root, child, nested)
- Terraform environment variables (`TF_LOG`, `TF_LOG_PATH`)
- Terraform commands: `console`, `plan`, `apply`, `validate`, `init`, `state`, `output`
- Terraform lifecycle blocks (preconditions / postconditions, introduced in 1.2)
- `-target` and `-replace` flags
- AWS provider examples (aws_instance, aws_vpc, aws_subnet) for illustration

## Sources Consulted
- Terraform CLI debugging / TF_LOG: https://developer.hashicorp.com/terraform/internals/debugging
- terraform console command: https://developer.hashicorp.com/terraform/cli/commands/console
- terraform validate: https://developer.hashicorp.com/terraform/cli/commands/validate
- terraform state: https://developer.hashicorp.com/terraform/cli/commands/state
- terraform plan -target / apply -target: https://developer.hashicorp.com/terraform/cli/commands/plan and https://developer.hashicorp.com/terraform/cli/commands/apply
- terraform apply -replace: https://developer.hashicorp.com/terraform/cli/commands/plan#replace-address
- Local values (private to module): https://developer.hashicorp.com/terraform/language/values/locals
- `type()` function (console-only): https://developer.hashicorp.com/terraform/language/functions/type
- Module providers meta-argument: https://developer.hashicorp.com/terraform/language/modules/develop/providers
- Lifecycle preconditions / postconditions (1.2+): https://developer.hashicorp.com/terraform/language/expressions/custom-conditions

## Issues Found
1. **Invalid use of `type()` in an `output` block.** The original `debug_subnet_types` output used `type(s)` inside a `for` expression. Per the official docs, `type()` is a console-only function and is rejected during `plan`/`apply` ("Call to unknown function"). Replaced the example with `debug_subnet_count` using `length()`, preserving the section's intent of exposing intermediate values via debug outputs.
2. **Invalid access to a child module's `local` from outside.** The `terraform console` snippet read `module.compute.local.cluster_name`. Locals are module-private and there is no `module.<name>.local.<x>` syntax — only declared outputs are reachable across the module boundary. Replaced with a nested-module output reference (`module.compute.module.cluster.cluster_name`) which is valid `terraform console` syntax and keeps the section's point about traversing nested modules.

## Review Notes
- Cycle-detection error message format is illustrative; actual Terraform output may format the cycle list slightly differently but the conceptual fix (introducing a shared third module) is correct.
- The for_each/count "value not known at plan time" example is accurate for Terraform's planning model; if `module.networking` already exists in state, the snippet may succeed, but the warning the post gives still applies in the general case.
- The `-target` caveat ("only for debugging, run a full plan afterwards") matches HashiCorp's own guidance.
- The post correctly attributes preconditions/postconditions to Terraform 1.2.
