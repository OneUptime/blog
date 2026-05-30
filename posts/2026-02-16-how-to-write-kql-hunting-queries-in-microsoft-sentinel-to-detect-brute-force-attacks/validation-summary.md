# Validation Summary: Write KQL Hunting Queries in Microsoft Sentinel to Detect Brute Force Attacks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Sentinel
- Microsoft Entra ID sign-in logs
- Azure Monitor Log Analytics
- Kusto Query Language (KQL)
- Threat hunting
- Threat intelligence indicators

## Sources Consulted
- Microsoft Learn: Azure Monitor Logs reference - SigninLogs: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/signinlogs
- Microsoft Learn: Microsoft Entra security operations for user accounts: https://learn.microsoft.com/en-us/entra/architecture/security-operations-user-accounts/
- Microsoft Learn: Microsoft Entra authentication and authorization error codes: https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes
- Microsoft Learn: Azure Monitor Logs reference - ThreatIntelIndicators: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/threatintelindicators
- Microsoft Learn: Work with STIX objects and indicators in Microsoft Sentinel: https://learn.microsoft.com/en-us/azure/sentinel/work-with-stix-objects-indicators
- Microsoft Learn: Kusto make_set() aggregation function: https://learn.microsoft.com/en-us/kusto/query/make-set-aggregation-function
- Microsoft Learn: Kusto window functions: https://learn.microsoft.com/en-us/kusto/query/window-functions
- Microsoft Learn: Hunting capabilities in Microsoft Sentinel: https://learn.microsoft.com/en-us/azure/sentinel/hunting
- Microsoft Learn: Create scheduled analytics rules in Microsoft Sentinel: https://learn.microsoft.com/en-us/azure/sentinel/create-analytics-rules

## Issues Found
- Query 4 claimed to find successful sign-ins preceded by multiple failures, but the original query only joined all failures and successes for the same user within 24 hours. It could count failures that occurred after the successful sign-in. I changed the query to project individual failed events, join them to successful events, require `FailureTime < SuccessTime`, and summarize only failures before each success.
- Query 7 used the legacy `ThreatIntelligenceIndicator` table. Microsoft Sentinel introduced `ThreatIntelIndicators` and `ThreatIntelObjects` for STIX threat intelligence and documented that custom queries should migrate to the new tables. I updated the query to use `ThreatIntelIndicators`, filter active/unexpired indicators, and match brute-force source IPs against `ObservableValue`.

## Review Notes
The remaining KQL examples use current SigninLogs fields such as `TimeGenerated`, `ResultType`, `IPAddress`, `UserPrincipalName`, `AppDisplayName`, `DeviceDetail`, and `LocationDetails`, and the documented Microsoft Entra error codes are accurate for the scenarios described. The Sentinel portal experience is evolving: Microsoft documents that Sentinel is available in the Microsoft Defender portal and that Azure portal support ends after March 31, 2027, so future revisions may need navigation wording updates.
