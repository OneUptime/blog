# Validation Summary: How to Create Azure Batch Accounts with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HCL
- Azure Batch
- Azure Storage
- AzureRM provider

## Sources Consulted
- AzureRM provider docs for `azurerm_batch_account`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/batch_account.html.markdown
- AzureRM provider docs for `azurerm_batch_pool`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/batch_pool.html.markdown
- AzureRM provider docs for `azurerm_batch_application`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/batch_application.html.markdown
- Microsoft Learn, "Deploy an Azure Batch account and two pools - Terraform": https://learn.microsoft.com/en-us/azure/batch/quick-deploy-batch-account-two-pools-terraform
- Microsoft Learn, "Choose VM sizes and images for pools": https://learn.microsoft.com/en-us/azure/batch/batch-pool-vm-sizes
- Microsoft Learn, "Autoscale compute nodes in an Azure Batch pool": https://learn.microsoft.com/en-us/azure/batch/batch-automatic-scaling
- Microsoft Learn, "Create a Batch account in the Azure portal": https://learn.microsoft.com/en-us/azure/batch/batch-account-create-portal
- Microsoft Learn, "Storage Account Overview": https://learn.microsoft.com/en-us/azure/storage/common/storage-account-overview
- OpenTofu docs, `tofu plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu docs, `tofu apply`: https://opentofu.org/docs/v1.11/cli/commands/apply/

## Issues Found
- The sample omitted `provider "azurerm" { features {} }`, which is required for a runnable AzureRM configuration. I added the provider block so the deployment steps match the HCL shown.
- The `start_task` block used `max_task_retry_count`, which is not the current AzureRM provider argument for Batch pools. I changed it to `task_retry_maximum` to match the provider documentation and Microsoft Learn Terraform example. I also made the bootstrap command install `python3-pip` before calling `pip3`, so it matches the Ubuntu 22.04 image used by the pool sample.
- The pool image reference used a `microsoft-dsvm/ubuntu-hpc/2204` example that was not the documented Ubuntu 22.04 Batch pool image pairing used in the current AzureRM/Microsoft Learn Terraform examples. I changed it to `Canonical / 0001-com-ubuntu-server-jammy / 22_04-lts`, which is documented with `node_agent_sku_id = "batch.node.ubuntu 22.04"`.
- The prose claimed the post created jobs, job schedules, and application packages, but the code only provisions a Batch account, Batch pool, and Batch application. I corrected the description, introduction, and summary so they match the resources actually shown.

## Review Notes
- The sample still depends on `app_name` and `environment` producing Azure-compliant names. Batch account names must be 3-24 lowercase alphanumeric characters and unique within the region; Storage account names must be 3-24 lowercase alphanumeric characters and globally unique.
- `tofu` was not installed in the local workspace, so command verification for `tofu init`, `tofu plan -out=tfplan`, and `tofu apply tfplan` was done against the official OpenTofu CLI documentation rather than local `--help` output.
