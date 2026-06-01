# Validation Summary: How to Implement Circuit Breaker Pattern in Azure API Management Policies

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure API Management
- Azure API Management backend entities
- Azure API Management policies
- Azure API Management built-in cache
- ARM templates
- Circuit breaker pattern

## Sources Consulted
- Microsoft Learn: Backends in API Management, including backend circuit breaker configuration and limitations: https://learn.microsoft.com/en-us/azure/api-management/backends
- Microsoft Learn: Backend - Create Or Update REST API schema for API Management backends: https://learn.microsoft.com/en-us/rest/api/apimanagement/backend/create-or-update
- Microsoft Learn: set-backend-service policy reference: https://learn.microsoft.com/en-us/azure/api-management/set-backend-service-policy
- Microsoft Learn: cache-lookup-value policy reference: https://learn.microsoft.com/en-us/azure/api-management/cache-lookup-value-policy
- Microsoft Learn: cache-store-value policy reference: https://learn.microsoft.com/en-us/azure/api-management/cache-store-value-policy
- Microsoft Learn: Custom caching in Azure API Management: https://learn.microsoft.com/en-us/azure/api-management/api-management-sample-cache-by-key
- Microsoft Learn: rate-limit-by-key policy reference: https://learn.microsoft.com/en-us/azure/api-management/rate-limit-by-key-policy
- Microsoft Learn: trace policy reference: https://learn.microsoft.com/en-us/azure/api-management/trace-policy

## Issues Found
- The custom policy examples used multiple `cache-lookup-value` and `cache-store-value` policies in the same policy section. Microsoft documents that each of these policies can only be used once per policy section, so the examples were changed to store state in a single composite cache value.
- Several XML policy attributes used nested double quotes, which made the snippets not well-formed XML. Conditions and expressions were updated to use valid XML attribute quoting and escaping.
- The basic custom implementation incorrectly said the circuit automatically transitions to half-open when the open-state cache entry expires. The example actually returns to the default closed state, so the explanation was corrected.
- The half-open example used an additional cache lookup for probe counting in the inbound section. It was changed to use `rate-limit-by-key` to throttle probe requests without violating cache policy usage limits.
- The fallback example used a second cache lookup in the inbound section for cached response data. It was changed to use the same composite cache value and keep the XML well-formed.
- The monitoring snippet referenced the old `failureCount` variable after the cache model was corrected. It now checks the composite next-state value.
- Added the current APIM caveat that backend circuit breakers are not supported in the Consumption tier and that circuit breaker tripping is approximate across gateway instances.

## Review Notes
The native backend circuit breaker ARM example aligns with current Microsoft documentation. The policy-based implementation is still best treated as a simplified example because APIM cache writes are asynchronous and built-in cache state is volatile; the native backend circuit breaker remains the more reliable option when its behavior is sufficient.
