# Validation Summary: How to Configure Azure Security Center with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Microsoft Defender for Cloud / Azure Security Center
- OpenTofu / AzureRM provider
- Azure Log Analytics
- Azure Logic Apps
- Azure Policy
- CIS Azure Foundations

## Sources Consulted
- AzureRM provider docs, `azurerm_security_center_subscription_pricing`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/security_center_subscription_pricing
- AzureRM provider docs, `azurerm_security_center_contact`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/security_center_contact
- AzureRM provider docs, `azurerm_security_center_auto_provisioning`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/security_center_auto_provisioning
- AzureRM provider docs, `azurerm_security_center_workspace`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/security_center_workspace
- AzureRM provider docs, `azurerm_security_center_automation`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/security_center_automation
- AzureRM provider docs, `azurerm_subscription_policy_assignment`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subscription_policy_assignment
- Microsoft Learn, Workflow automation in Defender for Cloud: https://learn.microsoft.com/en-us/azure/defender-for-cloud/workflow-automation
- Microsoft Learn, Prepare for retirement of the Log Analytics agent: https://learn.microsoft.com/en-us/azure/defender-for-cloud/prepare-deprecation-log-analytics-mma-agent
- Microsoft Learn, Azure Policy built-in definitions for Microsoft Defender for Cloud: https://learn.microsoft.com/en-us/azure/defender-for-cloud/policy-reference
- Azure Policy built-in definition source, Microsoft cloud security benchmark: https://github.com/Azure/azure-policy/blob/master/built-in-policies/policySetDefinitions/Security%20Center/AzureSecurityCenter.json
- Azure Policy built-in definition source, CIS Azure Foundations v3.0.0: https://github.com/Azure/azure-policy/blob/master/built-in-policies/policySetDefinitions/Regulatory%20Compliance/CIS_Azure_Foundations_v3.0.0.json

## Issues Found
- The original Step 3 used `azurerm_security_center_auto_provisioning` as an active configuration step. AzureRM marks that resource as deprecated, and Microsoft documents the MMA auto-provisioning path as retired with the November 2024 Log Analytics agent deprecation. The step was replaced with a short legacy note instead of leaving a deprecated resource in a 2026 how-to.
- The original Step 5 used `azurerm_monitor_action_group` but described it as sending Defender for Cloud alerts to a Logic App. That resource only defines Monitor receivers and does not create Defender for Cloud workflow automation. It was replaced with `azurerm_security_center_automation` configured for `Alerts` and a `LogicApp` action.
- The original Step 4 wording said the workspace would receive general Security Center data. The AzureRM `azurerm_security_center_workspace` resource is specifically for mapping VM security data to a Log Analytics workspace, so the wording was narrowed to match the documented behavior.
- The original Step 6 claimed to assign CIS compliance but actually used policy set ID `1f3afdf9-d0c9-4c3d-847f-89da613e70a8`, which is the Microsoft cloud security benchmark initiative. It was corrected to the current CIS Azure Foundations v3.0.0 initiative ID `470a962c-86a0-433b-803a-3c176b5ce79c`.
- The summary paragraph still claimed that auto-provisioning would install agents on all VMs and that the workspace broadly centralized security data. It was updated to reflect current Defender for Cloud behavior and the narrower purpose of the workspace mapping.

## Review Notes
- The post title still uses the legacy "Azure Security Center" name, while Microsoft documentation now uses "Microsoft Defender for Cloud." The body now reflects the current product naming where it matters technically.
- The snippets assume supporting resources already exist elsewhere in the configuration, including `azurerm_resource_group.rg`, `azurerm_logic_app_workflow.security_notifications`, and related variables.
- If a policy assignment is later expanded to use remediation for `deployIfNotExists` or `modify` effects, it may need an `identity` block and `location`; the simple example here only covers assignment.
