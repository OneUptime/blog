# Validation Summary: How to Use terraform state replace-provider

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform state management
- Terraform provider source addresses
- Terraform provider migration
- HCL provider requirements

## Sources Consulted
- HashiCorp Terraform CLI documentation: `terraform state replace-provider` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/replace-provider
- HashiCorp Terraform CLI documentation: `terraform state` command reference and backups: https://developer.hashicorp.com/terraform/cli/commands/state
- HashiCorp Terraform language documentation: provider requirements and source addresses: https://developer.hashicorp.com/terraform/language/providers/requirements
- HashiCorp Support: legacy provider addresses after Terraform 0.13 upgrade: https://support.hashicorp.com/hc/en-us/articles/360052933774-Plugin-reinitialization-error-after-upgrade-to-Terraform-0-13

## Issues Found
- The post described Terraform 0.12-era provider addresses as "built-in providers." I changed this to "legacy provider addresses" and clarified that Terraform 0.13 introduced provider source addresses and namespaced registry addresses. This avoids confusing legacy unqualified providers such as `registry.terraform.io/-/aws` with Terraform's actual built-in provider namespace.
- The backup section implied `-backup` applies generally and then restored from `terraform.tfstate.backup` even though the example used `./provider-migration-backup.tfstate`. I changed the text to say the custom backup path is for local state and updated the restore command to use the custom backup file shown in the example.
- The state example was labeled as `json` even though it contains comments and ellipses for illustration. I changed the fence to `text` so the excerpt is not presented as syntactically valid JSON.

## Review Notes
The command syntax, `-auto-approve` option, provider source address examples, HCL `required_providers` snippets, and the explanation that `replace-provider` updates all matching resources in state were consistent with HashiCorp documentation. Terraform was not installed in the local environment, so CLI behavior was verified against official HashiCorp documentation rather than local `terraform -help` output.
