# Validation Summary: How to Use CDKTF with Existing Terraform Modules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- CDK for Terraform (CDKTF)
- Terraform modules
- Terraform Registry modules
- Terraform module sources from Git and local paths
- TypeScript
- AWS provider for CDKTF
- terraform-aws-modules VPC, EKS, and security-group modules

## Sources Consulted
- HashiCorp Developer: CDKTF Modules documentation - https://developer.hashicorp.com/terraform/cdktf/concepts/modules
- HashiCorp Developer: CDKTF CLI command reference for `cdktf get` - https://developer.hashicorp.com/terraform/cdktf/cli-reference/commands
- HashiCorp Developer: CDKTF Tokens documentation - https://developer.hashicorp.com/terraform/cdktf/concepts/tokens
- HashiCorp Developer: Terraform modules overview - https://developer.hashicorp.com/terraform/language/modules
- HashiCorp Developer: Terraform module source and Git `ref` guidance - https://developer.hashicorp.com/terraform/language/modules/configuration
- Amazon EKS User Guide: Kubernetes version lifecycle - https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- npm package contents for `@cdktf/provider-aws@21.22.1`, confirming `@cdktf/provider-aws/lib/provider`
- Local `cdktf get` verification with `cdktf-cli@latest` and Terraform CLI 1.12.0, confirming generated TypeScript module files under `.gen/modules/*.ts`

## Issues Found
- CDKTF is now deprecated by HashiCorp as of December 10, 2025. Updated the introduction to clarify that the guidance is most useful for existing CDKTF codebases.
- The generated TypeScript module bindings were shown as directories (`vpc/`, `security_group/`, `eks/`), but current `cdktf get` output for this configuration creates `.ts` files (`vpc.ts`, `security_group.ts`, `eks.ts`). Updated the listing and troubleshooting file paths.
- The first TypeScript example imported `App` from `cdktf` but did not use it. Removed the unused import.
- The EKS example used Kubernetes version `1.28`, which is no longer available in Amazon EKS standard or extended support as of May 22, 2026. Updated it to `1.35`, a current standard-support EKS version.
- The "Passing Data Between Modules" example passed `vpc.privateSubnetsOutput` as `[vpc.privateSubnetsOutput]`. CDKTF module list outputs should be cast with `Token.asList(...)` before passing to a list input. Added the `Token` import and changed the EKS `subnetIds` assignment accordingly.
- The troubleshooting section said to run `cdktf get` to regenerate with the latest module version. The CDKTF CLI documentation states existing bindings with loose constraints are not refreshed unless forced, so this was changed to `cdktf get --force`.

## Review Notes
The post is technically valid after the fixes. CDKTF itself is deprecated and no longer maintained by HashiCorp, so future updates should consider whether this post should be framed as legacy maintenance guidance rather than new-project guidance.
