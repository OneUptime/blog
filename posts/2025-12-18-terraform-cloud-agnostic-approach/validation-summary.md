# Validation Summary: How to Use Terraform in a Cloud-Agnostic Way

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- Terraform HCL
- AWS EC2 and Spot Instances
- Azure Virtual Machines
- Google Compute Engine and Spot VMs
- Terragrunt remote state
- Terratest
- YAML configuration with Terraform

## Sources Consulted
- Terraform Registry: AWS `aws_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform Registry: AWS `aws_spot_instance_request` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/spot_instance_request
- Terraform Registry: AzureRM `azurerm_linux_virtual_machine` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine.html
- Microsoft Learn: Use Terraform to create a Linux VM: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/quick-create-terraform
- Microsoft Learn: Find Azure Marketplace image information: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/cli-ps-findimage
- Terraform Registry: Google `google_compute_instance` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance
- Google Cloud documentation: Create and use Spot VMs: https://docs.cloud.google.com/compute/docs/instances/create-use-spot
- Terraform language docs: `yamldecode`: https://developer.hashicorp.com/terraform/language/functions/yamldecode
- Terraform language docs: `coalesce`: https://developer.hashicorp.com/terraform/language/functions/coalesce
- Terraform language docs: optional object attributes and type constraints: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform language docs: `count` meta-argument: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- Terragrunt docs: State Backend: https://docs.terragrunt.com/features/units/state-backend/
- Terragrunt docs: Functions: https://terragrunt.gruntwork.io/docs/reference/hcl/functions
- Terratest Go package documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/terraform

## Issues Found
- The Azure VM example passed `subnet_id` to `network_interface_ids`, but `azurerm_linux_virtual_machine` expects Azure network interface IDs. Added a separate `network_interface_id` field and used it for Azure.
- The Azure Linux VM example did not configure VM authentication. Added an `admin_ssh_key` block and a corresponding `ssh_public_key` input.
- The Linux VM abstraction included a Windows Server image while using `azurerm_linux_virtual_machine`. Removed the Windows image entries from the Linux compute example.
- The compute module referenced `var.azure_resource_group`, `var.azure_location`, and `var.gcp_zone` without declaring them. Added minimal variable declarations.
- The Azure image mappings used non-Gen2 SKUs for current Ubuntu/RHEL examples. Updated them to `22_04-lts-gen2` and `9-lvm-gen2`.
- The Terragrunt Azure backend example derived a storage account name from `AZURE_SUBSCRIPTION_ID`, which would produce an invalid Azure Storage account name because subscription IDs contain hyphens and exceed naming limits. Changed it to read `AZURE_STORAGE_ACCOUNT_NAME`.
- The GCP Spot VM example used only legacy preemptible settings. Updated the scheduling block to include `provisioning_model = "SPOT"` and `instance_termination_action = "STOP"`, matching current Google Cloud Terraform examples.
- The Terratest input map omitted newly required compute module fields. Added provider-specific placeholder values for subnet/subnetwork, Azure NIC ID, and SSH public key.

## Review Notes
The examples are still illustrative and omit full provider configuration, networking resources, credentials, and production-grade validation. The overall approach is technically valid, but real modules should usually split provider-specific compute implementations into submodules to avoid requiring irrelevant inputs for each provider.
