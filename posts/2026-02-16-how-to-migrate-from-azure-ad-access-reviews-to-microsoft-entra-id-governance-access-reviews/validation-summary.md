# Validation Summary: How to Migrate from Azure AD Access Reviews to Microsoft Entra ID Governance

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Microsoft Entra ID Governance
- Microsoft Entra access reviews
- Microsoft Graph API
- Microsoft Graph PowerShell SDK
- PowerShell

## Sources Consulted
- Microsoft Graph accessReviewScheduleDefinition resource: https://learn.microsoft.com/en-us/graph/api/resources/accessreviewscheduledefinition?view=graph-rest-1.0
- Microsoft Graph accessReviewScheduleSettings resource: https://learn.microsoft.com/en-us/graph/api/resources/accessreviewschedulesettings?view=graph-rest-1.0
- Microsoft Graph accessReviewStageSettings resource: https://learn.microsoft.com/en-us/graph/api/resources/accessreviewstagesettings?view=graph-rest-1.0
- Microsoft Graph create access review definitions API: https://learn.microsoft.com/en-us/graph/api/accessreviewset-post-definitions?view=graph-rest-1.0
- Microsoft Graph access review scope configuration: https://learn.microsoft.com/en-us/graph/accessreviews-scope-concept
- Microsoft Graph accessReviewInactiveUsersQueryScope resource: https://learn.microsoft.com/en-us/graph/api/resources/accessreviewinactiveusersqueryscope?view=graph-rest-1.0
- Microsoft Graph PowerShell New-MgIdentityGovernanceAccessReviewDefinition: https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.identity.governance/new-mgidentitygovernanceaccessreviewdefinition?view=graph-powershell-1.0
- Microsoft Graph PowerShell Stop-MgIdentityGovernanceAccessReviewDefinition: https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.identity.governance/stop-mgidentitygovernanceaccessreviewdefinition?view=graph-powershell-1.0
- Microsoft Graph PowerShell Remove-MgIdentityGovernanceAccessReviewDefinition: https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.identity.governance/remove-mgidentitygovernanceaccessreviewdefinition?view=graph-powershell-1.0
- Microsoft Graph PowerShell Get-MgIdentityGovernanceAccessReviewDefinitionInstanceDecision: https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.identity.governance/get-mgidentitygovernanceaccessreviewdefinitioninstancedecision?view=graph-powershell-1.0
- Microsoft Entra access reviews overview and licensing notes: https://learn.microsoft.com/en-us/entra/id-governance/access-reviews-overview
- Microsoft Entra create access reviews guide: https://learn.microsoft.com/en-us/entra/id-governance/create-access-review
- Microsoft Entra manage access reviews guide: https://learn.microsoft.com/en-us/entra/id-governance/manage-access-review

## Issues Found
- Replaced claims about "ML recommendations" with Microsoft Entra's documented recommendation insights terminology and clarified that inactive-user recommendations are based on sign-in inactivity or supported activity signals, not arbitrary resource usage.
- Corrected licensing prerequisites. Microsoft Entra ID P2 or Microsoft Entra ID Governance can support access reviews, while inactive-user reviews, user-to-group affiliation recommendations, and multiple-resource reviews require Microsoft Entra ID Governance.
- Updated the role prerequisite to include resource-dependent roles such as Privileged Role Administrator.
- Corrected the portal navigation label from "Identity Governance" to "ID Governance" to match current Microsoft Entra admin center documentation.
- Replaced the invalid inventory display property `StartDate` with the documented `CreatedDateTime` property.
- Fixed the multi-stage Microsoft Graph example so stage-specific recommendation settings are set under `stageSettings`, removed settings that would be ignored when stages are defined, and added `decisionsThatWillMoveToNextStage = @("NotReviewed")` so only undecided items move to stage 2.
- Added `dayOfMonth` to `absoluteMonthly` recurrence patterns, which Microsoft Graph recurrence patterns require for monthly schedules.
- Corrected the inactive guest user review example to use the documented `instanceEnumerationScope` plus `accessReviewInactiveUsersQueryScope` pattern for Microsoft 365 groups.
- Added `-All` when listing decision items so the monitoring script counts all paged decisions.

## Review Notes
PowerShell syntax validation could not be run locally because `pwsh` is not installed in the environment. The cmdlets, parameters, and Microsoft Graph request body shapes were checked against official Microsoft documentation.
