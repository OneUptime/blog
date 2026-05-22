# Validation Summary: How to Migrate from Community Providers to Official Providers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform CLI
- Terraform providers
- Terraform state management
- Terraform moved blocks
- Cloudflare Terraform provider
- Datadog Terraform provider
- Bash scripting

## Sources Consulted
- HashiCorp Terraform `state replace-provider` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/replace-provider
- HashiCorp Terraform provider requirements documentation: https://developer.hashicorp.com/terraform/language/providers/requirements
- HashiCorp Terraform moved block and refactoring documentation: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- HashiCorp Terraform `workspace new` command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace/new
- HashiCorp Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform backend configuration documentation: https://developer.hashicorp.com/terraform/language/backend
- HashiCorp Terraform `state mv` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/mv
- Cloudflare Terraform provider documentation: https://developers.cloudflare.com/api/terraform/
- Cloudflare Terraform provider v5 migration guide: https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/guides/version-5-migration
- Datadog Terraform provider documentation: https://docs.datadoghq.com/integrations/terraform/

## Issues Found
- The post stated that official providers have "guaranteed support." Changed this to "clearer support channels" because support guarantees depend on the provider, vendor, and customer support agreement.
- The moved block example implied that any resource type rename can be handled with a moved block. Added a caveat that moved blocks for resource type changes should only be used when the provider documentation supports that move, matching Terraform's resource schema guidance.
- The testing workflow created an empty workspace and then suggested running migration steps against it. Changed the example to pull the current state and create the test workspace with `terraform workspace new -state=state-backup.json migration-test`.
- The separate backend example implied that `key` is universally supported by all backends. Clarified that this applies only when the selected backend supports that key.
- The `terraform plan -detailed-exitcode` notes omitted exit code 1. Added the error result.
- The automation script used word-splitting over `find` output and BSD-specific `sed -i ''`. Updated it to read directories line-by-line and use `perl -pi`, which is more portable across common Linux and macOS environments.

## Review Notes
Terraform CLI is not installed in the local workspace, so CLI behavior was verified against current official documentation rather than local `terraform --help` output. The Cloudflare provider is currently on v5, so future improvements could add provider-specific v4-to-v5 migration notes, but the source migration guidance is valid after the corrections above.
