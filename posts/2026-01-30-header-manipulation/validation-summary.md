# Validation Summary: How to Build Header Manipulation

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- HTTP headers
- API gateway header manipulation
- Node.js
- Express middleware
- JSON Web Tokens with jsonwebtoken
- CORS
- Security response headers
- Content Security Policy
- Permissions Policy

## Sources Consulted
- Node.js crypto documentation: https://nodejs.org/api/crypto.html
- Node.js HTTP documentation: https://nodejs.org/api/http.html
- Express API reference: https://expressjs.com/en/api/
- jsonwebtoken README: https://github.com/auth0/node-jsonwebtoken/blob/master/README.md
- MDN HTTP headers reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers
- MDN X-XSS-Protection header: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection
- MDN CORS guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- MDN Access-Control-Allow-Origin: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Origin
- MDN Access-Control-Allow-Credentials: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Credentials
- MDN Access-Control-Allow-Methods: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Methods
- MDN Access-Control-Allow-Headers: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Headers
- MDN Content-Security-Policy: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy
- MDN Permissions-Policy: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy
- RFC 9110 HTTP Semantics: https://www.rfc-editor.org/rfc/rfc9110.html

## Issues Found
- The basic `HeaderManipulator` example used `crypto.randomUUID()` without importing Node's `crypto` module. Added `const crypto = require('crypto');`.
- The `HeaderManipulator` usage example supplied a request-aware callback for `X-Forwarded-For`, but `manipulateRequest()` called functions without passing the request. Updated `manipulateRequest(headers, req = null)` to pass `req` to callback values.
- The Express middleware accepted `config` without a default, so `createHeaderMiddleware()` could throw when called with no argument. Added `config = {}` and normalized blocked response headers into a lowercase `Set`.
- The Express middleware used `req.connection.remoteAddress`; updated it to `req.socket.remoteAddress`, which matches the current Node request socket API.
- The security header examples recommended `X-XSS-Protection: 1; mode=block` and described the legacy filter as useful. MDN marks `X-XSS-Protection` as deprecated and recommends avoiding it. Updated examples to use `X-XSS-Protection: 0`, removed it from the security-header diagram, and clarified that CSP should be used instead.
- The CORS route override example showed `/api/public/*`, but the implementation only checked exact route keys and ignored route-specific `allowCredentials`, methods, headers, and max-age when generating headers. Added wildcard route matching and merged route overrides before producing CORS and preflight headers.
- The CORS preflight implementation did not validate the requested method or requested headers before returning allow headers. Added checks against configured allowed methods and headers.
- The sensitive-header stripper defined authentication headers but did not include them in request stripping by default. Added request-side stripping for auth/session headers except response-only `set-cookie` and `www-authenticate`.
- The sensitive-header middleware computed sanitized request headers but did not reliably replace `req.headers` with those sanitized values. Updated it to clear and repopulate the request headers from the sanitized object.

## Review Notes
All JavaScript code blocks were checked for syntax with Node.js after the edits. The snippets remain illustrative rather than drop-in production gateway code because they omit surrounding proxy integration, class imports in the combined example, logging, and full test coverage. The JWT section correctly warns that `jwt.decode()` does not verify signatures; production implementations should use `jwt.verify()` or equivalent validation before trusting claims.
