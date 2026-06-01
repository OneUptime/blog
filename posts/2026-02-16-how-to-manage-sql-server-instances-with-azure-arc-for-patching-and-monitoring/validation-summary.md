# Validation Summary: How to Manage SQL Server Instances with Azure Arc for Patching and Monitoring

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Azure Arc-enabled SQL Server
- Azure Connected Machine agent and Azure Extension for SQL Server
- Azure Policy
- Microsoft Defender for SQL Servers on Machines
- Azure Monitor and Log Analytics
- Azure Resource Graph
- Azure CLI

## Sources Consulted
- Microsoft Learn: SQL Server enabled by Azure Arc overview - https://learn.microsoft.com/en-us/sql/sql-server/azure-arc/overview
- Microsoft Learn: Prerequisites for SQL Server enabled by Azure Arc - https://learn.microsoft.com/en-us/sql/sql-server/azure-arc/prerequisites
- Microsoft Learn: Configure SQL Server enabled by Azure Arc - https://learn.microsoft.com/en-us/sql/sql-server/azure-arc/manage-configuration
- Microsoft Learn: Manage automatic connection for SQL Server enabled by Azure Arc - https://learn.microsoft.com/en-us/sql/sql-server/azure-arc/manage-autodeploy
- Microsoft Learn: Configure best practices assessment for SQL Server enabled by Azure Arc - https://learn.microsoft.com/en-us/sql/sql-server/azure-arc/assess
- Microsoft Learn: Monitor SQL Server enabled by Azure Arc - https://learn.microsoft.com/en-us/sql/sql-server/azure-arc/sql-monitoring
- Microsoft Learn: Configure automatic updates for SQL Server enabled by Azure Arc - https://learn.microsoft.com/en-us/sql/sql-server/azure-arc/update
- Microsoft Learn: Protect SQL Server with Microsoft Defender for Cloud - https://learn.microsoft.com/en-us/sql/sql-server/azure-arc/configure-advanced-data-security
- Microsoft Learn: Enable Defender for SQL Servers on Machines - https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-sql-usage
- Microsoft Learn Azure CLI reference: az policy assignment - https://learn.microsoft.com/en-us/cli/azure/policy/assignment
- Microsoft Learn Azure CLI reference: az monitor scheduled-query - https://learn.microsoft.com/en-us/cli/azure/monitor/scheduled-query
- Microsoft Learn Azure CLI reference: az security pricing - https://learn.microsoft.com/en-us/cli/azure/security/pricing

## Issues Found
- The post used "Azure Defender for SQL" as the main current name and implied broad on-premises coverage. Updated this to Microsoft Defender for SQL Servers on Machines and noted the Windows-machine support boundary.
- The prerequisites omitted that SQL Server enabled by Azure Arc supports only 64-bit SQL Server versions. Added that qualifier.
- The Azure Policy example used a hard-coded policy GUID that could not be verified against official documentation. Replaced it with a CLI lookup by built-in policy display name and added `--identity-scope`, which Azure CLI documents for assignments that grant a managed identity a role.
- The best practices assessment section used a non-existent `az sql server-arc extension set` command and unverified extension settings. Replaced it with the documented Log Analytics workspace prerequisite and portal enablement flow.
- The monitoring section configured monitoring through SQL Server extension settings, but current documentation enables/disables Arc SQL performance metric collection on the `Microsoft.AzureArcData/SqlServerInstances` resource. Updated the CLI example to use `az resource update` with `properties.monitoring.enabled=true` and the documented preview API version.
- The post described Arc SQL performance dashboard data as normal Azure Monitor metrics and used an invalid `az monitor metrics alert create` condition against a HybridCompute machine. Replaced this with a Log Analytics scheduled-query alert example for environments that separately collect SQL counters through Azure Monitor Agent and data collection rules.
- The automated patching section overstated the feature as general SQL Server patch deployment from Azure and included unverified extension settings. Reworded it to "automatic updates," clarified that it configures Windows Update and Microsoft Update for Important or Critical updates on supported Windows hosts, and replaced the unsupported CLI snippet with the documented portal flow.
- The portal section listed generic "Backups" status and history. Changed this to automated backups configuration and history when the feature is enabled.

## Review Notes
Several Azure Arc SQL features are license-, OS-, and preview-dependent. Performance monitoring is currently documented as a preview Azure portal performance dashboard feature, not as a general-purpose Azure Monitor metric namespace for direct metric alerts.
