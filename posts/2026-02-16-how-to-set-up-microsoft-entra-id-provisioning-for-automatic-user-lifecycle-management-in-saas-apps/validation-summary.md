# Validation Summary: How to Set Up Microsoft Entra ID Provisioning for Auto User Lifecycle Mgmt in

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Microsoft Entra ID
- Microsoft Entra application provisioning
- SCIM / SCIM 2.0
- Microsoft Graph PowerShell
- SaaS identity lifecycle management

## Sources Consulted
- Microsoft Learn: Understand how Application Provisioning in Microsoft Entra ID - https://learn.microsoft.com/en-us/entra/identity/app-provisioning/how-provisioning-works
- Microsoft Learn: User provisioning management for enterprise apps in Microsoft Entra ID - https://learn.microsoft.com/en-us/entra/identity/app-provisioning/configure-automatic-user-provisioning-portal
- Microsoft Learn: Tutorial - Customize Microsoft Entra attribute mappings in Application Provisioning - https://learn.microsoft.com/en-us/entra/identity/app-provisioning/customize-application-attributes
- Microsoft Learn: Reference for writing expressions for attribute mappings in Microsoft Entra ID - https://learn.microsoft.com/en-us/entra/identity/app-provisioning/functions-for-customizing-application-data
- Microsoft Learn: Scoping users or groups to be provisioned with scoping filters - https://learn.microsoft.com/en-us/entra/identity/app-provisioning/define-conditional-rules-for-provisioning-user-accounts
- Microsoft Learn: On-demand provisioning in Microsoft Entra ID - https://learn.microsoft.com/en-us/entra/identity/app-provisioning/provision-on-demand
- Microsoft Learn: Configure Salesforce for automatic user provisioning with Microsoft Entra ID - https://learn.microsoft.com/en-us/entra/identity/saas-apps/salesforce-provisioning-tutorial
- Microsoft Learn: Microsoft Graph applicationTemplate: instantiate - https://learn.microsoft.com/en-us/graph/api/applicationtemplate-instantiate
- Microsoft Learn: Microsoft Graph Start synchronizationJob - https://learn.microsoft.com/en-us/graph/api/synchronization-synchronizationjob-start
- Microsoft Learn: Microsoft Graph List provisioningObjectSummary - https://learn.microsoft.com/en-us/graph/api/provisioningobjectsummary-list
- Microsoft Learn: Microsoft Graph PowerShell New-MgServicePrincipalAppRoleAssignment - https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.applications/new-mgserviceprincipalapproleassignment
- RFC 7643: SCIM Core Schema - https://www.rfc-editor.org/rfc/rfc7643
- RFC 7644: SCIM Protocol - https://www.rfc-editor.org/rfc/rfc7644

## Issues Found
- The post described the default provisioning cycle as every 20-40 minutes. Microsoft documentation describes incremental cycles as approximately every 40 minutes. Updated both cycle references.
- The prerequisites implied every target SaaS application must support SCIM 2.0. Microsoft Entra gallery applications can use SCIM or app-specific provisioning APIs. Updated the prerequisite to distinguish SCIM-based setups from gallery connector behavior.
- The Salesforce credential example used a non-authoritative SCIM endpoint and Connected Apps OAuth-token flow. Microsoft's Salesforce provisioning tutorial uses Salesforce admin credentials, a security token, and an optional tenant URL for Salesforce Government Cloud. Replaced the generic credential instructions with SCIM-neutral wording and added a Salesforce-specific caveat.
- The expression example said it removed spaces but only joined and lowercased the values. Updated it to use `StripSpaces(...)` with `Join(...)` and `ToLower(...)`, matching Microsoft Entra expression functions.
- The group assignment PowerShell example passed `PrincipalType`, which Microsoft Graph marks as read-only for app role assignments. Removed that parameter and kept the required assignment fields.
- The deprovisioning section implied admins can freely choose disable or delete behavior for unassignment. Microsoft documentation says out-of-scope users are usually disabled or soft-deleted, while hard delete behavior depends on permanent deletion, Delete target object actions, target support, or gallery connector behavior. Updated this section accordingly.

## Review Notes
The post still uses some portal labels that include "Azure Active Directory" because those labels can appear in existing provisioning mapping templates. The title appears truncated after "in", but that is an editorial issue rather than a technical correctness issue.
