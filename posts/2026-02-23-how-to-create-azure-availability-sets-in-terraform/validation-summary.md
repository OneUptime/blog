# Validation Summary: How to Create Azure Availability Sets in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Virtual Machines
- Azure Availability Sets
- Azure Load Balancer
- Azure Managed Disks

## Sources Consulted
- Microsoft Learn: Availability sets overview - https://learn.microsoft.com/en-us/azure/virtual-machines/availability-set-overview
- Microsoft Learn: Azure subscription and service limits, quotas, and constraints - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits
- Terraform Registry: azurerm_availability_set - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/availability_set
- Terraform Registry: azurerm_linux_virtual_machine - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine
- Terraform Registry: azurerm_network_interface_backend_address_pool_association - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_interface_backend_address_pool_association

## Issues Found
- Updated the AzureRM provider constraint from `~> 3.80` to `~> 4.0` so the example targets the current major provider line while keeping the same supported resource arguments.
- Changed the VM distribution wording from "across the 3 fault domains" to "across up to 3 fault domains" to match Azure's documented availability set behavior and regional managed-disk fault domain limits.

## Review Notes
The Terraform resource names and key arguments are current: `azurerm_availability_set.managed`, `platform_fault_domain_count`, `platform_update_domain_count`, `azurerm_linux_virtual_machine.availability_set_id`, and `azurerm_network_interface_backend_address_pool_association` are valid. Microsoft documents that availability sets have no extra charge, support up to 3 fault domains and 20 update domains, and have a 200-VM limit per availability set. The examples reference existing subnet and load balancer resources but are otherwise technically consistent with focused snippets.
