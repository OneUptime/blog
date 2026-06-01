# Validation Summary: Enable Microsoft Defender for Azure Cosmos DB to Detect NoSQL Injection Attacks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Defender for Cloud
- Microsoft Defender for Azure Cosmos DB
- Azure Cosmos DB for NoSQL
- Azure CLI
- Node.js
- Azure Resource Graph KQL
- Microsoft Sentinel / SIEM alert export
- Logic Apps workflow automation

## Sources Consulted
- Microsoft Defender for Azure Cosmos DB overview: https://learn.microsoft.com/en-us/azure/defender-for-cloud/concept-defender-for-cosmos
- Microsoft Defender for Azure Cosmos DB documentation: https://learn.microsoft.com/en-us/azure/cosmos-db/defender-for-cosmos-db
- Alerts for Azure Cosmos DB in Microsoft Defender for Cloud: https://learn.microsoft.com/en-us/azure/defender-for-cloud/alerts-azure-cosmos-db
- Enable Microsoft Defender for Azure Cosmos DB: https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-databases-enable-cosmos-protections
- Azure CLI `az security pricing`: https://learn.microsoft.com/en-us/cli/azure/security/pricing
- Azure CLI `az security atp cosmosdb`: https://learn.microsoft.com/en-us/cli/azure/security/atp/cosmosdb
- Azure CLI `az security contact`: https://learn.microsoft.com/en-us/cli/azure/security/contact
- Azure Resource Graph sample queries for Defender for Cloud: https://learn.microsoft.com/en-us/azure/defender-for-cloud/resource-graph-samples
- Azure Cosmos DB JavaScript query documentation: https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-javascript-query-items
- Azure Cosmos DB JavaScript SDK reference: https://learn.microsoft.com/en-us/javascript/api/@azure/cosmos/items
- Azure Cosmos DB query logical operators: https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/query/logical-operators
- Microsoft Defender for Cloud pricing: https://azure.microsoft.com/en-us/pricing/details/defender-for-cloud/

## Issues Found
- The post described the Defender detection as generic "NoSQL injection." Microsoft documentation specifically describes potential SQL injection attacks against Azure Cosmos DB for NoSQL queries, so the title, metadata, and detection wording were corrected while preserving the article's intent.
- The introduction implied injected Cosmos DB queries could directly modify records. Azure Cosmos DB for NoSQL queries are read queries, so the wording was narrowed to data extraction and bypassing application authorization checks.
- The vulnerable request example used `--` comment syntax and `1=1`, which is not the clearest Cosmos DB for NoSQL example. It was changed to an `OR true` predicate that matches the documented logical operator behavior.
- The resource-level Azure CLI example incorrectly used `az security pricing create` with an extension payload and an unused resource ID. It was replaced with the documented `az security atp cosmosdb update --is-enabled true` command and a matching `show` verification command.
- The security contact commands used outdated flags (`--email`, `--alerts-to-admins`, and `on`). They were updated to current `az security contact create` syntax with `--emails`, structured `--alert-notifications`, and `--notifications-by-role`.
- The Azure Resource Graph query used the Log Analytics / Sentinel-style `SecurityAlert` table and fields. It was corrected to use `SecurityResources` with `microsoft.security/locations/alerts` properties, matching Defender for Cloud Resource Graph examples.
- The pricing section stated a flat per-account monthly price. Current Microsoft pricing bills Defender for Azure Cosmos DB based on request units, so the pricing text was corrected.

## Review Notes
- The Azure CLI was not installed in the local environment, so command validation was performed against current Microsoft Learn CLI references rather than local `az --help` output.
- Microsoft documentation states Defender for Azure Cosmos DB is currently available for Azure Cosmos DB for NoSQL and not for Azure Government or sovereign cloud regions. The post focuses on the supported NoSQL API and does not discuss unsupported clouds.
