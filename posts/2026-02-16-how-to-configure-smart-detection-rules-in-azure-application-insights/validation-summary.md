# Validation Summary: How to Configure Smart Detection Rules in Azure Application Insights

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Application Insights
- Azure Monitor Smart Detection
- Azure Monitor alert rules and action groups
- Azure Resource Manager templates
- Azure CLI generic resource commands

## Sources Consulted
- Microsoft Learn: Smart detection in Application Insights: https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/proactive-diagnostics
- Microsoft Learn: Smart detection - performance anomalies: https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/smart-detection-performance
- Microsoft Learn: Manage Application Insights smart detection rules by using Azure Resource Manager templates: https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/proactive-arm-config
- Microsoft Learn: Migrate Azure Monitor Application Insights smart detection to alerts: https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-smart-detections-migration
- Microsoft Learn: Azure CLI `az monitor app-insights component` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/app-insights/component
- Microsoft Learn: Azure CLI `az resource` reference: https://learn.microsoft.com/en-us/cli/azure/resource

## Issues Found
- Corrected the default notification roles from generic Reader, Contributor, and Owner roles to Monitoring Reader and Monitoring Contributor, matching Microsoft documentation.
- Removed the claim that legacy Smart Detection rule settings include suppression. Suppression is available through Azure Monitor alert processing rules after migration, not as a documented legacy Smart Detection rule setting.
- Replaced the ARM template snippet. The original used unsupported `RuleDefinitions`, uppercase property names, and an invalid standalone resource shape. The updated snippet uses the documented nested `ProactiveDetectionConfigs` resource with `enabled`, `sendEmailsToSubscriptionOwners`, and `customEmails`.
- Updated the Smart Detection internal rule-name list to include the documented security and daily data volume detector names.
- Replaced nonexistent `az monitor app-insights component proactive-detection` commands with generic `az resource show` and `az resource update` examples using the documented Smart Detection ARM resource path and API version.
- Corrected the migration description. Migrated detections become Azure Monitor smart detector alert rules, not standard alert rules backed by pre-configured Log Analytics queries.
- Corrected baseline timing. Failure Anomalies learns normal behavior in about 24 hours, while performance anomaly detection requires at least eight days of sufficient telemetry.
- Reworked the low-traffic seasonal scenario because Smart Detection documentation focuses on failure, performance, trace, exception, memory, security, and billing anomalies rather than generic traffic drops.
- Replaced the blanket "no real-time detection" limitation with a more precise distinction between near-real-time Failure Anomalies and daily performance anomaly analysis.

## Review Notes
Azure CLI was not installed in the local environment, so CLI verification was performed against Microsoft Learn's current Azure CLI reference rather than local `az --help` output.
