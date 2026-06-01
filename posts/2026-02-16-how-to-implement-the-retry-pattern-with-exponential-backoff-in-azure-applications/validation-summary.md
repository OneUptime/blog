# Validation Summary: How to Use the Retry Pattern with Exponential Backoff in Azure Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure application resilience patterns
- Polly and Polly.Extensions.Http for .NET HTTP retries
- Azure Service Bus .NET SDK
- Azure Cosmos DB .NET SDK
- Python requests
- Tenacity
- Azure Functions retry policies
- Mermaid sequence diagrams

## Sources Consulted
- Microsoft Learn: Implement HTTP call retries with exponential backoff with Polly - https://learn.microsoft.com/en-us/dotnet/architecture/microservices/implement-resilient-applications/implement-http-call-retries-exponential-backoff-polly
- Microsoft Learn: ServiceBusRetryOptions class - https://learn.microsoft.com/dotnet/api/azure.messaging.servicebus.servicebusretryoptions
- Microsoft Learn: CosmosClientOptions.MaxRetryWaitTimeOnRateLimitedRequests property - https://learn.microsoft.com/dotnet/api/microsoft.azure.cosmos.cosmosclientoptions.maxretrywaittimeonratelimitedrequests
- Microsoft Learn: Azure Cosmos DB SDK connectivity modes - https://learn.microsoft.com/azure/cosmos-db/sdk-connection-modes
- Microsoft Learn: Azure Functions error handling and retries - https://learn.microsoft.com/azure/azure-functions/functions-bindings-error-pages
- Microsoft Learn: Azure Service Bus bindings for Azure Functions - https://learn.microsoft.com/azure/azure-functions/functions-bindings-service-bus
- Tenacity API reference - https://tenacity.readthedocs.io/en/stable/api.html
- Requests documentation - https://requests.readthedocs.io/

## Issues Found
- The exponential backoff formula and Polly code used `2 ^ retryAttempt`, which makes the first retry wait about 2 seconds even though the text says it starts at 1 second. Changed the formula and code to use `retry_attempt - 1` / `retryAttempt - 1`.
- The Polly example only handled `Retry-After` delta values. Added support for date-based `Retry-After` values as well, so the code more accurately respects the HTTP header.
- The Polly `onRetryAsync` callback was marked `async` without awaiting anything. Changed it to return `Task.CompletedTask`.
- The Cosmos DB comment said gateway mode handles retries better. Microsoft documentation describes direct mode as preferred for best performance and gateway mode as useful for firewall/socket constraints, not better retries. Updated the comment.
- The Tenacity comment said five retry sleeps through 16 seconds, but `stop_after_attempt(5)` means five total attempts and four waits. Updated the comment to 1, 2, 4, and 8 seconds between attempts.
- The Azure Functions section mixed `host.json` Service Bus settings with a top-level function execution `retry` block and used `[ExponentialBackoffRetry]` on a Service Bus trigger. Current Azure Functions documentation supports function-level retry policies for Cosmos DB, Event Hubs, Kafka, and Timer triggers, while Service Bus uses binding/service delivery behavior. Updated the prose and examples to use function-level retry configuration with Event Hubs.

## Review Notes
The retry guidance is generally accurate. For future improvement, the Polly example could use the newer Microsoft.Extensions.Http.Resilience APIs for modern .NET applications, but the Polly.Extensions.Http example remains a documented and valid approach.
