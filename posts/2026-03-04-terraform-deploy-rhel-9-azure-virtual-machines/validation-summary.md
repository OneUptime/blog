# Validation Summary: How to Use Terraform to Deploy RHEL on Azure Virtual Machines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Microsoft Azure Virtual Machines
- Azure CLI
- Terraform
- HashiCorp AzureRM Terraform provider
- Azure virtual networking and Network Security Groups

## Sources Consulted
- Microsoft Learn: Install the Azure CLI on Linux, https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-linux
- Microsoft Learn: Overview of Red Hat Enterprise Linux images in Azure, https://learn.microsoft.com/en-us/azure/virtual-machines/workloads/redhat/redhat-images
- Microsoft Learn: Azure CLI `az vm image terms`, https://learn.microsoft.com/en-us/cli/azure/vm/image/terms
- Microsoft Learn: Red Hat Update Infrastructure for on-demand RHEL VMs in Azure, https://learn.microsoft.com/en-us/azure/virtual-machines/workloads/redhat/redhat-rhui
- Microsoft Learn: Red Hat Enterprise Linux BYOS images in Azure, https://learn.microsoft.com/en-us/azure/virtual-machines/workloads/redhat/byos
- HashiCorp Developer: Install Terraform, https://developer.hashicorp.com/terraform/install
- Terraform Registry: AzureRM provider documentation and v4 upgrade guidance, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- Terraform Registry: `azurerm_linux_virtual_machine` resource documentation, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine
- Terraform Registry: `azurerm_public_ip` resource documentation, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/public_ip
- Red Hat Documentation: Managing software with the DNF tool for RHEL 9, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/

## Issues Found
- The AzureRM provider was pinned to `~> 3.80`, which is outdated for a current 2026 tutorial. Updated it to `~> 4.0`.
- AzureRM provider v4 requires a subscription ID during plan/apply, either configured directly or supplied through `ARM_SUBSCRIPTION_ID`. Added an `export ARM_SUBSCRIPTION_ID=$(az account show --query id -o tsv)` command after `az login`.
- Marketplace image terms were not explicitly accepted before Terraform deployment. Added `az vm image terms accept --urn RedHat:RHEL:9-lvm-gen2:latest` so first-time deployments are not dependent on prior portal acceptance.
- The Terraform install snippet used `dnf config-manager` without installing the plugin package that provides it on RHEL-family systems. Added `sudo dnf install -y dnf-plugins-core`.
- The VM `plan` block comment said it accepted the marketplace plan. The block supplies plan metadata to Azure; terms acceptance is done separately with Azure CLI. Updated the comment to say it provides marketplace plan information.

## Review Notes
The RHEL image reference `RedHat:RHEL:9-lvm-gen2:latest`, Standard static public IP configuration, NSG SSH rule syntax, network interface configuration, and `azurerm_linux_virtual_machine` resource structure are consistent with the official documentation. Local execution of `terraform validate` was not possible because Terraform is not installed in this workspace.
