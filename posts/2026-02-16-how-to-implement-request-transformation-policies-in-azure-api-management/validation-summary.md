# Validation Summary: How to Implement Request Transformation Policies in Azure API Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure API Management
- APIM policy XML
- APIM policy expressions in C#
- JSON transformation with Newtonsoft.Json `JObject`
- APIM Liquid templates
- XML/JSON conversion policies

## Sources Consulted
- Microsoft Learn: Policies in Azure API Management - https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-policies
- Microsoft Learn: Set or edit Azure API Management policies - https://learn.microsoft.com/en-us/azure/api-management/set-edit-policies
- Microsoft Learn: API Management policy expressions - https://learn.microsoft.com/en-us/azure/api-management/api-management-policy-expressions
- Microsoft Learn: Set header policy - https://learn.microsoft.com/en-us/azure/api-management/set-header-policy
- Microsoft Learn: Rewrite URI policy - https://learn.microsoft.com/en-us/azure/api-management/rewrite-uri-policy
- Microsoft Learn: Set backend service policy - https://learn.microsoft.com/en-us/azure/api-management/set-backend-service-policy
- Microsoft Learn: Set query parameter policy - https://learn.microsoft.com/en-us/azure/api-management/set-query-parameter-policy
- Microsoft Learn: Set body policy - https://learn.microsoft.com/en-us/azure/api-management/set-body-policy
- Microsoft Learn: XML to JSON policy - https://learn.microsoft.com/en-us/azure/api-management/xml-to-json-policy
- Microsoft Learn: JSON to XML policy - https://learn.microsoft.com/en-us/azure/api-management/json-to-xml-policy

## Issues Found
- The response header removal example attempted to delete the `Server` response header. Microsoft documents that APIM cannot delete the `Server` header in responses, so I removed that policy line and added a short note about the limitation.
- The `set-backend-service` example was introduced as a complex URL rewrite, but the policy changes the backend service base URL. I changed the wording to describe backend routing instead.
- The `choose` policy example used unescaped double quotes inside an XML attribute. I replaced them with `&quot;` entities so the snippet is well-formed XML.
- The XML-to-JSON example comment referenced a `json-conversion-error-handling` attribute that is not part of the current `xml-to-json` policy statement. I removed the inaccurate comment.
- The Liquid template used `upcase` and `equals`, but APIM's Liquid support requires Pascal-case filter names and does not list `equals` as a supported filter. I changed `upcase` to `Upcase` and replaced the equality filter with a Liquid conditional.
- The chained `rewrite-uri` example mixed literal text with a policy expression in an attribute. Microsoft documents that when expressions are used in `rewrite-uri template`, the whole value must be an expression, so I changed it to a full expression.
- The performance section said to use `preserveContent="true"` on `set-body`. In APIM, `preserveContent` is a parameter to `context.Request.Body.As<T>()` or `context.Response.Body.As<T>()`, so I corrected the wording.

## Review Notes
The remaining examples align with the current Microsoft Learn policy references. Body transformation examples assume the request or response body exists and is valid JSON; APIM can throw runtime exceptions when a body is absent or cannot be parsed, which is normal for these concise tutorial snippets.
