# Validation Summary: How to Create Microsoft Sentinel Automation Rules to Auto-Assign

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Sentinel
- Microsoft Sentinel automation rules
- Azure Resource Manager templates
- Azure PowerShell
- Microsoft Entra ID
- Azure Logic Apps playbooks

## Sources Consulted
- Microsoft Learn: Automate threat response in Microsoft Sentinel with automation rules - https://learn.microsoft.com/en-us/azure/sentinel/automate-incident-handling-with-automation-rules
- Microsoft Learn: Create and use Microsoft Sentinel automation rules to manage response - https://learn.microsoft.com/en-us/azure/sentinel/create-manage-use-automation-rules
- Microsoft Learn: Microsoft.SecurityInsights/automationRules ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.securityinsights/automationrules
- Microsoft Learn: Microsoft Sentinel service limits - https://learn.microsoft.com/en-us/azure/sentinel/sentinel-service-limits
- Microsoft Learn: New-AzSentinelAutomationRule command reference - https://learn.microsoft.com/en-us/powershell/module/az.securityinsights/new-azsentinelautomationrule
- Microsoft Learn: New-AzResource command reference - https://learn.microsoft.com/en-us/powershell/module/az.resources/new-azresource
- Microsoft Learn: ARM template syntax and comments - https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/syntax

## Issues Found
- Corrected the automation-rule/playbook execution explanation. Current Microsoft documentation describes automation rules and their actions, including Run playbook actions, as ordered and sequential rather than a blanket "automation rules run first, then playbook triggers fire" pipeline.
- Updated Azure AD terminology to Microsoft Entra object IDs.
- Updated the ARM automation rule example to use the current `2025-09-01` API version, include workspace extension-resource scope, and use the full Microsoft Sentinel analytics rule resource ID under the Log Analytics workspace.
- Added `ownerType` to the owner assignment example so API-based user and group assignment is explicit.
- Replaced the PowerShell example because the original used non-existent `New-AzSentinelAutomationRule` parameters such as `-TriggerOn` and `-TriggerWhen`. The corrected script uses `New-AzResource` with the documented automation rule ARM resource shape.
- Corrected the close classification reason from an unsupported `ConfirmedBenign` value to the supported `SuspiciousButExpected` value.
- Corrected the service-limit note from "20 rules per workspace" to "20 actions per automation rule." Microsoft Sentinel supports up to 512 automation rules and 20 automation rule actions.

## Review Notes
Microsoft documentation notes that after March 31, 2027, Microsoft Sentinel will no longer be supported in the Azure portal and will be available only in the Microsoft Defender portal. The article is still technically valid today, but a future update should adjust the portal navigation language before or by that date.
