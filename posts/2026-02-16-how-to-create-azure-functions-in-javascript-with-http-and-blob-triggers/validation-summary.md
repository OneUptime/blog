# Validation Summary: How to Create Azure Functions in JavaScript with HTTP and Blob Triggers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Functions
- Azure Functions Node.js v4 programming model
- JavaScript
- Node.js
- Azure Functions Core Tools
- HTTP triggers
- Azure Blob Storage triggers and output bindings
- Azurite
- Azure CLI

## Sources Consulted
- Microsoft Learn: Azure Functions HTTP trigger: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook-trigger
- Microsoft Learn: Azure Blob storage trigger for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-blob-trigger
- Microsoft Learn: Azure Blob storage output binding for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-blob-output
- Microsoft Learn: Triggers and bindings in Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-triggers-bindings
- Microsoft Learn: Migrate to v4 of the Node.js model for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-node-upgrade-v4
- Microsoft Learn: Node.js developer reference for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node
- Microsoft Learn: Develop Azure Functions locally using Core Tools: https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local
- Microsoft Learn: Compare Azure Functions runtime versions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-versions
- Microsoft Learn: Use the Azurite emulator for local Azure Storage development: https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azurite
- Microsoft Apps on Azure Blog: Azure Functions Node.js v4 programming model is Generally Available: https://techcommunity.microsoft.com/blog/appsonazureblog/azure-functions-node-js-v4-programming-model-is-generally-available/3929217

## Issues Found
- The project creation command used the older shorthand `func init blob-functions --javascript --model V4`. Changed it to the current documented Core Tools form with `--worker-runtime node --language javascript --model V4`.
- The `local.settings.json` example included `AzureWebJobsFeatureFlags: EnableWorkerIndexing`, which was only required during the Node.js v4 programming model preview. Removed it because v4 is generally available and supported on current runtime/Core Tools versions without that setting.
- The local storage wording mentioned the Azure Storage Emulator. Changed it to Azurite because Microsoft documents Azurite as superseding the legacy Azure Storage Emulator.
- The blob retry comment said Azure Functions retries blob triggers up to 5 times. Changed it to say Azure Functions tries blob triggers a total of 5 times by default, matching the blob trigger documentation.
- The deployment command used `--runtime-version 20`. Changed it to `--runtime-version 22` because Node.js 20 reached its Azure Functions expected end-of-support date on April 30, 2026, and Node.js 22 is GA as of this review date.

## Review Notes
The examples use the current Node.js v4 code-centric APIs such as `app.http()`, `app.storageBlob()`, `output.storageBlob()`, return bindings, and `context.extraOutputs.set()`. The code is suitable for tutorial purposes, but production apps should use persistent storage instead of the in-memory `Map` in the HTTP example and should consider streaming or SDK clients for large blobs to avoid unnecessary memory pressure.
