# Validation Summary: How to Implement GraphQL APIs in Azure API Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure API Management
- GraphQL
- APIM GraphQL pass-through APIs
- APIM synthetic GraphQL APIs and resolvers
- APIM policies for validation, rate limiting, caching, and tracing
- XML policy configuration

## Sources Consulted
- Microsoft Learn: Overview of GraphQL APIs in Azure API Management, https://learn.microsoft.com/en-us/azure/api-management/graphql-apis-overview
- Microsoft Learn: Import a GraphQL API, https://learn.microsoft.com/en-us/azure/api-management/graphql-api
- Microsoft Learn: Add a synthetic GraphQL API and set up field resolvers, https://learn.microsoft.com/en-us/azure/api-management/graphql-schema-resolve-api
- Microsoft Learn: Configure a GraphQL resolver, https://learn.microsoft.com/en-us/azure/api-management/configure-graphql-resolver
- Microsoft Learn: HTTP data source for a resolver, https://learn.microsoft.com/en-us/azure/api-management/http-data-source-policy
- Microsoft Learn: Validate GraphQL request policy, https://learn.microsoft.com/en-us/azure/api-management/validate-graphql-request-policy
- Microsoft Learn: Rate limit by key policy, https://learn.microsoft.com/en-us/azure/api-management/rate-limit-by-key-policy
- Microsoft Learn: Cache lookup and cache store policies, https://learn.microsoft.com/en-us/azure/api-management/cache-lookup-policy
- Microsoft Learn: Get value from cache policy, https://learn.microsoft.com/en-us/azure/api-management/cache-lookup-value-policy
- Microsoft Learn: Store value in cache policy, https://learn.microsoft.com/en-us/azure/api-management/cache-store-value-policy
- Microsoft Learn: Trace policy, https://learn.microsoft.com/en-us/azure/api-management/trace-policy
- Microsoft Learn: API Management policy expressions, https://learn.microsoft.com/en-us/azure/api-management/api-management-policy-expressions

## Issues Found
- The post said `validate-graphql-request` enforces query complexity and field count. Microsoft documents `max-depth`, required `max-size`, and field authorization rules, not a configurable complexity or field-count limit. Changed the explanation and comments to refer to depth, size, and field access.
- The introspection-blocking example used `/__schema` and `/__type`. Microsoft documents the introspection rule path as `/__*`. Replaced the two rules with one `/__*` rule.
- Two `validate-graphql-request` examples omitted the required `max-size` attribute. Added `max-size="10240"` and kept the existing depth example where applicable.
- Several XML policy snippets contained raw generic type syntax or nested quotes inside XML attributes, which would not be valid XML as written. Escaped those values using XML entities where needed.
- The mutation authorization example used a JWT claim access pattern that was less aligned with APIM's documented `Jwt.Claims.GetValueOrDefault` helper and did not state that `jwt` must be supplied by a previous token validation policy. Updated the expression and added a short assumption comment.
- The caching section claimed APIM response caching works for GraphQL POST bodies when the cache key includes the body. Microsoft documents APIM response caching as GET-response oriented, so the section now states the limitation and shows a GET/persisted-query caching pattern using `cache-lookup` and `cache-store`.

## Review Notes
The core claims about APIM support for pass-through GraphQL, synthetic GraphQL, HTTP resolvers, `context.GraphQL.Arguments`, `context.GraphQL.Parent`, the developer/test query editor, and the trace policy are consistent with Microsoft documentation. The resolver examples still assume the backend returns JSON shaped to match the GraphQL schema; a production implementation should also URL-encode argument values and handle backend errors explicitly.
