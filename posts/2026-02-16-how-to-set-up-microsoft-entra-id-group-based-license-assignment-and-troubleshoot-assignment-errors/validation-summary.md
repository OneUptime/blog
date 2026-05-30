# Validation Summary: How to Set Up Microsoft Entra ID Group-Based License Assignment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Entra ID
- Microsoft 365 group-based licensing
- Microsoft Graph PowerShell SDK
- Microsoft 365 admin center license management
- Dynamic groups
- Azure Automation runbooks

## Sources Consulted
- Microsoft Learn: What is group-based licensing? - https://learn.microsoft.com/en-us/entra/fundamentals/concept-group-based-licensing
- Microsoft Learn: Assign or unassign licenses to a group in the Microsoft 365 admin center - https://learn.microsoft.com/en-us/microsoft-365/admin/manage/manage-group-licenses
- Microsoft Learn: Assign licenses to users by group membership in the Microsoft 365 admin center - https://learn.microsoft.com/en-us/entra/identity/users/licensing-admin-center
- Microsoft Learn: PowerShell examples for group-based licensing - https://learn.microsoft.com/en-us/entra/identity/users/licensing-powershell-graph-examples
- Microsoft Learn: Resolve group license assignment problems - https://learn.microsoft.com/en-us/entra/fundamentals/licensing-groups-resolve-problems
- Microsoft Learn: Set-MgGroupLicense - https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.groups/set-mggrouplicense
- Microsoft Learn: Get-MgGroupMemberWithLicenseError - https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.groups/get-mggroupmemberwithlicenseerror
- Microsoft Learn: licenseAssignmentState resource type - https://learn.microsoft.com/en-us/graph/api/resources/licenseassignmentstate
- Microsoft Learn: List groups - https://learn.microsoft.com/en-us/graph/api/group-list
- Microsoft Learn: Add members - https://learn.microsoft.com/en-us/graph/api/group-post-members
- Microsoft Learn: New-MgGroup - https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.groups/new-mggroup

## Issues Found
- The prerequisite role list omitted Groups Administrator. Updated the role wording to include group and license management roles documented by Microsoft.
- The troubleshooting snippet used `Get-MgGroupLicenseProcessingState`, which is not a current Microsoft Graph PowerShell cmdlet. Replaced it with `Get-MgGroupMemberWithLicenseError` and `licenseAssignmentStates`, matching Microsoft Graph PowerShell documentation.
- The "Not enough licenses" section used the informal `NotEnoughLicenses` label. Updated the Graph-facing error reference to `CountViolation`.
- The conflicting service plans section described the issue as simple service-plan overlap. Updated it to describe mutually exclusive service plans and the `MutuallyExclusiveViolation` error.
- The usage-location section implied that a missing user usage location always blocks group-based licensing. Updated it to note tenant-location inheritance for group-based licensing and the `ProhibitedInUsageLocationViolation` error for unsupported locations.
- The monitoring snippets reported any non-active license state for a user, even if it came from a different group or direct license assignment. Updated the scripts to filter by `AssignedByGroup`.

## Review Notes
The Microsoft Entra and Azure portal UIs no longer manage license assignments as of September 1, 2024; Microsoft now directs admins to the Microsoft 365 admin center for UI-based assignment. The post's PowerShell workflow remains supported.
