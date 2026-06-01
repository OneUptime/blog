# Validation Summary: How to Configure Backend Load Balancing in Azure API Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure API Management
- API Management backend entities
- API Management backend pools
- API Management policies and policy expressions
- Azure Monitor / Application Insights
- Azure Front Door and Azure Traffic Manager

## Sources Consulted
- Microsoft Learn: Backends in API Management - https://learn.microsoft.com/en-us/azure/api-management/backends
- Microsoft Learn: API Management policy expressions - https://learn.microsoft.com/en-us/azure/api-management/api-management-policy-expressions
- Microsoft Learn: Set backend service policy - https://learn.microsoft.com/en-us/azure/api-management/set-backend-service-policy
- Microsoft Learn: Retry policy - https://learn.microsoft.com/en-us/azure/api-management/retry-policy
- Microsoft Learn: Custom caching in Azure API Management - https://learn.microsoft.com/en-us/azure/api-management/api-management-sample-cache-by-key
- Microsoft Learn: Cache store value policy - https://learn.microsoft.com/en-us/azure/api-management/cache-store-value-policy
- Microsoft Learn: Return response policy - https://learn.microsoft.com/en-us/azure/api-management/return-response-policy
- Microsoft Learn: Microsoft.ApiManagement/service/backends ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.apimanagement/2025-03-01-preview/service/backends

## Issues Found
- Several XML policy snippets used double-quoted XML attributes containing C# string literals, and some expression attributes contained unescaped generic type brackets or comparison operators. Changed those expression-bearing attributes to valid XML quoting and escaping.
- The manual hash examples used `Math.Abs(hash) % length`, which can fail for `Int32.MinValue`. Changed the expression to take the modulo first and then `Math.Abs(...)`.
- The weighted routing example seeded `Random` from `GetHashCode()`. Replaced it with a deterministic modulo calculation to avoid seed edge cases while preserving the 70/30 distribution.
- The backend pool JSON used `"type": "pool"` and short backend IDs. Updated it to `"type": "Pool"`, added `priority`, and used full ARM resource ID placeholders as required by the backend pool schema.
- The active-passive failover example used an outbound `send-request mode="copy"` retry pattern that would not reliably copy request bodies in the outbound section and did not match the timeout wording. Replaced it with the documented backend `retry` pattern using `set-backend-service` and `forward-request`.
- The health-routing example used a non-existent `default-value` attribute on `cache-lookup-value`. Removed the attribute and used `context.Variables.GetValueOrDefault<T>()` in the policy expressions.
- The health-routing text referred to a "scheduled policy"; API Management policies are not scheduled jobs. Changed the wording to refer to an Azure Function, Logic App, or other scheduled job.

## Review Notes
Backend pools now support built-in round-robin, weighted, priority-based routing, and session awareness. For new APIM deployments, backend pools with backend circuit breaker rules are usually preferable to hand-written policy load balancing unless custom routing logic is required.
