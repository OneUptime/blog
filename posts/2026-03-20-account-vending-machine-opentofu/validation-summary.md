# Validation Summary: How to Implement Account Vending Machine with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Organizations
- AWS Config
- AWS Security Hub
- GitHub Actions
- JSON configuration

## Sources Consulted
- OpenTofu Provider Configuration: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu Providers Within Modules: https://opentofu.org/docs/language/modules/develop/providers/
- OpenTofu `fileset` Function: https://opentofu.org/docs/language/functions/fileset/
- OpenTofu `jsondecode` Function: https://opentofu.org/docs/language/functions/jsondecode/
- OpenTofu `trimprefix` Function: https://opentofu.org/docs/language/functions/trimprefix/
- OpenTofu `trimsuffix` Function: https://opentofu.org/docs/language/functions/trimsuffix/
- OpenTofu `init` command: https://opentofu.org/docs/v1.8/cli/commands/init/
- OpenTofu `apply` command: https://opentofu.org/docs/v1.11/cli/commands/apply/
- AWS Organizations `CreateAccount` API: https://docs.aws.amazon.com/organizations/latest/APIReference/API_CreateAccount.html
- AWS Organizations account access role docs: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_accounts_access.html
- AWS provider docs for `aws_organizations_account`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/organizations_account.html.markdown
- AWS provider docs for `aws_config_configuration_recorder`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/config_configuration_recorder.html.markdown
- AWS provider docs for `aws_config_delivery_channel`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/config_delivery_channel.html.markdown
- AWS provider docs for `aws_securityhub_account`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/securityhub_account.html.markdown
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- `opentofu/setup-opentofu` action: https://github.com/opentofu/setup-opentofu

## Issues Found
- The original module defined an aliased AWS provider inside a child module and built `assume_role.role_arn` from `aws_organizations_account.new.id`. OpenTofu provider configurations can only use values known before apply, and reusable child modules should not define provider blocks. I removed the same-apply cross-account provider pattern and changed the module to create the account and output the account ID for a later bootstrap stage.
- The original `time_sleep` resource did not solve the provider-configuration problem. AWS Organizations account creation is asynchronous, so I updated the introduction, architecture, and conclusion to describe a follow-up bootstrap stage instead of implying that account creation and cross-account bootstrapping happen in one apply.
- The original AWS Config example was incomplete. `aws_config_configuration_recorder` does not start recording by itself and requires a delivery channel and recorder-status/start step. Because the larger same-apply bootstrap flow was invalid, I removed the incomplete AWS Config and Security Hub resources from the module snippet rather than leaving a non-working example.
- The original `accounts/new-team-sandbox.hcl` request file was never consumed by the shown OpenTofu configuration, and `tofu apply` would not automatically evaluate arbitrary HCL data files from a subdirectory. I replaced it with JSON request files that the root module loads explicitly with `fileset`, `file`, and `jsondecode`.
- The original root configuration referenced `aws_organizations_organizational_unit.sandbox.id` without defining that resource. I replaced that with `parent_ou_id` loaded from each request file.
- The original GitHub Actions workflow ran `tofu` without installing OpenTofu. I added `opentofu/setup-opentofu@v1` and aligned the path filter with the corrected `accounts/*.json` request-file format.

## Review Notes
- The post is now technically accurate for the account-creation stage of an AVM. The follow-up bootstrap stage is intentionally described at a high level rather than implemented inline, because cross-account provisioning requires a separate stage or workspace once the new account ID exists and the account is ready.
- The workflow only triggers on `accounts/*.json` changes, so updates to the module code itself would need a separate workflow trigger if you want those changes to run automatically.
