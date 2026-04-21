# Validation Summary: How to Use Terragrunt with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Terragrunt
- HCL
- AWS S3 remote state backend
- AWS DynamoDB state locking
- GitHub Actions
- AWS GitHub Actions OIDC authentication

## Sources Consulted
- Terragrunt HCL blocks reference: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt state backend documentation: https://docs.terragrunt.com/features/units/state-backend/
- Terragrunt `run` command reference: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt OpenTofu shortcuts reference: https://docs.terragrunt.com/reference/cli/commands/opentofu-shortcuts/
- Terragrunt 1.0 release announcement: https://www.gruntwork.io/blog/terragrunt-1-0-released
- OpenTofu environment variables documentation: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu CLI command documentation for `init`, `plan`, `show`, `apply`, and `refresh`: https://opentofu.org/docs/cli/commands/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu input variable validation documentation: https://opentofu.org/docs/language/values/variables/
- Gruntwork Terragrunt GitHub Action: https://github.com/gruntwork-io/terragrunt-action
- AWS configure-aws-credentials action documentation: https://github.com/aws-actions/configure-aws-credentials
- GitHub Actions checkout action documentation: https://github.com/actions/checkout
- GitHub Actions artifact v4/deprecation documentation: https://github.com/actions/upload-artifact

## Issues Found
1. **Post did not actually use Terragrunt**: The original examples used plain `tofu` commands and an OpenTofu backend block, despite the title and description claiming the guide covered Terragrunt. Replaced the core setup with a Terragrunt `root.hcl`, a unit `terragrunt.hcl`, generated backend/provider configuration, Terragrunt inputs, and a dependency block.

2. **Missing Terragrunt prerequisite and verification**: Added Terragrunt v1.0+ to prerequisites and added `terragrunt --version` to the setup commands.

3. **Incomplete and unrelated cloud credential examples**: The post showed incomplete Azure and GCP environment variable examples while the configuration used AWS. Narrowed the setup to AWS credentials for the examples shown.

4. **OpenTofu commands bypassed Terragrunt**: Replaced direct `tofu init`, `tofu plan`, `tofu show`, `tofu apply`, `tofu state`, and drift-check commands with Terragrunt equivalents using `terragrunt init` and `terragrunt run -- ...`.

5. **Outdated GitHub Actions workflow**: Replaced the OpenTofu-only setup with the official Gruntwork Terragrunt action, updated OpenTofu and Terragrunt versions, updated current GitHub Actions action versions, and removed deprecated `actions/upload-artifact@v3` / `actions/download-artifact@v3` usage.

6. **Deprecated `tofu refresh` troubleshooting guidance**: Replaced `tofu refresh` with `terragrunt run -- plan -refresh-only` so users can review refresh-only changes before applying state updates.

7. **Overbroad workflow permissions**: Removed `pull-requests: write` from the workflow snippet because the revised workflow no longer writes pull request comments or artifacts.

## Review Notes
- The S3 backend `dynamodb_table` argument remains valid. OpenTofu also supports native S3 lock files with `use_lockfile` in newer versions, which could be considered for future updates.
- The example assumes the S3 bucket, DynamoDB table, and referenced Terragrunt dependency exist or are bootstrapped separately.
