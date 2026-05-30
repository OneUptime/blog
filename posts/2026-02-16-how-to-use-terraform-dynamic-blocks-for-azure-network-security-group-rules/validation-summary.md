# Validation Summary: How to Use Terraform Dynamic Blocks for Azure Network Security Group Rules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform dynamic blocks
- AzureRM Terraform provider
- Azure Network Security Groups
- Azure NSG security rules
- Infrastructure as Code

## Sources Consulted
- Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- AzureRM `azurerm_network_security_group` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_security_group
- AzureRM `azurerm_network_security_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_security_rule
- Azure Network Security Group rule management documentation: https://learn.microsoft.com/en-us/azure/virtual-network/manage-network-security-group

## Issues Found
- The multiple-port section said dynamic blocks handle singular/plural port attributes with conditional logic, but the example does not use a Terraform conditional expression. It sets one mutually exclusive argument to a value and the other to `null`, which Terraform treats as omitted. Updated the explanation to match the code.
- The standalone `azurerm_network_security_rule` recommendation said adding or removing a rule does not force recreation of the entire NSG. Inline rule changes are updates to the NSG resource, not necessarily full NSG recreation. Updated the wording to focus on separate Terraform resource instances and clearer per-rule diffs.

## Review Notes
The Terraform examples use valid dynamic block syntax and current AzureRM NSG rule arguments. The AzureRM provider documentation warns not to mix inline `security_rule` blocks with standalone `azurerm_network_security_rule` resources for the same NSG, and the post correctly includes that guidance.
