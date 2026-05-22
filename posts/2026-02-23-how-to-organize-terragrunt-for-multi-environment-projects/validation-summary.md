# Validation Summary: How to Organize Terragrunt for Multi-Environment Projects

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- Terragrunt
- HCL
- AWS provider for Terraform
- AWS S3 remote state
- AWS IAM role assumption

## Sources Consulted
- Terragrunt HCL blocks reference: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt HCL functions reference: https://docs.terragrunt.com/reference/hcl/functions/
- Terragrunt run command reference: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt CLI redesign migration guide: https://docs.terragrunt.com/migrate/cli-redesign/
- Terraform AWS provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform count meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- AWS Well-Architected Framework, SEC01-BP01 Separate workloads using accounts: https://docs.aws.amazon.com/wellarchitected/latest/framework/sec_securely_operate_multi_accounts.html
- Linked OneUptime Azure Terragrunt article: https://oneuptime.com/blog/post/2026-02-23-how-to-use-terragrunt-with-azure-multi-subscription/view

## Issues Found
- The module grouping command examples used `terragrunt run-all apply`. Terragrunt's current CLI migration guide marks `run-all` as deprecated and says to use `terragrunt run --all` instead. Updated both examples to `terragrunt run --all apply`.

## Review Notes
The Terragrunt HCL examples use valid blocks and functions, including `remote_state`, `generate`, `include`, `read_terragrunt_config()`, `find_in_parent_folders()`, and `path_relative_to_include()`. The AWS provider examples use current `default_tags` and `assume_role` provider configuration patterns. The multi-account recommendation is consistent with AWS guidance to use account-level separation for environments and workloads.
