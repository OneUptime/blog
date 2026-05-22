# Validation Summary: How to Migrate from Pulumi to Terraform

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Pulumi
- Terraform
- Terraform import blocks
- Pulumi state and stack commands
- AWS, Azure, and Google Cloud provider resources
- TypeScript
- HCL
- Python
- jq

## Sources Consulted
- Pulumi CLI docs: `pulumi stack export` - https://www.pulumi.com/docs/iac/cli/commands/pulumi_stack_export/
- Pulumi CLI docs: `pulumi stack` - https://www.pulumi.com/docs/iac/cli/commands/pulumi_stack/
- Pulumi CLI docs: `pulumi stack import` - https://www.pulumi.com/docs/iac/cli/commands/pulumi_stack_import/
- Pulumi CLI docs: `pulumi state delete` - https://www.pulumi.com/docs/iac/cli/commands/pulumi_state_delete/
- Pulumi CLI docs: `pulumi config` and `pulumi config get` - https://www.pulumi.com/docs/iac/cli/commands/pulumi_config/ and https://www.pulumi.com/docs/iac/cli/commands/pulumi_config_get/
- Pulumi Registry: AWS EC2 Subnet, AWS S3 Bucket, Azure Native VirtualMachine, and GCP Compute Instance resource type references - https://www.pulumi.com/registry/
- Terraform import documentation - https://developer.hashicorp.com/terraform/language/import
- Terraform import block reference - https://developer.hashicorp.com/terraform/language/block/import
- Terraform CLI import documentation - https://developer.hashicorp.com/terraform/cli/import
- Terraform `terraform_remote_state` data source documentation - https://developer.hashicorp.com/terraform/language/state/remote-state-data
- Terraform `count` meta-argument documentation - https://developer.hashicorp.com/terraform/language/meta-arguments/count
- Terraform module syntax documentation - https://developer.hashicorp.com/terraform/language/modules/syntax
- Terraform AWS provider registry documentation for `aws_instance`, `aws_vpc`, `aws_subnet`, and `aws_secretsmanager_secret_version` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- The Pulumi-to-Terraform resource mapping table used a malformed Azure type token and implied that resource names can be converted by a simple string rewrite. Updated the Azure example to `azure-native:compute:VirtualMachine` and softened the mapping guidance so readers verify each Pulumi import/URN token against the matching Terraform provider resource.
- The Azure virtual machine mapping pointed generically to `azurerm_virtual_machine`, while current AzureRM configurations commonly use separate Linux and Windows VM resources. Updated the mapping to `azurerm_linux_virtual_machine` or `azurerm_windows_virtual_machine`.
- The Pulumi state extraction command filtered only the AWS provider resource and could include resources without provider IDs. Updated the `jq` and Python examples to select only custom resources with non-empty IDs.
- The Terraform import-block example did not mention that configuration-driven import requires Terraform 1.5 or later. Added that version caveat.
- The Pulumi state cleanup example used `--force` as the default command and stated resources must be removed resource by resource. Current Pulumi docs support `--all` and reserve `--force` for protected resources, so the example now uses `--yes` and includes `pulumi state delete --all --yes`.
- The Pulumi secret export example used `pulumi config get dbPassword --show-secrets`, but current `pulumi config get` docs do not list `--show-secrets` for that subcommand. Replaced it with `pulumi config --show-secrets --json > pulumi-config.json`.

## Review Notes
Pulumi and Terraform CLIs were not installed in the workspace, so command validation was performed against current official CLI documentation. The two OneUptime related links in the conclusion returned HTTP 200 during review.
