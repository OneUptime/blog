# Validation Summary: How to Use CDKTF Tokens for Lazy Values

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- CDK for Terraform (CDKTF)
- CDKTF tokens
- CDKTF lazy values
- CDKTF Terraform functions
- TypeScript
- AWS provider bindings for CDKTF

## Sources Consulted
- HashiCorp CDKTF Tokens documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/tokens
- HashiCorp CDKTF Functions documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/functions
- HashiCorp CDKTF TypeScript API reference: https://developer.hashicorp.com/terraform/cdktf/api-reference/typescript/classes
- Terraform `cidrsubnet` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- HashiCorp Terraform CDK GitHub repository sunset notice: https://github.com/hashicorp/terraform-cdk
- NPM package metadata for `cdktf` and `@cdktf/provider-aws`
- Installed TypeScript declarations for `cdktf@0.21.0` and `@cdktf/provider-aws@21.22.1`

## Issues Found
- Runtime token output was shown as a Terraform interpolation expression. Updated it to show CDKTF's encoded placeholder form, and clarified that CDKTF turns that placeholder into a Terraform expression during synthesis.
- The token type list only mentioned string, number, and list tokens. Updated it to include maps, booleans, and other complex Terraform values.
- One example referenced `server.somePort`, which is not a property on the AWS `Instance` construct. Replaced it with `server.publicIp` to keep the example syntactically valid while demonstrating that parsing an encoded token as a number returns `NaN`.
- The number-token console output example did not match current CDKTF behavior. Updated it to a current large negative encoded number example.
- CDKTF is now deprecated and no longer maintained by HashiCorp. Added a short note so readers understand the current support status.

## Review Notes
The code examples are illustrative snippets and omit some imports in later sections. The referenced CDKTF APIs still exist in the latest published packages checked during review, but both `cdktf` and the prebuilt AWS provider package are deprecated or sunsetted, so future projects should consider migration or locally generated provider bindings.
