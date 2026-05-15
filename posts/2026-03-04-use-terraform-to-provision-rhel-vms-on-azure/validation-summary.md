# Validation Summary: How to Use Terraform to Provision RHEL VMs on Azure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Virtual Machines
- Azure Virtual Network, subnet, public IP, network interface, and network security group resources
- Red Hat Enterprise Linux 9 on Azure
- SSH

## Sources Consulted
- HashiCorp Terraform Registry / AzureRM provider documentation for `azurerm_linux_virtual_machine`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine
- HashiCorp Terraform AzureRM provider source documentation for `azurerm_linux_virtual_machine`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/linux_virtual_machine.html.markdown
- HashiCorp Terraform Registry documentation for `azurerm_public_ip`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/public_ip
- Microsoft Learn, "Overview of Red Hat Enterprise Linux images in Azure": https://learn.microsoft.com/en-us/azure/virtual-machines/workloads/redhat/redhat-images
- HashiCorp Terraform CLI documentation for `terraform plan`: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform CLI documentation for `terraform destroy`: https://developer.hashicorp.com/terraform/cli/commands/destroy
- HashiCorp Terraform function documentation for `file`: https://developer.hashicorp.com/terraform/language/functions/file
- HashiCorp Terraform function documentation for `pathexpand`: https://developer.hashicorp.com/terraform/language/functions/pathexpand

## Issues Found
No technical issues found.

## Review Notes
The Terraform configuration uses current AzureRM 4.x resource types and arguments. The RHEL image reference `publisher = "RedHat"`, `offer = "RHEL"`, and `sku = "9-lvm-gen2"` matches Microsoft's documented RHEL 9 Gen2 LVM image naming. The `file(pathexpand("~/.ssh/id_rsa.pub"))` expression is valid, but it assumes the public key already exists on the machine running Terraform.
