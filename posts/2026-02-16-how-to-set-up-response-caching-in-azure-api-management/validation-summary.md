# Validation Summary: How to Set Up Response Caching in Azure API Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure API Management
- APIM caching policies
- APIM policy expressions
- Azure Cache for Redis / Redis-compatible external cache
- Azure Monitor and Application Insights

## Sources Consulted
- Microsoft Learn: Get from cache policy - https://learn.microsoft.com/en-us/azure/api-management/cache-lookup-policy
- Microsoft Learn: Store to cache policy - https://learn.microsoft.com/en-us/azure/api-management/cache-store-policy
- Microsoft Learn: Caching overview - https://learn.microsoft.com/en-us/azure/api-management/caching-overview
- Microsoft Learn: Use an external Redis-compatible cache in Azure API Management - https://learn.microsoft.com/en-au/azure/api-management/api-management-howto-cache-external
- Microsoft Learn: Custom caching in Azure API Management - https://learn.microsoft.com/en-us/azure/api-management/api-management-sample-cache-by-key
- Microsoft Learn: Get value from cache policy - https://learn.microsoft.com/en-in/azure/api-management/cache-lookup-value-policy
- Microsoft Learn: Store value in cache policy - https://learn.microsoft.com/en-us/azure/api-management/cache-store-value-policy
- Microsoft Learn: Remove value from cache policy - https://learn.microsoft.com/en-us/azure/api-management/cache-remove-value-policy
- Microsoft Learn: API Management policy expressions - https://learn.microsoft.com/en-us/azure/api-management/api-management-policy-expressions
- Microsoft Learn: Add caching to improve performance in Azure API Management - https://learn.microsoft.com/en-au/azure/api-management/api-management-howto-cache
- Microsoft Learn: API Management monitoring data reference - https://learn.microsoft.com/en-us/azure/api-management/monitor-api-management-reference

## Issues Found
- The post described the response-cache key as including the request method. Microsoft documents response caching for HTTP GET requests and describes the resource URL, optionally varied by configured headers or query parameters, as the key. Updated the explanation to make the GET-only behavior explicit.
- The conditional caching section said the `cache-store` policy has conditions. `cache-store` does not have its own condition attributes, though it can be wrapped in `choose`. Updated the text and noted that `cache-store` caches only `200 OK` responses by default unless `cache-response="true"` is set.
- Two policy snippets used nested double quotes in attributes. Updated those snippets to use single-quoted XML attributes around policy expressions.
- The external-cache limitations section overstated built-in cache locality and persistence. Updated it to reflect that internal cache is shared within a region, each region has its own cache in multi-region deployments, cache size varies by service tier, classic tiers do not persist cache through service updates, and v2 tiers provide persistent built-in cache.
- The post said APIM automatically uses the external cache for all cache policies. Updated it to reflect the documented `caching-type="prefer-external"` default and the need to change policies that explicitly specify `internal`.
- The monitoring section suggested detecting hits through an `X-APIM-Cache` response header in outbound policy. A response served by `cache-lookup` short-circuits before outbound policies, and no official `X-APIM-Cache` header is documented for this purpose. Replaced the example with guidance to use APIM test trace for `cache-lookup` debugging and a limited outbound `MISS` marker example.

## Review Notes
The post is technically relevant and now aligns with current Microsoft documentation. Future improvements could add the Microsoft-recommended `rate-limit` or `rate-limit-by-key` policy immediately after cache lookup, but that is a best-practice addition rather than a correctness fix.
