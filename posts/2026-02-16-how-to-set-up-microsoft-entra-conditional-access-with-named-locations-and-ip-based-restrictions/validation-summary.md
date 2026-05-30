# Validation Summary: How to Set Up Microsoft Entra Conditional Access with Named Locations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Entra ID Conditional Access
- Named locations
- Microsoft Graph API
- Microsoft Graph PowerShell SDK
- Azure CLI `az rest`
- Azure Monitor Log Analytics / KQL
- Microsoft Authenticator GPS-based country lookup
- Microsoft Entra Global Secure Access compliant network signal

## Sources Consulted
- Microsoft Learn: Conditional Access network assignment, https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-assignment-network
- Microsoft Learn: Create namedLocation - Microsoft Graph v1.0, https://learn.microsoft.com/en-us/graph/api/conditionalaccessroot-post-namedlocations?view=graph-rest-1.0
- Microsoft Learn: countryNamedLocation resource type - Microsoft Graph v1.0, https://learn.microsoft.com/en-us/graph/api/resources/countrynamedlocation?view=graph-rest-1.0
- Microsoft Learn: Create conditionalAccessPolicy - Microsoft Graph v1.0, https://learn.microsoft.com/en-us/graph/api/conditionalaccessroot-post-policies?view=graph-rest-1.0
- Microsoft Learn: conditionalAccessPolicy resource type - Microsoft Graph v1.0, https://learn.microsoft.com/en-us/graph/api/resources/conditionalaccesspolicy?view=graph-rest-1.0
- Microsoft Learn: conditionalAccessConditionSet resource type - Microsoft Graph v1.0, https://learn.microsoft.com/en-us/graph/api/resources/conditionalaccessconditionset?view=graph-rest-1.0
- Microsoft Learn: conditionalAccessGrantControls resource type - Microsoft Graph, https://learn.microsoft.com/en-us/graph/api/resources/conditionalaccessgrantcontrols
- Microsoft Learn: appliedConditionalAccessPolicy resource type - Microsoft Graph v1.0, https://learn.microsoft.com/en-us/graph/api/resources/appliedconditionalaccesspolicy?view=graph-rest-1.0
- Microsoft Learn: Authentication strengths API overview, https://learn.microsoft.com/en-us/graph/api/resources/authenticationstrengths-overview?view=graph-rest-1.0
- Microsoft Learn: List authenticationStrengthPolicies, https://learn.microsoft.com/en-us/graph/api/authenticationstrengthroot-list-policies?view=graph-rest-1.0
- Microsoft Learn: SigninLogs table reference, https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/signinlogs
- Microsoft Learn: Analyze Conditional Access policy impact, https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-report-only

## Issues Found
- Corrected the named location taxonomy. The post described GPS-based compliant network as a third named location type. Microsoft documents named locations as IP ranges or countries/regions; GPS is a country/region lookup method, while compliant network is a separate Global Secure Access signal.
- Corrected the Microsoft Entra admin center path for named locations to Entra ID > Conditional Access > Named locations.
- Added `Policy.Read.All` to the Microsoft Graph PowerShell connection scopes because the create namedLocation API lists it with `Policy.ReadWrite.ConditionalAccess` for delegated creation.
- Replaced the private `10.0.0.0/8` Azure CLI example with a documentation-range `/25` example because IP named locations require public IP ranges and only CIDR masks greater than `/8` are allowed.
- Added `ClientAppTypes = @("all")` to Conditional Access policy payloads because `clientAppTypes` is a required condition property in the Microsoft Graph conditionalAccessConditionSet resource and is included in Microsoft policy creation examples.
- Fixed the report-only update example to assign the created MFA policy result to `$createdMfaPolicy` before referencing its `Id`.
- Adjusted the report-only KQL counts to distinguish `reportOnlyInterrupted` MFA prompts from `reportOnlyFailure` non-interactive control failures.
- Added the missing `New-MgIdentityConditionalAccessPolicy` call after the authentication strength policy request body.
- Rewrote the new-country KQL query to use `LocationDetails.countryOrRegion` and a `leftanti` join. The original query compared `UserPrincipalName` to itself inside a subquery and would not correctly detect per-user new countries.
- Reworded the location-signal caveat to avoid implying that IP spoofing is a practical way to complete a Microsoft Entra sign-in; VPNs, proxies, and shared egress points are the relevant concern.

## Review Notes
The Graph PowerShell examples still use placeholder account IDs and documentation IP ranges, so readers must replace them with tenant-specific object IDs and real public egress ranges before use. Country blocking should still be tested in report-only mode because legitimate travel, unknown geolocation, and VPN/proxy egress can affect results.
