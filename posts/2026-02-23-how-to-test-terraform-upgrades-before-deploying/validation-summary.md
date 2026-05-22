# Validation Summary: How to Test Terraform Upgrades Before Deploying

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform providers
- Terraform modules
- Terraform state
- Terraform test framework
- GitHub Actions
- hashicorp/setup-terraform
- Bash
- jq

## Sources Consulted
- Terraform CLI `init` command reference: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform CLI `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform CLI `show` command reference: https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform CLI `test` command reference: https://developer.hashicorp.com/terraform/cli/commands/test
- Terraform CLI `version` command reference: https://developer.hashicorp.com/terraform/cli/commands/version
- Terraform state commands reference: https://developer.hashicorp.com/terraform/cli/commands/state
- Terraform state push command reference: https://developer.hashicorp.com/terraform/cli/commands/state/push
- Terraform provider requirements documentation: https://developer.hashicorp.com/terraform/language/providers/requirements
- Terraform dependency lock file documentation: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- Terraform override files documentation: https://developer.hashicorp.com/terraform/language/files/override
- Terraform JSON output format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- hashicorp/setup-terraform README: https://github.com/hashicorp/setup-terraform

## Issues Found
- The CLI upgrade comparison examples used `terraform init -upgrade`, which can upgrade provider and module selections. Changed these CLI-version test examples to use `terraform init` so plan differences isolate Terraform CLI behavior instead of dependency changes.
- The CI workflow generated the new-version plan with `terraform init -upgrade`, creating the same dependency-confounding issue. Changed it to `terraform init`.
- The test-suite examples for Terraform CLI upgrades also used `terraform init -upgrade`. Changed them to `terraform init` so module tests run with the locked provider selections under the new CLI version.
- The provider upgrade script wrote `version-override.tf`, which would not get Terraform's documented override-file merge behavior. Renamed it to `versions_override.tf` so the generated `terraform` block can override only the provider version constraint.
- The GitHub Actions snippet used `hashicorp/setup-terraform@v3`; the current official README documents `@v4`. Updated both workflow uses to `hashicorp/setup-terraform@v4`.
- The rollback script created `BACKUP_DIR` as a relative path, then changed directories before writing state backups, which would write to the wrong path or fail. Changed it to an absolute path based on `pwd`.
- The rollback script parsed human-readable `terraform version` output to recover the CLI version. Changed it to write `terraform version -json | jq -r '.terraform_version'`, matching Terraform's documented machine-readable output.

## Review Notes
- Terraform was not installed in the local environment, so command behavior was validated against official documentation rather than local `terraform --help` output.
- The examples assume the reader has `tfenv`, `jq`, Bash process substitution, and appropriate provider credentials available.
- The provider-upgrade example intentionally keeps `terraform init -upgrade` because that section is specifically testing provider version selection changes.
