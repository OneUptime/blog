# Validation Summary: How to Avoid Common Module Design Mistakes in OpenTofu

## Status
validated

## Post Type
Guide / Best practices

## Technologies Covered
- OpenTofu
- Terraform (HCL)
- AWS provider (aws_vpc, aws_iam_role_policy, aws_subnet)
- Module composition patterns

## Sources Consulted
- OpenTofu module documentation: https://opentofu.org/docs/language/modules/
- OpenTofu module development best practices: https://opentofu.org/docs/language/modules/develop/
- OpenTofu providers within modules: https://opentofu.org/docs/language/modules/develop/providers/
- OpenTofu input variables and validation: https://opentofu.org/docs/language/values/variables/
- OpenTofu outputs: https://opentofu.org/docs/language/values/outputs/
- Terraform Registry module structure conventions: https://developer.hashicorp.com/terraform/language/modules/develop/structure
- AWS provider `aws_iam_role_policy` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy

## Issues Found
- **Mistake 2 - mismatched comment**: The "Bad" example was labeled `# Bad - hard-coded region and account ID`, but the example only demonstrates a hard-coded bucket name (no region or account ID is shown). Updated the comment to `# Bad - hard-coded bucket name` so it accurately describes the example.

## Review Notes
- All HCL syntax is correct and compatible with current OpenTofu versions.
- The `validation` block on `variable` (Mistake 4) is supported in OpenTofu and Terraform 0.13+.
- The `required_providers` example (Mistake 5) is the recommended pattern for child modules; provider configuration should live in the root module.
- The `aws_iam_role_policy` snippet in Mistake 2 is intentionally simplified (it omits `Version`, `Statement`, and the `role` argument). This is acceptable since the snippet is illustrative and focused on the hard-coding anti-pattern, not on producing a runnable IAM policy.
- The module structure diagram in Mistake 6 reflects standard Terraform Registry conventions (`main.tf`, `variables.tf`, `outputs.tf`, `examples/`).
- Consider in a future revision: when an aliased/multiple-instance provider is needed, a child module should declare `configuration_aliases` inside `required_providers`. Out of scope for this post but worth a mention if expanded.
