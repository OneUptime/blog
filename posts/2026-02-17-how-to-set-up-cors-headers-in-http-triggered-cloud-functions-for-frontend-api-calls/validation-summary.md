# Validation Summary: How to Set Up CORS Headers in HTTP-Triggered Cloud Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Functions / Cloud Run functions
- Functions Framework for Node.js
- Functions Framework for Python
- CORS HTTP response headers
- Fetch API
- Express `cors` middleware
- curl

## Sources Consulted
- Google Cloud Documentation, "Write Cloud Run functions" / "Handle CORS": https://docs.cloud.google.com/run/docs/write-functions
- MDN Web Docs, "Cross-Origin Resource Sharing (CORS)": https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- MDN Web Docs, "Using the Fetch API": https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
- MDN Web Docs, "Request: credentials property": https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials
- MDN Web Docs, "Set-Cookie header": https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie
- Express documentation, "`cors` middleware": https://expressjs.com/en/resources/middleware/cors.html

## Issues Found
- The credentialed Node.js example listed `Cookie` in `Access-Control-Allow-Headers`. Browser frontend code cannot set the `Cookie` request header directly, and credentialed cookies are controlled by the Fetch `credentials` option rather than by allowing `Cookie` as a CORS request header. Removed `Cookie` from the allowed headers list.
- The same example set `Access-Control-Expose-Headers: Set-Cookie`. `Set-Cookie` is a forbidden response-header name in the Fetch standard and cannot be exposed to frontend JavaScript even if listed in `Access-Control-Expose-Headers`. Removed that header.
- The credentialed Node.js example dynamically reflected the request origin but did not include `Vary: Origin`. Added `Vary: Origin` to match CORS caching guidance used elsewhere in the post.

## Review Notes
The post is technically sound after the corrections. One operational caveat for future expansion: Google Cloud documentation notes that preflight OPTIONS requests are sent without an Authorization header, so platform-level authentication that rejects unauthenticated OPTIONS requests can break CORS before function code runs.
