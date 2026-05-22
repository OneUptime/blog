# Validation Summary: How to Use Terragrunt destroy-all for Multi-Module Destroy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terragrunt
- Terraform / OpenTofu CLI
- Infrastructure as Code
- AWS RDS deletion protection
- GitHub Actions

## Sources Consulted
- Terragrunt CLI `run` command documentation: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt CLI redesign migration guide: https://docs.terragrunt.com/migrate/cli-redesign/
- Terragrunt global flags documentation: https://docs.terragrunt.com/reference/cli/global-flags/
- Terragrunt Run Queue documentation: https://docs.terragrunt.com/features/stacks/run-queue/
- Terragrunt HCL blocks documentation: https://docs.terragrunt.com/reference/hcl/blocks/
- Terraform `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `destroy` command documentation: https://developer.hashicorp.com/terraform/cli/commands/destroy
- Terraform AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Linked OneUptime run-all article, checked that the URL resolves: https://oneuptime.com/blog/post/2026-02-23-how-to-use-terragrunt-run-all-command/view

## Issues Found
- The post presented `terragrunt run-all destroy` as the modern recommended command and described `destroy-all` as still working. Updated the post to explain that `destroy-all` is a legacy command from older Terragrunt releases, `run-all` is deprecated, and the current recommended form is `terragrunt run --all destroy`.
- The post used deprecated `--terragrunt-*` flags such as `--terragrunt-non-interactive`, `--terragrunt-parallelism`, `--terragrunt-include-dir`, and `--terragrunt-exclude-dir`. Updated examples to use current `--non-interactive`, `--parallelism`, and `--filter` forms.
- The post showed a confirmation prompt for the modern multi-module destroy flow. Terragrunt documents that `run --all` with `apply` or `destroy` automatically passes `-auto-approve` to Terraform/OpenTofu because shared stdin makes per-unit prompts impractical. Replaced the prompt example with `terragrunt list --as destroy -l` as a way to preview destroy order.
- The post stated a "default timeout is 2 minutes per module." Terragrunt does not document a generic two-minute per-module destroy timeout. Reworded this to recommend Terraform resource-level timeout configuration where supported.
- The post still referred to `run-all destroy` in the destroy-order edge case section. Updated that reference to `run --all destroy`.

## Review Notes
The post is technically valid after updates. Future maintenance should watch Terragrunt's CLI redesign and strict-mode changes, because legacy aliases may eventually be removed. The linked OneUptime run-all article resolves, but it appears to use pre-redesign `run-all` examples and may need a separate validation pass.
