# Validation Summary: How to Prepare for SOC 2 Audits with Azure Compliance Manager

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Microsoft Purview Compliance Manager
- SOC 2 Trust Services Criteria
- Azure RBAC and custom roles
- Azure Monitor, Log Analytics, diagnostic settings, and scheduled query alerts
- Microsoft Defender for Cloud and Microsoft Defender for SQL
- Microsoft Sentinel
- Azure Policy
- Azure DevOps pipelines

## Sources Consulted
- Microsoft Purview Compliance Manager overview: https://learn.microsoft.com/en-us/purview/compliance-manager
- Microsoft Purview Compliance Manager setup: https://learn.microsoft.com/en-us/purview/compliance-manager-setup
- Microsoft Purview Compliance Manager scoring: https://learn.microsoft.com/en-us/purview/compliance-manager-scoring
- Microsoft Purview portal overview: https://learn.microsoft.com/en-us/purview/purview-compliance-portal
- Azure CLI `az monitor diagnostic-settings create`: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Azure CLI `az security pricing create`: https://learn.microsoft.com/en-us/cli/azure/security/pricing
- Azure SQL Vulnerability Assessment REST API: https://learn.microsoft.com/en-us/rest/api/sql/sql-vulnerability-assessments-settings/create-or-update
- Azure CLI `az sentinel onboarding-state create`: https://learn.microsoft.com/en-us/cli/azure/sentinel/onboarding-state
- Azure CLI `az sentinel alert-rule create`: https://learn.microsoft.com/en-us/cli/azure/sentinel/alert-rule
- Azure CLI `az monitor scheduled-query create`: https://learn.microsoft.com/en-us/cli/azure/monitor/scheduled-query
- Azure RBAC custom role creation with Azure CLI: https://learn.microsoft.com/en-us/azure/role-based-access-control/custom-roles-cli
- Azure Monitor Log Analytics access management: https://learn.microsoft.com/en-us/azure/azure-monitor/logs/manage-access
- Azure Monitor supported logs for Azure SQL Database: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-sql-servers-databases-logs
- Azure Monitor supported logs for App Service: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-web-sites-logs
- Azure App Service minimum TLS and Azure Policy guidance: https://learn.microsoft.com/en-us/azure/app-service/tls-minimum-version
- AICPA Trust Services Criteria document: https://us.aicpa.org/content/dam/aicpa/interestareas/frc/assuranceadvisoryservices/downloadabledocuments/trust-services-criteria-redlined.pdf

## Issues Found
- The post referred to "Azure Compliance Manager" as the product. Changed the title, description, heading, and first product reference to Microsoft Purview Compliance Manager, which is the current Microsoft product name.
- The getting-started instructions used `compliance.microsoft.com`. Updated this to `purview.microsoft.com`, matching the current Microsoft Purview portal guidance.
- The post said Compliance Manager divides SOC 2 requirements into only Microsoft-managed and customer-managed controls and stated Microsoft handles about 60% of controls. Updated this to include shared controls and removed the fixed percentage because Compliance Manager responsibility varies by template, services, licensing, and architecture.
- The custom RBAC role JSON omitted `IsCustom`, which Microsoft examples include for custom role definitions. Added `IsCustom: true`.
- The custom RBAC role used `Microsoft.Insights/logs/read`, which is not the current Log Analytics query permission. Replaced it with `Microsoft.OperationalInsights/workspaces/read` and `Microsoft.OperationalInsights/workspaces/query/read`.
- The SQL vulnerability assessment example used `az sql va baseline set`, which sets baselines and does not enable vulnerability assessment. Replaced it with a current `az rest` call to create or update SQL Vulnerability Assessment settings for an Azure SQL logical server.
- The Microsoft Sentinel onboarding command omitted the required onboarding state name. Added `--name default`.
- The Microsoft Sentinel alert-rule example used unsupported `--template-id` and `--enabled` flags. Replaced it with a scheduled-rule JSON payload passed to `--scheduled`.
- The Azure Policy examples claimed to enforce HTTPS and TLS while the referenced built-in policies are audit-oriented in the shown assignments. Changed the comments to say audit rather than enforce.
- The scheduled query alert example used an invalid condition/query pairing. Updated it to use a named query placeholder in both `--condition` and `--condition-query`.
- The Compliance Manager score explanation implied a numeric score directly proves audit readiness. Updated the language to clarify that the score is prioritization guidance, not a guarantee of compliance or audit readiness.

## Review Notes
The Azure CLI was not installed in the local workspace, so commands were checked against official Microsoft Learn CLI and REST API documentation rather than local `az --help` output.
