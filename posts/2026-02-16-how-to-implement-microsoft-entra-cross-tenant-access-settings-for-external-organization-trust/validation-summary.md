# Validation Summary: How to Use Microsoft Entra Cross-Tenant Access Settings

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Entra ID
- Microsoft Entra External ID
- Cross-tenant access settings
- B2B collaboration
- B2B direct connect
- Microsoft Graph PowerShell
- Azure Monitor / KQL sign-in logs

## Sources Consulted
- Microsoft Learn: Manage cross-tenant access settings for B2B collaboration - https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-settings-b2b-collaboration
- Microsoft Learn: Set up B2B direct connect with an external organization - https://learn.microsoft.com/en-us/entra/external-id/cross-tenant-access-settings-b2b-direct-connect
- Microsoft Learn: Cross-tenant access settings API overview - https://learn.microsoft.com/en-us/graph/api/resources/crosstenantaccesspolicy-overview
- Microsoft Learn: New-MgPolicyCrossTenantAccessPolicyPartner - https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.identity.signins/new-mgpolicycrosstenantaccesspolicypartner
- Microsoft Learn: Update-MgPolicyCrossTenantAccessPolicyPartner - https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.identity.signins/update-mgpolicycrosstenantaccesspolicypartner
- Microsoft Learn: Update-MgPolicyCrossTenantAccessPolicyDefault - https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.identity.signins/update-mgpolicycrosstenantaccesspolicydefault
- Microsoft Learn: SigninLogs table reference - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/signinlogs

## Issues Found
- The B2B direct connect sample used `00000003-0000-0ff1-ce00-000000000000` as the target for the Teams / Office 365 application. Microsoft Graph cross-tenant access examples and target documentation use `Office365` for the Office 365 suite target, which includes Teams. Updated both inbound and outbound B2B direct connect application targets to `Office365` and adjusted the comment accordingly.

## Review Notes
The remaining Microsoft Graph PowerShell cmdlets, permission scope, cross-tenant access concepts, trust settings, automatic redemption behavior, and SigninLogs KQL fields align with current Microsoft documentation. The post intentionally uses placeholder tenant, group, and application IDs; those must be replaced with real IDs before execution.
