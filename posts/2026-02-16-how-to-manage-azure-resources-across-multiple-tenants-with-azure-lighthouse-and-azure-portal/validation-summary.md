# Validation Summary: How to Manage Azure Resources Across Multiple Tenants with Azure Lighthouse

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Lighthouse
- Azure Portal
- Azure PowerShell
- Azure CLI
- Azure Monitor and Log Analytics
- Kusto Query Language (KQL)
- Azure Policy
- Azure Automation
- Microsoft Defender for Cloud
- Microsoft Entra ID

## Sources Consulted
- Microsoft Learn: Azure Lighthouse documentation, https://learn.microsoft.com/en-us/azure/lighthouse/
- Microsoft Learn: Cross-tenant management experiences in Azure Lighthouse, https://learn.microsoft.com/en-us/azure/lighthouse/concepts/cross-tenant-management-experience
- Microsoft Learn: View and manage customers and delegated resources in Azure Lighthouse, https://learn.microsoft.com/en-us/azure/lighthouse/how-to/view-manage-customers
- Microsoft Learn: Manage Azure portal settings and preferences, https://learn.microsoft.com/en-us/azure/azure-portal/set-preferences
- Microsoft Learn: View and filter Azure resource information, https://learn.microsoft.com/en-us/azure/azure-portal/manage-filter-resource-views
- Microsoft Learn: Query data across Log Analytics workspaces, applications, and resources, https://learn.microsoft.com/en-us/azure/azure-monitor/logs/cross-workspace-query
- Microsoft Learn: Azure Policy assignment CLI reference, https://learn.microsoft.com/en-us/cli/azure/policy/assignment
- Microsoft Learn: Quickstart: Create policy assignment using Azure CLI, https://learn.microsoft.com/en-us/azure/governance/policy/assign-policy-azurecli
- Microsoft Learn: Azure Automation account authentication overview, https://learn.microsoft.com/en-us/azure/automation/automation-security-overview
- Microsoft Learn: Migrate from Azure Automation Run As accounts to managed identities, https://learn.microsoft.com/en-us/azure/automation/migrate-run-as-accounts-managed-identity
- Microsoft Learn: Manage runbooks in Azure Automation, https://learn.microsoft.com/en-us/azure/automation/manage-runbooks
- Microsoft Learn: Cross-tenant management in Microsoft Defender for Cloud, https://learn.microsoft.com/en-us/azure/defender-for-cloud/cross-tenant-management

## Issues Found
- The PowerShell VM inventory example re-queried each VM after the loop without switching back to the VM's subscription, which could fail or query the wrong subscription. I changed the example to keep the tags from the original `Get-AzVM -Status` result and filter that collected data directly.
- The PowerShell VM tag checks could throw when a VM had no tags. I added null-safe tag checks in both VM examples.
- The Log Analytics cross-workspace KQL used `let workspace1 = workspace(...)` and then piped that variable into `Heartbeat`, which is not the documented cross-workspace syntax. I changed it to `workspace("...").Heartbeat` inside the `union`.
- The Azure Policy example used an incorrect built-in policy definition ID for "Require a tag on resources." I corrected it to `/providers/Microsoft.Authorization/policyDefinitions/871b6d14-10aa-478d-b590-94f262ecfa99`.
- The Azure Policy role guidance said a custom role with policy write permissions could be used in a Lighthouse delegation. Azure Lighthouse supports Azure built-in roles for delegated role assignments, not custom roles, so I changed this to refer to a supported built-in role such as Contributor.
- The Azure Automation runbook used the retired Azure Automation Run As account authentication pattern. I updated it to use managed identity authentication with `Connect-AzAccount -Identity`.
- The post used the older "Azure Security Center" heading and "Azure AD" wording. I updated these references to Microsoft Defender for Cloud and Microsoft Entra ID.

## Review Notes
The remaining Lighthouse, portal filtering, Azure Monitor, Azure Policy, Azure Resource Graph, and Defender for Cloud guidance aligns with current Microsoft documentation. Some portal behavior can vary by blade and by delegated role permissions, so operational examples still require the delegated scopes to include the relevant built-in RBAC permissions.
