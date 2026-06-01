# Validation Summary: How to Schedule and Trigger Pipelines in Azure Data Factory

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Data Factory
- Azure Data Factory pipeline triggers
- Schedule triggers
- Tumbling window triggers
- Storage event triggers
- Custom event triggers
- Azure Event Grid
- Azure CLI

## Sources Consulted
- Microsoft Learn: Create schedule triggers in Azure Data Factory and Azure Synapse: https://learn.microsoft.com/en-us/azure/data-factory/how-to-create-schedule-trigger
- Microsoft Learn: Create tumbling window triggers in Azure Data Factory and Azure Synapse: https://learn.microsoft.com/en-us/azure/data-factory/how-to-create-tumbling-window-trigger
- Microsoft Learn: Create event-based storage triggers in Azure Data Factory and Azure Synapse Analytics: https://learn.microsoft.com/en-us/azure/data-factory/how-to-create-event-trigger
- Microsoft Learn: Create custom event triggers in Azure Data Factory: https://learn.microsoft.com/en-us/azure/data-factory/how-to-create-custom-event-trigger
- Microsoft Learn: Reference trigger metadata in pipeline runs: https://learn.microsoft.com/en-us/azure/data-factory/how-to-use-trigger-parameterization
- Microsoft Learn: Azure CLI `az datafactory pipeline`: https://learn.microsoft.com/en-us/cli/azure/datafactory/pipeline?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az datafactory trigger`: https://learn.microsoft.com/en-us/cli/azure/datafactory/trigger?view=azure-cli-latest

## Issues Found
- The fenced `json` examples contained JavaScript-style comments, making them invalid JSON. Removed the comments so the snippets parse as JSON.
- The weekly schedule trigger used `timeZone: "Eastern Standard Time"` with a `Z` suffix on `startTime`. Microsoft documentation requires the `Z` suffix only for UTC schedules; removed the suffix for the non-UTC example.
- The custom event trigger parameter used `@triggerBody().data`, but Microsoft documents custom event payload access as `@triggerBody().event.data.<key>`. Updated the example to pass `batchId` from `@triggerBody().event.data.batchId`.
- The trigger state section said triggers have only `Started` and `Stopped` states. Updated the wording to note these are the states users manage and that some trigger types may expose a read-only `Disabled` runtime state.

## Review Notes
- The Azure CLI was not installed locally, so CLI commands were validated against Microsoft Learn CLI reference pages rather than local `az --help` output.
- The JSON snippets were parsed locally after edits to confirm they are syntactically valid JSON.
