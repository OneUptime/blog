# Validation Summary: How to Implement Retry Policies in Azure Functions Bindings

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Functions
- Azure Functions triggers and bindings
- Azure Queue Storage trigger
- Azure Service Bus trigger
- Timer trigger
- host.json configuration
- C#
- Polly
- Application Insights / Kusto Query Language

## Sources Consulted
- Microsoft Learn: Azure Functions error handling and retries - https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-error-pages
- Microsoft Learn: Azure Queue Storage trigger and bindings for Azure Functions - https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-queue
- Microsoft Learn: Azure Queue Storage trigger for Azure Functions - https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-queue-trigger
- Microsoft Learn: Azure Service Bus bindings for Azure Functions - https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-service-bus
- Microsoft Learn: Azure Service Bus trigger for Azure Functions - https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-service-bus-trigger
- Microsoft Learn: host.json reference for Azure Functions 2.x and later - https://learn.microsoft.com/en-us/azure/azure-functions/functions-host-json

## Issues Found
- The post described function-level retry policies as general-purpose retries for any trigger. Microsoft documents runtime retry policies only for supported triggers, including Timer, Event Hubs, Kafka, Azure Cosmos DB, and not Azure Queue Storage. Updated the explanation to state that function-level retry policies apply only to supported triggers.
- The fixed-delay retry example used `FixedDelayRetry` on a Queue trigger. Queue triggers use their own host.json-controlled retry/poison-message behavior, so the example was changed to a Timer trigger, which supports function-level retry policies.
- The post said function-level retry attributes start with Azure Functions runtime 4.x. Microsoft documents retry policies as unsupported in runtime 1.x and available in later runtimes for supported triggers, so this was corrected to runtime 2.x and later.
- The host.json sample mixed current Service Bus extension 5.x settings with older `messageHandlerOptions` / `sessionHandlerOptions`, and included a top-level `retry` block that is not part of host.json. Updated the Service Bus settings to current extension 5.x names and removed the invalid top-level retry block.
- The Service Bus retry explanation needed clarification. Added that `clientRetryOptions` only applies to interactions with the Service Bus service, while failed function executions are handled through Service Bus message settlement and delivery/dead-letter settings.
- The monitoring section claimed the sample query tracks retry attempts directly. Adjusted the wording to say it identifies frequent function failures, which can indicate repeated retries.

## Review Notes
The Polly examples use the established Polly v7-style API, which is still common in existing .NET code. Future updates could consider adding package/version notes if the post wants to target Polly v8 specifically.
