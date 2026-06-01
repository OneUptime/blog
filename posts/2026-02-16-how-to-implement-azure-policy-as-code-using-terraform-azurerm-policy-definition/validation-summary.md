# Validation Summary: How to Implement Azure Policy as Code Using Terraform azurerm_policy_definition

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Policy definitions
- Azure Policy initiatives / policy set definitions
- Azure Policy assignments
- Azure Policy remediation
- Azure managed identities
- Azure RBAC role assignments

## Sources Consulted
- HashiCorp Terraform Registry, `azurerm_policy_definition`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/policy_definition.html
- HashiCorp Terraform Registry, `azurerm_policy_set_definition`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/policy_set_definition
- HashiCorp Terraform Registry, `azurerm_subscription_policy_assignment`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subscription_policy_assignment
- HashiCorp Terraform Registry, AzureRM policy resources index: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- Microsoft Learn, Azure Policy definition structure basics: https://learn.microsoft.com/en-us/azure/governance/policy/concepts/definition-structure-basics
- Microsoft Learn, Azure Policy definition structure policy rules: https://learn.microsoft.com/en-us/azure/governance/policy/concepts/definition-structure-policy-rule
- Microsoft Learn, Azure Policy modify effect: https://learn.microsoft.com/en-us/azure/governance/policy/concepts/effect-modify
- Microsoft Learn, Azure Policy remediation structure: https://learn.microsoft.com/en-us/azure/templates/microsoft.policyinsights/remediations

## Issues Found
- The "Testing Policies Before Assignment" example claimed that assignment parameters could override the required-tags policy from `deny` to audit mode, but the policy definition hard-coded `effect = "deny"`. I changed the policy definition to expose an `effect` parameter with `audit`, `deny`, and `disabled` values, defaulting to `deny`, and updated the test assignment to pass `effect = "audit"`.
- The subscription-level remediation and test snippets used `data.azurerm_subscription.current.id` without declaring the data source in the shown Terraform. I added `data "azurerm_subscription" "current" {}` before the first subscription-scoped example that uses it.

## Review Notes
- The Terraform resource names and key arguments used for policy definitions, policy set definitions, management group assignments, subscription assignments, role assignments, and subscription remediation are current for the AzureRM provider.
- The Azure Policy rule syntax for parameterized tag fields, `Indexed` mode for tag policies, `modify` effect details, `roleDefinitionIds`, and non-compliance messages aligns with Microsoft Learn and Terraform provider documentation.
