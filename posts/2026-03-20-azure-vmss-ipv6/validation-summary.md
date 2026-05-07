# Validation Summary: How to Configure IPv6 on Azure VM Scale Sets

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Virtual Machine Scale Sets (VMSS)
- Azure Standard Load Balancer
- Azure Virtual Network dual-stack IPv4/IPv6 networking
- Terraform with the `azurerm` provider
- Azure CLI

## Sources Consulted
- Microsoft Learn: Deploy virtual machine scale sets with IPv6 in Azure - https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/ipv6-virtual-machine-scale-set
- Microsoft Learn: Overview of IPv6 for Azure Virtual Network - https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/ipv6-overview
- Microsoft Learn: Azure Load Balancer health probes - https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-custom-probe-overview
- Microsoft Learn: Multiple frontends for Azure Load Balancer - https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-multivip-overview
- Microsoft Learn: az vmss nic - https://learn.microsoft.com/en-us/cli/azure/vmss/nic?view=azure-cli-latest
- Microsoft Learn: az network public-ip - https://learn.microsoft.com/en-us/cli/azure/network/public-ip?view=azure-cli-latest
- Terraform Registry: azurerm_linux_virtual_machine_scale_set - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine_scale_set
- Terraform Registry: azurerm_lb_rule - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/lb_rule
- Terraform Registry: azurerm_monitor_autoscale_setting - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_autoscale_setting
- HashiCorp Developer: `file` function - https://developer.hashicorp.com/terraform/language/functions/file
- HashiCorp Developer: `pathexpand` function - https://developer.hashicorp.com/terraform/language/functions/pathexpand
- Microsoft Learn: Automatic instance repairs with Azure Virtual Machine Scale Sets - https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-automatic-instance-repairs

## Issues Found
- The original snippet attached both IPv4 and IPv6 load-balancing rules to the same backend pool on the same backend port. Azure Load Balancer requires Floating IP for same-port multi-frontend rules that share a backend pool, so I split the configuration into separate IPv4 and IPv6 backend pools to match Azure dual-stack guidance.
- The health probe used `request_path = "/health"` but the bootstrap script only installed the default nginx site, which would not return a healthy response on that path. I changed the probe path to `/` so the example health check matches the installed service.
- The SSH key example used `file("~/.ssh/id_rsa.pub")`. Terraform's `file()` function does not expand `~`, so I changed it to `file(pathexpand("~/.ssh/id_rsa.pub"))`.
- The VMSS resource associated NIC IP configurations with load balancer backend pools but did not declare the documented dependency on the load balancer rules. I added `depends_on` for the IPv4 and IPv6 LB rules.
- The VMSS resource set a fixed `instances = 2` while also configuring Azure Monitor autoscale. A later `terraform apply` would otherwise reset the instance count back to `2`, so I added `lifecycle { ignore_changes = [instances] }`.
- The post enabled `automatic_instance_repair` without configuring the required VMSS health monitoring input (`health_probe_id` or an Application Health extension). I removed that block rather than leave a nonfunctional repair policy in place.
- The text did not mention that IPv6 health probes on a dual-stack Azure Load Balancer require an attached NSG. I clarified that prerequisite in the introduction and conclusion.

## Review Notes
- The Terraform resource used in the post, `azurerm_linux_virtual_machine_scale_set`, creates a Uniform-orchestration VMSS. That matches the verification command `az vmss nic list`, which is Uniform-specific.
- The example still assumes supporting resources such as the dual-stack subnet, NSG, resource group, and IPv4/IPv6 public IP resources already exist elsewhere in the module.
