# Validation Summary: How to Use the transpose Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (`transpose` function)
- HCL (HashiCorp Configuration Language)
- Terraform (compatible function)

## Sources Consulted
- OpenTofu official function documentation: https://opentofu.org/docs/language/functions/transpose/
- Terraform `transpose` function documentation: https://developer.hashicorp.com/terraform/language/functions/transpose
- OpenTofu CLI console reference: https://opentofu.org/docs/cli/commands/console/

## Issues Found
No technical issues found.

All technical claims and examples were verified:
- Function signature `transpose(map(list(string))) -> map(list(string))` is correct.
- The basic example output is correct: keys are sorted alphabetically and inner list values are sorted.
- "Inverting Role Assignments" example: `local.user_roles["alice"]` correctly returns `["admin", "operator"]` (alphabetically sorted).
- "Service-to-Team Mapping" example: `local.service_team["api-gateway"]` correctly returns `["platform"]`.
- "Region-to-Service Mapping" example: `local.region_services["us-east-1"]` correctly returns `["api", "worker"]` (alphabetically sorted).
- The `tofu console` REPL example output is accurate.

## Review Notes
- The function output ordering (sorted alphabetically) is consistent with the actual behavior of `transpose` in OpenTofu/Terraform; the post's examples implicitly rely on this ordering, which is correct.
- The post does not mention that input must be `map(list(string))` specifically (i.e., other types like `map(set(string))` may need conversion), but this is implied by the syntax section.
- The post is concise and accurate; no version-specific caveats apply since `transpose` has been stable in Terraform/OpenTofu for many releases.
