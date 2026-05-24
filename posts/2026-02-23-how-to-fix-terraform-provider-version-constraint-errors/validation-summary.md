# Validation Summary: How to Fix Terraform Provider Version Constraint Errors

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Terraform (CLI, configuration language)
- Terraform providers (hashicorp/aws, hashicorp/random)
- Terraform dependency lock file (`.terraform.lock.hcl`)
- Terraform CLI configuration file (`.terraformrc`)
- Terraform Cloud

## Sources Consulted
- Terraform `required_providers` documentation: https://developer.hashicorp.com/terraform/language/providers/requirements
- Terraform version constraints: https://developer.hashicorp.com/terraform/language/expressions/version-constraints
- Terraform dependency lock file: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- `terraform providers lock` command: https://developer.hashicorp.com/terraform/cli/commands/providers/lock
- `terraform init` command: https://developer.hashicorp.com/terraform/cli/commands/init
- Provider installation / CLI config: https://developer.hashicorp.com/terraform/cli/config/config-file
- Provider aliasing: https://developer.hashicorp.com/terraform/language/providers/configuration#alias-multiple-provider-configurations

## Issues Found
1. **Misleading comment on `terraform providers lock -platform=...` command.** The post described the command with the comment `# List available versions and platforms` and prose saying "Check which versions support your platform". The command does not list versions — it pre-populates checksums in `.terraform.lock.hcl` for the specified target platform(s). Updated the comment to `# Generate lock file entries for a specific platform` and reworded the surrounding prose to accurately describe the behavior (the command will fail if no compatible package exists, which is how it surfaces a platform incompatibility).

## Review Notes
- Pessimistic constraint operator (`~>`) semantics are documented correctly: `~> 5.0` means `>= 5.0, < 6.0`, and `~> 5.30.0` means `>= 5.30.0, < 5.31.0`.
- The legacy `aws = "~> 5.0"` short form is correctly labeled as a problematic legacy format. Modern Terraform (0.13+) still tolerates this in some cases as `hashicorp/aws`, but the explicit `source`/`version` map form is the recommended approach.
- The filesystem mirror path `~/.terraform.d/plugins/...` is the legacy implicit local mirror path. Terraform 0.13+ uses XDG-style paths by default on Linux (`~/.local/share/terraform/plugins`), but `~/.terraform.d/plugins` is still searched as a legacy fallback, so the example continues to work.
- The `provider_installation` block syntax in `.terraformrc` (with `filesystem_mirror` and `direct` sub-blocks using `include`/`exclude`) is correct per current docs.
- The filesystem mirror directory layout (`HOSTNAME/NAMESPACE/TYPE/VERSION/TARGET/`) matches the official spec.
- The aliases section's claim that "all aliases share one version" of a provider is accurate.
- Error message text shown in the post is plausible/illustrative; exact wording from real Terraform output may differ slightly between versions but conveys the right meaning.
