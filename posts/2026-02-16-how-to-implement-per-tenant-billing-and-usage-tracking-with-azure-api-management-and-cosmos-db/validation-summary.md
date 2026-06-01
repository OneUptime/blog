# Validation Summary: How to Use Per-Tenant Billing and Usage Tracking with Azure API Management

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure API Management
- Azure API Management policies
- Azure Event Hubs
- Azure Functions
- Azure Cosmos DB for NoSQL
- C# / .NET
- JSON configuration
- SaaS billing, quota enforcement, and usage metering

## Sources Consulted
- Azure API Management validate-jwt policy: https://learn.microsoft.com/en-us/azure/api-management/validate-jwt-policy
- Azure API Management rate-limit-by-key policy: https://learn.microsoft.com/en-us/azure/api-management/rate-limit-by-key-policy
- Azure API Management quota-by-key policy: https://learn.microsoft.com/en-us/azure/api-management/quota-by-key-policy
- Azure API Management log-to-eventhub policy: https://learn.microsoft.com/en-us/azure/api-management/log-to-eventhub-policy
- Azure API Management policy expressions: https://learn.microsoft.com/en-us/azure/api-management/api-management-policy-expressions
- Azure Event Hubs quotas and limits: https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-quotas
- Azure Cosmos DB indexing policies: https://learn.microsoft.com/en-us/azure/cosmos-db/index-policy
- Azure Cosmos DB time to live: https://learn.microsoft.com/en-us/cosmos-db/time-to-live
- Azure Cosmos DB .NET query guidance: https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/how-to-dotnet-query-items
- Azure Cosmos DB query performance tips for SDKs: https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/performance-tips-query-sdk

## Issues Found
- The `validate-jwt` snippet used `require-expiration-date`, but the current APIM policy attribute is `require-expiration-time`. Updated the attribute.
- The JWT extraction parsed the raw `Authorization` header with `AsJwt()`, which does not handle the `Bearer ` scheme safely. Updated the policy to use `require-scheme="Bearer"` and `output-token-variable-name="jwt"`, then read claims from the validated JWT object.
- The `rate-limit-by-key` snippet used `renewal-period="3600"`, but APIM documents a maximum allowed value of 300 seconds for this policy. Updated the example to a 300-second window.
- The `log-to-eventhub` policy read request and response bodies without preserving content, which can consume the message body stream. Updated the snippet to call `As<string>(true)`.
- The Event Hubs explanation claimed it can handle millions of events per second without qualification. Updated the wording to reflect that throughput depends on proper namespace and partition sizing.
- The Cosmos DB indexing policy used an exclude-root strategy without explicitly including `/partitionKey/?`. Added the partition key path because Azure Cosmos DB documentation notes that the partition key property is not indexed by default with this strategy.
- The Cosmos DB aggregation and dashboard queries filtered by partition key in SQL but did not pass `QueryRequestOptions.PartitionKey`. Updated the snippets to scope queries to the target logical partition.
- The quota section described a monthly quota, but `renewal-period="2592000"` is a 30-day fixed window, not a calendar month. Updated the wording.
- The quota bandwidth example used `1073741824`, but APIM `quota-by-key` bandwidth is measured in kilobytes. Updated it to `1048576` for 1 GiB.
- The quota section said APIM returns 429 when a quota is exceeded. The `quota-by-key` policy returns 403 Forbidden with a `Retry-After` header, so the text was corrected.
- The usage dashboard response labeled summed API calls as `requestUnits`, which is misleading because Cosmos DB request units are a separate consumption metric. Renamed the response field to `totalCalls`.
- The XML policy snippets contained attribute quoting and generic type syntax that would be invalid in copy-pasted XML. Updated those expressions to use XML-safe quoting and escaped generic type brackets.

## Review Notes
The Azure Functions examples use the classic in-process programming model (`[FunctionName]`). This is still understandable for the post, but new production implementations should consider the isolated worker model because in-process support is scheduled to end on November 10, 2026.
