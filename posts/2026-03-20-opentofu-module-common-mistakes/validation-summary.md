# Validation Summary: Common Mistakes When Writing OpenTofu Modules

## Status
validated

## Post Type
Guide / Best-practices article

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS provider (`hashicorp/aws`)
- Module composition patterns
- Variable validation (`validation` blocks)
- Meta-arguments (`count`, `for_each`)
- Version constraints (`required_version`, `required_providers`)

## Sources Consulted
- OpenTofu language documentation (modules, variables, outputs): https://opentofu.org/docs/language/modules/
- OpenTofu variable validation: https://opentofu.org/docs/language/values/variables/#custom-validation-rules
- OpenTofu `for_each` vs `count`: https://opentofu.org/docs/language/meta-arguments/for_each/
- OpenTofu `required_providers` and `required_version`: https://opentofu.org/docs/language/settings/
- OpenTofu built-in functions (`contains`, `can`, `cidrnetmask`, `toset`): https://opentofu.org/docs/language/functions/
- HashiCorp Terraform module best practices (parity reference): https://developer.hashicorp.com/terraform/language/modules/develop

## Issues Found
No technical issues found.

All HCL syntax is correct, the functions referenced (`contains`, `can`, `cidrnetmask`, `toset`) exist and are used appropriately, and the architectural recommendations (no provider blocks in reusable modules, prefer `for_each` over `count` for stable identity, expose comprehensive outputs, pin version ranges, decompose monolithic modules) match the documented OpenTofu and Terraform best practices.

## Review Notes
- The Mistake 5 example references `var.vpc_cidr` in the resource but the example only declares `var.vpc_id`. This is illustrative scaffolding (the surrounding variable would obviously be declared in a real module) and does not constitute a technical error in the snippet's intent.
- OpenTofu also supports a dedicated `tofu` block for OpenTofu-only settings, but using the `terraform` block (as shown) remains the recommended cross-compatible form and is correct.
- `required_version = ">= 1.0"` is appropriate; OpenTofu interprets this against its own version, which started at 1.6.0, so the constraint is satisfied by every released OpenTofu version.
- The `cidrnetmask`-inside-`can()` idiom is the standard way to validate that a string is a well-formed CIDR — accurate as written.
