# Validation Summary: How to Configure Microsoft Defender for SQL to Detect SQL Injection

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Microsoft Defender for SQL
- Microsoft Defender for Cloud
- Azure SQL Database
- SQL Server on Azure VMs
- Azure CLI
- SQL Vulnerability Assessment
- SQL Advanced Threat Protection
- Microsoft Sentinel
- Azure Logic Apps
- Azure SQL Auditing
- Kusto Query Language (KQL)

## Sources Consulted
- Microsoft Defender for SQL overview: https://learn.microsoft.com/en-us/azure/azure-sql/database/azure-defender-for-sql?view=azuresql
- Configure Advanced Threat Protection for Azure SQL Database: https://learn.microsoft.com/en-us/azure/azure-sql/database/threat-detection-configure?view=azuresql
- SQL Vulnerability Assessment for Azure SQL databases: https://learn.microsoft.com/en-us/azure/defender-for-cloud/sql-azure-vulnerability-assessment-overview
- SQL servers on machines vulnerability assessment: https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-sql-on-machines-vulnerability-assessment
- Azure CLI `az security pricing`: https://learn.microsoft.com/en-us/cli/azure/security/pricing?view=azure-cli-latest
- Azure CLI `az sql server advanced-threat-protection-setting`: https://learn.microsoft.com/en-us/cli/azure/sql/server/advanced-threat-protection-setting?view=azure-cli-latest
- Azure CLI `az security contact`: https://learn.microsoft.com/en-us/cli/azure/security/contact?view=azure-cli-latest
- Azure CLI `az security alert`: https://learn.microsoft.com/en-us/cli/azure/security/alert?view=azure-cli-latest
- Azure CLI `az security alerts-suppression-rule`: https://learn.microsoft.com/en-us/cli/azure/security/alerts-suppression-rule?view=azure-cli-latest
- Azure CLI `az sql server audit-policy`: https://learn.microsoft.com/en-us/cli/azure/sql/server/audit-policy?view=azure-cli-latest
- Azure CLI `az sentinel data-connector`: https://learn.microsoft.com/en-us/cli/azure/sentinel/data-connector?view=azure-cli-latest
- Azure CLI `az sql vm`: https://learn.microsoft.com/en-us/cli/azure/sql/vm?view=azure-cli-latest
- Microsoft Defender for Cloud pricing: https://azure.microsoft.com/en-us/pricing/details/defender-for-cloud/
- Microsoft Sentinel data connector REST reference: https://learn.microsoft.com/en-us/rest/api/securityinsights/data-connectors/create-or-update?view=rest-securityinsights-2025-06-01

## Issues Found
- The post described Defender for SQL as detecting broad "data exfiltration indicators" and unsafe `OPENROWSET` usage. I narrowed this to suspicious database activity and suspicious shell or OS command activity, matching documented alert categories more closely.
- The resource-level Defender for SQL CLI examples used `--server-name`; current Azure CLI documentation for `az sql server advanced-threat-protection-setting` uses `--name`. I corrected both examples and removed the unsupported `creationTime` query field.
- The vulnerability assessment example used the retired/non-current `az sql server va-setting` command group and required a storage account as the default setup. I updated the section to describe the current recommended express configuration and pointed classic storage-account configuration to portal, PowerShell, or REST API paths.
- The alert notification example used the old `az sql server threat-policy` command group. I replaced it with current Defender for Cloud security contact configuration using `az security contact create`.
- The Logic App automation text claimed Azure SQL has a firewall deny list. Azure SQL firewall rules are allow rules, so I changed the response guidance to remove risky allow rules or block traffic upstream.
- The Microsoft Sentinel connector example used `--kind AzureSecurityCenter`, which is not part of the current `az sentinel data-connector create` syntax. I replaced it with the current `--azure-security-center` argument shape.
- The alert suppression example used a nonexistent `create` subcommand and `--expiration-date`. Current Azure CLI uses `update` to create or update suppression rules and `--expiration-date-utc`; I corrected the command.
- The SQL auditing example used `--server-name`; current CLI docs use `--name`. I corrected the flag.
- The SQL VM registration example used deprecated `--sql-mgmt-type Full`. I removed the deprecated argument.
- The post stated Defender for SQL on Azure VMs has the same detection capabilities as Azure SQL Database. I changed this to explain that the plans overlap but exact detections and prerequisites differ by environment and extension configuration.
- The cost section gave a fixed approximate 2026 price. Because Defender for Cloud pricing varies by resource type, region, and agreement, I changed it to refer to the official pricing page.

## Review Notes
The Azure CLI was not installed in the local environment, so command validation was performed against current Microsoft Learn CLI reference pages rather than local `az --help` output. The Logic App JSON remains a simplified workflow fragment, not a complete deployable workflow definition.
