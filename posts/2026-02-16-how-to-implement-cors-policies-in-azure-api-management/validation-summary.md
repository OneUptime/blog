# Validation Summary: How to Implement CORS Policies in Azure API Management

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure API Management
- Azure API Management policies
- CORS
- HTTP response and request headers
- Browser Fetch/XMLHttpRequest behavior

## Sources Consulted
- Microsoft Learn: Azure API Management policy reference - CORS: https://learn.microsoft.com/en-us/azure/api-management/cors-policy
- MDN: Cross-Origin Resource Sharing (CORS): https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- MDN: CORS-safelisted response header: https://developer.mozilla.org/en-US/docs/Glossary/CORS-safelisted_response_header
- MDN: Request.credentials: https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials
- WHATWG Fetch Standard: https://fetch.spec.whatwg.org/

## Issues Found
- The simple request description was too narrow because simple CORS requests can include GET, HEAD, or POST when the request otherwise meets the CORS-safelisted method, header, and content-type rules. Updated the wording to avoid implying only GET requests can be simple.
- The credentials section implied that setting APIM `allow-credentials="true"` alone makes browsers send cookies and authentication headers. Updated it to clarify that the frontend must also opt in to credentialed requests, and that JavaScript-sent `Authorization` headers must be listed in `allowed-headers`.
- The list of CORS-safelisted response headers omitted `Content-Length`. Added it to match the current browser CORS safelist.
- The per-API CORS section described API-level configuration as a simple override of the "All APIs" policy. Updated the wording to note that APIM can have `cors` policies at multiple scopes, but effective policy order matters because generally only the first `cors` policy is applied.

## Review Notes
The APIM `cors` XML snippets use valid elements and attributes from the current Microsoft policy reference, including `allow-credentials`, `allowed-origins`, `allowed-methods`, `preflight-result-max-age`, `allowed-headers`, and `expose-headers`. The dynamic-origin example is intentionally a manual header approach rather than the built-in `cors` policy; for production use, it would need explicit OPTIONS handling and careful origin parsing.
