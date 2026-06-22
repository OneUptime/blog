# Validation Summary: How to Fix 'CSRF Token' Vulnerabilities

## Status
validated

## Post Type
Tutorial / Security guide

## Technologies Covered
- CSRF tokens and CSRF attack mitigation
- Node.js and Express
- Django CSRF middleware
- HTTP cookies and SameSite attributes
- Fetch API, CORS, and custom request headers
- React

## Sources Consulted
- OWASP Cross-Site Request Forgery Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- Django CSRF documentation: https://docs.djangoproject.com/en/6.0/howto/csrf/
- Node.js crypto documentation for `crypto.timingSafeEqual`: https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b
- MDN Set-Cookie documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie
- MDN CORS documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- Fetch Standard credentials modes: https://fetch.spec.whatwg.org/
- Express session middleware documentation: https://expressjs.com/en/resources/middleware/session/

## Issues Found
- The Express synchronizer-token example used `crypto.timingSafeEqual()` without first checking buffer lengths. Node.js throws when the inputs have different byte lengths, so an invalid token of the wrong length could cause a server error. Added a length check before calling `timingSafeEqual()`.
- The Express synchronizer-token example accepted CSRF tokens from the query string, while the post correctly advises never exposing tokens in URLs. Removed query-string token lookup from the example.
- The Django settings example set `CSRF_COOKIE_HTTPONLY = True`, but the AJAX example read the token from the `csrftoken` cookie using JavaScript. Django's documentation says cookie-based JavaScript access only works when `CSRF_COOKIE_HTTPONLY` is false; changed the setting to `False` for this example.
- The Django `ensure_csrf_cookie` example returned `JsonResponse` without importing it. Added the missing `from django.http import JsonResponse` import.
- The double-submit cookie section presented the naive pattern without the OWASP-recommended caveat that production implementations should sign the token and bind it to the user session. Added that caveat.
- The best-practices list recommended `HttpOnly` without qualification, even though JavaScript-readable CSRF cookies cannot use `HttpOnly`. Clarified that `HttpOnly` applies to session cookies.

## Review Notes
The remaining examples are illustrative rather than complete applications. A production Express implementation should use a real session store, robust authentication/session middleware, HTTPS, and framework-maintained CSRF middleware where possible.
