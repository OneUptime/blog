# Validation Summary: How to Create Azure Load Balancer in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Load Balancer
- Azure Public IP addresses
- Azure Virtual Network and subnets
- Azure Load Balancer health probes, rules, outbound rules, and inbound NAT rules

## Sources Consulted
- HashiCorp Terraform Registry: `azurerm_lb` resource documentation, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/lb
- HashiCorp Terraform Registry: `azurerm_public_ip` resource documentation, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/public_ip
- HashiCorp Terraform Registry: `azurerm_lb_probe` resource documentation, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/lb_probe
- HashiCorp Terraform Registry: `azurerm_lb_rule` resource documentation, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/lb_rule
- HashiCorp Terraform Registry: `azurerm_lb_outbound_rule` resource documentation, https://registry.terraform.io/providers/hashicorp/azurerm/3.91.0/docs/resources/lb_outbound_rule
- HashiCorp Terraform Registry: `azurerm_lb_nat_rule` resource documentation, https://registry.terraform.io/providers/hashicorp/azurerm/3.89.0/docs/resources/lb_nat_rule
- Microsoft Learn: Azure Load Balancer outbound rules, https://learn.microsoft.com/en-us/azure/load-balancer/outbound-rules
- Microsoft Learn: Source Network Address Translation for outbound connections, https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-outbound-connections
- Microsoft Learn: Azure Load Balancer health probes, https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-custom-probe-overview
- Microsoft Learn: Azure Basic Load Balancer lifecycle, https://learn.microsoft.com/en-us/lifecycle/products/azure-basic-load-balancer
- Microsoft Learn: Quickstart create an internal load balancer with Terraform, https://learn.microsoft.com/en-us/azure/load-balancer/quickstart-load-balancer-standard-internal-terraform

## Issues Found
- The outbound example created `azurerm_public_ip.outbound` but did not attach it to the public load balancer, so the outbound rule still referenced the inbound frontend and the separate outbound IP was unused. I added a `frontend-outbound` frontend IP configuration to `azurerm_lb.public` and changed the outbound rule to use it.
- The outbound-rules section said Standard Load Balancer requires explicit outbound rules for all internet-bound traffic. Azure supports implicit outbound SNAT through public load-balancing rules, but explicit outbound rules are required for the article's configuration because `disable_outbound_snat = true` is set. I updated the wording to reflect that condition.

## Review Notes
- Terraform CLI was not installed in the review environment, so I could not run `terraform validate`; syntax and arguments were checked against the official AzureRM provider documentation instead.
- The post pins AzureRM to `~> 3.80`, while the current provider major version is 4.x. The examples use arguments that remain documented, but a future update could modernize the provider version after testing.
