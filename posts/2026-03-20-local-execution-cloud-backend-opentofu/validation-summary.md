# Validation Summary: How to Use Local Execution with Cloud Backend in OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu CLI
- OpenTofu cloud backend (`cloud` block)
- HCP Terraform / Terraform Cloud workspace state management
- GitHub Actions
- AWS credentials and IAM role ARNs

## Sources Consulted
- OpenTofu: Using the Cloud Backend with OpenTofu CLI - https://opentofu.org/docs/cli/cloud/
- OpenTofu: Cloud Backend Settings - https://opentofu.org/docs/v1.11/cli/cloud/settings/
- OpenTofu: CLI Configuration File - https://opentofu.org/docs/v1.11/cli/config/config-file/
- OpenTofu: Command: plan - https://opentofu.org/docs/cli/commands/plan/
- OpenTofu: Command: apply - https://opentofu.org/docs/v1.9/cli/commands/apply/
- OpenTofu: Command: init - https://opentofu.org/docs/v1.6/cli/commands/init/
- OpenTofu: Command: state push - https://opentofu.org/docs/cli/commands/state/push/
- HashiCorp: Connect to HCP Terraform - https://developer.hashicorp.com/terraform/cli/cloud/settings
- HashiCorp: Manage workspace state in HCP Terraform - https://developer.hashicorp.com/terraform/cloud-docs/workspaces/state
- HashiCorp: Workspaces API reference - https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- HashiCorp: State versions API reference - https://developer.hashicorp.com/terraform/cloud-docs/api-docs/state-versions
- HashiCorp: Manage Terraform configurations - https://developer.hashicorp.com/terraform/enterprise/workspaces/configurations
- GitHub: `opentofu/setup-opentofu` README - https://github.com/opentofu/setup-opentofu
- AWS: View AWS account identifiers - https://docs.aws.amazon.com/accounts/latest/reference/manage-acct-identifiers.html

## Issues Found
- The `cloud` block examples omitted `hostname`. I added `hostname = "app.terraform.io"` so the examples match the documented OpenTofu cloud backend configuration.
- The provider guidance said to place a custom provider binary in `.terraform/providers/`. I replaced that with local filesystem mirror guidance because OpenTofu documents provider mirrors and CLI `provider_installation` methods, not manual placement in that path as the recommended mechanism.
- The locking example implied a default 30-second wait before lock failure. I corrected it to show immediate failure by default and added `-lock-timeout=30s` as the explicit way to wait.
- The post claimed local execution appears in the UI as `"local plan"` and `"local apply"` run entries. I removed that claim and clarified that the dependable UI artifact in local mode is state version history in the States tab.
- The GitHub Actions example used `opentofu/setup-opentofu@v1`, while the current action README documents `@v2`. I updated the example accordingly.
- The sample AWS IAM role ARN used a 9-digit account ID placeholder. I corrected it to a valid 12-digit AWS account ID format.
- The "Use Cases" code fence was labeled `bash` even though it mixed shell commands and HCL. I changed it to `text` to avoid presenting a mixed-language block as executable Bash.

## Review Notes
- HashiCorp's current documentation uses the product name HCP Terraform. The post still uses Terraform Cloud in several narrative lines; this is legacy branding, not a functional error.
- The local workspace did not have the `tofu` binary installed, so CLI flag validation was done against official OpenTofu documentation rather than local `tofu --help` output.
