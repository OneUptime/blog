# Validation Summary: How to Set Up Azure Defender for Cloud with OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Microsoft Defender for Cloud
- OpenTofu / HCL
- AzureRM provider resources for Defender for Cloud
- Azure Log Analytics workspace settings
- Microsoft Defender for Cloud subscription-level settings

## Sources Consulted
- AzureRM provider documentation: `azurerm_security_center_subscription_pricing` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/security_center_subscription_pricing.html.markdown
- AzureRM provider documentation: `azurerm_security_center_contact` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/security_center_contact.html.markdown
- AzureRM provider documentation: `azurerm_security_center_auto_provisioning` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/security_center_auto_provisioning.html.markdown
- AzureRM provider documentation: `azurerm_security_center_workspace` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/security_center_workspace.html.markdown
- AzureRM provider documentation: `azurerm_security_center_setting` https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/security_center_setting.html.markdown
- Microsoft Learn: Prepare for retirement of the Log Analytics agent https://learn.microsoft.com/en-gb/azure/defender-for-cloud/prepare-deprecation-log-analytics-mma-agent
- Microsoft Learn: Deploy Defender for Azure SQL Databases https://learn.microsoft.com/en-us/azure/defender-for-cloud/enable-sql-database-plan
- Microsoft Learn: Enable Microsoft Defender for SQL Servers on Machines https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-sql-usage
- Microsoft Learn: Support and prerequisites for DevOps security https://learn.microsoft.com/en-us/azure/defender-for-cloud/devops-support
- Microsoft Learn: `Microsoft.Security/securityConnectors/devops` AzAPI reference https://learn.microsoft.com/en-us/azure/templates/microsoft.security/securityconnectors/devops
- Microsoft Learn: `Microsoft.Security/securityConnectors` AzAPI reference https://learn.microsoft.com/en-us/azure/templates/microsoft.security/securityconnectors

## Issues Found
- The post used the outdated product name "Azure Defender for Cloud". I updated the title and description to the current Microsoft product name, "Microsoft Defender for Cloud".
- The SQL example claimed to enable "Defender for SQL Servers on Machines" but used `resource_type = "SqlServers"`. I changed it to `SqlServerVirtualMachines`, which is the AzureRM resource type that matches the SQL Servers on Machines plan.
- The auto-provisioning section presented MMA/Log Analytics agent auto-provisioning as a normal current setup step. AzureRM documents `azurerm_security_center_auto_provisioning` as deprecated, and Microsoft documents the MMA auto-provisioning path as retired/deprecated. I changed the section to mark it deprecated and set the example to `auto_provision = "Off"` for new deployments.
- The workspace example referenced undeclared resources and described the feature too broadly as connecting all Defender data to Log Analytics. I replaced it with a self-contained example using full Azure resource IDs and corrected the description to match the documented behavior: assigning a workspace for VM security data.
- The "Enable Defender for DevOps" section was technically incorrect. The shown `azurerm_security_center_setting` resources manage optional Defender for Cloud subscription settings such as `MCAS` and `WDATP`; they do not create DevOps security connectors for GitHub or Azure DevOps. I renamed the section and comment to reflect what the code actually does.
- The output list still referenced `SqlServers` after the SQL plan correction. I updated the output to `SqlServerVirtualMachines` to keep it consistent with the fixed example.

## Review Notes
- `azurerm_security_center_auto_provisioning` is still documented in the AzureRM provider, but the provider marks it deprecated and notes it will be removed in AzureRM v5.0. The post is now accurate for current provider behavior, but readers should avoid building new automation around this resource.
- If this post is later expanded to cover actual Defender for DevOps onboarding, it should use the documented `Microsoft.Security/securityConnectors` and `Microsoft.Security/securityConnectors/devops` resource types via AzAPI or an equivalent officially supported workflow. The current post no longer claims that `azurerm_security_center_setting` enables DevOps connectors.
