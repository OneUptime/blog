# Validation Summary: How to Configure Azure Network Security Groups for IPv4 Using Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Network Security Groups
- Azure Network Security Rules
- Azure subnets
- Azure network interfaces
- IPv4 CIDR prefixes

## Sources Consulted
- Azure network security groups overview: https://learn.microsoft.com/azure/virtual-network/network-security-groups-overview
- Azure NSG troubleshooting and subnet/NIC evaluation behavior: https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-network/virtual-network-troubleshoot-ssh-nsg-problem
- AzureRM `azurerm_network_security_group` provider documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_security_group
- AzureRM `azurerm_network_security_rule` provider documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_security_rule
- AzureRM `azurerm_subnet_network_security_group_association` provider documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet_network_security_group_association
- AzureRM `azurerm_network_interface_security_group_association` provider documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_interface_security_group_association
- Terraform CLI `init`, `plan`, and `apply` command documentation: https://developer.hashicorp.com/terraform/cli/commands
- Author GitHub profile: https://github.com/nawazdhandala

## Issues Found
1. **Invalid NSG rule priority**: Changed the standalone `azurerm_network_security_rule` example from `priority = 50` to `priority = 100`. Azure custom NSG security rule priorities must be between 100 and 4096.

2. **Mixed inline and standalone rule management**: Added guidance that inline `security_rule` blocks and standalone `azurerm_network_security_rule` resources must not be used together for the same NSG. The AzureRM provider documents this as a conflict that can overwrite rule settings.

3. **Overstated outbound coverage**: Updated the description to say the post covers inbound security rules, because the code examples do not include outbound rule definitions.

4. **Misleading NIC override wording**: Changed the conclusion from NIC "overrides" to instance-specific filtering and noted that when both subnet and NIC NSGs are associated, both must allow the traffic. A deny at either level blocks the connection.

5. **Overstated explicit deny-all guidance**: Replaced "Always end rules with an explicit deny-all" with guidance that explicit deny-all rules at priority 4096 are only needed when intentionally overriding Azure's built-in default allow rules. Azure already creates default deny-all rules at priority 65500.

## Review Notes
- The Terraform resource names and arguments used in the snippets match the current AzureRM provider documentation.
- The `terraform init`, `terraform plan`, and `terraform apply` commands are current and valid.
- The subnet and NIC association snippets assume `azurerm_subnet.web` and `azurerm_network_interface.vm` are defined elsewhere in the Terraform configuration.
