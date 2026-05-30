# Validation Summary: How to Troubleshoot Microsoft Entra Conditional Access Policy Conflicts

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Microsoft Entra ID
- Conditional Access
- Conditional Access What If tool
- Microsoft Graph API
- Microsoft Graph PowerShell
- Azure Monitor Log Analytics / KQL

## Sources Consulted
- Microsoft Learn: Troubleshoot Conditional Access Policies with the What If Tool: https://learn.microsoft.com/en-us/entra/identity/conditional-access/what-if-tool
- Microsoft Learn: Microsoft Graph What If evaluation API: https://learn.microsoft.com/en-us/graph/api/conditionalaccessroot-evaluate?view=graph-rest-1.0
- Microsoft Learn: Conditional Access grant controls: https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-grant
- Microsoft Learn: Analyze Conditional Access Policy Impact: https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-report-only
- Microsoft Learn: View applied Conditional Access details in Microsoft Entra activity logs: https://learn.microsoft.com/en-us/entra/identity/monitoring-health/how-to-view-applied-conditional-access-policies
- Microsoft Learn: appliedConditionalAccessPolicy resource type: https://learn.microsoft.com/en-us/graph/api/resources/appliedconditionalaccesspolicy?view=graph-rest-1.0
- Microsoft Learn: Azure Monitor SigninLogs table reference: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/signinlogs

## Issues Found
- The Microsoft Graph PowerShell sample used an outdated request shape with `conditionalAccessWhatIfSubject` and `conditionalAccessWhatIfConditions`, called the beta endpoint, and read results from `appliedPolicies`. Updated it to the current `v1.0` What If evaluation API using `signInIdentity`, `signInContext`, `signInConditions`, `appliedPoliciesOnly`, and response iteration through `value`.
- The Graph permissions example used broader permissions than necessary. Updated the sample to use `Policy.Read.ConditionalAccess`, the least privileged permission documented for the evaluation API.
- The portal navigation described the tool under Protection > Conditional Access. Updated it to the documented Microsoft Entra admin center path: Entra ID > Conditional Access > Policies > What If.
- The policy evaluation explanation implied every grant control from every matching policy must always be satisfied. Updated the wording to reflect that each matching policy's grant logic must be satisfied, because a policy can require all selected controls or one of the selected controls.
- The What If results description used "Result: Grant or Block". Updated it to describe grant controls, session controls, or block controls, matching the current What If report terminology.

## Review Notes
- The Log Analytics query uses the documented `SigninLogs` table and `ConditionalAccessPolicies` fields (`displayName`, `result`, and `enforcedGrantControls`). It is appropriate for finding failed Conditional Access policy results.
- The What If API currently expects enough sign-in parameters to evaluate configured conditions accurately. Future revisions could emphasize that missing details can cause a policy not to match in the API evaluation.
