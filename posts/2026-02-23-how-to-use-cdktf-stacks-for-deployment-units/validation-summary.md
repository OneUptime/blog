# Validation Summary: How to Use CDKTF Stacks for Deployment Units

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CDK for Terraform (CDKTF)
- Terraform stacks and state management
- CDKTF CLI
- TypeScript
- AWS provider for CDKTF
- Terraform remote state

## Sources Consulted
- HashiCorp CDKTF Stacks documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/stacks
- HashiCorp CDKTF CLI commands documentation: https://developer.hashicorp.com/terraform/cdktf/cli-reference/commands
- HashiCorp CDKTF Providers documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/providers
- HashiCorp CDKTF Data Sources documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/data-sources
- Terraform `terraform_remote_state` data source documentation: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- npm package metadata and type definitions for `cdktf@0.21.0` and `@cdktf/provider-aws@21.22.1`
- Linked OneUptime dependency article: https://oneuptime.com/blog/post/2026-02-23-how-to-handle-cdktf-stack-dependencies/view

## Issues Found
- The introduction said each CDKTF stack maps to a separate Terraform state file. This is true for local state, but remote backends may store state differently, so it was changed to "separate Terraform state."
- The article did not mention that CDKTF is officially deprecated as of December 10, 2025. Added a brief note matching HashiCorp's current documentation.
- The explicit S3 remote-state example used `DataTerraformRemoteState` with a `backend` and nested `config` object. In CDKTF's TypeScript API, S3 state should use `DataTerraformRemoteStateS3` with `bucket`, `key`, and `region` at the top level. Updated the import and constructor accordingly.
- The output-sharing guidance implied `TerraformOutput` is always required for all stack sharing. CDKTF can automatically synthesize remote-state access for in-application cross-stack references, while explicit outputs are needed for independently deployed configurations reading remote state. Updated the wording.

## Review Notes
The CDKTF examples use the pre-built AWS provider import paths available in the current `@cdktf/provider-aws` package. The linked OneUptime article is reachable and covers the referenced dependency topic. CDKTF is deprecated, so future posts should consider Terraform Stacks or standard Terraform module/workspace patterns for new projects.
