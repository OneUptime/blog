# Validation Summary: Create Microsoft Sentinel Analytics Rules to Detect Suspicious Sign-In Patterns

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Sentinel
- Microsoft Entra ID sign-in logs
- Azure Monitor Log Analytics
- Kusto Query Language (KQL)
- Sentinel scheduled analytics rules
- Sentinel entity mapping and alert grouping

## Sources Consulted
- Microsoft Learn: Create a scheduled analytics rule from scratch - https://learn.microsoft.com/en-us/azure/sentinel/create-analytics-rules
- Microsoft Learn: Scheduled analytics rules in Microsoft Sentinel - https://learn.microsoft.com/en-us/azure/sentinel/scheduled-rules-overview
- Microsoft Learn: Azure Monitor Logs reference - SigninLogs - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/signinlogs
- Microsoft Learn: Map data fields to Microsoft Sentinel entities - https://learn.microsoft.com/en-us/azure/sentinel/map-data-fields-to-entities
- Microsoft Learn: Microsoft Sentinel entity types reference - https://learn.microsoft.com/en-us/azure/sentinel/entities-reference
- Microsoft Learn: Kusto scalar functions - https://learn.microsoft.com/en-us/kusto/query/scalar-functions
- Microsoft Learn: Kusto window functions overview - https://learn.microsoft.com/en-us/kusto/query/window-functions
- Microsoft Learn: Kusto dayofweek() - https://learn.microsoft.com/en-us/kusto/query/day-of-week-function
- Microsoft Learn: Kusto datetime_utc_to_local() - https://learn.microsoft.com/en-us/kusto/query/datetime-utc-to-local-function
- Microsoft Learn: Kusto make_set() - https://learn.microsoft.com/en-us/kusto/query/make-set-aggregation-function
- Microsoft Learn: Microsoft Entra authentication and authorization error codes - https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes

## Issues Found
- The diagram implied scheduled query rules run only every 5-60 minutes. Microsoft documents the allowed query interval and lookback range as 5 minutes to 14 days, so the diagram label was changed to "Runs on configured interval."
- The prerequisites listed "Security Contributor or Sentinel Contributor role." Microsoft documents Microsoft Sentinel Contributor, or equivalent write permissions on the Log Analytics workspace and resource group, as the requirement for creating scheduled analytics rules. The prerequisite was corrected.
- The entity mapping examples mapped directly to entity types without naming the required identifiers. The post now specifies mapping `UserPrincipalName` to Account `FullName` or splitting UPN into `Name` and `UPNSuffix`, mapping IP values to IP `Address`, and mapping host values to Host `HostName`.
- The failed sign-in query labeled `ResultType == "50126"` as "Bad password." Microsoft documents AADSTS50126 as invalid username or password, so the comment was corrected.

## Review Notes
The KQL examples use current Kusto functions and SigninLogs fields documented for Azure Monitor and Microsoft Sentinel. Thresholds, severity choices, and grouping windows are environment-dependent and should be tuned before production use.
