# Validation Summary: How to Fix CORS Errors in Azure API Management

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Azure API Management
- API Management policies
- Cross-Origin Resource Sharing (CORS)
- HTTP OPTIONS preflight requests
- curl
- Browser developer tools

## Sources Consulted
- Microsoft Learn: Azure API Management `cors` policy reference: https://learn.microsoft.com/en-us/azure/api-management/cors-policy
- Microsoft Learn: Debug APIs using request tracing in Azure API Management: https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-api-inspector
- Microsoft Learn: Enable CORS for Azure API Management developer portal: https://learn.microsoft.com/en-us/azure/api-management/enable-cors-developer-portal
- MDN Web Docs: Cross-Origin Resource Sharing (CORS): https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- MDN Web Docs: CORS errors: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS/Errors
- MDN Web Docs: Using the Fetch API, including credentials: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch

## Issues Found
- The APIM tracing section used the obsolete `Ocp-Apim-Trace: true` header and referred to `Ocp-Apim-Trace-Location`. Microsoft documentation now says APIM no longer supports that tracing mechanism. Updated the section to use the portal Trace button or a time-limited debug token passed with `Apim-Debug-Authorization`, with trace retrieval by `Apim-Trace-Id` and the gateway `listTrace` REST API.
- The post described `terminate-unmatched-request` as the mechanism that makes APIM handle preflight requests directly. Microsoft documents this attribute as controlling cross-origin requests that do not match the configured CORS policy. Updated the text to clarify that API-level or higher `cors` policy scope is what lets APIM answer matching preflight requests directly.
- The complete credentialed CORS examples used wildcard request/response header exposure. Browser CORS rules require explicit values for credentialed requests, and `Authorization` should not rely on wildcard behavior. Updated the examples to list headers explicitly.
- The OPTIONS-method discussion implied `terminate-unmatched-request` fixes missing OPTIONS operations. Updated it to explain that an API-level or higher `cors` policy handles matching preflights, while explicitly defined OPTIONS operations are treated as custom preflight handling.

## Review Notes
The remaining examples use valid APIM `cors` policy structure and current CORS concepts. In a future editorial pass, the article could mention APIM's product-scope limitation when subscription keys are passed in headers, but that was not necessary to correct the existing content.
