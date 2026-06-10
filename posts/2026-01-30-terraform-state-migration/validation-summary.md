# Validation Summary: How to Create Terraform State Migration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (CLI and HCL configuration language)
- Terraform `moved` blocks (Terraform 1.1+)
- Terraform state subcommands (`mv`, `rm`, `pull`, `push`, `show`, `list`)
- `terraform import` and `terraform force-unlock`
- AWS provider resources (`aws_instance`, `aws_vpc`, `aws_subnet`, `aws_db_instance`, `aws_launch_template`)
- S3 backend with DynamoDB-based state locking
- `terraform_remote_state` data source
- Bash scripting for bulk migrations

## Sources Consulted
- Terraform CLI `state` subcommand docs: https://developer.hashicorp.com/terraform/cli/commands/state
- `terraform state mv`: https://developer.hashicorp.com/terraform/cli/commands/state/mv
- `terraform state rm`: https://developer.hashicorp.com/terraform/cli/commands/state/rm
- `terraform state pull` / `push`: https://developer.hashicorp.com/terraform/cli/commands/state/pull
- `terraform import`: https://developer.hashicorp.com/terraform/cli/commands/import
- `moved` block reference: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- Terraform 1.1 release notes (introduction of `moved` block): https://github.com/hashicorp/terraform/blob/main/CHANGELOG.md
- S3 backend configuration: https://developer.hashicorp.com/terraform/language/backend/s3
- `terraform_remote_state` data source: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- `terraform force-unlock`: https://developer.hashicorp.com/terraform/cli/commands/force-unlock

## Issues Found
- **Missing heading prefix on "Resource Type Changes" subsection.** Within the `## Refactoring Strategies` section the sibling subsections (`### Module Extraction`, `### Splitting State Files`) used `###` headings, but "Resource Type Changes" was rendered as plain body text. Changed it to `### Resource Type Changes` so the document outline is consistent and the subsection renders correctly. This was a structural/markdown issue, not a content error.

No technical/factual errors were found. All CLI commands, `moved` block syntax, HCL examples, and backend configuration snippets verify against current Terraform documentation.

## Review Notes
- The `terraform refresh` command shown in "Recovering from Failed Migrations" still works but has been deprecated since Terraform 0.15.4 in favor of `terraform apply -refresh-only`. The post's usage is not incorrect, but readers running modern Terraform versions will see a deprecation warning. Worth updating in a future revision.
- The S3 backend example uses `dynamodb_table` for state locking, which remains a fully supported configuration. As of Terraform 1.10+, the S3 backend also supports native S3-based locking via `use_lockfile = true`, which can eliminate the DynamoDB dependency. The post's DynamoDB-based example is still accurate but readers on newer versions may prefer the newer option.
- The "Resource Type Changes" example shows `create_before_destroy = false` on an `aws_instance` resource with a comment "Will be destroyed after launch template exists." This lifecycle setting is the default and does not actually coordinate ordering between two different resource declarations. The example is not technically wrong (it compiles and applies), but it is somewhat misleading about how to control resource replacement ordering. Left as-is since it is not a factual error and the user's intent is illustrative.
- `terraform state show` outputs the resource attributes; the `id` attribute is typically what is needed for `terraform import` for most AWS resources but a few resource types use composite import IDs (e.g., `aws_security_group_rule`). The post's example with `aws_instance` is correct.
