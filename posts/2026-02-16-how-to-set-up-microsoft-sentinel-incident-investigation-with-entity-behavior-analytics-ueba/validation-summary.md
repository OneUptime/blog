# Validation Summary: How to Set Up Microsoft Sentinel Incident Investigation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Microsoft Sentinel
- User and Entity Behavior Analytics (UEBA)
- Azure REST API / Azure CLI
- Log Analytics
- Kusto Query Language (KQL)
- Microsoft Entra ID
- Azure Monitor Agent / Security Events

## Sources Consulted
- Microsoft Learn: Enable User and Entity Behavior Analytics (UEBA) in Microsoft Sentinel - https://learn.microsoft.com/en-us/azure/sentinel/enable-entity-behavior-analytics
- Microsoft Learn: Advanced threat detection with User and Entity Behavior Analytics (UEBA) in Microsoft Sentinel - https://learn.microsoft.com/en-us/azure/sentinel/identify-threats-with-entity-behavior-analytics
- Microsoft Learn: Microsoft Sentinel User and Entity Behavior Analytics (UEBA) data sources and schema enrichments - https://learn.microsoft.com/en-us/azure/sentinel/ueba-reference
- Microsoft Learn: Product Settings - Update, Azure Sentinel REST API - https://learn.microsoft.com/en-us/rest/api/securityinsights/product-settings/update
- Microsoft Learn: Azure Monitor Logs reference - BehaviorAnalytics - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/behavioranalytics
- Microsoft Learn: Azure Monitor Logs reference - UserAccessAnalytics - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/useraccessanalytics
- Microsoft Learn: Azure CLI `az sentinel data-connector` reference - https://learn.microsoft.com/en-us/cli/azure/sentinel/data-connector
- Microsoft Learn: Microsoft Sentinel incident investigation in the Azure portal - https://learn.microsoft.com/en-us/azure/sentinel/incident-investigation
- Microsoft Learn: Keep track of data during hunting with Microsoft Sentinel - https://learn.microsoft.com/en-us/azure/sentinel/bookmarks

## Issues Found
- The REST API example only updated `EntityAnalytics`, which syncs identity providers, and did not configure the `Ueba` data-source setting. Updated the example to use the current Product Settings API shape and added a second `settings/Ueba` request with supported data source values.
- The baseline learning period was stated as a fixed 14-21 days. Updated this to reflect Microsoft guidance that analysts can start looking after about a week, while baseline windows vary by enrichment and anomaly model.
- The UEBA table list omitted the current `Anomalies` table and optional UEBA behaviors-layer tables, while describing `UserAccessAnalytics` as if it were a current anomaly/access-pattern table. Updated the table list to match current Microsoft documentation.
- The sample KQL filtered `ActivityInsights has "True"`, which is too broad and not a reliable anomaly filter. Replaced it with `InvestigationPriority > 0`.
- The sign-in correlation query joined `BehaviorAnalytics` to `SigninLogs` by exact timestamp equality, which is unlikely to match real data. Changed it to join by user and correlate events within a 15-minute window around the UEBA anomaly.
- The detailed KQL query projected `DevicesInsight`, but the documented column is `DevicesInsights`. Corrected the field name.
- The bookmarks section implied that UEBA anomalies can be bookmarked directly from the investigation graph. Updated it to describe the supported workflow of creating bookmarks from Hunting or Logs results and adding them to incidents.

## Review Notes
The Azure CLI command shape for `az sentinel data-connector list` is correct, but the local environment did not have Azure CLI installed, so it was verified against the official Azure CLI reference instead of local `--help`. Microsoft Sentinel support in the Azure portal is scheduled to end after March 31, 2027; the post remains valid on the review date, 2026-05-30.
