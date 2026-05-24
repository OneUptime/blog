# Validation Summary: How to Fix Terraform Moved Block Errors

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- Terraform (1.1+ for moved blocks)
- HCL (HashiCorp Configuration Language)
- AWS provider resources (aws_instance, aws_subnet, aws_vpc) used as examples
- Terraform CLI (`terraform plan`, `terraform state list`, `terraform state show`, `terraform state rm`, `terraform import`)

## Sources Consulted
- Terraform documentation on moved blocks: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- Terraform configuration language reference: https://developer.hashicorp.com/terraform/language/moved
- Terraform 1.1 release notes (moved block introduction): https://github.com/hashicorp/terraform/releases/tag/v1.1.0
- Terraform CLI state commands: https://developer.hashicorp.com/terraform/cli/commands/state
- Terraform `cidrsubnet` function: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- AWS AMI ID format documentation

## Issues Found
No technical issues found.

The post is technically accurate:
- The claim that Terraform 1.1 introduced `moved` blocks is correct (released December 2021).
- The HCL syntax for `moved` blocks (with `from` and `to` attributes) is correct.
- The count-to-for_each migration pattern with index-to-key mapping is the standard documented approach.
- The guidance that the moved block must be in the configuration containing the `to` address is correct per the Terraform docs.
- The AMI ID `ami-0c55b159cbfafe1f0` uses the valid 17-character hex format.
- The `cidrsubnet()` and `index()` function usages are syntactically valid.
- Module move syntax (entire module instances and cross-module resource moves) is correct.

## Review Notes
- The error messages quoted in the post are plausible representations of real Terraform errors. Exact wording may vary slightly across Terraform versions, but the conveyed meaning is accurate.
- Error 5 ("Moving Between Resource Types"): As of Terraform 1.8 (April 2024), providers can optionally implement the `MoveResourceState` protocol method to support cross-resource-type moves via `moved` blocks. The post's general advice (that this isn't supported and to fall back to `terraform state rm` + `terraform import`) remains valid for the vast majority of cases where providers haven't implemented this capability. A future revision could mention this newer capability, but the current guidance is not incorrect.
- The Error 1 example pairs a `from = aws_instance.web[0]` error message with a written explanation about needing a resource instance address. The `aws_instance.web[0]` form IS itself a valid resource instance address — the error message in the snippet is slightly mismatched with the example mistakes shown immediately below it, but the corrective examples that follow are all correct.
- Users on Terraform 1.5+ may also benefit from knowing about `import` blocks as a declarative alternative to `terraform import`, but this is orthogonal to the moved block topic.
