# Validation Summary: How to Use Azure Managed Grafana Dashboards with Power BI Dataset Integration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Managed Grafana
- Azure CLI
- Azure Monitor
- Azure Log Analytics
- Grafana dashboards, plugins, alerts, and annotations
- Power BI REST API and DAX queries
- Azure Functions for Node.js
- Microsoft Authentication Library for Node.js

## Sources Consulted
- Azure CLI `az grafana` reference: https://learn.microsoft.com/en-gb/cli/azure/grafana
- Azure Managed Grafana plugin management documentation: https://learn.microsoft.com/en-us/azure/managed-grafana/how-to-manage-plugins
- Azure Managed Grafana access and permissions documentation: https://learn.microsoft.com/en-us/azure/managed-grafana/how-to-manage-access-permissions-users-identities
- Power BI Execute Queries REST API documentation: https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/execute-queries
- Grafana JSON API plugin page: https://grafana.com/grafana/plugins/marcusolsson-json-datasource/
- Grafana Infinity data source plugin page: https://grafana.com/grafana/plugins/yesoreyeram-infinity-datasource/
- Grafana plugin catalog and data source plugin documentation: https://grafana.com/plugins and https://grafana.com/docs/grafana/latest/datasources/
- Grafana service account token migration documentation: https://grafana.com/docs/grafana/latest/administration/service-accounts/migrate-api-keys/

## Issues Found
- The Azure Managed Grafana creation command used `--sku Standard`, but the current Azure CLI reference uses `--sku-tier Standard`. Updated the command.
- The post said Standard SKU supports custom plugins and showed plugin installation with `az grafana update --grafana-plugins`. Azure Managed Grafana plugin management is done from the Azure portal, and the CLI update command does not expose that flag. Reworded the section and removed the invalid command.
- The Power BI bridge example used service principal authentication without mentioning required Power BI tenant settings, API permissions, and dataset read/build access. Added those prerequisites.
- The bridge described `/search` and `/query` as Grafana JSON API plugin endpoints. That endpoint shape is Simple JSON-style, while current JSON-capable plugins vary in how they query HTTP APIs. Updated the wording to describe a JSON-capable data source bridge instead of tying it to the wrong plugin API.
- The alert example was presented as YAML even though Grafana UI alert rules are stored as queries and expressions rather than a standalone YAML snippet. Changed the snippet to conceptual alert logic.
- The access-control commands used nonexistent `az grafana user assign` commands. Replaced them with Azure RBAC `az role assignment create` commands using the built-in Grafana roles and the Azure Managed Grafana resource scope.
- The annotation example used a generic `GRAFANA_API_KEY` variable. Grafana API keys are deprecated in modern Grafana workflows, so the example now refers to a service account token.

## Review Notes
The dashboard JSON remains illustrative. In a production Grafana import, panel targets and data source references usually need to match the exact plugin schema and data source UID configured in that workspace.
