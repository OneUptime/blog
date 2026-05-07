# Validation Summary: How to Configure Azure Load Balancer IPv6 with Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Load Balancer
- Azure Public IP
- Azure Virtual Network
- Azure Network Security Groups
- Terraform
- Azure CLI
- IPv6
- Dual-stack networking

## Sources Consulted
- Microsoft Learn, Deploy a dual stack (IPv4 + IPv6) application using Standard Load Balancer in Azure: https://learn.microsoft.com/en-us/azure/load-balancer/deploy-ipv4-ipv6-dual-stack-standard-load-balancer
- Microsoft Learn, What is IPv6 for Azure Virtual Network?: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/ipv6-overview
- Microsoft Learn, Azure Load Balancer Best Practices: https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-best-practices
- Microsoft Learn, Azure Basic Load Balancer lifecycle page: https://learn.microsoft.com/en-us/lifecycle/products/azure-basic-load-balancer
- Microsoft Learn, Azure CLI `az network lb frontend-ip`: https://learn.microsoft.com/en-us/cli/azure/network/lb/frontend-ip?view=azure-cli-latest
- Microsoft Learn, Azure CLI `az network public-ip`: https://learn.microsoft.com/en-us/cli/azure/network/public-ip?view=azure-cli-latest
- Terraform Registry, `azurerm_public_ip`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/public_ip
- Terraform Registry, `azurerm_lb`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/lb
- Terraform Registry, `azurerm_lb_backend_address_pool`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/lb_backend_address_pool
- Terraform Registry, `azurerm_lb_rule`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/lb_rule
- Terraform Registry, `azurerm_network_interface_backend_address_pool_association`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_interface_backend_address_pool_association

## Issues Found
- The Step 1 heading said to create an IPv6 public IP, but the code in that section creates both IPv4 and IPv6 public IP resources. I changed the heading so it matches the actual Terraform.
- The load balancer comment said Standard SKU is required for IPv6. Microsoft’s IPv6 overview documents legacy Basic IPv6 public load balancer support, and Microsoft’s lifecycle documentation shows Basic Load Balancer was retired on September 30, 2025. I changed the comment to reflect the current reason to use Standard: it is the supported option for new deployments.
- The test command tried to read the IP address from `az network lb frontend-ip show --query publicIpAddress.ipAddress`. Microsoft documents the frontend IP configuration as a reference to a public IP resource, while `az network public-ip show` is the documented command that exposes the actual `ipAddress` field. I changed the command to query the IPv6 public IP resource directly.
- The post omitted an important prerequisite around Network Security Groups. Microsoft documents that Standard public load balancers need NSGs for inbound connectivity on backend NICs or subnets, and that IPv6 health probes in dual-stack deployments do not function without an active NSG. I added a short sentence covering that prerequisite.
- The IPv6 `curl` example tested `/`, while the only endpoint defined in the post was the HTTP probe path `/health`. I changed the request to `/health` so the validation step aligns with the configured sample endpoint.

## Review Notes
- The Terraform resource shapes used in the post are current: `azurerm_public_ip` supports `ip_version = "IPv6"` with static allocation, `azurerm_lb_rule` uses `backend_address_pool_ids`, and `azurerm_network_interface_backend_address_pool_association` still uses `ip_configuration_name`.
- Separate IPv4 and IPv6 backend pools are consistent with Microsoft’s dual-stack Standard Load Balancer guidance.
- A local Azure CLI validation run was not possible in this environment because `az` is not installed, so command verification was done against current Microsoft Learn CLI reference pages instead.
