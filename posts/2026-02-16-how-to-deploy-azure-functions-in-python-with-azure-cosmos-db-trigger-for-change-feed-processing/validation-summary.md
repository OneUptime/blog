# Validation Summary: How to Deploy Azure Functions in Python with Azure Cosmos DB Trigger

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Functions
- Azure Functions Core Tools
- Python v2 programming model for Azure Functions
- Azure Cosmos DB trigger and output bindings
- Azure Cosmos DB change feed
- Azure CLI
- Azure AI Search REST API

## Sources Consulted
- Azure Cosmos DB trigger for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-cosmosdb-v2-trigger
- Azure Cosmos DB output binding for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-cosmosdb-v2-output
- Azure Functions Core Tools reference: https://learn.microsoft.com/en-us/azure/azure-functions/functions-core-tools-reference
- Develop Azure Functions locally by using Core Tools: https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local
- Python developer reference for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-python
- Azure Cosmos DB change feed overview: https://learn.microsoft.com/en-us/azure/cosmos-db/change-feed
- Azure Cosmos DB change feed modes: https://learn.microsoft.com/en-us/azure/cosmos-db/change-feed-modes
- Azure Cosmos DB multiple independent Azure Functions triggers: https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-create-multiple-cosmos-db-triggers
- Azure CLI function app creation sample for serverless Python: https://learn.microsoft.com/en-us/azure/azure-functions/scripts/functions-cli-create-serverless-python
- Azure AI Search REST API reference: https://learn.microsoft.com/en-us/rest/api/searchservice/documents/?view=rest-searchservice-2025-09-01

## Issues Found
- The introduction described the default change feed as an ordered log of every insert and update. Updated it to clarify that Azure Functions triggers use latest-version mode, which can omit intermediate updates for the same item between reads.
- The change feed details said deletes are not captured unless soft delete is enabled. Updated this to clarify that Azure Functions triggers use latest-version mode, so a soft-delete marker is the practical trigger-compatible pattern for reacting to deletions.
- The setup command used `func init --python`, which is not the current documented Core Tools form for a Python v2 project. Changed it to `func init cosmos-change-feed --worker-runtime python --model V2`.
- The dependency installation omitted `requests`, even though the third function imports it. Added `requests` to the install command.
- The materialized view example claimed to maintain customer order totals, but the code only sees the current change-feed batch and would overwrite the summary with batch totals. Updated the prose and fields to describe recently changed orders and a batch total instead.
- The Cosmos DB output binding auto-created a container without a partition key. Added `partition_key="/customerId"` to match the summary document shape.
- The notification example claimed to detect status changes, but latest-version change feed entries do not include the previous value. Updated the heading, prose, docstring, and comment to describe notifications for observed status values.
- The Azure AI Search REST call omitted the required `api-version` query parameter and used a non-current path form. Updated it to `docs/search.index?api-version=2025-09-01`.
- The Azure AI Search example logged failed HTTP responses without raising, so failed indexing could still advance the change feed checkpoint. Added `response.raise_for_status()`.
- The Azure CLI Function App creation command for Python on classic Consumption omitted `--os-type Linux`. Added it based on the official Python Function App CLI sample.
- The idempotency snippet indexed directly into `doc` even though the rest of the article uses `func.Document.to_dict()`. Updated it to normalize the document before building the event ID and processing it.

## Review Notes
- The Python code snippets were syntax-checked with `ast.parse`.
- The local environment did not have Azure Functions Core Tools or Azure CLI installed, so command validation was performed against official Microsoft documentation instead of local `--help` output.
