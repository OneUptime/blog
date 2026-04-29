# Validation Summary: How to Migrate Infrastructure from CDK for Terraform to OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- CDK for Terraform (CDKTF)
- OpenTofu
- Terraform/OpenTofu state management
- TypeScript
- HCL and `.tf.json` configuration
- AWS provider resources including `aws_s3_bucket`, `aws_s3_bucket_versioning`, and `aws_vpc`

## Sources Consulted
- HashiCorp CDKTF Stacks documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/stacks
- HashiCorp CDKTF Refactoring guide: https://developer.hashicorp.com/terraform/cdktf/examples-and-guides/refactoring
- HashiCorp CDKTF Remote Backends documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/remote-backends
- HashiCorp CDKTF TypeScript API reference (`LocalBackendConfig`): https://developer.hashicorp.com/terraform/cdktf/api-reference/typescript/structs
- OpenTofu JSON Configuration Syntax: https://opentofu.org/docs/language/syntax/json/
- OpenTofu Import documentation: https://opentofu.org/docs/language/import/
- OpenTofu `state mv` command reference: https://opentofu.org/docs/cli/commands/state/mv/
- OpenTofu State purpose documentation: https://opentofu.org/docs/language/state/purpose/
- Terraform configuration syntax and resource naming: https://developer.hashicorp.com/terraform/language/syntax/configuration
- Terraform resource configuration and state addresses: https://developer.hashicorp.com/terraform/language/resources/configure
- AWS provider `aws_s3_bucket_versioning` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning

## Issues Found
- The post used manual `tofu state` commands without initializing the synthesized stack directory first. I added `tofu init   # or terraform init` before state inspection because manual state commands require an initialized working directory.
- The examples mixed `MyBucket` and `AppBucket` for the same synthesized resource. I standardized them on `AppBucket` so the state and import examples are internally consistent.
- The explanation of resource addressing incorrectly implied that CDKTF addresses come from TypeScript class names and that OpenTofu HCL addresses are inherently snake_case. I corrected this to explain that the address comes from the synthesized resource name / construct ID, and that migration work is only needed if the new HCL local name differs.
- The import example omitted `aws_s3_bucket_versioning` even though the translated HCL modeled versioning as a separate AWS resource. I added the missing import block using the bucket name, which matches the provider's documented import behavior.
- The advanced state-reuse example pointed at the wrong default local state path under `cdktf.out/stacks/`. I corrected it to the default CDKTF local backend path (`terraform.<stack-name>.tfstate` in the project root) and rewrote the guidance to describe reusing that state safely.
- The summary described fresh import into a new state as the universally safest option. I revised that language to focus on the actual technical concern: preserving state accurately and retiring the old CDKTF state after validation so the same infrastructure is not managed from two places.

## Review Notes
- CDKTF is deprecated as of December 10, 2025 according to HashiCorp's documentation. The migration topic is still relevant, but readers should know CDKTF is no longer maintained.
- The cleanup commands in Phase 6 are repository-specific examples. Exact paths and dependency names can vary between CDKTF projects.
