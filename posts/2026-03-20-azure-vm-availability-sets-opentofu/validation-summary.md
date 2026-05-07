# Validation Summary: How to Set Up Azure VM Availability Sets with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure Virtual Machines
- Azure Availability Sets
- Azure Load Balancer
- Azure CLI
- AzureRM provider

## Sources Consulted
- Azure Availability Sets overview: https://learn.microsoft.com/en-us/azure/virtual-machines/availability-set-overview
- Availability options for Azure Virtual Machines: https://learn.microsoft.com/en-us/azure/virtual-machines/availability
- Plan and implement an SAP deployment on Azure: https://learn.microsoft.com/en-us/azure/sap/workloads/planning-guide
- Azure CLI `az vm availability-set`: https://learn.microsoft.com/en-us/cli/azure/vm/availability-set?view=azure-cli-latest
- Azure CLI `az vm`: https://learn.microsoft.com/cli/azure/vm?view=azure-cli-latest
- Manage a public IP address with a load balancer: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/configure-public-ip-load-balancer
- Terraform Registry `azurerm_availability_set`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/availability_set
- Terraform Registry `azurerm_linux_virtual_machine`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine
- Terraform Registry `azurerm_network_interface_backend_address_pool_association`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_interface_backend_address_pool_association
- Terraform Registry `azurerm_public_ip`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/public_ip

## Issues Found
- The introduction incorrectly implied that Premium storage raises an Availability Set deployment to a 99.99% VM SLA. I changed this to the documented 99.95% SLA for two or more VMs in an Availability Set, because Azure documents 99.99% for multi-zone deployments rather than for Availability Sets with Premium storage.
- The load balancer example referenced `azurerm_public_ip.main.id` without defining `azurerm_public_ip.main`. I added the missing `azurerm_public_ip` resource and set it to `sku = "Standard"` with `allocation_method = "Static"` so the example matches Azure's Standard Load Balancer requirements.
- The VM verification example used `az vm show` to read fault and update domain assignments. I changed it to `az vm get-instance-view`, which is the Azure CLI command that exposes instance-view properties such as `platformFaultDomain` and `platformUpdateDomain`.
- The conclusion said Availability Sets cannot be changed after VM creation. I corrected this to the documented immutable behavior: fault and update domain counts cannot be changed after the availability set is created.

## Review Notes
- Microsoft currently recommends flexible orchestration Virtual Machine Scale Sets for many new high-availability VM workloads, although Availability Sets remain supported and technically appropriate for the scenarios described in this post.
- The load balancer step is accurate for backend-pool association, but a production-ready public load balancer would still need a health probe, load-balancing rule, and matching NSG allowances before it can serve traffic.
