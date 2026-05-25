# Validation Summary: How to Convert Terraform HCL to CDKTF

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Terraform
- CDK for Terraform (CDKTF)
- HCL
- TypeScript
- AWS Terraform provider resources

## Sources Consulted
- HashiCorp CDKTF overview: https://developer.hashicorp.com/terraform/cdktf
- HashiCorp CDKTF CLI command reference: https://developer.hashicorp.com/terraform/cdktf/cli-reference/commands
- HashiCorp CDKTF modules documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/modules
- HashiCorp CDKTF resources and import documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/resources
- HashiCorp CDKTF iterators documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/iterators
- HashiCorp CDKTF functions documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/functions
- HashiCorp Terraform import documentation: https://developer.hashicorp.com/terraform/cli/import
- HashiCorp Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks

## Issues Found
- CDKTF is deprecated as of December 10, 2025, and HashiCorp no longer supports or maintains it. Added this caveat to the introduction and softened the concluding recommendation so the post does not imply CDKTF is a current greenfield recommendation.
- The generated full-stack TypeScript example requires `cdktf convert --stack`; the original text implied plain `cdktf convert` would produce a stack class and app. Added the `--stack` command and updated the example text and migration command.
- The import workflow used direct `terraform import` commands in the synthesized output directory. Updated it to the CDKTF-documented `importFrom()` workflow and noted that imports should be reviewed with plan/deploy and removed after apply.
- The subnet example did not keep a variable reference, but the corrected import workflow needs one. Changed the subnet construction to `const publicSubnet = new Subnet(...)`.
- The dynamic block section stated there was no direct equivalent and recommended only native loops. Clarified that native loops are appropriate for synth-time values, while deploy-time values require CDKTF escape hatches such as `addOverride("dynamic.ingress", ...)`.
- The count and for_each section said they need to be replaced with loops. Clarified that native loops are for synth-time values and CDKTF `TerraformCount` or `TerraformIterator` should be used for deploy-time values.
- The Terraform functions section said HCL functions are replaced by native language equivalents. Clarified that CDKTF `Fn` helpers are appropriate when Terraform must evaluate the function at deploy time.
- The modules section omitted the required binding generation step. Added `cdktf get` after adding modules to `cdktf.json`.
- The best-practices section called state import a one-way operation. Reworded it to explain that import changes state and can update resources to match configuration.

## Review Notes
The post remains technically relevant for existing CDKTF users, but future updates should consider whether the blog wants to keep publishing CDKTF migration guidance after HashiCorp's deprecation notice.
