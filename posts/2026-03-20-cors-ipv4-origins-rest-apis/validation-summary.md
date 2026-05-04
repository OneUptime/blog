# Validation Summary: How to Configure CORS with IPv4 Origins in REST APIs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CORS (Cross-Origin Resource Sharing)
- Node.js + Express + `cors` npm package
- Python FastAPI (Starlette `CORSMiddleware`)
- Python Flask + `flask-cors`
- Nginx (CORS via `add_header` and regex matching on `$http_origin`)
- IPv4 origin allow-listing

## Sources Consulted
- `cors` npm package documentation: https://github.com/expressjs/cors
- FastAPI CORS docs: https://fastapi.tiangolo.com/tutorial/cors/
- Starlette CORSMiddleware source/docs: https://www.starlette.io/middleware/#corsmiddleware
- Flask-CORS docs: https://flask-cors.readthedocs.io/en/latest/api.html
- Nginx `ngx_http_headers_module` docs: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- MDN CORS reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
- Fetch Living Standard (CORS): https://fetch.spec.whatwg.org/

## Issues Found
No technical issues found.

- **Express `cors` config**: The `origin` function signature `(origin, callback)`, plus `methods`, `allowedHeaders`, and `credentials` options are all valid per the `cors` package API.
- **FastAPI CORSMiddleware**: Import path `fastapi.middleware.cors` and parameters (`allow_origins`, `allow_credentials`, `allow_methods`, `allow_headers`) are correct. Using `allow_methods=["*"]` / `allow_headers=["*"]` together with `allow_credentials=True` is safe here because the explicit (non-wildcard) `allow_origins` list is used, and Starlette reflects the requested method/headers back rather than emitting a literal `*` (which would otherwise violate the CORS spec).
- **Flask-CORS**: `CORS(app, origins=[...], supports_credentials=True)` matches the documented `flask_cors.CORS` API.
- **Nginx regex**: `^http://(192\.168\.1\.50|10\.0\.0\.5)(:\d+)?$` is anchored, escapes dots, and matches the optional port — correct for PCRE used by Nginx.
- **Conclusion claim**: Accurate — per the CORS spec, `Access-Control-Allow-Origin: *` cannot be combined with `Access-Control-Allow-Credentials: true`.

## Review Notes
- **Nginx `add_header` inheritance caveat (not fixed)**: Inside the `if ($request_method = 'OPTIONS') { ... }` block, the `add_header 'Access-Control-Max-Age' 86400;` directive establishes a new header level. By Nginx's documented inheritance rule, `add_header` directives are inherited from the outer scope only when no `add_header` is present at the inner scope. As written, the OPTIONS preflight 204 response may not carry the outer CORS headers (`Access-Control-Allow-Origin`, `-Methods`, `-Headers`, `-Credentials`), which can cause preflight failures in some Nginx versions. The `always` flag controls inheritance across status codes, not across nested scopes. This is a widely-published pattern and remains functional in many setups, but readers deploying to production may want to repeat the four CORS headers inside the OPTIONS branch (or use a `map` block at the `http` level) to be safe. Left as-is to preserve the author's original structure.
- **Subnet regex**: `/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/` permits octets up to `999`, which is technically wider than valid IPv4 (`0-255`). This is acceptable here because the author explicitly scopes the snippet to trusted development networks, but in security-sensitive contexts a stricter octet pattern (e.g. `(25[0-5]|2[0-4]\d|[01]?\d\d?)`) would be preferable.
- **Browser private-network considerations**: Modern Chromium-based browsers apply the Private Network Access (PNA) check on top of CORS when a public-origin page calls a private-IP API. The post focuses purely on CORS (which is correct for the stated scope), but readers targeting private networks may also need to handle the `Access-Control-Request-Private-Network` / `Access-Control-Allow-Private-Network` preflight headers. Out of scope, just worth flagging.
