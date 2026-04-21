# Validation Summary: How to Test Compatibility Between Terraform and OpenTofu

## Status
validated

## Post Type
Technical guide / migration testing tutorial

## Technologies Covered
- Terraform CLI
- OpenTofu CLI
- HCL configuration
- Terraform and OpenTofu provider requirements
- Terraform/OpenTofu state and plan files
- Bash, grep, jq, and diff

## Sources Consulted
- OpenTofu migration guide: https://opentofu.org/docs/intro/migration/migration-guide/
- OpenTofu v1.x compatibility promises: https://opentofu.org/docs/language/v1-compatibility-promises/
- OpenTofu `init` command documentation: https://opentofu.org/docs/cli/commands/init/
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `show` command documentation: https://opentofu.org/docs/cli/commands/show/
- OpenTofu `validate` command documentation: https://opentofu.org/docs/cli/commands/validate/
- OpenTofu `providers` command documentation: https://opentofu.org/docs/cli/commands/providers/
- OpenTofu `test` command documentation for v1.6: https://opentofu.org/docs/v1.6/cli/commands/test/
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu state and plan encryption documentation: https://opentofu.org/docs/v1.11/language/state/encryption/
- Terraform `init` command documentation: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `show` command documentation: https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform `validate` command documentation: https://developer.hashicorp.com/terraform/cli/commands/validate
- Terraform `providers` command documentation: https://developer.hashicorp.com/terraform/cli/commands/providers
- Terraform v1.x compatibility promises: https://developer.hashicorp.com/terraform/language/v1-compatibility-promises

## Issues Found
- The post overpromised compatibility by saying configurations could be verified as "fully compatible" and that OpenTofu "maintains" Terraform compatibility. Updated the wording to match OpenTofu's official "aims to maintain compatibility" language.
- The side-by-side plan example used `init -backend=false` before `plan`, which can skip backend initialization and make the plan comparison less representative of the real workspace. Changed the example to use normal initialization and compare normalized `resource_changes` and `output_changes` with `jq` instead of raw JSON metadata.
- The provider compatibility grep pipeline would usually fail to list providers because it first filtered to `source` lines and then searched those filtered lines for `required_providers`. Replaced it with the official `terraform providers` and `tofu providers` commands.
- The state compatibility example copied only `terraform.tfstate`, then ran `tofu plan` without the configuration. Updated it to copy the configuration and local state into an isolated test directory before running OpenTofu.
- The unsupported-feature scan referred to removed "attributes" and checked `sensitive_variables` and `cost_estimation`, which are not reliable Terraform/OpenTofu HCL compatibility checks. Replaced those commands with scans for removed vendor-specific provisioners and the legacy `hashicorp/terraform` provider, which OpenTofu documents as unsupported.
- The automated script compared only the number of resource changes, which could miss behavior differences. Updated it to diff normalized planned resource and output changes.
- The post said `tofu test` is available in OpenTofu 1.7+. OpenTofu v1.6 documentation includes `tofu test`, so this was corrected to 1.6+.
- The post referred to OpenTofu "`encrypted` state blocks", but the documented feature is the `encryption` block for state and plan encryption. Corrected the wording.

## Review Notes
- The updated plan examples create saved plan files, which can contain sensitive data in cleartext according to both Terraform and OpenTofu documentation. A future improvement could add a short warning about handling generated plan and JSON files securely.
- For large production workspaces, a future improvement could recommend separate working copies or separate data directories for Terraform and OpenTofu runs to avoid local initialization artifacts influencing the comparison.
