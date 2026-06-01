# Validation Summary: How to Set Up a Self-Hosted Integration Runtime in Azure Data Factory

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Data Factory
- Self-hosted integration runtime
- Azure CLI datafactory extension
- SQL Server linked services
- Windows authentication
- Azure networking and firewall configuration
- Microsoft Integration Runtime Configuration Manager

## Sources Consulted
- Microsoft Learn: Create a self-hosted integration runtime - https://learn.microsoft.com/en-us/azure/data-factory/create-self-hosted-integration-runtime
- Microsoft Learn: Azure CLI `az datafactory integration-runtime self-hosted` - https://learn.microsoft.com/en-us/cli/azure/datafactory/integration-runtime/self-hosted
- Microsoft Learn: Azure CLI `az datafactory integration-runtime` - https://learn.microsoft.com/en-us/cli/azure/datafactory/integration-runtime
- Microsoft Learn: Copy and transform data to and from SQL Server - https://learn.microsoft.com/en-us/azure/data-factory/connector-sql-server
- Microsoft Learn: Monitor integration runtime in Azure Data Factory - https://learn.microsoft.com/en-us/azure/data-factory/monitor-integration-runtime
- Microsoft Learn: Self-hosted integration runtime diagnostic tool - https://learn.microsoft.com/en-us/azure/data-factory/self-hosted-integration-runtime-diagnostic-tool
- Microsoft Learn: Self-hosted integration runtime auto-update and expiration notification - https://learn.microsoft.com/en-us/azure/data-factory/self-hosted-integration-runtime-auto-update

## Issues Found
- The Azure CLI command for creating a self-hosted integration runtime used the wrong command form (`az datafactory integration-runtime create --type SelfHosted`). Changed it to the current `az datafactory integration-runtime self-hosted create` command.
- The SQL Server linked-service snippets used comments inside `json` code blocks, which made them invalid JSON. Removed the comments.
- The SQL Server linked-service snippets used the older `connectionString` shape for the main examples. Updated them to the current recommended SQL Server connector properties: `server`, `database`, `encrypt`, `trustServerCertificate`, and `authenticationType`.
- The Windows authentication example used `Integrated Security=True` in the connection string. Updated it to the current recommended `authenticationType: "Windows"` pattern with domain credentials.
- The network requirements table was too narrow and listed only generic HTTPS traffic. Expanded it to include the documented Data Factory endpoint, Azure Relay endpoint, update endpoint, and common optional endpoints for Key Vault and staged copy.
- The article stated that no inbound ports are required without qualification. Clarified that Azure does not initiate inbound corporate firewall connections to the IR machine, but local Windows Firewall access such as port 8060 can be needed for remote intranet access, credential management, or high availability scenarios.
- The high-availability steps omitted the documented prerequisite to enable **Remote access to intranet** before adding another node. Added that step.
- The performance tuning section said to adjust resource limits on the Diagnostics tab. Replaced it with the documented concurrent job limit setting under the self-hosted IR node settings.
- The auto-update section said auto-update keeps the IR on the latest version and cited a default 2 AM window. Updated it to reflect Microsoft-managed auto-update versions, which can lag behind the latest manually downloadable version.

## Review Notes
The post is technically relevant and remains a valid tutorial after the corrections. The Azure CLI was not available locally, so command validation was performed against official Microsoft Learn CLI reference pages rather than local `az --help` output.
