# Validation Summary: How to Build Azure Event Grid

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Event Grid
- Azure CLI
- Azure Functions
- Azure Storage
- CloudEvents 1.0
- Python Azure SDK
- Azure Monitor

## Sources Consulted
- Azure Event Grid push delivery concepts: https://learn.microsoft.com/en-us/azure/event-grid/concepts
- Publish events to Azure Event Grid custom topics using access keys: https://learn.microsoft.com/en-us/azure/event-grid/post-to-custom-topic
- CloudEvents v1.0 schema with Azure Event Grid: https://learn.microsoft.com/en-us/azure/event-grid/cloud-event-schema
- Azure CLI reference for `az eventgrid`: https://learn.microsoft.com/en-us/cli/azure/eventgrid?view=azure-cli-latest
- Azure CLI reference for `az eventgrid event-subscription`: https://learn.microsoft.com/en-us/cli/azure/eventgrid/event-subscription?view=azure-cli-latest
- Azure Event Grid filtering documentation: https://learn.microsoft.com/en-us/azure/event-grid/event-filtering
- Azure Event Grid delivery and retry documentation: https://learn.microsoft.com/en-us/azure/event-grid/delivery-and-retry
- Azure Event Grid Python client library documentation: https://learn.microsoft.com/en-us/python/api/overview/azure/eventgrid-readme?view=azure-python
- Azure Functions Event Grid trigger documentation: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-grid-trigger
- Azure Event Grid monitoring reference: https://learn.microsoft.com/en-us/azure/event-grid/monitor-push-reference
- Enable diagnostic logs for Event Grid resources: https://learn.microsoft.com/en-us/azure/event-grid/enable-diagnostic-logs-topic
- Event domains documentation: https://learn.microsoft.com/en-us/azure/event-grid/how-to-event-domains

## Issues Found
- The post showed `az eventgrid event publish`, but the current Azure CLI Event Grid reference does not document an `event publish` command. Replaced the Event Grid schema publish example with the documented `curl` POST pattern using the `aeg-sas-key` header.
- The post implied a single custom topic could be used interchangeably for Event Grid schema and CloudEvents input. Azure Event Grid requires the custom topic input schema to be selected at topic creation time. Updated the wording and CloudEvents example to create a separate topic with `--input-schema cloudeventschemav1_0`, then retrieve and use that topic's endpoint and key.
- The retry policy parameter description called `max-delivery-attempts` the number of retries. Azure documents it as the maximum number of delivery attempts. Updated the wording to avoid off-by-one confusion.

## Review Notes
- Azure CLI was not installed in the local environment, so command verification was performed against the current Microsoft Learn Azure CLI reference and Azure Event Grid product documentation.
- Several event type names in the "Common System Topic Event Types" table are abbreviated for readability; actual `--included-event-types` values should use the full provider-qualified event type names, as shown elsewhere in the post.
