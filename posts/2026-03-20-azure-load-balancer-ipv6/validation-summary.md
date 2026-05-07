# Validation Summary: How to Configure Azure Load Balancer for IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Load Balancer
- Azure CLI
- Terraform
- IPv6
- Dual-stack networking

## Sources Consulted
- Microsoft Learn: Deploy IPv6 dual stack application with Azure Load Balancer: https://learn.microsoft.com/en-us/azure/load-balancer/deploy-ipv4-ipv6-dual-stack-standard-load-balancer
- Microsoft Learn: Azure Load Balancer portal settings: https://learn.microsoft.com/en-us/azure/load-balancer/manage
- Microsoft Learn: Azure Load Balancer health probes: https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-custom-probe-overview
- Microsoft Learn: What is IPv6 for Azure Virtual Network?: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/ipv6-overview
- Microsoft Learn: Azure Load Balancer SKUs: https://learn.microsoft.com/en-ca/azure/load-balancer/skus
- Microsoft Learn: Azure CLI `az network public-ip create`: https://learn.microsoft.com/en-us/cli/azure/network/public-ip?view=azure-cli-lts
- Microsoft Learn: Azure CLI `az network lb`: https://learn.microsoft.com/en-us/cli/azure/network/lb?view=azure-cli-lts
- Microsoft Learn: Azure CLI `az network lb frontend-ip create`: https://learn.microsoft.com/en-us/cli/azure/network/lb/frontend-ip?view=azure-cli-lts
- Microsoft Learn: Azure CLI `az network lb rule create`: https://learn.microsoft.com/en-us/cli/azure/network/lb/rule?view=azure-cli-lts
- Microsoft Learn: Azure CLI `az network nic ip-config create`: https://learn.microsoft.com/en-us/cli/azure/network/nic/ip-config?view=azure-cli-lts
- HashiCorp AzureRM provider docs: `azurerm_public_ip`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/public_ip.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_lb`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/lb.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_lb_backend_address_pool`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/lb_backend_address_pool.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_lb_rule`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/lb_rule.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_network_interface_backend_address_pool_association`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/network_interface_backend_address_pool_association.html.markdown

## Issues Found
- The post used one shared backend pool for both IPv4 and IPv6 rules. Azure's dual-stack guidance and portal model use separate IPv4 and IPv6 backend pools tied to the matching NIC IP configurations, so the CLI and Terraform examples were updated to use separate pools.
- The IPv6 NIC command attached the new IPv6 IP configuration to the wrong backend pool and omitted subnet context. It was corrected to target the IPv6 backend pool and include `--vnet-name` and `--subnet`, which are required for a valid NIC IP configuration in this scenario.
- The public IP commands did not explicitly set static allocation. `--allocation-method Static` was added because Standard public IPs require static allocation and IPv6 public IPs support static allocation only.
- The conclusion claimed Basic Load Balancer does not support IPv6. That statement is inaccurate historically and outdated operationally. It was corrected to the current guidance: use Standard Load Balancer for new deployments, and note that Basic Load Balancer was retired on September 30, 2025.
- The post omitted the dual-stack requirement for IPv6 health probes. The introduction and conclusion were updated to note that an active Network Security Group is required for IPv6 health probes to function.

## Review Notes
- The Terraform snippet covers the load balancer resources themselves. Backend NIC/IP configuration associations still need to exist in the surrounding infrastructure for traffic to flow.
- The verification command using `curl -6` is technically correct for testing from an external client with IPv6 connectivity.
