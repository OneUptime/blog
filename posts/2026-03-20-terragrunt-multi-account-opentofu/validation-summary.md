# Validation Summary: How to Use Terragrunt for Multi-Account OpenTofu Deployments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Terragrunt
- AWS provider configuration
- AWS S3 remote state backend
- DynamoDB state locking
- Multi-account infrastructure deployments

## Sources Consulted
- Terragrunt HCL Blocks reference: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt HCL Functions reference: https://docs.terragrunt.com/reference/hcl/functions/
- Terragrunt `run` command reference: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt CLI Redesign migration guide: https://docs.terragrunt.com/migrate/cli-redesign/
- Terragrunt root configuration migration guide: https://docs.terragrunt.com/migrate/migrating-from-root-terragrunt-hcl/
- Terragrunt queue flags to filter migration guide: https://docs.terragrunt.com/migrate/queue-to-filter/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- Terraform AWS provider documentation for assume role configuration: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- GitHub author profile: https://github.com/nawazdhandala

## Issues Found
- The root shared configuration was shown as `infra/terragrunt.hcl` and child configs used `find_in_parent_folders()` with no filename. Terragrunt's current documentation recommends naming shared root configuration `root.hcl` and calling `find_in_parent_folders("root.hcl")`, so the directory structure, root configuration section, root file comment, include blocks, and conclusion were updated.
- The generated provider block wrote `region = local.account_vars.locals.aws_region` into `provider.tf`. Terraform/OpenTofu cannot read Terragrunt locals from a generated provider file, so this was changed to interpolate the value during Terragrunt rendering: `region = "${local.account_vars.locals.aws_region}"`.
- The module source paths used `../../../../modules/...`, which climbs above `infra/` even though the example directory tree places `modules/` under `infra/`. The networking and compute source paths were corrected to `../../../modules/...`.
- The deployment commands used deprecated Terragrunt CLI forms: `run-all` and `--terragrunt-include-dir`. They were updated to current `terragrunt run --all ...` commands, the targeted networking example now uses the current `--filter` flag, and the `cd` sequence was corrected so the shell block works when copied as written.

## Review Notes
- The Terragrunt `remote_state`, `generate`, `locals`, `read_terragrunt_config`, `path_relative_to_include`, and `dependency` patterns are valid after the corrections above.
- OpenTofu still supports S3 state with `dynamodb_table` locking; the current OpenTofu docs also describe native S3 lock files via `use_lockfile`, but DynamoDB locking remains supported.
- `run --all apply` automatically adds `-auto-approve` for applies across multiple units because Terragrunt cannot collect separate interactive approvals from shared stdin. The post's commands are valid, but production workflows should account for that behavior.
