# Validation Summary: How to Configure CORS Securely

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cross-Origin Resource Sharing (CORS)
- HTTP CORS headers and preflight requests
- Node.js and Express `cors` middleware
- Python Flask and Flask-CORS
- Go `net/http` middleware
- curl-based CORS testing

## Sources Consulted
- MDN Web Docs: Cross-Origin Resource Sharing (CORS) - https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- WHATWG Fetch Standard: CORS protocol and credentials - https://fetch.spec.whatwg.org/
- Express.js `cors` middleware documentation - https://expressjs.com/en/resources/middleware/cors/
- Flask-CORS API documentation - https://flask-cors.readthedocs.io/en/latest/api.html
- Go `net/http` package documentation - https://pkg.go.dev/net/http
- Go `strconv` package documentation - https://pkg.go.dev/strconv
- curl manpage - https://curl.se/docs/manpage.html

## Issues Found
- The post described CORS as protecting APIs from unauthorized cross-origin requests. CORS is browser-enforced response sharing, not an API authentication or request-blocking mechanism. Updated the description and introduction to clarify that CORS controls which browser-based origins can read responses.
- The simple request header list omitted the currently safelisted `Range` header case. Added `Range` with the single-range-value restriction.
- The Express example applied the global strict CORS middleware before the route-specific public CORS example, so the public route could still be rejected by the strict middleware. Moved the public route before the global middleware.
- The custom Flask decorator reflected an allowed origin without setting `Vary: Origin`. Added `response.headers.add('Vary', 'Origin')` for cache correctness.
- The Go middleware ignored `config.MaxAge` and always wrote `86400`. Added `strconv.Itoa(config.MaxAge)` so the configured value is used.
- The Go middleware comment said a missing `Origin` header means a same-origin request. Adjusted it to include non-browser clients, which also commonly omit `Origin`.
- The final takeaway implied server-side CORS validation replaces browser enforcement. Updated it to emphasize that CORS is not a substitute for authentication and authorization.

## Review Notes
- JavaScript syntax was checked with `node --check`.
- Python syntax was checked with `ast.parse`.
- Bash syntax was checked with `bash -n`, and curl flags were checked against local help plus the official curl manpage.
- Go could not be compiled locally because the `go` toolchain is not installed in this environment. The Go snippet was reviewed against the official `net/http` and `strconv` package documentation.
