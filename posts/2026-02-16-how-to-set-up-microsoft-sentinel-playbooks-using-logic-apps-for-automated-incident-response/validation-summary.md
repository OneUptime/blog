# Validation Summary: How to Set Up Microsoft Sentinel Playbooks Using Logic Apps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Sentinel
- Azure Logic Apps
- Sentinel playbooks and automation rules
- Microsoft Sentinel Logic Apps connector
- Microsoft Graph
- Microsoft Graph PowerShell SDK
- Azure PowerShell
- Azure Network Security Groups
- Azure Automation runbooks
- AbuseIPDB API

## Sources Consulted
- Microsoft Learn: Automate threat response with playbooks in Microsoft Sentinel - https://learn.microsoft.com/en-us/azure/sentinel/automation/automate-responses-with-playbooks
- Microsoft Learn: Create and manage Microsoft Sentinel playbooks - https://learn.microsoft.com/en-us/azure/sentinel/automation/create-playbooks
- Microsoft Learn: Supported triggers and actions in Microsoft Sentinel playbooks - https://learn.microsoft.com/en-us/azure/sentinel/automation/playbook-triggers-actions
- Microsoft Learn: Microsoft Sentinel connector for Azure Logic Apps - https://learn.microsoft.com/en-us/connectors/azuresentinel/
- Microsoft Learn: Automate threat response in Microsoft Sentinel with automation rules - https://learn.microsoft.com/en-us/azure/sentinel/automate-incident-handling-with-automation-rules
- Microsoft Learn: Extract incident entities with non-native actions - https://learn.microsoft.com/en-us/azure/sentinel/tutorial-extract-incident-entities
- Microsoft Learn: Microsoft Sentinel entity types reference - https://learn.microsoft.com/en-us/azure/sentinel/entities-reference
- Microsoft Learn: Authenticate workflow connections with managed identities in Azure Logic Apps - https://learn.microsoft.com/en-us/azure/logic-apps/create-managed-service-identity
- Microsoft Learn: Azure Logic Apps workflow actions and triggers schema - https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-workflow-actions-triggers
- Microsoft Learn: Update user with Microsoft Graph - https://learn.microsoft.com/en-us/graph/api/user-update
- Microsoft Learn: New-MgServicePrincipalAppRoleAssignment - https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.applications/new-mgserviceprincipalapproleassignment
- Microsoft Learn: Add-AzNetworkSecurityRuleConfig - https://learn.microsoft.com/en-us/powershell/module/az.network/add-aznetworksecurityruleconfig
- Microsoft Learn: Set-AzNetworkSecurityRuleConfig - https://learn.microsoft.com/en-us/powershell/module/az.network/set-aznetworksecurityruleconfig

## Issues Found
- The notification example used `join()` directly on the incident `relatedEntities` array. Logic Apps `join()` expects an array of values suitable for joining, while Sentinel entities are JSON objects. Changed the expression to stringify the entity array instead.
- The account-disable workflow parsed raw entities directly and referenced lower-case nested properties such as `properties.aadUserId`. The supported Sentinel connector action for this case is "Entities - Get Accounts", and its account output exposes fields such as `AadUserId` and `Name`. Updated the workflow fragment and designer steps accordingly.
- The Microsoft Graph HTTP action did not include a Graph audience for managed identity authentication or a JSON content type. Added `audience: https://graph.microsoft.com` and the `Content-Type` header.
- The incident comment action fragment was incomplete. Added the Sentinel connector host, POST method, and current `/incident-comments` connector path.
- The post said the managed identity needs `User.ReadWrite.All` to disable users. Microsoft Graph documents `User.EnableDisableAccount.All` plus `User.Read.All` as the least-privileged application permission combination for updating `accountEnabled`. Updated the explanation and PowerShell app-role assignment example.
- The IP enrichment example referenced lower-case nested entity properties. Updated it to use the `Address` field returned by the Sentinel "Entities - Get IPs" action.
- The automation-rule section did not mention the separate permission model used when Sentinel starts playbooks from automation rules. Added a note that Sentinel's service account needs permission to the playbook resource group.

## Review Notes
Microsoft documentation notes that Microsoft Sentinel in the Azure portal will be retired after March 31, 2027, with Microsoft Sentinel available in the Microsoft Defender portal after that date. The post is still valid on 2026-05-30, but portal navigation may need future updates before or after that transition.
