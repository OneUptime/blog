# Validation Summary: How to Implement Rate Limiting and Throttling in Azure API Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure API Management
- API Management policy XML
- Rate limiting and throttling policies
- Quota policies
- APIM policy expressions
- Bash and curl for endpoint testing

## Sources Consulted
- Microsoft Learn: Azure API Management policy reference - rate-limit: https://learn.microsoft.com/en-us/azure/api-management/rate-limit-policy
- Microsoft Learn: Azure API Management policy reference - rate-limit-by-key: https://learn.microsoft.com/en-us/azure/api-management/rate-limit-by-key-policy
- Microsoft Learn: Azure API Management policy reference - quota: https://learn.microsoft.com/en-us/azure/api-management/quota-policy
- Microsoft Learn: Azure API Management policy reference - quota-by-key: https://learn.microsoft.com/en-us/azure/api-management/quota-by-key-policy
- Microsoft Learn: Azure API Management policy expressions: https://learn.microsoft.com/en-us/azure/api-management/api-management-policy-expressions
- Microsoft Learn: Advanced request throttling with Azure API Management: https://learn.microsoft.com/en-us/azure/api-management/api-management-sample-flexible-throttling
- Microsoft Learn: Error handling in Azure API Management policies: https://learn.microsoft.com/en-us/azure/api-management/api-management-error-handling-policies

## Issues Found
- The post described `rate-limit` as a fixed-window policy. Microsoft documentation describes rate limiting as a sliding-window implementation in classic tiers and token-bucket implementation in v2 tiers, while quota policies use fixed windows. Removed the fixed-window wording.
- The post implied `rate-limit-by-key` and `quota-by-key` are universally available. Added the Consumption tier caveat from Microsoft documentation.
- Several XML policy examples used unescaped double quotes inside XML attributes, making the snippets invalid XML. Escaped the embedded quotes with `&quot;`.
- The JWT claim example attempted to parse the entire `Authorization` header as a JWT. Updated it to strip the `Bearer ` prefix before calling `AsJwt()` and to use the documented `Jwt.Claims.GetValueOrDefault` helper.
- The outbound header example used a generic policy expression in XML text without escaping angle brackets. Escaped `GetValueOrDefault&lt;string&gt;` so the snippet remains well-formed XML.
- The multi-region section incorrectly stated that subscription rate-limit counters synchronize across regions periodically. Updated it to reflect Microsoft documentation: rate limit counters are tracked independently at each regional gateway and are not aggregated across the whole APIM instance.
- The remaining-calls discussion said the remaining count requires `remaining-calls-variable-name` on `rate-limit-by-key` only. Updated it because both `rate-limit` and `rate-limit-by-key` support this attribute.

## Review Notes
The examples are illustrative policy fragments rather than complete `<policies>` documents, which is normal for APIM blog tutorials. For future improvement, the post could mention that v2 tiers use token-bucket behavior while classic tiers use sliding-window behavior, but the corrected text avoids making an inaccurate algorithm-specific claim.
