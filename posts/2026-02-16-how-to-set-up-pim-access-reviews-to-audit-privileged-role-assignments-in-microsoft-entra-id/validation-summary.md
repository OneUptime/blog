# Validation Summary: How to Set Up PIM Access Reviews to Audit Privileged Role Assignments

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Microsoft Entra ID
- Microsoft Entra Privileged Identity Management
- Microsoft Entra access reviews
- Microsoft Graph PowerShell
- Azure resource roles

## Sources Consulted
- Microsoft Learn: Create an access review of Azure resource and Microsoft Entra roles in PIM: https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-create-roles-and-resource-roles-review
- Microsoft Learn: Perform an access review of Azure resource and Microsoft Entra roles in PIM: https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-perform-roles-and-resource-roles-review
- Microsoft Learn: Complete an access review of Azure resource and Microsoft Entra roles in PIM: https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-complete-roles-and-resource-roles-review
- Microsoft Graph docs: Configure access review scope by using Microsoft Graph APIs: https://learn.microsoft.com/en-us/graph/accessreviews-scope-concept
- Microsoft Graph tutorial: Review access to administrative roles using access reviews APIs: https://learn.microsoft.com/en-us/graph/tutorial-accessreviews-roleassignments
- Microsoft Graph PowerShell: New-MgIdentityGovernanceAccessReviewDefinition: https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.identity.governance/new-mgidentitygovernanceaccessreviewdefinition
- Microsoft Graph PowerShell: Add-MgIdentityGovernanceAccessReviewDefinitionInstanceDecision: https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.identity.governance/add-mgidentitygovernanceaccessreviewdefinitioninstancedecision
- Microsoft Learn: Privileged Identity Management APIs: https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-apis

## Issues Found
- The prerequisites listed only Microsoft Entra ID P2 and directory administrator roles. Updated them to include Microsoft Entra ID Governance licensing and the Azure resource role permissions required for Azure resource access reviews.
- The portal navigation described access reviews under the general Identity Governance > Access Reviews blade. Updated it to the PIM-specific Microsoft Entra roles access review path documented by Microsoft.
- The Graph PowerShell example queried `roleAssignmentScheduleInstances` while claiming to review eligible assignments. Changed it to `roleEligibilityScheduleInstances` with `$expand=principal` and a user principal filter, matching Microsoft Graph access review scope examples for eligible directory role assignments.
- The reviewer query used an unbraced placeholder path. Changed it to `/users/{security-admin-user-id}` to make the placeholder format explicit.
- The post stated that justification is required for approval or denial. The Graph setting is `justificationRequiredOnApproval`, so the text now says the setting requires justification when approving access.
- The reviewer workflow sent reviewers to `myaccess.microsoft.com`. Updated the fallback navigation to the documented Microsoft Entra admin center PIM Review access path.
- The result-processing script used `$instances[0]` as the most recent instance without sorting. Added sorting by `StartDateTime` before selecting the latest instance.
- The manual apply cmdlet was incorrect. Replaced `Invoke-MgApplyIdentityGovernanceAccessReviewDefinitionInstanceDecision` with the documented `Add-MgIdentityGovernanceAccessReviewDefinitionInstanceDecision` cmdlet.
- The Azure resource role Graph PowerShell example used Microsoft Graph directory-role endpoints for Azure resource roles. Replaced it with portal-based Azure resource review steps and clarified that Azure resource role PIM APIs are Azure Resource Manager based, not Microsoft Graph `/roleManagement/directory` based.

## Review Notes
The remaining Microsoft Graph examples are illustrative and use placeholder IDs. They should be tested in a tenant with the required licenses, roles, and Microsoft Graph PowerShell module before production use.
